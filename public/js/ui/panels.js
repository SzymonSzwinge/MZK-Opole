// ========== PANELE BOCZNE ==========
import { stopPicking } from "../trip/picking.js";

const sidebarPanel = document.getElementById("sidebar-panel");
let activePanel = "trip";

// Callback wywoływany gdy panel zostaje zamknięty
const closeCallbacks = new Map();

export function onPanelClose(panelName, fn) {
    closeCallbacks.set(panelName, fn);
}

function closeActivePanel() {
    const closing = activePanel;
    sidebarPanel.classList.remove("visible");
    activePanel = null;
    document.querySelectorAll(".rail-btn").forEach((b) => b.classList.remove("active"));

    if (closing && closeCallbacks.has(closing)) {
        closeCallbacks.get(closing)();
    }
}

/**
 * Pokaż panel. Jeśli już jest pokazany — NIC nie rób.
 * (toggle obsługuje tylko togglePanel używany przez przyciski rail)
 */
export function showPanel(panelName) {
    // Panel już aktywny i widoczny → nic nie rób
    if (activePanel === panelName && sidebarPanel.classList.contains("visible")) {
        return;
    }

    const previous = activePanel;

    document.querySelectorAll(".panel-content").forEach((c) => {
        c.classList.toggle("active", c.dataset.panel === panelName);
    });
    document.querySelectorAll(".rail-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.panel === panelName);
    });

    sidebarPanel.classList.add("visible");
    activePanel = panelName;

    // Jeśli przełączyliśmy z innego panelu — odpal jego callback close
    if (previous && previous !== panelName && closeCallbacks.has(previous)) {
        closeCallbacks.get(previous)();
    }
}

/**
 * Toggle: jeśli panel jest aktywny → zamknij; w przeciwnym razie pokaż.
 * Używane przez przyciski w rail.
 */
function togglePanel(panelName) {
    if (activePanel === panelName && sidebarPanel.classList.contains("visible")) {
        closeActivePanel();
    } else {
        showPanel(panelName);
    }
}

export function initPanels() {
    document.querySelectorAll(".rail-btn[data-panel]").forEach((btn) => {
        btn.addEventListener("click", () => {
            if (btn.classList.contains("disabled")) return;
            togglePanel(btn.dataset.panel);
        });
    });

    document.querySelectorAll("[data-close]").forEach((btn) => {
        btn.addEventListener("click", () => {
            closeActivePanel();
        });
    });

    // Escape zamyka panel i picking
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeActivePanel();
            stopPicking();
        }
    });

    // Otwórz panel "trip" domyślnie
    showPanel("trip");
}