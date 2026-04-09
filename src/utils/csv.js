export function parseAmount(str) {
  if (!str) return 0;
  const s = String(str).replace(/[€$£\s]/g, "").trim();
  let clean;
  if (s.includes(",") && s.includes(".")) {
    clean = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    clean = s.replace(",", ".");
  } else { clean = s; }
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

export function normBucket(raw) {
  if (!raw) return "Core";
  const r = raw.trim().toLowerCase();
  if (r.startsWith("wild"))      return "Wildshots";
  if (r.startsWith("satellite")) return "Satellite";
  if (r.startsWith("core"))      return "Core";
  return raw.trim();
}

export function extractTicker(company) {
  if (!company) return "";
  const m = String(company).match(/\(([^)]+)\)/);
  return m ? m[1] : String(company).trim();
}

export function splitLine(line, delim) {
  const fields = []; let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (ch === delim && !inQ) { fields.push(cur.trim()); cur = ""; }
    else { cur += ch; }
  }
  fields.push(cur.trim()); return fields;
}

export function detectDelim(header) {
  const c = {"\t":0, ";":0, ",":0}; let inQ = false;
  for (const ch of header) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (!inQ && c[ch] !== undefined) c[ch]++;
  }
  return Object.entries(c).sort((a,b) => b[1]-a[1])[0][0];
}

export function parseCSV(text) {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n/g,"\n").replace(/\r/g,"\n");
  const rows = clean.split("\n").filter(l => l.trim());
  if (!rows.length) return [];
  const delim = detectDelim(rows[0]);
  const headers = splitLine(rows[0], delim);
  return rows.slice(1).map(line => {
    const vals = splitLine(line, delim); const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] !== undefined ? vals[i] : ""; });
    return obj;
  }).filter(r => Object.values(r).some(v => v));
}

export function aggregateTransactions(rows) {
  const map = {};
  rows.forEach(r => {
    const company  = (r.Company  || r.company  || "").trim();
    const ticker   = extractTicker(company) || company;
    const bucket   = normBucket(r.Bucket || r.bucket || "Core");
    const industry = (r.Industry || r.industry || "").trim();
    const action   = (r.Action   || r.action   || "Buy").trim();
    const amount   = parseAmount(r.Quantity || r.quantity || "0");
    const delta    = action.toLowerCase() === "sell" ? -amount : amount;
    if (!map[ticker]) map[ticker] = { Company: company, Ticker: ticker, Industry: industry, Bucket: bucket, Invertido: 0, Trades: 0 };
    map[ticker].Invertido += delta; map[ticker].Trades += 1;
  });
  return Object.values(map).filter(p => p.Invertido > 0.01);
}
