export function parseRangePct(str) {
  if (!str) return null;
  const m = str.match(/([+-]?\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const val = parseFloat(m[1].replace(",", "."));
  return isNaN(val) ? null : val;
}

export function parsePotencial(str) {
  if (!str) return null;
  const m = str.match(/[+](\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const val = parseFloat(m[1].replace(",", "."));
  return isNaN(val) ? null : val;
}

export function extractPotLabel(str) {
  if (!str) return null;
  const m = str.match(/[+](\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const num = parseFloat(m[1].replace(",", "."));
  if (isNaN(num)) return null;
  // If it's a range like "+13-21%" show "+13-21%", otherwise "+X%"
  const rangeM = str.match(/[+](\d+(?:[.,]\d+)?-\d+(?:[.,]\d+)?)\s*%/);
  return rangeM ? `+${rangeM[1]}%` : `+${num}%`;
}
