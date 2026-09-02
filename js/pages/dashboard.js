import {
    getTransactions
} from "../data/transactions.js";

import {
    getFinancialSummary,
    getTopExpenses,
    getTransactionsByPeriod
} from "../core/calculations.js";


export function initializeDashboard() {

    window.addEventListener(
        "transactionsChanged",
        renderDashboard
    );

    renderDashboard();

}


function renderDashboard() {

    const container =
        document.getElementById("dashboard-content");

    const transactions =
        getTransactions();

    const allTimeSummary =
        getFinancialSummary(transactions);

    const monthTransactions =
        getTransactionsByPeriod("month", transactions);

    const monthSummary =
        getFinancialSummary(monthTransactions);

    const recentTransactions =
        transactions
            .slice()
            .sort(
                (a, b) =>
                    new Date(b.date) - new Date(a.date)
            )
            .slice(0, 5);

    const topExpenses =
        getTopExpenses(monthTransactions, 3);

    if (transactions.length === 0) {

        container.innerHTML = createEmptyDashboard();

        return;

    }

    container.innerHTML = `
        <section class="dashboard-hero">
            <div>
                <p class="panel-label">Financial status</p>
                <h3>${getDashboardMessage(allTimeSummary)}</h3>
                <p>
                    You have recorded ${transactions.length}
                    ${transactions.length === 1 ? "transaction" : "transactions"}.
                </p>
            </div>

            <div class="dashboard-balance">
                <span>Current balance</span>
                <strong class="${allTimeSummary.balance >= 0 ? "positive" : "negative"}">
                    ${formatCurrency(allTimeSummary.balance)}
                </strong>
            </div>
        </section>

        <div class="dashboard-metrics">
            ${createDashboardMetric(
                "Total income",
                allTimeSummary.income,
                "All money added"
            )}

            ${createDashboardMetric(
                "Total expense",
                allTimeSummary.expenses,
                "All money spent"
            )}

            ${createDashboardMetric(
                "Balance",
                allTimeSummary.balance,
                "Income minus expenses",
                allTimeSummary.balance >= 0 ? "positive" : "negative"
            )}

            ${createDashboardMetric(
                "Savings rate",
                `${allTimeSummary.savingsRate.toFixed(1)}%`,
                "Based on total income"
            )}
        </div>

        <div class="dashboard-columns">
            <section class="dashboard-panel">
                <div class="panel-heading">
                    <div>
                        <p class="panel-label">This month</p>
                        <h3>Monthly snapshot</h3>
                    </div>
                </div>

                <div class="monthly-summary">
                    <div>
                        <span>Income</span>
                        <strong>${formatCurrency(monthSummary.income)}</strong>
                    </div>

                    <div>
                        <span>Expenses</span>
                        <strong>${formatCurrency(monthSummary.expenses)}</strong>
                    </div>

                    <div>
                        <span>Balance</span>
                        <strong>${formatCurrency(monthSummary.balance)}</strong>
                    </div>
                </div>

                ${createTopExpensePreview(topExpenses)}
            </section>

            <section class="dashboard-panel">
                <div class="panel-heading">
                    <div>
                        <p class="panel-label">Recent activity</p>
                        <h3>Latest transactions</h3>
                    </div>
                </div>

                ${createRecentTransactions(recentTransactions)}
            </section>
        </div>
    `;

}


function createDashboardMetric(label, value, detail, tone = "") {

    const displayValue =
        typeof value === "number"
            ? formatCurrency(value)
            : value;

    return `
        <article class="dashboard-metric ${tone}">
            <span>${label}</span>
            <strong>${displayValue}</strong>
            <p>${detail}</p>
        </article>
    `;

}


function createTopExpensePreview(expenses) {

    if (expenses.length === 0) {
        return `<p class="muted-copy">No expenses recorded this month.</p>`;
    }

    return `
        <div class="dashboard-list">
            ${expenses.map(transaction => `
                <article class="dashboard-list-item">
                    <div>
                        <strong>
                            ${escapeHTML(
                                transaction.description ||
                                transaction.category
                            )}
                        </strong>
                        <span>${escapeHTML(transaction.category)}</span>
                    </div>

                    <b>${formatCurrency(transaction.amount)}</b>
                </article>
            `).join("")}
        </div>
    `;

}


function createRecentTransactions(transactions) {

    if (transactions.length === 0) {
        return `<p class="muted-copy">No recent transactions yet.</p>`;
    }

    return `
        <div class="dashboard-list">
            ${transactions.map(transaction => `
                <article class="dashboard-list-item">
                    <div>
                        <strong>
                            ${escapeHTML(
                                transaction.description ||
                                transaction.category
                            )}
                        </strong>
                        <span>
                            ${escapeHTML(transaction.category)}
                            - ${formatDate(transaction.date)}
                        </span>
                    </div>

                    <b class="${transaction.type}">
                        ${transaction.type === "income" ? "+" : "-"}
                        ${formatCurrency(transaction.amount)}
                    </b>
                </article>
            `).join("")}
        </div>
    `;

}


function createEmptyDashboard() {

    return `
        <div class="empty-state dashboard-empty">
            <div class="empty-icon">+</div>
            <h3>No dashboard data yet.</h3>
            <p>Add income and expenses to build your personal overview.</p>
        </div>
    `;

}


function getDashboardMessage(summary) {

    if (summary.income === 0) {
        return "Add income to start tracking your money.";
    }

    if (summary.balance < 0) {
        return "Your expenses are higher than your income.";
    }

    if (summary.savingsRate >= 30) {
        return "You are saving a strong share of your income.";
    }

    if (summary.savingsRate >= 10) {
        return "You are staying in positive balance.";
    }

    return "Your balance is positive, but savings are tight.";

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


function formatDate(dateString) {

    return new Intl.DateTimeFormat(
        "en-IN",
        {
            day: "2-digit",
            month: "short"
        }
    ).format(
        new Date(`${dateString}T00:00:00`)
    );

}


function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}
