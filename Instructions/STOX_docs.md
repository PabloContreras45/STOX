# STOX — Documentación del Proyecto

> Última actualización: Abril 2026

STOX es un dashboard personal de análisis de inversiones construido con React 18 + Vite. Funciona en local con un servidor de desarrollo que expone una pequeña API Node.js para leer/escribir archivos del sistema.

---

## Estructura de carpetas

```
STOX/
├── Code/
│   └── stox_1.jsx          # App React (componente único ~4000 líneas)
├── Instructions/
│   ├── STOX_docs.md                        ← este archivo
│   ├── STOX_backend.md                     ← API y scripts
│   ├── instrucciones_analisis_inversion.md ← prompt para generar analysis.json
│   └── Old/                                ← versiones anteriores archivadas
├── Portfolio/
│   ├── analysis_template.json  # Plantilla de estructura de análisis
│   ├── *.json                  # Archivos de análisis (el más reciente se usa activo)
│   └── *.csv                   # Snapshots de portfolio (el más reciente se usa activo)
├── Tracking/
│   └── tracking.xlsx           # Historial de snapshots (hoja Snapshots + Precisión)
├── scripts/
│   └── append_snapshot.py      # Script Python para escribir en tracking.xlsx
├── set_up/
│   ├── setup.sh                # Script legacy de bundling (obsoleto con Vite)
│   └── stox_legacy.html        # Bundle HTML estático generado por setup.sh (obsoleto)
├── package.json
└── vite.config.js              # Servidor Vite + API Node.js
```

---

## Arrancar la aplicación

```bash
cd STOX
npm install          # solo la primera vez
npm run dev          # arranca en http://localhost:5173
```

Con `--host` activo en `package.json`, también es accesible desde la red local (mismo WiFi) en `http://<IP-del-mac>:5173`.

---

## Arquitectura

### Frontend: React 18 (stox_1.jsx)

Un único componente raíz `App` con estado centralizado. Sin router — la navegación es por pestañas (`activeTab`).

**Pestañas principales:**
- **Portfolio** — tabla de posiciones actuales con P&L, peso real vs objetivo
- **Analysis** — carga el JSON de análisis activo; subpestañas Core / Satellite / Wildshots
- **Candidates** — lista de candidatos de los tres buckets con badges de potencial, R/R, rango
- **Plan** — plan de aportación DCA con panel expandible de estado por bucket

**Estado persistente (guardado en `config.json` vía API, debounce 800ms):**
- `split` — distribución objetivo entre buckets (Core/Satellite/Wildshots) como porcentajes enteros sumando 100
- `monthlyBudget` — aportación mensual en €
- `dcaPlan` — configuración del plan DCA (períodos, modo, etc.)
- `tutorial` — progreso del tutorial onboarding

**Cálculos clave:**
- `parseRangePct(str)` — extrae número de strings tipo `"-25%"` o `"+36%"`
- R/R por activo: `subida_max / |bajada_max|` usando los campos `rango.subida_max` y `rango.bajada_max`
- `potentialReturn` — retorno esperado ponderado por peso de portfolio
- `scoreCandidate(ticker, data)` — score compuesto para DCA: R/R 50% + déficit relativo 50%
- `evoData` — serie del gráfico de evolución: histórico real de capital acumulado por mes (desde la primera transacción del CSV hasta hoy) + proyección futura con aportaciones y retorno estimado

### Backend: Vite + Node.js (vite.config.js)

Ver `STOX_backend.md` para la documentación completa de endpoints y scripts.

---

## Buckets de inversión

| Bucket | Perfil | Peso objetivo (por defecto) |
|--------|--------|-----------------------------|
| **Core** | Posiciones estructurales, alta convicción, largo plazo | ~60% |
| **Satellite** | Posiciones tácticas o temáticas, medio plazo | ~30% |
| **Wildshots** | Alta asimetría, alto riesgo, corto-medio plazo | ~10% |

El split es configurable desde la UI (sliders). La lógica de redondeo usa `Math.floor` + distribución del resto entero para evitar errores de acumulación.

---

## Sistema de análisis (analysis.json)

El archivo JSON activo es el más reciente por fecha de modificación en `Portfolio/`. Estructura de primer nivel:

```json
{
  "_meta": { ... },
  "portfolio": {
    "TICKER": { "bucket": "Core|Satellite|Wildshots", ... }
  },
  "candidatos": {
    "TICKER": { "bucket": "Core|Satellite|Wildshots", ... }
  }
}
```

Para generar un nuevo análisis, seguir `instrucciones_analisis_inversion.md`. El prompt del análisis dentro de la app solicita mínimo **5 candidatos por bucket** (15 en total) que no estén ya en el portfolio. El prompt está optimizado para ser conciso (~1.400 palabras) y evitar que claude.ai devuelva un informe vacío por exceso de longitud de instrucciones.

---

## Plan DCA

