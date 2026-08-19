/**
 * Damini Marketplace - Express Application
 */

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");
const config = require("config");

const { errorHandler, notFound } = require("./middlewares/error.middleware");
const { globalRateLimit } = require("./middlewares/rateLimit.middleware");
const { queryRows } = require("./database/connection");
const { sendSuccess } = require("./utils/response.util");
const logger = require("./utils/logger.util");

// Routes
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const vendorRoutes = require("./routes/vendor.routes");
const adminRoutes = require("./routes/admin.routes");
const productRoutes = require("./routes/product.routes");
const { categoryRouter: categoryRoutes } = require("./routes/category.routes");
const brandRoutes = require("./routes/brand.routes");
const cartRoutes = require("./routes/cart.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const orderRoutes = require("./routes/order.routes");
const paymentRoutes = require("./routes/payment.routes");
const reviewRoutes = require("./routes/review.routes");
const couponRoutes = require("./routes/coupon.routes");
const offerRoutes = require("./routes/offer.routes");
const shipmentRoutes = require("./routes/shipment.routes");
const returnRoutes = require("./routes/return.routes");
const {
  bannerRouter,
  videoRouter,
  adsRouter,
  notificationRouter,
  supportRouter,
  reportRouter,
  festivalRouter,
} = require("./routes/banner.routes");
const uploadRoutes = require("./routes/upload.routes");

const app = express();

// Trust the first proxy hop (reverse proxy / load balancer) so req.ip
// reflects the real client IP for rate limiting. Only enable in production
// where the app is actually behind a proxy.
app.set("trust proxy", config.get("app.env") === "production" ? 1 : false);

// Security
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
);

// CORS
const allowedOrigins = config.get("cors.origins");
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Logging
if (config.get("app.env") !== "test") {
  app.use(
    morgan("combined", { stream: { write: (msg) => logger.http(msg.trim()) } }),
  );
}

// IP-based rate limiting for all API routes
app.use("/api", globalRateLimit);

// Static files
// Serve public uploads (excluding kyc which is encrypted + served via protected route)
const uploadsPath = path.join(__dirname, "..", "uploads");
const uploadSubdirs = [
  "products",
  "avatars",
  "kyc",
  "banners",
  "reviews",
  "stores",
  "categories",
  "brands",
  "festivals",
  "offers",
  "videos",
];
for (const dir of uploadSubdirs) {
  fs.mkdirSync(path.join(uploadsPath, dir), { recursive: true });
}
app.use(
  "/uploads/products",
  express.static(path.join(uploadsPath, "products")),
);
app.use("/uploads/avatars", express.static(path.join(uploadsPath, "avatars")));
app.use("/uploads/banners", express.static(path.join(uploadsPath, "banners")));
app.use("/uploads/reviews", express.static(path.join(uploadsPath, "reviews")));
app.use("/uploads/stores", express.static(path.join(uploadsPath, "stores")));
app.use(
  "/uploads/categories",
  express.static(path.join(uploadsPath, "categories")),
);
app.use("/uploads/brands", express.static(path.join(uploadsPath, "brands")));
app.use(
  "/uploads/festivals",
  express.static(path.join(uploadsPath, "festivals")),
);
app.use("/uploads/offers", express.static(path.join(uploadsPath, "offers")));
app.use("/uploads/videos", express.static(path.join(uploadsPath, "videos")));

// Health check
app.get("/health", async (req, res) => {
  let db = "down";
  try {
    await queryRows("SELECT 1");
    db = "up";
  } catch (err) {
    logger.error("Health check DB error:", err.message);
  }
  res.status(200).json({
    status: db === "up" ? "ok" : "degraded",
    db,
    app: config.get("app.name"),
    version: config.get("app.version"),
    env: config.get("app.env"),
    port: process.env.PORT || config.get("app.port"),
    timestamp: new Date().toISOString(),
  });
});

// API Routes
const API = "/api/v1";

// Public platform settings (safe subset for the storefront)
const PUBLIC_SETTING_KEYS = [
  "site_name",
  "site_tagline",
  "support_email",
  "support_phone",
  "online_pay_off",
  "free_shipping_threshold",
  "shipping_charge",
  "maintenance_mode",
];

app.get(`${API}/settings`, async (req, res, next) => {
  try {
    const placeholders = PUBLIC_SETTING_KEYS.map(() => "?").join(", ");
    const rows = await queryRows(
      `SELECT \`key\`, \`value\` FROM platform_settings WHERE \`key\` IN (${placeholders})`,
      PUBLIC_SETTING_KEYS,
    );
    const obj = {};
    rows.forEach((r) => {
      obj[r.key] = r.value;
    });
    sendSuccess(res, obj);
  } catch (err) {
    next(err);
  }
});

app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/vendors`, vendorRoutes);
app.use(`${API}/admin`, adminRoutes);
app.use(`${API}/products`, productRoutes);
app.use(`${API}/categories`, categoryRoutes);
app.use(`${API}/brands`, brandRoutes);
app.use(`${API}/cart`, cartRoutes);
app.use(`${API}/wishlist`, wishlistRoutes);
app.use(`${API}/orders`, orderRoutes);
app.use(`${API}/payments`, paymentRoutes);
app.use(`${API}/reviews`, reviewRoutes);
app.use(`${API}/coupons`, couponRoutes);
app.use(`${API}/offers`, offerRoutes);
app.use(`${API}/shipments`, shipmentRoutes);
app.use(`${API}/returns`, returnRoutes);
app.use(`${API}/banners`, bannerRouter);
app.use(`${API}/videos`, videoRouter);
app.use(`${API}/ads`, adsRouter);
app.use(`${API}/notifications`, notificationRouter);
app.use(`${API}/support`, supportRouter);
app.use(`${API}/reports`, reportRouter);
app.use(`${API}/upload`, uploadRoutes);
app.use(`${API}/festival-sales`, festivalRouter);

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
