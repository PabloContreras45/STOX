import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'
import { randomBytes } from 'crypto'

const __dirname   = path.dirname(fileURLToPath(import.meta.url))
const PORTFOLIO_DIR = path.join(__dirname, 'Portfolio')
const ANALYSIS_DIR  = path.join(__dirname, 'Analysis')
const TEMPLATES_DIR = path.join(__dirname, 'Templates')
const TRACKING_DIR  = path.join(__dirname, 'Tracking')
const CONFIG_PATH   = path.join(__dirname, 'config.json')

function getCSVPath() {
  const files = fs.readdirSync(PORTFOLIO_DIR).filter(f => f.endsWith('.csv'))
  if (!files.length) throw new Error('No se encontró ningún CSV en la carpeta Portfolio')
  const latest = files
    .map(f => ({ f, mtime: fs.statSync(path.join(PORTFOLIO_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0].f
  return path.join(PORTFOLIO_DIR, latest)
}

function getLatestJSONPath() {
  const files = fs.readdirSync(ANALYSIS_DIR).filter(f => f.endsWith('.json'))
  if (!files.length) throw new Error('No se encontró ningún JSON en la carpeta Analysis')
  const latest = files
    .map(f => ({ f, mtime: fs.statSync(path.join(ANALYSIS_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0].f
  return path.join(ANALYSIS_DIR, latest)
}

// In-memory session store: token → role
const sessions = new Map()

function getUsers() {
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
    return cfg.users || []
  } catch { return [] }
}

function requireAuth(req, res) {
  const users = getUsers()
  if (!users.length) return true // no users configured → open access
  const token = req.headers['x-session-token']
  if (token && sessions.has(token)) return true
  res.writeHead(401)
  res.end(JSON.stringify({ error: 'Unauthorized' }))
  return false
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'portfolio-api',
      configureServer(server) {
        // ── Auto-install openpyxl if missing (one-time, silent) ──────────
        const pyCheck = spawnSync('python3', ['-c', 'import openpyxl'], { encoding: 'utf-8' })
        if (pyCheck.status !== 0) {
          console.log('\n[STOX] openpyxl no encontrado — instalando automáticamente...')
          // Try pip3 first, then python3 -m pip, then with --break-system-packages
          const pipCmds = [
            ['pip3', ['install', 'openpyxl', '--quiet']],
            ['pip3', ['install', 'openpyxl', '--quiet', '--break-system-packages']],
            ['python3', ['-m', 'pip', 'install', 'openpyxl', '--quiet']],
            ['python3', ['-m', 'pip', 'install', 'openpyxl', '--quiet', '--break-system-packages']],
          ]
          let installed = false
          for (const [cmd, args] of pipCmds) {
            const r = spawnSync(cmd, args, { encoding: 'utf-8' })
            if (r.status === 0) {
              console.log('[STOX] openpyxl instalado correctamente ✓\n')
              installed = true
              break
            }
          }
          if (!installed) {
            console.warn('[STOX] No se pudo instalar openpyxl automáticamente.')
            console.warn('[STOX] Ejecuta manualmente: pip3 install openpyxl\n')
          }
        }

        // ── /api/auth  POST: validate PIN, issue session token ────────────
        server.middlewares.use('/api/auth', (req, res, next) => {
          // Skip sub-paths like /api/auth/role (connect strips prefix, so req.url becomes '/role')
          if (req.url !== '/' && req.url !== '') { next(); return }
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', chunk => body += chunk)
            req.on('end', () => {
              try {
                const { pin } = JSON.parse(body)
                const users = getUsers()
                if (!users.length) {
                  // No users configured → grant owner access
                  const token = randomBytes(32).toString('hex')
                  sessions.set(token, 'owner')
                  res.writeHead(200)
                  res.end(JSON.stringify({ ok: true, token, role: 'owner' }))
                  return
                }
                const match = users.find(u => u.pin === pin)
                if (match) {
                  const token = randomBytes(32).toString('hex')
                  sessions.set(token, match.role)
                  res.writeHead(200)
                  res.end(JSON.stringify({ ok: true, token, role: match.role }))
                } else {
                  res.writeHead(403)
                  res.end(JSON.stringify({ ok: false, error: 'PIN incorrecto' }))
                }
              } catch (e) {
                res.writeHead(500); res.end(JSON.stringify({ error: e.message }))
              }
            })
          }
        })

        // ── /api/auth/role  GET: return role for current token ────────────
        server.middlewares.use('/api/auth/role', (req, res) => {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Headers', 'X-Session-Token')
          const token = req.headers['x-session-token']
          const role = token ? sessions.get(token) : null
          if (role) {
            res.writeHead(200)
            res.end(JSON.stringify({ ok: true, role }))
          } else {
            res.writeHead(401)
            res.end(JSON.stringify({ ok: false }))
          }
        })

        server.middlewares.use('/api/analysis', (req, res) => {
          res.setHeader('Access-Control-Allow-Origin', '*')
          if (!requireAuth(req, res)) return
          if (req.method === 'GET') {
            try {
              const jsonPath = getLatestJSONPath()
              const content = fs.readFileSync(jsonPath, 'utf-8')
              res.setHeader('Content-Type', 'application/json')
              res.setHeader('X-JSON-Filename', path.basename(jsonPath))
              res.writeHead(200)
              res.end(content)
            } catch (e) {
              res.writeHead(404)
              res.end(JSON.stringify({ error: e.message }))
            }
          }
        })

        server.middlewares.use('/api/portfolio', (req, res) => {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Token')
          if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
          if (!requireAuth(req, res)) return

          if (req.method === 'GET') {
            try {
              const csvPath = getCSVPath()
              const content = fs.readFileSync(csvPath, 'utf-8')
              res.setHeader('Content-Type', 'text/csv')
              res.setHeader('X-CSV-Filename', path.basename(csvPath))
              res.writeHead(200)
              res.end(content)
            } catch (e) {
              res.writeHead(404)
              res.end(JSON.stringify({ error: e.message }))
            }

          } else if (req.method === 'POST') {
            let body = ''
            req.on('data', chunk => body += chunk)
            req.on('end', () => {
              try {
                const csvPath = getCSVPath()
                const current = fs.readFileSync(csvPath, 'utf-8').trimEnd()
                fs.writeFileSync(csvPath, current + '\n' + body, 'utf-8')
                res.writeHead(200)
                res.end('OK')
              } catch (e) {
                res.writeHead(500)
                res.end(JSON.stringify({ error: e.message }))
              }
            })
          }
        })

        // ── /api/config  GET: load saved params  POST: save params ────────
        server.middlewares.use('/api/config', (req, res) => {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Token')
          if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
          if (!requireAuth(req, res)) return

          if (req.method === 'GET') {
            try {
              const content = fs.existsSync(CONFIG_PATH)
                ? fs.readFileSync(CONFIG_PATH, 'utf-8')
                : '{}'
              res.setHeader('Content-Type', 'application/json')
              res.writeHead(200)
              res.end(content)
            } catch (e) {
              res.writeHead(500); res.end(JSON.stringify({ error: e.message }))
            }

          } else if (req.method === 'POST') {
            let body = ''
            req.on('data', chunk => body += chunk)
            req.on('end', () => {
              try {
                JSON.parse(body) // validate JSON
                fs.writeFileSync(CONFIG_PATH, body, 'utf-8')
                res.writeHead(200); res.end(JSON.stringify({ ok: true }))
              } catch (e) {
                res.writeHead(500); res.end(JSON.stringify({ error: e.message }))
              }
            })
          }
        })

        // ── /api/upload/portfolio  POST: receive CSV and save ─────────────
        server.middlewares.use('/api/upload/portfolio', (req, res) => {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Token')
          if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
          if (!requireAuth(req, res)) return
          let body = ''
          req.on('data', chunk => body += chunk)
          req.on('end', () => {
            try {
              if (!fs.existsSync(PORTFOLIO_DIR)) fs.mkdirSync(PORTFOLIO_DIR, { recursive: true })
              fs.writeFileSync(path.join(PORTFOLIO_DIR, 'portfolio.csv'), body, 'utf-8')
              res.writeHead(200); res.end(JSON.stringify({ ok: true }))
            } catch (e) {
              res.writeHead(500); res.end(JSON.stringify({ error: e.message }))
            }
          })
        })

        // ── /api/upload/analysis  POST: receive JSON and save ─────────────
        server.middlewares.use('/api/upload/analysis', (req, res) => {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Token')
          if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
          if (!requireAuth(req, res)) return
          let body = ''
          req.on('data', chunk => body += chunk)
          req.on('end', () => {
            try {
              if (!fs.existsSync(ANALYSIS_DIR)) fs.mkdirSync(ANALYSIS_DIR, { recursive: true })
              fs.writeFileSync(path.join(ANALYSIS_DIR, 'analysis.json'), body, 'utf-8')
              res.writeHead(200); res.end(JSON.stringify({ ok: true }))
            } catch (e) {
              res.writeHead(500); res.end(JSON.stringify({ error: e.message }))
            }
          })
        })

        // ── /api/snapshots  POST: append rows to tracking.xlsx ─────────
        server.middlewares.use('/api/snapshots', (req, res) => {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Token')
          if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
          if (!requireAuth(req, res)) return

          if (req.method === 'POST') {
            let body = ''
            req.on('data', chunk => body += chunk)
            req.on('end', () => {
              try {
                if (!fs.existsSync(TRACKING_DIR)) fs.mkdirSync(TRACKING_DIR, { recursive: true })
                const scriptPath = path.join(__dirname, 'scripts', 'append_snapshot.py')
                const result = spawnSync('python3', [scriptPath], {
                  input: body, encoding: 'utf-8', timeout: 15000
                })
                if (result.error) {
                  // spawnSync itself failed (e.g. python3 not found)
                  const msg = `No se pudo ejecutar python3: ${result.error.message}`
                  console.error('[STOX /api/snapshots]', msg)
                  res.writeHead(500); res.end(JSON.stringify({ ok: false, error: msg })); return
                }
                if (result.status !== 0) {
                  const msg = (result.stderr || '').trim() || 'Python script error'
                  console.error('[STOX /api/snapshots] Python error:\n' + msg)
                  res.writeHead(500); res.end(JSON.stringify({ ok: false, error: msg })); return
                }
                const out = JSON.parse(result.stdout.trim())
                res.writeHead(out.ok ? 200 : 500)
                res.end(JSON.stringify(out))
              } catch (e) {
                console.error('[STOX /api/snapshots] Unexpected error:', e.message)
                res.writeHead(500); res.end(JSON.stringify({ ok: false, error: e.message }))
              }
            })
          }
        })

        server.middlewares.use('/api/templates', (req, res) => {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Token')
          if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
          if (!requireAuth(req, res)) return

          if (req.method === 'POST') {
            let body = ''
            req.on('data', chunk => body += chunk)
            req.on('end', () => {
              try {
                const { filename, content } = JSON.parse(body)
                if (!filename || typeof content !== 'string') throw new Error('filename y content son requeridos')
                // Security: only allow safe filenames (no path traversal)
                const safeName = path.basename(filename)
                if (!safeName.match(/^[\w\-. ]+\.(csv|json)$/)) throw new Error('Nombre de archivo no permitido')
                if (!fs.existsSync(TEMPLATES_DIR)) fs.mkdirSync(TEMPLATES_DIR, { recursive: true })
                const filePath = path.join(TEMPLATES_DIR, safeName)
                fs.writeFileSync(filePath, content, 'utf-8')
                res.writeHead(200)
                res.end(JSON.stringify({ ok: true, path: filePath }))
              } catch (e) {
                res.writeHead(500)
                res.end(JSON.stringify({ error: e.message }))
              }
            })
          }
        })
      }
    }
  ]
})
