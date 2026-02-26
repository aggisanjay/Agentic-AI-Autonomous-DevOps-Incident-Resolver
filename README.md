# 🤖 Agentic AI Autonomous DevOps Incident Resolver

A full-stack agentic AI system that **automatically investigates and resolves production incidents** using Google Gemini. When an incident is triggered, an autonomous AI agent gathers diagnostics, performs root-cause analysis, executes a remediation action, and delivers a structured SRE incident report — all without human intervention.

---

## ✨ Features

- **Autonomous Incident Resolution** — AI agent runs a full 3-phase pipeline: diagnostics → analysis → remediation
- **Gemini-Powered Analysis** — Uses Google Gemini to generate detailed SRE incident reports with root cause analysis
- **Real-Time Updates** — Live WebSocket streaming so the dashboard updates as the agent works
- **Tool-Based Agent** — Agent uses a suite of DevOps tools: log checking, metrics, health checks, service restarts, pod scaling
- **BullMQ Job Queue** — Incidents are queued with Redis and processed reliably with retry/backoff
- **Persistent Memory** — Each incident's investigation steps are stored in Redis for full audit trail
- **Graceful Fallback** — Automated fallback analysis if Gemini API is rate-limited or unavailable
- **React Dashboard** — Live incident feed with detail view, timeline, and AI-generated resolution report

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                        │
│          Dashboard · Incident Detail · Timeline           │
└──────────────────────┬──────────────────────────────────┘
                       │  REST + WebSocket (Socket.io)
┌──────────────────────▼──────────────────────────────────┐
│                   Express Server                          │
│         REST API · Socket.io · Redis client               │
└──────────┬──────────────────────────┬───────────────────┘
           │ BullMQ Queue             │ Redis
