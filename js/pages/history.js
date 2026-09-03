import {
    getTransactions,
    updateTransaction,
    deleteTransaction
} from "../data/transactions.js";

import {
    getCategories,
    saveCategories
} from "../data/storage.js";

import {
    validateTransaction
} from "../core/validation.js";

import {
    showNotification
} from "../components/notifications.js";


let currentTypeFilter = "all";
let currentCategoryFilter = "all";
let currentSearch = "";
let editingTransactionId = null;
let deletingTransactionId = null;


const categoryIcons = {
    Food: "F",
    Transport: "T",
    Shopping: "S",
    Bills: "B",
    Entertainment: "E",
    Health: "H",
    Housing: "H",
    Salary: "S",
    Freelance: "F",
    Business: "B",
    Investment: "I",
    Gift: "G",
    Other: "O"
};


export function initializeHistory() {

    createEditModal();
    createDeleteModal();
    setupSearch();
    setupTypeFilters();
    setupCategoryFilter();

    window.addEventListener(
        "transactionsChanged",
        renderHistory
    );

    renderHistory();

}


function setupSearch() {

    const searchInput =
        document.getElementById("transaction-search");

    searchInput.addEventListener("input", event => {

        currentSearch =
            event.target.value
                .trim()
                .toLowerCase();

        visibleCount = INITIAL_LIMIT;
        renderHistory();

    });

}


function setupTypeFilters() {

    const buttons =
        document.querySelectorAll(".filter-button");

    buttons.forEach(button => {

        button.addEventListener("click", () => {

            buttons.forEach(item => {
                item.classList.remove("active");
            });

            button.classList.add("active");

            currentTypeFilter =
                button.dataset.filterType;

            visibleCount = INITIAL_LIMIT;
            renderHistory();

        });

    });

}


function setupCategoryFilter() {

    const select =
        document.getElementById("category-filter");

    renderCategoryFilterOptions();

    select.addEventListener("change", event => {

        currentCategoryFilter =
            event.target.value;

        visibleCount = INITIAL_LIMIT;
        renderHistory();

    });

}


function renderCategoryFilterOptions() {

    const select =
        document.getElementById("category-filter");

    const selectedValue =
        select.value || currentCategoryFilter;

    const categories =
        getCategories();

    select.innerHTML = `
        <option value="all">All categories</option>
    `;

    categories.forEach(category => {

        const option =
            document.createElement("option");

        option.value = category;
        option.textContent = category;

        select.appendChild(option);

    });

    if (
        selectedValue === "all" ||
        categories.includes(selectedValue)
    ) {
        select.value = selectedValue;
    }

}


const INITIAL_LIMIT = 10;
const BATCH_SIZE = 10;
let visibleCount = INITIAL_LIMIT;


function getFilteredTransactions() {

    return getTransactions()
        .filter(transaction =>
            currentTypeFilter === "all" ||
            transaction.type === currentTypeFilter
        )
        .filter(transaction =>
            currentCategoryFilter === "all" ||
            transaction.category === currentCategoryFilter
        )
        .filter(transaction => {

            if (!currentSearch) {
                return true;
            }

            // Numeric price comparisons (e.g. > 500, <= 1000)
            const operatorMatch =
                currentSearch.match(/^([><]=?)\s*(\d+(?:\.\d+)?)$/);

            if (operatorMatch) {
                const op = operatorMatch[1];
                const targetVal = parseFloat(operatorMatch[2]);
                const txAmount = parseFloat(transaction.amount);

                if (!Number.isNaN(txAmount) && !Number.isNaN(targetVal)) {
                    if (op === ">") return txAmount > targetVal;
                    if (op === ">=") return txAmount >= targetVal;
                    if (op === "<") return txAmount < targetVal;
                    if (op === "<=") return txAmount <= targetVal;
                }
            }

            const searchableText =
                getSearchableTransactionText(transaction);

            const searchWords =
                currentSearch.split(/\s+/).filter(Boolean);

            return searchWords.every(word => {
                const cleanWord =
                    word.replace(/^[₹$]|^(?:rs\.?)\s*/i, "").replaceAll(",", "");

                return searchableText.includes(word) ||
                    (cleanWord && searchableText.includes(cleanWord));
            });

        })
        .sort((a, b) =>
            getTransactionDateTime(b) -
            getTransactionDateTime(a)
        );

}


