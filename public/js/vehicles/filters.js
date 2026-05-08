// ========== FILTROWANIE POJAZDÓW ==========
import * as state from "../state.js";
import { vehicles } from "../state.js";
import { map } from "../map/mapInit.js";
import { updateFilterNotice } from "../ui/notices.js";

export function shouldShowVehicle(v) {
    if (state.focusedCourseId !== null) return v.courseId === state.focusedCourseId;

    if (!state.showDay && !v.nightLine) return false;
    if (!state.showNight && v.nightLine) return false;
    if (state.activeLineFilter && v.line !== state.activeLineFilter) return false;
    if (state.searchQuery && !v.line.toLowerCase().startsWith(state.searchQuery.toLowerCase())) return false;
    return true;
}

export function applyFilters() {
    for (const id in vehicles) {
        const v = vehicles[id];
        const visible = shouldShowVehicle(v.data);
        if (visible && !map.hasLayer(v.marker)) v.marker.addTo(map);
        else if (!visible && map.hasLayer(v.marker)) map.removeLayer(v.marker);
    }
    updateCounter();
    updateFilterNotice();
}

export function updateCounter() {
    const visible = Object.values(vehicles).filter((v) => shouldShowVehicle(v.data)).length;
    const total = Object.keys(vehicles).length;
    const text = state.activeLineFilter
        ? `Linia ${state.activeLineFilter}: ${visible} pojazdów`
        : `${visible} / ${total} pojazdów na trasie`;

    const el = document.getElementById("counter-detail");
    if (el) el.textContent = text;
}