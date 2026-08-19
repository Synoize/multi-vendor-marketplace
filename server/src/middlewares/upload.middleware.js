/**
 * Damini Marketplace - Multer Upload Middleware
 * Handles product images, KYC documents, etc.
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('config');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

const maxFileSize = config.get('app.maxFileSize');
const uploadDir = config.get('app.uploadDir');

// Product image compression settings
const PRODUCT_MAX_WIDTH = 1600;
const PRODUCT_IMAGE_QUALITY = 80;

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOC_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];

/** Map a MIME type to a safe output file extension */
const extForMime = (mime) => {
  switch (mime) {
    case 'image/png': return '.png';
    case 'image/webp': return '.webp';
    case 'image/gif': return '.gif';
    default: return '.jpg';
  }
};

/**
 * Compress/resize a product image and write it to disk.
 * Animated GIFs are stored as-is to preserve animation.
 */
const compressImageToDisk = async (file) => {
  const dest = path.join(process.cwd(), uploadDir, 'products');
  await fs.promises.mkdir(dest, { recursive: true });
  const filename = `${uuidv4()}${extForMime(file.mimetype)}`;
  const outPath = path.join(dest, filename);

  if (file.mimetype === 'image/gif') {
    await fs.promises.writeFile(outPath, file.buffer);
  } else {
    const meta = await sharp(file.buffer, { failOn: 'none' }).metadata();
    let pipeline = sharp(file.buffer, { failOn: 'none' }).rotate();
    if (meta.width && meta.width > PRODUCT_MAX_WIDTH) {
      pipeline = pipeline.resize({ width: PRODUCT_MAX_WIDTH, withoutEnlargement: true });
    }
    switch (file.mimetype) {
      case 'image/png':
        pipeline = pipeline.png({ compressionLevel: 9 });
        break;
      case 'image/webp':
        pipeline = pipeline.webp({ quality: PRODUCT_IMAGE_QUALITY });
        break;
      default:
        pipeline = pipeline.jpeg({ quality: PRODUCT_IMAGE_QUALITY, mozjpeg: true });
    }
    const buffer = await pipeline.toBuffer();
    await fs.promises.writeFile(outPath, buffer);
  }

  file.filename = filename;
  file.path = outPath;
  delete file.buffer;
  return file;
};

/**
 * Create disk storage with organized subdirectories
 */
const createStorage = (subfolder) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(process.cwd(), uploadDir, subfolder);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

/**
 * File filter factory
 */
const createFilter = (allowedTypes) => (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', `Only ${allowedTypes.join(', ')} are allowed`));
  }
};

/** Product image upload (up to 10 images) — buffered, then compressed to disk */
const uploadProductImagesMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileSize },
  fileFilter: createFilter(ALLOWED_IMAGE_TYPES),
}).array('images', 10);

/**
 * Product image middleware: parse multipart, then compress every image and
 * write it to disk before the route handler runs. `file.filename`/`file.path`
 * are set so downstream code keeps working unchanged.
 */
const uploadProductImages = (req, res, next) => {
  uploadProductImagesMulter(req, res, async (err) => {
    if (err) return next(err);
    if (!req.files || req.files.length === 0) return next();
    try {
      await Promise.all(req.files.map(compressImageToDisk));
      next();
    } catch (err) {
      try {
        await Promise.all(
          (req.files || []).filter((f) => f.path).map((f) => fs.promises.unlink(f.path))
        );
      } catch (e) { /* cleanup best-effort */ }
      next(err);
    }
  });
};

/** Single avatar upload */
const uploadAvatar = multer({
  storage: createStorage('avatars'),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: createFilter(ALLOWED_IMAGE_TYPES),
}).single('avatar');

/** KYC document upload */
const uploadKYC = multer({
  storage: createStorage('kyc'),
  limits: { fileSize: maxFileSize },
  fileFilter: createFilter(ALLOWED_DOC_TYPES),
}).fields([
  { name: 'gst_certificate', maxCount: 1 },
  { name: 'pan_image', maxCount: 1 },
  { name: 'aadhar_image_front', maxCount: 1 },
  { name: 'aadhar_image_back', maxCount: 1 },
  { name: 'passport_photo', maxCount: 1 },
  { name: 'udyam_certificate', maxCount: 1 },
  { name: 'bank_passbook', maxCount: 1 },
  { name: 'cancelled_cheque', maxCount: 1 },
]);

/** Banner upload */
const uploadBanner = multer({
  storage: createStorage('banners'),
  limits: { fileSize: maxFileSize },
  fileFilter: createFilter(ALLOWED_IMAGE_TYPES),
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'mobile_image', maxCount: 1 },
]);

/** Vendor store branding (logo + banner) upload */
const uploadStoreBranding = multer({
  storage: createStorage('stores'),
  limits: { fileSize: maxFileSize },
  fileFilter: createFilter(ALLOWED_IMAGE_TYPES),
}).fields([
  { name: 'logo', maxCount: 1 },
  { name: 'banner', maxCount: 1 },
]);

/** Review images */
const uploadReviewImages = multer({
  storage: createStorage('reviews'),
  limits: { fileSize: maxFileSize },
  fileFilter: createFilter(ALLOWED_IMAGE_TYPES),
}).array('images', 5);

/**
 * Generic single-image uploader that stores into an arbitrary subfolder.
 * Accepts a single file under the `images` field name (matches the admin
 * ImageUpload component) and writes it as-is (no compression).
 */
const createGenericImageUploader = (subfolder) => handleUpload(
  multer({
    storage: createStorage(subfolder),
    limits: { fileSize: maxFileSize },
    fileFilter: createFilter(ALLOWED_IMAGE_TYPES),
  }).array('images', 1)
);

/**
 * Encrypt KYC file on disk after multer saves it
 */
function encryptKYCFile(filePath) {
  const { encrypt } = require('../utils/encryption.util');
  const buffer = fs.readFileSync(filePath);
  const encrypted = encrypt(buffer);
  fs.writeFileSync(filePath, encrypted);
}

/**
 * Multer error wrapper middleware
 */
const handleUpload = (uploadFn, encryptAfter) => (req, res, next) => {
  uploadFn(req, res, (err) => {
    if (err) {
      return next(err);
    }
    if (encryptAfter && req.files) {
      for (const field of Object.values(req.files)) {
        for (const file of field) {
          try { encryptKYCFile(file.path); } catch (e) { /* ignore */ }
        }
      }
    }
    next();
  });
};

module.exports = {
  uploadProductImages,
  uploadAvatar: handleUpload(uploadAvatar),
  uploadKYC: handleUpload(uploadKYC, true),
  uploadBanner: handleUpload(uploadBanner),
  uploadStoreBranding: handleUpload(uploadStoreBranding),
  uploadReviewImages: handleUpload(uploadReviewImages),
  createGenericImageUploader,
};