function getSearchableTransactionText(transaction) {

    const tokens = [
        transaction.category,
        transaction.description,
        transaction.type
    ];

    // Price variations
    const numAmount = Number(transaction.amount);
    if (!Number.isNaN(numAmount)) {
        tokens.push(
            String(transaction.amount),
            numAmount.toString(),
            numAmount.toFixed(2),
            numAmount.toLocaleString("en-IN"),
            numAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
            `₹${numAmount}`,
            `₹${numAmount.toLocaleString("en-IN")}`,
            `rs ${numAmount}`,
            `rs. ${numAmount}`
        );
    }

    // Date variations (formats, month names, days)
    if (transaction.date) {
        tokens.push(transaction.date); // e.g. "2026-09-03"

        try {
            const dateObj = new Date(`${transaction.date}T00:00:00`);

            if (!Number.isNaN(dateObj.getTime())) {
                const dayNum = dateObj.getDate();
                const dayPadded = String(dayNum).padStart(2, "0");
                const monthNum = dateObj.getMonth() + 1;
                const monthPadded = String(monthNum).padStart(2, "0");
                const year = dateObj.getFullYear();

                const fullMonth = dateObj.toLocaleDateString("en-IN", { month: "long" });
                const shortMonth = dateObj.toLocaleDateString("en-IN", { month: "short" });
                const fullDay = dateObj.toLocaleDateString("en-IN", { weekday: "long" });
                const shortDay = dateObj.toLocaleDateString("en-IN", { weekday: "short" });

                tokens.push(
                    formatDate(transaction.date),
                    `${dayNum} ${shortMonth}`,
                    `${dayPadded} ${shortMonth}`,
                    `${dayNum} ${fullMonth}`,
                    `${dayPadded} ${fullMonth}`,
                    `${dayNum} ${shortMonth} ${year}`,
                    `${dayPadded} ${shortMonth} ${year}`,
                    `${dayNum} ${fullMonth} ${year}`,
                    `${dayPadded} ${fullMonth} ${year}`,
                    fullMonth,
                    shortMonth,
                    fullDay,
                    shortDay,
                    `${dayNum}/${monthNum}/${year}`,
                    `${dayPadded}/${monthPadded}/${year}`,
                    `${dayNum}/${monthNum}`,
                    `${dayPadded}/${monthPadded}`,
                    `${dayNum}-${monthNum}-${year}`,
                    `${dayPadded}-${monthPadded}-${year}`
                );
            }
        } catch (e) {}
    }

    // Time variations (12h, 24h, AM/PM)
    if (transaction.time) {
        tokens.push(transaction.time); // e.g. "14:30"

        try {
            const formatted = formatTime(transaction.time);
            tokens.push(
                formatted,
                formatted.replace(/\s+/g, ""),
                formatted.replace(/\s*(am|pm)/i, "")
            );

            const [h, m] = String(transaction.time).split(":");
            const hours = Number(h);
            const mins = Number(m);

            if (!Number.isNaN(hours) && !Number.isNaN(mins)) {
                const hour12 = hours % 12 || 12;
                const paddedHour12 = String(hour12).padStart(2, "0");
                const paddedMins = String(mins).padStart(2, "0");
                const ampm = hours >= 12 ? "pm" : "am";

                tokens.push(
                    `${hour12}:${paddedMins}`,
                    `${hour12}:${paddedMins} ${ampm}`,
                    `${hour12}:${paddedMins}${ampm}`,
                    `${paddedHour12}:${paddedMins} ${ampm}`,
                    `${paddedHour12}:${paddedMins}${ampm}`,
                    ampm
                );
            }
        } catch (e) {}
    }

    return tokens.filter(Boolean).join(" ").toLowerCase();

}


