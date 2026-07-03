/**
 * Damini Marketplace - Multer Upload Middleware
 * Handles product images, KYC documents, etc.
 */

const multer = require('multer');
const path = require('path');
const config = require('config');
const { v4: uuidv4 } = require('uuid');

const maxFileSize = config.get('app.maxFileSize');
const uploadDir = config.get('app.uploadDir');

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOC_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];

/**
 * Create disk storage with organized subdirectories
 */
const createStorage = (subfolder) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(process.cwd(), uploadDir, subfolder);
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

/** Product image upload (up to 10 images) */
const uploadProductImages = multer({
  storage: createStorage('products'),
  limits: { fileSize: maxFileSize },
  fileFilter: createFilter(ALLOWED_IMAGE_TYPES),
}).array('images', 10);

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
  { name: 'aadhar_image', maxCount: 1 },
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

/** Review images */
const uploadReviewImages = multer({
  storage: createStorage('reviews'),
  limits: { fileSize: maxFileSize },
  fileFilter: createFilter(ALLOWED_IMAGE_TYPES),
}).array('images', 5);

/**
 * Multer error wrapper middleware
 */
const handleUpload = (uploadFn) => (req, res, next) => {
  uploadFn(req, res, (err) => {
    if (err) {
      return next(err);
    }
    next();
  });
};

module.exports = {
  uploadProductImages: handleUpload(uploadProductImages),
  uploadAvatar: handleUpload(uploadAvatar),
  uploadKYC: handleUpload(uploadKYC),
  uploadBanner: handleUpload(uploadBanner),
  uploadReviewImages: handleUpload(uploadReviewImages),
};
