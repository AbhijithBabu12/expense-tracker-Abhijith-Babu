import {
    getCategoryBreakdown,
    getDailySpending,
    getExpenseTrend,
    getFinancialSummary,
    getIncomeTrend,
    getTopExpenses,
    getTransactionsByPeriod
} from "../core/calculations.js";


let currentPeriod = "today";


// Curated color palette — muted, harmonious, Apple-style
const CHART_COLORS = [
    "hsl(225, 48%, 58%)",   // Muted indigo
    "hsl(170, 42%, 48%)",   // Soft teal
    "hsl(345, 44%, 62%)",   // Dusty rose
    "hsl(38,  58%, 58%)",   // Warm amber
    "hsl(270, 36%, 58%)",   // Lavender
    "hsl(195, 50%, 50%)",   // Ocean blue
    "hsl(14,  52%, 56%)",   // Terracotta
    "hsl(145, 38%, 46%)",   // Sage green
    "hsl(320, 32%, 52%)",   // Mauve
    "hsl(55,  48%, 52%)"    // Golden olive
];


export function initializeAnalytics() {

    setupPeriodControls();

    window.addEventListener(
        "transactionsChanged",
        renderAnalytics
    );

    renderAnalytics();

}


function setupPeriodControls() {

    const buttons =
        document.querySelectorAll(".period-button");

    buttons.forEach(button => {

        button.addEventListener("click", () => {

            buttons.forEach(item => {
                item.classList.remove("active");
            });

            button.classList.add("active");

            currentPeriod =
                button.dataset.period;

            renderAnalytics();

        });

    });

}


function renderAnalytics() {

    const container =
        document.getElementById("analytics-content");

    const transactions =
        getTransactionsByPeriod(currentPeriod);

    const summary =
        getFinancialSummary(transactions);

    const categories =
        getCategoryBreakdown(transactions, "expense");

    const topExpenses =
        getTopExpenses(transactions, 5);

    const expenseTrend =
        getExpenseTrend(transactions, currentPeriod);

    const incomeTrend =
        getIncomeTrend(transactions, currentPeriod);

    const dailySpending =
        getDailySpending(transactions);

    if (transactions.length === 0) {

        container.innerHTML = createEmptyState();

        return;

    }

    container.innerHTML = `
        <div class="analytics-grid">
            ${createMetricCard(
                "Income",
                formatCurrency(summary.income),
                "Money added in this period"
            )}

            ${createMetricCard(
                "Expenses",
                formatCurrency(summary.expenses),
                "Money spent in this period"
            )}

            ${createMetricCard(
                "Balance",
                formatCurrency(summary.balance),
                "Income minus expenses",
                summary.balance >= 0 ? "positive" : "negative"
            )}
        </div>

        <section class="analytics-panel savings-panel">
            <div>
                <p class="panel-label">Savings rate</p>
                <h3>${formatPercent(summary.savingsRate)}</h3>
            </div>

            <div class="progress-track" aria-hidden="true">
                <span style="width: ${getProgressWidth(summary.savingsRate)}%"></span>
            </div>
        </section>

        <section class="analytics-panel comparison-panel">
            <div class="panel-heading">
                <div>
                    <p class="panel-label">Income vs expense</p>
                    <h3>${getPeriodName(currentPeriod)} comparison</h3>
                </div>
            </div>

            ${createComparison(summary)}
        </section>

        ${createDonutChart(categories, summary.expenses)}

        <div class="analytics-columns">
            <section class="analytics-panel">
                <div class="panel-heading">
                    <div>
                        <p class="panel-label">Spending by category</p>
                        <h3>Where it went</h3>
                    </div>
                </div>

                ${createCategoryBars(categories, summary.expenses)}
            </section>

            <section class="analytics-panel">
                <div class="panel-heading">
                    <div>
                        <p class="panel-label">Top expenses</p>
                        <h3>Largest spends</h3>
                    </div>
                </div>

                ${createTopExpenses(topExpenses)}
            </section>
        </div>

        ${createAreaChart(expenseTrend, incomeTrend)}

        ${createHeatmapCalendar(dailySpending)}

        <section class="analytics-panel">
            <div class="panel-heading">
                <div>
                    <p class="panel-label">Spending trend</p>
                    <h3>Expense movement</h3>
                </div>
            </div>

            ${createTrend(expenseTrend)}
        </section>
    `;

}


