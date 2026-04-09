# STOX

Dashboard personal de inversión con análisis de portfolio, plan DCA y análisis geopolítico integrado con Claude.

## Funcionalidades

- **Portfolio** — carga tu historial de operaciones (CSV) y visualiza distribución por bucket (Core / Satellite / Wildshots)
- **Evolución** — gráfico de capital invertido histórico + proyección futura
- **Candidates** — tabla de candidatos con R/R, potencial, convicción y capital objetivo por ticker
- **Movimientos** — plan DCA automatizado con recomendaciones de compra/venta
- **Análisis** — fichas detalladas por ticker con tesis, ventaja competitiva y estimaciones
- **Análisis geopolítico** — generador de prompts para Claude con contexto de portfolio
- **Config** — gestión de datos, accesos y sincronización remota

## Acceso

La app está protegida por PIN. Hay tres niveles de acceso:

| Rol | Acceso |
|-----|--------|
| Superadmin | Acceso total + gestión de usuarios + sync remoto |
| Full View | Vista completa, sin edición |
| View | Vista de análisis y config, sin pestaña Evolución |

Los PINs se configuran en `config.json` (no incluido en el repo).

## Instalación local

```bash
git clone https://github.com/PabloContreras45/STOX.git
cd STOX
npm install
```

Crea un `config.json` en la raíz:

```json
{
  "users": [
    { "pin": "XXXX", "role": "owner" },
    { "pin": "XXXX", "role": "viewer" },
    { "pin": "XXXX", "role": "restricted" }
  ]
}
```

Añade tu CSV de operaciones en `Portfolio/` y tu JSON de análisis en `Analysis/`.

```bash
npm run dev
```

## Despliegue en Railway

```bash
npm run build
npm start        # node server.js, usa process.env.PORT
```

En Railway: conecta el repo de GitHub, el build y start se detectan automáticamente.

Para sincronizar datos locales al servidor remoto: **Config → Sincronización remota** (solo Superadmin).

## Estructura

```
src/
  App.jsx                  # Estado global y layout
  main.jsx                 # Entry point + auth fetch patch
  theme.js                 # Tokens de color y estilos compartidos
  constants.js             # Demo data, i18n, tutorial
  components/              # Componentes reutilizables
  tabs/                    # Una tab por vista
  hooks/                   # useConfig, useDCAPlan
  utils/                   # csv, analysis, format
server.js                  # Servidor Express para producción
vite.config.js             # Dev server + API middleware
```

## Formato CSV

```
Action,Date,Quantity,Company,Industry,Bucket
Buy,01/03/2026,90.00 EUR,Vanguard S&P 500 (VOO),ETF,Core
Buy,01/03/2026,125.00 EUR,NVIDIA (NVDA),Technology,Satellite
```

## Datos excluidos del repo

`config.json`, `Portfolio/`, `Analysis/`, `Tracking/` — datos personales, ver `.gitignore`.
