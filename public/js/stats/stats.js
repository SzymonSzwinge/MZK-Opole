// ========== PANEL STATYSTYK ==========
import { fetchApi } from "../api/client.js";
import { onPanelClose } from "../ui/panels.js";
import { renderPunctualityDonut, destroyChart } from "./donutChart.js";
import { showVehicleRoute } from "../vehicles/route.js";
import { map } from "../map/mapInit.js";
import * as state from "../state.js";

const REFRESH_MS = 15000;
let refreshTimer = null;
let isPanelOpen = false;

export function initStats() {
    const railBtn = document.querySelector('.rail-btn[data-panel="stats"]');
    if (!railBtn) return;

    railBtn.addEventListener("click", () => {
        if (railBtn.classList.contains("disabled")) return;
        setTimeout(() => {
            const panel = document.querySelector('.panel-content[data-panel="stats"]');
            if (panel?.classList.contains("active")) {
                openStats();
            }
        }, 50);
    });

    onPanelClose("stats", () => {
        closeStats();
    });

    // ✅ Event delegation zamiast window._showStatVehicle
    document.addEventListener("click", (e) => {
        const card = e.target.closest('[data-action="show-stat-vehicle"]');
        if (!card) return;

        const courseId = card.dataset.courseId;
        const variantId = card.dataset.variantId;
        const vehicleId = card.dataset.vehicleId || "";
        const lat = card.dataset.lat ? parseFloat(card.dataset.lat) : null;
        const lon = card.dataset.lon ? parseFloat(card.dataset.lon) : null;

        if (!courseId || !variantId) return;
        if (lat && lon) map.setView([lat, lon], 15);

        // ✅ Znajdź żywy pojazd na tym kursie i pobierz jego orderInCourse
        let orderInCourse = 0;
        for (const id in state.vehicles) {
            if (String(state.vehicles[id].data.courseId) === String(courseId)) {
                orderInCourse = state.vehicles[id].data.orderInCourse ?? 0;
                break;
            }
        }

        showVehicleRoute({ courseId, variantId, vehicleId, orderInCourse });
    });
}

function openStats() {
    if (isPanelOpen) return;
    isPanelOpen = true;
    loadStats();
    refreshTimer = setInterval(loadStats, REFRESH_MS);
}

function closeStats() {
    isPanelOpen = false;
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
    destroyChart();
}

async function loadStats() {
    try {
        const data = await fetchApi("/api/stats");
        renderStats(data);
    } catch (err) {
        const container = document.getElementById("stats-content");
        if (container) {
            container.innerHTML = `<div class="stats-error">❌ Błąd ładowania statystyk</div>`;
        }
        console.error("Błąd statystyk:", err);
    }
}

function formatDelay(sec) {
    if (sec === 0) return "0s";
    const sign = sec > 0 ? "+" : "−";
    const abs = Math.abs(sec);
    const min = Math.floor(abs / 60);
    const s = abs % 60;
    if (min === 0) return `${sign}${s}s`;
    if (s === 0) return `${sign}${min} min`;
    return `${sign}${min} min ${s}s`;
}

