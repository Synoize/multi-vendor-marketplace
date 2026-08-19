-- ============================================================
-- Damini Marketplace - Seed Data
-- Version: 1.0.0
-- Run after schema.sql
-- Usage: mysql -u root -p < seed.sql
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

USE u228855643_thedaminiedit;

-- ─── Platform Settings ───────────────────────────────────────
INSERT INTO platform_settings (`key`, `value`, label, `type`) VALUES
('commission_rate',         '5',     'Platform Commission Rate (%)',         'number'),
('min_payout',              '500',   'Minimum Vendor Payout (₹)',            'number'),
('maintenance_mode',        'false', 'Maintenance Mode',                     'boolean'),
('free_shipping_threshold', '499',   'Free Shipping Above (₹)',              'number'),
('shipping_charge',         '40',    'Standard Shipping Charge (₹)',         'number'),
('max_cart_qty',            '10',    'Max Quantity per Cart Item',           'number'),
('cancel_window_minutes',   '15',    'Order Cancellation Window (minutes)',  'number'),
('online_pay_off',          '199',   'Online Payment Offer (₹ Off)',         'number'),
('site_name',               'The Damini Edit', 'Site Name',               'string'),
('site_tagline',            'India\'s Favourite Marketplace', 'Site Tagline', 'string'),
('support_email',           'support@thedaminiedit.com', 'Support Email',           'string'),
('support_phone',           '+91 9800000000', 'Support Phone',               'string')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

-- ─── Users ───────────────────────────────────────────────────
INSERT INTO users (id, name, email, phone, password_hash, role, is_verified, is_active, referral_code) VALUES
('a0000000-0000-0000-0000-000000000001', 'Admin',           'admin@damini.com',    '9000000001', '$2a$12$TSpdKJYIL/MbmaNOZGZmteaxi03x5p9tLPmUc2adjMIUzYNG/8JMK', 'admin',    1, 1, 'DMNadmin01')
ON DUPLICATE KEY UPDATE id = id;

-- ─── Categories (parent) ─────────────────────────────────────
INSERT INTO categories (name, slug, icon, sort_order) VALUES
('Electronics',          'electronics',          '/uploads/categories/electronics.png', 1),
('Fashion',              'fashion',              '/uploads/categories/womens.png', 2),
('Home & Kitchen',       'home-kitchen',         '/uploads/categories/kitchen.png', 3),
('Sports & Fitness',     'sports-fitness',       '/uploads/categories/gym.png', 4),
('Beauty & Personal Care', 'beauty-personal-care', '/uploads/categories/beauty.png', 5)
ON DUPLICATE KEY UPDATE id = id;

-- ─── Categories (sub) ────────────────────────────────────────
SET @cat_electronics  = (SELECT id FROM categories WHERE slug = 'electronics');
SET @cat_fashion      = (SELECT id FROM categories WHERE slug = 'fashion');
SET @cat_home_kitchen = (SELECT id FROM categories WHERE slug = 'home-kitchen');
SET @cat_sports_fitness = (SELECT id FROM categories WHERE slug = 'sports-fitness');
SET @cat_beauty_pc    = (SELECT id FROM categories WHERE slug = 'beauty-personal-care');

INSERT INTO categories (parent_id, name, slug, image) VALUES
(@cat_electronics,  'Smartphones',       'smartphones', '/uploads/categories/smartphones.png'),
(@cat_electronics,  'Laptops',           'laptops', '/uploads/categories/laptops.png'),
(@cat_electronics,  'Headphones',        'headphones', '/uploads/categories/headphones.png'),
(@cat_electronics,  'Cameras',           'cameras', '/uploads/categories/cameras.png'),
(@cat_fashion,      'Men\'s Clothing',   'mens-clothing', '/uploads/categories/mens.png'),
(@cat_fashion,      'Women\'s Clothing', 'womens-clothing', '/uploads/categories/womens.png'),
(@cat_fashion,      'Shoes',             'shoes', '/uploads/categories/shoes.png'),
(@cat_home_kitchen, 'Kitchen Appliances','kitchen-appliances', '/uploads/categories/kitchen.png'),
(@cat_sports_fitness, 'Gym Equipment',   'gym-equipment', '/uploads/categories/gym.png'),
(@cat_beauty_pc,    'Skincare',          'skincare', '/uploads/categories/skincare.png'),
(@cat_beauty_pc,    'Hair Care',         'hair-care', '/uploads/categories/haircare.png')
ON DUPLICATE KEY UPDATE id = id;

