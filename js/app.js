import { renderNavbar } from "./components/navbar.js";
import { initializeHome } from "./pages/home.js";
import { initializeHistory } from "./pages/history.js";
import { initializeAnalytics } from "./pages/analytics.js";
import { initializeDashboard } from "./pages/dashboard.js";
import { initializeImportExport } from "./features/importExport.js";


document.addEventListener("DOMContentLoaded", () => {

    renderNavbar();

    initializeHome();

    initializeHistory();

    initializeAnalytics();

    initializeDashboard();

    initializeImportExport();

});
