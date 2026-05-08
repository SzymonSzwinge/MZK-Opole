const { fetchJson } = require("./client");
const { courseShapeCache, COURSE_SHAPE_TTL } = require("./cache");
const { getStops } = require("./stops");

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

module.exports = { getCourseFull, getOrFetchShape };