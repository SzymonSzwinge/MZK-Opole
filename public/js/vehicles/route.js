// ========== TRASA POJAZDU ==========
import { map } from "../map/mapInit.js";
import { stopsCluster } from "../map/cluster.js";
import * as state from "../state.js";
import { stopMarkers } from "../state.js";
import { ROUTE_REFRESH_MS } from "../config.js";
import { fetchApi } from "../api/client.js";
import { applyFilters } from "./filters.js";
import { highlightStopsForLine } from "../stops/highlight.js";

/**
 * Znajduje indeks punktu na shape najbliższego danemu przystankowi,
 * ALE ograniczony do zakresu wyznaczonego przez sąsiednie przystanki.
 * Dzięki temu nie tnie trasy w złym miejscu gdy trasa zawija się blisko siebie.
 */
function findSplitIndex(shape, stoppings, currentOrder) {
    const currentStop = stoppings.find((s) => s.order === currentOrder);
    if (!currentStop || !currentStop.lat || !currentStop.lon) return 0;

    // Znajdź poprzedni przystanek na trasie (z koordynatami)
    const prevStop = [...stoppings]
        .filter((s) => s.order < currentOrder && s.lat && s.lon)
        .sort((a, b) => b.order - a.order)[0];

    // Znajdź najbliższy punkt shape dla aktualnego przystanku
    let bestIdx = 0;
    let minDist = Infinity;

    // Jeśli jest poprzedni przystanek, ograniczamy szukanie do segmentu PO nim
    let searchStart = 0;
    if (prevStop) {
        let prevMin = Infinity;
        for (let i = 0; i < shape.length; i++) {
            const d = (shape[i][0] - prevStop.lat) ** 2 + (shape[i][1] - prevStop.lon) ** 2;
            if (d < prevMin) {
                prevMin = d;
                searchStart = i;
            }
        }
    }

    for (let i = searchStart; i < shape.length; i++) {
        const d = (shape[i][0] - currentStop.lat) ** 2 + (shape[i][1] - currentStop.lon) ** 2;
        if (d < minDist) {
            minDist = d;
            bestIdx = i;
        }
    }

    return bestIdx;
}

/**
 * Pokazuje trasę KONKRETNEGO KURSU
 */
