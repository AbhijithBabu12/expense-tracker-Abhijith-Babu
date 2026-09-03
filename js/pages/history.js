import {
    getTransactions,
    updateTransaction,
    deleteTransaction
} from "../data/transactions.js";

import {
    getCategories,
    saveCategories
} from "../data/storage.js";

import {
    validateTransaction
} from "../core/validation.js";

import {
    showNotification
} from "../components/notifications.js";


let currentFilters = {
    sort: "date-desc",
    type: "all",
    categories: [],
    datePreset: "all",
    dateFrom: "",
    dateTo: "",
    timePreset: "all",
    timeFrom: "",
    timeTo: "",
    minAmount: "",
    maxAmount: ""
};

let draftFilters = { ...currentFilters };
let currentSearch = "";
let editingTransactionId = null;
let deletingTransactionId = null;


const categoryIcons = {
    Food: "F",
    Transport: "T",
    Shopping: "S",
    Bills: "B",
    Entertainment: "E",
    Health: "H",
    Housing: "H",
    Salary: "S",
    Freelance: "F",
    Business: "B",
    Investment: "I",
    Gift: "G",
    Other: "O"
};


export function initializeHistory() {

    createEditModal();
    createDeleteModal();
    createFilterModal();
    setupSearch();
    setupTypeFilters();
    setupFilterButton();

    window.addEventListener(
        "transactionsChanged",
        () => {
            renderFilterCategoryChips();
            renderHistory();
        }
    );

    renderHistory();

}


function setupSearch() {

    const searchInput =
        document.getElementById("transaction-search");

    searchInput.addEventListener("input", event => {

        currentSearch =
            event.target.value
                .trim()
                .toLowerCase();

        visibleCount = INITIAL_LIMIT;
        renderHistory();

    });

}


function setupTypeFilters() {

    const buttons =
        document.querySelectorAll(".filter-button");

    buttons.forEach(button => {

        button.addEventListener("click", () => {

            buttons.forEach(item => {
                item.classList.remove("active");
            });

            button.classList.add("active");

            currentFilters.type =
                button.dataset.filterType;

            applyFilters();

        });

    });

}


function syncTypeButtons() {

    const buttons =
        document.querySelectorAll(".filter-button");

    buttons.forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.filterType === currentFilters.type
        );
    });

}


function setupFilterButton() {

    const openBtn =
        document.getElementById("open-filter-button");

    if (openBtn) {
        openBtn.addEventListener("click", openFilterModal);
    }

}