┌──────────▼─────────┐    ┌───────────▼──────────────────┐
│   BullMQ Worker    │    │            Redis               │
│                    │    │  • Incident state              │
│  Phase 1: Tools    │    │  • Agent memory / steps        │
│  Phase 2: Gemini   │    │  • Job queue                   │
│  Phase 3: Action   │    └──────────────────────────────┘
└────────────────────┘
```

### The 3-Phase Agent Pipeline

| Phase | Name | Description |
|-------|------|-------------|
| 1 | **Gather Diagnostics** | Runs `check_logs`, `check_metrics`, `run_healthcheck` for the affected service |
| 2 | **AI Analysis** | Sends all diagnostic data to Gemini in a single prompt; receives structured JSON with root cause + recommended action |
| 3 | **Execute & Resolve** | Runs `restart_service` or `scale_pods` as recommended; marks incident resolved |

---

## 🛠️ Agent Tools

| Tool | Description |
|------|-------------|
| `check_logs` | Retrieves recent application logs for a service |
| `check_metrics` | Fetches CPU, memory, latency, error rate, pod metrics |
| `run_healthcheck` | Hits service health endpoints and checks all dependencies |
| `restart_service` | Performs a rolling restart of the service |
| `scale_pods` | Scales the service to a target number of replicas (1–10) |
| `resolve_incident` | Marks the incident as resolved with a full summary |

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, Zustand, Socket.io-client |
| **Backend** | Node.js, Express, Socket.io |
| **AI** | Google Gemini (`@google/genai`) |
| **Queue** | BullMQ |
| **Cache / State** | Redis (ioredis) |
| **Monorepo** | npm workspaces + concurrently |

---

## 📁 Project Structure

```
incident-resolver/
├── client/                   # React frontend (Vite)
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx         # Live incident feed
│       │   └── IncidentDetail.jsx    # Timeline + resolution report
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── Timeline.jsx          # Agent step timeline
│       │   └── CreateIncidentModal.jsx
│       ├── store/
│       │   └── incidentStore.js      # Zustand store
│       └── sockets/
│           └── socket.js             # Socket.io client
│
├── server/                   # Express API server
│   ├── index.js              # Entry point
│   ├── routes/incidents.js   # REST endpoints
│   ├── controllers/incidentController.js
│   ├── websocket/handler.js  # Socket.io events
│   ├── redis/
│   │   ├── client.js         # Redis connection
│   │   └── queue.js          # BullMQ queue
│   └── services/
│       ├── fakeLogs.js       # Simulated log generator
│       └── fakeMetrics.js    # Simulated metrics generator
│
├── worker/                   # BullMQ agent worker
│   ├── processor.js          # Main job processor (3-phase pipeline)
│   └── agent/
│       ├── planner.js        # Gemini-powered analysis
│       ├── tools.js          # Tool definitions & execution
│       ├── memory.js         # Incident step memory (Redis)
│       └── notifier.js       # WebSocket event emitter
│
├── shared/
│   └── types.js              # Shared enums (IncidentStatus, ToolName)
│
└── package.json              # Root monorepo package
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **Redis** running locally on port `6379` (or provide connection config via `.env`)
- **Google Gemini API Key** — get one at [Google AI Studio](https://aistudio.google.com)

### 1. Clone & Install

```bash
git clone https://github.com/your-username/Agentic-AI-Autonomous-DevOps-Incident-Resolver.git
cd Agentic-AI-Autonomous-DevOps-Incident-Resolver
npm install
```

### 2. Configure Environment Variables

Create `.env` files in both `server/` and `worker/`:

**`server/.env`**
```env
PORT=4000
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=your_password   # if using a secured Redis
```

**`worker/.env`**
```env
GEMINI_API_KEY=your_gemini_api_key_here
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=your_password
```

### 3. Start Redis

```bash
# macOS (Homebrew)
brew services start redis

# Linux
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:alpine
```

### 4. Run the Application

```bash
# Start all three services concurrently (server, worker, client)
npm run dev
```

Or run each service individually:

```bash
npm run dev:server   # Express API on http://localhost:4000
npm run dev:worker   # BullMQ agent worker
npm run dev:client   # React app on http://localhost:5173
```

---

## 📖 How It Works

### Creating an Incident

1. Open the dashboard at `http://localhost:5173`
2. Click **"Create Incident"** and fill in the service name, severity, and description
3. Submit — the incident is saved to Redis and a job is pushed to the BullMQ queue

### Agent Execution

The worker picks up the job and runs the 3-phase pipeline:

```
[OPEN] → [INVESTIGATING] → [IDENTIFIED] → [MITIGATING] → [RESOLVED]
```

Each step is emitted via WebSocket so the dashboard timeline updates live.

### Incident Report

Gemini generates a full Markdown SRE report including:

- **Initial Assessment & Triage**
- **Diagnostic Summary** (log analysis, metrics, health check)
- **Root Cause Analysis**
- **Mitigation Actions Taken**
- **Post-Mortem & Preventative Measures**

---

## 🔌 API Reference

### Incidents

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/incidents` | List all incidents |
| `POST` | `/api/incidents` | Create a new incident |
| `GET` | `/api/incidents/:id` | Get incident details |
| `GET` | `/api/health` | Server health check |

### WebSocket Events (Socket.io)

| Event | Direction | Payload |
|-------|-----------|---------|
| `incident:update` | Server → Client | `{ incidentId, status, ...extra }` |
| `incident:step` | Server → Client | Agent step details |
| `incident:thinking` | Server → Client | `{ incidentId, message }` |
| `incident:complete` | Server → Client | `{ status, resolution, totalSteps }` |
| `incident:error` | Server → Client | `{ incidentId, error }` |

---

## ⚙️ Configuration

### Rate Limiting & Retries

The Gemini planner automatically handles rate limiting with exponential backoff:

- **Max retries:** 3
- **Initial backoff:** 5 seconds (doubles each retry: 5s → 10s → 20s)
- **Fallback:** If Gemini is unavailable after all retries, a rule-based fallback analysis runs automatically

### BullMQ Worker

- **Concurrency:** 2 incidents processed simultaneously
- **Job attempts:** 3 (with exponential backoff starting at 2s)
- **Stall detection:** 30-second interval

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgements

- [Google Gemini](https://deepmind.google/technologies/gemini/) for AI-powered incident analysis
- [BullMQ](https://bullmq.io/) for reliable job queue processing
- [Socket.io](https://socket.io/) for real-time WebSocket communication