/* =========================================
   DONUT CHART
========================================= */

function createDonutChart(categories, totalExpenses) {

    if (categories.length === 0 || totalExpenses === 0) {
        return "";
    }

    const size = 180;
    const strokeWidth = 28;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const cx = size / 2;
    const cy = size / 2;

    let cumulativeOffset = 0;

    const arcs = categories.map((item, index) => {

        const percentage =
            item.amount / totalExpenses;

        const dashLength =
            percentage * circumference;

        const gapLength =
            circumference - dashLength;

        const offset =
            cumulativeOffset;

        cumulativeOffset += dashLength;

        const color =
            CHART_COLORS[index % CHART_COLORS.length];

        return `
            <circle
                cx="${cx}" cy="${cy}" r="${radius}"
                fill="none"
                stroke="${color}"
                stroke-width="${strokeWidth}"
                stroke-dasharray="${dashLength} ${gapLength}"
                stroke-dashoffset="${-offset}"
                stroke-linecap="butt"
                class="donut-segment"
                style="--delay: ${index * 0.08}s"
            />
        `;

    });

    const legendItems = categories.slice(0, 8).map((item, index) => {

        const percentage =
            totalExpenses === 0
                ? 0
                : ((item.amount / totalExpenses) * 100).toFixed(1);

        const color =
            CHART_COLORS[index % CHART_COLORS.length];

        return `
            <div class="donut-legend-item">
                <span class="donut-legend-dot" style="background: ${color}"></span>
                <span class="donut-legend-label">${escapeHTML(item.category)}</span>
                <span class="donut-legend-value">${percentage}%</span>
            </div>
        `;

    });

    return `
        <section class="analytics-panel donut-chart-panel">
            <div class="panel-heading">
                <div>
                    <p class="panel-label">Category split</p>
                    <h3>Expense breakdown</h3>
                </div>
            </div>

            <div class="donut-chart-content">
                <div class="donut-chart-wrapper">
                    <svg
                        viewBox="0 0 ${size} ${size}"
                        class="donut-svg"
                        aria-hidden="true"
                    >
                        ${arcs.join("")}
                    </svg>

                    <div class="donut-center-label">
                        <strong>${formatCurrency(totalExpenses)}</strong>
                        <span>Total</span>
                    </div>
                </div>

                <div class="donut-legend">
                    ${legendItems.join("")}
                </div>
            </div>
        </section>
    `;

}


/* =========================================
   HEATMAP CALENDAR
========================================= */

function createHeatmapCalendar(dailySpending) {

    if (!dailySpending || dailySpending.length === 0) {
        return "";
    }

    const maxSpend =
        Math.max(
            ...dailySpending.map(d => d.amount),
            1
        );

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const monthName =
        new Intl.DateTimeFormat("en-IN", {
            month: "long",
            year: "numeric"
        }).format(now);

    // Day-of-week the 1st falls on (Mon=0 based)
    const firstDayOfMonth =
        new Date(year, month, 1).getDay();

    const startOffset =
        firstDayOfMonth === 0
            ? 6
            : firstDayOfMonth - 1;

    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    const headerCells =
        dayLabels.map(d =>
            `<div class="heatmap-day-label">${d}</div>`
        ).join("");

    // Empty offset cells
    const emptyCells =
        Array.from(
            { length: startOffset },
            () => `<div class="heatmap-cell empty"></div>`
        ).join("");

    const dayCells =
        dailySpending.map(day => {

            const intensity =
                day.amount === 0
                    ? 0
                    : Math.max(
                        (day.amount / maxSpend) * 100,
                        15
                    );

            const dayNum =
                parseInt(day.date.split("-")[2], 10);

            const isToday =
                dayNum === now.getDate();

            return `
                <div
                    class="heatmap-cell ${isToday ? "today" : ""}"
                    style="--intensity: ${intensity}%"
                    title="${dayNum} ${monthName.split(" ")[0]}: ${formatCurrency(day.amount)}"
                >
                    <span class="heatmap-cell-day">${dayNum}</span>
                </div>
            `;

        }).join("");

    return `
        <section class="analytics-panel heatmap-panel">
            <div class="panel-heading">
                <div>
                    <p class="panel-label">Daily spending</p>
                    <h3>${monthName}</h3>
                </div>
            </div>

            <div class="heatmap-grid">
                ${headerCells}
                ${emptyCells}
                ${dayCells}
            </div>

            <div class="heatmap-scale">
                <span>Less</span>
                <div class="heatmap-scale-bar">
                    <span style="--intensity: 0%"></span>
                    <span style="--intensity: 25%"></span>
                    <span style="--intensity: 50%"></span>
                    <span style="--intensity: 75%"></span>
                    <span style="--intensity: 100%"></span>
                </div>
                <span>More</span>
            </div>
        </section>
    `;

}


