// ========== WYSZUKIWANIE POŁĄCZEŃ ==========
import * as state from "../state.js";
import { fetchApi } from "../api/client.js";
import { COUNTDOWN_REFRESH_MS } from "../config.js";
import { showVehicleRoute } from "../vehicles/route.js";

export async function searchTrip() {
    if (!state.tripFrom || !state.tripTo) return;

    const resultsDiv = document.getElementById("trip-results");
    resultsDiv.innerHTML = `<div class="trip-loading">⏳ Szukam połączeń...</div>`;

    try {
        const results = await fetchApi(
            `/api/plan?from=${encodeURIComponent(state.tripFrom.symbol)}&to=${encodeURIComponent(state.tripTo.symbol)}`
        );
        state.setLastTripResults(results);
        renderTripResults();
    } catch {
        resultsDiv.innerHTML = `<div class="trip-no-results">❌ Błąd wyszukiwania</div>`;
    }
}

export function renderTripResults() {
    const resultsDiv = document.getElementById("trip-results");
    let visible = state.lastTripResults;
    if (state.hideNightInResults) visible = visible.filter((r) => !r.nightLine);

    if (visible.length === 0) {
        resultsDiv.innerHTML = `
            ${renderResultsFilter()}
            <div class="trip-no-results">😕 Brak bezpośredniego połączenia.<br><small>Spróbuj inny przystanek w pobliżu.</small></div>
        `;
        attachFilterListeners();
        return;
    }

    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const html = visible.map((r) => {
        const depDate = new Date(r.departureTime);
        const arrDate = new Date(r.arrivalTime);
        const depTime = depDate.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
        const arrTime = arrDate.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });

        const depDay = new Date(r.departureTime);
        depDay.setHours(0, 0, 0, 0);
        const dayDiff = Math.round((depDay.getTime() - todayMs) / (24 * 60 * 60 * 1000));

        let dayLabel = "";
        if (dayDiff === 1) dayLabel = `<span class="trip-day-label tomorrow">JUTRO</span>`;
        else if (dayDiff === 2) dayLabel = `<span class="trip-day-label">POJUTRZE</span>`;
        else if (dayDiff > 2) {
            const dayName = depDate.toLocaleDateString("pl-PL", { weekday: "long" });
            dayLabel = `<span class="trip-day-label">${dayName.toUpperCase()}</span>`;
        }

        const minToDep = Math.round((r.departureTime - now) / 60000);
        const hoursToDep = Math.floor(minToDep / 60);
        let countdownTxt;
        let countdownClass = "trip-countdown";

        if (minToDep <= 0) {
            countdownTxt = "ODJEŻDŻA TERAZ";
            countdownClass += " urgent";
        } else if (minToDep <= 2) {
            countdownTxt = `za ${minToDep} min`;
            countdownClass += " urgent";
        } else if (minToDep < 60) {
            countdownTxt = `za ${minToDep} min`;
        } else if (hoursToDep < 24) {
            countdownTxt = `za ${hoursToDep}h ${minToDep % 60}min`;
            countdownClass += " far";
        } else {
            const daysToDep = Math.floor(hoursToDep / 24);
            countdownTxt = `za ${daysToDep}d ${hoursToDep % 24}h`;
            countdownClass += " far";
        }

        let statusHtml;
        if (r.vehicleStatus === "in_transit") {
            const stops = r.stopsAway;
            const stopsTxt = stops === 1 ? "przystanek" : (stops < 5 ? "przystanki" : "przystanków");
            statusHtml = `<div class="trip-result-status status-live">🚌 W drodze • ${stops} ${stopsTxt} przed Tobą</div>`;
        } else if (r.vehicleStatus === "passed_start") {
            statusHtml = `<div class="trip-result-status status-passed">⚠️ Pojazd minął już Twój przystanek</div>`;
        } else if (r.vehicleStatus === "scheduled") {
            statusHtml = `<div class="trip-result-status status-scheduled">📅 Z rozkładu jazdy</div>`;
        } else {
            statusHtml = `<div class="trip-result-status status-waiting">⏳ Pojazd jeszcze nie wyruszył</div>`;
        }

        const lineClass = r.nightLine ? "trip-result-line night" : "trip-result-line";
        const vehicleInfo = r.vehicleId ? `Pojazd #${r.vehicleId}` : "rozkładowo";

        // ✅ data-index zamiast onclick z indeksem
        const resultIndex = state.lastTripResults.indexOf(r);

        return `
            <div class="trip-result"
                data-action="show-trip-result"
                data-index="${resultIndex}">
                <div class="trip-result-header">
                    <span class="${lineClass}">${r.line}</span>
                    <span class="trip-result-direction">→ ${r.direction}</span>
                    <span class="trip-result-duration" title="Czas podróży: ${r.travelMinutes} min (${r.stops} przystanków)">
                        ⏱️ ${r.travelMinutes} min
                    </span>
                </div>
                <div class="trip-result-times">
                    ${dayLabel}
                    <span class="trip-result-dep">🟢 ${depTime}</span>
                    <span class="trip-result-arrow">→</span>
                    <span class="trip-result-arr">🔴 ${arrTime}</span>
                </div>
                <div class="${countdownClass}">${countdownTxt}</div>
                ${statusHtml}
                <div class="trip-result-meta">${r.stops} przystanków • ${vehicleInfo}</div>
            </div>
        `;
    }).join("");

    resultsDiv.innerHTML = renderResultsFilter() + html;
    attachFilterListeners();

    if (state.countdownTimer) clearInterval(state.countdownTimer);
    state.setCountdownTimer(setInterval(() => {
        if (state.lastTripResults.length === 0) {
            clearInterval(state.countdownTimer);
            state.setCountdownTimer(null);
            return;
        }
        renderTripResults();
    }, COUNTDOWN_REFRESH_MS));
}

function renderResultsFilter() {
    const hasNight = state.lastTripResults.some((r) => r.nightLine);
    if (!hasNight) return "";
    return `
        <div class="trip-results-filter">
            <label>
                <input type="checkbox" id="hide-night-results" ${state.hideNightInResults ? "checked" : ""}>
                Ukryj nocne
            </label>
        </div>
    `;
}

function attachFilterListeners() {
    const cb = document.getElementById("hide-night-results");
    if (cb) {
        cb.addEventListener("change", (e) => {
            state.setHideNightInResults(e.target.checked);
            renderTripResults();
        });
    }
}

// ✅ Event delegation dla wyników podróży
export function registerSearchGlobals() {
    document.addEventListener("click", (e) => {
        const el = e.target.closest('[data-action="show-trip-result"]');
        if (!el) return;

        const index = parseInt(el.dataset.index);
        const r = state.lastTripResults[index];
        if (!r) return;

        showVehicleRoute(
            { courseId: r.courseId, variantId: r.variantId, orderInCourse: r.fromOrder, vehicleId: r.vehicleId },
            state.tripFrom?.symbol,
            state.tripTo?.symbol
        );
    });
}