export function renderHistory() {

    renderCategoryFilterOptions();

    const list =
        document.getElementById("transaction-list");

    const emptyState =
        document.getElementById("history-empty");

    const count =
        document.getElementById("transaction-count");

    const transactions =
        getFilteredTransactions();

    count.textContent =
        transactions.length;

    let loadMoreWrapper =
        document.getElementById("history-load-more-wrapper");

    if (!loadMoreWrapper && list) {
        loadMoreWrapper = document.createElement("div");
        loadMoreWrapper.id = "history-load-more-wrapper";
        loadMoreWrapper.className = "history-load-more-wrapper";
        list.insertAdjacentElement("afterend", loadMoreWrapper);
    }

    if (transactions.length === 0) {

        list.innerHTML = "";
        emptyState.classList.remove("hidden");
        if (loadMoreWrapper) {
            loadMoreWrapper.innerHTML = "";
        }

        return;

    }

    emptyState.classList.add("hidden");

    const visibleTransactions =
        transactions.slice(0, visibleCount);

    list.innerHTML =
        visibleTransactions
            .map(createTransactionHTML)
            .join("");

    setupTransactionActions();

    const remaining = transactions.length - visibleCount;

    if (loadMoreWrapper) {
        if (remaining > 0) {
            const nextBatch = Math.min(BATCH_SIZE, remaining);
            loadMoreWrapper.innerHTML = `
                <button
                    type="button"
                    id="history-load-more"
                    class="secondary-button history-load-more-button"
                >
                    See more (+${nextBatch})
                    <span class="load-more-remaining">${remaining} more</span>
                </button>
            `;

            const loadMoreBtn = document.getElementById("history-load-more");
            if (loadMoreBtn) {
                loadMoreBtn.addEventListener("click", () => {
                    visibleCount += BATCH_SIZE;
                    renderHistory();
                });
            }
        } else {
            loadMoreWrapper.innerHTML = "";
        }
    }

}


function createTransactionHTML(transaction) {

    const amount =
        formatCurrency(transaction.amount);

    const sign =
        transaction.type === "income"
            ? "+"
            : "-";

    const icon =
        categoryIcons[transaction.category] ||
        categoryIcons.Other;

    return `
        <article
            class="transaction-item"
            data-id="${transaction.id}"
        >
            <time
                class="transaction-date"
                datetime="${transaction.date}"
            >
                ${formatDate(transaction.date)}
                ${transaction.time ? `<span>${formatTime(transaction.time)}</span>` : ""}
            </time>

            <div class="transaction-main">
                <div class="category-icon">
                    ${icon}
                </div>

                <div class="transaction-description">
                    <strong>
                        ${escapeHTML(transaction.description || transaction.category)}
                    </strong>

                    <span>
                        ${escapeHTML(transaction.category)}
                    </span>
                </div>
            </div>

            <span class="transaction-type-label">
                ${transaction.type === "income" ? "Income" : "Expense"}
            </span>

            <span class="transaction-amount ${transaction.type}">
                ${sign}${amount}
            </span>

            <div class="transaction-actions">
                <button
                    type="button"
                    class="action-button edit"
                    data-action="edit"
                    data-id="${transaction.id}"
                    aria-label="Edit transaction"
                >
                    Edit
                </button>

                <button
                    type="button"
                    class="action-button delete"
                    data-action="delete"
                    data-id="${transaction.id}"
                    aria-label="Delete transaction"
                >
                    Delete
                </button>
            </div>
        </article>
    `;

}


function setupTransactionActions() {

    document
        .querySelectorAll(".action-button")
        .forEach(button => {

            button.addEventListener("click", () => {

                const id =
                    button.dataset.id;

                if (button.dataset.action === "delete") {
                    handleDelete(id);
                }

                if (button.dataset.action === "edit") {
                    handleEdit(id);
                }

            });

        });

}


function handleDelete(id) {

    const transaction =
        getTransactions()
            .find(item => item.id === id);

    if (!transaction) {
        return;
    }

    openDeleteModal(transaction);

}


function handleEdit(id) {

    const transaction =
        getTransactions()
            .find(item => item.id === id);

    if (!transaction) {
        return;
    }

    openEditModal(transaction);

}


