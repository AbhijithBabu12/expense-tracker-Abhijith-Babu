import {
    getTransactions
} from "../data/transactions.js";

import {
    getCategoryBreakdown,
    getFinancialSummary,
    getTopExpenses,
    getTransactionsByPeriod
} from "../core/calculations.js";

import {
    buildFinancialContext
} from "../ai/contextBuilder.js";

import {
    navigateTo
} from "../components/navbar.js";


const AI_STATUS_CACHE_KEY = "meowth_ai_status_cache";
let isFetchingAIStatus = false;


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

    const fallbackStatus =
        getDynamicFinancialStatus(transactions, allTimeSummary, monthSummary);

    container.innerHTML = `
        <section class="dashboard-hero">
            <div class="dashboard-status-card">
                <div class="status-card-header">
                    <span class="status-badge" id="dashboard-status-badge">
                        <span class="status-sparkle">✦</span>
                        <span class="status-badge-label">AI Financial Status</span>
                    </span>

                    <button
                        type="button"
                        id="refresh-ai-status-btn"
                        class="status-refresh-btn"
                        title="Generate fresh AI insight"
                        aria-label="Refresh AI Financial Insight"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                        </svg>
                        <span>Refresh</span>
                    </button>
                </div>

                <h3 id="dashboard-status-headline">${escapeHTML(fallbackStatus.headline)}</h3>

                <p id="dashboard-status-detail">${escapeHTML(fallbackStatus.detail)}</p>

                <div class="status-card-footer">
                    <button type="button" id="status-ask-ai-btn" class="status-ask-ai-link">
                        Ask Meowth for advice →
                    </button>
                </div>
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

    setupDashboardEvents();
    requestAIStatus(false);

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


function setupDashboardEvents() {

    const refreshBtn =
        document.getElementById("refresh-ai-status-btn");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            requestAIStatus(true);
        });
    }

    const askAiBtn =
        document.getElementById("status-ask-ai-btn");

    if (askAiBtn) {
        askAiBtn.addEventListener("click", () => {
            navigateTo("ai");
            setTimeout(() => {
                const aiInput = document.getElementById("ai-input");
                if (aiInput) {
                    aiInput.value = "Based on my current financial status, what are your top recommendations for me?";
                    aiInput.focus();
                }
            }, 120);
        });
    }

}


function renderStatusCardContent(headline, detail, isAiGenerated = false) {

    const headlineEl =
        document.getElementById("dashboard-status-headline");

    const detailEl =
        document.getElementById("dashboard-status-detail");

    const badgeLabel =
        document.querySelector(".status-badge-label");

    if (headlineEl) {
        headlineEl.textContent = headline;
    }

    if (detailEl) {
        detailEl.textContent = detail;
    }

    if (badgeLabel) {
        badgeLabel.textContent = isAiGenerated
            ? "AI Financial Status"
            : "Live Financial Status";
    }

}


function getDynamicFinancialStatus(transactions, allTimeSummary, monthSummary) {

    if (transactions.length === 0) {
        return {
            headline: "Ready to start tracking your money.",
            detail: "Add your first income or expense transaction to unlock personal insights."
        };
    }

    const monthTransactions =
        getTransactionsByPeriod("month", transactions);

    const recentExpenses =
        transactions.filter(t => t.type === "expense");

    const monthExpenses =
        monthTransactions.filter(t => t.type === "expense");

    const activeExpenses =
        monthExpenses.length > 0 ? monthExpenses : recentExpenses;

    const categories =
        getCategoryBreakdown(activeExpenses, "expense");

    const topCat =
        categories[0];

    const currentExpenses =
        monthSummary.expenses > 0 ? monthSummary.expenses : allTimeSummary.expenses;

    const currentIncome =
        monthSummary.income > 0 ? monthSummary.income : allTimeSummary.income;

    const currentBalance =
        currentIncome - currentExpenses;

    const topCatShare =
        topCat && currentExpenses > 0
            ? Math.round((topCat.amount / currentExpenses) * 100)
            : 0;

    let headline = "";
    let detail = "";

    if (currentIncome === 0 && currentExpenses > 0) {
        headline = "Heavy outgoing spending with zero income logged.";
        detail = topCat
            ? `You've spent ${formatCurrency(currentExpenses)}, with ${topCat.category} taking up ${topCatShare}% (${formatCurrency(topCat.amount)}). Log your earnings to balance cash flow.`
            : `Total spending is ${formatCurrency(currentExpenses)}. Record your earnings to calculate your savings rate.`;
    } else if (currentBalance < 0 || (monthSummary.income > 0 && monthSummary.balance < 0)) {
        headline = "Monthly expenses are outpacing your earnings.";
        detail = topCat
            ? `${topCat.category} is your highest expense at ${formatCurrency(topCat.amount)} (${topCatShare}% of spending). Slow down spending to recover a positive balance.`
            : `You are currently spending faster than you earn (Deficit: ${formatCurrency(Math.abs(currentBalance))}).`;
    } else {
        const spentRatio =
            currentIncome > 0 ? (currentExpenses / currentIncome) * 100 : 0;

        const currentSavingsRate =
            Math.max(0, 100 - spentRatio);

        if (spentRatio >= 80) {
            headline = "Spending is running high relative to income.";
            detail = topCat
                ? `You have already spent ${spentRatio.toFixed(0)}% of earnings. ${topCat.category} accounts for ${formatCurrency(topCat.amount)} (${topCatShare}%).`
                : `You've used ${spentRatio.toFixed(0)}% of earnings. Margins are slim—watch discretionary purchases.`;
        } else if (spentRatio >= 50) {
            headline = "Moderate cash flow with active spending.";
            detail = topCat
                ? `${topCat.category} is leading your expenses at ${formatCurrency(topCat.amount)} (${topCatShare}%). You are currently retaining ${currentSavingsRate.toFixed(0)}% of earnings.`
                : `You are retaining ${currentSavingsRate.toFixed(0)}% of your income. Finances are in a balanced position.`;
        } else if (spentRatio >= 20) {
            headline = "Strong savings velocity and healthy margins.";
            detail = topCat
                ? `You're saving ${currentSavingsRate.toFixed(0)}% of earnings after ${formatCurrency(currentExpenses)} spent. ${topCat.category} is highest at ${formatCurrency(topCat.amount)}.`
                : `Solid financial position—saving ${currentSavingsRate.toFixed(0)}% of your income.`;
        } else {
            headline = "Exceptional savings with minimal spending.";
            detail = `Over ${currentSavingsRate.toFixed(0)}% of income is preserved. Only ${formatCurrency(currentExpenses)} spent so far.`;
        }
    }

    return { headline, detail };

}


