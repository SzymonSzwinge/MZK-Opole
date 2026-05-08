const express = require("express");
const api = require("../api");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

router.get("/stats", asyncHandler(async (req, res) => {
    res.json(await api.getStats());
}));

module.exports = router;