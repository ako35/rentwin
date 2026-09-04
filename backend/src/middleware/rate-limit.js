const rateLimit = require("express-rate-limit");

// NOTE: default (in-memory) store. On Vercel's serverless runtime this is
// per-instance, not global — it blunts rapid bursts from one client but is not
// a distributed limiter. Swap in a shared store (Upstash/Vercel KV) later if
// abuse becomes a real problem.
const make = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message },
  });

// Credential endpoints — brute-force protection.
const authLimiter = make(
  15 * 60 * 1000,
  30,
  "Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin."
);

// Public unauthenticated writes (contact form, etc.) — spam protection.
const publicWriteLimiter = make(
  60 * 60 * 1000,
  20,
  "Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin."
);

module.exports = { authLimiter, publicWriteLimiter };
