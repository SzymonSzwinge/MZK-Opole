// ========== POPUP PRZYSTANKU ==========
import { allLines } from "../state.js";

export function buildStopPopup(stop, departures, scheduleHtml = null) {
    const tripButtons = `
        <div class="popup-trip-buttons">
            <button class="popup-trip-btn from-btn" 
                data-action="set-trip-from"
                data-symbol="${stop.symbol}"
                data-name="${stop.name}">🟢 Jedź stąd</button>
            <button class="popup-trip-btn to-btn"
                data-action="set-trip-to"
                data-symbol="${stop.symbol}"
                data-name="${stop.name}">🔴 Jedź tutaj</button>
        </div>
    `;

    let depHtml;
    if (departures === null) {
        depHtml = `
            <div class="dep-section-header">🕐 Najbliższe odjazdy</div>
            <div class="dep-loading">⏳ Ładowanie odjazdów...</div>
        `;
    } else if (departures.length === 0) {
        depHtml = `
            <div class="dep-section-header">🕐 Najbliższe odjazdy</div>
            <div class="dep-loading">Brak odjazdów</div>
        `;
    } else {
        const count = departures.length;
        depHtml = `<div class="dep-section-header">🕐 Najbliższe odjazdy <span class="dep-count">${count}</span></div>`;
        depHtml += `<ul class="dep-list">`;

        const now = Date.now();

        for (const d of departures) {
            const isNight = allLines.get(d.line)?.nightLine;
            const lineClass = isNight ? "dep-line night" : "dep-line";

            const depDate = new Date(d.realTime);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const depDay = new Date(d.realTime);
            depDay.setHours(0, 0, 0, 0);
            const dayDiff = Math.round((depDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

            const minutesAway = Math.round((d.realTime - now) / 60000);
            const hoursAway = Math.floor(minutesAway / 60);

            let minutesText, minutesClass;
            if (minutesAway <= 0) {
                minutesText = "teraz";
                minutesClass = "dep-minutes now";
            } else if (minutesAway < 60) {
                minutesText = `${minutesAway} min`;
                minutesClass = minutesAway <= 3 ? "dep-minutes soon" : "dep-minutes";
            } else if (hoursAway < 24) {
                minutesText = `${hoursAway}h ${minutesAway % 60}min`;
                minutesClass = "dep-minutes far";
            } else {
                minutesText = `${Math.floor(hoursAway / 24)}d`;
                minutesClass = "dep-minutes far";
            }

            let dayLabel = "";
            if (dayDiff === 1) dayLabel = `<span class="dep-day-label tomorrow">jutro</span>`;
            else if (dayDiff === 2) dayLabel = `<span class="dep-day-label">pojutrze</span>`;
            else if (dayDiff > 2) {
                const dayName = depDate.toLocaleDateString("pl-PL", { weekday: "short" });
                dayLabel = `<span class="dep-day-label">${dayName}</span>`;
            }

            const clockTime = depDate.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });

            let delayTag = "";
            if (d.isRealtime) {
                const delayMin = Math.round(d.delaySec / 60);
                if (delayMin > 0) delayTag = `<div class="dep-delay-tag late">+${delayMin} min</div>`;
                else if (delayMin < 0) delayTag = `<div class="dep-delay-tag early">${delayMin} min</div>`;
            } else {
                delayTag = `<div class="dep-delay-tag schedule">📅 z rozkładu</div>`;
            }

            const stoppedTag = d.onStopPoint ? `<span class="dep-stopped">●</span>` : "";
            const vehicleInfo = d.vehicleId ? `#${d.vehicleId}` : "rozkład";

            depHtml += `
                <li class="dep-item"
                    data-action="show-dep-route"
                    data-course-id="${d.courseId}"
                    data-variant-id="${d.variantId}"
                    data-order="${d.orderInCourse || 0}"
                    data-vehicle-id="${d.vehicleId || ''}">
                    <span class="${lineClass}">${d.line}</span>
                    <div class="dep-info">
                        <div class="dep-direction">→ ${d.direction}${stoppedTag}</div>
                        <div class="dep-vehicle">${vehicleInfo}</div>
                    </div>
                    <div class="dep-time-block">
                        <div class="${minutesClass}">${minutesText}</div>
                        <div class="dep-clock">${dayLabel}${clockTime}</div>
                        ${delayTag}
                    </div>
                </li>
            `;
        }
        depHtml += `</ul>`;
    }

    const scheduleBtn = scheduleHtml
        ? ""
        : `<button class="popup-schedule-btn"
                data-action="toggle-schedule"
                data-symbol="${stop.symbol}"
                data-name="${stop.name}">📅 Pełny rozkład jazdy</button>`;

    const mainContent = `
        <div class="popup-main-content">
            <b>${stop.name}</b>
            ${stop.street ? `<br><small style="color:#888">ul. ${stop.street}</small>` : ""}
            <br><small style="color:#888">Słupek: ${stop.symbol || "?"}</small>
            ${stop.onRequest ? "<br><em>🛑 Na żądanie</em>" : ""}
            ${tripButtons}
            ${depHtml}
            ${scheduleBtn}
        </div>
    `;

    if (scheduleHtml) {
        return `<div class="popup-with-schedule">${mainContent}${scheduleHtml}</div>`;
    }
    return mainContent;
}