function createEditModal() {

    if (document.getElementById("edit-modal")) {
        return;
    }

    const modal =
        document.createElement("div");

    modal.id = "edit-modal";
    modal.className = "modal-backdrop hidden";

    modal.innerHTML = `
        <div
            class="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-modal-title"
        >
            <div class="modal-header">
                <div>
                    <p class="eyebrow">EDIT</p>
                    <h3 id="edit-modal-title">Update transaction</h3>
                </div>

                <button
                    type="button"
                    class="modal-close"
                    data-modal-close
                    aria-label="Close edit modal"
                >
                    x
                </button>
            </div>

            <form id="edit-transaction-form" novalidate>
                <div class="transaction-type edit-type-group">
                    <button
                        type="button"
                        class="type-button active"
                        data-edit-type="expense"
                    >
                        Expense
                    </button>

                    <button
                        type="button"
                        class="type-button"
                        data-edit-type="income"
                    >
                        Income
                    </button>
                </div>

                <div class="form-group amount-group">
                    <label for="edit-amount">Amount</label>

                    <div class="amount-input-wrapper compact">
                        <span class="currency-symbol">Rs</span>
                        <input
                            type="number"
                            id="edit-amount"
                            name="amount"
                            min="0"
                            step="0.01"
                            required
                        />
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="edit-category">Category</label>
                        <select
                            id="edit-category"
                            name="category"
                            required
                        ></select>
                    </div>

                    <div
                        class="form-group hidden"
                        id="edit-custom-category-group"
                    >
                        <label for="edit-custom-category">Custom category</label>
                        <input
                            type="text"
                            id="edit-custom-category"
                            name="custom-category"
                            maxlength="50"
                            placeholder="e.g. Pet care"
                        />
                    </div>

                    <div class="form-group">
                        <label>Date & Time</label>
                        <div class="date-time-row">
                            <input
                                type="date"
                                id="edit-date"
                                name="date"
                                required
                            />

                            <input
                                type="time"
                                id="edit-time"
                                name="time"
                            />
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label for="edit-description">Description</label>
                    <input
                        type="text"
                        id="edit-description"
                        name="description"
                        maxlength="150"
                    />
                </div>

                <div class="modal-actions">
                    <button
                        type="button"
                        class="secondary-button"
                        data-modal-close
                    >
                        Cancel
                    </button>

                    <button type="submit" class="primary-button">
                        Save changes
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    setupEditModalEvents();

}


function setupEditModalEvents() {

    const modal =
        document.getElementById("edit-modal");

    const form =
        document.getElementById("edit-transaction-form");

    const categorySelect =
        document.getElementById("edit-category");

    modal.addEventListener("click", event => {

        if (
            event.target === modal ||
            event.target.hasAttribute("data-modal-close")
        ) {
            closeEditModal();
        }

    });

    document
        .querySelectorAll("[data-edit-type]")
        .forEach(button => {

            button.addEventListener("click", () => {

                document
                    .querySelectorAll("[data-edit-type]")
                    .forEach(item => {
                        item.classList.remove("active");
                    });

                button.classList.add("active");

            });

        });

    categorySelect.addEventListener(
        "change",
        updateEditCustomCategoryVisibility
    );

    form.addEventListener("submit", event => {

        event.preventDefault();

        saveEditForm();

    });

}


function openEditModal(transaction) {

    editingTransactionId =
        transaction.id;

    renderEditCategoryOptions(transaction.category);

    document.getElementById("edit-amount").value =
        transaction.amount;

    document.getElementById("edit-category").value =
        getCategories().includes(transaction.category)
            ? transaction.category
            : "Other";

    document.getElementById("edit-date").value =
        transaction.date;

    document.getElementById("edit-time").value =
        transaction.time || "";

    document.getElementById("edit-description").value =
        transaction.description || "";

    document
        .querySelectorAll("[data-edit-type]")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.editType === transaction.type
            );

        });

    if (!getCategories().includes(transaction.category)) {
        document.getElementById("edit-custom-category").value =
            transaction.category;
    }

    updateEditCustomCategoryVisibility();

    document
        .getElementById("edit-modal")
        .classList
        .remove("hidden");

    document.getElementById("edit-amount").focus();

}


function closeEditModal() {

    editingTransactionId = null;

    document
        .getElementById("edit-modal")
        .classList
        .add("hidden");

}


function renderEditCategoryOptions(currentCategory) {

    const select =
        document.getElementById("edit-category");

    const categories =
        getCategories();

    const optionCategories =
        categories.includes(currentCategory)
            ? categories
            : [
                ...categories,
                currentCategory
            ];

    select.innerHTML = `
        <option value="">Select category</option>
        ${optionCategories.map(category => `
            <option value="${escapeHTML(category)}">
                ${escapeHTML(category)}
            </option>
        `).join("")}
        <option value="Other">Other</option>
    `;

}


function updateEditCustomCategoryVisibility() {

    const categorySelect =
        document.getElementById("edit-category");

    const customGroup =
        document.getElementById("edit-custom-category-group");

    const customInput =
        document.getElementById("edit-custom-category");

    const isCustom =
        categorySelect.value === "Other";

    customGroup.classList.toggle("hidden", !isCustom);
    customInput.required = isCustom;

    if (!isCustom) {
        customInput.value = "";
    }

}


function saveEditForm() {

    if (!editingTransactionId) {
        return;
    }

    const form =
        document.getElementById("edit-transaction-form");

    const formData =
        new FormData(form);

    const selectedType =
        document.querySelector("[data-edit-type].active")
            ?.dataset
            .editType;

    const selectedCategory =
        formData.get("category");

    const customCategory =
        formData.get("custom-category")
            ?.trim();

    const category =
        selectedCategory === "Other" &&
        customCategory
            ? customCategory
            : selectedCategory === "Other"
                ? ""
                : selectedCategory;

    const data = {
        type: selectedType,
        amount: formData.get("amount"),
        category,
        date: formData.get("date"),
        time: formData.get("time"),
        description: formData.get("description")
    };

    const validation =
        validateTransaction(data);

    if (!validation.valid) {

        showNotification(
            Object.values(validation.errors).join(" "),
            "error"
        );

        return;

    }

    saveCustomCategory(category);

    updateTransaction(
        editingTransactionId,
        {
            ...data,
            amount: Number(data.amount),
            description: data.description?.trim() || ""
        }
    );

    closeEditModal();
    renderHistory();

    showNotification("Transaction updated.");

}


function createDeleteModal() {

    if (document.getElementById("delete-modal")) {
        return;
    }

    const modal =
        document.createElement("div");

    modal.id = "delete-modal";
    modal.className = "modal-backdrop hidden";

    modal.innerHTML = `
        <div
            class="modal small-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
        >
            <div class="modal-header">
                <div>
                    <p class="eyebrow">DELETE</p>
                    <h3 id="delete-modal-title">Delete transaction?</h3>
                </div>

                <button
                    type="button"
                    class="modal-close"
                    data-delete-close
                    aria-label="Close delete modal"
                >
                    x
                </button>
            </div>

            <p class="modal-copy" id="delete-modal-copy">
                This transaction will be removed from your history.
            </p>

            <div class="modal-actions">
                <button
                    type="button"
                    class="secondary-button"
                    data-delete-close
                >
                    Cancel
                </button>

                <button
                    type="button"
                    class="danger-button"
                    id="confirm-delete-button"
                >
                    Delete
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    setupDeleteModalEvents();

}


