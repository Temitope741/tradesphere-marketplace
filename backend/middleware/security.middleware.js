// middleware/security.middleware.js
const { rateLimit } = require('express-rate-limit');

// ─────────────────────────────────────────────────────────────────────────────
// 1. Database-operator injection protection
//
// MongoDB treats keys that start with "$" (like {"$gt": ""}) as query
// operators. If a client sends  { "email": { "$gt": "" } }  and we pass that
// straight into User.findOne(...), the query matches EVERY user. This removes
// any key starting with "$" or containing "." from the request before any
// controller sees it.
// ─────────────────────────────────────────────────────────────────────────────
const clean = (value) => {
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete value[key];
      } else {
        clean(value[key]);
      }
    }
  }
  return value;
};

exports.sanitizeInput = (req, res, next) => {
  if (req.body) clean(req.body);
  if (req.params) clean(req.params);
  if (req.query) clean(req.query);
  next();
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Rate limiting
// ─────────────────────────────────────────────────────────────────────────────
const limiterMessage = (text) => ({ success: false, message: text });

const baseOptions = {
  standardHeaders: true,
  legacyHeaders: false,
};

// Whole API: generous, just stops runaway scripts. Nomba's webhook is exempt
// so a payment confirmation is never blocked.
exports.apiLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 600,
  skip: (req) => req.path.startsWith('/webhooks'),
  message: limiterMessage('Too many requests. Please slow down and try again shortly.'),
});

// Login: stops password guessing. Successful logins don't count against you.
exports.loginLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: limiterMessage('Too many login attempts. Please try again in 15 minutes.'),
});

// Sign-up and password-reset requests.
exports.accountLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: limiterMessage('Too many attempts. Please try again later.'),
});

// The AI assistant is public and every message costs Gemini quota.
exports.assistantLimiter = rateLimit({
  ...baseOptions,
  windowMs: 10 * 60 * 1000,
  limit: 20,
  message: limiterMessage('You are sending messages too quickly. Please wait a few minutes.'),
});