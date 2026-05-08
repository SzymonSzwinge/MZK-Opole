// ========== ŁADOWANIE PRZYSTANKÓW ==========
import { map } from "../map/mapInit.js";
import { stopsCluster } from "../map/cluster.js";
import { createStopIcon } from "../map/icons.js";
import { buildStopPopup } from "./popup.js";
import { fetchApi } from "../api/client.js";
import * as state from "../state.js";
import { STOP_REFRESH_MS } from "../config.js";
import { renderSchedulePanel } from "./schedule.js";

export async function loadStops() {
    try {
        const allStopsDataArr = await fetchApi("/api/stops");
        state.setAllStopsData(allStopsDataArr);

        const markers = [];
        for (const s of allStopsDataArr) {
            if (!s.lat || !s.lon) continue;
            const marker = L.marker([s.lat, s.lon], { icon: createStopIcon("normal") });
            marker.stopData = s;
            marker.bindPopup(buildStopPopup(s, null), { maxWidth: 700, minWidth: 280 });

            marker.on("click", (e) => {
                if (state.pickingMode === "from") {
                    L.DomEvent.stopPropagation(e);
                    window._setTripFrom(s.symbol, s.name);
                    // stopPicking jest wywoływane wewnątrz _setTripFrom
                } else if (state.pickingMode === "to") {
                    L.DomEvent.stopPropagation(e);
                    window._setTripTo(s.symbol, s.name);
                }
            });

            marker.on("popupopen", () => {
                loadStopDepartures(marker, s);
                state.setActiveStopRefreshTimer(
                    setInterval(() => loadStopDepartures(marker, s), STOP_REFRESH_MS)
                );
            });
            marker.on("popupclose", () => {
                if (state.activeStopRefreshTimer) {
                    clearInterval(state.activeStopRefreshTimer);
                    state.setActiveStopRefreshTimer(null);
                }
                state.openSchedules.set(s.symbol, false);
            });

            state.stopMarkers.set(s.id, marker);
            markers.push(marker);
        }
        stopsCluster.addLayers(markers);
        console.log(`Załadowano ${markers.length} przystanków`);
    } catch (err) {
        console.error("Błąd przystanków:", err);
    }
}

export async function loadStopDepartures(marker, stop) {
    if (!stop.symbol) return;
    const isScheduleOpen = state.openSchedules.get(stop.symbol);

    if (!isScheduleOpen) {
        marker.setPopupContent(buildStopPopup(stop, null));
    }

    try {
        const departures = await fetchApi(`/api/stop/${encodeURIComponent(stop.symbol)}/departures`);

        if (isScheduleOpen) {
            const schedule = await fetchApi(`/api/stop/${encodeURIComponent(stop.symbol)}/schedule`);
            const scheduleHtml = renderSchedulePanel(schedule, stop.symbol);
            marker.setPopupContent(buildStopPopup(stop, departures, scheduleHtml));
        } else {
            marker.setPopupContent(buildStopPopup(stop, departures));
        }
    } catch {
        marker.setPopupContent(buildStopPopup(stop, []));
    }
}