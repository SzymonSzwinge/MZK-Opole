// ========== INICJALIZACJA MAPY ==========
const map = L.map("map").setView([50.6683, 17.9265], 13);

const tileLayers = {
    light: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
    }),
    dark: L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "© OpenStreetMap © CARTO",
        maxZoom: 19,
    }),
};

let currentTheme = localStorage.getItem("theme") === "dark" ? "dark" : "light";
tileLayers[currentTheme].addTo(map);
if (currentTheme === "dark") document.body.classList.add("dark");

// ========== KONFIGURACJA ==========
const REFRESH_MS = 5000;
const ANIMATION_MS = 5000;
const STOPS_VISIBLE_ZOOM = 14;
const STOP_REFRESH_MS = 15000;
const COUNTDOWN_REFRESH_MS = 30000;
const ROUTE_REFRESH_MS = 10000;

// ========== STAN ==========
const vehicles = {};
const stopMarkers = new Map();
const allLines = new Map();
let allStopsData = [];

let activeLineFilter = null;
let showDay = true;
let showNight = true;
let searchQuery = "";

// trasa
let highlightedRoutePassed = null;
let highlightedRouteRemaining = null;
let highlightedStopMarkers = [];
let highlightedTimeLabels = [];

// markery A/B
let tripFromMarker = null;
let tripToMarker = null;

// marka moja lokalizacja
let userLocationMarker = null;

let activeStopRefreshTimer = null;
let countdownTimer = null;
let routeRefreshTimer = null;
let focusedVehicleId = null;
let lastFocusedRouteArgs = null;

// planowanie
let tripFrom = null;
let tripTo = null;
let hideNightInResults = false;
let lastTripResults = [];
let pickingMode = null; // null | "from" | "to"
let reachableStopsFromOrigin = null;
let isLoadingReachable = false;
let reachableStopsToDestination = null; // Set: z jakich przystanków można dojechać do celu
let isLoadingReverseReachable = false;

// linia → przystanki (cache)
const lineStopsCache = new Map();


// ========== KLASTER PRZYSTANKÓW ==========
const stopsCluster = L.markerClusterGroup({
    disableClusteringAtZoom: STOPS_VISIBLE_ZOOM,
    spiderfyOnMaxZoom: false,
    showCoverageOnHover: false,
    maxClusterRadius: 60,
});
map.addLayer(stopsCluster);

// ========== TRYB CIEMNY ==========
function setTheme(theme) {
    map.removeLayer(tileLayers[currentTheme]);
    currentTheme = theme;
    tileLayers[currentTheme].addTo(map);
    document.body.classList.toggle("dark", theme === "dark");
    document.getElementById("theme-toggle").textContent = theme === "dark" ? "☀️" : "🌙";
    localStorage.setItem("theme", theme);
}

document.getElementById("theme-toggle").addEventListener("click", () => {
    setTheme(currentTheme === "dark" ? "light" : "dark");
});

document.getElementById("theme-toggle").textContent = currentTheme === "dark" ? "☀️" : "🌙";

// ========== IKONY ==========
function createBusIcon(line, lineType, nightLine, delaySec) {
    let bgColor = "#1976d2";
    if (nightLine) bgColor = "#6a1b9a";
    else if (lineType === "TRAM") bgColor = "#c62828";
    else if (lineType === "TROLLEY") bgColor = "#388e3c";

    let labelClass = "bus-label";
    if (nightLine) labelClass += " night";
    if (delaySec > 180) labelClass += " delayed";

    return L.divIcon({
        html: `<div class="bus-marker">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="11" fill="${bgColor}" stroke="white" stroke-width="2"/>
                <path fill="white" d="M8 7h8c.55 0 1 .45 1 1v6c0 .35-.18.65-.45.83V16c0 .28-.22.5-.5.5h-.5c-.28 0-.5-.22-.5-.5v-.5H9v.5c0 .28-.22.5-.5.5H8c-.28 0-.5-.22-.5-.5v-1.17c-.27-.18-.45-.48-.45-.83V8c0-.55.45-1 1-1zm.5 7c.41 0 .75-.34.75-.75s-.34-.75-.75-.75-.75.34-.75.75.34.75.75.75zm7 0c.41 0 .75-.34.75-.75s-.34-.75-.75-.75-.75.34-.75.75.34.75.75.75zM8.5 11h7V8.5h-7V11z"/>
            </svg>
            <div class="${labelClass}">${line}</div>
        </div>`,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
    });
}

