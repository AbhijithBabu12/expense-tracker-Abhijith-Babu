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
                        class="nav-link ${page.id === "home" ? "active" : ""}"
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

    const savedPage = getPageFromHash();
    if (savedPage) {
        navigateTo(savedPage, false);
    }

    window.addEventListener("hashchange", () => {
        const page = getPageFromHash();
        if (page) {
            navigateTo(page, false);
        }
    });
}


function setupNavigation() {

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


export function navigateTo(pageName, updateHash = true) {

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

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
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
