const express = require("express");
const cors = require("cors");
const apiRoutes = require("./server/routes");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static("public"));

// Wszystkie endpointy /api/* obsługiwane przez routery
app.use("/api", apiRoutes);

app.listen(PORT, () => {
    console.log(`MZK Opole - serwer działa na http://localhost:${PORT}`);
});