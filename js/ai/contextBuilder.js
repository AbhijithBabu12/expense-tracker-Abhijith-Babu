import {
    getFinancialSummary,
    getCategoryBreakdown,
    getTopExpenses,
    getTransactionsByPeriod
} from "../core/calculations.js";

import { getTransactions } from "../data/transactions.js";


/*
|--------------------------------------------------------------------------
| Build AI Financial Context
|--------------------------------------------------------------------------
|
| This file creates a small, verified financial snapshot for the AI.
|
| IMPORTANT:
| The AI does NOT receive the entire LocalStorage dataset.
| All financial numbers come from our own calculations.js.
|
|--------------------------------------------------------------------------
*/


export function buildFinancialContext() {

    const transactions = getTransactions();

    if (transactions.length === 0) {
        return {
            status: "No transactions recorded yet.",
            transactionCount: { total: 0 }
        };
    }

    // 1. All-time verified summary
    const allTimeSummary = getFinancialSummary(transactions);
    const allTimeCategories = getCategoryBreakdown(transactions, "expense");

    // 2. Group transactions by month (YYYY-MM) across entire history
    const monthMap = new Map();
    for (const tx of transactions) {
        const ym = (tx.date || "").slice(0, 7);
        if (!ym) continue;
        if (!monthMap.has(ym)) {
            monthMap.set(ym, []);
        }
        monthMap.get(ym).push(tx);
    }

    // Sort months descending (e.g. 2026-09, 2026-08, 2026-07)
    const sortedMonths = Array.from(monthMap.keys()).sort().reverse();

    const monthlyBreakdowns = sortedMonths.map(ym => {
        const monthTxs = monthMap.get(ym);
        const summary = getFinancialSummary(monthTxs);
        const cats = getCategoryBreakdown(monthTxs, "expense");
        const topExps = getTopExpenses(monthTxs, 4);

        let label = ym;
        try {
            const [y, m] = ym.split("-");
            const d = new Date(Number(y), Number(m) - 1, 1);
            label = new Intl.DateTimeFormat("en-IN", {
                month: "long",
                year: "numeric"
            }).format(d);
        } catch (e) {}

        return {
            month: ym,
            label,
            income: summary.income,
            expenses: summary.expenses,
            balance: summary.balance,
            savingsRate: Math.round(summary.savingsRate),
            transactionCount: monthTxs.length,
            categories: cats.map(c => ({
                category: c.category,
                amount: c.amount,
                percentage: summary.expenses > 0
                    ? Math.round((c.amount / summary.expenses) * 100)
                    : 0
            })),
            topExpenses: topExps.map(e => ({
                description: e.description || e.category,
                category: e.category,
                amount: Number(e.amount),
                date: e.date
            }))
        };
    });

    // 3. Current & previous month backward compatibility
    const currentMonthLabel = getCurrentMonthLabel();
    const currentMonthObj =
        monthlyBreakdowns.find(m => m.label === currentMonthLabel) ||
        monthlyBreakdowns[0] ||
        { income: 0, expenses: 0, balance: 0, savingsRate: 0, categories: [] };

    const previousMonthLabel = getPreviousMonthLabel();
    const previousMonthObj =
        monthlyBreakdowns.find(m => m.label === previousMonthLabel) ||
        monthlyBreakdowns[1] ||
        { income: 0, expenses: 0, balance: 0, savingsRate: 0, categories: [] };

    // 4. Sample of recent transactions across months
    const recentSample = transactions
        .slice()
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .slice(0, 15)
        .map(t => ({
            date: t.date,
            type: t.type,
            category: t.category,
            amount: Number(t.amount),
            description: t.description || ""
        }));

    return {
        period: {
            current: currentMonthLabel,
            previous: previousMonthLabel,
            availableMonths: sortedMonths
        },

        allTime: {
            income: allTimeSummary.income,
            expenses: allTimeSummary.expenses,
            balance: allTimeSummary.balance,
            savingsRate: Math.round(allTimeSummary.savingsRate),
            categories: allTimeCategories.map(c => ({
                category: c.category,
                amount: c.amount,
                percentage: allTimeSummary.expenses > 0
                    ? Math.round((c.amount / allTimeSummary.expenses) * 100)
                    : 0
            }))
        },

        monthlyBreakdowns,

        currentMonth: {
            label: currentMonthObj.label,
            income: currentMonthObj.income,
            expenses: currentMonthObj.expenses,
            balance: currentMonthObj.balance,
            savingsRate: currentMonthObj.savingsRate,
            categories: currentMonthObj.categories
        },

        previousMonth: {
            label: previousMonthObj.label,
            income: previousMonthObj.income,
            expenses: previousMonthObj.expenses,
            balance: previousMonthObj.balance,
            savingsRate: previousMonthObj.savingsRate,
            categories: previousMonthObj.categories
        },

        comparison: {
            incomeChangePercent:
                calculatePercentageChange(
                    previousMonthObj.income,
                    currentMonthObj.income
                ),

            expenseChangePercent:
                calculatePercentageChange(
                    previousMonthObj.expenses,
                    currentMonthObj.expenses
                ),

            balanceChangePercent:
                calculatePercentageChange(
                    previousMonthObj.balance,
                    currentMonthObj.balance
                )
        },

        topCategories: currentMonthObj.categories || [],

        recentTransactions: recentSample,

        transactionCount: {
            total: transactions.length,
            byMonth: Object.fromEntries(
                monthlyBreakdowns.map(m => [m.label, m.transactionCount])
            )
        }

    };

}


/*
|--------------------------------------------------------------------------
| Previous Month
|--------------------------------------------------------------------------
*/

function getPreviousMonthTransactions(transactions) {

    const now = new Date();

    const previousMonthDate =
        new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            1
        );

    const year =
        previousMonthDate.getFullYear();

    const month =
        String(
            previousMonthDate.getMonth() + 1
        ).padStart(2, "0");


    const prefix =
        `${year}-${month}`;


    return transactions.filter(transaction =>
        transaction.date.startsWith(prefix)
    );

}


/*
|--------------------------------------------------------------------------
| Percentage Change
|--------------------------------------------------------------------------
*/

function calculatePercentageChange(previous, current) {

    if (previous === 0) {

        if (current === 0) {
            return 0;
        }

        return null;
    }


    return (
        ((current - previous) / previous) * 100
    );

}


/*
|--------------------------------------------------------------------------
| Month Labels
|--------------------------------------------------------------------------
*/

function getCurrentMonthLabel() {

    return new Intl.DateTimeFormat(
        "en-IN",
        {
            month: "long",
            year: "numeric"
        }
    ).format(new Date());

}


function getPreviousMonthLabel() {

    const now = new Date();

    const previousMonth =
        new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            1
        );


    return new Intl.DateTimeFormat(
        "en-IN",
        {
            month: "long",
            year: "numeric"
        }
    ).format(previousMonth);

}