function createFilterModal() {

    if (document.getElementById("filter-modal")) {
        return;
    }

    const modal =
        document.createElement("div");

    modal.id = "filter-modal";
    modal.className = "modal-backdrop filter-modal-backdrop hidden";

    modal.innerHTML = `
        <div
            class="modal filter-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="filter-modal-title"
        >
            <div class="filter-drawer-header">
                <div>
                    <p class="eyebrow">REFINE</p>
                    <h3 id="filter-modal-title">Filter & Sort</h3>
                </div>

                <div class="filter-header-actions">
                    <button
                        type="button"
                        class="text-button"
                        id="filter-reset-header-btn"
                    >
                        Reset all
                    </button>

                    <button
                        type="button"
                        class="modal-close"
                        data-filter-close
                        aria-label="Close filters"
                    >
                        ✕
                    </button>
                </div>
            </div>

            <div class="filter-drawer-body">
                <!-- Sort by -->
                <section class="filter-section">
                    <h4 class="filter-section-title">Sort by</h4>
                    <div class="filter-chips-grid" id="modal-sort-chips">
                        <button type="button" class="filter-chip" data-sort="date-desc">Newest first</button>
                        <button type="button" class="filter-chip" data-sort="date-asc">Oldest first</button>
                        <button type="button" class="filter-chip" data-sort="amount-desc">Amount: High to Low</button>
                        <button type="button" class="filter-chip" data-sort="amount-asc">Amount: Low to High</button>
                    </div>
                </section>

                <!-- Transaction Type -->
                <section class="filter-section">
                    <h4 class="filter-section-title">Transaction Type</h4>
                    <div class="filter-chips-grid" id="modal-type-chips">
                        <button type="button" class="filter-chip" data-modal-type="all">All</button>
                        <button type="button" class="filter-chip" data-modal-type="expense">Expense only</button>
                        <button type="button" class="filter-chip" data-modal-type="income">Income only</button>
                    </div>
                </section>

                <!-- Categories -->
                <section class="filter-section">
                    <div class="filter-section-header">
                        <h4 class="filter-section-title">Categories</h4>
                        <span class="filter-section-sub" id="modal-cat-selected-summary">All</span>
                    </div>
                    <div class="filter-chips-grid" id="modal-category-chips">
                        <!-- Populated dynamically -->
                    </div>
                </section>

                <!-- Date Range -->
                <section class="filter-section">
                    <h4 class="filter-section-title">Date</h4>
                    <div class="filter-chips-grid" id="modal-date-chips">
                        <button type="button" class="filter-chip" data-date-preset="all">All time</button>
                        <button type="button" class="filter-chip" data-date-preset="today">Today</button>
                        <button type="button" class="filter-chip" data-date-preset="week">This week</button>
                        <button type="button" class="filter-chip" data-date-preset="month">This month</button>
                        <button type="button" class="filter-chip" data-date-preset="last30">Last 30 days</button>
                        <button type="button" class="filter-chip" data-date-preset="year">This year</button>
                        <button type="button" class="filter-chip" data-date-preset="custom">Custom</button>
                    </div>
                    <div class="filter-custom-date-inputs hidden" id="modal-custom-date-row">
                        <div>
                            <label for="modal-date-from">From</label>
                            <input type="date" id="modal-date-from" class="compact-input" />
                        </div>
                        <div>
                            <label for="modal-date-to">To</label>
                            <input type="date" id="modal-date-to" class="compact-input" />
                        </div>
                    </div>
                </section>

                <!-- Time of Day -->
                <section class="filter-section">
                    <h4 class="filter-section-title">Time of Day</h4>
                    <div class="filter-chips-grid" id="modal-time-chips">
                        <button type="button" class="filter-chip" data-time-preset="all">Any time</button>
                        <button type="button" class="filter-chip" data-time-preset="morning">Morning (6 AM - 12 PM)</button>
                        <button type="button" class="filter-chip" data-time-preset="afternoon">Afternoon (12 PM - 5 PM)</button>
                        <button type="button" class="filter-chip" data-time-preset="evening">Evening (5 PM - 9 PM)</button>
                        <button type="button" class="filter-chip" data-time-preset="night">Night (9 PM - 6 AM)</button>
                        <button type="button" class="filter-chip" data-time-preset="custom">Custom</button>
                    </div>
                    <div class="filter-custom-time-inputs hidden" id="modal-custom-time-row">
                        <div>
                            <label for="modal-time-from">From</label>
                            <input type="time" id="modal-time-from" class="compact-input" />
                        </div>
                        <div>
                            <label for="modal-time-to">To</label>
                            <input type="time" id="modal-time-to" class="compact-input" />
                        </div>
                    </div>
                </section>

                <!-- Price Range -->
                <section class="filter-section">
                    <h4 class="filter-section-title">Price Range (₹)</h4>
                    <div class="filter-price-inputs">
                        <div class="amount-input-wrapper compact">
                            <span class="currency-symbol">₹</span>
                            <input type="number" id="modal-price-min" placeholder="Min" min="0" step="any" />
                        </div>
                        <span class="price-separator">to</span>
                        <div class="amount-input-wrapper compact">
                            <span class="currency-symbol">₹</span>
                            <input type="number" id="modal-price-max" placeholder="Max" min="0" step="any" />
                        </div>
                    </div>
                </section>
            </div>

            <div class="filter-drawer-actions">
                <button
                    type="button"
                    class="secondary-button"
                    id="modal-clear-bottom-btn"
                >
                    Clear all
                </button>

                <button
                    type="button"
                    class="primary-button"
                    id="modal-apply-btn"
                >
                    Apply Filters
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setupFilterModalEvents();

}


function setupFilterModalEvents() {

    const modal =
        document.getElementById("filter-modal");

    if (!modal) return;

    modal.addEventListener("click", event => {
        if (
            event.target === modal ||
            event.target.closest("[data-filter-close]")
        ) {
            closeFilterModal();
        }
    });

    // Reset button in header & footer
    document.getElementById("filter-reset-header-btn")
        ?.addEventListener("click", resetDraftFiltersInModal);

    document.getElementById("modal-clear-bottom-btn")
        ?.addEventListener("click", resetDraftFiltersInModal);

    // Apply button
    document.getElementById("modal-apply-btn")
        ?.addEventListener("click", () => {
            currentFilters = {
                ...draftFilters,
                dateFrom: document.getElementById("modal-date-from").value,
                dateTo: document.getElementById("modal-date-to").value,
                timeFrom: document.getElementById("modal-time-from").value,
                timeTo: document.getElementById("modal-time-to").value,
                minAmount: document.getElementById("modal-price-min").value.trim(),
                maxAmount: document.getElementById("modal-price-max").value.trim()
            };

            syncTypeButtons();
            closeFilterModal();
            applyFilters();
        });

    // Sort chips
    modal.querySelectorAll("#modal-sort-chips [data-sort]").forEach(button => {
        button.addEventListener("click", () => {
            modal.querySelectorAll("#modal-sort-chips [data-sort]").forEach(b => b.classList.remove("active"));
            button.classList.add("active");
            draftFilters.sort = button.dataset.sort;
        });
    });

    // Type chips
    modal.querySelectorAll("#modal-type-chips [data-modal-type]").forEach(button => {
        button.addEventListener("click", () => {
            modal.querySelectorAll("#modal-type-chips [data-modal-type]").forEach(b => b.classList.remove("active"));
            button.classList.add("active");
            draftFilters.type = button.dataset.modalType;
        });
    });

    // Date preset chips
    modal.querySelectorAll("#modal-date-chips [data-date-preset]").forEach(button => {
        button.addEventListener("click", () => {
            modal.querySelectorAll("#modal-date-chips [data-date-preset]").forEach(b => b.classList.remove("active"));
            button.classList.add("active");
            draftFilters.datePreset = button.dataset.datePreset;

            const customRow = document.getElementById("modal-custom-date-row");
            customRow.classList.toggle("hidden", draftFilters.datePreset !== "custom");
        });
    });

    // Time preset chips
    modal.querySelectorAll("#modal-time-chips [data-time-preset]").forEach(button => {
        button.addEventListener("click", () => {
            modal.querySelectorAll("#modal-time-chips [data-time-preset]").forEach(b => b.classList.remove("active"));
            button.classList.add("active");
            draftFilters.timePreset = button.dataset.timePreset;

            const customRow = document.getElementById("modal-custom-time-row");
            customRow.classList.toggle("hidden", draftFilters.timePreset !== "custom");
        });
    });

}


function openFilterModal() {

    createFilterModal();

    draftFilters = {
        ...currentFilters,
        categories: [...currentFilters.categories]
    };

    renderFilterCategoryChips();
    syncModalUIFromDraft();

    const modal = document.getElementById("filter-modal");
    if (modal) {
        modal.classList.remove("hidden");
    }

}


function closeFilterModal() {

    const modal = document.getElementById("filter-modal");
    if (modal) {
        modal.classList.add("hidden");
    }

}


function renderFilterCategoryChips() {

    const container =
        document.getElementById("modal-category-chips");

    if (!container) return;

    const categories =
        getCategories();

    const isAllSelected =
        draftFilters.categories.length === 0;

    container.innerHTML = `
        <button
            type="button"
            class="filter-chip ${isAllSelected ? "active" : ""}"
            data-cat="all"
        >
            All
        </button>
        ${categories.map(cat => {
            const isSelected = draftFilters.categories.includes(cat);
            const icon = categoryIcons[cat] || "✦";
            return `
                <button
                    type="button"
                    class="filter-chip ${isSelected ? "active" : ""}"
                    data-cat="${escapeHTML(cat)}"
                >
                    <span>${icon}</span>
                    <span>${escapeHTML(cat)}</span>
                </button>
            `;
        }).join("")}
    `;

    container.querySelectorAll("[data-cat]").forEach(chip => {
        chip.addEventListener("click", () => {
            const cat = chip.dataset.cat;
            if (cat === "all") {
                draftFilters.categories = [];
            } else {
                if (draftFilters.categories.includes(cat)) {
                    draftFilters.categories = draftFilters.categories.filter(c => c !== cat);
                } else {
                    draftFilters.categories.push(cat);
                }
            }
            renderFilterCategoryChips();
            updateCategorySummaryText();
        });
    });

    updateCategorySummaryText();

}


function updateCategorySummaryText() {

    const summary =
        document.getElementById("modal-cat-selected-summary");

    if (!summary) return;

    if (draftFilters.categories.length === 0) {
        summary.textContent = "All";
    } else {
        summary.textContent = `${draftFilters.categories.length} selected`;
    }

}


function syncModalUIFromDraft() {

    const modal = document.getElementById("filter-modal");
    if (!modal) return;

    // Sort
    modal.querySelectorAll("#modal-sort-chips [data-sort]").forEach(button => {
        button.classList.toggle("active", button.dataset.sort === draftFilters.sort);
    });

    // Type
    modal.querySelectorAll("#modal-type-chips [data-modal-type]").forEach(button => {
        button.classList.toggle("active", button.dataset.modalType === draftFilters.type);
    });

    // Date Preset
    modal.querySelectorAll("#modal-date-chips [data-date-preset]").forEach(button => {
        button.classList.toggle("active", button.dataset.datePreset === draftFilters.datePreset);
    });

    const customDateRow = document.getElementById("modal-custom-date-row");
    customDateRow.classList.toggle("hidden", draftFilters.datePreset !== "custom");
    document.getElementById("modal-date-from").value = draftFilters.dateFrom || "";
    document.getElementById("modal-date-to").value = draftFilters.dateTo || "";

    // Time Preset
    modal.querySelectorAll("#modal-time-chips [data-time-preset]").forEach(button => {
        button.classList.toggle("active", button.dataset.timePreset === draftFilters.timePreset);
    });

    const customTimeRow = document.getElementById("modal-custom-time-row");
    customTimeRow.classList.toggle("hidden", draftFilters.timePreset !== "custom");
    document.getElementById("modal-time-from").value = draftFilters.timeFrom || "";
    document.getElementById("modal-time-to").value = draftFilters.timeTo || "";

    // Price
    document.getElementById("modal-price-min").value = draftFilters.minAmount || "";
    document.getElementById("modal-price-max").value = draftFilters.maxAmount || "";

}


function resetDraftFiltersInModal() {

    draftFilters = {
        sort: "date-desc",
        type: "all",
        categories: [],
        datePreset: "all",
        dateFrom: "",
        dateTo: "",
        timePreset: "all",
        timeFrom: "",
        timeTo: "",
        minAmount: "",
        maxAmount: ""
    };

    renderFilterCategoryChips();
    syncModalUIFromDraft();

}


function resetAllFilters() {

    currentFilters = {
        sort: "date-desc",
        type: "all",
        categories: [],
        datePreset: "all",
        dateFrom: "",
        dateTo: "",
        timePreset: "all",
        timeFrom: "",
        timeTo: "",
        minAmount: "",
        maxAmount: ""
    };

    syncTypeButtons();
    applyFilters();

}


function applyFilters() {

    visibleCount = INITIAL_LIMIT;
    updateFilterBadge();
    renderActiveFilterChips();
    renderHistory();

}


function getActiveFilterCount() {

    let count = 0;
    if (currentFilters.sort !== "date-desc") count++;
    if (currentFilters.type !== "all") count++;
    if (currentFilters.categories.length > 0) count += currentFilters.categories.length;
    if (currentFilters.datePreset !== "all" || currentFilters.dateFrom || currentFilters.dateTo) count++;
    if (currentFilters.timePreset !== "all" || currentFilters.timeFrom || currentFilters.timeTo) count++;
    if (currentFilters.minAmount !== "" || currentFilters.maxAmount !== "") count++;

    return count;

}


function updateFilterBadge() {

    const badge =
        document.getElementById("active-filter-badge");

    if (!badge) return;

    const count =
        getActiveFilterCount();

    if (count > 0) {
        badge.textContent = count;
        badge.classList.remove("hidden");
    } else {
        badge.classList.add("hidden");
    }

}


function renderActiveFilterChips() {

    const container =
        document.getElementById("active-filter-chips");

    if (!container) return;

    const chips = [];

    if (currentFilters.sort !== "date-desc") {
        const labels = {
            "date-asc": "Oldest first",
            "amount-desc": "Amount: High to Low",
            "amount-asc": "Amount: Low to High"
        };
        chips.push({
            id: "sort",
            label: `Sort: ${labels[currentFilters.sort] || currentFilters.sort}`,
            onRemove: () => {
                currentFilters.sort = "date-desc";
                applyFilters();
            }
        });
    }

    if (currentFilters.type !== "all") {
        chips.push({
            id: "type",
            label: `Type: ${currentFilters.type === "expense" ? "Expenses" : "Income"}`,
            onRemove: () => {
                currentFilters.type = "all";
                syncTypeButtons();
                applyFilters();
            }
        });
    }

    currentFilters.categories.forEach(cat => {
        chips.push({
            id: `cat-${cat}`,
            label: `${cat}`,
            onRemove: () => {
                currentFilters.categories = currentFilters.categories.filter(c => c !== cat);
                applyFilters();
            }
        });
    });

    if (currentFilters.datePreset !== "all" || currentFilters.dateFrom || currentFilters.dateTo) {
        let dateLabel = "Date: ";
        if (currentFilters.datePreset !== "all" && currentFilters.datePreset !== "custom") {
            const labels = {
                today: "Today",
                week: "This week",
                month: "This month",
                last30: "Last 30 days",
                year: "This year"
            };
            dateLabel += labels[currentFilters.datePreset] || currentFilters.datePreset;
        } else if (currentFilters.dateFrom && currentFilters.dateTo) {
            dateLabel += `${currentFilters.dateFrom} - ${currentFilters.dateTo}`;
        } else if (currentFilters.dateFrom) {
            dateLabel += `From ${currentFilters.dateFrom}`;
        } else if (currentFilters.dateTo) {
            dateLabel += `To ${currentFilters.dateTo}`;
        }
        chips.push({
            id: "date",
            label: dateLabel,
            onRemove: () => {
                currentFilters.datePreset = "all";
                currentFilters.dateFrom = "";
                currentFilters.dateTo = "";
                applyFilters();
            }
        });
    }

    if (currentFilters.timePreset !== "all" || currentFilters.timeFrom || currentFilters.timeTo) {
        let timeLabel = "Time: ";
        if (currentFilters.timePreset !== "all" && currentFilters.timePreset !== "custom") {
            const labels = {
                morning: "Morning",
                afternoon: "Afternoon",
                evening: "Evening",
                night: "Night"
            };
            timeLabel += labels[currentFilters.timePreset] || currentFilters.timePreset;
        } else if (currentFilters.timeFrom && currentFilters.timeTo) {
            timeLabel += `${currentFilters.timeFrom} - ${currentFilters.timeTo}`;
        }
        chips.push({
            id: "time",
            label: timeLabel,
            onRemove: () => {
                currentFilters.timePreset = "all";
                currentFilters.timeFrom = "";
                currentFilters.timeTo = "";
                applyFilters();
            }
        });
    }

    if (currentFilters.minAmount !== "" || currentFilters.maxAmount !== "") {
        let priceLabel = "Price: ";
        if (currentFilters.minAmount !== "" && currentFilters.maxAmount !== "") {
            priceLabel += `₹${currentFilters.minAmount} - ₹${currentFilters.maxAmount}`;
        } else if (currentFilters.minAmount !== "") {
            priceLabel += `≥ ₹${currentFilters.minAmount}`;
        } else {
            priceLabel += `≤ ₹${currentFilters.maxAmount}`;
        }
        chips.push({
            id: "price",
            label: priceLabel,
            onRemove: () => {
                currentFilters.minAmount = "";
                currentFilters.maxAmount = "";
                applyFilters();
            }
        });
    }

    if (chips.length === 0) {
        container.innerHTML = "";
        container.classList.add("hidden");
        return;
    }

    container.classList.remove("hidden");
    container.innerHTML = `
        <div class="active-chips-list">
            ${chips.map((chip, idx) => `
                <button type="button" class="active-chip" data-chip-idx="${idx}">
                    <span>${escapeHTML(chip.label)}</span>
                    <span class="chip-remove" aria-hidden="true">✕</span>
                </button>
            `).join("")}
            <button type="button" class="active-chip-clear" id="clear-all-chips">
                Clear all
            </button>
        </div>
    `;

    container.querySelectorAll(".active-chip").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = Number(btn.dataset.chipIdx);
            if (chips[idx]) chips[idx].onRemove();
        });
    });

    document.getElementById("clear-all-chips")
        ?.addEventListener("click", resetAllFilters);

}


const INITIAL_LIMIT = 10;
const BATCH_SIZE = 10;
let visibleCount = INITIAL_LIMIT;


function getFilteredTransactions() {

    return getTransactions()
        .filter(transaction => {

            // Type filter
            if (currentFilters.type !== "all" && transaction.type !== currentFilters.type) {
                return false;
            }

            // Category filter (multi-select)
            if (currentFilters.categories.length > 0 && !currentFilters.categories.includes(transaction.category)) {
                return false;
            }

            // Price filter
            const amount = Number(transaction.amount);
            if (currentFilters.minAmount !== "" && !Number.isNaN(Number(currentFilters.minAmount))) {
                if (amount < Number(currentFilters.minAmount)) return false;
            }
            if (currentFilters.maxAmount !== "" && !Number.isNaN(Number(currentFilters.maxAmount))) {
                if (amount > Number(currentFilters.maxAmount)) return false;
            }

            // Date filter
            if (currentFilters.datePreset !== "all" || currentFilters.dateFrom || currentFilters.dateTo) {
                const txDate = transaction.date;
                if (!txDate) return false;

                const today = new Date();
                const todayISO = today.toISOString().split("T")[0];

                if (currentFilters.datePreset === "today") {
                    if (txDate !== todayISO) return false;
                } else if (currentFilters.datePreset === "week") {
                    const weekAgo = new Date(today);
                    weekAgo.setDate(today.getDate() - 7);
                    const weekAgoISO = weekAgo.toISOString().split("T")[0];
                    if (txDate < weekAgoISO || txDate > todayISO) return false;
                } else if (currentFilters.datePreset === "month") {
                    const ym = todayISO.slice(0, 7);
                    if (!txDate.startsWith(ym)) return false;
                } else if (currentFilters.datePreset === "last30") {
                    const thirtyAgo = new Date(today);
                    thirtyAgo.setDate(today.getDate() - 30);
                    const thirtyAgoISO = thirtyAgo.toISOString().split("T")[0];
                    if (txDate < thirtyAgoISO || txDate > todayISO) return false;
                } else if (currentFilters.datePreset === "year") {
                    const y = todayISO.slice(0, 4);
                    if (!txDate.startsWith(y)) return false;
                }

                if (currentFilters.dateFrom && txDate < currentFilters.dateFrom) {
                    return false;
                }
                if (currentFilters.dateTo && txDate > currentFilters.dateTo) {
                    return false;
                }
            }

            // Time filter
            if (currentFilters.timePreset !== "all" || currentFilters.timeFrom || currentFilters.timeTo) {
                const txTime = transaction.time || "00:00";
                const [h, m] = txTime.split(":").map(Number);
                const minutes = (h || 0) * 60 + (m || 0);

                if (currentFilters.timePreset === "morning") {
                    if (minutes < 360 || minutes >= 720) return false;
                } else if (currentFilters.timePreset === "afternoon") {
                    if (minutes < 720 || minutes >= 1020) return false;
                } else if (currentFilters.timePreset === "evening") {
                    if (minutes < 1020 || minutes >= 1260) return false;
                } else if (currentFilters.timePreset === "night") {
                    if (minutes >= 360 && minutes < 1260) return false;
                }

                if (currentFilters.timeFrom && txTime < currentFilters.timeFrom) {
                    return false;
                }
                if (currentFilters.timeTo && txTime > currentFilters.timeTo) {
                    return false;
                }
            }

            // Search filter
            if (!currentSearch) {
                return true;
            }

            const operatorMatch =
                currentSearch.match(/^([><]=?)\s*(\d+(?:\.\d+)?)$/);

            if (operatorMatch) {
                const op = operatorMatch[1];
                const targetVal = parseFloat(operatorMatch[2]);
                const txAmount = parseFloat(transaction.amount);

                if (!Number.isNaN(txAmount) && !Number.isNaN(targetVal)) {
                    if (op === ">") return txAmount > targetVal;
                    if (op === ">=") return txAmount >= targetVal;
                    if (op === "<") return txAmount < targetVal;
                    if (op === "<=") return txAmount <= targetVal;
                }
            }

            const searchableText =
                getSearchableTransactionText(transaction);

            const searchWords =
                currentSearch.split(/\s+/).filter(Boolean);

            return searchWords.every(word => {
                const cleanWord =
                    word.replace(/^[₹$]|^(?:rs\.?)\s*/i, "").replaceAll(",", "");

                return searchableText.includes(word) ||
                    (cleanWord && searchableText.includes(cleanWord));
            });

        })
        .sort((a, b) => {
            if (currentFilters.sort === "date-asc") {
                return getTransactionDateTime(a) - getTransactionDateTime(b);
            }
            if (currentFilters.sort === "amount-desc") {
                return Number(b.amount) - Number(a.amount);
            }
            if (currentFilters.sort === "amount-asc") {
                return Number(a.amount) - Number(b.amount);
            }
            return getTransactionDateTime(b) - getTransactionDateTime(a);
        });

}


function getSearchableTransactionText(transaction) {

    const tokens = [
        transaction.category,
        transaction.description,
        transaction.type
    ];

    // Price variations
    const numAmount = Number(transaction.amount);
    if (!Number.isNaN(numAmount)) {
        tokens.push(
            String(transaction.amount),
            numAmount.toString(),
            numAmount.toFixed(2),
            numAmount.toLocaleString("en-IN"),
            numAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
            `₹${numAmount}`,
            `₹${numAmount.toLocaleString("en-IN")}`,
            `rs ${numAmount}`,
            `rs. ${numAmount}`
        );
    }

    // Date variations (formats, month names, days)
    if (transaction.date) {
        tokens.push(transaction.date); // e.g. "2026-09-03"

        try {
            const dateObj = new Date(`${transaction.date}T00:00:00`);

            if (!Number.isNaN(dateObj.getTime())) {
                const dayNum = dateObj.getDate();
                const dayPadded = String(dayNum).padStart(2, "0");
                const monthNum = dateObj.getMonth() + 1;
                const monthPadded = String(monthNum).padStart(2, "0");
                const year = dateObj.getFullYear();

                const fullMonth = dateObj.toLocaleDateString("en-IN", { month: "long" });
                const shortMonth = dateObj.toLocaleDateString("en-IN", { month: "short" });
                const fullDay = dateObj.toLocaleDateString("en-IN", { weekday: "long" });
                const shortDay = dateObj.toLocaleDateString("en-IN", { weekday: "short" });

                tokens.push(
                    formatDate(transaction.date),
                    `${dayNum} ${shortMonth}`,
                    `${dayPadded} ${shortMonth}`,
                    `${dayNum} ${fullMonth}`,
                    `${dayPadded} ${fullMonth}`,
                    `${dayNum} ${shortMonth} ${year}`,
                    `${dayPadded} ${shortMonth} ${year}`,
                    `${dayNum} ${fullMonth} ${year}`,
                    `${dayPadded} ${fullMonth} ${year}`,
                    fullMonth,
                    shortMonth,
                    fullDay,
                    shortDay,
                    `${dayNum}/${monthNum}/${year}`,
                    `${dayPadded}/${monthPadded}/${year}`,
                    `${dayNum}/${monthNum}`,
                    `${dayPadded}/${monthPadded}`,
                    `${dayNum}-${monthNum}-${year}`,
                    `${dayPadded}-${monthPadded}-${year}`
                );
            }
        } catch (e) {}
    }

    // Time variations (12h, 24h, AM/PM)
    if (transaction.time) {
        tokens.push(transaction.time); // e.g. "14:30"

        try {
            const formatted = formatTime(transaction.time);
            tokens.push(
                formatted,
                formatted.replace(/\s+/g, ""),
                formatted.replace(/\s*(am|pm)/i, "")
            );

            const [h, m] = String(transaction.time).split(":");
            const hours = Number(h);
            const mins = Number(m);

            if (!Number.isNaN(hours) && !Number.isNaN(mins)) {
                const hour12 = hours % 12 || 12;
                const paddedHour12 = String(hour12).padStart(2, "0");
                const paddedMins = String(mins).padStart(2, "0");
                const ampm = hours >= 12 ? "pm" : "am";

                tokens.push(
                    `${hour12}:${paddedMins}`,
                    `${hour12}:${paddedMins} ${ampm}`,
                    `${hour12}:${paddedMins}${ampm}`,
                    `${paddedHour12}:${paddedMins} ${ampm}`,
                    `${paddedHour12}:${paddedMins}${ampm}`,
                    ampm
                );
            }
        } catch (e) {}
    }

    return tokens.filter(Boolean).join(" ").toLowerCase();

}


export function renderHistory() {

    updateFilterBadge();
    renderActiveFilterChips();

    const list =
        document.getElementById("transaction-list");

    const emptyState =
        document.getElementById("history-empty");

    const count =
        document.getElementById("transaction-count");

    const transactions =
        getFilteredTransactions();

    count.textContent =
        transactions.length;

    let loadMoreWrapper =
        document.getElementById("history-load-more-wrapper");

    if (!loadMoreWrapper && list) {
        loadMoreWrapper = document.createElement("div");
        loadMoreWrapper.id = "history-load-more-wrapper";
        loadMoreWrapper.className = "history-load-more-wrapper";
        list.insertAdjacentElement("afterend", loadMoreWrapper);
    }

    if (transactions.length === 0) {

        list.innerHTML = "";
        emptyState.classList.remove("hidden");
        if (loadMoreWrapper) {
            loadMoreWrapper.innerHTML = "";
        }

        return;

    }

    emptyState.classList.add("hidden");

    const visibleTransactions =
        transactions.slice(0, visibleCount);

    list.innerHTML =
        visibleTransactions
            .map(createTransactionHTML)
            .join("");

    setupTransactionActions();

    const remaining = transactions.length - visibleCount;

    if (loadMoreWrapper) {
        if (remaining > 0) {
            const nextBatch = Math.min(BATCH_SIZE, remaining);
            loadMoreWrapper.innerHTML = `
                <button
                    type="button"
                    id="history-load-more"
                    class="secondary-button history-load-more-button"
                >
                    See more (+${nextBatch})
                    <span class="load-more-remaining">${remaining} more</span>
                </button>
            `;

            const loadMoreBtn = document.getElementById("history-load-more");
            if (loadMoreBtn) {
                loadMoreBtn.addEventListener("click", () => {
                    visibleCount += BATCH_SIZE;
                    renderHistory();
                });
            }
        } else {
            loadMoreWrapper.innerHTML = "";
        }
    }

}


function createTransactionHTML(transaction) {

    const amount =
        formatCurrency(transaction.amount);

    const sign =
        transaction.type === "income"
            ? "+"
            : "-";

    const icon =
        categoryIcons[transaction.category] ||
        categoryIcons.Other;

    return `
        <article
            class="transaction-item"
            data-id="${transaction.id}"
        >
            <time
                class="transaction-date"
                datetime="${transaction.date}"
            >
                ${formatDate(transaction.date)}
                ${transaction.time ? `<span>${formatTime(transaction.time)}</span>` : ""}
            </time>

            <div class="transaction-main">
                <div class="category-icon">
                    ${icon}
                </div>

                <div class="transaction-description">
                    <strong>
                        ${escapeHTML(transaction.description || transaction.category)}
                    </strong>

                    <span>
                        ${escapeHTML(transaction.category)}
                    </span>
                </div>
            </div>

            <span class="transaction-type-label">
                ${transaction.type === "income" ? "Income" : "Expense"}
            </span>

            <span class="transaction-amount ${transaction.type}">
                ${sign}${amount}
            </span>

            <div class="transaction-actions">
                <button
                    type="button"
                    class="action-button edit"
                    data-action="edit"
                    data-id="${transaction.id}"
                    aria-label="Edit transaction"
                >
                    Edit
                </button>

                <button
                    type="button"
                    class="action-button delete"
                    data-action="delete"
                    data-id="${transaction.id}"
                    aria-label="Delete transaction"
                >
                    Delete
                </button>
            </div>
        </article>
    `;

}


function setupTransactionActions() {

    document
        .querySelectorAll(".action-button")
        .forEach(button => {

            button.addEventListener("click", () => {

                const id =
                    button.dataset.id;

                if (button.dataset.action === "delete") {
                    handleDelete(id);
                }

                if (button.dataset.action === "edit") {
                    handleEdit(id);
                }

            });

        });

}


function handleDelete(id) {

    const transaction =
        getTransactions()
            .find(item => item.id === id);

    if (!transaction) {
        return;
    }

    openDeleteModal(transaction);

}


function handleEdit(id) {

    const transaction =
        getTransactions()
            .find(item => item.id === id);

    if (!transaction) {
        return;
    }

    openEditModal(transaction);

}


function createEditModal() {

    if (document.getElementById("edit-modal")) {
        return;
    }

    const modal =
        document.createElement("div");

    modal.id = "edit-modal";
    modal.className = "modal-backdrop hidden";

    modal.innerHTML = `
        <div
            class="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-modal-title"
        >
            <div class="modal-header">
                <div>
                    <p class="eyebrow">EDIT</p>
                    <h3 id="edit-modal-title">Update transaction</h3>
                </div>

                <button
                    type="button"
                    class="modal-close"
                    data-modal-close
                    aria-label="Close edit modal"
                >
                    x
                </button>
            </div>

            <form id="edit-transaction-form" novalidate>
                <div class="transaction-type edit-type-group">
                    <button
                        type="button"
                        class="type-button active"
                        data-edit-type="expense"
                    >
                        Expense
                    </button>

                    <button
                        type="button"
                        class="type-button"
                        data-edit-type="income"
                    >
                        Income
                    </button>
                </div>

                <div class="form-group amount-group">
                    <label for="edit-amount">Amount</label>

                    <div class="amount-input-wrapper compact">
                        <span class="currency-symbol">Rs</span>
                        <input
                            type="number"
                            id="edit-amount"
                            name="amount"
                            min="0"
                            step="0.01"
                            required
                        />
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="edit-category">Category</label>
                        <select
                            id="edit-category"
                            name="category"
                            required
                        ></select>
                    </div>

                    <div
                        class="form-group hidden"
                        id="edit-custom-category-group"
                    >
                        <label for="edit-custom-category">Custom category</label>
                        <input
                            type="text"
                            id="edit-custom-category"
                            name="custom-category"
                            maxlength="50"
                            placeholder="e.g. Pet care"
                        />
                    </div>

                    <div class="form-group">
                        <label>Date & Time</label>
                        <div class="date-time-row">
                            <input
                                type="date"
                                id="edit-date"
                                name="date"
                                required
                            />

                            <input
                                type="time"
                                id="edit-time"
                                name="time"
                            />
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label for="edit-description">Description</label>
                    <input
                        type="text"
                        id="edit-description"
                        name="description"
                        maxlength="150"
                    />
                </div>

                <div class="modal-actions">
                    <button
                        type="button"
                        class="secondary-button"
                        data-modal-close
                    >
                        Cancel
                    </button>

                    <button type="submit" class="primary-button">
                        Save changes
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    setupEditModalEvents();

}