/* =========================================
   AREA CHART (Income vs Expense)
========================================= */

function createAreaChart(expenseTrend, incomeTrend) {

    // Merge all labels from both trends
    const allLabels = [
        ...new Set([
            ...expenseTrend.map(t => t.label),
            ...incomeTrend.map(t => t.label)
        ])
    ];

    if (allLabels.length < 2) {
        return "";
    }

    const expenseMap =
        Object.fromEntries(
            expenseTrend.map(t => [t.label, t.amount])
        );

    const incomeMap =
        Object.fromEntries(
            incomeTrend.map(t => [t.label, t.amount])
        );

    const expenseValues =
        allLabels.map(l => expenseMap[l] || 0);

    const incomeValues =
        allLabels.map(l => incomeMap[l] || 0);

    const rawMax =
        Math.max(
            ...expenseValues,
            ...incomeValues,
            1
        );

    // Provide 25% headroom so the peak doesn't slam into the top ceiling
    const maxValue = rawMax * 1.25;

    const chartWidth = 720;
    const chartHeight = 210;
    const paddingLeft = 54;
    const paddingRight = 36;
    const paddingTop = 20;
    const paddingBottom = 28;

    const plotWidth =
        chartWidth - paddingLeft - paddingRight;

    const plotHeight =
        chartHeight - paddingTop - paddingBottom;

    const pointCount = allLabels.length;

    const step =
        pointCount > 1
            ? plotWidth / (pointCount - 1)
            : plotWidth;

    function getPoint(val, i) {
        const x = paddingLeft + (pointCount > 1 ? i * step : plotWidth / 2);
        const y = paddingTop + plotHeight - (val / maxValue) * plotHeight;
        return { x, y };
    }

    // Smooth cubic spline curve
    function buildSmoothPath(values) {
        if (values.length === 0) return "";
        const points = values.map((val, i) => getPoint(val, i));

        if (points.length === 1) {
            return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
        }

        if (points.length === 2) {
            return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
        }

        let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[Math.max(0, i - 1)];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[Math.min(points.length - 1, i + 2)];

            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
        }
        return d;
    }

    function buildSmoothArea(values) {
        const linePath = buildSmoothPath(values);
        if (!linePath) return "";
        const firstX = paddingLeft;
        const lastX = paddingLeft + (pointCount > 1 ? (pointCount - 1) * step : plotWidth / 2);
        const baseY = paddingTop + plotHeight;
        return `${linePath} L ${lastX.toFixed(1)} ${baseY.toFixed(1)} L ${firstX.toFixed(1)} ${baseY.toFixed(1)} Z`;
    }

    function buildDots(values, color) {
        return values.map((val, i) => {
            const pt = getPoint(val, i);
            return `
                <circle
                    cx="${pt.x.toFixed(1)}"
                    cy="${pt.y.toFixed(1)}"
                    r="4"
                    fill="${color}"
                    stroke="var(--color-surface)"
                    stroke-width="2"
                    class="area-dot"
                >
                    <title>${allLabels[i]}: ₹${val.toLocaleString("en-IN")}</title>
                </circle>
            `;
        }).join("");
    }

    const expenseLine = buildSmoothPath(expenseValues);
    const expenseArea = buildSmoothArea(expenseValues);
    const incomeLine = buildSmoothPath(incomeValues);
    const incomeArea = buildSmoothArea(incomeValues);

    const incomeDots = buildDots(incomeValues, "hsl(170, 42%, 48%)");
    const expenseDots = buildDots(expenseValues, "hsl(345, 44%, 62%)");

    // Grid lines & Y-axis levels
    const gridLevels = [
        { val: rawMax },
        { val: Math.round(rawMax / 2) },
        { val: 0 }
    ];

    const gridMarkup = gridLevels.map(lvl => {
        const y = paddingTop + plotHeight - (lvl.val / maxValue) * plotHeight;
        const formattedVal = formatCompactNumber(lvl.val);
        return `
            <g class="chart-grid-row">
                <text
                    x="${paddingLeft - 10}"
                    y="${(y + 3).toFixed(1)}"
                    text-anchor="end"
                    class="area-chart-y-label"
                >₹${formattedVal}</text>
                <line
                    x1="${paddingLeft}"
                    y1="${y.toFixed(1)}"
                    x2="${(chartWidth - paddingRight).toFixed(1)}"
                    y2="${y.toFixed(1)}"
                    class="area-grid-line"
                />
            </g>
        `;
    }).join("");

    // X-axis labels — show at most 8
    const labelInterval =
        Math.max(1, Math.ceil(pointCount / 8));

    const xLabels =
        allLabels
            .filter((_, i) =>
                i % labelInterval === 0 ||
                i === pointCount - 1
            )
            .map(label => {

                const originalIndex =
                    allLabels.indexOf(label);

                const x =
                    paddingLeft + (pointCount > 1 ? originalIndex * step : plotWidth / 2);

                return `
                    <text
                        x="${x.toFixed(1)}"
                        y="${chartHeight - 6}"
                        text-anchor="middle"
                        class="area-chart-label"
                    >${escapeHTML(label)}</text>
                `;

            }).join("");

    return `
        <section class="analytics-panel area-chart-panel">
            <div class="panel-heading">
                <div>
                    <p class="panel-label">Income vs expenses</p>
                    <h3>Trend comparison</h3>
                </div>

                <div class="area-chart-legend">
                    <span class="area-legend-item income-legend">
                        <span></span> Income
                    </span>
                    <span class="area-legend-item expense-legend">
                        <span></span> Expenses
                    </span>
                </div>
            </div>

            <div class="area-chart-wrapper">
                <svg
                    viewBox="0 0 ${chartWidth} ${chartHeight}"
                    class="area-chart-svg"
                    preserveAspectRatio="xMidYMid meet"
                    aria-hidden="true"
                >
                    <defs>
                        <linearGradient id="grad-income" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="hsl(170, 42%, 48%)" stop-opacity="0.22" />
                            <stop offset="100%" stop-color="hsl(170, 42%, 48%)" stop-opacity="0.01" />
                        </linearGradient>
                        <linearGradient id="grad-expense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="hsl(345, 44%, 62%)" stop-opacity="0.22" />
                            <stop offset="100%" stop-color="hsl(345, 44%, 62%)" stop-opacity="0.01" />
                        </linearGradient>
                    </defs>

                    <!-- Background Grid -->
                    ${gridMarkup}

                    <!-- Income Area & Line -->
                    <path d="${incomeArea}" fill="url(#grad-income)" class="area-fill" />
                    <path d="${incomeLine}" fill="none" stroke="hsl(170, 42%, 48%)" stroke-width="2.5" stroke-linejoin="round" class="area-line" />
                    ${incomeDots}

                    <!-- Expense Area & Line -->
                    <path d="${expenseArea}" fill="url(#grad-expense)" class="area-fill" />
                    <path d="${expenseLine}" fill="none" stroke="hsl(345, 44%, 62%)" stroke-width="2.5" stroke-linejoin="round" class="area-line" />
                    ${expenseDots}

                    <!-- X-axis labels -->
                    ${xLabels}
                </svg>
            </div>
        </section>
    `;

}