function createStopIcon(state = "normal") {
    let bgColor = "#d32f2f";
    let size = 14;
    let opacity = 1;

    if (state === "dimmed") {
        bgColor = "#999";
        size = 11;
        opacity = 0.5;
    } else if (state === "line-active") {
        bgColor = "#ff5722";
        size = 18;
    }

    const html = `
        <div class="stop-marker-svg" style="width:${size}px;height:${size}px;opacity:${opacity};">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="11" fill="white" stroke="${bgColor}" stroke-width="2.5"/>
                <path fill="${bgColor}" d="M9 7.5h6c.55 0 1 .45 1 1V14c0 .3-.13.57-.34.75v.95c0 .22-.18.4-.4.4h-.42c-.22 0-.4-.18-.4-.4V15.4H9.56v.3c0 .22-.18.4-.4.4h-.42c-.22 0-.4-.18-.4-.4v-.95C8.13 14.57 8 14.3 8 14V8.5c0-.55.45-1 1-1zm.4 6.3c.33 0 .6-.27.6-.6s-.27-.6-.6-.6-.6.27-.6.6.27.6.6.6zm5.2 0c.33 0 .6-.27.6-.6s-.27-.6-.6-.6-.6.27-.6.6.27.6.6.6zM9 11h6V8.7H9V11z"/>
            </svg>
        </div>
    `;

    return L.divIcon({
        html,
        className: "stop-icon-wrapper",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
}

function createTripMarker(letter, type) {
    return L.divIcon({
        html: `<div class="trip-marker ${type}">${letter}</div>`,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });
}

function createUserLocationIcon() {
    return L.divIcon({
        html: `<div class="user-location-marker"></div>`,
        className: "",
        iconSize: [18, 18],
        iconAnchor: [9, 9],
    });
}

// ========== POPUP POJAZDU ==========
function buildVehiclePopup(v) {
    let delayHtml;
    if (v.delaySec > 60) delayHtml = `<span class="delay-positive">+${Math.round(v.delaySec / 60)} min</span>`;
    else if (v.delaySec < -60) delayHtml = `<span class="delay-negative">${Math.round(v.delaySec / 60)} min</span>`;
    else delayHtml = `<span class="delay-ok">na czas</span>`;

    const badgeClass = v.nightLine ? "popup-line-badge night" : "popup-line-badge";

    // Lista udogodnień - tylko te które ma
    const features = [];
    if (v.airCondition) features.push({ icon: "❄️", text: "Klimatyzacja" });
    if (v.lowFloor) features.push({ icon: "♿", text: "Niska podłoga" });
    if (v.electric) features.push({ icon: "⚡", text: "Elektryczny" });
    if (v.hybrid) features.push({ icon: "🔋", text: "Hybrydowy" });
    if (v.ecoVehicle) features.push({ icon: "🌿", text: "Ekologiczny" });

    // Bilety - sposoby płatności
    const tickets = [];
    if (v.ticketmachineCash) tickets.push("gotówka");
    if (v.ticketmachineCard) tickets.push("karta płatnicza");
    if (v.ticketmachineCashCard) tickets.push("gotówka + karta");

    let ticketsHtml = "";
    if (tickets.length > 0) {
        ticketsHtml = `<div class="popup-feature-row">🎫 <b>Bilety:</b> ${tickets.join(", ")}</div>`;
    } else {
        ticketsHtml = `<div class="popup-feature-row popup-feature-no">🎫 Brak biletomatu w pojeździe</div>`;
    }

    const featuresHtml = features.length > 0
        ? features.map(f => `<div class="popup-feature-row">${f.icon} ${f.text}</div>`).join("")
        : "";

    return `
        <div class="popup-bus-header">
            <span class="${badgeClass}">${v.line}</span>
            <b>→ ${v.direction || "?"}</b>
        </div>
        <div class="popup-row"><span>Pojazd:</span><span>#${v.id}</span></div>
        <div class="popup-row"><span>Status:</span>${delayHtml}</div>
        <div class="popup-features-list">
            ${featuresHtml}
            ${ticketsHtml}
        </div>
    `;
}

function escapeAttr(str) {
    return (str || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

function buildStopPopup(stop, departures, scheduleHtml = null) {
    const safeName = escapeAttr(stop.name);

    const tripButtons = `
        <div class="popup-trip-buttons">
            <button class="popup-trip-btn from-btn" onclick="window._setTripFrom('${stop.symbol}', '${safeName}')">🟢 Jedź stąd</button>
            <button class="popup-trip-btn to-btn" onclick="window._setTripTo('${stop.symbol}', '${safeName}')">🔴 Jedź tutaj</button>
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
            
            // Format czasu - inaczej dla "dziś" vs "jutro+"
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
            
            // Etykieta dnia
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
                <li onclick="window._showDepRoute(${d.courseId}, ${d.variantId}, ${d.orderInCourse || 0}, '${d.vehicleId || ''}')">
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
        : `<button class="popup-schedule-btn" onclick="window._toggleSchedule('${stop.symbol}', '${safeName}')">📅 Pełny rozkład jazdy</button>`;

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

// ========== GLOBALNE FUNKCJE ==========
window._showDepRoute = function (courseId, variantId, orderInCourse, vehicleId) {
    map.closePopup();
    showVehicleRoute({ courseId, variantId, orderInCourse, vehicleId });
};

window._setTripFrom = async function (symbol, name) {
    tripFrom = { symbol, name };
    const input = document.getElementById("trip-from-input");
    input.value = name;
    input.classList.add("set");
    map.closePopup();
    
    // Wyłącz tryb wybierania jeśli aktywny
    if (pickingMode === "from") {
        stopPicking();
    }
    
    // Pre-load osiągalnych w tle
    await loadReachableStops(symbol);
    
    // Jeśli nie mamy celu - od razu filtruj mapę żeby pokazać tylko osiągalne
    if (!tripTo) {
        applyReachableFilter();
    }
    
    updateTripMarkers();
    updateTripNotices();
    
    if (tripTo) searchTrip();
};

window._setTripTo = async function (symbol, name) {
    tripTo = { symbol, name };
    const input = document.getElementById("trip-to-input");
    input.value = name;
    input.classList.add("set");
    map.closePopup();
    
    // Wyłącz tryb wybierania jeśli aktywny
    if (pickingMode === "to") {
        stopPicking();
    }
    
    // Załaduj reverse reachable (z jakich przystanków da się tu dojechać)
    await loadReverseReachableStops(symbol);
    
    // Jeśli nie mamy startu - od razu filtruj mapę żeby pokazać tylko przystanki źródłowe
    if (!tripFrom) {
        applyReachableFilter();
    }
    
    updateTripMarkers();
    updateTripNotices();
    
    if (tripFrom) searchTrip();
};

// ========== ROZKŁAD JAZDY ==========
const openSchedules = new Map(); // stopSymbol -> true/false
const scheduleSelectedDate = new Map(); // stopSymbol -> dateMs (północ wybranego dnia)

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

    // Domyślnie: dziś
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
async function refreshScheduleView(symbol) {
    const stop = findStopBySymbol(symbol);
    if (!stop) return;
    const marker = stopMarkers.get(stop.id);
    if (!marker) return;

    const dateMs = scheduleSelectedDate.get(symbol);

    // Pokaż loading w panelu rozkładu
    const loadingHtml = renderScheduleSkeleton(symbol, dateMs, true);
    
    try {
        const depRes = await fetch(`/api/stop/${encodeURIComponent(symbol)}/departures`);
        const departures = await depRes.json();
        marker.setPopupContent(buildStopPopup(stop, departures, loadingHtml));

        const schRes = await fetch(`/api/stop/${encodeURIComponent(symbol)}/schedule?date=${dateMs}`);
        const schedule = await schRes.json();

        const scheduleHtml = renderSchedulePanel(schedule, symbol, dateMs);
        marker.setPopupContent(buildStopPopup(stop, departures, scheduleHtml));
    } catch (err) {
        console.error("Błąd ładowania rozkładu:", err);
    }
}
function renderScheduleSkeleton(symbol, dateMs, loading) {
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

    // Przycisk reset (tylko gdy nie jesteśmy na dziś)
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

function renderSchedulePanel(schedule, symbol, dateMs) {
    if (!schedule || !schedule.lineSchedules) {
        return `
            <div class="popup-schedule-panel">
                ${renderScheduleHeader(symbol, dateMs)}
                <div class="popup-schedule-empty">Brak danych rozkładu</div>
            </div>
        `;
    }

    // Grupowanie: linia + kierunek -> [godziny w sekundach od północy]
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

    // Sprawdź czy to dzisiaj (do podświetlania najbliższego)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = dateMs === today.getTime();

    const now = new Date();
    const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    // Sortuj grupy po numerze linii
    const sortedGroups = Array.from(grouped.values()).sort((a, b) => {
        const na = parseInt(a.line.replace(/\D/g, "")) || 999;
        const nb = parseInt(b.line.replace(/\D/g, "")) || 999;
        return na - nb || a.line.localeCompare(b.line);
    });

    // Najbliższy odjazd globalnie (tylko dla dzisiaj)
    let nextSec = Infinity;
    if (isToday) {
        for (const g of sortedGroups) {
            for (const d of g.departures) {
                if (d.sec >= nowSec && d.sec < nextSec) nextSec = d.sec;
            }
        }
    }

    // Zbierz unikalne litery z legendą
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

        // Pogrupuj po godzinie
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

    // Legenda
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
// ========== A/B PINEZKI ==========
function findStopBySymbol(symbol) {
    return allStopsData.find((s) => s.symbol === symbol);
}

function updateTripMarkers() {
    if (tripFromMarker) { map.removeLayer(tripFromMarker); tripFromMarker = null; }
    if (tripToMarker) { map.removeLayer(tripToMarker); tripToMarker = null; }

    if (tripFrom) {
        const stop = findStopBySymbol(tripFrom.symbol);
        if (stop) {
            tripFromMarker = L.marker([stop.lat, stop.lon], {
                icon: createTripMarker("A", "from"),
                zIndexOffset: 1000,
            }).addTo(map);
            tripFromMarker.bindPopup(`<b>🟢 START</b><br>${stop.name}`);
        }
    }
    if (tripTo) {
        const stop = findStopBySymbol(tripTo.symbol);
        if (stop) {
            tripToMarker = L.marker([stop.lat, stop.lon], {
                icon: createTripMarker("B", "to"),
                zIndexOffset: 1000,
            }).addTo(map);
            tripToMarker.bindPopup(`<b>🔴 CEL</b><br>${stop.name}`);
        }
    }

    if (tripFromMarker && tripToMarker) {
        const bounds = L.latLngBounds([tripFromMarker.getLatLng(), tripToMarker.getLatLng()]);
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 14 });
    }
}

// ========== TRASA POJAZDU ==========
async function showVehicleRoute(bus, highlightFrom, highlightTo) {
    lastFocusedRouteArgs = { bus, highlightFrom, highlightTo };
    clearVehicleRouteVisuals();

    if (!bus.courseId || !bus.variantId) return;

    if (!focusedVehicleId) {
        if (bus.vehicleId) focusedVehicleId = bus.vehicleId;
        else {
            for (const id in vehicles) {
                if (vehicles[id].data.courseId === bus.courseId) { focusedVehicleId = id; break; }
            }
        }
        applyFilters();
    }

    // Ukryj wszystkie zwykłe przystanki gdy pokazujemy trasę pojazdu
    stopsCluster.clearLayers();

    try {
        let currentOrder = bus.orderInCourse || 0;
        if (focusedVehicleId && vehicles[focusedVehicleId]) {
            currentOrder = vehicles[focusedVehicleId].data.orderInCourse || 0;
        }

        const url = `/api/course/${bus.courseId}?variantId=${bus.variantId}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const course = await res.json();

        if (course.shape && course.shape.length > 0) {
            const currentStop = course.stoppings.find((s) => s.order === currentOrder);
            let splitIndex = 0;

            if (currentStop && currentStop.lat && currentStop.lon) {
                let minDist = Infinity;
                for (let i = 0; i < course.shape.length; i++) {
                    const [lat, lon] = course.shape[i];
                    const d = (lat - currentStop.lat) ** 2 + (lon - currentStop.lon) ** 2;
                    if (d < minDist) {
                        minDist = d;
                        splitIndex = i;
                    }
                }
            }

            const passedShape = course.shape.slice(0, splitIndex + 1);
            const remainingShape = course.shape.slice(splitIndex);

            if (passedShape.length > 1) {
                highlightedRoutePassed = L.polyline(passedShape, {
                    color: "#424242",
                    weight: 5,
                    opacity: 0.85,
                    dashArray: "10, 6",
                }).addTo(map);
            }
            if (remainingShape.length > 1) {
                highlightedRouteRemaining = L.polyline(remainingShape, {
                    color: "#ff6f00",
                    weight: 5,
                    opacity: 0.9,
                }).addTo(map);
            }
        }

        for (const st of course.stoppings) {
            if (!st.lat || !st.lon) continue;

            const isFrom = highlightFrom && st.symbol === highlightFrom;
            const isTo = highlightTo && st.symbol === highlightTo;
            const passed = st.order < currentOrder;
            const isCurrent = st.order === currentOrder;

            let dotColor, dotSize;
            if (isFrom) { dotColor = "#4caf50"; dotSize = 16; }
            else if (isTo) { dotColor = "#d32f2f"; dotSize = 16; }
            else if (isCurrent) { dotColor = "#ff6f00"; dotSize = 14; }
            else if (passed) { dotColor = "#bbb"; dotSize = 10; }
            else { dotColor = "#ffc107"; dotSize = 10; }

            const dot = L.marker([st.lat, st.lon], {
                icon: L.divIcon({
                    html: `<div style="width:${dotSize}px;height:${dotSize}px;background:${dotColor};border:2px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>`,
                    className: "",
                    iconSize: [dotSize, dotSize],
                    iconAnchor: [dotSize / 2, dotSize / 2],
                }),
                interactive: true,
            });
            dot.bindPopup(`<b>${st.name}</b><br>Słupek: ${st.symbol}`);
            dot.addTo(map);
            highlightedStopMarkers.push(dot);

            if (!passed && st.estimatedTime) {
                const timeStr = new Date(st.estimatedTime).toLocaleTimeString("pl-PL", {
                    hour: "2-digit", minute: "2-digit",
                });
                const borderColor = isFrom ? "#4caf50" : isTo ? "#d32f2f" : "#ffc107";
                const label = L.marker([st.lat, st.lon], {
                    icon: L.divIcon({
                        html: `<div style="background:white;border:2px solid ${borderColor};padding:1px 5px;border-radius:4px;font-size:11px;font-weight:bold;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.3)">${timeStr}</div>`,
                        className: "",
                        iconSize: [40, 18],
                        iconAnchor: [20, -8],
                    }),
                    interactive: false,
                });
                label.addTo(map);
                highlightedTimeLabels.push(label);
            }
        }

        if (highlightFrom && highlightTo) {
            const fromStop = course.stoppings.find((s) => s.symbol === highlightFrom);
            const toStop = course.stoppings.find((s) => s.symbol === highlightTo);
            if (fromStop && toStop) {
                const points = [[fromStop.lat, fromStop.lon], [toStop.lat, toStop.lon]];
                const v = vehicles[focusedVehicleId];
                if (v) points.push([v.data.lat, v.data.lon]);
                map.fitBounds(L.latLngBounds(points), { padding: [80, 80], maxZoom: 15 });
            }
        }

        if (!routeRefreshTimer) {
            routeRefreshTimer = setInterval(() => {
                if (lastFocusedRouteArgs && focusedVehicleId) {
                    const args = lastFocusedRouteArgs;
                    showVehicleRoute(args.bus, args.highlightFrom, args.highlightTo);
                }
            }, ROUTE_REFRESH_MS);
        }
    } catch (err) {
        console.error("Błąd trasy:", err);
    }
}

function clearVehicleRouteVisuals() {
    if (highlightedRoutePassed) { map.removeLayer(highlightedRoutePassed); highlightedRoutePassed = null; }
    if (highlightedRouteRemaining) { map.removeLayer(highlightedRouteRemaining); highlightedRouteRemaining = null; }
    for (const m of highlightedStopMarkers) map.removeLayer(m);
    highlightedStopMarkers = [];
    for (const l of highlightedTimeLabels) map.removeLayer(l);
    highlightedTimeLabels = [];
}

function clearVehicleRoute() {
    clearVehicleRouteVisuals();
    if (routeRefreshTimer) { clearInterval(routeRefreshTimer); routeRefreshTimer = null; }
    lastFocusedRouteArgs = null;
    if (focusedVehicleId !== null) {
        focusedVehicleId = null;
        applyFilters();
    }

    // Przywróć przystanki na mapie
    const allStopMarkers = Array.from(stopMarkers.values());
    stopsCluster.addLayers(allStopMarkers);

    // Jeśli aktywny był filtr linii, przywróć podświetlenie
    if (activeLineFilter) {
        highlightStopsForLine(activeLineFilter);
    }
}

map.on("click", () => clearVehicleRoute());


// ========== ŁADOWANIE PRZYSTANKÓW ==========
async function loadStops() {
    try {
        const res = await fetch("/api/stops");
        allStopsData = await res.json();

        const markers = [];
        for (const s of allStopsData) {
            if (!s.lat || !s.lon) continue;
            const marker = L.marker([s.lat, s.lon], { icon: createStopIcon("normal") });
            marker.stopData = s;
            marker.bindPopup(buildStopPopup(s, null), { maxWidth: 700, minWidth: 280 });

            marker.on("click", (e) => {
                if (pickingMode === "from") {
                    L.DomEvent.stopPropagation(e);
                    window._setTripFrom(s.symbol, s.name);
                    stopPicking();
                } else if (pickingMode === "to") {
                    L.DomEvent.stopPropagation(e);
                    window._setTripTo(s.symbol, s.name);
                    stopPicking();
                }
            });

            marker.on("popupopen", () => {
                loadStopDepartures(marker, s);
                activeStopRefreshTimer = setInterval(() => loadStopDepartures(marker, s), STOP_REFRESH_MS);
            });
            marker.on("popupclose", () => {
                if (activeStopRefreshTimer) { clearInterval(activeStopRefreshTimer); activeStopRefreshTimer = null; }
                openSchedules.set(s.symbol, false);
            });

            stopMarkers.set(s.id, marker);
            markers.push(marker);
        }
        stopsCluster.addLayers(markers);
        console.log(`Załadowano ${markers.length} przystanków`);
    } catch (err) {
        console.error("Błąd przystanków:", err);
    }
}

async function loadStopDepartures(marker, stop) {
    if (!stop.symbol) return;
    const isScheduleOpen = openSchedules.get(stop.symbol);
    
    if (!isScheduleOpen) {
        marker.setPopupContent(buildStopPopup(stop, null));
    }
    
    try {
        const res = await fetch(`/api/stop/${encodeURIComponent(stop.symbol)}/departures`);
        const departures = await res.json();
        
        if (isScheduleOpen) {
            // Zachowaj otwarty panel rozkładu
            const schRes = await fetch(`/api/stop/${encodeURIComponent(stop.symbol)}/schedule`);
            const schedule = await schRes.json();
            const scheduleHtml = renderSchedulePanel(schedule, stop.symbol);
            marker.setPopupContent(buildStopPopup(stop, departures, scheduleHtml));
        } else {
            marker.setPopupContent(buildStopPopup(stop, departures));
        }
    } catch {
        marker.setPopupContent(buildStopPopup(stop, []));
    }
}

async function loadLines() {
    try {
        const res = await fetch("/api/lines");
        const lines = await res.json();
        for (const l of lines) allLines.set(l.name, l);
    } catch (err) {
        console.error("Błąd linii:", err);
    }
}
// ========== FILTROWANIE OSIĄGALNYCH PRZYSTANKÓW ==========
function showReachableLoading(loading) {
    const input = document.getElementById("trip-to-input");
    const info = document.getElementById("reachable-info");
    
    if (loading) {
        input.placeholder = "⏳ Sprawdzam dostępne przystanki...";
        input.disabled = true;
        info.innerHTML = `<div class="reachable-loading">⏳ Analizuję rozkład...</div>`;
        info.classList.add("visible");
    } else {
        input.placeholder = "Wybierz przystanek...";
        input.disabled = false;
        
        if (reachableStopsFromOrigin) {
            const count = reachableStopsFromOrigin.size - 1; // -1 bo dodaliśmy startowy
            info.innerHTML = `
                <div class="reachable-active">
                    🎯 Pokazuję tylko osiągalne: <b>${count}</b> przystanków
                    <button onclick="window._clearReachableFilter()" title="Pokaż wszystkie">✕</button>
                </div>
            `;
            info.classList.add("visible");
        } else {
            info.classList.remove("visible");
            info.innerHTML = "";
        }
    }
}


// app.js - ZAMIEŃ updateTripNotices na:

function updateTripNotices() {
    const noticeFrom = document.getElementById("trip-notice-from");
    const noticeTo = document.getElementById("trip-notice-to");
    const noticePlan = document.getElementById("trip-notice-plan");
    
    noticeFrom.classList.remove("visible");
    noticeTo.classList.remove("visible");
    noticePlan.classList.remove("visible");

    // Oba wybrane - pokaż trasę
    if (tripFrom && tripTo && !pickingMode) {
        document.getElementById("trip-notice-plan-text").innerHTML = 
            `Trasa: <b>${tripFrom.name}</b> → <b>${tripTo.name}</b>`;
        noticePlan.classList.add("visible");
        return;
    }

    // Picking TO
    if (pickingMode === "to") {
        let text = "Wybieranie celu podróży...";
        if (isLoadingReachable) {
            text = "⏳ Analizuję trasy linii (5-15 sek)...";
        } else if (tripFrom && reachableStopsFromOrigin) {
            const count = Math.max(0, reachableStopsFromOrigin.size - 1);
            text = `Wybierz cel z mapy (${count} dostępnych przystanków)`;
        }
        noticeTo.querySelector("span:nth-of-type(2)").textContent = text;
        noticeTo.classList.add("visible");
        if (tripFrom) {
            document.getElementById("trip-notice-from-text").innerHTML = 
                `Start: <b>${tripFrom.name}</b>`;
            noticeFrom.classList.add("visible");
        }
        return;
    }

    // Picking FROM
    if (pickingMode === "from") {
        let text = "Wybieranie startu podróży...";
        if (isLoadingReverseReachable) {
            text = "⏳ Analizuję trasy do celu (5-15 sek)...";
        } else if (tripTo && reachableStopsToDestination) {
            const count = Math.max(0, reachableStopsToDestination.size - 1);
            text = `Wybierz start z mapy (${count} przystanków do ${tripTo.name})`;
        }
        document.getElementById("trip-notice-from-text").textContent = text;
        noticeFrom.classList.add("visible");
        if (tripTo) {
            noticeTo.querySelector("span:nth-of-type(2)").innerHTML = `Cel: <b>${tripTo.name}</b>`;
            noticeTo.classList.add("visible");
        }
        return;
    }

    // Tylko start wybrany (bez pickingu)
    if (tripFrom && !tripTo) {
        document.getElementById("trip-notice-from-text").innerHTML = 
            `Start: <b>${tripFrom.name}</b> — wybierz cel`;
        noticeFrom.classList.add("visible");
        return;
    }

    // Tylko cel wybrany (bez pickingu)
    if (!tripFrom && tripTo) {
        noticeTo.querySelector("span:nth-of-type(2)").innerHTML = 
            `Cel: <b>${tripTo.name}</b> — wybierz start`;
        noticeTo.classList.add("visible");
        return;
    }
}

async function loadReachableStops(fromSymbol) {
    if (!fromSymbol) {
        reachableStopsFromOrigin = null;
        return;
    }

    isLoadingReachable = true;
    updateTripNotices();

    try {
        const res = await fetch(`/api/stop/${encodeURIComponent(fromSymbol)}/reachable`);
        const symbols = await res.json();
        reachableStopsFromOrigin = new Set(symbols);
        reachableStopsFromOrigin.add(fromSymbol);
        console.log(`Osiągalnych przystanków z ${fromSymbol}: ${symbols.length}`);
    } catch (err) {
        console.error("Błąd ładowania osiągalnych przystanków:", err);
        reachableStopsFromOrigin = null;
    } finally {
        isLoadingReachable = false;
        updateTripNotices();
    }
}

// app.js - ZAMIEŃ applyReachableFilter na:

function applyReachableFilter() {
    stopsCluster.clearLayers();

    let markersToAdd;
    let filterSet = null;
    
    // Picking "from" + mamy cel: pokaż tylko przystanki z których da się dojechać do B
    if (pickingMode === "from" && reachableStopsToDestination && reachableStopsToDestination.size > 1) {
        filterSet = reachableStopsToDestination;
    }
    // Picking "to" + mamy start: pokaż tylko przystanki do których da się dojechać z A
    else if (pickingMode === "to" && reachableStopsFromOrigin && reachableStopsFromOrigin.size > 1) {
        filterSet = reachableStopsFromOrigin;
    }
    // Mamy tylko cel (bez startu, nie picking): pokaż skąd da się dojechać
    else if (!tripFrom && tripTo && reachableStopsToDestination && reachableStopsToDestination.size > 1 && !pickingMode) {
        filterSet = reachableStopsToDestination;
    }
    // Mamy tylko start (bez celu, nie picking): pokaż dokąd da się dojechać
    else if (tripFrom && !tripTo && reachableStopsFromOrigin && reachableStopsFromOrigin.size > 1 && !pickingMode) {
        filterSet = reachableStopsFromOrigin;
    }
    
    if (filterSet) {
        markersToAdd = [];
        for (const marker of stopMarkers.values()) {
            const symbol = marker.stopData?.symbol;
            if (symbol && filterSet.has(symbol)) {
                markersToAdd.push(marker);
            }
        }
        console.log(`Filtr aktywny: pokazuję ${markersToAdd.length} z ${stopMarkers.size} przystanków`);
    } else {
        markersToAdd = Array.from(stopMarkers.values());
    }

    stopsCluster.addLayers(markersToAdd, { chunkedLoading: false });

    setTimeout(() => {
        if (stopsCluster.refreshClusters) {
            stopsCluster.refreshClusters();
        }
        map.fire("zoomend");
        map.invalidateSize(false);
    }, 50);
}

function showReachableLoading(loading) {
    const input = document.getElementById("trip-to-input");
    if (loading) {
        input.placeholder = "⏳ Sprawdzam dostępne przystanki...";
        input.disabled = true;
    } else {
        input.placeholder = "Wybierz przystanek...";
        input.disabled = false;
    }
}
// ========== WYRÓŻNIENIE PRZYSTANKÓW LINII ==========
async function highlightStopsForLine(lineName) {
    if (!lineName) {
        for (const marker of stopMarkers.values()) {
            marker.setIcon(createStopIcon("normal"));
        }
        return;
    }

    let lineSymbols = lineStopsCache.get(lineName);
    if (!lineSymbols) {
        try {
            const res = await fetch(`/api/line/${encodeURIComponent(lineName)}/stops`);
            lineSymbols = await res.json();
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

// ========== FILTROWANIE POJAZDÓW ==========
function shouldShowVehicle(v) {
    if (focusedVehicleId !== null) return v.id === focusedVehicleId;
    if (!showDay && !v.nightLine) return false;
    if (!showNight && v.nightLine) return false;
    if (activeLineFilter && v.line !== activeLineFilter) return false;
    if (searchQuery && !v.line.toLowerCase().startsWith(searchQuery.toLowerCase())) return false; // ← ZMIENIONE z includes na startsWith
    return true;
}

function applyFilters() {
    for (const id in vehicles) {
        const v = vehicles[id];
        const visible = shouldShowVehicle(v.data);
        if (visible && !map.hasLayer(v.marker)) v.marker.addTo(map);
        else if (!visible && map.hasLayer(v.marker)) map.removeLayer(v.marker);
    }
    updateCounter();
    updateFilterNotice(); // ← DODANE
}

function updateCounter() {
    const visible = Object.values(vehicles).filter((v) => shouldShowVehicle(v.data)).length;
    const total = Object.keys(vehicles).length;
    const text = activeLineFilter
        ? `Linia ${activeLineFilter}: ${visible} pojazdów`
        : `${visible} / ${total} pojazdów na trasie`;
    
    const el = document.getElementById("counter-detail");
    if (el) el.textContent = text;
}

function renderLinesList() {
    const list = document.getElementById("lines-list");
    list.innerHTML = "";
    const activeNames = new Set();
    for (const v of Object.values(vehicles)) activeNames.add(v.data.line);
    const sorted = Array.from(activeNames).sort((a, b) => {
        const na = parseInt(a.replace(/\D/g, "")) || 999;
        const nb = parseInt(b.replace(/\D/g, "")) || 999;
        return na - nb || a.localeCompare(b);
    });
    for (const name of sorted) {
        const info = allLines.get(name);
        const chip = document.createElement("div");
        chip.className = "line-chip";
        if (info?.nightLine) chip.classList.add("night");
        if (activeLineFilter === name) chip.classList.add("active");
        chip.textContent = name;
        chip.onclick = () => {
            activeLineFilter = activeLineFilter === name ? null : name;
            renderLinesList();
            applyFilters();
            highlightStopsForLine(activeLineFilter);
        };
        list.appendChild(chip);
    }
}

// ========== POJAZDY ==========
async function loadVehicles() {
    let data;
    try {
        const res = await fetch("/api/vehicles");
        data = await res.json();
    } catch { return; }

    const seen = new Set();
    const now = performance.now();

    data.forEach((bus) => {
        if (!bus.lat || !bus.lon) return;
        seen.add(bus.id);

        if (!vehicles[bus.id]) {
            const marker = L.marker([bus.lat, bus.lon], {
                icon: createBusIcon(bus.line, bus.lineType, bus.nightLine, bus.delaySec),
            });
            marker.bindPopup(buildVehiclePopup(bus));
            marker.on("popupopen", () => {
                const v = vehicles[bus.id];
                if (v) showVehicleRoute({ ...v.data, vehicleId: bus.id });
            });
            vehicles[bus.id] = { marker, fromLat: bus.lat, fromLon: bus.lon, toLat: bus.lat, toLon: bus.lon, startTime: now, duration: 0, data: bus };
            if (shouldShowVehicle(bus)) marker.addTo(map);
        } else {
            const v = vehicles[bus.id];
            const cur = v.marker.getLatLng();
            const moved = Math.abs(cur.lat - bus.lat) > 0.000001 || Math.abs(cur.lng - bus.lon) > 0.000001;
            v.fromLat = cur.lat; v.fromLon = cur.lng;
            v.toLat = bus.lat; v.toLon = bus.lon;
            v.startTime = now;
            v.duration = moved ? ANIMATION_MS : 0;
            if (v.data.line !== bus.line || v.data.delaySec !== bus.delaySec) {
                v.marker.setIcon(createBusIcon(bus.line, bus.lineType, bus.nightLine, bus.delaySec));
            }
            v.data = bus;
            v.marker.getPopup()?.setContent(buildVehiclePopup(bus));
        }
    });

    for (const id in vehicles) {
        if (!seen.has(id)) { map.removeLayer(vehicles[id].marker); delete vehicles[id]; }
    }
    renderLinesList();
    applyFilters();
}

// ========== ANIMACJA ==========
function animate() {
    const now = performance.now();
    for (const id in vehicles) {
        const v = vehicles[id];
        if (v.duration === 0) continue;
        let t = (now - v.startTime) / v.duration;
        if (t > 1.3) t = 1.3;
        const eased = t < 1 ? 1 - Math.pow(1 - t, 2) : t;
        v.marker.setLatLng([
            v.fromLat + (v.toLat - v.fromLat) * eased,
            v.fromLon + (v.toLon - v.fromLon) * eased,
        ]);
    }
    requestAnimationFrame(animate);
}

// ========== GEOLOKALIZACJA ==========
function findNearestStop(lat, lon) {
    let nearest = null;
    let minDist = Infinity;
    for (const s of allStopsData) {
        if (!s.lat || !s.lon) continue;
        const d = (s.lat - lat) ** 2 + (s.lon - lon) ** 2;
        if (d < minDist) {
            minDist = d;
            nearest = s;
        }
    }
    return nearest;
}

function setUserLocation(lat, lon) {
    if (userLocationMarker) map.removeLayer(userLocationMarker);
    userLocationMarker = L.marker([lat, lon], {
        icon: createUserLocationIcon(),
        zIndexOffset: 900,
    }).addTo(map);
    userLocationMarker.bindPopup("<b>📍 Twoja lokalizacja</b>");
}

document.getElementById("geo-btn").addEventListener("click", () => {
    if (!navigator.geolocation) {
        alert("Twoja przeglądarka nie wspiera geolokalizacji");
        return;
    }
    const btn = document.getElementById("geo-btn");
    btn.disabled = true;
    btn.textContent = "⏳ Lokalizuję...";

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            setUserLocation(lat, lon);

            const nearest = findNearestStop(lat, lon);
            if (nearest) {
                tripFrom = { symbol: nearest.symbol, name: nearest.name };
                const input = document.getElementById("trip-from-input");
                input.value = nearest.name;
                input.classList.add("set");
                updateTripMarkers();
                loadReachableStops(nearest.symbol);
                updateTripNotices(); // ← DODAJ

                map.setView([lat, lon], 15);
                if (tripTo) searchTrip();
            }

            btn.disabled = false;
            btn.textContent = "📍 Z mojej lokalizacji";
        },
        (err) => {
            alert("Nie udało się pobrać lokalizacji: " + err.message);
            btn.disabled = false;
            btn.textContent = "📍 Z mojej lokalizacji";
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
});

// ========== PLANOWANIE ==========
function setupStopSearch(inputId, suggestionsId, callback) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(suggestionsId);
    const isFromInput = inputId === "trip-from-input";
    const isToInput = inputId === "trip-to-input";

    input.addEventListener("input", () => {
        const q = input.value.trim().toLowerCase();
        if (q.length < 2) { dropdown.classList.remove("visible"); return; }

        const seen = new Set();
        const matches = allStopsData
            .filter((s) => {
                const key = `${s.name}_${s.symbol}`;
                if (seen.has(key)) return false;
                seen.add(key);
                
                // Filtruj po nazwie/ulicy
                const matchesText = s.name.toLowerCase().includes(q) || (s.street && s.street.toLowerCase().includes(q));
                if (!matchesText) return false;
                
                // Filtruj po osiągalności
                if (isToInput && reachableStopsFromOrigin && reachableStopsFromOrigin.size > 1) {
                    if (!reachableStopsFromOrigin.has(s.symbol)) return false;
                }
                if (isFromInput && reachableStopsToDestination && reachableStopsToDestination.size > 1) {
                    if (!reachableStopsToDestination.has(s.symbol)) return false;
                }
                
                return true;
            })
            .slice(0, 6);

        if (matches.length === 0) { dropdown.classList.remove("visible"); return; }

        dropdown.innerHTML = matches.map((s) => `
            <div class="suggestion-item" data-symbol="${s.symbol}" data-name="${escapeAttr(s.name)}">
                <div class="suggestion-name">${s.name}</div>
                <div class="suggestion-street">${s.street ? `ul. ${s.street}` : ""} (${s.symbol})</div>
            </div>
        `).join("");
        dropdown.classList.add("visible");

        dropdown.querySelectorAll(".suggestion-item").forEach((el) => {
            el.addEventListener("click", () => {
                callback(el.dataset.symbol, el.dataset.name);
                input.value = el.dataset.name;
                input.classList.add("set");
                dropdown.classList.remove("visible");
            });
        });
    });

    input.addEventListener("blur", () => {
        setTimeout(() => dropdown.classList.remove("visible"), 200);
    });
}

async function searchTrip() {
    if (!tripFrom || !tripTo) return;

    const resultsDiv = document.getElementById("trip-results");
    resultsDiv.innerHTML = `<div class="trip-loading">⏳ Szukam połączeń...</div>`;

    try {
        const res = await fetch(`/api/plan?from=${encodeURIComponent(tripFrom.symbol)}&to=${encodeURIComponent(tripTo.symbol)}`);
        const results = await res.json();
        lastTripResults = results;
        window._tripResults = results;
        renderTripResults();
    } catch {
        resultsDiv.innerHTML = `<div class="trip-no-results">❌ Błąd wyszukiwania</div>`;
    }
}

function renderTripResults() {
    const resultsDiv = document.getElementById("trip-results");
    let visible = lastTripResults;
    if (hideNightInResults) visible = visible.filter((r) => !r.nightLine);

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

        // Ile dni w przyszłość?
        const depDay = new Date(r.departureTime);
        depDay.setHours(0, 0, 0, 0);
        const dayDiff = Math.round((depDay.getTime() - todayMs) / (24 * 60 * 60 * 1000));

        // Etykieta dnia
        let dayLabel = "";
        if (dayDiff === 1) dayLabel = `<span class="trip-day-label tomorrow">JUTRO</span>`;
        else if (dayDiff === 2) dayLabel = `<span class="trip-day-label">POJUTRZE</span>`;
        else if (dayDiff > 2) {
            const dayName = depDate.toLocaleDateString("pl-PL", { weekday: "long" });
            dayLabel = `<span class="trip-day-label">${dayName.toUpperCase()}</span>`;
        }

        // Countdown
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

        // Status pojazdu
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

        return `
            <div class="trip-result" onclick="window._showTripResult(${lastTripResults.indexOf(r)})">
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

    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
        if (lastTripResults.length === 0) {
            clearInterval(countdownTimer);
            countdownTimer = null;
            return;
        }
        renderTripResults();
    }, COUNTDOWN_REFRESH_MS);
}
// app.js - DODAJ nową funkcję loadReverseReachableStops

async function loadReverseReachableStops(toSymbol) {
    if (!toSymbol) {
        reachableStopsToDestination = null;
        return;
    }

    isLoadingReverseReachable = true;
    updateTripNotices();

    try {
        const res = await fetch(`/api/stop/${encodeURIComponent(toSymbol)}/reachable-to`);
        const symbols = await res.json();
        reachableStopsToDestination = new Set(symbols);
        reachableStopsToDestination.add(toSymbol); // dodaj sam cel
        console.log(`Przystanki źródłowe do ${toSymbol}: ${symbols.length}`);
    } catch (err) {
        console.error("Błąd ładowania reverse reachable:", err);
        reachableStopsToDestination = null;
    } finally {
        isLoadingReverseReachable = false;
        updateTripNotices();
    }
}
function renderResultsFilter() {
    const hasNight = lastTripResults.some((r) => r.nightLine);
    if (!hasNight) return "";
    return `
        <div class="trip-results-filter">
            <label>
                <input type="checkbox" id="hide-night-results" ${hideNightInResults ? "checked" : ""}>
                Ukryj nocne
            </label>
        </div>
    `;
}

function attachFilterListeners() {
    const cb = document.getElementById("hide-night-results");
    if (cb) {
        cb.addEventListener("change", (e) => {
            hideNightInResults = e.target.checked;
            renderTripResults();
        });
    }
}

window._tripResults = [];
window._showTripResult = function (index) {
    const r = window._tripResults[index];
    if (!r) return;
    showVehicleRoute(
        { courseId: r.courseId, variantId: r.variantId, orderInCourse: r.fromOrder, vehicleId: r.vehicleId },
        tripFrom?.symbol,
        tripTo?.symbol
    );
};

// ========== PANELE BOCZNE ==========
const sidebarPanel = document.getElementById("sidebar-panel");
let activePanel = "trip";

function showPanel(panelName) {
    if (activePanel === panelName) {
        sidebarPanel.classList.remove("visible");
        activePanel = null;
        document.querySelectorAll(".rail-btn").forEach((b) => b.classList.remove("active"));
        return;
    }

    document.querySelectorAll(".panel-content").forEach((c) => {
        c.classList.toggle("active", c.dataset.panel === panelName);
    });
    document.querySelectorAll(".rail-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.panel === panelName);
    });

    sidebarPanel.classList.add("visible");
    activePanel = panelName;
}

document.querySelectorAll(".rail-btn[data-panel]").forEach((btn) => {
    btn.addEventListener("click", () => {
        if (btn.classList.contains("disabled")) return;
        showPanel(btn.dataset.panel);
    });
});

document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
        sidebarPanel.classList.remove("visible");
        activePanel = null;
        document.querySelectorAll(".rail-btn").forEach((b) => b.classList.remove("active"));
    });
});

// Przyciski wybierania przystanku
async function startPicking(mode) {
    if (pickingMode === mode) {
        stopPicking();
        return;
    }

    pickingMode = mode;
    document.body.classList.add("picking-stop");
    
    document.getElementById("trip-from-pick").classList.toggle("choosing", mode === "from");
    document.getElementById("trip-to-pick").classList.toggle("choosing", mode === "to");

    if (mode === "to" && tripFrom) {
        // Mamy start - filtruj do osiągalnych z A
        if (!reachableStopsFromOrigin || reachableStopsFromOrigin.size <= 1) {
            updateTripNotices();
            await loadReachableStops(tripFrom.symbol);
        }
        applyReachableFilter();
    } else if (mode === "from" && tripTo) {
        // Mamy cel - filtruj do przystanków z których da się dojechać do B
        if (!reachableStopsToDestination || reachableStopsToDestination.size <= 1) {
            updateTripNotices();
            await loadReverseReachableStops(tripTo.symbol);
        }
        applyReachableFilter();
    }
    // Jeśli nie mamy drugiego punktu - pokaż wszystkie (bez filtra)

    updateTripNotices();
}

function stopPicking() {
    const wasPicking = pickingMode !== null;
    pickingMode = null;
    document.body.classList.remove("picking-stop");
    document.getElementById("trip-from-pick").classList.remove("choosing");
    document.getElementById("trip-to-pick").classList.remove("choosing");

    // Przywróć wszystkie przystanki na mapie
    if (wasPicking) {
        applyReachableFilter();
    }

    updateTripNotices();
}

document.getElementById("trip-from-pick").addEventListener("click", () => startPicking("from"));
document.getElementById("trip-to-pick").addEventListener("click", () => startPicking("to"));

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && pickingMode) {
        stopPicking();
    }
});

// Esc też zamyka panel
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        sidebarPanel.classList.remove("visible");
        activePanel = null;
        document.querySelectorAll(".rail-btn").forEach((b) => b.classList.remove("active"));
        stopPicking();
    }
});

showPanel("trip");

// ========== TOAST: POWIADOMIENIE FILTRA ==========
const filterNotice = document.getElementById("filter-notice");
const filterNoticeText = document.getElementById("filter-notice-text");

function updateFilterNotice() {
    const parts = [];
    if (activeLineFilter) parts.push(`Linia: ${activeLineFilter}`);
    if (searchQuery) parts.push(`Szukam: "${searchQuery}"`);
    if (!showDay) parts.push("ukryte dzienne");
    if (!showNight) parts.push("ukryte nocne");

    if (parts.length === 0) {
        filterNotice.classList.remove("visible");
    } else {
        filterNoticeText.textContent = "🔍 Filtr: " + parts.join(" • ");
        filterNotice.classList.add("visible");
    }
}

document.getElementById("filter-notice-clear").addEventListener("click", () => {
    activeLineFilter = null;
    searchQuery = "";
    showDay = true;
    showNight = true;
    document.getElementById("search").value = "";
    document.getElementById("filter-day").checked = true;
    document.getElementById("filter-night").checked = true;
    renderLinesList();
    applyFilters();
    highlightStopsForLine(null);
    updateFilterNotice();
});

// ========== SEARCH HANDLERS ==========
document.getElementById("search").addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    applyFilters();
    
    const matchingLines = Array.from(allLines.keys()).filter(name => 
        name.toLowerCase().startsWith(searchQuery.toLowerCase())
    );
    if (matchingLines.length === 1) {
        highlightStopsForLine(matchingLines[0]);
    } else if (!searchQuery && !activeLineFilter) {
        highlightStopsForLine(null);
    }
});

document.getElementById("filter-day").addEventListener("change", (e) => { showDay = e.target.checked; applyFilters(); });
document.getElementById("filter-night").addEventListener("change", (e) => { showNight = e.target.checked; applyFilters(); });

document.getElementById("trip-search").addEventListener("click", searchTrip);


document.getElementById("trip-from-clear").addEventListener("click", () => {
    tripFrom = null;
    const input = document.getElementById("trip-from-input");
    input.value = "";
    input.classList.remove("set");
    document.getElementById("trip-results").innerHTML = "";
    lastTripResults = [];
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    
    // Reset reachable from origin
    reachableStopsFromOrigin = null;
    
    if (pickingMode) stopPicking();
    
    // NIE czyść B automatycznie - user może chcieć zostawić cel
    updateTripMarkers();
    applyReachableFilter();
    updateTripNotices();
});

document.getElementById("trip-to-clear").addEventListener("click", () => {
    tripTo = null;
    const input = document.getElementById("trip-to-input");
    input.value = "";
    input.classList.remove("set");
    document.getElementById("trip-results").innerHTML = "";
    lastTripResults = [];
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    
    // Reset reverse reachable
    reachableStopsToDestination = null;
    
    if (pickingMode) stopPicking();
    
    updateTripMarkers();
    applyReachableFilter();
    updateTripNotices();
});
setupStopSearch("trip-from-input", "trip-from-suggestions", (symbol, name) => {
    tripFrom = { symbol, name };
    updateTripMarkers();
    loadReachableStops(symbol); // pre-load w tle
    updateTripNotices();
    if (tripTo) searchTrip();
});

setupStopSearch("trip-to-input", "trip-to-suggestions", (symbol, name) => {
    tripTo = { symbol, name };
    updateTripMarkers();
    updateTripNotices();
    if (tripFrom) searchTrip();
});
// Anuluj z powiadomień toast
document.querySelectorAll(".trip-notice-clear").forEach((btn) => {
    btn.addEventListener("click", () => {
        const what = btn.dataset.clear;
        if (what === "from") {
            document.getElementById("trip-from-clear").click();
        } else if (what === "to") {
            if (pickingMode === "to") {
                stopPicking();
            } else {
                document.getElementById("trip-to-clear").click();
            }
        } else if (what === "plan") {
            // Anuluj całą trasę = wyczyść A i B
            document.getElementById("trip-from-clear").click();
        }
    });
});
// ========== START ==========
(async () => {
    await loadLines();
    await loadStops();
    await loadVehicles();
    setInterval(loadVehicles, REFRESH_MS);
    animate();
})();