const { getCached } = require("./cache");

async function getFleet() {
    const data = await getCached("vehicles", "/getVehicles.json");
    return data.vehicles || [];
}

async function getRunningVehicles() {
    const data = await getCached("runningVehicles", "/getRunningVehicles.json");
    return data.vehicles || [];
}

async function getEnrichedVehicles() {
    // Lazy require żeby uniknąć circular dependency (lines.js -> vehicles.js -> lines.js)
    const { getLines } = require("./lines");

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

module.exports = { getFleet, getRunningVehicles, getEnrichedVehicles };