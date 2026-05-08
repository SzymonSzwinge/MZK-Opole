// ========== POPUP POJAZDU ==========
import { allLines } from "../state.js";

export function buildVehiclePopup(v) {
    let delayHtml;
    if (v.delaySec > 60) delayHtml = `<span class="delay-positive">+${Math.round(v.delaySec / 60)} min</span>`;
    else if (v.delaySec < -60) delayHtml = `<span class="delay-negative">${Math.round(v.delaySec / 60)} min</span>`;
    else delayHtml = `<span class="delay-ok">na czas</span>`;

    const badgeClass = v.nightLine ? "popup-line-badge night" : "popup-line-badge";

    const features = [];
    if (v.airCondition) features.push({ icon: "❄️", text: "Klimatyzacja" });
    if (v.lowFloor) features.push({ icon: "♿", text: "Niska podłoga" });
    if (v.electric) features.push({ icon: "⚡", text: "Elektryczny" });
    if (v.hybrid) features.push({ icon: "🔋", text: "Hybrydowy" });
    if (v.ecoVehicle) features.push({ icon: "🌿", text: "Ekologiczny" });

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