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

const categoryIcons = {
    Food: "🍔",
    Transport: "🚗",
    Shopping: "🛍️",
    Bills: "📄",
    Entertainment: "🎬",
    Health: "🩺",
    Salary: "💰",
    Freelance: "💻",
    Business: "📈",
    Investment: "📊",
    Gift: "🎁",
    Other: "✦"
};


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

    setupCategoryCustomDropdown(categorySelect);
    renderCategoryOptions(categorySelect);

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

            renderCategoryOptions(categorySelect);
            
            customCategoryGroup.classList.add("hidden");
            customCategoryInput.value = "";
            customCategoryInput.required = false;

        });

    });


    // --------------------------------
    // Category → Other
    // --------------------------------

    categorySelect.addEventListener("change", () => {

        const isOther =
            categorySelect.value === "Other";

        updateCategoryTriggerDisplay(categorySelect.value);

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

        renderCategoryOptions(categorySelect);
        updateCategoryTriggerDisplay("");

        showNotification("Transaction added successfully.");

    });

}


function setupCategoryCustomDropdown(select) {

    const trigger =
        document.getElementById("category-trigger-btn");

    const menu =
        document.getElementById("category-dropdown-menu");

    if (!trigger || !menu) return;

    trigger.addEventListener("click", e => {
        e.stopPropagation();
        const isOpen = !menu.classList.contains("hidden");
        if (isOpen) {
            menu.classList.add("hidden");
            trigger.setAttribute("aria-expanded", "false");
        } else {
            menu.classList.remove("hidden");
            trigger.setAttribute("aria-expanded", "true");
        }
    });

    document.addEventListener("click", e => {
        if (!e.target.closest("#category-dropdown-container")) {
            menu.classList.add("hidden");
            trigger.setAttribute("aria-expanded", "false");
        }
    });

}


function updateCategoryTriggerDisplay(value) {

    const triggerText =
        document.getElementById("category-trigger-text");

    if (!triggerText) return;

    if (!value) {
        triggerText.innerHTML = `
            <span class="cat-pill-icon">✦</span>
            <span>Select category</span>
        `;
        return;
    }

    const icon =
        categoryIcons[value] || "✦";

    triggerText.innerHTML = `
        <span class="cat-pill-icon">${icon}</span>
        <span>${value}</span>
    `;

}


function renderCategoryOptions(select) {

    const list =
        categoryOptions[transactionType];

    select.innerHTML = `
        <option value="">Select category</option>
        ${list.map(category => `<option value="${category}">${category}</option>`).join("")}
    `;

    updateCategoryTriggerDisplay(select.value);

    const menu =
        document.getElementById("category-dropdown-menu");

    if (!menu) return;

    menu.innerHTML = list.map(category => {
        const icon = categoryIcons[category] || "✦";
        const isActive = select.value === category;
        return `
            <button
                type="button"
                class="custom-dropdown-item cat-custom-item ${isActive ? "active" : ""}"
                data-category="${category}"
            >
                <span class="custom-dropdown-item-left">
                    <span class="cat-item-icon">${icon}</span>
                    <span>${category}</span>
                </span>
                <span class="item-check">✓</span>
            </button>
        `;
    }).join("");

    menu.querySelectorAll(".cat-custom-item").forEach(item => {
        item.addEventListener("click", e => {
            e.stopPropagation();
            const cat = item.dataset.category;
            select.value = cat;
            select.dispatchEvent(new Event("change"));

            updateCategoryTriggerDisplay(cat);

            menu.querySelectorAll(".cat-custom-item").forEach(i => {
                i.classList.toggle("active", i.dataset.category === cat);
            });

            menu.classList.add("hidden");
            const trigger = document.getElementById("category-trigger-btn");
            if (trigger) trigger.setAttribute("aria-expanded", "false");
        });
    });

}