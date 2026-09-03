let toastTimeout;


export function showNotification(message, type = "success") {

    let toast =
        document.getElementById("app-toast");

    if (!toast) {

        toast =
            document.createElement("div");

        toast.id = "app-toast";
        toast.className = "app-toast";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");

        document.body.appendChild(toast);

        setupSwipeDismiss(toast);

    }

    toast.textContent = message;
    toast.className = `app-toast ${type} visible`;
    toast.style.transform = "";
    toast.style.opacity = "";

    window.clearTimeout(toastTimeout);

    toastTimeout =
        window.setTimeout(() => {
            dismissToast(toast);
        }, 2600);

}


function dismissToast(toast) {

    toast.classList.remove("visible");
    toast.style.transform = "";
    toast.style.opacity = "";

}


function setupSwipeDismiss(toast) {

    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let isSwiping = false;

    // Click to dismiss
    toast.addEventListener("click", () => {
        window.clearTimeout(toastTimeout);
        dismissToast(toast);
    });

    // Touch swipe to dismiss
    toast.addEventListener("touchstart", event => {

        const touch = event.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        currentX = 0;
        isSwiping = false;

        toast.style.transition = "none";

    }, { passive: true });

    toast.addEventListener("touchmove", event => {

        const touch = event.touches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;

        // Only swipe horizontally
        if (!isSwiping && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 5) {
            isSwiping = true;
        }

        if (!isSwiping) {
            return;
        }

        currentX = deltaX;

        const progress = Math.min(Math.abs(currentX) / 150, 1);

        toast.style.transform =
            `translate(calc(-50% + ${currentX}px), 0)`;

        toast.style.opacity =
            String(1 - progress * 0.6);

    }, { passive: true });

    toast.addEventListener("touchend", () => {

        toast.style.transition = "";

        if (Math.abs(currentX) > 80) {
            window.clearTimeout(toastTimeout);
            dismissToast(toast);
        } else {
            toast.style.transform = "";
            toast.style.opacity = "";
        }

        isSwiping = false;
        currentX = 0;

    }, { passive: true });

}
