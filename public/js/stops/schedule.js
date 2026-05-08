// ========== ROZKŁAD JAZDY ==========
import { allLines, openSchedules, scheduleSelectedDate, stopMarkers } from "../state.js";
import { findStopBySymbol } from "../utils.js";
import { fetchApi } from "../api/client.js";
import { buildStopPopup } from "./popup.js";
import { loadStopDepartures } from "./loader.js";

export function registerScheduleGlobals() {
    window._toggleSchedule = async function (symbol, name) {
        const stop = findStopBySymbol(symbol);
        if (!stop) return;
        const marker = stopMarkers.get(stop.id);
        if (!marker) return;

        const isOpen = openSchedules.get(symbol);
        if (isOpen) {
            openSchedules.set(symbol, false);
            scheduleSelectedDate.delete(symbol);
            loadStopDepartures(marker, stop);
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        scheduleSelectedDate.set(symbol, today.getTime());
        openSchedules.set(symbol, true);
        await refreshScheduleView(symbol);
    };

    window._closeSchedule = function (symbol) {
        openSchedules.set(symbol, false);
        scheduleSelectedDate.delete(symbol);
        const stop = findStopBySymbol(symbol);
        if (!stop) return;
        const marker = stopMarkers.get(stop.id);
        if (!marker) return;
        loadStopDepartures(marker, stop);
    };

    window._changeScheduleDate = async function (symbol, dayOffset) {
        const current = scheduleSelectedDate.get(symbol);
        if (!current) return;
        const newDate = new Date(current);
        newDate.setDate(newDate.getDate() + dayOffset);
        newDate.setHours(0, 0, 0, 0);
        scheduleSelectedDate.set(symbol, newDate.getTime());
        await refreshScheduleView(symbol);
    };

    window._setScheduleToday = async function (symbol) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        scheduleSelectedDate.set(symbol, today.getTime());
        await refreshScheduleView(symbol);
    };
}

async function refreshScheduleView(symbol) {
    const stop = findStopBySymbol(symbol);
    if (!stop) return;
    const marker = stopMarkers.get(stop.id);
    if (!marker) return;

    const dateMs = scheduleSelectedDate.get(symbol);
    const loadingHtml = renderScheduleSkeleton(symbol, dateMs);

    try {
        const departures = await fetchApi(`/api/stop/${encodeURIComponent(symbol)}/departures`);
        marker.setPopupContent(buildStopPopup(stop, departures, loadingHtml));

        const schedule = await fetchApi(`/api/stop/${encodeURIComponent(symbol)}/schedule?date=${dateMs}`);
        const scheduleHtml = renderSchedulePanel(schedule, symbol, dateMs);
        marker.setPopupContent(buildStopPopup(stop, departures, scheduleHtml));
    } catch (err) {
        console.error("Błąd ładowania rozkładu:", err);
    }
}

function renderScheduleSkeleton(symbol, dateMs) {
    return `
        <div class="popup-schedule-panel">
            ${renderScheduleHeader(symbol, dateMs)}
            <div class="popup-schedule-loading">⏳ Ładowanie rozkładu...</div>
        </div>
    `;
}

function renderScheduleHeader(symbol, dateMs) {
    let validDateMs = dateMs;
    if (!validDateMs || isNaN(validDateMs)) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        validDateMs = today.getTime();
        scheduleSelectedDate.set(symbol, validDateMs);
    }

    const date = new Date(validDateMs);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const dateLabel = date.toLocaleDateString("pl-PL", {
        weekday: "long",
        day: "numeric",
        month: "long",
    });

    const isToday = validDateMs === todayMs;
    const diffDays = Math.round((validDateMs - todayMs) / (24 * 60 * 60 * 1000));

    let dayBadge = "";
    if (isToday) {
        dayBadge = `<span class="schedule-day-badge today">DZIŚ</span>`;
    } else if (diffDays === 1) {
        dayBadge = `<span class="schedule-day-badge">JUTRO</span>`;
    } else if (diffDays === -1) {
        dayBadge = `<span class="schedule-day-badge">WCZORAJ</span>`;
    } else if (diffDays > 0) {
        dayBadge = `<span class="schedule-day-badge">+${diffDays} dni</span>`;
    } else {
        dayBadge = `<span class="schedule-day-badge">${diffDays} dni</span>`;
    }

    const resetBtn = isToday
        ? ""
        : `<button class="schedule-reset-btn" onclick="event.stopPropagation(); window._setScheduleToday('${symbol}')" title="Wróć do dzisiejszej daty">↺ Powrót</button>`;

    return `
        <div class="popup-schedule-header">
            <h4>📅 Rozkład jazdy</h4>
            <div class="popup-schedule-actions">
                ${resetBtn}
                <button class="popup-schedule-close" onclick="event.stopPropagation(); window._closeSchedule('${symbol}')" title="Zamknij rozkład">✕</button>
            </div>
        </div>
        <div class="schedule-date-nav">
            <button class="schedule-nav-btn" onclick="event.stopPropagation(); window._changeScheduleDate('${symbol}', -1)" title="Poprzedni dzień">‹</button>
            <div class="schedule-date-label">
                ${dayBadge}
                <div class="schedule-date-main">${dateLabel}</div>
            </div>
            <button class="schedule-nav-btn" onclick="event.stopPropagation(); window._changeScheduleDate('${symbol}', 1)" title="Następny dzień">›</button>
        </div>
    `;
}

