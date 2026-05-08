const { fetchJson } = require("./client");
const { getCached, scheduleCache, SCHEDULE_TTL, variantStopsCache, VARIANT_STOPS_TTL } = require("./cache");

async function getStops() {
    const data = await getCached("stops", "/getStops.json");
    return data.stopPoints || [];
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

function getNextScheduleDate() {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d.getTime();
}

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

module.exports = {
    getStops,
    getSimpleStops,
    getStopSchedule,
    getVariantStops,
    getNextScheduleDate,
};