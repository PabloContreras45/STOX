export const fmt    = (n, dec = 0) => Math.abs(+n).toLocaleString("es-ES", { maximumFractionDigits: dec });
export const pctFmt = n => { const s = +n >= 0 ? "+" : ""; return `${s}${(+n * 100).toFixed(1)}%`; };
export const pctBar = n => `${Math.min(100, Math.max(0, +n * 100)).toFixed(0)}%`;

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsText(file, "UTF-8");
  });
}
