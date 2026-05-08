// ========== ENTRY POINT ==========
import { map } from "./map/mapInit.js";
import { REFRESH_MS } from "./config.js";
import { allLines } from "./state.js";
import { fetchApi } from "./api/client.js";
import { loadStops } from "./stops/loader.js";
import { loadVehicles, animate } from "./vehicles/loader.js";
import { clearVehicleRoute } from "./vehicles/route.js";
import { initTheme } from "./ui/theme.js";
import { initPanels } from "./ui/panels.js";
import { initLinesPanel } from "./ui/lines.js";
import { initFilterNotice } from "./ui/notices.js";
import { initGeolocation } from "./ui/geolocation.js";
import { initTripPlanner } from "./trip/planner.js";
import { initStats } from "./stats/stats.js";

async function loadLines() {
    try {
        const lines = await fetchApi("/api/lines");
        for (const l of lines) allLines.set(l.name, l);
    } catch (err) {
        console.error("Błąd linii:", err);
    }
}

map.on("click", () => clearVehicleRoute());

initTheme();
initPanels();
initLinesPanel();
initFilterNotice();
initGeolocation();
initTripPlanner();
initStats();

(async () => {
    await loadLines();
    await loadStops();
    await loadVehicles();
    setInterval(loadVehicles, REFRESH_MS);
    animate();
})();