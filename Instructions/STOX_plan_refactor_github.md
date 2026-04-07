# STOX — Plan de Refactor y Publicación en GitHub

> Documento para Claude Code · Abril 2026

---

## Contexto

STOX es un dashboard personal de inversiones construido con **React 18 + Vite**. El código funciona, está en producción local y tiene todas las funcionalidades implementadas. El objetivo de este plan es:

1. **Modularizar** el código (actualmente un único archivo de ~3.940 líneas) en una estructura de carpetas mantenible
2. **Publicarlo en GitHub** de forma segura (sin datos personales ni credenciales)
3. **Preparar un README** para que cualquier persona pueda arrancar el proyecto

El propietario (Pablo) no tiene experiencia avanzada con Git/GitHub, así que cada concepto nuevo debe explicarse brevemente la primera vez que aparezca.

---

## Parte 1 — Preparar Git antes de tocar el código

### ¿Qué es Git?
Git es un sistema que guarda el historial de cambios de tu proyecto. Piénsalo como "Control+Z ilimitado con etiquetas". GitHub es una web donde puedes subir ese historial y compartirlo.

### Paso 1.1 — Inicializar el repositorio

Desde la terminal, dentro de la carpeta `STOX/`:

```bash
git init
```

Esto crea una carpeta oculta `.git/` que empieza a registrar cambios. Solo se hace una vez.

### Paso 1.2 — Crear el archivo `.gitignore`

`.gitignore` le dice a Git qué archivos **no** debe subir nunca. Crear el archivo `STOX/.gitignore` con el siguiente contenido:

```
# Dependencias (se reinstalan con npm install)
node_modules/

# Datos personales — NO subir
config.json
Portfolio/*.csv
Portfolio/*.json
Tracking/tracking.xlsx

# Archivos legacy (no necesarios en GitHub)
set_up/stox_legacy.html

# Archivos del sistema operativo
.DS_Store
Thumbs.db

# Variables de entorno (por si se añaden en el futuro)
.env
.env.local
```

> **Por qué esto importa**: `config.json` contiene tu split, presupuesto y configuración personal. Los CSV y JSON de `Portfolio/` contienen tus operaciones reales. Nada de esto debe estar en un repositorio público.

### Paso 1.3 — Primer commit

Un **commit** es una foto del estado actual del proyecto con un mensaje descriptivo.

```bash
git add .
git commit -m "Initial commit: STOX dashboard pre-refactor"
```

Hacer este commit **antes** del refactor permite volver al estado actual si algo sale mal durante la modularización.

---

## Parte 2 — Estructura objetivo después del refactor

El archivo `Code/stox_1.jsx` (~3.940 líneas) se dividirá en esta estructura:

```
STOX/
├── src/
│   ├── main.jsx                  # Punto de entrada (actualmente en index.html)
│   ├── App.jsx                   # Componente raíz: estado global, navegación por tabs
│   │
│   ├── theme.js                  # Objeto T (colores) y S (estilos compartidos)
│   ├── constants.js              # DEMO_TRANSACTIONS, DEMO_HISTORY, traducciones (tx)
│   │
│   ├── utils/
│   │   ├── csv.js                # parseCSV, aggregateTransactions, parseAmount,
│   │   │                         # normBucket, extractTicker, splitLine, detectDelim
│   │   ├── analysis.js           # parsePotencial, parseRangePct, extractPotLabel
│   │   └── format.js             # fmt(), readFileAsText()
│   │
│   ├── hooks/
│   │   ├── useConfig.js          # Carga/guarda config.json vía /api/config (debounce 800ms)
│   │   └── useDCAPlan.js         # computeDCAPlan, scoreCandidate, portfolioTarget
│   │
│   ├── components/
│   │   ├── TopBar.jsx            # Barra superior con logo, tabs y selector de idioma
│   │   ├── StatCard.jsx          # Tarjeta de métrica reutilizable
│   │   ├── ChartTooltip.jsx      # Tooltip personalizado para gráficos Recharts
│   │   ├── ConfigSidebar.jsx     # Panel lateral de configuración (split, presupuesto)
│   │   ├── AddMovementModal.jsx  # Modal para añadir movimientos manuales
│   │   ├── TutorialCard.jsx      # Sistema de onboarding por pasos
│   │   ├── SaveTemplateButton.jsx
│   │   ├── BucketAccordion.jsx
│   │   ├── RiskAccordion.jsx / BucketRiskAccordion.jsx
│   │   └── candidates/
│   │       ├── CoreCandidateRow.jsx
│   │       ├── SatelliteCandidateRow.jsx
│   │       ├── WildshotCandidateRow.jsx
│   │       ├── PotencialBadge.jsx
│   │       ├── RangoBadge.jsx
│   │       ├── ConvictionDots.jsx
│   │       ├── RiskBadge.jsx
│   │       ├── InvestedVsTarget.jsx
│   │       └── AnalysisBucketSection.jsx
│   │
│   └── tabs/
│       ├── TabInicio.jsx         # Pestaña "Inicio": modo de inversión, split, presupuesto
│       ├── TabEvolucion.jsx      # Pestaña "Evolución": gráfico histórico + proyección
│       ├── TabPortfolio.jsx      # Pestaña "Mi Portfolio": tabla, distribución por bucket
│       ├── TabCandidates.jsx     # Pestaña "Candidates": lista de candidatos con badges
│       ├── TabMovimientos.jsx    # Pestaña "Movimientos": historial de operaciones
│       ├── TabAnalisis.jsx       # Pestaña "Análisis": tesis por bucket + prompt de Claude
│       └── TabConfig.jsx         # Pestaña "Configuración": carga CSV/JSON, plantillas
│
├── Code/
│   └── stox_1.jsx               # Archivo original — mantener intacto hasta que el refactor esté verificado
├── index.html                   # Actualizar para apuntar a src/main.jsx
├── vite.config.js
├── package.json
└── Instructions/
```

