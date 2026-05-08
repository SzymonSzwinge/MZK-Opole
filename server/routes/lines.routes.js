const express = require("express");
const api = require("../api");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

router.get("/lines", asyncHandler(async (req, res) => {
    res.json(await api.getLines());
}));

router.get("/line/:lineName/stops", asyncHandler(async (req, res) => {
    res.json(await api.getStopsForLine(req.params.lineName));
}));

module.exports = router;