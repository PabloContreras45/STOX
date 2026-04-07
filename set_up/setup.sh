#!/bin/bash
set -e
echo "◆ STOX — Configurando..."
# Subir al directorio raíz de STOX (padre de set_up/)
cd "$(dirname "$0")/.."

# Install deps locally
npm install --silent react react-dom recharts 2>/dev/null || {
  echo "ERROR: npm no encontrado. Instala Node.js desde https://nodejs.org"
  exit 1
}

# Bundle with esbuild (comes with recharts)
./node_modules/.bin/esbuild Code/stox_1.jsx \
  --bundle \
  --outfile=stox_app.html \
  --format=iife \
  --global-name=__STOX \
  --loader:.jsx=jsx 2>/dev/null

# Build final HTML
node -e "
const fs = require('fs');
const js = fs.readFileSync('stox_app.html','utf8')
  .replace('export default function App()', 'function App()')
  .replace(/^var __STOX.*\(function\(\) \{/, '')
  .replace(/\}\);\s*$/, '')
  + '\nReactDOM.createRoot(document.getElementById(\"root\")).render(React.createElement(App));';
// this approach won't work cleanly - use proper bundling
" 2>/dev/null

# Better: full bundle approach
node << 'NODE'
const { execSync } = require('child_process');
const fs = require('fs');

// Create entry that uses ESM properly
fs.writeFileSync('/tmp/entry.jsx', fs.readFileSync('Code/stox_1.jsx','utf8')
  .replace('export default function App()', 'function App()')
  + '\nReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));'
);

// Bundle everything including react, react-dom, recharts
execSync('./node_modules/.bin/esbuild /tmp/entry.jsx ' +
  '--bundle --outfile=/tmp/stox_bundle.js ' +
  '--format=iife --loader:.jsx=jsx ' +
  '--define:process.env.NODE_ENV=\'"production"\'',
  {stdio: 'inherit'}
);

const js = fs.readFileSync('/tmp/stox_bundle.js','utf8');
const html = `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>◆ STOX</title>
<style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{background:#FAFAF8}input[type=range]{-webkit-appearance:none;height:4px;border-radius:2px;background:#E4E4E0}input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;cursor:pointer}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:#C8C8C4;border-radius:3px}</style>
</head><body>
<div id="root"></div>
<script>${js}</script>
</body></html>`;

fs.writeFileSync('set_up/stox_legacy.html', html);
console.log('✅ set_up/stox_legacy.html generado (' + Math.round(html.length/1024) + ' KB)');
NODE

# Open in browser
echo "🚀 Abriendo STOX en el navegador..."
if command -v open &>/dev/null; then open set_up/stox_legacy.html   # macOS
elif command -v xdg-open &>/dev/null; then xdg-open set_up/stox_legacy.html  # Linux
fi
