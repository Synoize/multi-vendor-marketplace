/**
 * Damini Marketplace - Express Application
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const config = require('config');

const { errorHandler, notFound } = require('./middlewares/error.middleware');
const { globalRateLimit } = require('./middlewares/rateLimit.middleware');
const logger = require('./utils/logger.util');

// Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const vendorRoutes = require('./routes/vendor.routes');
const adminRoutes = require('./routes/admin.routes');
const productRoutes = require('./routes/product.routes');
const { categoryRouter: categoryRoutes } = require('./routes/category.routes');
const brandRoutes = require('./routes/brand.routes');
const cartRoutes = require('./routes/cart.routes');
const wishlistRoutes = require('./routes/wishlist.routes');
const orderRoutes = require('./routes/order.routes');
const paymentRoutes = require('./routes/payment.routes');
const reviewRoutes = require('./routes/review.routes');
const couponRoutes = require('./routes/coupon.routes');
const shipmentRoutes = require('./routes/shipment.routes');
const returnRoutes = require('./routes/return.routes');
const { bannerRouter, videoRouter, adsRouter, notificationRouter, supportRouter, reportRouter } = require('./routes/banner.routes');
const uploadRoutes = require('./routes/upload.routes');

const app = express();

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));

// CORS
const allowedOrigins = config.get('cors.origins');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging
if (config.get('app.env') !== 'test') {
  app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));
}

// Rate limiting
app.use('/api', globalRateLimit);

// Static files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: config.get('app.name'), version: config.get('app.version'), env: config.get('app.env'), timestamp: new Date().toISOString() });
});

// API Routes
const API = '/api/v1';
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
app.use(`${API}/shipments`, shipmentRoutes);
app.use(`${API}/returns`, returnRoutes);
app.use(`${API}/banners`, bannerRouter);
app.use(`${API}/videos`, videoRouter);
app.use(`${API}/ads`, adsRouter);
app.use(`${API}/notifications`, notificationRouter);
app.use(`${API}/support`, supportRouter);
app.use(`${API}/reports`, reportRouter);
app.use(`${API}/upload`, uploadRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
