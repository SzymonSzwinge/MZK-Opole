const axios = require("axios");

const BASE_URL = "https://dip.mzkopole.pl";

// Cache w pamięci
const cache = {
    lines: { data: null, fetchedAt: 0 },
    stops: { data: null, fetchedAt: 0 },
    vehicles: { data: null, fetchedAt: 0 },
    runningVehicles: { data: null, fetchedAt: 0 },
};

const TTL = {
    lines: 24 * 60 * 60 * 1000,
    stops: 24 * 60 * 60 * 1000,
    vehicles: 60 * 60 * 1000,
    runningVehicles: 5000,
};

const courseShapeCache = new Map();
const COURSE_SHAPE_TTL = 24 * 60 * 60 * 1000;

async function fetchJson(path) {
    const res = await axios.get(`${BASE_URL}${path}`, {
        headers: { Accept: "application/json" },
    });
    return res.data;
}

async function getCached(key, path) {
    const entry = cache[key];
    const now = Date.now();
    if (entry.data && now - entry.fetchedAt < TTL[key]) {
        return entry.data;
    }
    entry.data = await fetchJson(path);
    entry.fetchedAt = now;
    return entry.data;
}

// ========== PODSTAWOWE ==========

async function getLines() {
    const data = await getCached("lines", "/getLines.json");
    return data.lines || [];
}

async function getStops() {
    const data = await getCached("stops", "/getStops.json");
    return data.stopPoints || [];
}

async function getFleet() {
    const data = await getCached("vehicles", "/getVehicles.json");
    return data.vehicles || [];
}

async function getRunningVehicles() {
    const data = await getCached("runningVehicles", "/getRunningVehicles.json");
    return data.vehicles || [];
}

async function getEnrichedVehicles() {
    const [running, fleet, lines] = await Promise.all([
        getRunningVehicles(),
        getFleet(),
        getLines(),
    ]);

    const fleetMap = new Map();
    for (const v of fleet) fleetMap.set(v.sideNumber, v);

    const lineMap = new Map();
    for (const l of lines) lineMap.set(l.name, l);

    return running.map((v) => ({
        id: v.vehicleId,
        line: v.lineName,
        lineType: lineMap.get(v.lineName)?.lineType || "BUS",
        nightLine: lineMap.get(v.lineName)?.nightLine || false,
        direction: v.optionalDirection,
        lat: v.latitude,
        lon: v.longitude,
        angle: v.angle,
        delaySec: v.delaySec,
        nearestSymbol: v.nearestSymbol,
        onStopPoint: v.onStopPoint,
        orderInCourse: v.orderInCourse,
        lastPing: v.lastPingDate,
        courseId: v.courseLoid,
        variantId: v.variantLoid,
        airCondition: fleetMap.get(v.vehicleId)?.airCondition || false,
        lowFloor: fleetMap.get(v.vehicleId)?.lowFloor || false,
        electric: fleetMap.get(v.vehicleId)?.electric || false,
        hybrid: fleetMap.get(v.vehicleId)?.hybrid || false,
        ecoVehicle: fleetMap.get(v.vehicleId)?.ecoVehicle || false,
        ticketmachineCash: fleetMap.get(v.vehicleId)?.ticketmachineCash || false,
        ticketmachineCard: fleetMap.get(v.vehicleId)?.ticketmachineCard || false,
        ticketmachineCashCard: fleetMap.get(v.vehicleId)?.ticketmachineCashCard || false,
    }));
}

async function getSimpleStops() {
    const stops = await getStops();
    return stops.map((s) => ({
        id: s.id,
        symbol: s.symbol,
        name: s.name,
        street: s.street,
        lat: s.latitude,
        lon: s.longitude,
        onRequest: s.onRequest,
    }));
}

// ========== TRASA POJAZDU ==========

