import { getTransactions } from "../data/transactions.js";


/*
|--------------------------------------------------------------------------
| Get all transactions
|--------------------------------------------------------------------------
*/

export function getAllTransactions() {
    return getTransactions();
}


/*
|--------------------------------------------------------------------------
| Filter transactions by type
|--------------------------------------------------------------------------
*/

export function getIncomeTransactions() {

    return getTransactions().filter(
        transaction => transaction.type === "income"
    );

}


export function getExpenseTransactions() {

    return getTransactions().filter(
        transaction => transaction.type === "expense"
    );

}


/*
|--------------------------------------------------------------------------
| Total Income
|--------------------------------------------------------------------------
*/

export function getTotalIncome(transactions = getTransactions()) {

    return transactions
        .filter(transaction => transaction.type === "income")
        .reduce(
            (total, transaction) =>
                total + Number(transaction.amount),
            0
        );

}


/*
|--------------------------------------------------------------------------
| Total Expenses
|--------------------------------------------------------------------------
*/

export function getTotalExpenses(transactions = getTransactions()) {

    return transactions
        .filter(transaction => transaction.type === "expense")
        .reduce(
            (total, transaction) =>
                total + Number(transaction.amount),
            0
        );

}


/*
|--------------------------------------------------------------------------
| Balance
|--------------------------------------------------------------------------
*/

export function getBalance(transactions = getTransactions()) {

    const income =
        getTotalIncome(transactions);

    const expenses =
        getTotalExpenses(transactions);

    return income - expenses;

}


/*
|--------------------------------------------------------------------------
| Savings
|--------------------------------------------------------------------------
*/

export function getSavings(transactions = getTransactions()) {

    return getBalance(transactions);

}


/*
|--------------------------------------------------------------------------
| Savings Rate
|--------------------------------------------------------------------------
*/

export function getSavingsRate(transactions = getTransactions()) {

    const income =
        getTotalIncome(transactions);

    if (income === 0) {
        return 0;
    }

    const savings =
        getSavings(transactions);

    return (savings / income) * 100;

}


/*
|--------------------------------------------------------------------------
| Expenses by Category
|--------------------------------------------------------------------------
*/

export function getExpensesByCategory(
    transactions = getTransactions()
) {

    const categoryTotals = {};

    transactions
        .filter(transaction => transaction.type === "expense")
        .forEach(transaction => {

            const category =
                transaction.category;

            if (!categoryTotals[category]) {
                categoryTotals[category] = 0;
            }

            categoryTotals[category] +=
                Number(transaction.amount);

        });

    return categoryTotals;

}


/*
|--------------------------------------------------------------------------
| Income by Category
|--------------------------------------------------------------------------
*/

export function getIncomeByCategory(
    transactions = getTransactions()
) {

    const categoryTotals = {};

    transactions
        .filter(transaction => transaction.type === "income")
        .forEach(transaction => {

            const category =
                transaction.category;

            if (!categoryTotals[category]) {
                categoryTotals[category] = 0;
            }

            categoryTotals[category] +=
                Number(transaction.amount);

        });

    return categoryTotals;

}


/*
|--------------------------------------------------------------------------
| Top Expenses
|--------------------------------------------------------------------------
*/

export function getTopExpenses(
    transactions = getTransactions(),
    limit = 5
) {

    return transactions
        .filter(transaction => transaction.type === "expense")
        .sort(
            (a, b) =>
                Number(b.amount) -
                Number(a.amount)
        )
        .slice(0, limit);

}


/*
|--------------------------------------------------------------------------
| Period helpers
|--------------------------------------------------------------------------
*/

export function getTransactionsByPeriod(
    period = "month",
    transactions = getTransactions()
) {

    if (period === "all") {
        return transactions;
    }

    const today =
        startOfDay(new Date());

    const range =
        getPeriodRange(period, today);

    return transactions.filter(transaction => {

        const transactionDate =
            parseDate(transaction.date);

        return transactionDate >= range.start &&
            transactionDate <= range.end;

    });

}


