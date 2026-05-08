// Centralny punkt wejścia do API.
// Dzięki temu w server.js można robić: const api = require("./api");
// I używać api.getLines(), api.planTrip(...) jak wcześniej.

const { getLines, getStopsForLine } = require("./lines");
const { getSimpleStops, getStopSchedule } = require("./stops");
const { getEnrichedVehicles } = require("./vehicles");
const { getCourseFull } = require("./courses");
const { getStopDepartures } = require("./departures");
const { planTrip } = require("./planner");
const { getReachableStops, getReachableToStop } = require("./reachability");

module.exports = {
    getLines,
    getStopsForLine,
    getSimpleStops,
    getStopSchedule,
    getEnrichedVehicles,
    getCourseFull,
    getStopDepartures,
    planTrip,
    getReachableStops,
    getReachableToStop,
};