async function getOrFetchShape(courseId, variantId) {
    const cached = courseShapeCache.get(variantId);
    if (cached && Date.now() - cached.fetchedAt < COURSE_SHAPE_TTL) {
        return cached.data;
    }
    try {
        const data = await fetchJson(`/getCourseDetails.json?courseId=${courseId}`);
        const courseInfo = data.courseInfos?.[0];
        if (!courseInfo) return [];
        const shape = (courseInfo.coursePoints || []).map((p) => [p.latitude, p.longitude]);
        courseShapeCache.set(variantId, { data: shape, fetchedAt: Date.now() });
        return shape;
    } catch (err) {
        console.error("Błąd pobierania shape:", err.message);
        return [];
    }
}

async function getCourseFull(courseId, variantId) {
    const [realCourseRaw, shape] = await Promise.all([
        fetchJson(`/getRealCourse.json?courseId=${courseId}`),
        getOrFetchShape(courseId, variantId),
    ]);

    const realCourse = realCourseRaw.realCourse || realCourseRaw;
    const stoppings = (realCourse.stoppings || []).map((s) => ({
        symbol: s.stopPointSymbol,
        name: s.stopPointName,
        order: s.orderInCourse,
        scheduledTime: s.scheduledDepartureSec,
        estimatedTime: s.estimatedDeparture,
    }));

    const allStops = await getStops();
    const stopBySymbol = new Map();
    for (const s of allStops) stopBySymbol.set(s.symbol, s);

    const enrichedStoppings = stoppings.map((st) => {
        const stop = stopBySymbol.get(st.symbol);
        return { ...st, lat: stop?.latitude, lon: stop?.longitude };
    });

    return {
        courseId,
        variantId,
        lineName: realCourse.lineName,
        shape,
        stoppings: enrichedStoppings,
    };
}

// ========== ODJAZDY Z PRZYSTANKU ==========



// ========== PLANOWANIE PODRÓŻY ==========

