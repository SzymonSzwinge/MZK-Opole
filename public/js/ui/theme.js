// ========== TRYB CIEMNY ==========
import { map, tileLayers, getCurrentTheme, setCurrentTheme } from "../map/mapInit.js";

export function initTheme() {
    const btn = document.getElementById("theme-toggle");
    btn.textContent = getCurrentTheme() === "dark" ? "☀️" : "🌙";

    btn.addEventListener("click", () => {
        const newTheme = getCurrentTheme() === "dark" ? "light" : "dark";
        setTheme(newTheme);
    });
}

function setTheme(theme) {
    map.removeLayer(tileLayers[getCurrentTheme()]);
    setCurrentTheme(theme);
    tileLayers[theme].addTo(map);
    document.body.classList.toggle("dark", theme === "dark");
    document.getElementById("theme-toggle").textContent = theme === "dark" ? "☀️" : "🌙";
    localStorage.setItem("theme", theme);
}