function setupEditModalEvents() {

    const modal =
        document.getElementById("edit-modal");

    const form =
        document.getElementById("edit-transaction-form");

    const categorySelect =
        document.getElementById("edit-category");

    modal.addEventListener("click", event => {

        if (
            event.target === modal ||
            event.target.hasAttribute("data-modal-close")
        ) {
            closeEditModal();
        }

    });

    document
        .querySelectorAll("[data-edit-type]")
        .forEach(button => {

            button.addEventListener("click", () => {

                document
                    .querySelectorAll("[data-edit-type]")
                    .forEach(item => {
                        item.classList.remove("active");
                    });

                button.classList.add("active");

            });

        });

    categorySelect.addEventListener(
        "change",
        updateEditCustomCategoryVisibility
    );

    form.addEventListener("submit", event => {

        event.preventDefault();

        saveEditForm();

    });

}


function openEditModal(transaction) {

    editingTransactionId =
        transaction.id;

    renderEditCategoryOptions(transaction.category);

    document.getElementById("edit-amount").value =
        transaction.amount;

    document.getElementById("edit-category").value =
        getCategories().includes(transaction.category)
            ? transaction.category
            : "Other";

    document.getElementById("edit-date").value =
        transaction.date;

    document.getElementById("edit-time").value =
        transaction.time || "";

    document.getElementById("edit-description").value =
        transaction.description || "";

    document
        .querySelectorAll("[data-edit-type]")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.editType === transaction.type
            );

        });

    if (!getCategories().includes(transaction.category)) {
        document.getElementById("edit-custom-category").value =
            transaction.category;
    }

    updateEditCustomCategoryVisibility();

    document
        .getElementById("edit-modal")
        .classList
        .remove("hidden");

    document.getElementById("edit-amount").focus();

}