async function planTrip(fromSymbol, toSymbol) {
    const now = Date.now();

    // Pobierz aktualne pojazdy (do statusu live)
    const running = await getRunningVehicles();
    const runningByCourseId = new Map();
    for (const v of running) runningByCourseId.set(v.courseLoid, v);

    // Pobierz info o liniach (dzienne/nocne)
    const lines = await getLines();
    const lineMap = new Map();
    for (const l of lines) lineMap.set(l.name, l);

    // ========== KROK 1: Realtime (najbliższe ~30 min) ==========
    const realtimeData = await fetchJson(`/getRealtime.json?stopPointSymbol=${fromSymbol}`);
    const realtimeDeps = (realtimeData.departures || [])
        .filter((d) => !d.passed && !d.lack && (d.realDeparture || d.scheduledDeparture) >= now - 60000)
        .sort((a, b) => (a.realDeparture || a.scheduledDeparture) - (b.realDeparture || b.scheduledDeparture))
        .slice(0, 30);

    // ========== KROK 2: Sprawdź każdy realtime kurs - czy jedzie do toSymbol ==========
    const results = [];
    const seenCourseTimes = new Set(); // klucz: courseId_departureTime
    const BATCH = 6;

    for (let i = 0; i < realtimeDeps.length; i += BATCH) {
        const batch = realtimeDeps.slice(i, i + BATCH);
        const promises = batch.map((dep) =>
            fetchJson(`/getRealCourse.json?courseId=${dep.courseId}`)
                .then((raw) => {
                    const course = raw.realCourse || raw;
                    const stoppings = course.stoppings || [];
                    const fromStop = stoppings.find((s) => s.stopPointSymbol === fromSymbol);
                    const toStop = stoppings.find((s) => s.stopPointSymbol === toSymbol);

                    if (fromStop && toStop && toStop.orderInCourse > fromStop.orderInCourse) {
                        const depTime = fromStop.estimatedDeparture || dep.realDeparture || dep.scheduledDeparture;
                        const arrTime = toStop.estimatedDeparture || depTime + (60000 * (toStop.orderInCourse - fromStop.orderInCourse) * 2);

                        const liveVehicle = runningByCourseId.get(dep.courseId);
                        const lineInfo = lineMap.get(dep.lineName);

                        let vehicleStatus = "not_started";
                        let stopsAway = null;
                        if (liveVehicle) {
                            vehicleStatus = "in_transit";
                            stopsAway = fromStop.orderInCourse - (liveVehicle.orderInCourse || 0);
                            if (stopsAway < 0) vehicleStatus = "passed_start";
                        }

                        const key = `${dep.courseId}_${depTime}`;
                        seenCourseTimes.add(key);

                        return {
                            line: dep.lineName,
                            nightLine: lineInfo?.nightLine || false,
                            direction: dep.directionName,
                            courseId: dep.courseId,
                            variantId: dep.variantId,
                            vehicleId: dep.vehicleId,
                            departureTime: depTime,
                            arrivalTime: arrTime,
                            travelMinutes: Math.round((arrTime - depTime) / 60000),
                            stops: toStop.orderInCourse - fromStop.orderInCourse,
                            fromOrder: fromStop.orderInCourse,
                            toOrder: toStop.orderInCourse,
                            vehicleStatus,
                            stopsAway,
                            isLive: !!liveVehicle,
                            isRealtime: true,
                        };
                    }
                    return null;
                })
                .catch(() => null)
        );

        const batchResults = await Promise.all(promises);
        for (const r of batchResults) {
            if (r) results.push(r);
        }
        if (results.length >= 5) break;
    }

    // ========== KROK 3: Jeśli mamy >= 5 z realtime, wystarczy ==========
    if (results.length >= 5) {
        return results.sort((a, b) => a.departureTime - b.departureTime).slice(0, 5);
    }

    // ========== KROK 4: Dopełnij z rozkładu (dziś, jutro, pojutrze...) ==========
    const needed = 5 - results.length;
    console.log(`[planTrip] Realtime znalazło ${results.length} połączeń, dopełniam ${needed} z rozkładu`);

    // Pre-load wszystkich kursów które przejeżdżają przez fromSymbol w rozkładzie
    // i sprawdź które z nich jadą też do toSymbol
    const scheduleResults = [];
    
    for (let dayOffset = 0; dayOffset < 7 && scheduleResults.length < needed; dayOffset++) {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + dayOffset);
        const dateMs = date.getTime();

        try {
            const schedule = await getStopSchedule(fromSymbol, dateMs);
            if (!schedule || !schedule.lineSchedules) continue;

            // Zbierz wszystkie unikalne courseId z tego dnia
            const dayCourses = []; // [{courseId, variantId, lineName, direction, scheduledTime, dep}]
            for (const lineName in schedule.lineSchedules) {
                const lineSch = schedule.lineSchedules[lineName];
                for (const dep of lineSch.departures || []) {
                    if (!dep.visible) continue;
                    const realTime = dateMs + dep.scheduledDepartureSec * 1000;
                    if (realTime < now - 60000) continue;
                    
                    const key = `${dep.courseId}_${realTime}`;
                    if (seenCourseTimes.has(key)) continue;

                    dayCourses.push({
                        courseId: dep.courseId,
                        variantId: dep.variantId,
                        lineName,
                        direction: dep.optionalDirection || lineSch.destination || "?",
                        scheduledTime: realTime,
                        scheduledSec: dep.scheduledDepartureSec,
                        dateMs,
                        orderInCourse: dep.orderInCourse,
                    });
                }
            }

            // Posortuj po czasie odjazdu
            dayCourses.sort((a, b) => a.scheduledTime - b.scheduledTime);

            // Sprawdź każdy kurs: czy jedzie do toSymbol?
            // (limituj batchami żeby nie zalać API)
            for (let i = 0; i < dayCourses.length && scheduleResults.length < needed; i += BATCH) {
                const batch = dayCourses.slice(i, i + BATCH);
                const promises = batch.map((c) =>
                    fetchJson(`/getRealCourse.json?courseId=${c.courseId}`)
                        .then((raw) => {
                            const course = raw.realCourse || raw;
                            const stoppings = course.stoppings || [];
                            const fromStop = stoppings.find((s) => s.stopPointSymbol === fromSymbol);
                            const toStop = stoppings.find((s) => s.stopPointSymbol === toSymbol);

                            if (fromStop && toStop && toStop.orderInCourse > fromStop.orderInCourse) {
                                const lineInfo = lineMap.get(c.lineName);
                                
                                // Czas dojazdu - estymacja na podstawie liczby przystanków (~2 min/przystanek)
                                const stopsCount = toStop.orderInCourse - fromStop.orderInCourse;
                                const travelMs = stopsCount * 2 * 60000; // ~2 min na przystanek
                                
                                return {
                                    line: c.lineName,
                                    nightLine: lineInfo?.nightLine || false,
                                    direction: c.direction,
                                    courseId: c.courseId,
                                    variantId: c.variantId,
                                    vehicleId: null,
                                    departureTime: c.scheduledTime,
                                    arrivalTime: c.scheduledTime + travelMs,
                                    travelMinutes: stopsCount * 2,
                                    stops: stopsCount,
                                    fromOrder: fromStop.orderInCourse,
                                    toOrder: toStop.orderInCourse,
                                    vehicleStatus: "scheduled",
                                    stopsAway: null,
                                    isLive: false,
                                    isRealtime: false,
                                    dayOffset,
                                };
                            }
                            return null;
                        })
                        .catch(() => null)
                );

                const batchResults = await Promise.all(promises);
                for (const r of batchResults) {
                    if (r) {
                        scheduleResults.push(r);
                        if (scheduleResults.length >= needed) break;
                    }
                }
            }
        } catch (err) {
            console.error(`[planTrip] Błąd rozkładu dla offsetu ${dayOffset}:`, err.message);
        }
    }

    // ========== KROK 5: Połącz, posortuj, zwróć top 5 ==========
    const combined = [...results, ...scheduleResults]
        .sort((a, b) => a.departureTime - b.departureTime)
        .slice(0, 5);

    console.log(`[planTrip] ${fromSymbol} → ${toSymbol}: realtime=${results.length}, schedule=${scheduleResults.length}, total=${combined.length}`);
    return combined;
}
// ========== PRZYSTANKI DLA LINII ==========

