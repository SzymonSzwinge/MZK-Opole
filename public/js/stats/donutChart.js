// Wrapper na Chart.js — jeden wykres pierścieniowy dla punktualności
let chartInstance = null;

export function renderPunctualityDonut(canvas, { onTime, delayed, early }) {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    const total = onTime + delayed + early;
    if (total === 0) return;

    const isDark = document.body.classList.contains("dark");
    const labelColor = isDark ? "#e0e0e0" : "#333";

    chartInstance = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: ["Punktualne", "Opóźnione", "Przed czasem"],
            datasets: [{
                data: [onTime, delayed, early],
                backgroundColor: ["#388e3c", "#d32f2f", "#f57c00"],
                borderColor: isDark ? "#2a2a2a" : "#fff",
                borderWidth: 2,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "65%",
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: labelColor,
                        padding: 12,
                        font: { size: 12 },
                        boxWidth: 12,
                    },
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const value = ctx.parsed;
                            const pct = ((value / total) * 100).toFixed(1);
                            return `${ctx.label}: ${value} (${pct}%)`;
                        },
                    },
                },
            },
        },
    });
}

export function destroyChart() {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}