export async function showVehicleRoute(bus, highlightFrom, highlightTo) {
    resetRouteFocus();
    state.setLastFocusedRouteArgs({ bus, highlightFrom, highlightTo });

    if (!bus.courseId || !bus.variantId) return;

    state.setFocusedCourseId(bus.courseId);
    applyFilters();

    // Szukamy live pojazd na tym kursie
    let liveVehicleId = null;
    for (const id in state.vehicles) {
        if (state.vehicles[id].data.courseId === bus.courseId) {
            liveVehicleId = id;
            break;
        }
    }

    const vehicleHasStarted = !!liveVehicleId;
    const currentOrder = vehicleHasStarted
        ? (state.vehicles[liveVehicleId].data.orderInCourse ?? 0)
        : -1;

    stopsCluster.clearLayers();

    // ⬇⬇⬇ KLUCZOWE: zbieramy wszystkie markery LOKALNIE, dopiero na końcu zapisujemy do state
    const newStopMarkers = [];
    const newTimeLabels = [];

    try {
        const url = `/api/course/${bus.courseId}?variantId=${bus.variantId}`;
        const course = await fetchApi(url);

        if (!course || !course.shape) return;

        // ===== POLYLINE =====
        if (vehicleHasStarted) {
            // Dzielimy trasę na przejechaną i pozostałą
            const splitIndex = findSplitIndex(course.shape, course.stoppings, currentOrder);

            const passedShape = course.shape.slice(0, splitIndex + 1);
            const remainingShape = course.shape.slice(splitIndex);

            if (passedShape.length > 1) {
                state.setHighlightedRoutePassed(
                    L.polyline(passedShape, {
                        color: "#424242",
                        weight: 5,
                        opacity: 0.85,
                        dashArray: "10,6",
                    }).addTo(map)
                );
            }

            if (remainingShape.length > 1) {
                state.setHighlightedRouteRemaining(
                    L.polyline(remainingShape, {
                        color: "#ff6f00",
                        weight: 5,
                        opacity: 0.9,
                    }).addTo(map)
                );
            }

            } else {
                // ===== KURS JESZCZE NIE WYRUSZYŁ =====
                
                // 🔍 DEBUG
                console.log("[route] Kurs nie wystartował:", {
                    courseId: bus.courseId,
                    variantId: bus.variantId,
                    shapeLength: course.shape?.length || 0,
                    stoppingsLength: course.stoppings?.length || 0,
                    firstShapePoint: course.shape?.[0],
                    lastShapePoint: course.shape?.[course.shape.length - 1],
                });

                // Wybierz źródło geometrii: shape (po drogach) lub fallback przez przystanki (linia prosta)
                let routeGeometry = course.shape;

                if (!routeGeometry || routeGeometry.length < 2) {
                    console.warn("[route] Brak shape dla niewystartowanego kursu — używam fallback przez przystanki");
                    routeGeometry = course.stoppings
                        .filter((s) => s.lat && s.lon)
                        .map((s) => [s.lat, s.lon]);
                }

                if (routeGeometry.length >= 2) {
                    state.setHighlightedRouteRemaining(
                        L.polyline(routeGeometry, {
                            color: "#ff6f00",
                            weight: 5,
                            opacity: 0.85,
                            dashArray: "10,8",
                        }).addTo(map)
                    );
                } else {
                    console.error("[route] Nie da się narysować trasy — brak nawet przystanków z koordynatami");
                }

                // Pinezka START na pierwszym przystanku
                const firstStop = course.stoppings[0];
                if (firstStop && firstStop.lat && firstStop.lon) {
                    const startMarker = L.marker([firstStop.lat, firstStop.lon], {
                        icon: L.divIcon({
                            html: `
                                <div style="
                                    position: relative;
                                    display: flex;
                                    flex-direction: column;
                                    align-items: center;
                                ">
                                    <div style="
                                        background: #d32f2f;
                                        color: white;
                                        padding: 5px 10px;
                                        border-radius: 6px;
                                        font-size: 11px;
                                        font-weight: bold;
                                        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                                        border: 2px solid white;
                                        white-space: nowrap;
                                        letter-spacing: 0.5px;
                                    ">
                                        ▶ START
                                    </div>
                                    <div style="
                                        width: 0;
                                        height: 0;
                                        border-left: 6px solid transparent;
                                        border-right: 6px solid transparent;
                                        border-top: 8px solid #d32f2f;
                                        margin-top: -1px;
                                    "></div>
                                </div>
                            `,
                            className: "",
                            iconSize: [70, 32],
                            iconAnchor: [35, 32],
                        }),
                        interactive: false,
                        zIndexOffset: 800,
                    });

                    startMarker.addTo(map);
                    newStopMarkers.push(startMarker);
                }
            }

        // ===== PRZYSTANKI =====
        for (const st of course.stoppings) {
            if (!st.lat || !st.lon) continue;

            const isFrom = highlightFrom && st.symbol === highlightFrom;
            const isTo = highlightTo && st.symbol === highlightTo;
            const passed = vehicleHasStarted && st.order < currentOrder;
            const isCurrent = vehicleHasStarted && st.order === currentOrder;

            let dotColor, dotSize;

            if (isFrom) { dotColor = "#4caf50"; dotSize = 16; }
            else if (isTo) { dotColor = "#d32f2f"; dotSize = 16; }
            else if (isCurrent) { dotColor = "#ff6f00"; dotSize = 14; }
            else if (passed) { dotColor = "#bbb"; dotSize = 10; }
            else { dotColor = "#ffc107"; dotSize = 10; }

            const dot = L.marker([st.lat, st.lon], {
                icon: L.divIcon({
                    html: `<div style="width:${dotSize}px;height:${dotSize}px;background:${dotColor};border:2px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>`,
                    className: "",
                    iconSize: [dotSize, dotSize],
                    iconAnchor: [dotSize / 2, dotSize / 2],
                }),
                interactive: true,
            });

            dot.bindPopup(`<b>${st.name}</b><br>Słupek: ${st.symbol}`);
            dot.addTo(map);
            newStopMarkers.push(dot);

            // Etykieta czasu
            if (!passed && st.estimatedTime) {
                const timeStr = new Date(st.estimatedTime).toLocaleTimeString("pl-PL", {
                    hour: "2-digit",
                    minute: "2-digit",
                });

                const borderColor = isFrom ? "#4caf50" : isTo ? "#d32f2f" : "#ffc107";

                const label = L.marker([st.lat, st.lon], {
                    icon: L.divIcon({
                        html: `<div style="background:white;border:2px solid ${borderColor};padding:1px 5px;border-radius:4px;font-size:11px;font-weight:bold;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.3)">${timeStr}</div>`,
                        className: "",
                        iconSize: [40, 18],
                        iconAnchor: [20, -8],
                    }),
                    interactive: false,
                });

                label.addTo(map);
                newTimeLabels.push(label);
            }
        }

        // ⬇⬇⬇ Dopiero TUTAJ zapisujemy do state — wszystkie markery są w tablicach
        state.setHighlightedStopMarkers(newStopMarkers);
        state.setHighlightedTimeLabels(newTimeLabels);

        // ===== DOPASUJ WIDOK =====
        if (highlightFrom && highlightTo) {
            const fromStop = course.stoppings.find((s) => s.symbol === highlightFrom);
            const toStop = course.stoppings.find((s) => s.symbol === highlightTo);

            if (fromStop && toStop) {
                const points = [
                    [fromStop.lat, fromStop.lon],
                    [toStop.lat, toStop.lon],
                ];

                if (vehicleHasStarted) {
                    const v = state.vehicles[liveVehicleId];
                    if (v) points.push([v.data.lat, v.data.lon]);
                }

                map.fitBounds(L.latLngBounds(points), {
                    padding: [80, 80],
                    maxZoom: 15,
                });
            }
        }

        // ===== AUTO REFRESH =====
        if (vehicleHasStarted && !state.routeRefreshTimer) {
            state.setRouteRefreshTimer(
                setInterval(() => {
                    if (state.lastFocusedRouteArgs && state.focusedCourseId) {
                        const args = state.lastFocusedRouteArgs;
                        showVehicleRoute(args.bus, args.highlightFrom, args.highlightTo);
                    }
                }, ROUTE_REFRESH_MS)
            );
        }

    } catch (err) {
        console.error("Błąd trasy:", err);
        // W razie błędu też wyczyść co zdążyliśmy dodać
        for (const m of newStopMarkers) map.removeLayer(m);
        for (const l of newTimeLabels) map.removeLayer(l);
    }
}

