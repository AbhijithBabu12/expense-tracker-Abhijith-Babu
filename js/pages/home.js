import {
    createTransaction
} from "../data/transactions.js";

import {
    validateTransaction
} from "../core/validation.js";


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


    // Default date = today
    dateInput.value =
        new Date().toISOString().split("T")[0];


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

                alert(
                    "Please enter a custom category."
                );

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

            description:
                formData.get("description")

        };


        // --------------------------------
        // Validation
        // --------------------------------

        const validation =
            validateTransaction(data);


        if (!validation.valid) {

            alert(
                Object.values(validation.errors)
                    .join("\n")
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


        // Restore today's date
        dateInput.value =
            new Date()
                .toISOString()
                .split("T")[0];


        // Restore expense
        transactionType = "expense";


        typeButtons.forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.type === "expense"
            );

        });


        alert("Transaction added successfully.");

    });

}