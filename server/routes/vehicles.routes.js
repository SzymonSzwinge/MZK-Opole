const express = require("express");
const api = require("../api");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

router.get("/vehicles", asyncHandler(async (req, res) => {
    res.json(await api.getEnrichedVehicles());
}));

module.exports = router;