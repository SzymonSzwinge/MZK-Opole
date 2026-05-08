// ========== TRYB WYBIERANIA PRZYSTANKU ==========
import * as state from "../state.js";
import { loadReachableStops, loadReverseReachableStops, applyReachableFilter } from "./reachable.js";
import { updateTripNotices } from "../ui/notices.js";

export async function startPicking(mode) {
    if (state.pickingMode === mode) {
        stopPicking();
        return;
    }

    state.setPickingMode(mode);
    document.body.classList.add("picking-stop");

    document.getElementById("trip-from-pick").classList.toggle("choosing", mode === "from");
    document.getElementById("trip-to-pick").classList.toggle("choosing", mode === "to");

    if (mode === "to" && state.tripFrom) {
        if (!state.reachableStopsFromOrigin || state.reachableStopsFromOrigin.size <= 1) {
            updateTripNotices();
            await loadReachableStops(state.tripFrom.symbol);
        }
        applyReachableFilter();
    } else if (mode === "from" && state.tripTo) {
        if (!state.reachableStopsToDestination || state.reachableStopsToDestination.size <= 1) {
            updateTripNotices();
            await loadReverseReachableStops(state.tripTo.symbol);
        }
        applyReachableFilter();
    }

    updateTripNotices();
}

export function stopPicking() {
    const wasPicking = state.pickingMode !== null;
    state.setPickingMode(null);
    document.body.classList.remove("picking-stop");
    document.getElementById("trip-from-pick").classList.remove("choosing");
    document.getElementById("trip-to-pick").classList.remove("choosing");

    if (wasPicking) {
        applyReachableFilter();
    }

    updateTripNotices();
}