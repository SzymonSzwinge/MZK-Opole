// ========== POWIADOMIENIA (TOAST) ==========
import * as state from "../state.js";
import { highlightStopsForLine } from "../stops/highlight.js";
import { applyFilters } from "../vehicles/filters.js";
import { renderLinesList } from "./lines.js";

export function updateTripNotices() {
    const noticeFrom = document.getElementById("trip-notice-from");
    const noticeTo = document.getElementById("trip-notice-to");
    const noticePlan = document.getElementById("trip-notice-plan");

    noticeFrom.classList.remove("visible");
    noticeTo.classList.remove("visible");
    noticePlan.classList.remove("visible");

    // Oba wybrane
    if (state.tripFrom && state.tripTo && !state.pickingMode) {
        document.getElementById("trip-notice-plan-text").innerHTML =
            `Trasa: <b>${state.tripFrom.name}</b> → <b>${state.tripTo.name}</b>`;
        noticePlan.classList.add("visible");
        return;
    }

    // Picking TO
    if (state.pickingMode === "to") {
        let text = "Wybieranie celu podróży...";
        if (state.isLoadingReachable) {
            text = "⏳ Analizuję trasy linii (5-15 sek)...";
        } else if (state.tripFrom && state.reachableStopsFromOrigin) {
            const count = Math.max(0, state.reachableStopsFromOrigin.size - 1);
            text = `Wybierz cel z mapy (${count} dostępnych przystanków)`;
        }
        noticeTo.querySelector("span:nth-of-type(2)").textContent = text;
        noticeTo.classList.add("visible");
        if (state.tripFrom) {
            document.getElementById("trip-notice-from-text").innerHTML =
                `Start: <b>${state.tripFrom.name}</b>`;
            noticeFrom.classList.add("visible");
        }
        return;
    }

    // Picking FROM
    if (state.pickingMode === "from") {
        let text = "Wybieranie startu podróży...";
        if (state.isLoadingReverseReachable) {
            text = "⏳ Analizuję trasy do celu (5-15 sek)...";
        } else if (state.tripTo && state.reachableStopsToDestination) {
            const count = Math.max(0, state.reachableStopsToDestination.size - 1);
            text = `Wybierz start z mapy (${count} przystanków do ${state.tripTo.name})`;
        }
        document.getElementById("trip-notice-from-text").textContent = text;
        noticeFrom.classList.add("visible");
        if (state.tripTo) {
            noticeTo.querySelector("span:nth-of-type(2)").innerHTML = `Cel: <b>${state.tripTo.name}</b>`;
            noticeTo.classList.add("visible");
        }
        return;
    }

    // Tylko start
    if (state.tripFrom && !state.tripTo) {
        document.getElementById("trip-notice-from-text").innerHTML =
            `Start: <b>${state.tripFrom.name}</b> — wybierz cel`;
        noticeFrom.classList.add("visible");
        return;
    }

    // Tylko cel
    if (!state.tripFrom && state.tripTo) {
        noticeTo.querySelector("span:nth-of-type(2)").innerHTML =
            `Cel: <b>${state.tripTo.name}</b> — wybierz start`;
        noticeTo.classList.add("visible");
        return;
    }
}

export function updateFilterNotice() {
    const filterNotice = document.getElementById("filter-notice");
    const filterNoticeText = document.getElementById("filter-notice-text");

    const parts = [];
    if (state.activeLineFilter) parts.push(`Linia: ${state.activeLineFilter}`);
    if (state.searchQuery) parts.push(`Szukam: "${state.searchQuery}"`);
    if (!state.showDay) parts.push("ukryte dzienne");
    if (!state.showNight) parts.push("ukryte nocne");

    if (parts.length === 0) {
        filterNotice.classList.remove("visible");
    } else {
        filterNoticeText.textContent = "🔍 Filtr: " + parts.join(" • ");
        filterNotice.classList.add("visible");
    }
}

export function initFilterNotice() {
    document.getElementById("filter-notice-clear").addEventListener("click", () => {
        state.setActiveLineFilter(null);
        state.setSearchQuery("");
        state.setShowDay(true);
        state.setShowNight(true);
        document.getElementById("search").value = "";
        document.getElementById("filter-day").checked = true;
        document.getElementById("filter-night").checked = true;
        renderLinesList();
        applyFilters();
        highlightStopsForLine(null);
        updateFilterNotice();
    });
}