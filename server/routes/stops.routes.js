const express = require("express");
const api = require("../api");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

router.get("/stops", asyncHandler(async (req, res) => {
    res.json(await api.getSimpleStops());
}));

router.get("/stop/:symbol/departures", asyncHandler(async (req, res) => {
    res.json(await api.getStopDepartures(req.params.symbol, 5));
}));

router.get("/stop/:symbol/schedule", asyncHandler(async (req, res) => {
    const date = req.query.date ? parseInt(req.query.date) : null;
    res.json(await api.getStopSchedule(req.params.symbol, date));
}));

router.get("/stop/:symbol/reachable", asyncHandler(async (req, res) => {
    res.json(await api.getReachableStops(req.params.symbol));
}));

router.get("/stop/:symbol/reachable-to", asyncHandler(async (req, res) => {
    res.json(await api.getReachableToStop(req.params.symbol));
}));

module.exports = router;