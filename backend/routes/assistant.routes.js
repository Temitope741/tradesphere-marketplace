const express = require("express");
const router = express.Router();

const { chat } = require("../controllers/assistant.controller");

// =====================================
// AI SHOPPING ASSISTANT
// =====================================

// Chat with Gemini AI
router.post("/chat", chat);

module.exports = router;