function closeEditModal() {

    editingTransactionId = null;

    document
        .getElementById("edit-modal")
        .classList
        .add("hidden");

}


function renderEditCategoryOptions(currentCategory) {

    const select =
        document.getElementById("edit-category");

    const categories =
        getCategories();

    const optionCategories =
        categories.includes(currentCategory)
            ? categories
            : [
                ...categories,
                currentCategory
            ];

    select.innerHTML = `
        <option value="">Select category</option>
        ${optionCategories.map(category => `
            <option value="${escapeHTML(category)}">
                ${escapeHTML(category)}
            </option>
        `).join("")}
        <option value="Other">Other</option>
    `;

}


function updateEditCustomCategoryVisibility() {

    const categorySelect =
        document.getElementById("edit-category");

    const customGroup =
        document.getElementById("edit-custom-category-group");

    const customInput =
        document.getElementById("edit-custom-category");

    const isCustom =
        categorySelect.value === "Other";

    customGroup.classList.toggle("hidden", !isCustom);
    customInput.required = isCustom;

    if (!isCustom) {
        customInput.value = "";
    }

}


function saveEditForm() {

    if (!editingTransactionId) {
        return;
    }

    const form =
        document.getElementById("edit-transaction-form");

    const formData =
        new FormData(form);

    const selectedType =
        document.querySelector("[data-edit-type].active")
            ?.dataset
            .editType;

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
        type: selectedType,
        amount: formData.get("amount"),
        category,
        date: formData.get("date"),
        time: formData.get("time"),
        description: formData.get("description")
    };

    const validation =
        validateTransaction(data);

    if (!validation.valid) {

        showNotification(
            Object.values(validation.errors).join(" "),
            "error"
        );

        return;

    }

    saveCustomCategory(category);

    updateTransaction(
        editingTransactionId,
        {
            ...data,
            amount: Number(data.amount),
            description: data.description?.trim() || ""
        }
    );

    closeEditModal();
    renderHistory();

    showNotification("Transaction updated.");

}


