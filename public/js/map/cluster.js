// ========== KLASTER PRZYSTANKÓW ==========
import { STOPS_VISIBLE_ZOOM } from "../config.js";
import { map } from "./mapInit.js";

export const stopsCluster = L.markerClusterGroup({
    disableClusteringAtZoom: STOPS_VISIBLE_ZOOM,
    spiderfyOnMaxZoom: false,
    showCoverageOnHover: false,
    maxClusterRadius: 60,
});

map.addLayer(stopsCluster);