function setupDeleteModalEvents() {

    const modal =
        document.getElementById("delete-modal");

    modal.addEventListener("click", event => {

        if (
            event.target === modal ||
            event.target.hasAttribute("data-delete-close")
        ) {
            closeDeleteModal();
        }

    });

    document
        .getElementById("confirm-delete-button")
        .addEventListener("click", confirmDelete);

}


function openDeleteModal(transaction) {

    deletingTransactionId =
        transaction.id;

    document.getElementById("delete-modal-copy").textContent =
        `${transaction.description || transaction.category} for ${formatCurrency(transaction.amount)} will be removed.`;

    document
        .getElementById("delete-modal")
        .classList
        .remove("hidden");

    document
        .getElementById("confirm-delete-button")
        .focus();

}


function closeDeleteModal() {

    deletingTransactionId = null;

    document
        .getElementById("delete-modal")
        .classList
        .add("hidden");

}


function confirmDelete() {

    if (!deletingTransactionId) {
        return;
    }

    deleteTransaction(deletingTransactionId);

    closeDeleteModal();
    renderHistory();

    showNotification("Transaction deleted.");

}


function saveCustomCategory(category) {

    if (!category) {
        return;
    }

    const categories =
        getCategories();

    if (categories.includes(category)) {
        return;
    }

    saveCategories([
        ...categories,
        category
    ]);

}


function getTransactionDateTime(transaction) {

    return new Date(
        `${transaction.date}T${transaction.time || "00:00"}:00`
    );

}


function formatDate(dateString) {

    return new Intl.DateTimeFormat(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    ).format(
        new Date(`${dateString}T00:00:00`)
    );

}


function formatTime(timeString) {

    const [hours, minutes] =
        String(timeString).split(":");

    const date =
        new Date();

    date.setHours(
        Number(hours),
        Number(minutes),
        0,
        0
    );

    return new Intl.DateTimeFormat(
        "en-IN",
        {
            hour: "numeric",
            minute: "2-digit"
        }
    ).format(date);

}


function formatCurrency(value) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR"
        }
    ).format(value);

}


function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}
