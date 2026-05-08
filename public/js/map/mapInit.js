// ========== INICJALIZACJA MAPY ==========

export const tileLayers = {
    light: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
    }),
    dark: L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "© OpenStreetMap © CARTO",
        maxZoom: 19,
    }),
};

let currentTheme = localStorage.getItem("theme") === "dark" ? "dark" : "light";

export const map = L.map("map").setView([50.6683, 17.9265], 13);
tileLayers[currentTheme].addTo(map);
if (currentTheme === "dark") document.body.classList.add("dark");

export function getCurrentTheme() {
    return currentTheme;
}

export function setCurrentTheme(theme) {
    currentTheme = theme;
}