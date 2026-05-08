// Wrapper dla async route handlers - eliminuje powtarzający się try/catch.
// Użycie: app.get("/api/foo", asyncHandler(async (req, res) => { ... }));

function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((err) => {
            console.error(`[${req.method} ${req.path}]`, err.message);
            res.status(500).json({ error: err.message });
        });
    };
}

module.exports = { asyncHandler };