El plan de aportación se genera a partir de:
1. `portfolioTarget` — objetivo total de portfolio (ver abajo)
2. `split` — distribución objetivo por bucket (Core/Satellite/Wildshots)
3. `scoreCandidate` — score por ticker candidato: **R/R 50% + déficit relativo 50%**

### Cálculo del objetivo de portfolio (`portfolioTarget`)

El target sobre el que se calculan los déficits por candidato depende del modo de inversión:

- **Modo puntual**: `portfolioTarget = totalInvertido + importe_a_invertir_ahora`
  El importe introducido se trata como capital **incremental** sobre la cartera actual. Así el sistema calcula dónde falta dinero para reequilibrar el portfolio hacia el split objetivo con el nuevo capital.
- **Modos periódicos (mensual/trimestral)**: `portfolioTarget = desiredInvestment` (objetivo total del período configurado).

> Ejemplo: cartera actual 3.000€, quieres invertir 500€ puntual, split 60/30/10.
> `portfolioTarget = 3.500€`. Core target = 2.100€. Si tienes 1.950€ en Core → déficit 150€ → recomienda.

### Lógica de recomendación por bucket

- Si un bucket está **sobre-representado** (peso real > peso objetivo + 2pp), los candidatos de ese bucket se **excluyen** de las recomendaciones
- **Excepción**: si el candidato tiene R/R ≥ 1.9, se incluye de todas formas con badge "exceso R/R" en ámbar
- Si está **infra-representado**, se prioriza en el scoring

### Asignación mínima por operación (`DCA_MIN`)

El mínimo por recomendación depende del presupuesto disponible (`dcaBudget`):

| Presupuesto | Mínimo por operación |
|-------------|----------------------|
| < 300€ | 75€ |
| ≥ 300€ | 150€ |

Si el déficit individual de un candidato es menor que el mínimo, se permite igualmente invertir hasta ese mínimo (ligeramente por encima del target individual) para no bloquear todas las recomendaciones cuando el presupuesto es pequeño respecto al número de candidatos.

### Diagnóstico cuando no hay recomendaciones

Si el Next Move aparece vacío, la app muestra el motivo concreto:
- Presupuesto por debajo de 75€
- Todos los buckets sobre-representados vs el split objetivo
- Sin candidatos en el JSON de análisis
- Targets individuales ya cubiertos

### Panel de estado por bucket (dentro del plan expandible)

3 tarjetas (Core / Satellite / Wildshots) mostrando:
- € actual vs € objetivo
- Barra de progreso
- Badge de gap (positivo = falta, negativo = exceso)
- Asignación de este período (o "No añadir este período" si está sobre-representado)

---

## Badges en Candidates

| Badge | Color | Significado |
|-------|-------|-------------|
| Potencial (`+X%`) | Azul | Upside al precio objetivo de consenso de analistas |
| Subida máx (`+X%`) | Verde | Subida máxima estimada (bull case del rango) |
| Bajada máx (`-X%`) | Rojo | Bajada máxima estimada (bear case del rango) |
| `Sin R/R` | Gris | No hay campo `rango` en el JSON → R/R no calculable |
| `exceso R/R` | Ámbar | Candidato de bucket sobre-representado pero con R/R ≥ 1.9 |

---

## Tracking de snapshots

Al pulsar "Guardar snapshot" en la UI:
1. Frontend envía POST a `/api/snapshots` con los datos del portfolio actual
2. `vite.config.js` spawna `python3 scripts/append_snapshot.py` con los datos como stdin
3. El script añade una fila por ticker en la hoja `Snapshots` de `Tracking/tracking.xlsx`
4. La hoja `Precisión` se actualiza manualmente para comparar con precios reales posteriores

**Requisito:** `openpyxl` instalado en el python3 del sistema. Si no está, `vite.config.js` lo instala automáticamente al arrancar el servidor (intenta 4 variantes de pip).

---

## Acceso desde red local

Con `npm run dev` (que incluye `--host`), la app es accesible desde cualquier dispositivo en la misma red WiFi:

```
http://<IP-del-mac>:5173
```

Para acceso fuera de la red local (desde otra WiFi o desde datos móviles), se necesita Tailscale u otro VPN. Actualmente no configurado.

---

## Archivos de datos y selección automática

| Archivo | Selección | Notas |
|---------|-----------|-------|
| `Portfolio/*.json` | Más reciente por mtime | Archivo de análisis activo |
| `Portfolio/*.csv` | Más reciente por mtime | CSV de posiciones para snapshots |
| `Tracking/tracking.xlsx` | Ruta fija | Siempre el mismo archivo |
| `config.json` | Ruta fija | Creado automáticamente si no existe |

---

## Tutorial / Onboarding

Al arrancar sin datos, la app muestra un tutorial de 4 pasos:
1. Bienvenida y descripción general
2. Cómo cargar un análisis JSON
3. Configuración del split y presupuesto
4. Cómo usar el plan DCA

El progreso se guarda en `config.json`. Una vez completado, no vuelve a aparecer.