---

## Parte 3 — Orden de ejecución del refactor

Seguir este orden minimiza el riesgo de romper la app en cada paso. **Verificar que la app arranca (`npm run dev`) después de cada fase.**

### Fase 1 — Extraer utilidades puras (sin tocar el JSX aún)

Son funciones que no dependen de React ni de estado. Se pueden mover primero sin riesgo.

**Crear `src/utils/csv.js`** — mover desde `stox_1.jsx`:
- `parseAmount(str)`
- `normBucket(raw)`
- `extractTicker(company)`
- `splitLine(line, delim)`
- `detectDelim(header)`
- `parseCSV(text)`
- `aggregateTransactions(rows)`

**Crear `src/utils/analysis.js`** — mover:
- `parseRangePct(str)`
- `extractPotLabel(str)`
- `parsePotencial(str)` (si existe como función separada)

**Crear `src/utils/format.js`** — mover:
- `fmt(n, dec)`
- `readFileAsText(file)`

Cada archivo debe terminar con `export { ... }` o usar `export function`.

### Fase 2 — Extraer tema y constantes

**Crear `src/theme.js`** — mover el objeto `T` (colores) y `S` (estilos). Exportar como `export const T = { ... }` y `export const S = { ... }`.

**Crear `src/constants.js`** — mover:
- `DEMO_TRANSACTIONS`
- `DEMO_HISTORY`
- El objeto de traducciones `tx` (español e inglés)
- `TUTORIAL_STEPS` y `TUTORIAL_TAB_ORDER`

### Fase 3 — Extraer componentes atómicos

Uno a uno, cada componente pequeño a su propio archivo en `src/components/`. Cada archivo sigue el patrón:

```jsx
// src/components/StatCard.jsx
import { T, S } from "../theme.js";

export function StatCard({ label, value, sub, accent, border }) {
  // ... el mismo JSX de ahora
}
```

Orden sugerido (de menos a más dependencias):
1. `StatCard`
2. `ChartTooltip`
3. `ConvictionDots`, `RiskBadge`, `PotencialBadge`, `RangoBadge`
4. `InvestedVsTarget`, `EstCell`
5. `BucketAccordion`, `RiskAccordion`, `BucketRiskAccordion`
6. `CoreCandidateRow`, `SatelliteCandidateRow`, `WildshotCandidateRow`
7. `AnalysisRow`, `AnalysisBucketSection`
8. `SaveTemplateButton`
9. `ConfigSidebar`
10. `TutorialCard`
11. `AddMovementModal`

### Fase 4 — Extraer hooks personalizados

**Crear `src/hooks/useConfig.js`**

Encapsula la lógica de carga y guardado de `config.json`:

```js
// src/hooks/useConfig.js
export function useConfig(setters) {
  // useEffect que llama GET /api/config al montar
  // useEffect con debounce 800ms que llama POST /api/config al cambiar estado
}
```

**Crear `src/hooks/useDCAPlan.js`**

Encapsula `computeDCAPlan`, `scoreCandidate`, y el cálculo de `portfolioTarget`.

### Fase 5 — Extraer tabs

Cada tab recibe por props todo el estado que necesita. El `App.jsx` resultante es básicamente el router de tabs + gestión de estado.

Patrón para cada tab:

```jsx
// src/tabs/TabEvolucion.jsx
import { T, S } from "../theme.js";
import { fmt } from "../utils/format.js";
// ... otros imports

export function TabEvolucion({ positions, rawTransactions, analysis, dcaBudget, ... }) {
  // todo el JSX del tab de Evolución
}
```

Orden de extracción (de más simple a más compleja):
1. `TabConfig` — solo carga de archivos, pocas dependencias
2. `TabInicio` — configuración de inversión y split
3. `TabEvolucion` — gráfico de evolución
4. `TabMovimientos` — historial de operaciones
5. `TabCandidates` — candidatos (depende de lógica de scoring)
6. `TabPortfolio` — portfolio table (la más densa visualmente)
7. `TabAnalisis` — análisis con prompt de Claude (la más compleja)

