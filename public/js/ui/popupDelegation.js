// ========== GLOBALNA OBSŁUGA ZDARZEŃ W POPUPACH ==========
// Zastępuje wszystkie window._xyz i inline onclick

import { showVehicleRoute } from "../vehicles/route.js";
import { map } from "../map/mapInit.js";
import {
    toggleSchedule,
    closeSchedule,
    changeScheduleDate,
    setScheduleToday,
} from "../stops/schedule.js";

export function initPopupDelegation() {
    // Leaflet renderuje popupy do .leaflet-popup-pane
    // Event delegation na document łapie wszystko
    document.addEventListener("click", (e) => {
        const el = e.target.closest("[data-action]");
        if (!el) return;

        const action = el.dataset.action;

        switch (action) {

            // ===== PRZYSTANEK — Jedź stąd =====
            case "set-trip-from": {
                const { symbol, name } = el.dataset;
                map.closePopup();
                window._setTripFrom(symbol, name);
                break;
            }

            // ===== PRZYSTANEK — Jedź tutaj =====
            case "set-trip-to": {
                const { symbol, name } = el.dataset;
                map.closePopup();
                window._setTripTo(symbol, name);
                break;
            }

            // ===== ODJAZD — pokaż trasę =====
            case "show-dep-route": {
                e.stopPropagation();
                const courseId = el.dataset.courseId;
                const variantId = el.dataset.variantId;
                const order = parseInt(el.dataset.order || "0");
                const vehicleId = el.dataset.vehicleId || "";
                map.closePopup();
                showVehicleRoute({ courseId, variantId, orderInCourse: order, vehicleId });
                break;
            }

            // ===== ROZKŁAD — otwórz/zamknij =====
            case "toggle-schedule": {
                e.stopPropagation();
                const { symbol } = el.dataset;
                toggleSchedule(symbol);
                break;
            }

            case "close-schedule": {
                e.stopPropagation();
                const { symbol } = el.dataset;
                closeSchedule(symbol);
                break;
            }

            // ===== ROZKŁAD — nawigacja dat =====
            case "schedule-prev": {
                e.stopPropagation();
                changeScheduleDate(el.dataset.symbol, -1);
                break;
            }

            case "schedule-next": {
                e.stopPropagation();
                changeScheduleDate(el.dataset.symbol, 1);
                break;
            }

            case "schedule-today": {
                e.stopPropagation();
                setScheduleToday(el.dataset.symbol);
                break;
            }
        }
    });
}