-- ─── Banners ─────────────────────────────────────────────────
INSERT INTO banners (
    title,
    subtitle,
    image,
    link,
    position,
    sort_order
) VALUES
(
    'Big Billion Sale',
    'Up to 80% Off on Electronics',
    'https://i.pinimg.com/1200x/ae/34/aa/ae34aa3903570ed58d1a8fcc831c3ab3.jpg',
    '/products?category=electronics',
    'hero',
    1
),
(
    'Fashion Fiesta',
    'New Arrivals - Explore Latest Trends',
    'https://i.pinimg.com/1200x/f0/f9/e4/f0f9e45724771f16745ad3f6f640d3ce.jpg',
    '/products?category=fashion',
    'hero',
    2
),
(
    'Home Makeover Sale',
    'Premium Furniture & Decor at Best Prices',
    'https://i.pinimg.com/736x/c1/e8/be/c1e8bea906468f598020752159ae7a5e.jpg',
    '/products?category=home-kitchen',
    'hero',
    3
),
(
'Special Offer',
'Flat 20% OFF on Selected Products',
'https://i.pinimg.com/736x/77/ac/9b/77ac9b9a609a1492e72481eaa61d50b1.jpg',
'/products',
'offer',
1
),

(
'Free Shipping',
'Free Delivery on Orders Above ₹499',
'https://images.pexels.com/photos/6214476/pexels-photo-6214476.jpeg',
'/products',
'offer',
1
),
(
    'Top Electronics Deals',
    'Best prices on gadgets',
    'https://t4.ftcdn.net/jpg/03/05/42/55/240_F_305425502_dq9zZaubNl87udnBAdvXJkxD7QeTvt7P.jpg',
    '/products?category=electronics',
    'sidebar',
    1
),
(
    'Fashion Weekend Sale',
    'Min 50% Off on Trending Styles',
    'https://i.pinimg.com/1200x/b2/8e/b5/b28eb5de80a169c4ac2a565a9966e31c.jpg',
    '/products?category=fashion',
    'sidebar',
    2
)
ON DUPLICATE KEY UPDATE
    id = id;

-- ─── Product Images ──────────────────────────────────────────
-- INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES
-- ('c0000000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/c0000000/600/600', 1, 0),
-- ('c0000000-0000-0000-0000-000000000002', 'https://picsum.photos/seed/c0000001/600/600', 1, 0),
-- ('c0000000-0000-0000-0000-000000000003', 'https://picsum.photos/seed/c0000002/600/600', 1, 0),
-- ('c0000000-0000-0000-0000-000000000004', 'https://picsum.photos/seed/c0000003/600/600', 1, 0),
-- ('c0000000-0000-0000-0000-000000000005', 'https://picsum.photos/seed/c0000004/600/600', 1, 0)
-- ON DUPLICATE KEY UPDATE id = id;