### Fase 6 — Limpiar App.jsx

Al terminar las fases anteriores, `App.jsx` debe quedar con:
- Todo el `useState` y `useCallback` del estado global
- Los `useEffect` principales (carga de datos, autoguardado)
- El cálculo de `dcaBudget`, `portfolioTarget`, `byBucket`, etc.
- El render del `TopBar`, `TutorialCard`, `ConfigSidebar`
- El switch de tabs que renderiza el componente correcto

Objetivo: App.jsx < 300 líneas.

---

## Parte 4 — Crear el README

El `README.md` en la raíz del proyecto es lo primero que verá cualquier persona que visite el repositorio en GitHub. Debe incluir:

```markdown
# STOX — Investment Dashboard

Dashboard personal de análisis de inversiones geopolíticas.
Construido con React 18 + Vite. 100% local, sin backend externo.

## Requisitos
- Node.js 18+
- Python 3 (para snapshots en Excel)

## Instalación
git clone https://github.com/TU_USUARIO/stox.git
cd stox
npm install
npm run dev

## Uso
1. Exporta tu historial de operaciones desde eToro a Google Sheets y descárgalo como CSV
2. Genera un analysis.json con Claude siguiendo Instructions/instrucciones_analisis_inversion.md
3. Sube ambos archivos desde la pestaña Configuración

## Estructura
Ver Instructions/STOX_docs.md para documentación completa.
```

---

## Parte 5 — Publicar en GitHub

### ¿Qué es un repositorio remoto?
Hasta ahora Git solo guarda el historial en tu Mac. GitHub es el servidor donde se sube ese historial para que otros puedan verlo (y para tener una copia de seguridad).

### Paso 5.1 — Crear el repositorio en GitHub

1. Ir a [github.com](https://github.com) e iniciar sesión
2. Pulsar el botón **"New"** (esquina superior izquierda)
3. Nombre: `stox` (o `stox-dashboard`)
4. Descripción: "Personal investment dashboard — React + Vite"
5. Visibilidad: **Public** (para enseñárselo a tu padre) o **Private** si prefieres
6. **No marcar** "Add a README" ni ".gitignore" — ya los tienes
7. Pulsar **"Create repository"**

GitHub te mostrará una pantalla con instrucciones. Copiar los comandos de la sección "push an existing repository".

### Paso 5.2 — Conectar y subir

```bash
# Conectar tu repo local con GitHub (sustituir TU_USUARIO y stox por los tuyos)
git remote add origin https://github.com/TU_USUARIO/stox.git

# Renombrar la rama principal (convención moderna)
git branch -M main

# Subir el código por primera vez
git push -u origin main
```

> **"remote"** = el servidor remoto (GitHub). `origin` es el nombre que le damos por convención. `-u` guarda la asociación para que futuros `git push` no necesiten argumentos.

### Paso 5.3 — Verificar que no hay datos personales

Antes del push, confirmar que el `.gitignore` funciona:

```bash
git status
```

En la lista de archivos a subir **no deben aparecer**:
- `config.json`
- Ningún `.csv` de `Portfolio/`
- Ningún `.json` de análisis de `Portfolio/`
- `tracking.xlsx`
- `node_modules/`

Si aparece alguno, añadirlo al `.gitignore` antes de continuar.

---

## Parte 6 — Flujo de trabajo habitual después de publicar

Cada vez que se haga un cambio que vale la pena guardar:

```bash
# 1. Ver qué archivos han cambiado
git status

# 2. Añadir los archivos modificados al próximo commit
git add src/tabs/TabEvolucion.jsx   # un archivo específico
git add src/                        # toda la carpeta src/

# 3. Crear el commit con mensaje descriptivo
git commit -m "Refactor: extract TabEvolucion to separate component"

# 4. Subir a GitHub
git push
```

Un **commit por fase del refactor** (una por cada fase de la Parte 3) es un buen ritmo: si algo se rompe, es fácil identificar en qué paso ocurrió.

---

## Resumen de prioridades para Claude Code

| Prioridad | Tarea | Riesgo |
|-----------|-------|--------|
| 1 | Crear `.gitignore` y primer commit | Ninguno |
| 2 | Extraer utils (csv.js, analysis.js, format.js) | Bajo |
| 3 | Extraer theme.js y constants.js | Bajo |
| 4 | Extraer componentes atómicos | Medio |
| 5 | Extraer hooks (useConfig, useDCAPlan) | Medio |
| 6 | Extraer tabs uno a uno | Alto — verificar app después de cada uno |
| 7 | Limpiar App.jsx | Alto — hacer último |
| 8 | Escribir README y publicar en GitHub | Ninguno |

**Regla de oro**: nunca hacer más de una fase sin verificar que `npm run dev` arranca y la app funciona correctamente. El archivo `Code/stox_1.jsx` original se mantiene intacto hasta que el refactor esté 100% verificado.
