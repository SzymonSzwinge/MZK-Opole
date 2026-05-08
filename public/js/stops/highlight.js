// ========== WYRÓŻNIENIE PRZYSTANKÓW LINII ==========
import { stopMarkers, lineStopsCache } from "../state.js";
import { createStopIcon } from "../map/icons.js";
import { fetchApi } from "../api/client.js";

export async function highlightStopsForLine(lineName) {
    if (!lineName) {
        for (const marker of stopMarkers.values()) {
            marker.setIcon(createStopIcon("normal"));
        }
        return;
    }

    let lineSymbols = lineStopsCache.get(lineName);
    if (!lineSymbols) {
        try {
            lineSymbols = await fetchApi(`/api/line/${encodeURIComponent(lineName)}/stops`);
            lineStopsCache.set(lineName, lineSymbols);
        } catch {
            return;
        }
    }

    const lineSet = new Set(lineSymbols);
    for (const marker of stopMarkers.values()) {
        const symbol = marker.stopData?.symbol;
        if (lineSet.has(symbol)) {
            marker.setIcon(createStopIcon("line-active"));
        } else {
            marker.setIcon(createStopIcon("dimmed"));
        }
    }
}