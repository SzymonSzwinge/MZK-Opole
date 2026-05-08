const express = require("express");
const vehiclesRoutes = require("./vehicles.routes");
const stopsRoutes = require("./stops.routes");
const linesRoutes = require("./lines.routes");
const coursesRoutes = require("./courses.routes");
const planRoutes = require("./plan.routes");
const statsRoutes = require("./stats.routes");

const router = express.Router();

router.use(vehiclesRoutes);
router.use(stopsRoutes);
router.use(linesRoutes);
router.use(coursesRoutes);
router.use(planRoutes);
router.use(statsRoutes);

module.exports = router;