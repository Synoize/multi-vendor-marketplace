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
('commission_rate',         '3',     'Platform Commission Rate (%)',         'number'),
('min_payout',              '500',   'Minimum Vendor Payout (₹)',            'number'),
('maintenance_mode',        'false', 'Maintenance Mode',                     'boolean'),
('free_shipping_threshold', '499',   'Free Shipping Above (₹)',              'number'),
('shipping_charge',         '40',    'Standard Shipping Charge (₹)',         'number'),
('max_cart_qty',            '10',    'Max Quantity per Cart Item',           'number'),
('cancel_window_minutes',   '15',    'Order Cancellation Window (minutes)',  'number'),
('online_pay_off',          '199',   'Online Payment Offer (₹ Off)',         'number'),
('site_name',               'The Damini Edit', 'Site Name',               'string'),
('site_tagline',            'India''s Favourite Marketplace', 'Site Tagline', 'string'),
('site_domain',             'thedaminiedit.com', 'Site Domain',        'string'),
('support_email',           'supportthedaminiedit@gmail.com', 'Support Email (Customer Care)', 'string'),
('business_email',          'thedaminiedit3094@gmail.com', 'Business Enquiries Email', 'string'),
('support_phone',           '+91 8485833094', 'Support Phone',               'string'),
('whatsapp_number',         '918485833094', 'WhatsApp Number (with country code, no +)', 'string'),
('registered_address',      'Opposite Chubeji Katiya Bhandar, Gittikhadan Chowk, Nagpur, Maharashtra – 440013, India', 'Registered Office Address', 'string'),
('gstin',                   '27AYDPT0267H1Z9', 'GSTIN',                                'string'),
('working_hours',           'Mon – Sat : 9:00 AM – 8:00 PM', 'Working Hours',         'string'),
('facebook_url',            'https://www.facebook.com/share/19YabhRKct/', 'Facebook URL', 'string'),
('instagram_url',           'https://www.instagram.com/the_damini_edit', 'Instagram URL', 'string'),
('youtube_url',             'https://www.youtube.com/@thedaminiedit', 'YouTube URL', 'string'),
('twitter_url',             '',      'Twitter / X URL',                      'string')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

-- ─── Users ───────────────────────────────────────────────────
INSERT INTO users (id, name, email, phone, password_hash, role, is_verified, is_active, referral_code) VALUES
('a0000000-0000-0000-0000-000000000001', 'Admin',           'admin@tde.com',    '9000000001', '$2a$12$TSpdKJYIL/MbmaNOZGZmteaxi03x5p9tLPmUc2adjMIUzYNG/8JMK', 'admin',    1, 1, 'TDEADMIN')
ON DUPLICATE KEY UPDATE id = id;

-- ─── Categories (parent) ─────────────────────────────────────
INSERT INTO categories (name, slug, icon, banner, sort_order) VALUES
('Electronics', 'electronics', '/uploads/categories/electronics.png', 'https://i.pinimg.com/1200x/dc/06/eb/dc06eba80ce274bff1bbda473abf671c.jpg', 1),
('Fashion', 'fashion', '/uploads/categories/womens.png', 'https://i.pinimg.com/1200x/ee/51/b9/ee51b91efa2c247132a4bb7253eab2eb.jpg', 2),
('Home & Kitchen', 'home-kitchen', '/uploads/categories/kitchen.png', 'https://i.pinimg.com/1200x/2f/44/1c/2f441cddd03d35c0b9fa92c201df7a44.jpg', 3),
('Sports & Fitness', 'sports-fitness', '/uploads/categories/gym.png', 'https://i.pinimg.com/1200x/14/f0/e1/14f0e13bd4134c15db6e9555690ff132.jpg', 4),
('Beauty & Personal Care', 'beauty-personal-care', '/uploads/categories/beauty.png', 'https://i.pinimg.com/1200x/2f/4d/bc/2f4dbc5525d9019b5679e774ab6cc7ca.jpg', 5),
('Kids', 'kids', '/uploads/categories/kids.png', 'https://i.pinimg.com/736x/c3/81/5f/c3815fa1f16ebd04152621e5eb61ec65.jpg', 6),
('Foods & Grocery', 'foods-grocery', '/uploads/categories/grocery.png', 'https://i.pinimg.com/1200x/a4/21/97/a4219793d91117b93ac58e058268d313.jpg', 7),
('Auto Accessories', 'auto-accessories', '/uploads/categories/auto-accessories.png', 'https://i.pinimg.com/1200x/57/68/34/5768349928764387d8f391880e90e343.jpg', 8),
('Books & More', 'books-more', '/uploads/categories/books.png', 'https://i.pinimg.com/1200x/e2/c3/c6/e2c3c688a3682445b60433461c2bb2de.jpg', 9),
('Pharmacy & Household', 'pharmacy-household', '/uploads/categories/pharmacy.png', 'https://i.pinimg.com/1200x/8b/60/e6/8b60e6abd12d62e31aec3c868f80ba08.jpg', 10),
('Watches', 'watches', '/uploads/categories/watches.png', 'https://i.pinimg.com/1200x/f5/c9/2e/f5c92e87fcf86913fb93fa8bb0b269f8.jpg', 11),
('Jewellery', 'jewellery', '/uploads/categories/jewellery.png', 'https://i.pinimg.com/1200x/05/53/ed/0553ed8111b332b7756c6131f3ee753f.jpg', 12)
ON DUPLICATE KEY UPDATE id = id;

