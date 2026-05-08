// ========== STAN APLIKACJI ==========

// Pojazdy na mapie: id -> { marker, fromLat, fromLon, toLat, toLon, startTime, duration, data }
export const vehicles = {};

// Przystanki: stopId -> Leaflet marker
export const stopMarkers = new Map();

// Dane linii: name -> lineInfo
export const allLines = new Map();

// Surowe dane przystanków
export let allStopsData = [];
export function setAllStopsData(data) { allStopsData = data; }

// Filtry pojazdów
export let activeLineFilter = null;
export function setActiveLineFilter(v) { activeLineFilter = v; }

export let showDay = true;
export function setShowDay(v) { showDay = v; }

export let showNight = true;
export function setShowNight(v) { showNight = v; }

export let searchQuery = "";
export function setSearchQuery(v) { searchQuery = v; }

// Trasa pojazdu
export let highlightedRoutePassed = null;
export function setHighlightedRoutePassed(v) { highlightedRoutePassed = v; }

export let highlightedRouteRemaining = null;
export function setHighlightedRouteRemaining(v) { highlightedRouteRemaining = v; }

export let highlightedStopMarkers = [];
export function setHighlightedStopMarkers(v) { highlightedStopMarkers = v; }

export let highlightedTimeLabels = [];
export function setHighlightedTimeLabels(v) { highlightedTimeLabels = v; }

// Markery A/B
export let tripFromMarker = null;
export function setTripFromMarker(v) { tripFromMarker = v; }

export let tripToMarker = null;
export function setTripToMarker(v) { tripToMarker = v; }

// Lokalizacja użytkownika
export let userLocationMarker = null;
export function setUserLocationMarker(v) { userLocationMarker = v; }

// Timery
export let activeStopRefreshTimer = null;
export function setActiveStopRefreshTimer(v) { activeStopRefreshTimer = v; }

export let countdownTimer = null;
export function setCountdownTimer(v) { countdownTimer = v; }

export let routeRefreshTimer = null;
export function setRouteRefreshTimer(v) { routeRefreshTimer = v; }

// Fokus pojazdu
export let focusedVehicleId = null;
export function setFocusedVehicleId(v) { focusedVehicleId = v; }

export let lastFocusedRouteArgs = null;
export function setLastFocusedRouteArgs(v) { lastFocusedRouteArgs = v; }

// Planowanie podróży
export let tripFrom = null;
export function setTripFrom(v) { tripFrom = v; }

export let tripTo = null;
export function setTripTo(v) { tripTo = v; }

export let hideNightInResults = false;
export function setHideNightInResults(v) { hideNightInResults = v; }

export let lastTripResults = [];
export function setLastTripResults(v) { lastTripResults = v; }

export let pickingMode = null; // null | "from" | "to"
export function setPickingMode(v) { pickingMode = v; }

export let reachableStopsFromOrigin = null;
export function setReachableStopsFromOrigin(v) { reachableStopsFromOrigin = v; }

export let isLoadingReachable = false;
export function setIsLoadingReachable(v) { isLoadingReachable = v; }

export let reachableStopsToDestination = null;
export function setReachableStopsToDestination(v) { reachableStopsToDestination = v; }

export let isLoadingReverseReachable = false;
export function setIsLoadingReverseReachable(v) { isLoadingReverseReachable = v; }

// Cache: linia → przystanki
export const lineStopsCache = new Map();

// Rozkład jazdy
export const openSchedules = new Map();
export const scheduleSelectedDate = new Map();

export let focusedCourseId = null;
export function setFocusedCourseId(v) { focusedCourseId = v; }