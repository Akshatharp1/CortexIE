# CortexIE — AI-Powered Intelligent Sandbox Orchestration

> **Environment-as-a-Service for RealPage Integrated Environments (IE).**
> Provision standardized, production-like sandbox environments for any RealPage product in minutes instead of days.

CortexIE is a full-stack prototype with two parts:

1. **A React + Material UI frontend** — a guided, self-service experience for describing, planning, provisioning, monitoring, and managing sandbox environments.
2. **A Node/Express backend** — an orchestrator that provisions **real local processes** (one OS process per service, each bound to a real port with a live `/health` endpoint) and reports live CPU/memory via `pidusage`.

The frontend can run on its own against in-memory mock data, or against the backend for real process lifecycle management.

---

## ✨ What it shows

| Area | Feature |
|------|---------|
| **Self-service creation** | A guided wizard: describe an environment in natural language → AI generates a provisioning plan → one-click provision with a live rollout. Lets you pick a **product**, a **storage class**, and either name a **pipeline branch** or fall back to the global version tag. |
| **AI configuration engine** | Toggle-able. **Rule-based** by default (offline, deterministic). Optionally switch to the **Claude API** (`claude-opus-4-8`) to generate plans as structured JSON — with automatic fallback to rule-based if the call fails. |
| **Live monitoring** | Real (or simulated) CPU/memory, a fleet health matrix, and configuration-drift detection with one-click remediation. |
| **Products & cloning** | Reusable sandbox templates per product, one-click provision, and sandbox cloning. |
| **RBAC** | Team members, roles, and a permission matrix (Platform Admin / Engineer / QA / Viewer). |

## 🧱 Tech stack

**Frontend**
- **React 18** + **Vite 5**
- **Material UI v5** (`@mui/material`, `@mui/icons-material`, `@mui/x-data-grid`) — dark "control center" theme
- **Recharts** for analytics/monitoring charts
- **React Router** for navigation
- **@anthropic-ai/sdk** for the optional Claude-backed planning path

**Backend**
- **Node.js** (ES modules) + **Express 4**
- **cors** for cross-origin during dev
- **pidusage** for live per-process CPU/memory sampling
- Real child processes via Node's built-in `child_process.fork`

## ✅ Prerequisites

- **Node.js 18+** (for the built-in `fetch` used by the API client and ES module support) and **npm**.
- That's it — no database, Docker, or cloud account required. The backend provisions plain local Node processes.

## 📦 Install dependencies

From the project root:

```bash
npm install
```

This installs everything in `package.json` (both frontend and backend deps live in one package).

## 🚀 Running it

There are three ways to run, depending on what you want.

### 1. Full stack (recommended) — frontend + real backend

```bash
npm start
```

This uses `concurrently` to launch both:
- **Backend** on http://localhost:4000 (Express API + real sandbox processes; it also seeds one initial environment on boot).
- **Frontend** on http://localhost:5173 (Vite dev server, opens automatically).

Vite proxies `/api` → `http://localhost:4000` (see [vite.config.js](vite.config.js)), so the UI talks to the backend with no extra config.

### 2. Frontend only

```bash
npm run dev
```

Runs just the Vite dev server at http://localhost:5173. Use this if you only want to work on the UI against mocked data.

### 3. Backend only

```bash
npm run server
```

Runs just the Express orchestrator at http://localhost:4000. Useful for poking the API directly:

```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/environments
```

### Production build

```bash
npm run build     # build the frontend to dist/
npm run preview   # preview the production build locally
```

## 🔌 Backend API (port 4000)

| Method | Route | Description |
|--------|-------|-------------|
| `GET`  | `/api/health` | Backend liveness check. |
| `GET`  | `/api/environments` | List all environments. |
| `GET`  | `/api/environments/:id` | Get one environment. |
| `POST` | `/api/environments` | Create (provision) an environment from a `{ plan, name, owner }` body. |
| `POST` | `/api/environments/:id/clone` | Clone an existing environment. |
| `POST` | `/api/environments/:id/pause` | Stop the environment's service processes. |
| `POST` | `/api/environments/:id/resume` | Re-spawn the environment's services. |
| `POST` | `/api/environments/:id/rollback` | Restore dead services to a healthy baseline. |
| `DELETE`| `/api/environments/:id` | Terminate and remove the environment. |
| `GET`  | `/api/activities` | Recent activity feed. |

Each provisioned service is a real process serving an HTML status page at `http://localhost:<servicePort>` and JSON at `/health`. Service ports are allocated starting at `8100`.

## 🤖 Using the Claude-backed AI engine (optional)

1. Go to **Settings → AI configuration engine** and switch to **Claude API**.
2. Paste an Anthropic API key.
3. On **Create Sandbox**, the plan is now generated by `claude-opus-4-8` (structured JSON output, adaptive thinking).

**Security note:** This prototype calls the Claude API directly from the browser (`dangerouslyAllowBrowser: true`) and keeps the key in memory only. In production, **never ship an API key to the browser** — proxy the call through a backend service. The rule-based engine remains the safe default for demos.

## 🗂️ Project structure

```
RealHack/
├── index.html                 # Vite entry HTML
├── vite.config.js             # Vite config + /api → :4000 proxy
├── package.json               # Scripts + frontend & backend dependencies
│
├── server/                    # Node/Express backend (real process orchestration)
│   ├── index.js               # REST API over the orchestrator
│   ├── orchestrator.js        # Provision/pause/resume/clone/rollback/terminate; live stats
│   └── service-runtime.js     # Per-service process: binds a port, serves /health + status page
│
├── src/                       # React frontend
│   ├── main.jsx               # React entry
│   ├── App.jsx                # Routes
│   ├── theme.js               # MUI dark theme
│   ├── ai/
│   │   └── engine.js          # AI planning engine (rule-based + Claude)
│   ├── api/
│   │   └── client.js          # Thin REST client for the backend
│   ├── components/            # Layout, StatCard, StatusChip
│   ├── context/
│   │   └── AppContext.jsx     # App state + actions + live simulation
│   ├── data/
│   │   └── mockData.js        # Products, environments, templates, users,
│   │                          #   storage classes, Loft products, pipeline version
│   └── pages/
│       ├── Dashboard.jsx
│       ├── CreateSandbox.jsx          # the self-service wizard (centerpiece)
│       ├── Environments.jsx
│       ├── EnvironmentDetail.jsx
│       ├── Products.jsx
│       ├── Monitoring.jsx
│       ├── AccessControl.jsx
│       └── Settings.jsx
│
└── dist/                      # Production build output (generated by `npm run build`)
```

## 📊 Business value (the pitch)

- Cuts sandbox setup from **hours/days → minutes**.
- **Standardizes** environments via reusable blueprints → fewer config inconsistencies.
- **Self-service + RBAC** lets any RealPage team provision safely without deep infra expertise.

---

*Prototype built for RealHack. The frontend can run on mocked data; the backend provisions real local Node processes.*
