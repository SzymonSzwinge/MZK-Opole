// Zbiera shape'y dla wszystkich wariantów które się pojawiają jako aktywne pojazdy.
// Działa w tle, nie blokuje requestów.

const { getRunningVehicles } = require("./vehicles");
const { fetchShapeForCourse, saveShapeIfBetter } = require("./courses");
const { courseShapeCache } = require("./cache");

let isWarming = false;
const seenVariants = new Map(); // variantId -> lastTriedAt

const RETRY_INTERVAL = 30 * 60 * 1000; // 30 min — nie próbujemy częściej niż raz na 30 min
const BATCH_SIZE = 5; // ile wariantów pobierać jednocześnie

async function warmShapesOnce() {
    if (isWarming) return;
    isWarming = true;

    try {
        const running = await getRunningVehicles();
        const now = Date.now();

        // Grupuj kursy po variantId
        const byVariant = new Map();
        for (const v of running) {
            if (!v.variantLoid || !v.courseLoid) continue;
            if (!byVariant.has(v.variantLoid)) {
                byVariant.set(v.variantLoid, []);
            }
            byVariant.get(v.variantLoid).push(v.courseLoid);
        }

        // Wybierz warianty które trzeba pobrać:
        //  - nie ma ich w cache, LUB
        //  - są w cache ale shape krótki (<30 pkt) i nie próbowaliśmy od 30 min
        const todo = [];
        for (const [variantId, courseIds] of byVariant.entries()) {
            const cached = courseShapeCache.get(variantId);
            const shapeLen = cached?.data?.length || 0;

            if (shapeLen >= 30) continue; // mamy dobry shape

            const lastTry = seenVariants.get(variantId) || 0;
            if (now - lastTry < RETRY_INTERVAL) continue;

            todo.push({ variantId, courseIds });
            seenVariants.set(variantId, now);
        }

        if (todo.length === 0) {
            return;
        }

        console.log(`[shapeWarmer] pobieram shape dla ${todo.length} wariantów`);

        // Iteruj batchami
        for (let i = 0; i < todo.length; i += BATCH_SIZE) {
            const batch = todo.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async ({ variantId, courseIds }) => {
                // Próbujemy max 3 kursy z każdego wariantu
                for (const courseId of courseIds.slice(0, 3)) {
                    const shape = await fetchShapeForCourse(courseId);
                    if (shape.length > 0) {
                        const saved = saveShapeIfBetter(variantId, shape);
                        if (saved && shape.length >= 30) {
                            return; // mamy dobry shape, kończymy ten wariant
                        }
                    }
                }
            }));
        }

        console.log(`[shapeWarmer] zakończono`);
    } catch (err) {
        console.error("[shapeWarmer] błąd:", err.message);
    } finally {
        isWarming = false;
    }
}

function startShapeWarmer() {
    // Pierwsze odpalenie po 5 sekundach od startu serwera
    setTimeout(() => {
        warmShapesOnce();
        // Potem co 2 minuty — żeby łapać nowe warianty które się pojawiają w ciągu dnia
        setInterval(warmShapesOnce, 2 * 60 * 1000);
    }, 5000);

    console.log("[shapeWarmer] uruchomiony — pierwsze pobieranie za 5s, potem co 2 min");
}

module.exports = { startShapeWarmer, warmShapesOnce };