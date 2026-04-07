# STOX — Backend: API y Scripts

> Última actualización: Marzo 2026

El backend de STOX es un plugin de Vite (`vite.config.js`) que expone una API REST mínima en el mismo servidor de desarrollo (puerto 5173). No hay servidor separado — todo corre en el proceso `npm run dev`.

---

## vite.config.js

### Arranque del servidor (`configureServer`)

Al iniciar, el servidor:

1. **Verifica openpyxl**: Comprueba si `python3` tiene `openpyxl` instalado. Si no, lo instala automáticamente probando 4 variantes en orden:
   - `pip3 install openpyxl --quiet`
   - `pip3 install openpyxl --quiet --break-system-packages`
   - `python3 -m pip install openpyxl --quiet`
   - `python3 -m pip install openpyxl --quiet --break-system-packages`

2. **Registra los middlewares** para los endpoints de la API (ver abajo).

### Rutas de archivos (constantes)

```js
const PORTFOLIO_DIR  // ./Portfolio/
const TRACKING_FILE  // ./Tracking/tracking.xlsx
const CONFIG_FILE    // ./config.json
const SCRIPTS_DIR    // ./scripts/
```

### Selección de archivo activo

```js
getLatestJSONPath()  // más reciente por mtime en Portfolio/*.json
getCSVPath()         // más reciente por mtime en Portfolio/*.csv
```

---

## Endpoints de la API

### GET `/api/portfolio`

Devuelve el contenido del JSON de análisis más reciente en `Portfolio/`.

**Respuesta exitosa:**
```json
{
  "ok": true,
  "data": { "_meta": {...}, "portfolio": {...}, "candidatos": {...} },
  "filename": "analysis_2026-03-10.json"
}
```

**Error:**
```json
{ "ok": false, "error": "No se encontró ningún JSON en la carpeta Portfolio" }
```

---

### GET `/api/analysis`

Alias de `/api/portfolio`. Devuelve el mismo contenido.

---

### GET `/api/config`

Lee `config.json` y devuelve la configuración persistente del usuario.

**Respuesta exitosa:**
```json
{
  "ok": true,
  "data": {
    "split": { "Core": 60, "Satellite": 30, "Wildshots": 10 },
    "monthlyBudget": 500,
    "dcaPlan": { ... },
    "tutorial": { "completed": true, "step": 4 }
  }
}
```

Si `config.json` no existe, devuelve `{ "ok": true, "data": {} }`.

---

### POST `/api/config`

Guarda la configuración del usuario en `config.json`. El frontend hace esta llamada con debounce de 800ms tras cualquier cambio de configuración.

**Body:** JSON con los campos a persistir (split, monthlyBudget, dcaPlan, tutorial, etc.)

**Respuesta:**
```json
{ "ok": true }
```

---

### GET `/api/templates`

Devuelve el contenido de `Portfolio/analysis_template.json` para usarlo como referencia al generar nuevos análisis.

**Respuesta:**
```json
{ "ok": true, "data": { ... } }
```

---

### POST `/api/snapshots`

Guarda un snapshot del portfolio actual en `Tracking/tracking.xlsx`.

**Body:** Array de objetos snapshot:
```json
[
  {
    "fecha_snapshot": "2026-03-10",
    "ticker": "MSFT",
    "bucket": "Core",
    "potencial_pct": 15.5,
    "rr": 2.1,
    "subida_max_pct": 36.0,
    "bajada_max_pct": -17.0,
    "precio_ref": 415.20
  }
]
```

**Proceso interno:**
1. Serializa el body como JSON y lo pasa por stdin a `python3 scripts/append_snapshot.py`
2. Captura stdout (resultado JSON) y stderr (errores Python)
3. Si el proceso falla, devuelve el error con `ok: false`

**Respuesta exitosa:**
```json
{ "ok": true, "added": 5, "next_row": 12 }
```

**Errores posibles:**
```json
{ "ok": false, "error": "No module named 'openpyxl'" }
{ "ok": false, "error": "tracking.xlsx no encontrado" }
```

---

## scripts/append_snapshot.py

Script Python que recibe los datos del snapshot por stdin y los escribe en `Tracking/tracking.xlsx`.

### Funcionamiento

1. Lee JSON de stdin (array de objetos snapshot)
2. Abre `Tracking/tracking.xlsx` con openpyxl
3. Activa la hoja `Snapshots`
4. **Desmerge** cualquier celda combinada en filas ≥ 3 (para evitar conflictos con filas de datos)
5. Encuentra la primera fila vacía a partir de la fila 3 (columna B = ticker)
6. Escribe cada snapshot como una fila con formato tipográfico consistente
7. Guarda el archivo

### Columnas de la hoja Snapshots

| Col | Campo | Formato |
|-----|-------|---------|
| A | `fecha_snapshot` | Texto, gris |
| B | `ticker` | Negrita |
| C | `bucket` | Texto, gris |
| D | `potencial_pct` | `0.0%` (se divide entre 100 antes de guardar) |
| E | `rr` | `0.00"x"` |
| F | `subida_max_pct` | `0.0%` |
| G | `bajada_max_pct` | `0.0%` |
| H | `precio_ref` | `€#,##0.00` |
| I–L | Campos futuros (API) | `—` (reservados) |

### Colores y estilos

```python
BORDER_CLR = "E4E4E0"  # borde sutil
PAPER      = "FFFFFF"  # fila impar
BG         = "FAFAF8"  # fila par
INK        = "0A0A0A"  # texto principal
MUTED      = "6B6B6B"  # texto secundario
FAINT      = "B0B0B0"  # texto placeholder (—)
```

Fuente: Inter 9pt. Altura de fila: 20px.

---

## config.json

Archivo de configuración persistente creado automáticamente en la raíz de `STOX/` al guardar por primera vez. No se incluye en el repositorio (ignorar en .gitignore si se usa git).

Estructura típica:

```json
{
  "split": {
    "Core": 60,
    "Satellite": 30,
    "Wildshots": 10
  },
  "monthlyBudget": 500,
  "dcaPlan": {
    "mode": "mensual",
    "periods": 12,
    "bucketAlloc": {
      "Core": 300,
      "Satellite": 150,
      "Wildshots": 50
    }
  },
  "tutorial": {
    "completed": true,
    "step": 4
  }
}
```

---

## Dependencias

### Node.js / npm

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "recharts": "^2.12.7",
  "@vitejs/plugin-react": "^4.2.0",
  "vite": "^5.2.0"
}
```

### Python

- `openpyxl` — instalado automáticamente por el servidor si no está presente
- Python 3.x requerido (`python3` en PATH)

---

## CORS

El servidor añade `Access-Control-Allow-Origin: *` en todas las respuestas de la API. Esto es aceptable para uso personal local. No desplegar en producción con esta configuración.

---

## Logs útiles en consola

Al arrancar:
```
[STOX] openpyxl OK          # o "instalando automáticamente..."
[STOX] Servidor listo
```

Al guardar snapshot:
```
[STOX snapshot] added=5 next_row=12   # éxito
[STOX snapshot] ERROR: ...            # fallo (ver mensaje)
```