function createDeleteModal() {

    if (document.getElementById("delete-modal")) {
        return;
    }

    const modal =
        document.createElement("div");

    modal.id = "delete-modal";
    modal.className = "modal-backdrop hidden";

    modal.innerHTML = `
        <div
            class="modal small-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
        >
            <div class="modal-header">
                <div>
                    <p class="eyebrow">DELETE</p>
                    <h3 id="delete-modal-title">Delete transaction?</h3>
                </div>

                <button
                    type="button"
                    class="modal-close"
                    data-delete-close
                    aria-label="Close delete modal"
                >
                    x
                </button>
            </div>

            <p class="modal-copy" id="delete-modal-copy">
                This transaction will be removed from your history.
            </p>

            <div class="modal-actions">
                <button
                    type="button"
                    class="secondary-button"
                    data-delete-close
                >
                    Cancel
                </button>

                <button
                    type="button"
                    class="danger-button"
                    id="confirm-delete-button"
                >
                    Delete
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    setupDeleteModalEvents();

}


function setupDeleteModalEvents() {

    const modal =
        document.getElementById("delete-modal");

    modal.addEventListener("click", event => {

        if (
            event.target === modal ||
            event.target.hasAttribute("data-delete-close")
        ) {
            closeDeleteModal();
        }

    });

    document
        .getElementById("confirm-delete-button")
        .addEventListener("click", confirmDelete);

}


function openDeleteModal(transaction) {

    deletingTransactionId =
        transaction.id;

    document.getElementById("delete-modal-copy").textContent =
        `${transaction.description || transaction.category} for ${formatCurrency(transaction.amount)} will be removed.`;

    document
        .getElementById("delete-modal")
        .classList
        .remove("hidden");

    document
        .getElementById("confirm-delete-button")
        .focus();

}


function closeDeleteModal() {

    deletingTransactionId = null;

    document
        .getElementById("delete-modal")
        .classList
        .add("hidden");

}


function confirmDelete() {

    if (!deletingTransactionId) {
        return;
    }

    deleteTransaction(deletingTransactionId);

    closeDeleteModal();
    renderHistory();

    showNotification("Transaction deleted.");

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


function getTransactionDateTime(transaction) {

    return new Date(
        `${transaction.date}T${transaction.time || "00:00"}:00`
    );

}


function formatDate(dateString) {

    return new Intl.DateTimeFormat(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    ).format(
        new Date(`${dateString}T00:00:00`)
    );

}


function formatTime(timeString) {

    const [hours, minutes] =
        String(timeString).split(":");

    const date =
        new Date();

    date.setHours(
        Number(hours),
        Number(minutes),
        0,
        0
    );

    return new Intl.DateTimeFormat(
        "en-IN",
        {
            hour: "numeric",
            minute: "2-digit"
        }
    ).format(date);

}


function formatCurrency(value) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR"
        }
    ).format(value);

}


function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}
