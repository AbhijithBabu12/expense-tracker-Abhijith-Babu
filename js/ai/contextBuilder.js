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

    const currentMonthTransactions =
        getTransactionsByPeriod("month", transactions);

    const previousMonthTransactions =
        getPreviousMonthTransactions(transactions);


    const currentMonthSummary =
        getFinancialSummary(currentMonthTransactions);

    const previousMonthSummary =
        getFinancialSummary(previousMonthTransactions);


    const topCategories =
        getCategoryBreakdown(
            currentMonthTransactions,
            "expense"
        ).slice(0, 5);


    const topExpenses =
        getTopExpenses(
            currentMonthTransactions,
            5
        );


    return {

        period: {
            current: getCurrentMonthLabel(),
            previous: getPreviousMonthLabel()
        },

        currentMonth: {
            income: currentMonthSummary.income,
            expenses: currentMonthSummary.expenses,
            balance: currentMonthSummary.balance,
            savings: currentMonthSummary.savings,
            savingsRate: currentMonthSummary.savingsRate
        },

        previousMonth: {
            income: previousMonthSummary.income,
            expenses: previousMonthSummary.expenses,
            balance: previousMonthSummary.balance,
            savings: previousMonthSummary.savings,
            savingsRate: previousMonthSummary.savingsRate
        },

        comparison: {
            incomeChangePercent:
                calculatePercentageChange(
                    previousMonthSummary.income,
                    currentMonthSummary.income
                ),

            expenseChangePercent:
                calculatePercentageChange(
                    previousMonthSummary.expenses,
                    currentMonthSummary.expenses
                ),

            balanceChangePercent:
                calculatePercentageChange(
                    previousMonthSummary.balance,
                    currentMonthSummary.balance
                )
        },

        topCategories: topCategories.map(item => ({
            category: item.category,
            amount: item.amount,
            percentage:
                currentMonthSummary.expenses === 0
                    ? 0
                    : (item.amount /
                        currentMonthSummary.expenses) * 100
        })),

        topExpenses: topExpenses.map(transaction => ({
            description:
                transaction.description ||
                transaction.category,

            category: transaction.category,

            amount: Number(transaction.amount),

            date: transaction.date
        })),

        transactionCount: {
            total: transactions.length,
            currentMonth: currentMonthTransactions.length,
            previousMonth: previousMonthTransactions.length
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