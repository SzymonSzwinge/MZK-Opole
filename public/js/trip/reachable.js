// ========== FILTROWANIE OSIĄGALNYCH PRZYSTANKÓW ==========
import * as state from "../state.js";
import { stopsCluster } from "../map/cluster.js";
import { map } from "../map/mapInit.js";
import { fetchApi } from "../api/client.js";
import { updateTripNotices } from "../ui/notices.js";

export async function loadReachableStops(fromSymbol) {
    if (!fromSymbol) {
        state.setReachableStopsFromOrigin(null);
        return;
    }

    state.setIsLoadingReachable(true);
    updateTripNotices();

    try {
        const symbols = await fetchApi(`/api/stop/${encodeURIComponent(fromSymbol)}/reachable`);
        const set = new Set(symbols);
        set.add(fromSymbol);
        state.setReachableStopsFromOrigin(set);
        console.log(`Osiągalnych przystanków z ${fromSymbol}: ${symbols.length}`);
    } catch (err) {
        console.error("Błąd ładowania osiągalnych przystanków:", err);
        state.setReachableStopsFromOrigin(null);
    } finally {
        state.setIsLoadingReachable(false);
        updateTripNotices();
    }
}

export async function loadReverseReachableStops(toSymbol) {
    if (!toSymbol) {
        state.setReachableStopsToDestination(null);
        return;
    }

    state.setIsLoadingReverseReachable(true);
    updateTripNotices();

    try {
        const symbols = await fetchApi(`/api/stop/${encodeURIComponent(toSymbol)}/reachable-to`);
        const set = new Set(symbols);
        set.add(toSymbol);
        state.setReachableStopsToDestination(set);
        console.log(`Przystanki źródłowe do ${toSymbol}: ${symbols.length}`);
    } catch (err) {
        console.error("Błąd ładowania reverse reachable:", err);
        state.setReachableStopsToDestination(null);
    } finally {
        state.setIsLoadingReverseReachable(false);
        updateTripNotices();
    }
}

export function applyReachableFilter() {
    stopsCluster.clearLayers();

    let markersToAdd;
    let filterSet = null;

    if (state.pickingMode === "from" && state.reachableStopsToDestination && state.reachableStopsToDestination.size > 1) {
        filterSet = state.reachableStopsToDestination;
    } else if (state.pickingMode === "to" && state.reachableStopsFromOrigin && state.reachableStopsFromOrigin.size > 1) {
        filterSet = state.reachableStopsFromOrigin;
    } else if (!state.tripFrom && state.tripTo && state.reachableStopsToDestination && state.reachableStopsToDestination.size > 1 && !state.pickingMode) {
        filterSet = state.reachableStopsToDestination;
    } else if (state.tripFrom && !state.tripTo && state.reachableStopsFromOrigin && state.reachableStopsFromOrigin.size > 1 && !state.pickingMode) {
        filterSet = state.reachableStopsFromOrigin;
    }

    if (filterSet) {
        markersToAdd = [];
        for (const marker of state.stopMarkers.values()) {
            const symbol = marker.stopData?.symbol;
            if (symbol && filterSet.has(symbol)) {
                markersToAdd.push(marker);
            }
        }
        console.log(`Filtr aktywny: pokazuję ${markersToAdd.length} z ${state.stopMarkers.size} przystanków`);
    } else {
        markersToAdd = Array.from(state.stopMarkers.values());
    }

    stopsCluster.addLayers(markersToAdd, { chunkedLoading: false });

    setTimeout(() => {
        if (stopsCluster.refreshClusters) {
            stopsCluster.refreshClusters();
        }
        map.fire("zoomend");
        map.invalidateSize(false);
    }, 50);
}