/* =========================================
   EXISTING PANELS (preserved)
========================================= */

function createComparison(summary) {

    const maxValue =
        Math.max(
            summary.income,
            summary.expenses,
            1
        );

    return `
        <div class="comparison-bars">
            <div class="comparison-row">
                <span>Income</span>
                <div class="comparison-track income-track">
                    <b style="width: ${(summary.income / maxValue) * 100}%"></b>
                </div>
                <strong>${formatCurrency(summary.income)}</strong>
            </div>

            <div class="comparison-row">
                <span>Expenses</span>
                <div class="comparison-track expense-track">
                    <b style="width: ${(summary.expenses / maxValue) * 100}%"></b>
                </div>
                <strong>${formatCurrency(summary.expenses)}</strong>
            </div>
        </div>
    `;

}


function createMetricCard(label, value, detail, tone = "") {

    return `
        <article class="metric-card ${tone}">
            <span>${label}</span>
            <strong>${value}</strong>
            <p>${detail}</p>
        </article>
    `;

}


function createCategoryBars(categories, totalExpenses) {

    if (categories.length === 0) {
        return `<p class="muted-copy">No expenses in this period yet.</p>`;
    }

    return `
        <div class="category-bars">
            ${categories.map(item => {

                const percentage =
                    totalExpenses === 0
                        ? 0
                        : (item.amount / totalExpenses) * 100;

                return `
                    <div class="category-row">
                        <div class="category-row-header">
                            <span>${escapeHTML(item.category)}</span>
                            <strong>${formatCurrency(item.amount)}</strong>
                        </div>

                        <div class="bar-track" aria-hidden="true">
                            <span style="width: ${Math.max(percentage, 4)}%"></span>
                        </div>
                    </div>
                `;

            }).join("")}
        </div>
    `;

}


