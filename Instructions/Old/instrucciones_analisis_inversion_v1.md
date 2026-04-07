# Instrucciones para Análisis de Inversión Geopolítico → JSON

## Objetivo
Generar un archivo `analysis.json` con oportunidades de inversión ligadas a un evento geopolítico concreto, con datos verificados y filtradas por criterio de R/R mínimo 1.5.

---

## PASO 0 — Plantilla de referencia

Siempre adjuntar `analysis_template.json` al mensaje. El JSON de salida debe respetar exactamente esa estructura:
- **Core**: campos `weight` (0–100) y `rotate` (bool)
- **Satellite**: campo `priority` (número)
- **Wildshots**: campos `conviction` (1–5), `risk`, `catalyst`, `tag`, `tagColor`, `bear`, `bull`
- **Campos comunes a todos**: `bucket`, `name`, `sector`, `potencial`, `descripcion`, `ventaja`, `por_que_ahora`, `rango` (`bajada_max`, `subida_max`), `estimacion` (`m3`, `m6`, `m12`)

---

## PASO 1 — Búsquedas obligatorias antes de escribir

Realizar en este orden:

### 1.1 Contexto del evento
- `"[EVENTO] markets impact oil gold S&P latest news [MES AÑO]"`
- `"[EVENTO] oil supply disruption analyst forecast [AÑO]"`
- `"Brent WTI crude oil price [MES AÑO]"` → precio exacto con fecha
- `"gold price [MES AÑO]"` → precio exacto con fecha
- `"VIX S&P 500 Nasdaq [MES AÑO]"` → snapshot macro completo

### 1.2 Portfolio actual (una búsqueda por ticker)
- `"[TICKER] stock price [MES AÑO]"` → precio con fecha exacta
- `"[TICKER] earnings [AÑO] EPS revenue beat miss"` → último earnings
- Si no hay datos de las últimas 2 semanas → indicarlo **explícitamente** antes de usar datos antiguos

### 1.3 Oportunidades nuevas (una búsqueda por candidato)
- `"[TICKER] stock price target analyst [AÑO]"` → consenso, rango min/max
- `"[TICKER] [EVENTO] impact thesis [AÑO]"` → tesis específica al evento
- Fuentes aceptadas para precios objetivo: MarketBeat, Morningstar, StockAnalysis, Investing.com

---

## PASO 2 — Filtro de R/R (OBLIGATORIO antes de incluir cualquier activo)

**Calcular para cada candidato:**

```
R/R = subida_max (%) ÷ |bajada_max (%)|
```

**Umbrales:**
| R/R | Decisión |
|-----|----------|
| ≥ 2.0 | ✅ Incluir — alta convicción |
| 1.5 – 1.9 | ✅ Incluir con justificación explícita |
| 1.0 – 1.4 | ⚠️ Solo si hay catalizador de corto plazo muy claro |
| < 1.0 | ❌ Excluir siempre |

**Regla adicional:** Si el precio actual ya supera el precio objetivo del consenso de analistas → el upside real es ~0% → **excluir como oportunidad nueva** (puede mantenerse en portfolio existente, pero no se añade capital nuevo).

**Tabla de filtro a completar antes de escribir el JSON:**
```
| Ticker | Bajada | Subida | R/R | Precio actual | Consenso analistas | ¿Pasa filtro? |
```

---

## PASO 3 — Estructura del JSON de salida

### 3.1 `_meta` (campo obligatorio)
Incluir:
- Nombre del evento y fecha de inicio
- Fecha de análisis
- Snapshot macro: Brent, WTI, Oro, S&P 500, VIX, Bono 10Y, DXY, tipo Fed
- Fuentes y fechas de los datos macro
- Escenarios de probabilidad: optimista / base / pesimista (%)

### 3.2 Portfolio existente
Para cada activo del portfolio:

```json
{
  "TICKER": {
    "bucket": "Core | Satellite | Wildshots",
    "name": "Nombre completo",
    "sector": "Sector específico",

    // Core únicamente:
    "weight": 85,
    "rotate": false,

    // Satellite únicamente:
    "priority": 1,

    // Wildshots únicamente:
    "conviction": 4,
    "risk": "High | Medium-High | Medium | Medium-Low | Low",
    "catalyst": "Catalizador principal ligado al evento",
    "tag": "Etiqueta de 3-5 palabras",
    "tagColor": "#HEX",
    "bear": "Escenario bajista específico con % → nunca genérico",
    "bull": "Escenario alcista específico con % → nunca genérico",

    // Todos los buckets:
    "tema": "Etiqueta del driver principal — ej: 'Guerra de Irán', 'Lanzamiento GTA VI', 'Expansión IA'",
    "potencial": "+X% (fuente, fecha, nº analistas, rating)",
    "descripcion": "Qué hace la empresa — 1-2 frases",
    "ventaja": "Por qué esta empresa y no otra — diferenciador específico",
    "por_que_ahora": "Nexo DIRECTO con el evento geopolítico + dato reciente con fecha",
    "rango": { "bajada_max": "-X%", "subida_max": "+X%" },
    "retorno_estimado": N,
    "estimacion": { "m3": N, "m6": N, "m12": N, "m24": N }
  }
}
```

