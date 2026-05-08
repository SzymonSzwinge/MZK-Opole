const { fetchJson } = require("./client");
const { getStopSchedule } = require("./stops");

async function getStopDepartures(stopPointSymbol, limit = 5) {
    try {
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

        if (realtimeResults.length >= limit) {
            return realtimeResults.slice(0, limit);
        }

        const needed = limit - realtimeResults.length;
        const scheduleResults = [];
        const seenCourseIds = new Set(realtimeResults.map((r) => r.courseId));

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

                        const realTime = dateMs + dep.scheduledDepartureSec * 1000;
                        if (realTime < now - 60000) continue;
                        if (seenCourseIds.has(dep.courseId)) continue;
                        seenCourseIds.add(dep.courseId);

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

        const combined = [...realtimeResults, ...scheduleResults]
            .sort((a, b) => a.realTime - b.realTime)
            .slice(0, limit);

        return combined;
    } catch (err) {
        console.error("Błąd pobierania odjazdów:", err.message);
        return [];
    }
}

module.exports = { getStopDepartures };