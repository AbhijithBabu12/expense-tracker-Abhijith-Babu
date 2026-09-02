import {
    getTransactions,
    saveTransactions
} from "./storage.js";


// Re-export getTransactions so other modules
// can access transaction data through this module.
export { getTransactions };


export function createTransaction(data) {

    const transactions = getTransactions();

    const transaction = {
        id: crypto.randomUUID(),

        type: data.type,

        amount: Number(data.amount),

        category: data.category,

        date: data.date,

        time: data.time || "",

        description: data.description?.trim() || "",

        createdAt: new Date().toISOString()
    };

    transactions.push(transaction);

    saveTransactions(transactions);

    dispatchTransactionsChanged();

    return transaction;
}


export function createTransactions(items) {

    const transactions =
        getTransactions();

    const createdTransactions =
        items.map(data => ({
            id: crypto.randomUUID(),
            type: data.type,
            amount: Number(data.amount),
            category: data.category,
            date: data.date,
            time: data.time || "",
            description: data.description?.trim() || "",
            createdAt: new Date().toISOString()
        }));

    saveTransactions([
        ...transactions,
        ...createdTransactions
    ]);

    dispatchTransactionsChanged();

    return createdTransactions;

}


export function deleteTransaction(id) {

    const transactions = getTransactions();

    const updatedTransactions =
        transactions.filter(
            transaction => transaction.id !== id
        );

    saveTransactions(updatedTransactions);

    dispatchTransactionsChanged();

}


export function updateTransaction(id, updates) {

    const transactions = getTransactions();

    const index =
        transactions.findIndex(
            transaction => transaction.id === id
        );

    if (index === -1) {
        return null;
    }

    transactions[index] = {
        ...transactions[index],
        ...updates,
        updatedAt: new Date().toISOString()
    };

    saveTransactions(transactions);

    dispatchTransactionsChanged();

    return transactions[index];
}


function dispatchTransactionsChanged() {

    window.dispatchEvent(
        new CustomEvent("transactionsChanged")
    );

}
