const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const apiRoutes = require("./server/routes");
const { startShapeWarmer } = require("./server/api");

const app = express();
const PORT = 3000;

// ===== RATE LIMITING =====

// Ogólny limit — 120 zapytań na minutę per IP
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Zbyt wiele zapytań, spróbuj za chwilę" },
});

// Kosztowne endpointy — max 15 na minutę
const heavyLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Zbyt wiele zapytań do tego endpointu, odczekaj chwilę" },
});

app.use(cors());
app.use(express.static("public"));

// Najpierw ogólny limit na wszystkie /api
app.use("/api", apiLimiter);

// Dodatkowy limit na kosztowne endpointy
app.use("/api/plan", heavyLimiter);
app.use("/api/stop", heavyLimiter);

app.use("/api", apiRoutes);

app.listen(PORT, () => {
    console.log(`MZK Opole - serwer działa na http://localhost:${PORT}`);
    startShapeWarmer();
});