const { getEnrichedVehicles } = require("./vehicles");
const { getLines } = require("./lines");
const { getStops } = require("./stops");

async function getStats() {
    const [vehicles, lines, stops] = await Promise.all([
        getEnrichedVehicles(),
        getLines(),
        getStops(),
    ]);

    // ===== POJAZDY NA TRASACH =====
    let dayCount = 0;
    let nightCount = 0;
    for (const v of vehicles) {
        if (v.nightLine) nightCount++;
        else dayCount++;
    }

    // ===== PUNKTUALNOŚĆ =====
    let onTime = 0;
    let delayed = 0;
    let early = 0;
    let totalDelaySec = 0;
    let countedForAvg = 0;

    for (const v of vehicles) {
        const d = v.delaySec ?? 0;
        if (d > 60) delayed++;
        else if (d < -60) early++;
        else onTime++;

        totalDelaySec += d;
        countedForAvg++;
    }

    const avgDelaySec = countedForAvg > 0
        ? Math.round(totalDelaySec / countedForAvg)
        : 0;

    // ===== NAJBARDZIEJ OPÓŹNIONA LINIA (średnia z min. 2 pojazdów) =====
    const byLine = new Map();
    for (const v of vehicles) {
        if (!byLine.has(v.line)) {
            byLine.set(v.line, { line: v.line, sum: 0, count: 0, nightLine: v.nightLine });
        }
        const entry = byLine.get(v.line);
        entry.sum += v.delaySec ?? 0;
        entry.count++;
    }

    let mostDelayedLine = null;
    let mostDelayedAvg = 0;
    for (const entry of byLine.values()) {
        if (entry.count < 2) continue;
        const avg = entry.sum / entry.count;
        if (avg > mostDelayedAvg) {
            mostDelayedAvg = avg;
            mostDelayedLine = {
                line: entry.line,
                avgDelaySec: Math.round(avg),
                vehicleCount: entry.count,
                nightLine: entry.nightLine,
            };
        }
    }

    // ===== NAJBARDZIEJ OPÓŹNIONY POJAZD (pojedynczy) =====
    let mostDelayedVehicle = null;
    for (const v of vehicles) {
        const d = v.delaySec ?? 0;
        if (d <= 60) continue; // tylko realnie opóźnione
        if (!mostDelayedVehicle || d > mostDelayedVehicle.delaySec) {
            mostDelayedVehicle = {
                vehicleId: v.id,
                line: v.line,
                direction: v.direction || "?",
                delaySec: d,
                nightLine: v.nightLine,
                courseId: v.courseId,
                variantId: v.variantId,
                lat: v.lat,
                lon: v.lon,
            };
        }
    }

    // ===== LINIE =====
    const totalLines = lines.length;
    const dayLines = lines.filter((l) => !l.nightLine).length;
    const nightLines = lines.filter((l) => l.nightLine).length;

    // ===== PRZYSTANKI =====
    const totalStops = stops.length;
    const onRequestStops = stops.filter((s) => s.onRequest).length;

    return {
        timestamp: Date.now(),
        vehicles: {
            total: vehicles.length,
            day: dayCount,
            night: nightCount,
        },
        punctuality: {
            onTime,
            delayed,
            early,
            total: vehicles.length,
            avgDelaySec,
        },
        mostDelayedLine,
        mostDelayedVehicle,
        lines: {
            total: totalLines,
            day: dayLines,
            night: nightLines,
        },
        stops: {
            total: totalStops,
            onRequest: onRequestStops,
        },
    };
}

module.exports = { getStats };