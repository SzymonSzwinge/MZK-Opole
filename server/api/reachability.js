const { reachableStopsCache, REACHABLE_TTL } = require("./cache");
const { getStopSchedule, getVariantStops } = require("./stops");

async function getReachableStops(fromSymbol) {
    const cached = reachableStopsCache.get(fromSymbol);
    if (cached && Date.now() - cached.fetchedAt < REACHABLE_TTL) {
        return cached.data;
    }

    const startTime = Date.now();

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dateMs = today.getTime();

        const schedule = await getStopSchedule(fromSymbol, dateMs);
        if (!schedule || !schedule.lineSchedules) return [];

        const variantIds = new Set();
        for (const lineName in schedule.lineSchedules) {
            const lineSch = schedule.lineSchedules[lineName];
            for (const dep of lineSch.departures || []) {
                if (dep.visible && dep.variantId) {
                    variantIds.add(dep.variantId);
                }
            }
        }

        console.log(`[getReachableStops] ${fromSymbol}: ${variantIds.size} unikalnych wariantów`);

        const reachableSymbols = new Set();
        const BATCH = 15;
        const variantArray = Array.from(variantIds);

        for (let i = 0; i < variantArray.length; i += BATCH) {
            const batch = variantArray.slice(i, i + BATCH);
            const promises = batch.map(async (vid) => {
                const stops = await getVariantStops(vid);
                const fromStop = stops.find((s) => s.symbol === fromSymbol);
                if (!fromStop) return;

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

async function getReachableToStop(toSymbol) {
    const cached = reachableStopsCache.get(`_to_${toSymbol}`);
    if (cached && Date.now() - cached.fetchedAt < REACHABLE_TTL) {
        return cached.data;
    }

    const startTime = Date.now();

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dateMs = today.getTime();

        const schedule = await getStopSchedule(toSymbol, dateMs);
        if (!schedule || !schedule.lineSchedules) return [];

        const variantIds = new Set();
        for (const lineName in schedule.lineSchedules) {
            const lineSch = schedule.lineSchedules[lineName];
            for (const dep of lineSch.departures || []) {
                if (dep.visible && dep.variantId) {
                    variantIds.add(dep.variantId);
                }
            }
        }

        console.log(`[getReachableToStop] ${toSymbol}: ${variantIds.size} unikalnych wariantów`);

        const reachableSymbols = new Set();
        const BATCH = 15;
        const variantArray = Array.from(variantIds);

        for (let i = 0; i < variantArray.length; i += BATCH) {
            const batch = variantArray.slice(i, i + BATCH);
            const promises = batch.map(async (vid) => {
                const stops = await getVariantStops(vid);
                const toStop = stops.find((s) => s.symbol === toSymbol);
                if (!toStop) return;

                for (const s of stops) {
                    if (s.order < toStop.order) {
                        reachableSymbols.add(s.symbol);
                    }
                }
            });
            await Promise.all(promises);
        }

        const result = Array.from(reachableSymbols);
        reachableStopsCache.set(`_to_${toSymbol}`, { data: result, fetchedAt: Date.now() });

        const elapsed = Date.now() - startTime;
        console.log(`[getReachableToStop] ${toSymbol}: ${result.length} przystanków źródłowych w ${elapsed}ms`);
        return result;
    } catch (err) {
        console.error("Błąd obliczania przystanków źródłowych:", err.message);
        return [];
    }
}

module.exports = { getReachableStops, getReachableToStop };