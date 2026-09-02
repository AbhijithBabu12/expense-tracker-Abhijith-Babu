import {
    createTransaction
} from "../data/transactions.js";

import {
    validateTransaction
} from "../core/validation.js";

import {
    showNotification
} from "../components/notifications.js";

let transactionType = "expense";


export function initializeHome() {

    const form =
        document.getElementById("transaction-form");

    const dateInput =
        document.getElementById("date");

    const typeButtons =
        document.querySelectorAll(".type-button");

    const categorySelect =
        document.getElementById("category");

    const customCategoryGroup =
        document.getElementById("custom-category-group");

    const customCategoryInput =
        document.getElementById("custom-category");

    const timeInput =
        document.getElementById("time");


    // Default date = today, time = now
    const now = new Date();
    dateInput.value =
        now.toISOString().split("T")[0];
    timeInput.value =
        now.toTimeString().slice(0, 5);


    // --------------------------------
    // Expense / Income toggle
    // --------------------------------

    typeButtons.forEach(button => {

        button.addEventListener("click", () => {

            typeButtons.forEach(btn => {
                btn.classList.remove("active");
            });

            button.classList.add("active");

            transactionType =
                button.dataset.type;

        });

    });


    // --------------------------------
    // Category → Other
    // --------------------------------

    categorySelect.addEventListener("change", () => {

        const isOther =
            categorySelect.value === "Other";


        customCategoryGroup.classList.toggle(
            "hidden",
            !isOther
        );


        if (!isOther) {
            customCategoryInput.value = "";
        }

    });


    // --------------------------------
    // Form submission
    // --------------------------------

    form.addEventListener("submit", event => {

        event.preventDefault();


        const formData =
            new FormData(form);


        let category =
            formData.get("category");


        // If Other is selected,
        // use the manually entered category
        if (category === "Other") {

            const customCategory =
                customCategoryInput.value.trim();


            if (!customCategory) {

                showNotification("Please enter a custom category.", "error");

                customCategoryInput.focus();

                return;
            }


            category = customCategory;
        }


        const data = {

            type: transactionType,

            amount:
                formData.get("amount"),

            category: category,

            date:
                formData.get("date"),

            time:
                formData.get("time"),

            description:
                formData.get("description")

        };


        // --------------------------------
        // Validation
        // --------------------------------

        const validation =
            validateTransaction(data);


        if (!validation.valid) {

            showNotification(
                Object.values(validation.errors).join(" "),
                "error"
            );

            return;
        }


        // --------------------------------
        // Save transaction
        // --------------------------------

        createTransaction(data);


        // Tell the rest of the application
        // that transaction data changed
        window.dispatchEvent(
            new CustomEvent("transactionsChanged")
        );


        // --------------------------------
        // Reset form
        // --------------------------------

        form.reset();


        // Hide custom category
        customCategoryGroup.classList.add("hidden");

        customCategoryInput.value = "";


        // Restore today's date and time
        const resetTime = new Date();
        dateInput.value =
            resetTime.toISOString().split("T")[0];
        timeInput.value =
            resetTime.toTimeString().slice(0, 5);


        // Restore expense
        transactionType = "expense";


        typeButtons.forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.type === "expense"
            );

        });


        showNotification("Transaction added successfully.");

    });

}