import {
    createTransactions,
    getTransactions
} from "../data/transactions.js";

import {
    getCategories,
    saveCategories
} from "../data/storage.js";

import {
    validateTransaction
} from "../core/validation.js";

import {
    getFinancialSummary
} from "../core/calculations.js";

import {
    showNotification
} from "../components/notifications.js";


const requiredColumns = [
    "type",
    "amount",
    "category",
    "date"
];


export function initializeImportExport() {

    setupImport();

    setupExport();

}


function setupImport() {

    const importButton =
        document.getElementById("import-excel-button");

    const input =
        document.getElementById("excel-input");

    importButton.addEventListener("click", () => {
        input.click();
    });

    input.addEventListener("change", async event => {

        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }

        try {

            const rows =
                await readSpreadsheet(file);

            const transactions =
                rows
                    .map(normalizeImportRow)
                    .filter(Boolean);

            const validTransactions =
                validateImportedTransactions(transactions);

            saveImportedCategories(validTransactions);

            createTransactions(validTransactions);

            showNotification(
                `${validTransactions.length} transactions imported.`
            );

        } catch (error) {

            showNotification(
                error.message,
                "error"
            );

        } finally {
            input.value = "";
        }

    });

}


function setupExport() {

    document
        .getElementById("export-excel-button")
        .addEventListener("click", exportExcel);

    document
        .getElementById("export-pdf-button")
        .addEventListener("click", exportPdf);

}


async function readSpreadsheet(file) {

    if (!window.XLSX) {
        throw new Error(
            "Excel tools are still loading. Please try again in a moment."
        );
    }

    const data =
        await file.arrayBuffer();

    const workbook =
        window.XLSX.read(data, {
            type: "array",
            cellDates: true
        });

    const sheet =
        workbook.Sheets[workbook.SheetNames[0]];

    if (!sheet) {
        throw new Error("No worksheet found in this file.");
    }

    const rows =
        window.XLSX.utils.sheet_to_json(sheet, {
            defval: ""
        });

    if (rows.length === 0) {
        throw new Error("The selected file has no transaction rows.");
    }

    return rows;

}


function normalizeImportRow(row) {

    const normalized = {};

    Object.entries(row).forEach(([key, value]) => {
        normalized[normalizeKey(key)] = value;
    });

    const date =
        normalizeDate(normalized.date);

    return {
        type: String(normalized.type || normalized.transactiontype || "")
            .trim()
            .toLowerCase(),
        amount: normalizeAmount(normalized.amount),
        category: String(normalized.category || "").trim(),
        date,
        description: String(normalized.description || "").trim()
    };

}


function validateImportedTransactions(transactions) {

    if (transactions.length === 0) {
        throw new Error("No valid transaction rows were found.");
    }

    transactions.forEach((transaction, index) => {

        const missingColumns =
            requiredColumns.filter(column => !transaction[column]);

        if (missingColumns.length > 0) {
            throw new Error(
                `Row ${index + 2} is missing: ${missingColumns.join(", ")}.`
            );
        }

        if (
            transaction.type !== "income" &&
            transaction.type !== "expense"
        ) {
            throw new Error(
                `Row ${index + 2} type must be income or expense.`
            );
        }

        const validation =
            validateTransaction(transaction);

        if (!validation.valid) {
            throw new Error(
                `Row ${index + 2}: ${Object.values(validation.errors).join(" ")}`
            );
        }

    });

    return transactions;

}


function saveImportedCategories(transactions) {

    const existingCategories =
        getCategories();

    const nextCategories =
        [
            ...new Set([
                ...existingCategories,
                ...transactions.map(transaction => transaction.category)
            ])
        ];

    saveCategories(nextCategories);

}


function exportExcel() {

    const transactions =
        getTransactions();

    if (transactions.length === 0) {
        showNotification("Add transactions before exporting.", "error");
        return;
    }

    const rows =
        createExportRows(transactions);

    if (window.XLSX) {

        const worksheet =
            window.XLSX.utils.json_to_sheet(rows);

        const workbook =
            window.XLSX.utils.book_new();

        window.XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Transactions"
        );

        window.XLSX.writeFile(
            workbook,
            getFileName("meowth-transactions", "xlsx")
        );

        showNotification("Excel report downloaded.");

        return;

    }

    downloadCsv(rows);

    showNotification("CSV report downloaded.");

}


