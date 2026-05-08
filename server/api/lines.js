const { fetchJson } = require("./client");
const { getCached, lineToStopsCache, LINE_TO_STOPS_TTL } = require("./cache");
const { getRunningVehicles } = require("./vehicles");

async function getLines() {
    const data = await getCached("lines", "/getLines.json");
    return data.lines || [];
}

async function getStopsForLine(lineName) {
    const cached = lineToStopsCache.get(lineName);
    if (cached && Date.now() - cached.fetchedAt < LINE_TO_STOPS_TTL) {
        return cached.data;
    }

    try {
        const running = await getRunningVehicles();
        const lineCourses = running
            .filter((v) => v.lineName === lineName)
            .map((v) => ({ courseId: v.courseLoid, variantId: v.variantLoid }));

        const variantIds = [...new Set(lineCourses.map((c) => c.variantId))];
        const stopSymbols = new Set();

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

module.exports = { getLines, getStopsForLine };