// Cache: lineName -> Set(stopSymbols)
const lineToStopsCache = new Map();
const LINE_TO_STOPS_TTL = 60 * 60 * 1000; // 1h

async function getStopsForLine(lineName) {
    const cached = lineToStopsCache.get(lineName);
    if (cached && Date.now() - cached.fetchedAt < LINE_TO_STOPS_TTL) {
        return cached.data;
    }

    try {
        // Pobierz aktywne pojazdy tej linii
        const running = await getRunningVehicles();
        const lineCourses = running
            .filter((v) => v.lineName === lineName)
            .map((v) => ({ courseId: v.courseLoid, variantId: v.variantLoid }));

        // Zbierz unikalne variantIds
        const variantIds = [...new Set(lineCourses.map((c) => c.variantId))];
        const stopSymbols = new Set();

        // Dla każdego wariantu pobierz listę przystanków
        for (const variantId of variantIds) {
            try {
                const data = await fetchJson(`/getTheoreticalCourseDetails.json?variantId=${variantId}`);
                for (const sp of data.stopPoints || []) {
                    stopSymbols.add(sp.symbol);
                }
            } catch {}
        }

        const result = Array.from(stopSymbols);
        lineToStopsCache.set(lineName, { data: result, fetchedAt: Date.now() });
        return result;
    } catch (err) {
        console.error("Błąd pobierania przystanków linii:", err.message);
        return [];
    }
}
// ========== ROZKŁAD JAZDY (ATOMIC SCHEDULE) ==========

const scheduleCache = new Map();
const SCHEDULE_TTL = 60 * 60 * 1000; // 1h

