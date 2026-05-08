const express = require("express");
const cors = require("cors");
const api = require("./api");

const app = express();
app.use(cors());
app.use(express.static("public"));

app.get("/api/vehicles", async (req, res) => {
    try {
        res.json(await api.getEnrichedVehicles());
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/stops", async (req, res) => {
    try {
        res.json(await api.getSimpleStops());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/lines", async (req, res) => {
    try {
        res.json(await api.getLines());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/course/:courseId", async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const variantId = req.query.variantId;
        if (!variantId) return res.status(400).json({ error: "Wymagany variantId" });
        res.json(await api.getCourseFull(courseId, variantId));
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/stop/:symbol/departures", async (req, res) => {
    try {
        res.json(await api.getStopDepartures(req.params.symbol, 5));
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/plan", async (req, res) => {
    try {
        const { from, to } = req.query;
        if (!from || !to) return res.status(400).json({ error: "Wymagane: from, to (symbole przystanków)" });
        const results = await api.planTrip(from, to);
        res.json(results);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});
app.get("/api/line/:lineName/stops", async (req, res) => {
    try {
        const symbols = await api.getStopsForLine(req.params.lineName);
        res.json(symbols);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.listen(3000, () => {
    console.log("MZK Opole - serwer działa na http://localhost:3000");
});
app.get("/api/stop/:symbol/schedule", async (req, res) => {
    try {
        const date = req.query.date ? parseInt(req.query.date) : null;
        const data = await api.getStopSchedule(req.params.symbol, date);
        res.json(data);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});
app.get("/api/stop/:symbol/reachable", async (req, res) => {
    try {
        const symbols = await api.getReachableStops(req.params.symbol);
        res.json(symbols);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});