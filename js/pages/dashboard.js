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

    const monthCategories =
        getCategoryBreakdown(transactions, "expense");

    const topCat =
        monthCategories[0];

    const savingsRate =
        allTimeSummary.savingsRate;

    const totalExpenses =
        allTimeSummary.expenses;

    const topCatShare =
        topCat && totalExpenses > 0
            ? Math.round((topCat.amount / totalExpenses) * 100)
            : 0;

    let headline = "";
    let detail = "";

    if (allTimeSummary.income === 0 && totalExpenses > 0) {
        headline = "Only expenses recorded so far.";
        detail = topCat
            ? `Total spent is ${formatCurrency(totalExpenses)}, with ${topCat.category} accounting for ${topCatShare}% (${formatCurrency(topCat.amount)}).`
            : "Add your income to unlock net savings rate and full analytics.";
    } else if (allTimeSummary.balance < 0) {
        headline = "Expenses are outpacing your earnings.";
        detail = topCat
            ? `${topCat.category} is your highest expense (${formatCurrency(topCat.amount)}, ${topCatShare}% of spending). Trimming this can restore balance.`
            : `Net deficit of ${formatCurrency(Math.abs(allTimeSummary.balance))}. Consider reviewing discretionary expenses.`;
    } else if (savingsRate >= 45) {
        headline = "Exceptional savings velocity this month.";
        detail = `Saving ${savingsRate.toFixed(0)}% of total earnings (${formatCurrency(allTimeSummary.balance)} retained). ${topCat ? `${topCat.category} is your top expense at ${formatCurrency(topCat.amount)}.` : "Excellent financial discipline."}`;
    } else if (savingsRate >= 25) {
        headline = "Healthy cash flow with steady savings.";
        detail = `You are saving ${savingsRate.toFixed(0)}% of your income. ${topCat ? `${topCat.category} makes up ${topCatShare}% of your outgoing spending.` : "Your finances are comfortably balanced."}`;
    } else if (savingsRate >= 10) {
        headline = "Positive balance with modest savings.";
        detail = `Current savings rate is ${savingsRate.toFixed(0)}%. ${topCat ? `Cutting down on ${topCat.category} (${formatCurrency(topCat.amount)}) can boost your buffer.` : "Keep an eye on variable expenses to increase savings."}`;
    } else {
        headline = "Positive balance with narrow margins.";
        detail = `You are retaining ${savingsRate.toFixed(1)}% of your income. Building an emergency reserve is recommended.`;
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

    // 1. Check local cache first if not explicitly forcing a refresh
    if (!forceRefresh) {
        try {
            const cached = JSON.parse(localStorage.getItem(AI_STATUS_CACHE_KEY));
            if (cached && cached.txHash === txHash && cached.headline && cached.detail) {
                renderStatusCardContent(cached.headline, cached.detail, true);
                return;
            }
        } catch (e) {}
    }

    // 2. Display dynamic local rule-based intelligence immediately
    const fallback =
        getDynamicFinancialStatus(transactions, allTimeSummary, monthSummary);

    renderStatusCardContent(fallback.headline, fallback.detail, false);

    // 3. Request fresh AI assessment in background
    if (isFetchingAIStatus) return;
    isFetchingAIStatus = true;

    const refreshBtn =
        document.getElementById("refresh-ai-status-btn");

    if (refreshBtn) {
        refreshBtn.classList.add("loading");
    }

    try {
        const response =
            await fetch(
                "/.netlify/functions/financial-status",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        financialContext
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
            }
        }
    } catch (err) {
        console.warn("AI status request note: fallback dynamic status active.", err);
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