async function getStopSchedule(symbol, date) {
    const dateMs = date || getNextScheduleDate();
    const cacheKey = `${symbol}_${dateMs}`;
    const cached = scheduleCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < SCHEDULE_TTL) {
        return cached.data;
    }

    try {
        const data = await fetchJson(`/getAtomicSchedule.json?symbol=${symbol}&date=${dateMs}`);
        scheduleCache.set(cacheKey, { data, fetchedAt: Date.now() });
        return data;
    } catch (err) {
        console.error("Błąd pobierania rozkładu:", err.message);
        return null;
    }
}
async function getStopDepartures(stopPointSymbol, limit = 5) {
    try {
        // 1. Najpierw pobierz dane realtime (bieżące + najbliższe godziny)
        const data = await fetchJson(`/getRealtime.json?stopPointSymbol=${stopPointSymbol}`);
        const departures = data.departures || [];
        const now = Date.now();

        let realtimeResults = departures
            .filter((d) => !d.passed && !d.lack && (d.realDeparture || d.scheduledDeparture) >= now - 60000)
            .sort((a, b) => (a.realDeparture || a.scheduledDeparture) - (b.realDeparture || b.scheduledDeparture))
            .map((d) => {
                const real = d.realDeparture || d.scheduledDeparture;
                const scheduled = d.scheduledDeparture;
                const delaySec = Math.round((real - scheduled) / 1000);
                const minutesAway = Math.max(0, Math.round((real - now) / 60000));
                return {
                    line: d.lineName,
                    direction: d.directionName,
                    courseId: d.courseId,
                    variantId: d.variantId,
                    vehicleId: d.vehicleId,
                    scheduledTime: scheduled,
                    realTime: real,
                    delaySec,
                    minutesAway,
                    onStopPoint: d.onStopPoint,
                    orderInCourse: d.orderInCourse,
                    isRealtime: true,
                };
            });

        // 2. Jeśli mamy już >= limit z realtime, zwróć je
        if (realtimeResults.length >= limit) {
            return realtimeResults.slice(0, limit);
        }

        // 3. Inaczej dopełnij z rozkładu (dziś, jutro, pojutrze...)
        const needed = limit - realtimeResults.length;
        const scheduleResults = [];
        const seenKeys = new Set(realtimeResults.map(r => `${r.courseId}_${r.scheduledTime}`));

        // Spróbuj kolejne dni: dziś, jutro, pojutrze
        for (let dayOffset = 0; dayOffset < 7 && scheduleResults.length < needed; dayOffset++) {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() + dayOffset);
            const dateMs = date.getTime();

            try {
                const schedule = await getStopSchedule(stopPointSymbol, dateMs);
                if (!schedule || !schedule.lineSchedules) continue;

                for (const lineName in schedule.lineSchedules) {
                    const lineSch = schedule.lineSchedules[lineName];
                    for (const dep of lineSch.departures || []) {
                        if (!dep.visible) continue;

                        // Oblicz timestamp odjazdu (data + sekundy od północy)
                        const realTime = dateMs + dep.scheduledDepartureSec * 1000;
                        
                        // Pomiń odjazdy które już minęły
                        if (realTime < now - 60000) continue;
                        
                        // Pomiń duplikaty z realtime
                        const key = `${dep.courseId}_${realTime}`;
                        if (seenKeys.has(key)) continue;
                        seenKeys.add(key);

                        const minutesAway = Math.max(0, Math.round((realTime - now) / 60000));

                        scheduleResults.push({
                            line: lineName,
                            direction: dep.optionalDirection || lineSch.destination || "?",
                            courseId: dep.courseId,
                            variantId: dep.variantId,
                            vehicleId: null,
                            scheduledTime: realTime,
                            realTime: realTime,
                            delaySec: 0,
                            minutesAway,
                            onStopPoint: false,
                            orderInCourse: dep.orderInCourse,
                            isRealtime: false,
                            dayOffset,
                        });
                    }
                }
            } catch (err) {
                console.error(`Błąd rozkładu dla offsetu ${dayOffset}:`, err.message);
            }
        }

        // 4. Połącz, posortuj, zwróć top N
        const combined = [...realtimeResults, ...scheduleResults]
            .sort((a, b) => a.realTime - b.realTime)
            .slice(0, limit);

        return combined;
    } catch (err) {
        console.error("Błąd pobierania odjazdów:", err.message);
        return [];
    }
}
function getNextScheduleDate() {
    // Zaokrąglij do najbliższej godziny w przyszłości
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d.getTime();
}