export function getFinancialSummary(
    transactions = getTransactions()
) {

    const income =
        getTotalIncome(transactions);

    const expenses =
        getTotalExpenses(transactions);

    const balance =
        income - expenses;

    const savingsRate =
        income === 0
            ? 0
            : (balance / income) * 100;

    return {
        income,
        expenses,
        balance,
        savings: balance,
        savingsRate
    };

}


export function getCategoryBreakdown(
    transactions = getTransactions(),
    type = "expense"
) {

    const totals =
        type === "income"
            ? getIncomeByCategory(transactions)
            : getExpensesByCategory(transactions);

    return Object.entries(totals)
        .map(([category, amount]) => ({
            category,
            amount
        }))
        .sort(
            (a, b) =>
                b.amount - a.amount
        );

}


export function getExpenseTrend(
    transactions = getTransactions(),
    period = "month"
) {

    const grouped = {};

    transactions
        .slice()
        .sort(
            (a, b) =>
                parseDate(a.date) - parseDate(b.date)
        )
        .filter(transaction => transaction.type === "expense")
        .forEach(transaction => {

            const label =
                getTrendLabel(transaction.date, period);

            if (!grouped[label]) {
                grouped[label] = 0;
            }

            grouped[label] +=
                Number(transaction.amount);

        });

    return Object.entries(grouped)
        .map(([label, amount]) => ({
            label,
            amount
        }));

}


function getPeriodRange(period, today) {

    const start =
        new Date(today);

    const end =
        new Date(today);

    end.setHours(23, 59, 59, 999);

    if (period === "today") {
        return {
            start,
            end
        };
    }

    if (period === "week") {
        const day =
            start.getDay();

        const offset =
            day === 0 ? 6 : day - 1;

        start.setDate(start.getDate() - offset);

        return {
            start,
            end
        };
    }

    if (period === "year") {
        start.setMonth(0, 1);

        return {
            start,
            end
        };
    }

    start.setDate(1);

    return {
        start,
        end
    };

}


function getTrendLabel(dateString, period) {

    const date =
        parseDate(dateString);

    if (period === "year" || period === "all") {
        return new Intl.DateTimeFormat(
            "en-IN",
            {
                month: "short",
                year: "numeric"
            }
        ).format(date);
    }

    return new Intl.DateTimeFormat(
        "en-IN",
        {
            day: "2-digit",
            month: "short"
        }
    ).format(date);

}


function parseDate(dateString) {

    return new Date(`${dateString}T00:00:00`);

}


function startOfDay(date) {

    const copy =
        new Date(date);

    copy.setHours(0, 0, 0, 0);

    return copy;

}


/*
|--------------------------------------------------------------------------
| Daily Spending (for heatmap)
|--------------------------------------------------------------------------
*/

export function getDailySpending(
    transactions = getTransactions()
) {

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth =
        new Date(year, month + 1, 0).getDate();

    const dailyMap = {};

    for (let d = 1; d <= daysInMonth; d++) {
        const key =
            `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        dailyMap[key] = 0;
    }

    transactions
        .filter(t => t.type === "expense")
        .forEach(t => {
            if (dailyMap.hasOwnProperty(t.date)) {
                dailyMap[t.date] +=
                    Number(t.amount);
            }
        });

    return Object.entries(dailyMap)
        .map(([date, amount]) => ({
            date,
            amount
        }));

}


/*
|--------------------------------------------------------------------------
| Income Trend (mirrors getExpenseTrend)
|--------------------------------------------------------------------------
*/

export function getIncomeTrend(
    transactions = getTransactions(),
    period = "month"
) {

    const grouped = {};

    transactions
        .slice()
        .sort(
            (a, b) =>
                parseDate(a.date) - parseDate(b.date)
        )
        .filter(t => t.type === "income")
        .forEach(t => {

            const label =
                getTrendLabel(t.date, period);

            if (!grouped[label]) {
                grouped[label] = 0;
            }

            grouped[label] +=
                Number(t.amount);

        });

    return Object.entries(grouped)
        .map(([label, amount]) => ({
            label,
            amount
        }));

}

