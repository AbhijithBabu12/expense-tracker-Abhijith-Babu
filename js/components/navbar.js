const pages = [
    {
        id: "home",
        label: "Home"
    },
    {
        id: "history",
        label: "History"
    },
    {
        id: "analytics",
        label: "Analytics"
    },
    {
        id: "dashboard",
        label: "Dashboard"
    },
    {
        id: "ai",
        label: "✦ AI Mode"
    }

];


export function renderNavbar() {

    const navbar = document.getElementById("navbar");
    const initialPage = getSavedPage();

    navbar.innerHTML = `
        <nav class="navbar">

            <a href="#" class="logo" aria-label="Meowth home">
                <img src="Logo/giphy.gif" alt="" />
                <span>Meowth</span>
            </a>

            <div class="nav-links">

                ${pages.map(page => `
                    <button
                        type="button"
                        class="nav-link ${page.id === initialPage ? "active" : ""}"
                        data-page="${page.id}"
                    >
                        ${page.label}
                    </button>
                `).join("")}

            </div>

        </nav>
    `;

    setupNavigation();
    setupMobileAI();
    setupNavbarScroll();

    // Set initial page cleanly without smooth-scroll jump
    navigateTo(initialPage, false, false);

    window.addEventListener("hashchange", () => {
        const page = getPageFromHash();
        if (page) {
            navigateTo(page, false, true);
        }
    });

}


function setupNavigation() {

    const navbar = document.getElementById("navbar");

    const logo = navbar.querySelector(".logo");
    if (logo) {
        logo.addEventListener("click", event => {
            event.preventDefault();
            navigateTo("home");
        });
    }

    const navLinks =
        document.querySelectorAll(".nav-link");

    navLinks.forEach(link => {

        link.addEventListener("click", () => {

            const page = link.dataset.page;

            navigateTo(page);

        });

    });

}

function setupMobileAI() {

    const button =
        document.getElementById("mobile-ai-button");

    if (!button) {
        return;
    }

    button.addEventListener("click", () => {

        navigateTo("ai");

    });

}


export function navigateTo(pageName, updateHash = true, smoothScroll = true) {

    document
        .querySelectorAll(".page")
        .forEach(page => {
            page.classList.remove("active");
        });

    const targetPage =
        document.getElementById(`${pageName}-page`);

    if (targetPage) {
        targetPage.classList.add("active");
    }

    document.body.setAttribute("data-active-page", pageName);

    try {
        localStorage.setItem("meowth_active_page", pageName);
    } catch (e) {}

    document
        .querySelectorAll(".nav-link")
        .forEach(link => {

            link.classList.toggle(
                "active",
                link.dataset.page === pageName
            );

        });

    if (updateHash) {
        window.location.hash = pageName;
    }

    const navbar = document.getElementById("navbar");
    const summonBtn = document.getElementById("nav-summon-btn");
    if (navbar) navbar.classList.remove("nav-hidden");
    if (summonBtn) summonBtn.classList.remove("visible");

    if (smoothScroll) {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    } else {
        window.scrollTo(0, 0);
    }

}


function getPageFromHash() {

    const hash =
        window.location.hash.replace("#", "").trim();

    const validPages =
        pages.map(page => page.id);

    if (validPages.includes(hash)) {
        return hash;
    }

    return null;

}


function getSavedPage() {

    const fromHash = getPageFromHash();
    if (fromHash) {
        return fromHash;
    }

    try {
        const fromStorage = localStorage.getItem("meowth_active_page");
        const validPages = pages.map(page => page.id);
        if (fromStorage && validPages.includes(fromStorage)) {
            return fromStorage;
        }
    } catch (e) {}

    return "home";

}


function setupNavbarScroll() {

    const navbar = document.getElementById("navbar");
    const summonBtn = document.getElementById("nav-summon-btn");

    if (!navbar || !summonBtn) {
        return;
    }

    let lastWindowScrollY = window.scrollY;
    let lastAiScrollY = 0;
    let isTicking = false;

    function hideNav() {
        navbar.classList.add("nav-hidden");
        document.body.classList.add("nav-hidden");
        summonBtn.classList.add("visible");
    }

    function showNav() {
        navbar.classList.remove("nav-hidden");
        document.body.classList.remove("nav-hidden");
        summonBtn.classList.remove("visible");
    }

    function handleScroll(event) {

        if (!isTicking) {

            window.requestAnimationFrame(() => {

                const activePage = document.body.getAttribute("data-active-page");

                if (activePage === "ai") {
                    const aiMessages = document.getElementById("ai-messages");
                    if (aiMessages) {
                        const currentY = aiMessages.scrollTop;
                        const delta = currentY - lastAiScrollY;

                        // Near the top of chat -> show full header
                        if (currentY <= 30) {
                            showNav();
                        }
                        // Scrolling DOWN -> hide navbar + new chat + history, reveal summon button
                        else if (delta > 8 && currentY > 60) {
                            hideNav();
                        }

                        lastAiScrollY = currentY;
                    }
                } else {
                    const currentY = window.scrollY;
                    const delta = currentY - lastWindowScrollY;

                    // Near the top of page -> show full header
                    if (currentY <= 45) {
                        showNav();
                    }
                    // Scrolling DOWN -> smoothly hide navbar, reveal summon button
                    else if (delta > 8 && currentY > 80) {
                        hideNav();
                    }

                    lastWindowScrollY = currentY;
                }

                isTicking = false;

            });

            isTicking = true;

        }

    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("scroll", handleScroll, { passive: true, capture: true });

    // Tapping the floating arrow button summons navbar + action buttons from anywhere!
    summonBtn.addEventListener("click", event => {

        event.preventDefault();
        showNav();

    });

}

