const STORAGE_KEYS = {
    transactions: "spendwise_transactions",
    categories: "spendwise_categories",
    settings: "spendwise_settings"
};


const DEFAULT_CATEGORIES = [
    "Food",
    "Transport",
    "Shopping",
    "Bills",
    "Entertainment",
    "Health",
    "Salary",
    "Freelance",
    "Business",
    "Investment",
    "Gift",
    "Other"
];

export function saveTransactions(transactions) {

    localStorage.setItem(
        STORAGE_KEYS.transactions,
        JSON.stringify(transactions)
    );

}


export function getTransactions() {

    const data =
        localStorage.getItem(
            STORAGE_KEYS.transactions
        );

    if (!data) {
        return [];
    }

    try {

        return JSON.parse(data);

    } catch (error) {

        console.error(
            "Failed to parse transactions:",
            error
        );

        return [];
    }

}


export function saveCategories(categories) {

    localStorage.setItem(
        STORAGE_KEYS.categories,
        JSON.stringify(categories)
    );

}

export function getCategories() {

    const data =
        localStorage.getItem(
            STORAGE_KEYS.categories
        );


    if (!data) {

        saveCategories(
            DEFAULT_CATEGORIES
        );

        return [
            ...DEFAULT_CATEGORIES
        ];

    }


    try {

        const categories =
            JSON.parse(data);

        const mergedCategories = [
            ...new Set([
                ...DEFAULT_CATEGORIES,
                ...categories
            ])
        ];

        if (
            mergedCategories.length !==
            categories.length
        ) {
            saveCategories(mergedCategories);
        }

        return mergedCategories;

    } catch {

        return [
            ...DEFAULT_CATEGORIES
        ];

    }

}


export function saveSettings(settings) {

    localStorage.setItem(
        STORAGE_KEYS.settings,
        JSON.stringify(settings)
    );

}


export function getSettings() {

    const data =
        localStorage.getItem(
            STORAGE_KEYS.settings
        );

    if (!data) {
        return {};
    }

    try {
        return JSON.parse(data);
    } catch {
        return {};
    }

}
