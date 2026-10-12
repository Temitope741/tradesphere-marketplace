// controllers/assistant.controller.js
const { GoogleGenAI, Type } = require('@google/genai');
const Product = require('../models/Product.model');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// gemini-2.5-flash is the current free-tier workhorse model (no billing
// required). If you hit rate limits during heavy demo testing, swap to
// 'gemini-2.5-flash-lite' — slightly lower quality but a higher free-tier
// requests-per-minute ceiling.
const MODEL = 'gemini-2.5-flash';

// ─── System prompt ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Sphere, TradeSphere's shopping assistant.

Rules:
- Only recommend products returned by the search_products tool. Never invent product names, prices, vendors, or stock levels.
- Prices are in Nigerian Naira. Always format with commas, e.g. ₦18,000.
- If search_products returns no results, say so honestly and suggest the customer browse /shop or try different search terms.
- Keep replies short and friendly (2-4 sentences). Product details are shown as cards below your message, so don't re-list every field — just guide the customer (e.g. "Here are a few options under ₦20,000").
- If a question is unrelated to shopping on TradeSphere (e.g. medical, legal, or financial advice), politely decline and redirect to shopping help.
- Never ask the customer for payment details, card numbers, or passwords.`;

const searchProductsDeclaration = {
  name: 'search_products',
  description:
    'Search the TradeSphere product catalog by keyword and/or price range. Use this whenever the customer asks about products, categories, or budgets.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'Keyword to match against product name/description, e.g. "wireless earbuds"',
      },
      minPrice: { type: Type.NUMBER, description: 'Minimum price in Naira' },
      maxPrice: { type: Type.NUMBER, description: 'Maximum price in Naira' },
      limit: { type: Type.NUMBER, description: 'Max results to return, default 6, max 10' },
    },
  },
};

async function runSearchProducts(args = {}) {
  const { query, minPrice, maxPrice, limit = 6 } = args;
  const filter = { isActive: true };

  if (query) {
    filter.$or = [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
    ];
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const products = await Product.find(filter)
    .select('name price imageUrl category vendor averageRating stockQuantity')
    .populate('category', 'name')
    .populate('vendor', 'fullName')
    .lean()
    .limit(Math.min(Number(limit) || 6, 10))
    .sort({ averageRating: -1 });

  return products;
}

// @desc    Chat with the AI shopping assistant
// @route   POST /api/assistant/chat
// @access  Public (works for guests and logged-in users)
exports.chat = async (req, res, next) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'messages array is required',
      });
    }

    // Cap history sent to the model — keeps latency/quota usage predictable.
    const trimmed = messages.slice(-10);
    const lastMessage = trimmed[trimmed.length - 1];
    const priorHistory = trimmed.slice(0, -1);

    // Gemini's chat history format: { role: 'user' | 'model', parts: [{ text }] }
    const history = priorHistory.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const chat = ai.chats.create({
      model: MODEL,
      history,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ functionDeclarations: [searchProductsDeclaration] }],
      },
    });

    let response = await chat.sendMessage({ message: lastMessage.content });
    let productsShown = [];

    const parts = response.candidates?.[0]?.content?.parts || [];
    const functionCallPart = parts.find((p) => p.functionCall);

    if (functionCallPart) {
      const { name, args } = functionCallPart.functionCall;

      if (name === 'search_products') {
        const results = await runSearchProducts(args);
        productsShown = results;

        const functionResponsePayload = results.map((p) => ({
          id: p._id,
          name: p.name,
          price: p.price,
          stock: p.stockQuantity,
          rating: p.averageRating,
          vendor: p.vendor?.fullName,
          category: p.category?.name,
        }));

        response = await chat.sendMessage({
          message: {
            functionResponse: {
              name,
              response: { products: functionResponsePayload },
            },
          },
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: response.text,
      products: productsShown,
    });
  } catch (error) {
    console.error('Assistant chat error:', error);
    next(error);
  }
};