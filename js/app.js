console.log("APP.JS LOADED");

import { renderNavbar } from "./components/navbar.js";
import { initializeHome } from "./pages/home.js";
import { initializeHistory } from "./pages/history.js";
import { initializeAnalytics } from "./pages/analytics.js";
import { initializeDashboard } from "./pages/dashboard.js";
import { initializeAI } from "./pages/ai.js";

import { buildFinancialContext } from "./ai/contextBuilder.js";


document.addEventListener("DOMContentLoaded", () => {

    console.log("DOM CONTENT LOADED");

    renderNavbar();

    console.log("NAVBAR DONE");

    initializeHome();

    console.log("HOME DONE");

    initializeHistory();

    console.log("HISTORY DONE");

    initializeAnalytics();

    console.log("ANALYTICS DONE");

    initializeDashboard();

    console.log("DASHBOARD DONE");

    initializeAI();

    console.log("AI DONE");

    const aiContext =
        buildFinancialContext();

    console.log(
        "AI Financial Context:",
        aiContext
    );

});