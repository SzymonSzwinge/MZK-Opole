// ========== LISTA LINII ==========
import { vehicles, allLines } from "../state.js";
import * as state from "../state.js";
import { applyFilters } from "../vehicles/filters.js";
import { highlightStopsForLine } from "../stops/highlight.js";

export function renderLinesList() {
    const list = document.getElementById("lines-list");
    list.innerHTML = "";
    const activeNames = new Set();
    for (const v of Object.values(vehicles)) activeNames.add(v.data.line);

    const sorted = Array.from(activeNames).sort((a, b) => {
        const na = parseInt(a.replace(/\D/g, "")) || 999;
        const nb = parseInt(b.replace(/\D/g, "")) || 999;
        return na - nb || a.localeCompare(b);
    });

    for (const name of sorted) {
        const info = allLines.get(name);
        const chip = document.createElement("div");
        chip.className = "line-chip";
        if (info?.nightLine) chip.classList.add("night");
        if (state.activeLineFilter === name) chip.classList.add("active");
        chip.textContent = name;
        chip.onclick = () => {
            state.setActiveLineFilter(state.activeLineFilter === name ? null : name);
            renderLinesList();
            applyFilters();
            highlightStopsForLine(state.activeLineFilter);
        };
        list.appendChild(chip);
    }
}

export function initLinesPanel() {
    document.getElementById("search").addEventListener("input", (e) => {
        state.setSearchQuery(e.target.value.trim());
        applyFilters();

        const matchingLines = Array.from(allLines.keys()).filter(name =>
            name.toLowerCase().startsWith(state.searchQuery.toLowerCase())
        );
        if (matchingLines.length === 1) {
            highlightStopsForLine(matchingLines[0]);
        } else if (!state.searchQuery && !state.activeLineFilter) {
            highlightStopsForLine(null);
        }
    });

    document.getElementById("filter-day").addEventListener("change", (e) => {
        state.setShowDay(e.target.checked);
        applyFilters();
    });

    document.getElementById("filter-night").addEventListener("change", (e) => {
        state.setShowNight(e.target.checked);
        applyFilters();
    });
}