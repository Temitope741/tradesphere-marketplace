const express = require("express");
const router = express.Router();

const { chat } = require("../controllers/assistant.controller");
const { assistantLimiter } = require("../middleware/security.middleware");

// =====================================
// AI SHOPPING ASSISTANT
// =====================================

// Chat with Gemini AI (public, so it is rate limited to protect your quota)
router.post("/chat", assistantLimiter, chat);

module.exports = router;