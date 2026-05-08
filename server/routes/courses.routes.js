const express = require("express");
const api = require("../api");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

router.get("/course/:courseId", asyncHandler(async (req, res) => {
    const courseId = req.params.courseId;
    const variantId = req.query.variantId;
    if (!variantId) {
        return res.status(400).json({ error: "Wymagany variantId" });
    }
    res.json(await api.getCourseFull(courseId, variantId));
}));

module.exports = router;