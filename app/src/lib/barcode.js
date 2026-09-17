// Code 39 barcode generator that returns an inline SVG string (no dependencies).
// Supports A-Z, 0-9, space, and - . $ / + % characters (start/stop guard is "*").

const CODE39_TABLE = {
  "0": "000110100",
  "1": "100100001",
  "2": "001100001",
  "3": "101100000",
  "4": "000110001",
  "5": "100110000",
  "6": "001110000",
  "7": "000100101",
  "8": "100100100",
  "9": "001100100",
  A: "100001001",
  B: "001001001",
  C: "101001000",
  D: "000011001",
  E: "100011000",
  F: "001011000",
  G: "000001101",
  H: "100001100",
  I: "001001100",
  J: "000011100",
  K: "100000011",
  L: "001000011",
  M: "101000010",
  N: "000010011",
  O: "100010010",
  P: "001010010",
  Q: "000000111",
  R: "100000110",
  S: "001000110",
  T: "000010110",
  U: "110000001",
  V: "011000001",
  W: "111000000",
  X: "010010001",
  Y: "110010000",
  Z: "011010000",
  "-": "010000101",
  ".": "110000100",
  " ": "011000100",
  $: "010101000",
  "/": "010100010",
  "+": "010001010",
  "%": "000101010",
  "*": "010010100",
};

export function code39Svg(
  value,
  { height = 44, narrow = 2, wide = 5, showText = true, fontSize = 13 } = {},
) {
  const text = String(value ?? "").toUpperCase();
  const safeText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const encoded = `*${text}*`;

  const elements = [];
  for (let c = 0; c < encoded.length; c++) {
    const pattern = CODE39_TABLE[encoded[c]];
    if (!pattern) continue;
    for (let i = 0; i < pattern.length; i++) {
      const isBar = i % 2 === 0;
      elements.push({
        bar: isBar,
        w: pattern[i] === "1" ? wide : narrow,
      });
    }
    if (c < encoded.length - 1) {
      elements.push({ bar: false, w: narrow });
    }
  }

  const quiet = 10 * narrow;
  let x = quiet;
  let bars = "";
  for (const el of elements) {
    if (el.bar) {
      bars += `<rect x="${x}" y="0" width="${el.w}" height="${height}"/>`;
    }
    x += el.w;
  }
  const width = x + quiet;
  const labelHeight = showText ? height + fontSize + 8 : 0;

  const textEl = showText
    ? `<text x="${width / 2}" y="${height + fontSize + 2}" font-family="monospace" font-size="${fontSize}" text-anchor="middle">${safeText}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height + labelHeight}" viewBox="0 0 ${width} ${height + labelHeight}" fill="#000" shape-rendering="crispEdges">${bars}${textEl}</svg>`;
}