function escapeHtml(str) {
    return (str || "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

function renderStats(d) {
    const container = document.getElementById("stats-content");
    if (!container) return;

    const p = d.punctuality;
    const total = p.total || 1;
    const pctOnTime = ((p.onTime / total) * 100).toFixed(0);
    const pctDelayed = ((p.delayed / total) * 100).toFixed(0);
    const pctEarly = ((p.early / total) * 100).toFixed(0);

    let avgClass = "stat-value-neutral";
    if (p.avgDelaySec > 120) avgClass = "stat-value-bad";
    else if (p.avgDelaySec > 30) avgClass = "stat-value-warn";
    else if (p.avgDelaySec < -60) avgClass = "stat-value-warn";
    else avgClass = "stat-value-good";

    const updatedAt = new Date(d.timestamp).toLocaleTimeString("pl-PL", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });

    // ===== Najbardziej opóźniona linia =====
    let mostDelayedLineHtml;
    if (d.mostDelayedLine && d.mostDelayedLine.avgDelaySec > 60) {
        const ml = d.mostDelayedLine;
        const lineClass = ml.nightLine ? "stat-line-badge night" : "stat-line-badge";
        mostDelayedLineHtml = `
            <div class="stat-card">
                <div class="stat-section-title">⚠️ Najbardziej opóźniona linia</div>
                <div class="stat-most-delayed">
                    <span class="${lineClass}">${ml.line}</span>
                    <div class="stat-most-delayed-info">
                        <div class="stat-most-delayed-value">${formatDelay(ml.avgDelaySec)}</div>
                        <div class="stat-most-delayed-meta">średnio na ${ml.vehicleCount} pojazdach</div>
                    </div>
                </div>
                <div class="stat-source">Liczone dla linii z min. 2 aktywnymi pojazdami</div>
            </div>
        `;
    } else {
        mostDelayedLineHtml = `
            <div class="stat-card">
                <div class="stat-section-title">✅ Najbardziej opóźniona linia</div>
                <div class="stat-most-delayed-empty">
                    Wszystkie linie kursują punktualnie (do +1 min)
                </div>
            </div>
        `;
    }

    // ===== Najbardziej opóźniony pojazd =====
    let mostDelayedVehicleHtml;
    if (d.mostDelayedVehicle) {
        const mv = d.mostDelayedVehicle;
        const lineClass = mv.nightLine ? "stat-line-badge night" : "stat-line-badge";
        const safeDir = escapeHtml(mv.direction);
        const clickable = mv.courseId && mv.variantId;

        // ✅ data-action zamiast onclick
        mostDelayedVehicleHtml = `
            <div class="stat-card stat-vehicle-card ${clickable ? "clickable" : ""}"
                ${clickable ? `
                    data-action="show-stat-vehicle"
                    data-course-id="${mv.courseId}"
                    data-variant-id="${mv.variantId}"
                    data-vehicle-id="${mv.vehicleId || ''}"
                    data-lat="${mv.lat || ''}"
                    data-lon="${mv.lon || ''}"
                ` : ""}>
                <div class="stat-section-title">🐢 Najbardziej opóźniony pojazd</div>
                <div class="stat-most-delayed">
                    <span class="${lineClass}">${mv.line}</span>
                    <div class="stat-most-delayed-info">
                        <div class="stat-most-delayed-value">${formatDelay(mv.delaySec)}</div>
                        <div class="stat-vehicle-meta">
                            <span class="stat-vehicle-id">#${mv.vehicleId}</span>
                            <span class="stat-vehicle-dir">→ ${safeDir}</span>
                        </div>
                    </div>
                </div>
                ${clickable ? `<div class="stat-source">👆 Kliknij, aby zobaczyć trasę na mapie</div>` : ""}
            </div>
        `;
    } else {
        mostDelayedVehicleHtml = `
            <div class="stat-card">
                <div class="stat-section-title">✅ Najbardziej opóźniony pojazd</div>
                <div class="stat-most-delayed-empty">
                    Żaden pojazd nie jest opóźniony powyżej 1 min
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-section-title">🚌 Pojazdy na trasach</div>
            <div class="stat-big-number">${d.vehicles.total}</div>
            <div class="stat-breakdown">
                <span class="stat-pill day">☀️ Dzienne: <b>${d.vehicles.day}</b></span>
                <span class="stat-pill night">🌙 Nocne: <b>${d.vehicles.night}</b></span>
            </div>
            <div class="stat-source">Dane na żywo z systemu MZK</div>
        </div>

        <div class="stat-card">
            <div class="stat-section-title">⏱️ Średnie opóźnienie w mieście</div>
            <div class="stat-big-number ${avgClass}">${formatDelay(p.avgDelaySec)}</div>
            <div class="stat-source">Średnia ze wszystkich aktywnych pojazdów</div>
        </div>

        <div class="stat-card">
            <div class="stat-section-title">🎯 Punktualność pojazdów</div>
            <div class="stat-donut-wrap">
                <canvas id="punctuality-donut"></canvas>
            </div>
            <div class="stat-punctuality-grid">
                <div class="stat-punc-item">
                    <div class="stat-punc-dot" style="background:#388e3c"></div>
                    <div class="stat-punc-label">Punktualne</div>
                    <div class="stat-punc-value">${p.onTime} (${pctOnTime}%)</div>
                </div>
                <div class="stat-punc-item">
                    <div class="stat-punc-dot" style="background:#d32f2f"></div>
                    <div class="stat-punc-label">Opóźnione</div>
                    <div class="stat-punc-value">${p.delayed} (${pctDelayed}%)</div>
                </div>
                <div class="stat-punc-item">
                    <div class="stat-punc-dot" style="background:#f57c00"></div>
                    <div class="stat-punc-label">Przed czasem</div>
                    <div class="stat-punc-value">${p.early} (${pctEarly}%)</div>
                </div>
            </div>
            <div class="stat-source">Punktualne = odchylenie ±1 min od rozkładu</div>
        </div>

        ${mostDelayedLineHtml}
        ${mostDelayedVehicleHtml}

        <div class="stat-card">
            <div class="stat-section-title">🗺️ Sieć MZK Opole</div>
            <div class="stat-grid-2">
                <div class="stat-mini">
                    <div class="stat-mini-value">${d.stops.total}</div>
                    <div class="stat-mini-label">Przystanków</div>
                    <div class="stat-mini-meta">w tym ${d.stops.onRequest} na żądanie</div>
                </div>
                <div class="stat-mini">
                    <div class="stat-mini-value">${d.lines.total}</div>
                    <div class="stat-mini-label">Linii</div>
                    <div class="stat-mini-meta">${d.lines.day} dziennych, ${d.lines.night} nocnych</div>
                </div>
            </div>
        </div>

        <div class="stats-footer">
            Dane: dip.mzkopole.pl • Aktualizacja co 15s • Ostatnia: ${updatedAt}
        </div>
    `;

    const canvas = document.getElementById("punctuality-donut");
    if (canvas) {
        renderPunctualityDonut(canvas, p);
    }
}