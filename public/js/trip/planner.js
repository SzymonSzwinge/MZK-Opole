// ========== PLANOWANIE PODRÓŻY — GŁÓWNA LOGIKA ==========
import * as state from "../state.js";
import { map } from "../map/mapInit.js";
import { escapeAttr } from "../utils.js";
import { updateTripMarkers } from "./markers.js";
import { loadReachableStops, loadReverseReachableStops, applyReachableFilter } from "./reachable.js";
import { startPicking, stopPicking } from "./picking.js";
import { searchTrip, registerSearchGlobals } from "./search.js";
import { updateTripNotices } from "../ui/notices.js";
import { showVehicleRoute } from "../vehicles/route.js";
import { registerScheduleGlobals } from "../stops/schedule.js";

export function initTripPlanner() {
    registerGlobalFunctions();
    registerSearchGlobals();
    registerScheduleGlobals();
    setupStopSearchInputs();
    setupButtons();
    setupClearButtons();
    setupNoticeClears();
}

function registerGlobalFunctions() {
    window._showDepRoute = function (courseId, variantId, orderInCourse, vehicleId) {
        map.closePopup();
        showVehicleRoute({ courseId, variantId, orderInCourse, vehicleId });
    };

    window._setTripFrom = async function (symbol, name) {
        state.setTripFrom({ symbol, name });
        const input = document.getElementById("trip-from-input");
        input.value = name;
        input.classList.add("set");
        map.closePopup();

        if (state.pickingMode === "from") {
            stopPicking();
        }

        await loadReachableStops(symbol);

        if (!state.tripTo) {
            applyReachableFilter();
        }

        updateTripMarkers();
        updateTripNotices();

        if (state.tripTo) searchTrip();
    };

    window._setTripTo = async function (symbol, name) {
        state.setTripTo({ symbol, name });
        const input = document.getElementById("trip-to-input");
        input.value = name;
        input.classList.add("set");
        map.closePopup();

        if (state.pickingMode === "to") {
            stopPicking();
        }

        await loadReverseReachableStops(symbol);

        if (!state.tripFrom) {
            applyReachableFilter();
        }

        updateTripMarkers();
        updateTripNotices();

        if (state.tripFrom) searchTrip();
    };
}

function setupStopSearchInputs() {
    setupStopSearch("trip-from-input", "trip-from-suggestions", (symbol, name) => {
        state.setTripFrom({ symbol, name });
        updateTripMarkers();
        loadReachableStops(symbol);
        updateTripNotices();
        if (state.tripTo) searchTrip();
    });

    setupStopSearch("trip-to-input", "trip-to-suggestions", (symbol, name) => {
        state.setTripTo({ symbol, name });
        updateTripMarkers();
        updateTripNotices();
        if (state.tripFrom) searchTrip();
    });
}

function setupStopSearch(inputId, suggestionsId, callback) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(suggestionsId);
    const isFromInput = inputId === "trip-from-input";
    const isToInput = inputId === "trip-to-input";

    input.addEventListener("input", () => {
        const q = input.value.trim().toLowerCase();
        if (q.length < 2) { dropdown.classList.remove("visible"); return; }

        const seen = new Set();
        const matches = state.allStopsData
            .filter((s) => {
                const key = `${s.name}_${s.symbol}`;
                if (seen.has(key)) return false;
                seen.add(key);

                const matchesText = s.name.toLowerCase().includes(q) || (s.street && s.street.toLowerCase().includes(q));
                if (!matchesText) return false;

                if (isToInput && state.reachableStopsFromOrigin && state.reachableStopsFromOrigin.size > 1) {
                    if (!state.reachableStopsFromOrigin.has(s.symbol)) return false;
                }
                if (isFromInput && state.reachableStopsToDestination && state.reachableStopsToDestination.size > 1) {
                    if (!state.reachableStopsToDestination.has(s.symbol)) return false;
                }

                return true;
            })
            .slice(0, 6);

        if (matches.length === 0) { dropdown.classList.remove("visible"); return; }

        dropdown.innerHTML = matches.map((s) => `
            <div class="suggestion-item" data-symbol="${s.symbol}" data-name="${escapeAttr(s.name)}">
                <div class="suggestion-name">${s.name}</div>
                <div class="suggestion-street">${s.street ? `ul. ${s.street}` : ""} (${s.symbol})</div>
            </div>
        `).join("");
        dropdown.classList.add("visible");

        dropdown.querySelectorAll(".suggestion-item").forEach((el) => {
            el.addEventListener("click", () => {
                callback(el.dataset.symbol, el.dataset.name);
                input.value = el.dataset.name;
                input.classList.add("set");
                dropdown.classList.remove("visible");
            });
        });
    });

    input.addEventListener("blur", () => {
        setTimeout(() => dropdown.classList.remove("visible"), 200);
    });
}

function setupButtons() {
    document.getElementById("trip-from-pick").addEventListener("click", () => startPicking("from"));
    document.getElementById("trip-to-pick").addEventListener("click", () => startPicking("to"));
    document.getElementById("trip-search").addEventListener("click", searchTrip);
}

function setupClearButtons() {
    document.getElementById("trip-from-clear").addEventListener("click", () => {
        state.setTripFrom(null);
        const input = document.getElementById("trip-from-input");
        input.value = "";
        input.classList.remove("set");
        document.getElementById("trip-results").innerHTML = "";
        state.setLastTripResults([]);
        if (state.countdownTimer) { clearInterval(state.countdownTimer); state.setCountdownTimer(null); }

        state.setReachableStopsFromOrigin(null);

        if (state.pickingMode) stopPicking();

        updateTripMarkers();
        applyReachableFilter();
        updateTripNotices();
    });

    document.getElementById("trip-to-clear").addEventListener("click", () => {
        state.setTripTo(null);
        const input = document.getElementById("trip-to-input");
        input.value = "";
        input.classList.remove("set");
        document.getElementById("trip-results").innerHTML = "";
        state.setLastTripResults([]);
        if (state.countdownTimer) { clearInterval(state.countdownTimer); state.setCountdownTimer(null); }

        state.setReachableStopsToDestination(null);

        if (state.pickingMode) stopPicking();

        updateTripMarkers();
        applyReachableFilter();
        updateTripNotices();
    });
}

function setupNoticeClears() {
    document.querySelectorAll(".trip-notice-clear").forEach((btn) => {
        btn.addEventListener("click", () => {
            const what = btn.dataset.clear;
            if (what === "from") {
                document.getElementById("trip-from-clear").click();
            } else if (what === "to") {
                if (state.pickingMode === "to") {
                    stopPicking();
                } else {
                    document.getElementById("trip-to-clear").click();
                }
            } else if (what === "plan") {
                document.getElementById("trip-from-clear").click();
            }
        });
    });
}