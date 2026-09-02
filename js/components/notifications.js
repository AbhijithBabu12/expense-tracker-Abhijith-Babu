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

    }

    toast.textContent = message;
    toast.className = `app-toast ${type} visible`;

    window.clearTimeout(toastTimeout);

    toastTimeout =
        window.setTimeout(() => {
            toast.classList.remove("visible");
        }, 2600);

}