/**
 * Czyści wizualizację i fokus kursu
 */
function resetRouteFocus() {
    clearVehicleRouteVisuals();

    if (state.routeRefreshTimer) {
        clearInterval(state.routeRefreshTimer);
        state.setRouteRefreshTimer(null);
    }

    state.setLastFocusedRouteArgs(null);

    if (state.focusedCourseId !== null) {
        state.setFocusedCourseId(null);
        applyFilters();
    }
}

export function clearVehicleRouteVisuals() {
    if (state.highlightedRoutePassed) {
        map.removeLayer(state.highlightedRoutePassed);
        state.setHighlightedRoutePassed(null);
    }
    if (state.highlightedRouteRemaining) {
        map.removeLayer(state.highlightedRouteRemaining);
        state.setHighlightedRouteRemaining(null);
    }

    for (const m of state.highlightedStopMarkers) map.removeLayer(m);
    for (const l of state.highlightedTimeLabels) map.removeLayer(l);

    state.setHighlightedStopMarkers([]);
    state.setHighlightedTimeLabels([]);
}

export function clearVehicleRoute() {
    resetRouteFocus();

    const allStopMarkersArr = Array.from(stopMarkers.values());
    stopsCluster.addLayers(allStopMarkersArr);

    if (state.activeLineFilter) {
        highlightStopsForLine(state.activeLineFilter);
    }
}