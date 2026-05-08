// ========== PANEL STATYSTYK ==========
import { fetchApi } from "../api/client.js";
import { onPanelClose } from "../ui/panels.js";
import { renderPunctualityDonut, destroyChart } from "./donutChart.js";

const REFRESH_MS = 15000; // odśwież co 15 sek
let refreshTimer = null;
let isPanelOpen = false;

export function initStats() {
    const railBtn = document.querySelector('.rail-btn[data-panel="stats"]');
    if (!railBtn) return;

    // Przy otwarciu panelu
    railBtn.addEventListener("click", () => {
        if (railBtn.classList.contains("disabled")) return;
        // Lekka zwłoka żeby panel zdążył się otworzyć
        setTimeout(() => {
            const panel = document.querySelector('.panel-content[data-panel="stats"]');
            if (panel?.classList.contains("active")) {
                openStats();
            }
        }, 50);
    });

    // Przy zamknięciu panelu
    onPanelClose("stats", () => {
        closeStats();
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

function renderStats(d) {
    const container = document.getElementById("stats-content");
    if (!container) return;

    const p = d.punctuality;
    const total = p.total || 1;
    const pctOnTime = ((p.onTime / total) * 100).toFixed(0);
    const pctDelayed = ((p.delayed / total) * 100).toFixed(0);
    const pctEarly = ((p.early / total) * 100).toFixed(0);

    // Klasa dla średniego opóźnienia
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
    let mostDelayedHtml;
    if (d.mostDelayedLine && d.mostDelayedLine.avgDelaySec > 60) {
        const ml = d.mostDelayedLine;
        const lineClass = ml.nightLine ? "stat-line-badge night" : "stat-line-badge";
        mostDelayedHtml = `
            <div class="stat-card">
                <div class="stat-section-title">⚠️ Najbardziej opóźniona linia</div>
                <div class="stat-most-delayed">
                    <span class="${lineClass}">${ml.line}</span>
                    <div class="stat-most-delayed-info">
                        <div class="stat-most-delayed-value">${formatDelay(ml.avgDelaySec)}</div>
                        <div class="stat-most-delayed-meta">średnio na ${ml.vehicleCount} pojazdach</div>
                    </div>
                </div>
            </div>
        `;
    } else {
        mostDelayedHtml = `
            <div class="stat-card">
                <div class="stat-section-title">✅ Najbardziej opóźniona linia</div>
                <div class="stat-most-delayed-empty">
                    Wszystkie linie kursują punktualnie (do +1 min)
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <!-- Sekcja: Pojazdy -->
        <div class="stat-card">
            <div class="stat-section-title">🚌 Pojazdy na trasach</div>
            <div class="stat-big-number">${d.vehicles.total}</div>
            <div class="stat-breakdown">
                <span class="stat-pill day">☀️ Dzienne: <b>${d.vehicles.day}</b></span>
                <span class="stat-pill night">🌙 Nocne: <b>${d.vehicles.night}</b></span>
            </div>
            <div class="stat-source">Dane na żywo z systemu MZK</div>
        </div>

        <!-- Sekcja: Średnie opóźnienie -->
        <div class="stat-card">
            <div class="stat-section-title">⏱️ Średnie opóźnienie w mieście</div>
            <div class="stat-big-number ${avgClass}">${formatDelay(p.avgDelaySec)}</div>
            <div class="stat-source">Średnia ze wszystkich aktywnych pojazdów</div>
        </div>

        <!-- Sekcja: Punktualność (donut) -->
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

        <!-- Sekcja: Najbardziej opóźniona linia -->
        ${mostDelayedHtml}

        <!-- Sekcja: Sieć -->
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

    // Render donut po wstawieniu canvas do DOM
    const canvas = document.getElementById("punctuality-donut");
    if (canvas) {
        renderPunctualityDonut(canvas, p);
    }
}