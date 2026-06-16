// CortexIE — per-service runtime.
//
// This file IS a real sandbox service. The orchestrator forks one Node process
// per service in an environment; each process binds a real port and serves a
// real HTTP endpoint. Opening http://localhost:<port> in a browser shows a
// live page; GET /health returns JSON used for health checks.

import http from 'http'

const PORT = Number(process.env.SERVICE_PORT)
const NAME = process.env.SERVICE_NAME || 'service'
const ENV_NAME = process.env.ENV_NAME || 'sandbox'
const ENV_ID = process.env.ENV_ID || '-'
const PRODUCT = process.env.PRODUCT || '-'
const started = Date.now()

const uptime = () => Math.round((Date.now() - started) / 1000)

const page = () => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>${NAME} · CortexIE sandbox</title>
<style>
  body{margin:0;font-family:Inter,Segoe UI,system-ui,sans-serif;background:#0b0e1a;color:#e8ecf6;
       display:flex;min-height:100vh;align-items:center;justify-content:center}
  .card{background:#141a2e;border:1px solid rgba(148,160,189,.18);border-radius:16px;padding:40px 48px;max-width:560px}
  .dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:#3ddc97;margin-right:8px;
       box-shadow:0 0 0 4px rgba(61,220,151,.18)}
  h1{margin:.2em 0;font-size:26px}
  code{background:#0b0e1a;padding:2px 8px;border-radius:6px;color:#19d3c5}
  .grid{display:grid;grid-template-columns:auto 1fr;gap:8px 18px;margin-top:18px;font-size:14px;color:#94a0bd}
  .grid b{color:#e8ecf6}
  .badge{display:inline-block;background:linear-gradient(135deg,#7c5cff,#19d3c5);color:#fff;
         padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700}
</style></head>
<body><div class="card">
  <span class="badge">CortexIE managed</span>
  <h1><span class="dot"></span>${NAME}</h1>
  <div>This is a <b>live sandbox service</b> running as a real OS process.</div>
  <div class="grid">
    <span>Environment</span><b>${ENV_NAME}</b>
    <span>Environment ID</span><code>${ENV_ID}</code>
    <span>Product</span><b>${PRODUCT}</b>
    <span>Port</span><code>${PORT}</code>
    <span>PID</span><code>${process.pid}</code>
    <span>Uptime</span><b>${uptime()}s</b>
    <span>Health</span><code>GET /health</code>
  </div>
</div></body></html>`

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'healthy', service: NAME, env: ENV_NAME, pid: process.pid, uptimeSec: uptime() }))
    return
  }
  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end(page())
})

server.listen(PORT, () => {
  if (process.send) process.send({ type: 'ready', service: NAME, port: PORT, pid: process.pid })
})

// Graceful shutdown when the orchestrator kills us.
process.on('SIGTERM', () => server.close(() => process.exit(0)))
process.on('SIGINT', () => server.close(() => process.exit(0)))
