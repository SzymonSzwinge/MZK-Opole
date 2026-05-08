// ========== PANELE BOCZNE ==========
import { stopPicking } from "../trip/picking.js";

const sidebarPanel = document.getElementById("sidebar-panel");
let activePanel = "trip";

export function showPanel(panelName) {
    if (activePanel === panelName) {
        sidebarPanel.classList.remove("visible");
        activePanel = null;
        document.querySelectorAll(".rail-btn").forEach((b) => b.classList.remove("active"));
        return;
    }

    document.querySelectorAll(".panel-content").forEach((c) => {
        c.classList.toggle("active", c.dataset.panel === panelName);
    });
    document.querySelectorAll(".rail-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.panel === panelName);
    });

    sidebarPanel.classList.add("visible");
    activePanel = panelName;
}

export function initPanels() {
    document.querySelectorAll(".rail-btn[data-panel]").forEach((btn) => {
        btn.addEventListener("click", () => {
            if (btn.classList.contains("disabled")) return;
            showPanel(btn.dataset.panel);
        });
    });

    document.querySelectorAll("[data-close]").forEach((btn) => {
        btn.addEventListener("click", () => {
            sidebarPanel.classList.remove("visible");
            activePanel = null;
            document.querySelectorAll(".rail-btn").forEach((b) => b.classList.remove("active"));
        });
    });

    // Escape zamyka panel i picking
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            sidebarPanel.classList.remove("visible");
            activePanel = null;
            document.querySelectorAll(".rail-btn").forEach((b) => b.classList.remove("active"));
            stopPicking();
        }
    });

    // Otwórz panel "trip" domyślnie
    showPanel("trip");
}