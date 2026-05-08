import { onPanelClose } from "../ui/panels.js";
import {
    APP_INFO,
    MZK_CONTACT,
    CITY_CONTACT,
    TICKET_PRICES,
    TICKET_CHANNELS,
    VALIDATION_INFO,
    FAQ,
    ICONS_LEGEND,
} from "./content.js";

export function initStaticPanels() {
    renderTickets();
    renderHelp();
    renderInfo();
    setupAccordions();

    onPanelClose("info", () => {});
    onPanelClose("tickets", () => {});
    onPanelClose("help", () => {});
}

function setupAccordions() {
    document.addEventListener("click", (e) => {
        const header = e.target.closest(".accordion-header");
        if (!header) return;
        const item = header.parentElement;
        item.classList.toggle("open");
    });
}

function renderTickets() {
    const root = document.getElementById("tickets-body");
    if (!root) return;

    const renderTicketGroup = (group) => {
        const rows = group.items.map((t) => `
            <div class="ticket-row">
                <div class="ticket-row-main">
                    <div class="ticket-name">${t.name}</div>
                    ${t.desc ? `<div class="ticket-desc">${t.desc}</div>` : ""}
                </div>
                <div class="ticket-prices">
                    <div class="ticket-price-cell">
                        <div class="ticket-price-label">N</div>
                        <div class="ticket-price-value">${t.normal}</div>
                    </div>
                    <div class="ticket-price-cell ulga">
                        <div class="ticket-price-label">U</div>
                        <div class="ticket-price-value">${t.ulga}</div>
                    </div>
                </div>
            </div>
        `).join("");

        return `
            <h4>${group.title}</h4>
            <div class="ticket-table">${rows}</div>
        `;
    };

    const finesRows = TICKET_PRICES.fines.items.map((f) => `
        <div class="fine-row">
            <span class="fine-name">${f.name}</span>
            <span class="fine-price">${f.price}</span>
        </div>
    `).join("");

    const eligibility = TICKET_PRICES.eligibility.items
        .map((d) => `<li>${d}</li>`).join("");

    const channels = TICKET_CHANNELS.map((ch) => `
        <div class="channel-card">
            <div class="channel-icon">${ch.icon}</div>
            <div class="channel-content">
                <div class="channel-name">${ch.name}</div>
                <div class="channel-info">${ch.info}</div>
            </div>
        </div>
    `).join("");

    const validation = VALIDATION_INFO.steps
        .map((s, i) => `<li><b>${i + 1}.</b> ${s}</li>`).join("");

    root.innerHTML = `
        <div class="static-section">
            <h3>💰 Cennik biletów</h3>
            <div class="static-note">${TICKET_PRICES.note}</div>

            ${renderTicketGroup(TICKET_PRICES.city)}
            ${renderTicketGroup(TICKET_PRICES.suburban)}

            <div class="static-callout">
                <b>📜 Podstawa prawna:</b> ${TICKET_PRICES.legalBasis}
            </div>
        </div>

        <div class="static-section">
            <h3>🎓 ${TICKET_PRICES.eligibility.title}</h3>
            <ul class="discount-list">${eligibility}</ul>
        </div>

        <div class="static-section">
            <h3>⚠️ ${TICKET_PRICES.fines.title}</h3>
            <div class="fines-table">${finesRows}</div>
            <div class="static-callout">
                <b>💡 Zniżka 30%:</b> ${TICKET_PRICES.fines.discount}
            </div>
        </div>

        <div class="static-section">
            <h3>🛒 Gdzie kupić bilet</h3>
            <div class="channels-grid">${channels}</div>
        </div>

        <div class="static-section">
            <h3>✅ ${VALIDATION_INFO.title}</h3>
            <ul class="steps-list">${validation}</ul>
        </div>
    `;
}

