// Builds a wa.me URL (with a pre-filled message) that lets a customer send a
// thank-you note for their own order directly to the platform WhatsApp number.
export function buildOrderThankyouUrl(whatsappNumber, orderNumber, siteName) {
  const brand = siteName || "The Damini Edit";
  const text = `Hi ${brand}! Thank you for my order #${orderNumber}. I really appreciate it! 🤗 If you loved your order, please share a short review video with us. We'd love to hear from you! ❤️`;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
}
