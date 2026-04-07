# STOX — Documentación técnica

Portfolio dashboard personal para gestión de inversiones por buckets. Single-file React app (`stox.jsx`), sin backend, sin dependencias externas, procesamiento 100% local en el navegador.

---

## Índice

1. [Arquitectura general](#1-arquitectura-general)
2. [Sistema de temas y estilos](#2-sistema-de-temas-y-estilos)
3. [Internacionalización (i18n)](#3-internacionalización-i18n)
4. [Estructura de datos](#4-estructura-de-datos)
5. [Componentes](#5-componentes)
6. [Estado global (App)](#6-estado-global-app)
7. [Pipeline de datos — CSV](#7-pipeline-de-datos--csv)
8. [Pipeline de datos — analysis.json](#8-pipeline-de-datos--analysisjson)
9. [Algoritmo DCA](#9-algoritmo-dca)
10. [Pestañas](#10-pestañas)
11. [Launcher de Claude](#11-launcher-de-claude)
12. [Plantilla analysis.json](#12-plantilla-analysisjson)
13. [Despliegue](#13-despliegue)

---

## 1. Arquitectura general

```
stox.jsx  (fichero único)
│
├── Constantes globales     T{}, S{}, DEMO_TRANSACTIONS, DEMO_HISTORY
├── I18N{}                  Traducciones ES / EN
├── Utilidades puras        parseCSV, aggregateTransactions, parseRangePct...
├── Sub-componentes         StatCard, CandidateRows, AnalysisRow...
└── export default App()    Componente raíz — todo el estado y la UI
```

**Stack:**
- React 18 (hooks)
- Recharts (gráficos)
- Tailwind utility classes (mínimas)
- Sin router, sin estado externo, sin API calls

---

## 2. Sistema de temas y estilos

Dos objetos globales definen toda la estética:

```js
const T = {
  ink, inkMuted, inkFaint,       // Escala de texto
  gold, goldLight, goldBorder,   // Color primario (brand #C5973A)
  teal, tealLight, tealBorder,   // Satellite bucket
  bg, paper, border, borderDark, // Fondos y bordes
  positive, negative,            // Semáforo P&L
  blue, blueLight, blueBorder,   // Info / plantillas
  neutral                        // Texto sobre fondo dorado
}

const S = {
  serif,   // { fontFamily: "'DM Serif Display'..." }
  mono,    // { fontFamily: "'DM Mono'..." }
  label,   // { fontFamily: "'Inter'...", textTransform: "uppercase", letterSpacing }
}
```

El nombre STOX se renderiza con `fontFamily: 'Bebas Neue'`, `scaleX(1.4)`, color `T.goldLight`.

**Colores por bucket:**

| Bucket | Acento | Fondo claro | Borde |
|--------|--------|-------------|-------|
| Core | `T.gold` | `T.goldLight` | `T.goldBorder` |
| Satellite | `T.teal` | `T.tealLight` | `T.tealBorder` |
| Wildshots | `T.ink` | `T.bg` | `T.borderDark` |

---

## 3. Internacionalización (i18n)

El objeto `I18N` en la raíz del fichero contiene todas las cadenas en dos idiomas:

```js
const I18N = {
  es: { modeDemo: "MODO DEMO...", invested: "Invertido", ... },
  en: { modeDemo: "DEMO MODE...", invested: "Invested",  ... }
}
```

Dentro de `App()`:
```js
const [lang, setLang] = useState("es"); // "es" | "en"
const tx = I18N[lang];
```

`tx` se pasa como prop a todos los componentes que necesitan texto:
`ConfigSidebar`, `InvestedVsTarget`, `CoreCandidateRow`, `SatelliteCandidateRow`, `WildshotCandidateRow`, `AnalysisRow`, `AnalysisBucketSection`.

El toggle ES/EN vive en la barra superior (top bar).

**Palabras que no se traducen** (siempre en inglés): Core, Satellite, Wildshots, Candidates, ticker names.

---

## 4. Estructura de datos

### Posición (tras `aggregateTransactions`)

```js
{
  Ticker:    "NVDA",
  Nombre:    "NVIDIA Corporation",
  Bucket:    "Satellite",       // "Core" | "Satellite" | "Wildshots"
  Invertido: 1250.00,           // €, suma de todas las compras
  Cantidad:  3.5,               // número de acciones acumuladas
  Precio:    357.14             // precio medio ponderado
}
```

### Entrada CSV (eToro)

Columnas esperadas (delimitador auto-detectado `,` o `;`):

```
Action, Amount, Units, Symbol/Company Name, Open Date
```

- `Action` debe contener `"Buy"` (case-insensitive) para ser procesada
- Fechas aceptadas: `DD/MM/YYYY` y `YYYY-MM-DD`
- La columna de ticker se extrae de `Symbol` o `Company Name` via `extractTicker()`

### Transacción raw

```js
{
  Action:   "Buy NVDA",
  Amount:   "500.00",     // € invertidos
  Units:    "1.4",        // acciones compradas
  Ticker:   "NVDA",       // extraído por extractTicker()
  Date:     "15/02/2026"  // fecha original
}
```

---

## 5. Componentes

### Componentes puros (sin estado)

| Componente | Props | Descripción |
|------------|-------|-------------|
| `StatCard` | `label, value, sub, accent, border` | Tarjeta de resumen con valor grande |
| `ChartTooltip` | `active, payload, label` | Tooltip custom para Recharts |
| `ConvictionDots` | `value, max=5` | Puntos de convicción (Wildshots) |
| `RiskBadge` | `risk` | Badge coloreado de nivel de riesgo |
| `PotencialBadge` | `potencial` | Badge de potencial con color auto |
| `RangoBadge` | `rango` | Badge bajada/subida máxima |
| `InvestedVsTarget` | `invested, target, tx` | Barra de progreso invertido vs objetivo |

### Componentes de fila (Candidates tab)

| Componente | Props adicionales |
|------------|------------------|
| `CoreCandidateRow` | `s, invested, target, tx` |
| `SatelliteCandidateRow` | `s, invested, target, tx` |
| `WildshotCandidateRow` | `s, invested, target, tx` |

Cada uno renderiza una fila del candidato con badges, barra de progreso y campos específicos del bucket.

### Componentes con estado

| Componente | Estado | Descripción |
|------------|--------|-------------|
| `BucketAccordion` | `open` | Acordeón colapsable por bucket |
| `AnalysisRow` | `open` | Fila expandible con tesis completa |
| `AnalysisBucketSection` | `open` | Sección de análisis por bucket |
| `ConfigSidebar` | — | Panel lateral de configuración (actualmente sin caller activo) |

---

## 6. Estado global (App)

```js
// Navegación
const [tab, setTab]                         // pestaña activa
const [planOpen, setPlanOpen]               // plan DCA abierto/cerrado

// Datos de portfolio
const [positions, setPositions]             // array de posiciones agregadas
const [rawTransactions, setRawTransactions] // filas CSV originales (para cálculo trimestral)
const [history]                             // datos de evolución histórica

// Estado de carga
const [loading, setLoading]
const [error, setError]
const [isDemo, setIsDemo]
const [fileName, setFileName]

// Configuración del proyecto
const [desiredInvestment, setDesiredInvestment]  // € objetivo total (default: 5000)
const [desiredReturn, setDesiredReturn]           // % retorno esperado (default: 15)
const [desiredSplit, setDesiredSplit]             // { Core: 50, Satellite: 25, Wildshots: 25 }

// Modo de inversión
const [investmentMode, setInvestmentMode]    // "puntual" | "periodica"
const [periodicity, setPeriodicity]          // "mensual" | "trimestral"
const [periodicAmount, setPeriodicAmount]    // € por periodo (default: 417)

// Idioma
const [lang, setLang]                        // "es" | "en"
const tx = I18N[lang]                        // alias de traducciones

// Analysis.json
const [analysis, setAnalysis]               // objeto parseado del JSON
const [analysisFile, setAnalysisFile]        // nombre del fichero
const [analysisError, setAnalysisError]

// UI helpers
const [showCsvTemplate, setShowCsvTemplate]
const [showJsonTemplate, setShowJsonTemplate]
const [csvDragOver, setCsvDragOver]
const [analysisDrag, setAnalysisDrag]
const [dragOver, setDragOver]

// Launcher de Claude
const [eventoInput, setEventoInput]
const [sectoresInput, setSectoresInput]
```

---

## 7. Pipeline de datos — CSV

```
Fichero CSV
    │
    ▼ readFileAsText(file)
Texto plano
    │
    ▼ detectDelim(header)  → "," | ";"
    ▼ parseCSV(text)
Array de objetos raw (una fila = una transacción Buy)
    │
    ├─→ setRawTransactions()   ← guardado para cálculo de invertido trimestral
    │
    ▼ aggregateTransactions(rows)
Array de posiciones (una por ticker, Invertido sumado)
    │
    ▼ setPositions()
```

**`parseCSV`** implementa RFC-4180 parcial: maneja campos con comillas, detecta el delimitador automáticamente, normaliza cabeceras.

**`aggregateTransactions`** agrupa por ticker, suma `Amount` (€) y `Units` (acciones). Solo procesa filas donde `Action` contiene `"buy"`.

**`extractTicker`** intenta extraer el símbolo de la columna `Symbol` o, si no existe, del inicio del texto de `Company Name` (antes del primer espacio o paréntesis).

---

## 8. Pipeline de datos — analysis.json

```
Fichero JSON
    │
    ▼ JSON.parse()
    ▼ Validación básica (objeto, al menos 1 ticker)
    │
    ▼ setAnalysis(parsed)
```

El objeto `analysis` se indexa por ticker en mayúsculas:

```js
analysis["NVDA"] = {
  bucket, name, sector, potencial,
  descripcion, ventaja, por_que_ahora,
  rango: { bajada_max, subida_max },
  estimacion: { m3, m6, m12 },
  // Core:      weight, rotate
  // Satellite: priority
  // Wildshots: conviction, risk, catalyst, tag, tagColor, bear, bull
}
```

Los candidatos activos para el DCA se derivan de `analysis`: cualquier ticker con `bucket` definido se convierte en candidato.

---

## 9. Algoritmo DCA

### Presupuesto (`dcaBudget`)

```js
// Modo puntual
dcaBudget = desiredInvestment

// Modo periódico mensual
dcaBudget = periodicAmount  // (o monthlyContribDerived si desiredInvestment > 0)

// Modo periódico trimestral
investedThisQuarter = rawTransactions
  .filter(r => isBuyInCurrentQuarter(r))
  .reduce((sum, r) => sum + parseAmount(r.Amount), 0)

dcaBudget = Math.max(0, periodicAmount - investedThisQuarter)
```

### Scoring por candidato

Cada candidato recibe una puntuación compuesta `[0, 1]`:

| Factor | Peso | Cálculo |
|--------|------|---------|
| R/R ratio | 40% | `Math.min(rr / 5, 1)` donde `rr = subida_max / bajada_max` |
| Déficit relativo | 40% | `(targetBucket - invested) / targetBucket` |
| Diversificación temática | 20% | `1 / (1 + sectorsAlreadyCovered)` |

### Greedy allocation

```
1. Puntuar TODOS los candidatos globalmente
2. Ordenar por composite score DESC
3. Para cada candidato (en orden):
   - Si remaining < DCA_MIN (75€) → parar
   - idealShare = budget × (score / totalScore)
   - rawAmount  = max(DCA_MIN, floor(idealShare / 5) × 5)
   - allocation = min(rawAmount, deficit, remaining)
   - Si allocation ≥ DCA_MIN → asignar
   - Si no → marcar como accumulate (acumular para el próximo periodo)
```

**`DCA_MIN = 75€`** — posición mínima (límite de plataforma eToro).

---

## 10. Pestañas

### Proyecto (`proyecto`)
Configuración de la estrategia: modo de inversión, periodicidad, importe, distribución por bucket (presets: conservador 70/20/10, equilibrado 50/25/25, agresivo 40/30/30).

### Evolución (`evolucion`)
Gráfico de área (Recharts `AreaChart`) con la curva real de capital invertido vs la proyección de crecimiento esperada mes a mes. Muestra: inversión actual, objetivo, % completado.

### Mi portfolio (`distribucion`)
- Gráfico de barras Real vs Objetivo por bucket
- Tabla desglose: capital invertido, % real, % objetivo, retorno potencial, R/R ponderado
- Lista de posiciones individuales con barra Invertido/Objetivo

### Candidates (`candidates`)
- **Next Move widget** — botón de compra con plan DCA calculado
- Acordeones por bucket con todos los candidatos del `analysis.json`
- Etiquetas de potencial, rango bajista/alcista, convicción (Wildshots)
- Plan desplegable con asignación por candidato y mensajes de acumular

### Análisis (`analisis`)
Tesis completa por empresa. Acordeones por bucket → expandir cada empresa muestra: descripción, ventaja competitiva, por qué ahora, riesgo principal, consenso (si existe), escenarios bear/bull.

### Volatilidad (`riesgos`)
- Pérdida máxima estimada del portfolio (suma de `bajada_max × invertido`)
- Acordeones por bucket para portfolio actual y candidates
- Tabla por posición: bajada máx, subida máx, escenario bajista

### Configuración (`config`)
- Upload CSV (drag & drop o click) con vista previa de columnas
- Upload analysis.json (drag & drop o click)
- Plantilla CSV y plantilla JSON copiables
- Launcher de Claude (ver sección 11)

---

## 11. Launcher de Claude

Al fondo de la pestaña Configuración hay un bloque que genera una URL `https://claude.ai/new?q=PROMPT_ENCODED` con el prompt de análisis geopolítico pre-rellenado.

**Campos auto-rellenados:**
- `[FECHA_HOY]` — fecha actual via `new Date().toLocaleDateString("es-ES")`
- `[PORTFOLIO]` — positions del estado: `"NVDA (Satellite, €1250), TTWO (Wildshots, €762)..."`

**Campos manuales:**
- `[EVENTO]` — evento geopolítico a analizar (campo obligatorio, habilita el botón)
- `[SECTORES_NUEVOS]` — sectores a explorar (default: "Déjalo en tu criterio")

El prompt incluye: jerarquía de fuentes (4 niveles), estructura de informe en 4 partes (contexto geopolítico + precedentes, impacto en portfolio, nuevas oportunidades, plan de acción), instrucciones de búsquedas previas y formato de salida.

> **Nota:** Activar Deep Research manualmente en el chat antes de enviar el mensaje para mejores resultados.

---

## 12. Plantilla analysis.json

```json
{
  "_meta": "Campos comunes: bucket, name, sector, potencial, descripcion, ventaja, por_que_ahora, rango, estimacion. Core: weight, rotate. Satellite: priority. Wildshots: conviction, risk, catalyst, tag, tagColor, bear, bull.",

  "VOO": {
    "bucket": "Core",
    "name": "Vanguard S&P 500 ETF",
    "sector": "ETF",
    "weight": 90,
    "rotate": false,
    "potencial": "+10% (estimado 2026)",
    "descripcion": "Qué hace la empresa o fondo.",
    "ventaja": "Por qué destaca frente a la competencia.",
    "por_que_ahora": "Motivo concreto para invertir ahora.",
    "rango": { "bajada_max": "-20%", "subida_max": "+15%" },
    "estimacion": { "m3": 2, "m6": 6, "m12": 12 }
  },

  "NVDA": {
    "bucket": "Satellite",
    "name": "NVIDIA",
    "sector": "AI / Chips",
    "priority": 1,
    "potencial": "+30% (precio objetivo consenso $XXX)",
    "descripcion": "...",
    "ventaja": "...",
    "por_que_ahora": "...",
    "rango": { "bajada_max": "-35%", "subida_max": "+50%" },
    "estimacion": { "m3": -5, "m6": 10, "m12": 30 }
  },

  "TTWO": {
    "bucket": "Wildshots",
    "name": "Take-Two Interactive",
    "sector": "Gaming",
    "conviction": 5,
    "risk": "Medium-High",
    "catalyst": "GTA VI launch (2026)",
    "tag": "Primary conviction",
    "tagColor": "#C5973A",
    "bear": "Escenario bajista: delay → -25%.",
    "bull": "Escenario alcista: lanzamiento exitoso → +80%.",
    "potencial": "+80% (escenario bull)",
    "descripcion": "...",
    "ventaja": "...",
    "por_que_ahora": "...",
    "rango": { "bajada_max": "-40%", "subida_max": "+80%" },
    "estimacion": { "m3": -8, "m6": 15, "m12": 50 }
  }
}
```

**Campos de `rango`:** strings con `%` incluido, parseados por `parseRangePct()`.  
**Campos de `estimacion`:** números enteros (% esperado a 3, 6 y 12 meses). Negativos permitidos.  
**`tagColor`** (Wildshots): cualquier color CSS hex.  
**`risk`** valores: `"Low"` `"Medium-Low"` `"Medium"` `"Medium-High"` `"High"`.

---

## 13. Despliegue

El fichero es un componente React estándar exportado como `default`. Se puede desplegar en cualquier plataforma que sirva React:

**Vercel / Netlify (recomendado):**
```bash
npx create-react-app stox-app
cp stox.jsx src/App.jsx
npm run build
# subir la carpeta /build
```

**Vite (más rápido):**
```bash
npm create vite@latest stox-app -- --template react
cp stox.jsx src/App.jsx
npm install
npm run dev
```

**Dependencias npm necesarias:**
```
react, react-dom, recharts
```

> La app no hace ninguna llamada de red. Todo el procesamiento (CSV, JSON, cálculos) ocurre en el cliente. No se necesita backend.