async function requestAIStatus(forceRefresh = false) {

    const transactions =
        getTransactions();

    if (transactions.length === 0) return;

    const allTimeSummary =
        getFinancialSummary(transactions);

    const monthTransactions =
        getTransactionsByPeriod("month", transactions);

    const monthSummary =
        getFinancialSummary(monthTransactions);

    const txHash =
        `${transactions.length}_${allTimeSummary.balance}_${allTimeSummary.expenses}_${allTimeSummary.income}`;

    const refreshBtn =
        document.getElementById("refresh-ai-status-btn");

    const headlineEl =
        document.getElementById("dashboard-status-headline");

    const detailEl =
        document.getElementById("dashboard-status-detail");

    const badgeLabel =
        document.querySelector(".status-badge-label");

    // If user clicked refresh button explicitly
    if (forceRefresh) {
        try {
            localStorage.removeItem(AI_STATUS_CACHE_KEY);
        } catch (e) {}

        isFetchingAIStatus = false;

        if (badgeLabel) {
            badgeLabel.textContent = "Analyzing with AI...";
        }

        if (headlineEl) {
            headlineEl.textContent = "Analyzing your latest financial activity...";
        }

        if (detailEl) {
            detailEl.textContent = "Meowth AI is generating a fresh evaluation of your cash flow...";
        }

        if (refreshBtn) {
            refreshBtn.classList.add("loading");
        }
    } else {
        // 1. Check local cache (fresh for up to 5 minutes for the identical transactions state)
        try {
            const cached = JSON.parse(localStorage.getItem(AI_STATUS_CACHE_KEY));
            const isFresh = cached && cached.timestamp && (Date.now() - cached.timestamp < 5 * 60 * 1000);
            if (cached && cached.txHash === txHash && cached.headline && cached.detail && isFresh) {
                renderStatusCardContent(cached.headline, cached.detail, true);
                return;
            }
        } catch (e) {}

        // 2. Display dynamic local rule-based intelligence immediately while waiting
        const fallback =
            getDynamicFinancialStatus(transactions, allTimeSummary, monthSummary);

        renderStatusCardContent(fallback.headline, fallback.detail, false);
    }

    // 3. Request fresh AI assessment
    if (isFetchingAIStatus) return;
    isFetchingAIStatus = true;

    if (refreshBtn) {
        refreshBtn.classList.add("loading");
    }

    try {
        const financialContext =
            buildFinancialContext();

        const response =
            await fetch(
                "/.netlify/functions/financial-status",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        financialContext,
                        refreshSeed: forceRefresh ? Date.now() : undefined
                    })
                }
            );

        if (response.ok) {
            const data = await response.json();
            const headline = data.headline?.trim();
            const detail = data.detail?.trim();

            if (headline) {
                const cachePayload = {
                    txHash,
                    headline,
                    detail: detail || "",
                    timestamp: Date.now()
                };

                localStorage.setItem(AI_STATUS_CACHE_KEY, JSON.stringify(cachePayload));
                renderStatusCardContent(headline, detail || "", true);
            } else {
                const fallback =
                    getDynamicFinancialStatus(transactions, allTimeSummary, monthSummary);
                renderStatusCardContent(fallback.headline, fallback.detail, false);
            }
        } else {
            console.warn("Financial status endpoint returned non-200:", response.status);
            const fallback =
                getDynamicFinancialStatus(transactions, allTimeSummary, monthSummary);
            renderStatusCardContent(fallback.headline, fallback.detail, false);
        }
    } catch (err) {
        console.warn("AI status request note: fallback dynamic status active.", err);
        const fallback =
            getDynamicFinancialStatus(transactions, allTimeSummary, monthSummary);
        renderStatusCardContent(fallback.headline, fallback.detail, false);
    } finally {
        isFetchingAIStatus = false;
        if (refreshBtn) {
            refreshBtn.classList.remove("loading");
        }
    }

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
