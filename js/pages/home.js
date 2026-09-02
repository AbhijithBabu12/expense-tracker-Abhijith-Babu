import {
    createTransaction
} from "../data/transactions.js";

import {
    validateTransaction
} from "../core/validation.js";

import {
    getCategories,
    saveCategories
} from "../data/storage.js";

import {
    showNotification
} from "../components/notifications.js";


let transactionType = "expense";

const categoryOptions = {
    expense: [
        "Food",
        "Transport",
        "Shopping",
        "Bills",
        "Entertainment",
        "Health",
        "Other"
    ],
    income: [
        "Salary",
        "Freelance",
        "Business",
        "Investment",
        "Gift",
        "Other"
    ]
};



export function initializeHome() {

    const form =
        document.getElementById("transaction-form");

    const dateInput =
        document.getElementById("date");

    const timeInput =
        document.getElementById("time");

    const typeButtons =
        document.querySelectorAll(".type-button");

    const categorySelect =
        document.getElementById("category");

    const customCategoryGroup =
        document.getElementById("custom-category-group");

    const customCategoryInput =
        document.getElementById("custom-category");


    // Default date = today
    dateInput.value =
        new Date().toISOString().split("T")[0];

    // Default time = now
    timeInput.value =
        new Date().toTimeString().substring(0, 5);

    renderCategoryOptions(categorySelect);


    // Expense / Income toggle
    typeButtons.forEach(button => {

        button.addEventListener("click", () => {

            typeButtons.forEach(btn => {
                btn.classList.remove("active");
            });

            button.classList.add("active");

            transactionType =
                button.dataset.type;

            renderCategoryOptions(categorySelect);

            hideCustomCategory(
                customCategoryGroup,
                customCategoryInput
            );

        });

    });

    categorySelect.addEventListener("change", () => {

        const isCustomCategory =
            categorySelect.value === "Other";

        toggleCustomCategory(
            customCategoryGroup,
            customCategoryInput,
            isCustomCategory
        );

    });


    // Form submission
    form.addEventListener("submit", event => {

        event.preventDefault();

        const formData =
            new FormData(form);

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

            type: transactionType,

            amount:
                formData.get("amount"),

            category,

            date:
                formData.get("date"),

            time:
                formData.get("time"),

            description:
                formData.get("description")

        };


        const validation =
            validateTransaction(data);


        if (!validation.valid) {

            showNotification(
                Object.values(validation.errors)
                    .join(" "),
                "error"
            );

            return;
        }


        saveCustomCategory(category);

        createTransaction(data);


        form.reset();


        // Restore today's date
        dateInput.value =
            new Date()
                .toISOString()
                .split("T")[0];

        // Restore current time
        timeInput.value =
            new Date()
                .toTimeString()
                .substring(0, 5);

        customCategoryGroup.classList.add("hidden");

        customCategoryInput.required = false;
        transactionType = "expense";

        typeButtons.forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.type === "expense"
            );

        });

        renderCategoryOptions(categorySelect);


        showNotification(
            "Transaction added successfully."
        );

    });

}


function renderCategoryOptions(select) {

    select.innerHTML = `
        <option value="">Select category</option>
        ${categoryOptions[transactionType]
            .map(category => `
                <option value="${category}">${category}</option>
            `)
            .join("")}
    `;

}


function hideCustomCategory(group, input) {

    toggleCustomCategory(group, input, false);

}


function toggleCustomCategory(group, input, shouldShow) {

    group.classList.toggle(
        "hidden",
        !shouldShow
    );

    input.required = shouldShow;

    if (!shouldShow) {
        input.value = "";
    }

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
