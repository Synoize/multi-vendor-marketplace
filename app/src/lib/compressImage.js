/**
 * Compress an image file using Canvas API
 * @param {File} file - original image file
 * @param {Object} opts
 * @param {number} opts.maxWidth - max width in px (default 1200)
 * @param {number} opts.maxHeight - max height in px (default 1200)
 * @param {number} opts.quality - JPEG quality 0-1 (default 0.8)
 * @returns {Promise<File>} compressed file
 */
export function compressImage(file, { maxWidth = 1200, maxHeight = 1200, quality = 0.8 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Canvas toBlob failed"));
            const compressed = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressed);
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Validate review image files
 * @param {FileList} files
 * @param {number} maxCount
 * @returns {{ valid: File[], errors: string[] }}
 */
export function validateReviewImages(files, maxCount = 5) {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  const maxSize = 5 * 1024 * 1024; // 5MB
  const valid = [];
  const errors = [];

  const remaining = maxCount - files.length;
  if (remaining < 0) {
    errors.push(`Max ${maxCount} images allowed`);
  }

  for (const file of Array.from(files)) {
    if (!allowed.includes(file.type)) {
      errors.push(`${file.name}: only JPG, PNG, WebP allowed`);
      continue;
    }
    if (file.size > maxSize) {
      errors.push(`${file.name}: max 5MB`);
      continue;
    }
    valid.push(file);
  }

  return { valid: valid.slice(0, maxCount), errors };
}
