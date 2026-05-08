// ========== A/B PINEZKI ==========
import { map } from "../map/mapInit.js";
import { createTripMarker } from "../map/icons.js";
import * as state from "../state.js";
import { findStopBySymbol } from "../utils.js";

export function updateTripMarkers() {
    if (state.tripFromMarker) {
        map.removeLayer(state.tripFromMarker);
        state.setTripFromMarker(null);
    }
    if (state.tripToMarker) {
        map.removeLayer(state.tripToMarker);
        state.setTripToMarker(null);
    }

    if (state.tripFrom) {
        const stop = findStopBySymbol(state.tripFrom.symbol);
        if (stop) {
            const m = L.marker([stop.lat, stop.lon], {
                icon: createTripMarker("A", "from"),
                zIndexOffset: 1000,
            }).addTo(map);
            m.bindPopup(`<b>🟢 START</b><br>${stop.name}`);
            state.setTripFromMarker(m);
        }
    }
    if (state.tripTo) {
        const stop = findStopBySymbol(state.tripTo.symbol);
        if (stop) {
            const m = L.marker([stop.lat, stop.lon], {
                icon: createTripMarker("B", "to"),
                zIndexOffset: 1000,
            }).addTo(map);
            m.bindPopup(`<b>🔴 CEL</b><br>${stop.name}`);
            state.setTripToMarker(m);
        }
    }

    if (state.tripFromMarker && state.tripToMarker) {
        const bounds = L.latLngBounds([
            state.tripFromMarker.getLatLng(),
            state.tripToMarker.getLatLng(),
        ]);
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 14 });
    }
}