// ========== OSIĄGALNE PRZYSTANKI ==========

// Cache: stopSymbol -> Set(stopSymbols, do których da się dojechać bezpośrednio)
const reachableStopsCache = new Map();
const REACHABLE_TTL = 6 * 60 * 60 * 1000; // 6h

// Cache: variantId -> Array(stopSymbols w trasie)
const variantStopsCache = new Map();
const VARIANT_STOPS_TTL = 24 * 60 * 60 * 1000; // 24h - trasa wariantu się nie zmienia

async function getVariantStops(variantId) {
    const cached = variantStopsCache.get(variantId);
    if (cached && Date.now() - cached.fetchedAt < VARIANT_STOPS_TTL) {
        return cached.data;
    }

    try {
        const data = await fetchJson(`/getTheoreticalCourseDetails.json?variantId=${variantId}`);
        const stops = (data.stopPoints || []).map((sp, idx) => ({
            symbol: sp.symbol,
            order: sp.orderInVariant !== undefined ? sp.orderInVariant : idx,
        }));
        variantStopsCache.set(variantId, { data: stops, fetchedAt: Date.now() });
        return stops;
    } catch (err) {
        console.error(`Błąd getTheoreticalCourseDetails dla variantId=${variantId}:`, err.message);
        return [];
    }
}

async function getReachableStops(fromSymbol) {
    const cached = reachableStopsCache.get(fromSymbol);
    if (cached && Date.now() - cached.fetchedAt < REACHABLE_TTL) {
        return cached.data;
    }

    const startTime = Date.now();

    try {
        // Pobierz dzisiejszy rozkład - źródło wszystkich variantów które przejeżdżają tu dzisiaj
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dateMs = today.getTime();

        const schedule = await getStopSchedule(fromSymbol, dateMs);
        if (!schedule || !schedule.lineSchedules) {
            return [];
        }

        // Zbierz UNIKALNE variantId (NIE courseId!) - to jest kluczowe
        const variantIds = new Set();
        for (const lineName in schedule.lineSchedules) {
            const lineSch = schedule.lineSchedules[lineName];
            for (const dep of lineSch.departures || []) {
                if (dep.visible && dep.variantId) {
                    variantIds.add(dep.variantId);
                }
            }
        }

        console.log(`[getReachableStops] ${fromSymbol}: ${variantIds.size} unikalnych wariantów (zamiast setek kursów)`);

        // Pobierz trasę dla każdego unikalnego wariantu (z cache)
        const reachableSymbols = new Set();
        const BATCH = 15; // możemy więcej bo zapytania są lekkie i często z cache
        const variantArray = Array.from(variantIds);

        for (let i = 0; i < variantArray.length; i += BATCH) {
            const batch = variantArray.slice(i, i + BATCH);
            const promises = batch.map(async (vid) => {
                const stops = await getVariantStops(vid);
                
                // Znajdź pozycję naszego przystanku w trasie
                const fromStop = stops.find((s) => s.symbol === fromSymbol);
                if (!fromStop) return;

                // Wszystkie przystanki PO naszym
                for (const s of stops) {
                    if (s.order > fromStop.order) {
                        reachableSymbols.add(s.symbol);
                    }
                }
            });
            await Promise.all(promises);
        }

        const result = Array.from(reachableSymbols);
        reachableStopsCache.set(fromSymbol, { data: result, fetchedAt: Date.now() });

        const elapsed = Date.now() - startTime;
        console.log(`[getReachableStops] ${fromSymbol}: ${result.length} przystanków znaleziono w ${elapsed}ms`);
        return result;
    } catch (err) {
        console.error("Błąd obliczania osiągalnych przystanków:", err.message);
        return [];
    }
}

module.exports = {
    getLines,
    getEnrichedVehicles,
    getSimpleStops,
    getCourseFull,
    getStopDepartures,
    planTrip,
    getStopsForLine,
    getStopSchedule,
    getReachableStops,
};