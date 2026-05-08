// ========== IKONY MARKERÓW ==========

export function createBusIcon(line, lineType, nightLine, delaySec) {
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

export function createStopIcon(state = "normal") {
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

export function createTripMarker(letter, type) {
    return L.divIcon({
        html: `<div class="trip-marker ${type}">${letter}</div>`,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });
}

export function createUserLocationIcon() {
    return L.divIcon({
        html: `<div class="user-location-marker"></div>`,
        className: "",
        iconSize: [18, 18],
        iconAnchor: [9, 9],
    });
}