export function renderSchedulePanel(schedule, symbol, dateMs) {
    if (!schedule || !schedule.lineSchedules) {
        return `
            <div class="popup-schedule-panel">
                ${renderScheduleHeader(symbol, dateMs)}
                <div class="popup-schedule-empty">Brak danych rozkładu</div>
            </div>
        `;
    }

    const grouped = new Map();

    for (const lineName in schedule.lineSchedules) {
        const lineSch = schedule.lineSchedules[lineName];
        const lineInfo = allLines.get(lineName);
        const isNight = lineInfo?.nightLine || false;

        for (const dep of lineSch.departures || []) {
            if (!dep.visible) continue;

            const direction = dep.optionalDirection || lineSch.destination || "?";
            const key = `${lineName}||${direction}`;

            if (!grouped.has(key)) {
                grouped.set(key, {
                    line: lineName,
                    direction,
                    nightLine: isNight,
                    departures: [],
                });
            }

            let letter = "";
            if (dep.multipleLegends && dep.multipleLegends.length > 0) {
                letter = dep.multipleLegends.map((l) => l.letter).join("");
            }

            grouped.get(key).departures.push({
                sec: dep.scheduledDepartureSec,
                letter,
            });
        }
    }

    if (grouped.size === 0) {
        return `
            <div class="popup-schedule-panel">
                ${renderScheduleHeader(symbol, dateMs)}
                <div class="popup-schedule-empty">😴 Brak odjazdów w tym dniu</div>
            </div>
        `;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = dateMs === today.getTime();

    const now = new Date();
    const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    const sortedGroups = Array.from(grouped.values()).sort((a, b) => {
        const na = parseInt(a.line.replace(/\D/g, "")) || 999;
        const nb = parseInt(b.line.replace(/\D/g, "")) || 999;
        return na - nb || a.line.localeCompare(b.line);
    });

    let nextSec = Infinity;
    if (isToday) {
        for (const g of sortedGroups) {
            for (const d of g.departures) {
                if (d.sec >= nowSec && d.sec < nextSec) nextSec = d.sec;
            }
        }
    }

    const legendMap = new Map();
    for (const lineName in schedule.lineSchedules) {
        const lineSch = schedule.lineSchedules[lineName];
        for (const dep of lineSch.departures || []) {
            if (dep.multipleLegends) {
                for (const l of dep.multipleLegends) {
                    if (l.letter && l.description) {
                        legendMap.set(l.letter, l.description);
                    }
                }
            }
        }
    }

    const groupsHtml = sortedGroups.map((g) => {
        const lineClass = g.nightLine ? "schedule-line-badge night" : "schedule-line-badge";
        const sorted = [...g.departures].sort((a, b) => a.sec - b.sec);

        const byHour = new Map();
        for (const d of sorted) {
            const h = Math.floor(d.sec / 3600) % 24;
            if (!byHour.has(h)) byHour.set(h, []);
            byHour.get(h).push(d);
        }

        const hoursHtml = Array.from(byHour.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([hour, deps]) => {
                const minutesHtml = deps
                    .map((d) => {
                        const m = Math.floor((d.sec % 3600) / 60);
                        const isNext = isToday && d.sec === nextSec;
                        const isPast = isToday && d.sec < nowSec;
                        let cls = "schedule-min";
                        if (isNext) cls += " next";
                        else if (isPast) cls += " past";

                        const letterHtml = d.letter
                            ? `<sup class="schedule-letter">${d.letter}</sup>`
                            : "";
                        return `<span class="${cls}">${String(m).padStart(2, "0")}${letterHtml}</span>`;
                    })
                    .join("");

                const isCurrentHour = isToday && hour === Math.floor(nowSec / 3600);
                const rowClass = isCurrentHour ? "schedule-row current-hour" : "schedule-row";

                return `
                    <div class="${rowClass}">
                        <div class="schedule-hour">${String(hour).padStart(2, "0")}<sup>:</sup></div>
                        <div class="schedule-minutes">${minutesHtml}</div>
                    </div>
                `;
            })
            .join("");

        return `
            <div class="schedule-line-group">
                <div class="schedule-line-header">
                    <span class="${lineClass}">${g.line}</span>
                    <span class="schedule-line-direction">→ ${g.direction}</span>
                </div>
                <div class="schedule-table-wrap">
                    <div class="schedule-table-header">
                        <div class="schedule-th-hour">godz.</div>
                        <div class="schedule-th-min">minuty</div>
                    </div>
                    <div class="schedule-table">${hoursHtml}</div>
                </div>
            </div>
        `;
    }).join("");

    let legendHtml = "";
    if (legendMap.size > 0) {
        const items = Array.from(legendMap.entries())
            .map(([letter, desc]) => `<div class="legend-item"><sup>${letter}</sup> ${desc}</div>`)
            .join("");
        legendHtml = `
            <div class="schedule-legend">
                <div class="schedule-legend-title">Objaśnienia:</div>
                ${items}
            </div>
        `;
    }

    return `
        <div class="popup-schedule-panel">
            ${renderScheduleHeader(symbol, dateMs)}
            ${groupsHtml}
            ${legendHtml}
        </div>
    `;
}