### 3.3 Oportunidades nuevas
Misma estructura que el portfolio. Añadir en `por_que_ahora` la tesis **específica al evento** — prohibido el texto genérico tipo "se beneficia del ciclo".

---

## PASO 4 — Reglas de calidad para los campos

### `tema`
- Driver principal que explica **por qué este activo está en este análisis** — debe ser una etiqueta corta y reconocible
- Ejemplos: `"Guerra de Irán"`, `"Lanzamiento GTA VI"`, `"Expansión IA"`, `"Boom defensa Europa"`, `"Subida del oro"`, `"Ciclo semiconductores"`
- Un activo puede tener múltiples temas separados por ` + `: `"Guerra de Irán + Ciclo nuclear"`
- ❌ Prohibido: temas genéricos como `"Buena empresa"` o `"Crecimiento"`

### `retorno_estimado`
- Retorno esperado ponderado por probabilidad — complementa el R/R al incorporar la probabilidad de cada escenario
- Fórmula:
```
retorno_estimado = (prob_bull × subida_max) + (prob_base × m12) + (prob_bear × bajada_max)
```
- Usar las probabilidades del escenario del `_meta` (optimista / base / pesimista)
- Resultado en % redondeado a 1 decimal
- Ejemplo: bull 25% × +60% = +15 / base 50% × +20% = +10 / bear 25% × -25% = -6.25 → `retorno_estimado: 18.75`
- Un `retorno_estimado` positivo pero bajo (<5%) con R/R alto puede indicar sesgo bajista en probabilidades → revisar la tesis


- Formato: `"+X% (consenso/bull/bear — fuente — fecha — N analistas)"`
- Si el precio ya supera el consenso → indicarlo: `"YA SOBRE CONSENSO — targets en revisión al alza"`
- Siempre especificar si es consenso, mínimo, máximo o bull/bear case

### `bear` y `bull` (solo Wildshots)
- Deben ser **específicos al evento**: mencionar el mecanismo concreto de pérdida/ganancia
- Deben incluir un porcentaje estimado
- ❌ Prohibido: *"el mercado podría caer"* 
- ✅ Correcto: *"Cierre de Estrecho de Hormuz >30 días → recesión global → reducción gasto discrecional → -40%"*

### `por_que_ahora`
- Debe responder: ¿qué ha cambiado en las últimas 2 semanas que hace esta inversión más urgente?
- Debe citar al menos 1 dato reciente con fecha
- Si la tesis no cambia con el evento → el activo pertenece al portfolio base, no al análisis geopolítico

### `estimacion`
- `m3`: corto plazo — incluir el impacto directo del evento (puede ser negativo)
- `m6`: medio plazo — normalización post-evento + fundamentos
- `m12`: largo plazo — tesis estructural
- `m24`: muy largo plazo — potencial de maduración completa de la tesis
- Los cuatro valores deben ser **coherentes entre sí** y con el `rango`

---

## PASO 5 — Consistencia final (checklist antes de entregar)

Antes de generar el JSON, verificar:

- [ ] Todos los activos tienen R/R calculado y documentado
- [ ] Todos los activos tienen `retorno_estimado` calculado con la fórmula de probabilidades
- [ ] Ningún activo con R/R < 1.5 está incluido como oportunidad nueva
- [ ] Ningún activo cotiza ya por encima del consenso de analistas sin indicarlo
- [ ] Todos los precios tienen fecha exacta (máx. 7 días de antigüedad)
- [ ] Los earnings citados son el último reporte disponible
- [ ] Si no hay datos recientes de un ticker → indicado en `por_que_ahora`
- [ ] Los campos `bear`/`bull` son específicos al evento, no genéricos
- [ ] El JSON es válido (sin comas sobrantes, sin campos no presentes en la plantilla)
- [ ] El `_meta` incluye el snapshot macro completo con fuentes y fechas


