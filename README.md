# 🛍️ Damini Marketplace

**India's Favourite Multi-Vendor Marketplace** — A production-ready, scalable e-commerce platform built with a Flipkart-level architecture, unique Damini branding, and enterprise-grade features.

---

## 📦 Project Structure

```
damini-marketplace/
├── server/          # Node.js + Express REST API (port 5000)
├── app/             # Customer App - React (port 5173)
├── vendor/          # Vendor Panel - React (port 5174)
├── admin/           # Admin Panel - React (port 5175)
├── adsmanager/      # Ads Manager - React (port 5176)
└── package.json     # Root monorepo config
```

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js, Express.js, MySQL2, Socket.io |
| **Frontend** | React.js, Vite, Tailwind CSS, Shadcn UI |
| **State** | Zustand, TanStack Query |
| **Auth** | JWT (access + refresh tokens), HttpOnly cookies |
| **Payments** | Razorpay (UPI, Cards, COD) |
| **Shipping** | Shiprocket API |
| **Real-time** | Socket.io (order updates, notifications, support chat) |
| **Email** | Nodemailer + Gmail SMTP |
| **Security** | Helmet, Rate Limiting, Zod validation, bcrypt |

---

## ⚡ Quick Start

### Prerequisites
- Node.js >= 18.x
- MySQL >= 8.0
- npm >= 9.x

### 1. Clone & Install
```bash
git clone <repo-url>
cd damini-marketplace
npm run setup  # Installs all workspace dependencies
```

### 2. Configure Database
Create a MySQL database:
```sql
CREATE DATABASE damini_marketplace CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Edit `server/config/default.yaml` (or create `server/config/local.yaml` to override):
```yaml
database:
  host: localhost
  port: 3306
  name: damini_marketplace
  user: root
  password: your_mysql_password

mail:
  user: your-gmail@gmail.com
  password: your-gmail-app-password

razorpay:
  keyId: rzp_test_xxxx
  keySecret: your_secret

shiprocket:
  email: your@email.com
  password: your_password
```

### 3. Run Database Migration + Seed
```bash
npm run db:migrate   # Creates all tables
npm run db:seed      # Seeds admin, vendor, customer, categories, brands, products
```

### 4. Start All Services
```bash
npm run dev          # Starts all 5 services concurrently
```

Or start individually:
```bash
npm run dev:server   # API Server - http://localhost:5000
npm run dev:app      # Customer App - http://localhost:5173
npm run dev:vendor   # Vendor Panel - http://localhost:5174
npm run dev:admin    # Admin Panel - http://localhost:5175
npm run dev:ads      # Ads Manager - http://localhost:5176
```

---

## 🔑 Default Login Credentials (After Seed)

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@damini.com | Admin@123 |
| **Vendor** | vendor@damini.com | Vendor@123 |
| **Customer** | customer@damini.com | Customer@123 |

---

## 🏗️ Architecture Overview

```
Client Requests
      │
      ▼
  Nginx/CDN (Prod)
      │
   ┌──┴───────────────────────────────┐
   │  Express API (port 5000)         │
   │  ├── Auth Middleware (JWT)        │
   │  ├── Rate Limiting               │
   │  ├── Zod Validation              │
   │  └── Routes → Services           │
   └──────────────┬───────────────────┘
                  │
          ┌───────┴────────┐
          │                │
       MySQL            Socket.io
     (25+ tables)    (Real-time events)
```

---

## 📡 API Endpoints Reference

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /register | User registration |
| POST | /verify-email | Email OTP verification |
| POST | /login | Login (returns JWT + sets cookies) |
| POST | /forgot-password | Send password reset OTP |
| POST | /reset-password | Reset password with OTP |
| POST | /refresh | Refresh access token |
| POST | /logout | Logout (clears cookies) |
| GET | /me | Get current user |

### Products (`/api/v1/products`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | List products (with filtering, pagination, search) |
| GET | /featured | Featured products |
| GET | /trending | Trending products |
| GET | /:slug | Product detail |
| POST | / | Create product (vendor) |
| PUT | /:id | Update product (vendor) |
| DELETE | /:id | Delete product (vendor) |
| PATCH | /:id/approve | Approve product (admin) |

### Orders (`/api/v1/orders`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | / | Place order |
| GET | / | My orders |
| GET | /my/:id | Order detail |
| DELETE | /:id/cancel | Cancel order (within 15 min) |
| GET | /vendor | Vendor orders |
| GET | /admin | All orders (admin) |

### Payments (`/api/v1/payments`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /create-order | Create Razorpay order |
| POST | /verify | Verify payment signature |
| POST | /webhook | Razorpay webhook |

---

## 🏪 Features

### Customer App
- ✅ Homepage with hero banners, flash sale countdown, category pills
- ✅ Product listing with advanced filters (category, price, rating, brand)
- ✅ Product detail with image gallery, variants, reviews, pincode check
- ✅ Shopping cart with save-for-later, coupon codes
- ✅ Multi-step checkout with address management + Razorpay
- ✅ Order tracking with live status timeline
- ✅ Wishlist management
- ✅ Profile with wallet, addresses, password change
- ✅ Seller registration multi-step form
- ✅ Support tickets with live chat

### Vendor Panel
- ✅ Dashboard with revenue charts, KPI cards, low stock alerts
- ✅ Product management (add/edit/delete, image upload)
- ✅ Order management (confirm/ship/deliver)
- ✅ Payout history and pending balance
- ✅ KYC submission
- ✅ Analytics (revenue trends, top products)
- ✅ Ad campaign management

### Admin Panel
- ✅ Dashboard with platform-wide KPIs and revenue charts
- ✅ Vendor KYC approval/rejection
- ✅ Product approval queue
- ✅ User management (ban/unban)
- ✅ Order management and dispute resolution
- ✅ Coupon management
- ✅ Banner/video management
- ✅ Ad campaign approval
- ✅ Payout release
- ✅ Sales/vendor/user/ads reports
- ✅ Platform settings

### Ads Manager
- ✅ Campaign dashboard with CTR, ROAS metrics
- ✅ Campaign creation wizard (CPC/CPM)
- ✅ Product-level ad targeting
- ✅ Budget management and billing
- ✅ Analytics with per-day performance charts

---

## 🔒 Security Features

- JWT access tokens (15 min) + refresh tokens (7 days)
- HttpOnly cookies for refresh tokens
- Bcrypt password hashing (12 rounds)
- Zod input validation on all routes
- Helmet.js security headers
- Rate limiting (global + stricter on auth)
- SQL injection prevention (parameterized queries)
- CORS whitelist

---

## 📁 Database Tables

The schema includes 25+ tables:
`users`, `vendors`, `products`, `product_images`, `product_variants`, `categories`, `brands`, `orders`, `order_items`, `payments`, `refunds`, `returns`, `reviews`, `review_images`, `cart_items`, `wishlists`, `addresses`, `wallets`, `wallet_transactions`, `coupons`, `coupon_usage`, `notifications`, `shipments`, `support_tickets`, `ticket_messages`, `ads_campaigns`, `ad_products`, `ad_analytics`, `banners`, `videos`, `vendor_payouts`, `platform_settings`, `festival_sales`, `disputes`, `recently_viewed`

---

## 🌐 Production Deployment

1. Set `NODE_ENV=production`
2. Create `server/config/production.yaml` with production credentials
3. Run `npm run build` to build all frontend apps
4. Serve built files via Nginx
5. Use PM2 for process management: `pm2 start server/src/server.js`

---

## 📞 Support

For any issues, raise a GitHub issue or contact: support@damini.com

---

*Built with ❤️ in India — Damini Marketplace © 2024*
