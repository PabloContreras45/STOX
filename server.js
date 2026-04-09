import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomBytes } from 'crypto'
import { spawnSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3000

// Data directories — Railway can override via env vars for persistent volumes
const PORTFOLIO_DIR = process.env.PORTFOLIO_DIR || path.join(__dirname, 'Portfolio')
const ANALYSIS_DIR  = process.env.ANALYSIS_DIR  || path.join(__dirname, 'Analysis')
const TEMPLATES_DIR = process.env.TEMPLATES_DIR || path.join(__dirname, 'Templates')
const TRACKING_DIR  = process.env.TRACKING_DIR  || path.join(__dirname, 'Tracking')
const CONFIG_PATH   = process.env.CONFIG_PATH   || path.join(__dirname, 'config.json')

// Ensure directories exist
;[PORTFOLIO_DIR, ANALYSIS_DIR, TEMPLATES_DIR, TRACKING_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
})

// ── Session store ────────────────────────────────────────────────────────────
const sessions = new Map()

function getUsers() {
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
    return cfg.users || []
  } catch { return [] }
}

function requireAuth(req, res) {
  const users = getUsers()
  if (!users.length) return true
  const token = req.headers['x-session-token']
  if (token && sessions.has(token)) return true
  res.status(401).json({ error: 'Unauthorized' })
  return false
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getLatestFile(dir, ext) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith(ext))
  if (!files.length) throw new Error(`No se encontró ningún ${ext} en ${dir}`)
  return files
    .map(f => ({ f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0].f
}

// ── App ──────────────────────────────────────────────────────────────────────
const app = express()
app.use(express.json())
app.use(express.text())

const cors = (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Token')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
}
app.use('/api', cors)

// POST /api/auth — validate PIN, issue token
app.post('/api/auth', (req, res) => {
  const { pin } = req.body
  const users = getUsers()
  if (!users.length) {
    const token = randomBytes(32).toString('hex')
    sessions.set(token, 'owner')
    return res.json({ ok: true, token, role: 'owner' })
  }
  const match = users.find(u => u.pin === pin)
  if (match) {
    const token = randomBytes(32).toString('hex')
    sessions.set(token, match.role)
    return res.json({ ok: true, token, role: match.role })
  }
  res.status(403).json({ ok: false, error: 'PIN incorrecto' })
})

// GET /api/auth/role — return role for current token
app.get('/api/auth/role', (req, res) => {
  const token = req.headers['x-session-token']
  const role = token ? sessions.get(token) : null
  if (role) return res.json({ ok: true, role })
  res.status(401).json({ ok: false })
})

// GET /api/config — load config
// POST /api/config — save config
app.get('/api/config', (req, res) => {
  if (!requireAuth(req, res)) return
  const content = fs.existsSync(CONFIG_PATH) ? fs.readFileSync(CONFIG_PATH, 'utf-8') : '{}'
  res.type('json').send(content)
})

app.post('/api/config', express.json(), (req, res) => {
  if (!requireAuth(req, res)) return
  try {
    const body = JSON.stringify(req.body)
    JSON.parse(body) // validate
    fs.writeFileSync(CONFIG_PATH, body, 'utf-8')
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/portfolio — serve latest CSV
// POST /api/portfolio — append line to CSV
app.get('/api/portfolio', (req, res) => {
  if (!requireAuth(req, res)) return
  try {
    const file = getLatestFile(PORTFOLIO_DIR, '.csv')
    const csvPath = path.join(PORTFOLIO_DIR, file)
    res.setHeader('X-CSV-Filename', file)
    res.type('text/csv').send(fs.readFileSync(csvPath, 'utf-8'))
  } catch (e) {
    res.status(404).json({ error: e.message })
  }
})

app.post('/api/portfolio', express.text(), (req, res) => {
  if (!requireAuth(req, res)) return
  try {
    const file = getLatestFile(PORTFOLIO_DIR, '.csv')
    const csvPath = path.join(PORTFOLIO_DIR, file)
    const current = fs.readFileSync(csvPath, 'utf-8').trimEnd()
    fs.writeFileSync(csvPath, current + '\n' + req.body, 'utf-8')
    res.send('OK')
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/analysis — serve latest JSON
app.get('/api/analysis', (req, res) => {
  if (!requireAuth(req, res)) return
  try {
    const file = getLatestFile(ANALYSIS_DIR, '.json')
    const jsonPath = path.join(ANALYSIS_DIR, file)
    res.setHeader('X-JSON-Filename', file)
    res.type('json').send(fs.readFileSync(jsonPath, 'utf-8'))
  } catch (e) {
    res.status(404).json({ error: e.message })
  }
})

// POST /api/upload/portfolio — save uploaded CSV to PORTFOLIO_DIR
app.post('/api/upload/portfolio', express.text({ type: '*/*', limit: '10mb' }), (req, res) => {
  if (!requireAuth(req, res)) return
  try {
    if (!fs.existsSync(PORTFOLIO_DIR)) fs.mkdirSync(PORTFOLIO_DIR, { recursive: true })
    fs.writeFileSync(path.join(PORTFOLIO_DIR, 'portfolio.csv'), req.body, 'utf-8')
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/upload/analysis — save uploaded JSON to ANALYSIS_DIR
app.post('/api/upload/analysis', express.text({ type: '*/*', limit: '10mb' }), (req, res) => {
  if (!requireAuth(req, res)) return
  try {
    if (!fs.existsSync(ANALYSIS_DIR)) fs.mkdirSync(ANALYSIS_DIR, { recursive: true })
    fs.writeFileSync(path.join(ANALYSIS_DIR, 'analysis.json'), req.body, 'utf-8')
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/snapshots — run Python script
app.post('/api/snapshots', express.text(), (req, res) => {
  if (!requireAuth(req, res)) return
  if (!fs.existsSync(TRACKING_DIR)) fs.mkdirSync(TRACKING_DIR, { recursive: true })
  const scriptPath = path.join(__dirname, 'scripts', 'append_snapshot.py')
  const result = spawnSync('python3', [scriptPath], {
    input: req.body, encoding: 'utf-8', timeout: 15000
  })
  if (result.error || result.status !== 0) {
    const msg = result.error?.message || result.stderr?.trim() || 'Python script error'
    return res.status(500).json({ ok: false, error: msg })
  }
  try {
    res.json(JSON.parse(result.stdout.trim()))
  } catch {
    res.status(500).json({ ok: false, error: 'Invalid script output' })
  }
})

// POST /api/templates — save template file
app.post('/api/templates', express.json(), (req, res) => {
  if (!requireAuth(req, res)) return
  try {
    const { filename, content } = req.body
    const safeName = path.basename(filename)
    if (!safeName.match(/^[\w\-. ]+\.(csv|json)$/)) throw new Error('Nombre de archivo no permitido')
    if (!fs.existsSync(TEMPLATES_DIR)) fs.mkdirSync(TEMPLATES_DIR, { recursive: true })
    fs.writeFileSync(path.join(TEMPLATES_DIR, safeName), content, 'utf-8')
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Serve React SPA ──────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')))
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`[STOX] Servidor en puerto ${PORT}`)
})