function renderHelp() {
    const root = document.getElementById("help-body");
    if (!root) return;

    const accordions = FAQ.map((cat) => {
        const items = cat.items.map((it) => `
            <div class="accordion-item">
                <button class="accordion-header">
                    <span class="accordion-q">${it.q}</span>
                    <span class="accordion-arrow">›</span>
                </button>
                <div class="accordion-body">${it.a}</div>
            </div>
        `).join("");

        return `
            <div class="static-section">
                <h3>${cat.category}</h3>
                <div class="accordion">${items}</div>
            </div>
        `;
    }).join("");

    const legend = ICONS_LEGEND.map((l) => `
        <div class="legend-row">
            <span class="legend-icon">${l.icon}</span>
            <span class="legend-text">${l.label}</span>
        </div>
    `).join("");

    root.innerHTML = `
        ${accordions}
        <div class="static-section">
            <h3>📖 Legenda oznaczeń</h3>
            <div class="legend-grid">${legend}</div>
        </div>
    `;
}

function renderInfo() {
    const root = document.getElementById("info-body");
    if (!root) return;

    const repoLink = APP_INFO.repository
        ? `<a href="${APP_INFO.repository}" target="_blank" rel="noopener">${APP_INFO.repository.replace(/^https?:\/\//, "")}</a>`
        : `<span class="muted">brak</span>`;

    root.innerHTML = `
        <div class="static-section">
            <h3>📞 Kontakt z MZK Opole</h3>
            <div class="contact-card">
                <div class="contact-name">${MZK_CONTACT.name}</div>
                <div class="contact-address">${MZK_CONTACT.address}</div>
                <a href="${MZK_CONTACT.website}" target="_blank" rel="noopener" class="contact-link-main">🌐 ${MZK_CONTACT.website}</a>
            </div>

            ${contactBlock(MZK_CONTACT.bok)}
            ${contactBlock(MZK_CONTACT.ticketControl)}
            ${contactBlock(MZK_CONTACT.debt)}
            ${contactBlock(MZK_CONTACT.lostFound)}
            ${contactBlock(MZK_CONTACT.complaints)}
        </div>

        <div class="static-section">
            <h3>🏛️ Urząd Miasta Opola</h3>
            <div class="contact-card">
                <div class="contact-name">${CITY_CONTACT.name}</div>
                <div class="contact-address">${CITY_CONTACT.address}</div>
                <div class="contact-line">📞 <a href="tel:${CITY_CONTACT.phone.replace(/\s/g, '')}">${CITY_CONTACT.phone}</a></div>
                <div class="contact-line">✉️ <a href="mailto:${CITY_CONTACT.email}">${CITY_CONTACT.email}</a></div>
                <a href="${CITY_CONTACT.website}" target="_blank" rel="noopener" class="contact-link-main">🌐 ${CITY_CONTACT.website}</a>
            </div>

            <div class="contact-card subcard">
                <div class="contact-name">${CITY_CONTACT.transport.label}</div>
                <div class="contact-info">${CITY_CONTACT.transport.info}</div>
            </div>
        </div>

        <div class="static-section">
            <h3>💻 O aplikacji</h3>
            <div class="contact-card">
                <div class="contact-name">${APP_INFO.name}</div>
                <div class="info-meta-grid">
                    <div><span class="info-key">Wersja:</span> <b>${APP_INFO.version}</b></div>
                    <div><span class="info-key">Autor:</span> <b>${APP_INFO.author}</b></div>
                    <div><span class="info-key">Repozytorium:</span> ${repoLink}</div>
                    <div><span class="info-key">Źródło danych:</span> <a href="${APP_INFO.dataSource.url}" target="_blank" rel="noopener">${APP_INFO.dataSource.name}</a></div>
                </div>
                <div class="static-callout disclaimer">
                    ${APP_INFO.disclaimer}
                </div>
            </div>
        </div>
    `;
}

function contactBlock(c) {
    const lines = [];
    if (c.phone) {
        lines.push(`<div class="contact-line">📞 <a href="tel:${c.phone.replace(/\s/g, '')}">${c.phone}</a></div>`);
    }
    if (c.email) {
        lines.push(`<div class="contact-line">✉️ <a href="mailto:${c.email}">${c.email}</a></div>`);
    }
    if (c.hours) {
        lines.push(`<div class="contact-line">🕐 ${c.hours}</div>`);
    }
    if (c.info) {
        lines.push(`<div class="contact-info">${c.info}</div>`);
    }

    return `
        <div class="contact-card subcard">
            <div class="contact-name">${c.label}</div>
            ${lines.join("")}
        </div>
    `;
}