function createTopExpenses(expenses) {

    if (expenses.length === 0) {
        return `<p class="muted-copy">No expenses to rank yet.</p>`;
    }

    return `
        <div class="top-expenses">
            ${expenses.map((transaction, index) => `
                <article class="top-expense-item">
                    <span>${index + 1}</span>

                    <div>
                        <strong>
                            ${escapeHTML(
                                transaction.description ||
                                transaction.category
                            )}
                        </strong>
                        <p>${escapeHTML(transaction.category)} - ${formatDate(transaction.date)}</p>
                    </div>

                    <b>${formatCurrency(transaction.amount)}</b>
                </article>
            `).join("")}
        </div>
    `;

}


function createTrend(trend) {

    if (trend.length === 0) {
        return `
            <div class="trend-empty">
                <strong>No expense trend yet</strong>
                <p>Add expenses in this period to build the chart.</p>
            </div>
        `;
    }

    const maxAmount =
        Math.max(
            ...trend.map(item => item.amount)
        );

    return `
        <div class="trend-chart">
            ${trend.map(item => `
                <div class="trend-column">
                    <strong>${formatCurrency(item.amount)}</strong>
                    <span
                        style="height: ${getTrendHeight(item.amount, maxAmount)}%"
                        title="${formatCurrency(item.amount)}"
                    ></span>
                    <small>${escapeHTML(item.label)}</small>
                </div>
            `).join("")}
        </div>
    `;

}


/* =========================================
   HELPERS
========================================= */

function getPeriodName(period) {

    const names = {
        today: "Today",
        week: "This week",
        month: "This month",
        year: "This year",
        all: "All time"
    };

    return names[period] || "Selected period";

}


function createEmptyState() {

    return `
        <div class="empty-state analytics-empty">
            <div class="empty-icon">+</div>
            <h3>No analytics yet.</h3>
            <p>Add transactions for this period to see your totals and trends.</p>
        </div>
    `;

}


function getProgressWidth(value) {

    return Math.min(
        Math.max(value, 0),
        100
    );

}


function getTrendHeight(amount, maxAmount) {

    if (maxAmount === 0) {
        return 8;
    }

    return Math.max(
        (amount / maxAmount) * 100,
        8
    );

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


function formatPercent(value) {

    return `${value.toFixed(1)}%`;

}


function formatCompactNumber(number) {

    if (!number || Number.isNaN(number)) return "0";
    if (number >= 10000000) return `${(number / 10000000).toFixed(1)}Cr`;
    if (number >= 100000) return `${(number / 100000).toFixed(1)}L`;
    if (number >= 1000) return `${(number / 1000).toFixed(0)}k`;
    return Math.round(number);

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
