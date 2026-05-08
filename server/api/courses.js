const { fetchJson } = require("./client");
const { courseShapeCache, COURSE_SHAPE_TTL } = require("./cache");
const { getStops } = require("./stops");

async function fetchShapeForCourse(courseId) {
    try {
        const data = await fetchJson(`/getCourseDetails.json?courseId=${courseId}`);
        const courseInfo = data.courseInfos?.[0];
        if (!courseInfo || !Array.isArray(courseInfo.coursePoints)) return [];
        return courseInfo.coursePoints
            .map((p) => [p.latitude, p.longitude])
            .filter(([lat, lon]) => lat && lon);
    } catch (err) {
        return [];
    }
}

function saveShapeIfBetter(variantId, shape) {
    if (!shape || shape.length === 0) return false;
    const existing = courseShapeCache.get(variantId);
    if (existing && existing.data && existing.data.length >= shape.length) return false;
    courseShapeCache.set(variantId, { data: shape, fetchedAt: Date.now() });
    return true;
}

/**
 * Bardzo agresywne pobieranie shape dla wariantu.
 * Próbuje WSZYSTKIE kursy danego wariantu z dzisiejszego rozkładu wszystkich przystanków.
 */
async function aggressiveShapeLookup(variantId) {
    console.log(`[shape:aggressive] szukam shape dla variantId=${variantId}`);

    // Pobierz przystanki wariantu (żeby wiedzieć których pytać o rozkład)
    let stopSymbols = [];
    try {
        const theoretical = await fetchJson(`/getTheoreticalCourseDetails.json?variantId=${variantId}`);
        stopSymbols = (theoretical.stopPoints || [])
            .map((sp) => sp.symbol)
            .filter(Boolean)
            .slice(0, 3); // wystarczy 3 pierwsze przystanki
    } catch {
        return [];
    }

    if (stopSymbols.length === 0) return [];

    // Z rozkładów wyciągnij wszystkie courseId tego wariantu
    const courseIds = new Set();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateMs = today.getTime();

    for (const symbol of stopSymbols) {
        try {
            const sched = await fetchJson(
                `/getAtomicSchedule.json?symbol=${symbol}&date=${dateMs}`
            );
            if (!sched?.lineSchedules) continue;
            for (const lineName in sched.lineSchedules) {
                const lineSch = sched.lineSchedules[lineName];
                for (const dep of lineSch.departures || []) {
                    if (dep.variantId === variantId && dep.courseId) {
                        courseIds.add(dep.courseId);
                    }
                }
            }
        } catch {}
    }

    console.log(`[shape:aggressive] znaleziono ${courseIds.size} courseId dla variantId=${variantId}`);

    // Sprawdzaj kolejne kursy aż znajdziemy dobry shape
    let bestShape = [];
    const courseArray = Array.from(courseIds).slice(0, 15); // max 15 prób

    for (let i = 0; i < courseArray.length; i += 3) {
        const batch = courseArray.slice(i, i + 3);
        const results = await Promise.all(batch.map(fetchShapeForCourse));
        for (const shape of results) {
            if (shape.length > bestShape.length) {
                bestShape = shape;
                saveShapeIfBetter(variantId, bestShape);
            }
        }
        // Jeśli mamy >= 30 punktów, to uznajemy że dobrze
        if (bestShape.length >= 30) break;
    }

    console.log(`[shape:aggressive] variantId=${variantId}: best=${bestShape.length} pkt`);
    return bestShape;
}

