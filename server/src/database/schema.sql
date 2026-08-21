-- ============================================================
-- Damini Marketplace - Complete MySQL Schema
-- Version: 1.0.0
-- Charset: utf8mb4 | Engine: InnoDB
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO';

-- ─────────────────────────────────────────────────────────────
-- Create Database
-- ─────────────────────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS u228855643_thedaminiedit
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE u228855643_thedaminiedit;

-- ─────────────────────────────────────────────────────────────
-- TABLE: users
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            CHAR(36)        NOT NULL DEFAULT (UUID()),
  name          VARCHAR(100)    NOT NULL,
  email         VARCHAR(191)    NOT NULL,
  phone         VARCHAR(15)     NULL,
  password_hash VARCHAR(255)    NOT NULL,
  avatar        VARCHAR(500)    NULL,
  role          ENUM('customer','vendor','admin') NOT NULL DEFAULT 'customer',
  is_verified   TINYINT(1)      NOT NULL DEFAULT 0,
  is_active     TINYINT(1)      NOT NULL DEFAULT 1,
  otp           VARCHAR(10)     NULL,
  otp_expires   DATETIME        NULL,
  referral_code VARCHAR(20)     NULL,
  referred_by   CHAR(36)        NULL,
  last_login    DATETIME        NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_referral (referral_code),
  INDEX idx_users_phone (phone),
  INDEX idx_users_role (role),
  INDEX idx_users_is_active (is_active),
  CONSTRAINT fk_users_referred_by FOREIGN KEY (referred_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: refresh_tokens
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          CHAR(36)   NOT NULL DEFAULT (UUID()),
  user_id     CHAR(36)   NOT NULL,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  DATETIME   NOT NULL,
  created_at  DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_rt_user (user_id),
  INDEX idx_rt_expires (expires_at),
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: categories
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  parent_id   INT UNSIGNED    NULL,
  name        VARCHAR(100)    NOT NULL,
  slug        VARCHAR(120)    NOT NULL,
  description TEXT            NULL,
  image       VARCHAR(500)    NULL,
  icon        VARCHAR(100)    NULL,
  banner      VARCHAR(500)    NULL,
  sort_order  INT             NOT NULL DEFAULT 0,
  is_active   TINYINT(1)      NOT NULL DEFAULT 1,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug),
  INDEX idx_categories_parent (parent_id),
  INDEX idx_categories_active (is_active),
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: brands
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brands (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100)    NOT NULL,
  slug        VARCHAR(120)    NOT NULL,
  logo        VARCHAR(500)    NULL,
  description TEXT            NULL,
  is_active   TINYINT(1)      NOT NULL DEFAULT 1,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_brands_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: vendors
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
  id                  CHAR(36)        NOT NULL DEFAULT (UUID()),
  user_id             CHAR(36)        NOT NULL,
  business_name       VARCHAR(200)    NOT NULL,
  business_type       ENUM('individual','proprietorship','partnership','private_limited','public_limited','llp') NOT NULL DEFAULT 'individual',
  business_email      VARCHAR(200)    NULL,
  business_email_verified TINYINT(1)  NOT NULL DEFAULT 0,
  gst_number          VARCHAR(20)     NULL,
  pan_number          VARCHAR(20)     NULL,
  gst_certificate     VARCHAR(500)    NULL,
  pan_image           VARCHAR(500)    NULL,
  aadhar_image_front  VARCHAR(500)    NULL,
  aadhar_image_back   VARCHAR(500)    NULL,
  passport_photo      VARCHAR(500)    NULL,
  udyam_certificate   VARCHAR(500)    NULL,
  bank_passbook       VARCHAR(500)    NULL,
  kyc_status          ENUM('pending','submitted','under_review','approved','rejected') NOT NULL DEFAULT 'pending',
  kyc_rejected_reason TEXT            NULL,
  business_email_otp        VARCHAR(200)    NULL,
  business_email_otp_expires DATETIME       NULL,
  -- Bank Details
  bank_name           VARCHAR(100)    NULL,
  account_number      VARCHAR(50)     NULL,
  ifsc_code           VARCHAR(20)     NULL,
  account_holder      VARCHAR(100)    NULL,
  cancelled_cheque    VARCHAR(500)    NULL,
  -- Pickup Address
  pickup_name         VARCHAR(100)    NULL,
  pickup_phone        VARCHAR(15)     NULL,
  pickup_line1        VARCHAR(255)    NULL,
  pickup_line2        VARCHAR(255)    NULL,
  pickup_city         VARCHAR(100)    NULL,
  pickup_state        VARCHAR(100)    NULL,
  pickup_pincode      VARCHAR(10)     NULL,
  -- Settings
  commission_rate     DECIMAL(5,2)    NOT NULL DEFAULT 5.00,
  is_active           TINYINT(1)      NOT NULL DEFAULT 1,
  is_featured         TINYINT(1)      NOT NULL DEFAULT 0,
  store_name          VARCHAR(200)    NULL,
  store_logo          VARCHAR(500)    NULL,
  store_banner        VARCHAR(500)    NULL,
  store_description   TEXT            NULL,
  total_sales         DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  rating              DECIMAL(3,2)    NOT NULL DEFAULT 0.00,
  total_reviews       INT             NOT NULL DEFAULT 0,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_vendors_user (user_id),
  INDEX idx_vendors_kyc (kyc_status),
  INDEX idx_vendors_active (is_active),
  CONSTRAINT fk_vendors_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: products
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id                  CHAR(36)        NOT NULL DEFAULT (UUID()),
  vendor_id           CHAR(36)        NOT NULL,
  category_id         INT UNSIGNED    NOT NULL,
  brand_id            INT UNSIGNED    NULL,
  name                VARCHAR(500)    NOT NULL,
  slug                VARCHAR(520)    NOT NULL,
  description         LONGTEXT        NULL,
  short_description   TEXT            NULL,
  price               DECIMAL(10,2)   NOT NULL,
  mrp                 DECIMAL(10,2)   NOT NULL,
  cost_price          DECIMAL(10,2)   NULL,
  stock               INT             NOT NULL DEFAULT 0,
  low_stock_threshold INT             NOT NULL DEFAULT 5,
  sku                 VARCHAR(100)    NULL,
  barcode             VARCHAR(100)    NULL,
  weight              DECIMAL(8,2)    NULL COMMENT 'in grams',
  dimensions          JSON            NULL COMMENT '{length, width, height} in cm',
  -- Return Policy
  is_returnable       TINYINT(1)      NOT NULL DEFAULT 1,
  return_type         ENUM('full_return','replacement_only','refund_only','no_return') NOT NULL DEFAULT 'full_return',
  return_window       INT             NOT NULL DEFAULT 7 COMMENT 'days',
  -- Status & Approval
  status              ENUM('draft','inactive','pending','active','rejected','blocked','out_of_stock','discontinued') NOT NULL DEFAULT 'pending',
  rejection_reason    TEXT            NULL,
  is_featured         TINYINT(1)      NOT NULL DEFAULT 0,
  is_cod_available    TINYINT(1)      NOT NULL DEFAULT 1,
  -- SEO
  seo_title           VARCHAR(200)    NULL,
  seo_description     VARCHAR(500)    NULL,
  seo_keywords        VARCHAR(300)    NULL,
  -- Analytics
  view_count          INT             NOT NULL DEFAULT 0,
  sale_count          INT             NOT NULL DEFAULT 0,
  rating              DECIMAL(3,2)    NOT NULL DEFAULT 0.00,
  total_reviews       INT             NOT NULL DEFAULT 0,
  -- Tags/Search
  tags                JSON            NULL,
  -- Timestamps
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at          DATETIME        NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_slug (slug),
  INDEX idx_products_vendor (vendor_id),
  INDEX idx_products_category (category_id),
  INDEX idx_products_brand (brand_id),
  INDEX idx_products_status (status),
  INDEX idx_products_price (price),
  INDEX idx_products_rating (rating),
  INDEX idx_products_featured (is_featured),
  INDEX idx_products_sale_count (sale_count),
  FULLTEXT INDEX ft_products_search (name, description),
  CONSTRAINT fk_products_vendor FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (id),
  CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: product_images
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  product_id  CHAR(36)        NOT NULL,
  url         VARCHAR(500)    NOT NULL,
  alt_text    VARCHAR(200)    NULL,
  is_primary  TINYINT(1)      NOT NULL DEFAULT 0,
  sort_order  INT             NOT NULL DEFAULT 0,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_pi_product (product_id),
  CONSTRAINT fk_pi_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: product_variants
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id          CHAR(36)        NOT NULL DEFAULT (UUID()),
  product_id  CHAR(36)        NOT NULL,
  sku         VARCHAR(100)    NOT NULL,
  name        VARCHAR(200)    NOT NULL COMMENT 'e.g. Red / XL',
  attributes  JSON            NOT NULL COMMENT '{color: "Red", size: "XL"}',
  price       DECIMAL(10,2)   NOT NULL,
  mrp         DECIMAL(10,2)   NOT NULL,
  stock       INT             NOT NULL DEFAULT 0,
  image       VARCHAR(500)    NULL,
  is_active   TINYINT(1)      NOT NULL DEFAULT 1,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pv_sku (sku),
  INDEX idx_pv_product (product_id),
  CONSTRAINT fk_pv_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: addresses
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS addresses (
  id          CHAR(36)        NOT NULL DEFAULT (UUID()),
  user_id     CHAR(36)        NOT NULL,
  name        VARCHAR(100)    NOT NULL,
  phone       VARCHAR(15)     NOT NULL,
  email       VARCHAR(200)    NULL,
  line1       VARCHAR(255)    NOT NULL,
  line2       VARCHAR(255)    NULL,
  landmark    VARCHAR(200)    NULL,
  city        VARCHAR(100)    NOT NULL,
  state       VARCHAR(100)    NOT NULL,
  pincode     VARCHAR(10)     NOT NULL,
  country     VARCHAR(50)     NOT NULL DEFAULT 'India',
  type        ENUM('home','work','other') NOT NULL DEFAULT 'home',
  is_default  TINYINT(1)      NOT NULL DEFAULT 0,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_addresses_user (user_id),
  CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: carts
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS carts (
  id          CHAR(36)        NOT NULL DEFAULT (UUID()),
  user_id     CHAR(36)        NOT NULL,
  product_id  CHAR(36)        NOT NULL,
  variant_id  CHAR(36)        NULL,
  quantity    INT             NOT NULL DEFAULT 1,
  saved_for_later TINYINT(1)  NOT NULL DEFAULT 0,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cart_item (user_id, product_id, variant_id),
  INDEX idx_cart_user (user_id),
  INDEX idx_cart_product (product_id),
  CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_variant FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: wishlists
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlists (
  id          CHAR(36)        NOT NULL DEFAULT (UUID()),
  user_id     CHAR(36)        NOT NULL,
  product_id  CHAR(36)        NOT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wishlist (user_id, product_id),
  INDEX idx_wishlist_user (user_id),
  CONSTRAINT fk_wl_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_wl_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: coupons
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  code            VARCHAR(50)     NOT NULL,
  title           VARCHAR(200)    NOT NULL,
  description     TEXT            NULL,
  type            ENUM('percentage','fixed','free_shipping') NOT NULL,
  discount_value  DECIMAL(10,2)   NOT NULL,
  max_discount    DECIMAL(10,2)   NULL COMMENT 'Cap for percentage discounts',
  min_order_amount DECIMAL(10,2)  NULL,
  max_uses        INT             NULL COMMENT 'NULL = unlimited',
  max_uses_per_user INT           NOT NULL DEFAULT 1,
  used_count      INT             NOT NULL DEFAULT 0,
  applicable_to   ENUM('all','category','product','vendor') NOT NULL DEFAULT 'all',
  applicable_id   VARCHAR(100)    NULL,
  vendor_id       CHAR(36)        NULL COMMENT 'Vendor-specific coupon',
  valid_from      DATETIME        NOT NULL,
  valid_to        DATETIME        NOT NULL,
  is_active       TINYINT(1)      NOT NULL DEFAULT 1,
  is_festival     TINYINT(1)      NOT NULL DEFAULT 0,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_coupons_code (code),
  INDEX idx_coupons_active (is_active),
  INDEX idx_coupons_dates (valid_from, valid_to),
  CONSTRAINT fk_coupons_vendor FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: orders
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                CHAR(36)        NOT NULL DEFAULT (UUID()),
  order_number      VARCHAR(30)     NOT NULL,
  user_id           CHAR(36)        NOT NULL,
  address_id        CHAR(36)        NOT NULL,
  coupon_id         INT UNSIGNED    NULL,
  subtotal          DECIMAL(12,2)   NOT NULL,
  discount          DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  shipping_charges  DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  total             DECIMAL(12,2)   NOT NULL,
  payment_method    ENUM('cod','razorpay','wallet') NOT NULL DEFAULT 'cod',
  coins_redeemed    INT UNSIGNED    NOT NULL DEFAULT 0,
  coins_discount    DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  payment_status    ENUM('pending','paid','failed','refunded','partially_refunded') NOT NULL DEFAULT 'pending',
  status            ENUM('placed','confirmed','processing','shipped','out_for_delivery','delivered','cancelled','return_requested','returned') NOT NULL DEFAULT 'placed',
  notes             TEXT            NULL,
  cancel_reason     TEXT            NULL,
  cancelled_at      DATETIME        NULL,
  cancel_deadline   DATETIME        NULL COMMENT '15 min window',
  delivered_at      DATETIME        NULL,
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_number (order_number),
  INDEX idx_orders_user (user_id),
  INDEX idx_orders_status (status),
  INDEX idx_orders_payment_status (payment_status),
  INDEX idx_orders_created (created_at),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_orders_address FOREIGN KEY (address_id) REFERENCES addresses (id),
  CONSTRAINT fk_orders_coupon FOREIGN KEY (coupon_id) REFERENCES coupons (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: order_items
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id                CHAR(36)        NOT NULL DEFAULT (UUID()),
  order_id          CHAR(36)        NOT NULL,
  product_id        CHAR(36)        NOT NULL,
  vendor_id         CHAR(36)        NOT NULL,
  variant_id        CHAR(36)        NULL,
  product_name      VARCHAR(500)    NOT NULL COMMENT 'Snapshot at order time',
  product_image     VARCHAR(500)    NULL,
  variant_name      VARCHAR(200)    NULL,
  quantity          INT             NOT NULL DEFAULT 1,
  unit_price        DECIMAL(10,2)   NOT NULL,
  total_price       DECIMAL(12,2)   NOT NULL,
  commission_rate   DECIMAL(5,2)    NOT NULL,
  commission_amount DECIMAL(10,2)   NOT NULL,
  vendor_payout     DECIMAL(10,2)   NOT NULL,
  status            ENUM('placed','confirmed','processing','shipped','out_for_delivery','delivered','cancelled','return_requested','returned','exchange_requested') NOT NULL DEFAULT 'placed',
  return_type       ENUM('full_return','replacement_only','refund_only','no_return') NOT NULL DEFAULT 'full_return',
  return_window     INT             NOT NULL DEFAULT 7,
  is_reviewed       TINYINT(1)      NOT NULL DEFAULT 0,
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_oi_order (order_id),
  INDEX idx_oi_vendor (vendor_id),
  INDEX idx_oi_product (product_id),
  INDEX idx_oi_status (status),
  CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES products (id),
  CONSTRAINT fk_oi_vendor FOREIGN KEY (vendor_id) REFERENCES vendors (id),
  CONSTRAINT fk_oi_variant FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: payments
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                    CHAR(36)        NOT NULL DEFAULT (UUID()),
  order_id              CHAR(36)        NOT NULL,
  user_id               CHAR(36)        NOT NULL,
  razorpay_order_id     VARCHAR(100)    NULL,
  razorpay_payment_id   VARCHAR(100)    NULL,
  razorpay_signature    VARCHAR(300)    NULL,
  amount                DECIMAL(12,2)   NOT NULL,
  currency              VARCHAR(10)     NOT NULL DEFAULT 'INR',
  method                ENUM('cod','card','upi','netbanking','wallet','emi') NULL,
  status                ENUM('created','authorized','captured','failed','refunded') NOT NULL DEFAULT 'created',
  failure_reason        TEXT            NULL,
  paid_at               DATETIME        NULL,
  created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payments_rz_order (razorpay_order_id),
  INDEX idx_payments_order (order_id),
  INDEX idx_payments_user (user_id),
  INDEX idx_payments_status (status),
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders (id),
  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: checkout_sessions (pending Razorpay payments; order is
-- only created after payment is captured & verified)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkout_sessions (
  id                CHAR(36)        NOT NULL DEFAULT (UUID()),
  user_id           CHAR(36)        NOT NULL,
  razorpay_order_id VARCHAR(100)    NOT NULL,
  payload           JSON            NOT NULL COMMENT 'Checkout payload used to create the order on verify',
  amount            DECIMAL(12,2)   NOT NULL,
  status            ENUM('pending','completed','expired','failed') NOT NULL DEFAULT 'pending',
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at        DATETIME        NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cs_rz_order (razorpay_order_id),
  INDEX idx_cs_user (user_id),
  INDEX idx_cs_status (status),
  CONSTRAINT fk_cs_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: shipments
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipments (
  id                  CHAR(36)        NOT NULL DEFAULT (UUID()),
  order_id            CHAR(36)        NOT NULL,
  order_item_id       CHAR(36)        NULL,
  vendor_id           CHAR(36)        NOT NULL,
  shiprocket_order_id VARCHAR(100)    NULL,
  shiprocket_id       VARCHAR(100)    NULL,
  awb_code            VARCHAR(100)    NULL,
  courier_name        VARCHAR(100)    NULL,
  courier_id          VARCHAR(50)     NULL,
  tracking_url        VARCHAR(500)    NULL,
  label_url           VARCHAR(500)    NULL,
  manifest_url        VARCHAR(500)    NULL,
  status              ENUM('pending','processing','ready_to_ship','shipped','in_transit','out_for_delivery','delivered','cancelled','lost','rto_initiated','rto_delivered') NOT NULL DEFAULT 'pending',
  pickup_date         DATE            NULL,
  estimated_delivery  DATE            NULL,
  delivered_at        DATETIME        NULL,
  tracking_history    JSON            NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_shipments_order (order_id),
  INDEX idx_shipments_vendor (vendor_id),
  INDEX idx_shipments_awb (awb_code),
  CONSTRAINT fk_shipments_order FOREIGN KEY (order_id) REFERENCES orders (id),
  CONSTRAINT fk_shipments_vendor FOREIGN KEY (vendor_id) REFERENCES vendors (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: returns
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS returns (
  id              CHAR(36)        NOT NULL DEFAULT (UUID()),
  order_id        CHAR(36)        NOT NULL,
  order_item_id   CHAR(36)        NOT NULL,
  user_id         CHAR(36)        NOT NULL,
  vendor_id       CHAR(36)        NOT NULL,
  reason          VARCHAR(500)    NOT NULL,
  description     TEXT            NULL,
  images          JSON            NULL,
  type            ENUM('return','replacement','exchange') NOT NULL DEFAULT 'return',
  status          ENUM('requested','under_review','approved','rejected','pickup_scheduled','picked_up','quality_check','completed','cancelled') NOT NULL DEFAULT 'requested',
  admin_notes     TEXT            NULL,
  pickup_date     DATE            NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_returns_order (order_id),
  INDEX idx_returns_user (user_id),
  INDEX idx_returns_vendor (vendor_id),
  INDEX idx_returns_status (status),
  CONSTRAINT fk_returns_order FOREIGN KEY (order_id) REFERENCES orders (id),
  CONSTRAINT fk_returns_item FOREIGN KEY (order_item_id) REFERENCES order_items (id),
  CONSTRAINT fk_returns_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_returns_vendor FOREIGN KEY (vendor_id) REFERENCES vendors (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: refunds
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refunds (
  id                    CHAR(36)        NOT NULL DEFAULT (UUID()),
  order_id              CHAR(36)        NOT NULL,
  payment_id            CHAR(36)        NOT NULL,
  return_id             CHAR(36)        NULL,
  user_id               CHAR(36)        NOT NULL,
  amount                DECIMAL(12,2)   NOT NULL,
  reason                TEXT            NOT NULL,
  razorpay_refund_id    VARCHAR(100)    NULL,
  status                ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  processed_at          DATETIME        NULL,
  created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_refunds_order (order_id),
  INDEX idx_refunds_user (user_id),
  INDEX idx_refunds_status (status),
  CONSTRAINT fk_refunds_order FOREIGN KEY (order_id) REFERENCES orders (id),
  CONSTRAINT fk_refunds_payment FOREIGN KEY (payment_id) REFERENCES payments (id),
  CONSTRAINT fk_refunds_return FOREIGN KEY (return_id) REFERENCES returns (id) ON DELETE SET NULL,
  CONSTRAINT fk_refunds_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: reviews
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id              CHAR(36)        NOT NULL DEFAULT (UUID()),
  product_id      CHAR(36)        NOT NULL,
  user_id         CHAR(36)        NOT NULL,
  order_item_id   CHAR(36)        NULL COMMENT 'Verified purchase link',
  rating          TINYINT         NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title           VARCHAR(200)    NULL,
  comment         TEXT            NULL,
  images          JSON            NULL,
  is_verified     TINYINT(1)      NOT NULL DEFAULT 0 COMMENT 'Verified purchase',
  helpful_count   INT             NOT NULL DEFAULT 0,
  is_approved     TINYINT(1)      NOT NULL DEFAULT 1,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reviews_user_product (user_id, product_id),
  INDEX idx_reviews_product (product_id),
  INDEX idx_reviews_rating (rating),
  CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: banners
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS banners (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  title       VARCHAR(200)    NOT NULL,
  subtitle    VARCHAR(300)    NULL,
  image       VARCHAR(500)    NOT NULL,
  mobile_image VARCHAR(500)   NULL,
  link        VARCHAR(500)    NULL,
  position    ENUM('hero','category','offer','sidebar','popup','mid') NOT NULL DEFAULT 'hero',
  sort_order  INT             NOT NULL DEFAULT 0,
  is_active   TINYINT(1)      NOT NULL DEFAULT 1,
  starts_at   DATETIME        NULL,
  ends_at     DATETIME        NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_banners_position (position),
  INDEX idx_banners_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: videos
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS videos (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  title       VARCHAR(200)    NOT NULL,
  description TEXT            NULL,
  url         VARCHAR(500)    NOT NULL,
  thumbnail   VARCHAR(500)    NULL,
  type        ENUM('youtube','vimeo','direct') NOT NULL DEFAULT 'youtube',
  sort_order  INT             NOT NULL DEFAULT 0,
  is_active   TINYINT(1)      NOT NULL DEFAULT 1,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: ads_campaigns
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ads_campaigns (
  id              CHAR(36)        NOT NULL DEFAULT (UUID()),
  vendor_id       CHAR(36)        NOT NULL,
  name            VARCHAR(200)    NOT NULL,
  type            ENUM('cpc','cpm','product','brand') NOT NULL DEFAULT 'cpc',
  target_type     ENUM('product','category','brand') NOT NULL DEFAULT 'product',
  daily_budget    DECIMAL(10,2)   NOT NULL,
  total_budget    DECIMAL(12,2)   NOT NULL,
  spent           DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  bid_amount      DECIMAL(8,2)    NOT NULL DEFAULT 1.00,
  start_date      DATE            NOT NULL,
  end_date        DATE            NOT NULL,
  status          ENUM('draft','pending','active','paused','completed','rejected','exhausted') NOT NULL DEFAULT 'pending',
  rejection_reason TEXT           NULL,
  impressions     BIGINT          NOT NULL DEFAULT 0,
  clicks          INT             NOT NULL DEFAULT 0,
  conversions     INT             NOT NULL DEFAULT 0,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_ads_vendor (vendor_id),
  INDEX idx_ads_status (status),
  INDEX idx_ads_dates (start_date, end_date),
  CONSTRAINT fk_ads_vendor FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: ad_products
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_products (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  campaign_id CHAR(36)        NOT NULL,
  product_id  CHAR(36)        NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ad_product (campaign_id, product_id),
  CONSTRAINT fk_adp_campaign FOREIGN KEY (campaign_id) REFERENCES ads_campaigns (id) ON DELETE CASCADE,
  CONSTRAINT fk_adp_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: ad_analytics
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_analytics (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  campaign_id CHAR(36)        NOT NULL,
  product_id  CHAR(36)        NULL,
  date        DATE            NOT NULL,
  impressions INT             NOT NULL DEFAULT 0,
  clicks      INT             NOT NULL DEFAULT 0,
  conversions INT             NOT NULL DEFAULT 0,
  spend       DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  PRIMARY KEY (id),
  UNIQUE KEY uq_analytics (campaign_id, product_id, date),
  INDEX idx_analytics_campaign (campaign_id),
  INDEX idx_analytics_date (date),
  CONSTRAINT fk_analytics_campaign FOREIGN KEY (campaign_id) REFERENCES ads_campaigns (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: notifications
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          CHAR(36)        NOT NULL DEFAULT (UUID()),
  user_id     CHAR(36)        NOT NULL,
  title       VARCHAR(200)    NOT NULL,
  message     TEXT            NOT NULL,
  type        ENUM('order','payment','promotion','system','return','refund','stock','review') NOT NULL DEFAULT 'system',
  reference_id VARCHAR(100)   NULL COMMENT 'order_id, product_id, etc.',
  reference_type VARCHAR(50)  NULL,
  is_read     TINYINT(1)      NOT NULL DEFAULT 0,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_notif_user (user_id),
  INDEX idx_notif_read (is_read),
  INDEX idx_notif_type (type),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: vendor_pending_updates
-- Changes to important vendor fields (bank, pickup, business,
-- documents) require admin approval before being applied.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_pending_updates (
  id          CHAR(36)        NOT NULL DEFAULT (UUID()),
  vendor_id   CHAR(36)        NOT NULL,
  user_id     CHAR(36)        NOT NULL,
  section     VARCHAR(50)     NOT NULL COMMENT 'bank | pickup | business | documents',
  changes     JSON            NOT NULL COMMENT '{field: newValue}',
  old_values  JSON            NULL COMMENT '{field: oldValue}',
  status      ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  admin_id    CHAR(36)        NULL,
  admin_note  TEXT            NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME        NULL,
  PRIMARY KEY (id),
  INDEX idx_vpu_vendor (vendor_id),
  INDEX idx_vpu_status (status),
  CONSTRAINT fk_vpu_vendor FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE,
  CONSTRAINT fk_vpu_admin FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: referrals
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  referrer_id     CHAR(36)        NOT NULL,
  referee_id      CHAR(36)        NOT NULL,
  reward_amount   DECIMAL(10,2)   NOT NULL DEFAULT 100.00,
  status          ENUM('pending','credited','expired') NOT NULL DEFAULT 'pending',
  referrer_coins_credited  TINYINT(1) NOT NULL DEFAULT 0,
  referee_coins_credited   TINYINT(1) NOT NULL DEFAULT 0,
  first_order_id           CHAR(36)   NULL,
  credited_at     DATETIME        NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_referral (referrer_id, referee_id),
  INDEX idx_referrals_referrer (referrer_id),
  CONSTRAINT fk_ref_referrer FOREIGN KEY (referrer_id) REFERENCES users (id),
  CONSTRAINT fk_ref_referee FOREIGN KEY (referee_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: disputes
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disputes (
  id              CHAR(36)        NOT NULL DEFAULT (UUID()),
  order_id        CHAR(36)        NOT NULL,
  user_id         CHAR(36)        NOT NULL,
  vendor_id       CHAR(36)        NULL,
  type            ENUM('not_delivered','wrong_item','damaged','fraud','other') NOT NULL,
  description     TEXT            NOT NULL,
  evidence        JSON            NULL,
  status          ENUM('open','under_review','resolved','closed') NOT NULL DEFAULT 'open',
  resolution      TEXT            NULL,
  resolved_by     CHAR(36)        NULL,
  resolved_at     DATETIME        NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_disputes_order (order_id),
  INDEX idx_disputes_user (user_id),
  INDEX idx_disputes_status (status),
  CONSTRAINT fk_disputes_order FOREIGN KEY (order_id) REFERENCES orders (id),
  CONSTRAINT fk_disputes_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_disputes_vendor FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: support_tickets
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id          CHAR(36)        NOT NULL DEFAULT (UUID()),
  user_id     CHAR(36)        NOT NULL,
  order_id    CHAR(36)        NULL,
  subject     VARCHAR(300)    NOT NULL,
  category    ENUM('order','payment','product','account','shipping','other') NOT NULL DEFAULT 'other',
  priority    ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  status      ENUM('open','in_progress','awaiting_user','resolved','closed') NOT NULL DEFAULT 'open',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_tickets_user (user_id),
  INDEX idx_tickets_status (status),
  CONSTRAINT fk_tickets_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_tickets_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: ticket_messages
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_messages (
  id          CHAR(36)        NOT NULL DEFAULT (UUID()),
  ticket_id   CHAR(36)        NOT NULL,
  sender_id   CHAR(36)        NOT NULL,
  sender_role ENUM('customer','vendor','admin') NOT NULL,
  message     TEXT            NOT NULL,
  attachments JSON            NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_tm_ticket (ticket_id),
  CONSTRAINT fk_tm_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets (id) ON DELETE CASCADE,
  CONSTRAINT fk_tm_sender FOREIGN KEY (sender_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: vendor_payouts
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_payouts (
  id              CHAR(36)        NOT NULL DEFAULT (UUID()),
  vendor_id       CHAR(36)        NOT NULL,
  amount          DECIMAL(12,2)   NOT NULL,
  order_ids       JSON            NOT NULL COMMENT 'Array of order IDs in this payout',
  transaction_ref VARCHAR(200)    NULL,
  status          ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  notes           TEXT            NULL,
  initiated_at    DATETIME        NULL,
  completed_at    DATETIME        NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_payouts_vendor (vendor_id),
  INDEX idx_payouts_status (status),
  CONSTRAINT fk_payouts_vendor FOREIGN KEY (vendor_id) REFERENCES vendors (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: coupon_usages
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupon_usages (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  coupon_id   INT UNSIGNED    NOT NULL,
  user_id     CHAR(36)        NOT NULL,
  order_id    CHAR(36)        NOT NULL,
  discount    DECIMAL(10,2)   NOT NULL,
  used_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_cu_coupon (coupon_id),
  INDEX idx_cu_user (user_id),
  CONSTRAINT fk_cu_coupon FOREIGN KEY (coupon_id) REFERENCES coupons (id),
  CONSTRAINT fk_cu_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: recently_viewed
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recently_viewed (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id     CHAR(36)        NOT NULL,
  product_id  CHAR(36)        NOT NULL,
  viewed_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rv (user_id, product_id),
  INDEX idx_rv_user (user_id),
  INDEX idx_rv_time (viewed_at),
  CONSTRAINT fk_rv_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_rv_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: platform_settings
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_settings (
  `key`       VARCHAR(100)    NOT NULL,
  `value`     TEXT            NULL,
  label       VARCHAR(200)    NULL,
  type        ENUM('string','number','boolean','json') NOT NULL DEFAULT 'string',
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: festival_sales
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS festival_sales (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name        VARCHAR(200)    NOT NULL,
  description TEXT            NULL,
  banner      VARCHAR(500)    NULL,
  starts_at   DATETIME        NOT NULL,
  ends_at     DATETIME        NOT NULL,
  is_active   TINYINT(1)      NOT NULL DEFAULT 1,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: festival_sale_vendors
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS festival_sale_vendors (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  sale_id         INT UNSIGNED    NOT NULL,
  vendor_id       CHAR(36)        NOT NULL,
  discount_pct    DECIMAL(5,2)    NOT NULL DEFAULT 0.00,
  status          ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  PRIMARY KEY (id),
  UNIQUE KEY uq_fsv (sale_id, vendor_id),
  CONSTRAINT fk_fsv_sale FOREIGN KEY (sale_id) REFERENCES festival_sales (id),
  CONSTRAINT fk_fsv_vendor FOREIGN KEY (vendor_id) REFERENCES vendors (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: offers (promotions / deals)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offers (
  id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  title               VARCHAR(200)    NOT NULL,
  description         TEXT            NULL,
  type                ENUM('bogo','percentage','fixed','free_shipping') NOT NULL,
  discount_value      DECIMAL(10,2)   NULL COMMENT 'Amount for fixed, percent for percentage',
  discount_percent    DECIMAL(5,2)    NULL COMMENT 'For BOGO: % off on get items (100 = free)',
  buy_quantity        INT UNSIGNED    NULL COMMENT 'BOGO: items to buy',
  get_quantity        INT UNSIGNED    NULL COMMENT 'BOGO: items to get discounted/free',
  max_discount        DECIMAL(10,2)   NULL COMMENT 'Max cap for percentage/BOGO',
  min_purchase_amount DECIMAL(10,2)   NULL,
  min_item_quantity   INT UNSIGNED    NULL,
  applicable_to       ENUM('all','category','product','vendor') NOT NULL DEFAULT 'all',
  applicable_id       VARCHAR(100)    NULL,
  valid_from          DATETIME        NOT NULL,
  valid_to            DATETIME        NOT NULL,
  usage_limit         INT UNSIGNED    NULL COMMENT 'NULL = unlimited',
  used_count          INT UNSIGNED    NOT NULL DEFAULT 0,
  per_user_limit      INT UNSIGNED    NOT NULL DEFAULT 1,
  image               VARCHAR(500)    NULL,
  badge_text          VARCHAR(50)     NULL COMMENT 'Short badge like BOGO, SALE, OFFER',
  is_active           TINYINT(1)      NOT NULL DEFAULT 1,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_offers_active (is_active, valid_from, valid_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: offer_usages (tracking who used which offer)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offer_usages (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  offer_id    INT UNSIGNED    NOT NULL,
  user_id     CHAR(36)        NOT NULL,
  order_id    CHAR(36)        NOT NULL,
  discount    DECIMAL(12,2)   NOT NULL,
  used_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_ou_offer (offer_id),
  INDEX idx_ou_user (user_id),
  INDEX idx_ou_order (order_id),
  CONSTRAINT fk_ou_offer FOREIGN KEY (offer_id) REFERENCES offers (id),
  CONSTRAINT fk_ou_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_ou_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: user_coins (Damini Coins balance per user)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_coins (
  id          CHAR(36)        NOT NULL DEFAULT (UUID()),
  user_id     CHAR(36)        NOT NULL,
  balance     INT UNSIGNED    NOT NULL DEFAULT 0,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_coins_user (user_id),
  CONSTRAINT fk_coins_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE: coin_transactions (audit trail for coin credits/debits)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coin_transactions (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id         CHAR(36)        NOT NULL,
  type            ENUM('credit','debit') NOT NULL,
  amount          INT UNSIGNED    NOT NULL,
  reason          ENUM('referral_reward','first_purchase','redemption','admin_adjustment') NOT NULL,
  reference_id    VARCHAR(100)    NULL,
  description     TEXT            NULL,
  balance_after   INT UNSIGNED    NOT NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_ct_user (user_id),
  CONSTRAINT fk_ct_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