function exportPdf() {

    const transactions =
        getTransactions();

    if (transactions.length === 0) {
        showNotification("Add transactions before exporting.", "error");
        return;
    }

    if (!window.jspdf?.jsPDF) {
        showNotification(
            "PDF tools are still loading. Please try again in a moment.",
            "error"
        );
        return;
    }

    const summary =
        getFinancialSummary(transactions);

    const rows =
        createExportRows(transactions);

    const doc =
        new window.jspdf.jsPDF();

    doc.setFontSize(18);
    doc.text("Meowth Financial Report", 14, 18);

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 14, 26);

    doc.setFontSize(12);
    doc.text(`Total income: ${formatCurrency(summary.income)}`, 14, 40);
    doc.text(`Total expense: ${formatCurrency(summary.expenses)}`, 14, 48);
    doc.text(`Balance: ${formatCurrency(summary.balance)}`, 14, 56);

    doc.autoTable({
        startY: 68,
        head: [[
            "Date",
            "Type",
            "Category",
            "Description",
            "Amount"
        ]],
        body: rows.map(row => [
            row.Date,
            row.Type,
            row.Category,
            row.Description,
            row.Amount
        ]),
        styles: {
            fontSize: 8,
            cellPadding: 2
        },
        headStyles: {
            fillColor: [29, 29, 31]
        }
    });

    doc.save(
        getFileName("meowth-transactions", "pdf")
    );

    showNotification("PDF report downloaded.");

}


function createExportRows(transactions) {

    return transactions
        .slice()
        .sort(
            (a, b) =>
                new Date(b.date) - new Date(a.date)
        )
        .map(transaction => ({
            Date: transaction.date,
            Type: titleCase(transaction.type),
            Category: transaction.category,
            Description: transaction.description || "",
            Amount: Number(transaction.amount)
        }));

}


function downloadCsv(rows) {

    const headers =
        Object.keys(rows[0]);

    const csv =
        [
            headers.join(","),
            ...rows.map(row =>
                headers
                    .map(header => csvCell(row[header]))
                    .join(",")
            )
        ].join("\n");

    const blob =
        new Blob(
            [csv],
            {
                type: "text/csv;charset=utf-8"
            }
        );

    const link =
        document.createElement("a");

    link.href =
        URL.createObjectURL(blob);

    link.download =
        getFileName("meowth-transactions", "csv");

    link.click();

    URL.revokeObjectURL(link.href);

}


function normalizeKey(key) {

    return String(key)
        .trim()
        .toLowerCase()
        .replaceAll(" ", "");

}


function normalizeDate(value) {

    if (!value) {
        return "";
    }

    if (value instanceof Date) {
        return value.toISOString().split("T")[0];
    }

    if (typeof value === "number" && window.XLSX) {

        const parsed =
            window.XLSX.SSF.parse_date_code(value);

        if (parsed) {
            return [
                parsed.y,
                String(parsed.m).padStart(2, "0"),
                String(parsed.d).padStart(2, "0")
            ].join("-");
        }

    }

    const text =
        String(value).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return text;
    }

    const parsedDate =
        new Date(text);

    if (Number.isNaN(parsedDate.getTime())) {
        return "";
    }

    return parsedDate
        .toISOString()
        .split("T")[0];

}


function normalizeAmount(value) {

    if (typeof value === "number") {
        return value;
    }

    return String(value || "")
        .replaceAll(",", "")
        .replace(/[^\d.-]/g, "")
        .trim();

}


function getFileName(name, extension) {

    const date =
        new Date()
            .toISOString()
            .split("T")[0];

    return `${name}-${date}.${extension}`;

}


function csvCell(value) {

    return `"${String(value).replaceAll('"', '""')}"`;

}


function titleCase(value) {

    return String(value)
        .charAt(0)
        .toUpperCase() +
        String(value).slice(1);

}


function formatCurrency(value) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }
    ).format(value);

}