async function getOrFetchShape(courseId, variantId) {
    const cached = courseShapeCache.get(variantId);
    if (cached && cached.data && cached.data.length >= 30
        && Date.now() - cached.fetchedAt < COURSE_SHAPE_TTL) {
        return cached.data;
    }

    let stopCount = 0;
    try {
        const theoretical = await fetchJson(`/getTheoreticalCourseDetails.json?variantId=${variantId}`);
        stopCount = (theoretical.stopPoints || []).length;
    } catch {}

    const expectedMinPoints = Math.max(stopCount * 3, 20);

    // 1. Spróbuj podany courseId
    let bestShape = await fetchShapeForCourse(courseId);
    saveShapeIfBetter(variantId, bestShape);
    console.log(`[shape] variantId=${variantId} courseId=${courseId}: bezpośrednio=${bestShape.length} pkt (oczekiwane ≥${expectedMinPoints})`);

    // 2. Jeśli jest cached lepszy, użyj cache
    const afterDirect = courseShapeCache.get(variantId);
    if (afterDirect?.data?.length > bestShape.length) {
        bestShape = afterDirect.data;
    }

    // 3. Jeśli nadal za mało — szukaj innych aktywnych kursów
    if (bestShape.length < expectedMinPoints) {
        try {
            const { getRunningVehicles } = require("./vehicles");
            const running = await getRunningVehicles();
            const otherCourses = running
                .filter((v) => v.variantLoid === variantId && v.courseLoid !== courseId)
                .map((v) => v.courseLoid);

            console.log(`[shape] variantId=${variantId}: ${otherCourses.length} innych aktywnych kursów`);

            for (const otherCourseId of otherCourses.slice(0, 5)) {
                const otherShape = await fetchShapeForCourse(otherCourseId);
                if (otherShape.length > bestShape.length) {
                    bestShape = otherShape;
                    saveShapeIfBetter(variantId, bestShape);
                    if (bestShape.length >= expectedMinPoints) break;
                }
            }
        } catch (err) {
            console.warn(`[shape] running search failed:`, err.message);
        }
    }

    // 4. OSTATNIA DESKA RATUNKU — agresywne szukanie po rozkładach
    if (bestShape.length < expectedMinPoints) {
        const aggressive = await aggressiveShapeLookup(variantId);
        if (aggressive.length > bestShape.length) {
            bestShape = aggressive;
        }
    }

    // 5. Zwróć co mamy
    const final = courseShapeCache.get(variantId);
    return final?.data || bestShape || [];
}

async function getCourseFull(courseId, variantId) {
    const [realCourseRaw, shape, theoretical] = await Promise.all([
        fetchJson(`/getRealCourse.json?courseId=${courseId}`).catch(() => ({})),
        getOrFetchShape(courseId, variantId),
        fetchJson(`/getTheoreticalCourseDetails.json?variantId=${variantId}`).catch(() => ({})),
    ]);

    const realCourse = realCourseRaw.realCourse || realCourseRaw;
    let stoppings = (realCourse.stoppings || []).map((s) => ({
        symbol: s.stopPointSymbol,
        name: s.stopPointName,
        order: s.orderInCourse,
        scheduledTime: s.scheduledDepartureSec,
        estimatedTime: s.estimatedDeparture,
    }));

    if (stoppings.length === 0 && theoretical.stopPoints) {
        stoppings = theoretical.stopPoints.map((sp, idx) => ({
            symbol: sp.symbol,
            name: sp.name,
            order: sp.orderInVariant !== undefined ? sp.orderInVariant : idx,
            scheduledTime: null,
            estimatedTime: null,
        }));
    }

    const allStops = await getStops();
    const stopBySymbol = new Map();
    for (const s of allStops) stopBySymbol.set(s.symbol, s);

    const enrichedStoppings = stoppings.map((st) => {
        const stop = stopBySymbol.get(st.symbol);
        return {
            ...st,
            lat: st.lat ?? stop?.latitude,
            lon: st.lon ?? stop?.longitude,
            name: st.name ?? stop?.name,
        };
    });

    enrichedStoppings.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    console.log(`[getCourseFull] courseId=${courseId} variantId=${variantId}: shape=${shape.length}pkt, stoppings=${enrichedStoppings.length}`);

    return {
        courseId,
        variantId,
        lineName: realCourse.lineName,
        shape,
        stoppings: enrichedStoppings,
    };
}

module.exports = { getCourseFull, getOrFetchShape, fetchShapeForCourse, saveShapeIfBetter };