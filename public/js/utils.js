// ========== FUNKCJE POMOCNICZE ==========
import { allStopsData } from "./state.js";

export function escapeAttr(str) {
    return (str || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

export function findStopBySymbol(symbol) {
    return allStopsData.find((s) => s.symbol === symbol);
}