-- ─── Offers & Promotions ─────────────────────────────────────
INSERT INTO offers (title, description, type, discount_value, discount_percent, buy_quantity, get_quantity, max_discount, min_purchase_amount, min_item_quantity, applicable_to, applicable_id, valid_from, valid_to, usage_limit, used_count, per_user_limit, image, badge_text, is_active) VALUES
('Buy 1 Get 1 Free',            'Purchase one item and get another absolutely free.',                  'bogo',           NULL,  100.00, 1, 1, 200000.00, NULL,   2,    'all',      NULL,           NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY),  1000, 82,  2, 'https://picsum.photos/seed/offer-bogo/400/200',        'BOGO',     1),
('Flat ₹500 Off',               'Flat ₹500 discount on shopping above ₹5,000.',                       'fixed',          500.00, NULL,   NULL, NULL, NULL,        5000.00, NULL,  'all',      NULL,           NOW(), DATE_ADD(NOW(), INTERVAL 20 DAY),  500,  31,  1, 'https://picsum.photos/seed/offer-flat500/400/200',     '₹500 OFF', 1),
('20% Off on Fashion',          'Get 20% instant discount on all fashion products.',                   'percentage',     20.00,  NULL,   NULL, NULL, 1500.00,    2000.00, NULL,  'category', 'fashion',      NOW(), DATE_ADD(NOW(), INTERVAL 45 DAY),  NULL, 127, 3, 'https://picsum.photos/seed/offer-fashion/400/200',     '20% OFF',  1),
('Free Shipping',               'Enjoy free shipping on orders above ₹999.',                           'free_shipping',  NULL,   NULL,   NULL, NULL, NULL,        999.00,  NULL,  'all',      NULL,           NOW(), DATE_ADD(NOW(), INTERVAL 90 DAY),  NULL, 250, 999,'https://picsum.photos/seed/offer-shipping/400/200',    'FREE',     1),
('15% Off Electronics',         'Exclusive 15% off on electronics & gadgets.',                         'percentage',     15.00,  NULL,   NULL, NULL, 3000.00,    3000.00, NULL,  'category', 'electronics',  NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY),  300,  44,  1, 'https://picsum.photos/seed/offer-electronics/400/200', '15% OFF',  1),
('Festival Sale – 30% Off',     'Flat 30% OFF on selected premium products.',                          'percentage',     30.00,  NULL,   NULL, NULL, 3000.00,    1500.00, NULL,  'product',  'c0000000-0000-0000-0000-000000000001', NOW(), DATE_ADD(NOW(), INTERVAL 10 DAY),  100,  12,  1, 'https://picsum.photos/seed/offer-festival/400/200',    'SALE',     1),
('Buy 2 Get 1 Free',            'Buy any 2 items and get 1 free (cheapest item free).',                'bogo',           NULL,  100.00, 2, 1, 5000.00,    2000.00, 3,    'all',      NULL,           NOW(), DATE_ADD(NOW(), INTERVAL 60 DAY),  500,  0,   2, 'https://picsum.photos/seed/offer-bogo2/400/200',       'BOGO',     1),
('₹200 Off on Home & Kitchen',  'Special discount on home & kitchen products.',                        'fixed',          200.00, NULL,   NULL, NULL, NULL,        1500.00, NULL,  'category', 'home-kitchen', NOW(), DATE_ADD(NOW(), INTERVAL 25 DAY),  200,  0,   1, 'https://picsum.photos/seed/offer-home/400/200',        '₹200 OFF', 1),
('Weekend Special – 10% Off',   'Flat 10% off on everything. No minimum order!',                       'percentage',     10.00,  NULL,   NULL, NULL, 1000.00,    NULL,   NULL,  'all',      NULL,           NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY),   NULL, 0,   5, 'https://picsum.photos/seed/offer-weekend/400/200',     '10% OFF',  1),
('Buy 1 Get 1 at 50% Off',      'Buy one, get the second at half price on footwear.',                  'bogo',           NULL,  50.00,  1, 1, 3000.00,    1500.00, 2,    'category', 'fashion',      NOW(), DATE_ADD(NOW(), INTERVAL 15 DAY),  300,  0,   2, 'https://picsum.photos/seed/offer-footwear/400/200',    '50% OFF',  1)
ON DUPLICATE KEY UPDATE id = id;

SET FOREIGN_KEY_CHECKS = 1;
