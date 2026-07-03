/**
 * Damini Marketplace - Database Seeder
 * Seeds: admin user, categories, brands, platform_settings, banners, demo vendor & customer
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const config = require('config');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  const dbConfig = config.get('database');
  const conn = await mysql.createConnection({
    host: dbConfig.host, port: dbConfig.port,
    database: dbConfig.name, user: dbConfig.user, password: dbConfig.password,
    charset: 'utf8mb4',
  });

  console.log('🌱 Seeding database...\n');

  // ─── Platform Settings ────────────────────────────────────────────────────────
  console.log('📋 Seeding platform settings...');
  const settings = [
    ['commission_rate', '5', 'Platform Commission Rate (%)', 'number'],
    ['min_payout', '500', 'Minimum Vendor Payout (₹)', 'number'],
    ['maintenance_mode', 'false', 'Maintenance Mode', 'boolean'],
    ['free_shipping_threshold', '499', 'Free Shipping Above (₹)', 'number'],
    ['shipping_charge', '40', 'Standard Shipping Charge (₹)', 'number'],
    ['max_cart_qty', '10', 'Max Quantity per Cart Item', 'number'],
    ['cancel_window_minutes', '15', 'Order Cancellation Window (minutes)', 'number'],
    ['site_name', 'Damini Marketplace', 'Site Name', 'string'],
    ['site_tagline', "India's Favourite Marketplace", 'Site Tagline', 'string'],
    ['support_email', 'support@damini.com', 'Support Email', 'string'],
    ['support_phone', '+91 9800000000', 'Support Phone', 'string'],
  ];
  for (const [key, value, label, type] of settings) {
    await conn.execute(
      'INSERT INTO platform_settings (`key`, `value`, label, type) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
      [key, value, label, type]
    );
  }
  console.log('  ✓ Platform settings seeded\n');

  // ─── Admin User ───────────────────────────────────────────────────────────────
  console.log('👤 Seeding admin user...');
  const adminId = uuidv4();
  const adminHash = await bcrypt.hash('Admin@123', 12);
  await conn.execute(
    `INSERT INTO users (id, name, email, phone, password_hash, role, is_verified, is_active, referral_code)
     VALUES (?, 'Admin', 'admin@damini.com', '9000000001', ?, 'admin', 1, 1, 'DMNadmin01')
     ON DUPLICATE KEY UPDATE id = id`,
    [adminId, adminHash]
  );
  const [adminRow] = await conn.execute('SELECT id FROM users WHERE email = "admin@damini.com"');
  const actualAdminId = adminRow[0].id;
  await conn.execute('INSERT INTO wallets (user_id, balance) VALUES (?, 0) ON DUPLICATE KEY UPDATE user_id = user_id', [actualAdminId]);
  console.log('  ✓ Admin: admin@damini.com / Admin@123\n');

  // ─── Demo Customer ────────────────────────────────────────────────────────────
  console.log('👤 Seeding demo customer...');
  const custId = uuidv4();
  const custHash = await bcrypt.hash('Customer@123', 12);
  await conn.execute(
    `INSERT INTO users (id, name, email, phone, password_hash, role, is_verified, is_active, referral_code)
     VALUES (?, 'Priya Sharma', 'customer@damini.com', '9000000002', ?, 'customer', 1, 1, 'DMNCUST01')
     ON DUPLICATE KEY UPDATE id = id`,
    [custId, custHash]
  );
  const [custRow] = await conn.execute('SELECT id FROM users WHERE email = "customer@damini.com"');
  const actualCustId = custRow[0].id;
  await conn.execute('INSERT INTO wallets (user_id, balance) VALUES (?, 500) ON DUPLICATE KEY UPDATE user_id = user_id', [actualCustId]);
  console.log('  ✓ Customer: customer@damini.com / Customer@123\n');

  // ─── Demo Vendor ──────────────────────────────────────────────────────────────
  console.log('🏪 Seeding demo vendor...');
  const vendUserId = uuidv4();
  const vendHash = await bcrypt.hash('Vendor@123', 12);
  await conn.execute(
    `INSERT INTO users (id, name, email, phone, password_hash, role, is_verified, is_active, referral_code)
     VALUES (?, 'Ravi Electronics', 'vendor@damini.com', '9000000003', ?, 'vendor', 1, 1, 'DMNVEND01')
     ON DUPLICATE KEY UPDATE id = id`,
    [vendUserId, vendHash]
  );
  const [vendUserRow] = await conn.execute('SELECT id FROM users WHERE email = "vendor@damini.com"');
  const actualVendUserId = vendUserRow[0].id;
  await conn.execute('INSERT INTO wallets (user_id, balance) VALUES (?, 0) ON DUPLICATE KEY UPDATE user_id = user_id', [actualVendUserId]);

  const vendorId = uuidv4();
  await conn.execute(
    `INSERT INTO vendors (id, user_id, business_name, business_type, gst_number, pan_number,
      store_name, store_description, kyc_status, commission_rate, is_active,
      bank_name, account_number, ifsc_code, account_holder,
      pickup_name, pickup_phone, pickup_line1, pickup_city, pickup_state, pickup_pincode)
     VALUES (?, ?, 'Ravi Electronics Pvt Ltd', 'private_limited', '27AAPFU0939F1ZV', 'AAPFU0939F',
       'Ravi Electronics', 'Premium electronics and gadgets store', 'approved', 5.00, 1,
       'State Bank of India', '12345678901', 'SBIN0001234', 'Ravi Electronics',
       'Ravi Kumar', '9000000003', '45, MG Road, Andheri West', 'Mumbai', 'Maharashtra', '400058')
     ON DUPLICATE KEY UPDATE id = id`,
    [vendorId, actualVendUserId]
  );
  const [vendorRow] = await conn.execute('SELECT id FROM vendors WHERE user_id = ?', [actualVendUserId]);
  const actualVendorId = vendorRow[0].id;
  console.log('  ✓ Vendor: vendor@damini.com / Vendor@123\n');

  // ─── Categories ───────────────────────────────────────────────────────────────
  console.log('📂 Seeding categories...');
  const parentCategories = [
    { name: 'Electronics', slug: 'electronics', icon: '💻', sort_order: 1 },
    { name: 'Fashion', slug: 'fashion', icon: '👗', sort_order: 2 },
    { name: 'Home & Kitchen', slug: 'home-kitchen', icon: '🏠', sort_order: 3 },
    { name: 'Sports & Fitness', slug: 'sports-fitness', icon: '⚽', sort_order: 4 },
    { name: 'Beauty & Personal Care', slug: 'beauty-personal-care', icon: '💄', sort_order: 5 },
    { name: 'Books', slug: 'books', icon: '📚', sort_order: 6 },
    { name: 'Toys & Games', slug: 'toys-games', icon: '🎮', sort_order: 7 },
    { name: 'Automotive', slug: 'automotive', icon: '🚗', sort_order: 8 },
    { name: 'Grocery', slug: 'grocery', icon: '🛒', sort_order: 9 },
    { name: 'Health & Wellness', slug: 'health-wellness', icon: '💊', sort_order: 10 },
    { name: 'Furniture', slug: 'furniture', icon: '🛋️', sort_order: 11 },
    { name: 'Jewellery', slug: 'jewellery', icon: '💍', sort_order: 12 },
  ];

  const catIds = {};
  for (const cat of parentCategories) {
    const [existing] = await conn.execute('SELECT id FROM categories WHERE slug = ?', [cat.slug]);
    if (existing.length === 0) {
      await conn.execute(
        'INSERT INTO categories (name, slug, icon, sort_order) VALUES (?, ?, ?, ?)',
        [cat.name, cat.slug, cat.icon, cat.sort_order]
      );
    }
    const [row] = await conn.execute('SELECT id FROM categories WHERE slug = ?', [cat.slug]);
    catIds[cat.slug] = row[0].id;
  }

  // Sub-categories
  const subCats = [
    { parent: 'electronics', name: 'Smartphones', slug: 'smartphones' },
    { parent: 'electronics', name: 'Laptops', slug: 'laptops' },
    { parent: 'electronics', name: 'Tablets', slug: 'tablets' },
    { parent: 'electronics', name: 'Televisions', slug: 'televisions' },
    { parent: 'electronics', name: 'Headphones', slug: 'headphones' },
    { parent: 'electronics', name: 'Cameras', slug: 'cameras' },
    { parent: 'fashion', name: 'Men\'s Clothing', slug: 'mens-clothing' },
    { parent: 'fashion', name: 'Women\'s Clothing', slug: 'womens-clothing' },
    { parent: 'fashion', name: 'Shoes', slug: 'shoes' },
    { parent: 'fashion', name: 'Accessories', slug: 'accessories' },
    { parent: 'home-kitchen', name: 'Kitchen Appliances', slug: 'kitchen-appliances' },
    { parent: 'home-kitchen', name: 'Cookware', slug: 'cookware' },
    { parent: 'home-kitchen', name: 'Bedding', slug: 'bedding' },
    { parent: 'sports-fitness', name: 'Gym Equipment', slug: 'gym-equipment' },
    { parent: 'sports-fitness', name: 'Cricket', slug: 'cricket' },
    { parent: 'beauty-personal-care', name: 'Skincare', slug: 'skincare' },
    { parent: 'beauty-personal-care', name: 'Hair Care', slug: 'hair-care' },
  ];

  for (const sub of subCats) {
    const parentId = catIds[sub.parent];
    if (!parentId) continue;
    const [existing] = await conn.execute('SELECT id FROM categories WHERE slug = ?', [sub.slug]);
    if (existing.length === 0) {
      await conn.execute(
        'INSERT INTO categories (parent_id, name, slug) VALUES (?, ?, ?)',
        [parentId, sub.name, sub.slug]
      );
    }
  }
  console.log(`  ✓ ${parentCategories.length} parent + ${subCats.length} sub-categories seeded\n`);

  // ─── Brands ───────────────────────────────────────────────────────────────────
  console.log('🏷️  Seeding brands...');
  const brands = [
    'Samsung', 'Apple', 'OnePlus', 'Xiaomi', 'Realme', 'OPPO', 'Vivo',
    'Sony', 'LG', 'Philips', 'Bosch', 'Havells', 'Bajaj', 'Prestige',
    'Nike', 'Adidas', 'Puma', 'Reebok', 'Under Armour',
    'H&M', 'Zara', 'Levi\'s', 'Allen Solly', 'Van Heusen',
    'Lakme', 'L\'Oreal', 'Maybelline', 'Biotique', 'Himalaya',
    'Penguin', 'Harper Collins', 'S. Chand', 'Arihant',
    'Hasbro', 'Mattel', 'LEGO', 'Funskool',
  ];

  for (const brand of brands) {
    const slug = brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const [existing] = await conn.execute('SELECT id FROM brands WHERE slug = ?', [slug]);
    if (existing.length === 0) {
      await conn.execute('INSERT INTO brands (name, slug) VALUES (?, ?)', [brand, slug]);
    }
  }
  console.log(`  ✓ ${brands.length} brands seeded\n`);

  // ─── Banners ──────────────────────────────────────────────────────────────────
  console.log('🖼️  Seeding banners...');
  const banners = [
    { title: 'Big Billion Sale', subtitle: 'Up to 80% Off on Electronics', link: '/products?category=electronics', position: 'hero', sort_order: 1 },
    { title: 'Fashion Fiesta', subtitle: 'New Arrivals – Explore Latest Trends', link: '/products?category=fashion', position: 'hero', sort_order: 2 },
    { title: 'Home Makeover Sale', subtitle: 'Premium Furniture & Décor at Best Prices', link: '/products?category=home-kitchen', position: 'hero', sort_order: 3 },
    { title: 'Health & Wellness', subtitle: 'Stay Fit, Stay Healthy', link: '/products?category=health-wellness', position: 'category', sort_order: 1 },
    { title: 'Special Offer', subtitle: 'Free Shipping on Orders Above ₹499', link: '/products', position: 'offer', sort_order: 1 },
  ];

  for (const b of banners) {
    const [existing] = await conn.execute('SELECT id FROM banners WHERE title = ?', [b.title]);
    if (existing.length === 0) {
      await conn.execute(
        'INSERT INTO banners (title, subtitle, image, link, position, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [b.title, b.subtitle, `https://picsum.photos/seed/${b.sort_order}/1200/400`, b.link, b.position, b.sort_order]
      );
    }
  }
  console.log('  ✓ Banners seeded\n');

  // ─── Sample Products ──────────────────────────────────────────────────────────
  console.log('📦 Seeding sample products...');
  const [smartphonesRow] = await conn.execute('SELECT id FROM categories WHERE slug = "smartphones"');
  const [samsungBrandRow] = await conn.execute('SELECT id FROM brands WHERE name = "Samsung"');
  const [appleBrandRow] = await conn.execute('SELECT id FROM brands WHERE name = "Apple"');
  const [oneplusBrandRow] = await conn.execute('SELECT id FROM brands WHERE name = "OnePlus"');

  if (smartphonesRow.length > 0 && actualVendorId) {
    const catId = smartphonesRow[0].id;
    const sampleProducts = [
      { name: 'Samsung Galaxy S24 Ultra', price: 89999, mrp: 109999, brand_id: samsungBrandRow[0]?.id, stock: 50 },
      { name: 'Apple iPhone 15 Pro Max', price: 134900, mrp: 159900, brand_id: appleBrandRow[0]?.id, stock: 30 },
      { name: 'OnePlus 12 5G', price: 49999, mrp: 64999, brand_id: oneplusBrandRow[0]?.id, stock: 75 },
      { name: 'Samsung Galaxy A55 5G', price: 32999, mrp: 44999, brand_id: samsungBrandRow[0]?.id, stock: 100 },
      { name: 'Apple iPhone 15', price: 79900, mrp: 89900, brand_id: appleBrandRow[0]?.id, stock: 60 },
    ];

    for (const prod of sampleProducts) {
      const slug = prod.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const [existing] = await conn.execute('SELECT id FROM products WHERE slug = ?', [slug]);
      if (existing.length === 0) {
        const pid = uuidv4();
        const sku = `DMN-SMRT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        await conn.execute(
          `INSERT INTO products (id, vendor_id, category_id, brand_id, name, slug, price, mrp, stock, sku,
            status, is_featured, description, rating, total_reviews, sale_count)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 1, ?, ?, ?, ?)`,
          [pid, actualVendorId, catId, prod.brand_id || null, prod.name, slug,
            prod.price, prod.mrp, prod.stock, sku,
            `${prod.name} - Premium smartphone with cutting-edge features, stunning display, and exceptional performance.`,
            4.2 + Math.random() * 0.6, Math.floor(Math.random() * 5000 + 100),
            Math.floor(Math.random() * 2000 + 50)]
        );
        // Add placeholder image
        await conn.execute(
          'INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (?, ?, 1, 0)',
          [pid, `https://picsum.photos/seed/${pid.slice(0, 8)}/600/600`]
        );
      }
    }
    console.log(`  ✓ ${sampleProducts.length} sample products seeded\n`);
  }

  await conn.end();
  console.log('✅ Database seeding complete!\n');
  console.log('Default credentials:');
  console.log('  Admin:    admin@damini.com    / Admin@123');
  console.log('  Vendor:   vendor@damini.com   / Vendor@123');
  console.log('  Customer: customer@damini.com / Customer@123');
}

seed().catch(err => {
  console.error('❌ Seeder failed:', err.message);
  process.exit(1);
});
