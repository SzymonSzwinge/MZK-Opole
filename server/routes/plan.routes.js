const express = require("express");
const api = require("../api");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

router.get("/plan", asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    if (!from || !to) {
        return res.status(400).json({ error: "Wymagane: from, to (symbole przystanków)" });
    }
    const results = await api.planTrip(from, to);
    res.json(results);
}));

module.exports = router;