const { fetchJson } = require("./client");
const { getRunningVehicles } = require("./vehicles");
const { getLines } = require("./lines");
const { getStopSchedule } = require("./stops");

async function planTrip(fromSymbol, toSymbol) {
    const now = Date.now();

    const running = await getRunningVehicles();
    const runningByCourseId = new Map();
    for (const v of running) runningByCourseId.set(v.courseLoid, v);

    const lines = await getLines();
    const lineMap = new Map();
    for (const l of lines) lineMap.set(l.name, l);

    // ========== KROK 1: Realtime ==========
    const realtimeData = await fetchJson(`/getRealtime.json?stopPointSymbol=${fromSymbol}`);
    const realtimeDeps = (realtimeData.departures || [])
        .filter((d) => !d.passed && !d.lack && (d.realDeparture || d.scheduledDeparture) >= now - 60000)
        .sort((a, b) => (a.realDeparture || a.scheduledDeparture) - (b.realDeparture || b.scheduledDeparture))
        .slice(0, 30);

    const results = [];
    const seenCourseIds = new Set();
    const BATCH = 6;

    for (let i = 0; i < realtimeDeps.length; i += BATCH) {
        const batch = realtimeDeps.slice(i, i + BATCH);

        // ✅ Od razu blokujemy WSZYSTKIE courseId z batcha — niezależnie czy znajdziemy parę fromStop/toStop
        for (const dep of batch) {
            seenCourseIds.add(String(dep.courseId));
        }

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

    if (results.length >= 5) {
        return results.sort((a, b) => a.departureTime - b.departureTime).slice(0, 5);
    }

    // ========== KROK 2: Z rozkładu ==========
    const needed = 5 - results.length;
    console.log(`[planTrip] Realtime znalazło ${results.length} połączeń, dopełniam ${needed} z rozkładu`);

    const scheduleResults = [];

    for (let dayOffset = 0; dayOffset < 7 && scheduleResults.length < needed; dayOffset++) {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + dayOffset);
        const dateMs = date.getTime();

        try {
            const schedule = await getStopSchedule(fromSymbol, dateMs);
            if (!schedule || !schedule.lineSchedules) continue;

            const dayCourses = [];
            for (const lineName in schedule.lineSchedules) {
                const lineSch = schedule.lineSchedules[lineName];
                for (const dep of lineSch.departures || []) {
                    if (!dep.visible) continue;
                    const realTime = dateMs + dep.scheduledDepartureSec * 1000;
                    if (realTime < now - 60000) continue;

                    // ✅ Filtrowanie tylko po courseId — niezależnie od czasu
                    if (seenCourseIds.has(String(dep.courseId))) continue;

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

            dayCourses.sort((a, b) => a.scheduledTime - b.scheduledTime);

            for (let i = 0; i < dayCourses.length && scheduleResults.length < needed; i += BATCH) {
                const batch = dayCourses.slice(i, i + BATCH);

                // ✅ Również blokujemy courseId z batcha rozkładu
                for (const c of batch) {
                    seenCourseIds.add(String(c.courseId));
                }

                const promises = batch.map((c) =>
                    fetchJson(`/getRealCourse.json?courseId=${c.courseId}`)
                        .then((raw) => {
                            const course = raw.realCourse || raw;
                            const stoppings = course.stoppings || [];
                            const fromStop = stoppings.find((s) => s.stopPointSymbol === fromSymbol);
                            const toStop = stoppings.find((s) => s.stopPointSymbol === toSymbol);

                            if (fromStop && toStop && toStop.orderInCourse > fromStop.orderInCourse) {
                                const lineInfo = lineMap.get(c.lineName);
                                const stopsCount = toStop.orderInCourse - fromStop.orderInCourse;
                                const travelMs = stopsCount * 2 * 60000;

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

    const combined = [...results, ...scheduleResults]
        .sort((a, b) => a.departureTime - b.departureTime)
        .slice(0, 5);

    console.log(`[planTrip] ${fromSymbol} → ${toSymbol}: realtime=${results.length}, schedule=${scheduleResults.length}, total=${combined.length}`);
    return combined;
}

module.exports = { planTrip };