-- ─── Categories (sub) ────────────────────────────────────────
SET @electronics = (SELECT id FROM categories WHERE slug = 'electronics');
SET @fashion = (SELECT id FROM categories WHERE slug = 'fashion');
SET @home_kitchen = (SELECT id FROM categories WHERE slug = 'home-kitchen');
SET @sports_fitness = (SELECT id FROM categories WHERE slug = 'sports-fitness');
SET @beauty = (SELECT id FROM categories WHERE slug = 'beauty-personal-care');
SET @kids = (SELECT id FROM categories WHERE slug = 'kids');
SET @grocery = (SELECT id FROM categories WHERE slug = 'foods-grocery');
SET @auto = (SELECT id FROM categories WHERE slug = 'auto-accessories');
SET @books = (SELECT id FROM categories WHERE slug = 'books-more');
SET @pharmacy = (SELECT id FROM categories WHERE slug = 'pharmacy-household');
SET @watches = (SELECT id FROM categories WHERE slug = 'watches');

INSERT INTO categories (parent_id, name, slug, image) VALUES
-- Electronics
(@electronics,  'Smartphones',       'smartphones', '/uploads/categories/smartphones.png'),
(@electronics,  'Laptops',           'laptops', '/uploads/categories/laptops.png'),
(@electronics,  'Headphones',        'headphones', '/uploads/categories/headphones.png'),
(@electronics,  'Cameras',           'cameras', '/uploads/categories/cameras.png'),

-- fashion
(@fashion,      'Men\'s Clothing',   'mens-clothing', '/uploads/categories/mens.png'),
(@fashion,      'Women\'s Clothing', 'womens-clothing', '/uploads/categories/womens.png'),
(@fashion,      'Shoes',             'shoes', '/uploads/categories/shoes.png'),

-- home_kitchen
(@home_kitchen, 'Kitchen Appliances','kitchen-appliances', '/uploads/categories/kitchen.png'),

-- sports_fitness
(@sports_fitness, 'Gym Equipment',   'gym-equipment', '/uploads/categories/gym.png'),

-- beauty
(@beauty,    'Skincare',          'skincare', '/uploads/categories/skincare.png'),
(@beauty,    'Hair Care',         'hair-care', '/uploads/categories/haircare.png')
ON DUPLICATE KEY UPDATE id = id;

-- ─── Categories (sub-sub, arbitrary depth) ──────────────────
SET @smartphones = (SELECT id FROM categories WHERE slug = 'smartphones');
SET @mens_clothing = (SELECT id FROM categories WHERE slug = 'mens-clothing');
SET @shoes = (SELECT id FROM categories WHERE slug = 'shoes');

INSERT INTO categories (parent_id, name, slug, image) VALUES
(@smartphones,   'Android Phones',    'android-phones', '/uploads/categories/smartphones.png'),
(@smartphones,   'iPhones',           'iphones', '/uploads/categories/smartphones.png'),
(@mens_clothing, 'T-Shirts',          't-shirts', '/uploads/categories/mens.png'),
(@mens_clothing, 'Formal Shirts',     'formal-shirts', '/uploads/categories/mens.png'),
(@shoes,         'Running Shoes',     'running-shoes', '/uploads/categories/gym.png'),
(@shoes,         'Sneakers',          'sneakers', '/uploads/categories/mens.png')
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
    '/uploads/banners/offers.png',
    '/products?category=electronics',
    'hero',
    1
),
(
    'Fashion Fiesta',
    'New Arrivals - Explore Latest Trends',
    '/uploads/banners/shop.png',
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

INSERT INTO offers (title, description, type, discount_value, discount_percent, buy_quantity, get_quantity, max_discount, min_purchase_amount, min_item_quantity, applicable_to, applicable_id, valid_from, valid_to, usage_limit, used_count, per_user_limit, image, badge_text, is_active) VALUES

('Buy 1 Get 1 Free',
 'Purchase one item and get another absolutely free.',
 'bogo', NULL, 100.00, 1, 1, 200000.00, NULL, 2,
 'all', NULL, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 1000, 82, 2,
 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=800&q=80',
 'BOGO', 1),
('Flat ₹500 Off',
 'Flat ₹500 discount on shopping above ₹5,000.',
 'fixed', 500.00, NULL, NULL, NULL, NULL, 5000.00, NULL,
 'all', NULL, NOW(), DATE_ADD(NOW(), INTERVAL 20 DAY), 500, 31, 1,
 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80',
 '₹500 OFF', 1),
('20% Off on Fashion',
 'Get 20% instant discount on all fashion products.',
 'percentage', 20.00, NULL, NULL, NULL, 1500.00, 2000.00, NULL,
 'category', 'fashion', NOW(), DATE_ADD(NOW(), INTERVAL 45 DAY), NULL, 127, 3,
 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=800&q=80',
 '20% OFF', 1),
('Free Shipping',
 'Enjoy free shipping on orders above ₹999.',
 'free_shipping', NULL, NULL, NULL, NULL, NULL, 999.00, NULL,
 'all', NULL, NOW(), DATE_ADD(NOW(), INTERVAL 90 DAY), NULL, 250, 999,
 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
 'FREE', 1),
('15% Off Electronics',
 'Exclusive 15% off on electronics & gadgets.',
 'percentage', 15.00, NULL, NULL, NULL, 3000.00, 3000.00, NULL,
 'category', 'electronics', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 300, 44, 1,
 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?auto=format&fit=crop&w=800&q=80',
 '15% OFF', 1)

ON DUPLICATE KEY UPDATE id = id;

SET FOREIGN_KEY_CHECKS = 1;