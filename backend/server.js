const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');

dotenv.config();

const app = express();

// ===============================
// IMPORT ROUTES
// ===============================
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const reviewRoutes = require('./routes/review.routes');
const wishlistRoutes = require('./routes/wishlist.routes');
const vendorRoutes = require('./routes/vendor.routes');
const uploadRoutes = require('./routes/upload.routes');
const assistantRoutes = require('./routes/assistant.routes');
const webhookRoutes = require('./routes/webhook.routes');

// Error Handler
const errorHandler = require('./middleware/errorHandler');

// ===============================
// SECURITY MIDDLEWARE
// ===============================
app.use(helmet());

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.LOCAL_URL,
  "https://tradesphere-1-yzn8.onrender.com",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:8081"
];

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("❌ Blocked Origin:", origin);

    return callback(new Error("CORS policy does not allow access from this origin."));
  },
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

// ===============================
// DEBUG LOGGER
// ===============================
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.originalUrl}`);
  next();
});

// ===============================
// DATABASE CONNECTION
// ===============================
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  });

// ===============================
// HEALTH CHECK
// ===============================
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString()
  });
});

// ===============================
// API ROUTES
// ===============================
console.log("📋 Registering routes...");

app.use("/api/auth", authRoutes);
console.log("✅ Auth routes registered");

app.use("/api/users", userRoutes);
console.log("✅ User routes registered");

app.use("/api/products", productRoutes);
console.log("✅ Product routes registered");

app.use("/api/categories", categoryRoutes);
console.log("✅ Category routes registered");

app.use("/api/cart", cartRoutes);
console.log("✅ Cart routes registered");

app.use("/api/orders", orderRoutes);
console.log("✅ Order routes registered");

app.use("/api/reviews", reviewRoutes);
console.log("✅ Review routes registered");

app.use("/api/wishlist", wishlistRoutes);
console.log("✅ Wishlist routes registered");

app.use("/api/vendor", vendorRoutes);
console.log("✅ Vendor routes registered");

app.use("/api/upload", uploadRoutes);
console.log("✅ Upload routes registered");

// ✅ AI Shopping Assistant
app.use("/api/assistant", assistantRoutes);
console.log("✅ Assistant routes registered");

app.use("/api/webhooks", webhookRoutes);
console.log("✅ Webhook routes registered");

// ===============================
// 404 HANDLER
// ===============================
app.use("*", (req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);

  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
    method: req.method
  });
});

// ===============================
// ERROR HANDLER
// ===============================
app.use(errorHandler);

// ===============================
// SERVER
// ===============================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
});

// ===============================
// UNHANDLED PROMISES
// ===============================
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err.message);
  process.exit(1);
});

module.exports = app;