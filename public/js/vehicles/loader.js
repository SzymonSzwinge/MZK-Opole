// ========== ŁADOWANIE POJAZDÓW ==========
import { map } from "../map/mapInit.js";
import { createBusIcon } from "../map/icons.js";
import { buildVehiclePopup } from "./popup.js";
import { shouldShowVehicle, applyFilters } from "./filters.js";
import { showVehicleRoute } from "./route.js";
import { renderLinesList } from "../ui/lines.js";
import { vehicles } from "../state.js";
import { ANIMATION_MS } from "../config.js";
import { fetchApi } from "../api/client.js";

export async function loadVehicles() {
    let data;
    try {
        data = await fetchApi("/api/vehicles");
    } catch { return; }

    const seen = new Set();
    const now = performance.now();

    data.forEach((bus) => {
        if (!bus.lat || !bus.lon) return;
        seen.add(bus.id);

        if (!vehicles[bus.id]) {
            const marker = L.marker([bus.lat, bus.lon], {
                icon: createBusIcon(bus.line, bus.lineType, bus.nightLine, bus.delaySec),
            });

            marker.bindPopup(buildVehiclePopup(bus));

            marker.on("popupopen", () => {
                const v = vehicles[bus.id];
                if (v) showVehicleRoute({ ...v.data, vehicleId: bus.id });
            });

            vehicles[bus.id] = {
                marker,
                fromLat: bus.lat, fromLon: bus.lon,
                toLat: bus.lat, toLon: bus.lon,
                startTime: now,
                duration: 0,
                data: bus,
            };

            if (shouldShowVehicle(bus)) marker.addTo(map);

        } else {
            const v = vehicles[bus.id];
            const cur = v.marker.getLatLng();

            const moved =
                Math.abs(cur.lat - bus.lat) > 0.000001 ||
                Math.abs(cur.lng - bus.lon) > 0.000001;

            v.fromLat = cur.lat;
            v.fromLon = cur.lng;
            v.toLat = bus.lat;
            v.toLon = bus.lon;
            v.startTime = now;
            v.duration = moved ? ANIMATION_MS : 0;

            // ✅ Ikona tylko gdy coś się zmieniło
            if (v.data.line !== bus.line || v.data.delaySec !== bus.delaySec) {
                v.marker.setIcon(
                    createBusIcon(bus.line, bus.lineType, bus.nightLine, bus.delaySec)
                );
            }

            v.data = bus;

            // ✅ Popup tylko gdy otwarty
            if (v.marker.isPopupOpen()) {
                v.marker.getPopup().setContent(buildVehiclePopup(bus));
            }
        }
    });

    // Usuń pojazdy których już nie ma
    for (const id in vehicles) {
        if (!seen.has(id)) {
            map.removeLayer(vehicles[id].marker);
            delete vehicles[id];
        }
    }

    renderLinesList();
    applyFilters();
}

// ========== ANIMACJA ==========
export function animate() {
    const now = performance.now();

    for (const id in vehicles) {
        const v = vehicles[id];

        // ✅ Pomiń pojazdy bez animacji
        if (v.duration === 0) continue;

        const elapsed = now - v.startTime;

        // ✅ Animacja skończona — ustaw końcową pozycję i wyzeruj
        if (elapsed > v.duration * 1.3) {
            v.marker.setLatLng([v.toLat, v.toLon]);
            v.duration = 0;
            continue;
        }

        const t = elapsed / v.duration;
        const eased = t < 1 ? 1 - Math.pow(1 - t, 2) : 1;

        v.marker.setLatLng([
            v.fromLat + (v.toLat - v.fromLat) * eased,
            v.fromLon + (v.toLon - v.fromLon) * eased,
        ]);
    }

    requestAnimationFrame(animate);
}