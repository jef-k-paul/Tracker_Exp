const express = require("express");
const pool = require("../db/connections");

const router = express.Router();

// ==========================================
// 1. IN-MEMORY RATE LIMITER & FLOOD GUARD
// ==========================================
// Protects against bot floods or DDoS attacks on the health route.
// Window: 60 seconds | Limit: 60 requests per IP (cron jobs only need 1 req / 10-14 mins).
const rateLimitMap = new Map();

// Periodic garbage collection every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of rateLimitMap.entries()) {
        if (now > record.resetAt) {
            rateLimitMap.delete(ip);
        }
    }
}, CLEANUP_INTERVAL_MS).unref(); // .unref() ensures this timer won't prevent process exit

const healthRateLimiter = (req, res, next) => {
    // If a valid secret key is provided, bypass rate limiter
    const secret = process.env.HEALTH_CHECK_SECRET;
    const providedKey = req.headers["x-health-key"] || req.query.key || req.query.token;
    if (secret && providedKey && providedKey === secret) {
        return next();
    }

    const clientIp = req.ip || req.connection?.remoteAddress || "unknown";
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 60; // 60 req/min is generous for cron jobs while stopping floods

    let record = rateLimitMap.get(clientIp);

    if (!record || now > record.resetAt) {
        record = { count: 1, resetAt: now + windowMs };
        rateLimitMap.set(clientIp, record);
        return next();
    }

    record.count += 1;
    if (record.count > maxRequests) {
        return res.status(429).json({
            status: "error",
            message: "Too many health check requests. Please reduce ping frequency."
        });
    }

    next();
};

// ==========================================
// 2. OPTIONAL SECRET TOKEN AUTHENTICATION
// ==========================================
// If HEALTH_CHECK_SECRET is configured in .env / Render, requests must provide it.
// If NOT configured (default), open pings from cron-job.org / UptimeRobot are allowed.
const verifyHealthSecret = (req, res, next) => {
    const secret = process.env.HEALTH_CHECK_SECRET;
    if (!secret) {
        return next(); // Open mode (standard for cloud health checkers)
    }

    const providedKey = req.headers["x-health-key"] || req.query.key || req.query.token;
    if (providedKey !== secret) {
        return res.status(403).json({
            status: "error",
            message: "Forbidden: Invalid or missing health check key."
        });
    }

    next();
};

// ==========================================
// 3. ANTI-CACHE & SECURITY HEADERS
// ==========================================
// Guarantees intermediate proxies / CDNs do not cache the response,
// ensuring every ping actually hits Render's server to keep it awake.
const applyHealthHeaders = (req, res, next) => {
    res.set({
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "Surrogate-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
    });
    next();
};

// Apply security middleware stack
router.use(applyHealthHeaders);
router.use(healthRateLimiter);
router.use(verifyHealthSecret);

// ==========================================
// 4. KEEP-ALIVE PING (ZERO DATABASE OVERHEAD)
// ==========================================
// GET /api/health or GET /health
// Pure in-memory response (<1ms execution time).
// Resets Render's 15-minute inactivity timer with 0 DB pool usage.
router.get("/", (req, res) => {
    res.status(200).json({
        status: "healthy",
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

// Also support HEAD requests (often used by lightweight pingers to save bandwidth)
router.head("/", (req, res) => {
    res.status(200).end();
});

// ==========================================
// 5. DEEP DATABASE HEALTH CHECK (OPTIONAL)
// ==========================================
// GET /api/health/db or GET /health/db
// Used for internal diagnostics or deep health inspection.
router.get("/db", (req, res) => {
    // Ping database with a lightweight SELECT 1 query
    pool.query("SELECT 1 AS alive", (err, results) => {
        if (err || !results || results.length === 0) {
            console.error("Health Check DB Ping Failed:", err?.message || "No results");
            return res.status(503).json({
                status: "unhealthy",
                database: "disconnected",
                timestamp: new Date().toISOString()
            });
        }

        res.status(200).json({
            status: "healthy",
            database: "connected",
            timestamp: new Date().toISOString()
        });
    });
});

// ==========================================
// 6. METHOD GUARD
// ==========================================
// Reject any unhandled routes or non-GET methods on /health
router.use((req, res) => {
    res.status(405).json({
        status: "error",
        message: "Method Not Allowed"
    });
});

module.exports = router;
