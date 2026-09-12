export function isYouTubeUrl(url = "") {
  return url && (url.includes("youtube.com") || url.includes("youtu.be"));
}

export function getYouTubeId(url = "") {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]+)/,
    /(?:youtu\.be\/)([\w-]+)/,
    /(?:youtube\.com\/embed\/)([\w-]+)/,
    /(?:youtube\.com\/shorts\/)([\w-]+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

export function isVimeoUrl(url = "") {
  return url && url.includes("vimeo.com");
}

export function getVimeoId(url = "") {
  const m = url.match(/(?:vimeo\.com|player\.vimeo\.com)\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

/**
 * Return an embeddable URL for YouTube/Vimeo links, or null for direct files.
 * Direct files (uploaded /uploads/videos/... or raw .mp4 links) use <video>.
 */
export function getVideoEmbedUrl(url = "") {
  if (isYouTubeUrl(url)) {
    const id = getYouTubeId(url);
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}` : null;
  }
  if (isVimeoUrl(url)) {
    const id = getVimeoId(url);
    return id ? `https://player.vimeo.com/video/${id}?autoplay=1&muted=1&controls=0&loop=1` : null;
  }
  return null;
}

export function isDirectVideoUrl(url) {
  const u = String(url || "").trim().toLowerCase();
  if (!u) return false;
  if (isYouTubeUrl(u) || isVimeoUrl(u)) return false;
  if (u.startsWith("/uploads/videos/")) return true;
  return /\.(mp4|webm|ogv|mov|m4v|m3u8)(\?.*)?$/.test(u);
}