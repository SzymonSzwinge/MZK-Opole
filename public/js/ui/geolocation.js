// ========== GEOLOKALIZACJA ==========
import { map } from "../map/mapInit.js";
import { createUserLocationIcon } from "../map/icons.js";
import * as state from "../state.js";
import { updateTripMarkers } from "../trip/markers.js";
import { loadReachableStops } from "../trip/reachable.js";
import { searchTrip } from "../trip/search.js";
import { updateTripNotices } from "../ui/notices.js";

function findNearestStop(lat, lon) {
    let nearest = null;
    let minDist = Infinity;
    for (const s of state.allStopsData) {
        if (!s.lat || !s.lon) continue;
        const d = (s.lat - lat) ** 2 + (s.lon - lon) ** 2;
        if (d < minDist) {
            minDist = d;
            nearest = s;
        }
    }
    return nearest;
}

function setUserLocation(lat, lon) {
    if (state.userLocationMarker) map.removeLayer(state.userLocationMarker);
    const m = L.marker([lat, lon], {
        icon: createUserLocationIcon(),
        zIndexOffset: 900,
    }).addTo(map);
    m.bindPopup("<b>📍 Twoja lokalizacja</b>");
    state.setUserLocationMarker(m);
}

export function initGeolocation() {
    document.getElementById("geo-btn").addEventListener("click", () => {
        if (!navigator.geolocation) {
            alert("Twoja przeglądarka nie wspiera geolokalizacji");
            return;
        }
        const btn = document.getElementById("geo-btn");
        btn.disabled = true;
        btn.textContent = "⏳ Lokalizuję...";

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                setUserLocation(lat, lon);

                const nearest = findNearestStop(lat, lon);
                if (nearest) {
                    state.setTripFrom({ symbol: nearest.symbol, name: nearest.name });
                    const input = document.getElementById("trip-from-input");
                    input.value = nearest.name;
                    input.classList.add("set");
                    updateTripMarkers();
                    loadReachableStops(nearest.symbol);
                    updateTripNotices();

                    map.setView([lat, lon], 15);
                    if (state.tripTo) searchTrip();
                }

                btn.disabled = false;
                btn.textContent = "📍 Z mojej lokalizacji";
            },
            (err) => {
                alert("Nie udało się pobrać lokalizacji: " + err.message);
                btn.disabled = false;
                btn.textContent = "📍 Z mojej lokalizacji";
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
}