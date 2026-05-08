// Cache dla podstawowych endpointów (lines, stops, vehicles, runningVehicles)
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

const { fetchJson } = require("./client");

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

// Cache dla shape'ów tras (variantId -> shape)
const courseShapeCache = new Map();
const COURSE_SHAPE_TTL = 24 * 60 * 60 * 1000;

// Cache dla rozkładów (symbol_dateMs -> schedule)
const scheduleCache = new Map();
const SCHEDULE_TTL = 60 * 60 * 1000;

// Cache dla przystanków linii (lineName -> Set(symbols))
const lineToStopsCache = new Map();
const LINE_TO_STOPS_TTL = 60 * 60 * 1000;

// Cache dla osiągalnych przystanków (symbol lub _to_symbol -> Array(symbols))
const reachableStopsCache = new Map();
const REACHABLE_TTL = 6 * 60 * 60 * 1000;

// Cache dla przystanków wariantu (variantId -> Array({symbol, order}))
const variantStopsCache = new Map();
const VARIANT_STOPS_TTL = 24 * 60 * 60 * 1000;

module.exports = {
    getCached,
    courseShapeCache,
    COURSE_SHAPE_TTL,
    scheduleCache,
    SCHEDULE_TTL,
    lineToStopsCache,
    LINE_TO_STOPS_TTL,
    reachableStopsCache,
    REACHABLE_TTL,
    variantStopsCache,
    VARIANT_STOPS_TTL,
};