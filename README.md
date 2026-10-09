# VASUKI — Autonomous Multi-Agent Vulnerability Patching Pipeline
## Hack-a-Night 2026 | Team Soul Celestia

```
 ██╗   ██╗ █████╗ ███████╗██╗   ██╗██╗  ██╗██╗
 ██║   ██║██╔══██╗██╔════╝██║   ██║██║ ██╔╝██║
 ██║   ██║███████║███████╗██║   ██║█████╔╝ ██║
 ╚██╗ ██╔╝██╔══██║╚════██║██║   ██║██╔═██╗ ██║
  ╚████╔╝ ██║  ██║███████║╚██████╔╝██║  ██╗██║
   ╚═══╝  ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝
```

> **"Every other AI tool tells you what's broken. VASUKI fixes it, proves it's fixed, and ships the PR — with zero human intervention."**

---

## 🎯 What is VASUKI?

VASUKI is a **fully autonomous** 4-agent security pipeline that:

1. **🔍 RECON** — Scans your GitHub repo for CVEs using Semgrep + OWASP + NVD database
2. **⚡ FORGE** — Generates surgical code patches using Meta Llama 3.3 70B (via Oracle OCI Gen AI)
3. **🛡️ SHIELD** — Reviews each patch for correctness and new vulnerability introduction
4. **🧪 PROOF** — Validates patches by running your test suite inside a Docker sandbox
5. **🔀 PR** — Creates a labeled GitHub Pull Request with full evidence + confidence score

---

## 🏗️ Architecture

```
[GitHub Repo URL]
        ↓
 ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
 │  AGENT 1     │───▶│  AGENT 2     │───▶│  AGENT 3     │───▶│  AGENT 4     │
 │  RECON       │    │  FORGE       │    │  SHIELD      │    │  PROOF       │
 │  Scanner     │    │  Patcher     │    │  Reviewer    │    │  Tester      │
 │              │    │  Llama 3.3   │    │  Llama 3.3   │    │  Docker      │
 └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
        ↓                   ↓                   ↓                   ↓
  Semgrep SAST          Git Patch           Confidence          Test Results
  OWASP Dep-Check       Branch Create       Score (0-100)       Pass/Fail
  NVD CVE lookup        Commit              New vuln check       Evidence
  Blast Radius Map                                               GitHub PR ✅
```

---

## 🚀 Quick Start

### Prerequisites
- Docker + Docker Compose
- Python 3.11+
- Oracle Cloud account (for OCI Gen AI)
- GitHub Personal Access Token

### 1. Clone & Configure
```bash
git clone https://github.com/YOUR_ORG/vasuki.git
cd vasuki/backend
cp .env.example .env
# Fill in your tokens in .env
```

### 2. Start the Stack
```bash
docker-compose up -d
```

### 3. Start a Scan
```bash
curl -X POST http://localhost:8000/api/analysis/ \
  -H "Content-Type: application/json" \
  -d '{"repo_url": "https://github.com/vulnerable-org/vuln-app"}'
```

### 4. Watch Real-time (WebSocket)
```js
const ws = new WebSocket('ws://localhost:8000/ws/scan/SCAN_ID');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analysis/` | Start a new scan |
| `GET`  | `/api/analysis/{scan_id}` | Get scan status & results |
| `GET`  | `/api/analysis/` | List recent scans |
| `GET`  | `/api/reports/{scan_id}/full` | Download full report |
| `WS`   | `/ws/scan/{scan_id}` | Real-time event stream |
| `GET`  | `/api/health` | Health check |

---

## 🌩️ Infrastructure

| Component | Service | Purpose |
|-----------|---------|---------|
| Compute | Oracle Cloud A1 Flex (4 OCPU, 24GB) | Main API + n8n |
| LLM | OCI Generative AI — Llama 3.3 70B | Patch generation & review |
| Queue | Redis | Job queue + WebSocket pub/sub |
| Database | PostgreSQL | Scan results storage |
| Container | Docker-in-Docker | Sandboxed test execution |
| Workflow | n8n (self-hosted) | Agent orchestration UI |

---

## 🏆 USP vs Existing Tools

| Feature | ChatGPT | Copilot | Snyk | **VASUKI** |
|---------|---------|---------|------|----------|
| Multi-agent orchestration | ❌ | ❌ | ❌ | ✅ |
| Actually runs tests | ❌ | ❌ | ❌ | ✅ |
| Creates GitHub PR | ❌ | ❌ | partial | ✅ |
| Confidence scoring | ❌ | ❌ | ❌ | ✅ |
| Blast radius analysis | ❌ | ❌ | partial | ✅ |
| NVD CVE cross-reference | ❌ | ❌ | ✅ | ✅ |
| Zero human intervention | ❌ | ❌ | ❌ | ✅ |

---

*Built at Hack-a-Night 2026 by Team Soul Celestia*
