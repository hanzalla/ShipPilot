# ShipPilot

**Ship your code with confidence. From Commit to Cloud.**

ShipPilot is a self-service deployment platform that connects GitHub repositories with Azure infrastructure through automated CI/CD workflows — giving development teams one central place to request, track, and govern application deployments.

> This is an active portfolio and learning project demonstrating Platform Engineering, DevOps, and cloud deployment practices end-to-end.

---

## The Problem

Development teams deploy through scattered scripts, GitHub Actions pages, cloud portals, and Slack messages. This leads to:

- Inconsistent deployment steps across environments
- Poor visibility into what is running where
- No simple way to redeploy or roll back a known release
- Risky manual Production deployments with no audit trail

ShipPilot brings these activities into one interface and uses automation underneath.

---

## What ShipPilot Does

- Connect a GitHub repository and register it as an Application
- Configure Development, Staging, and Production environments
- Request a deployment by selecting a branch or commit
- ShipPilot triggers the configured GitHub Actions workflow
- Track the deployment pipeline — queued, running, succeeded, or failed
- Inspect logs, commit details, timestamps, and duration
- Redeploy or roll back to a previous known-good release
- Full audit history of who deployed what and when

---

## Architecture

```
Developer
    │
    ▼
ShipPilot Web UI          (HTML / CSS / Vanilla JS)
    │
    ▼
ShipPilot REST API        (Node.js / Express)
    │              │
    ▼              ▼
MySQL DB       GitHub API
               Repositories
               Workflow Runs
                    │
                    ▼
             GitHub Actions
             Build / Test / Docker
                    │
                    ▼
             Azure App Service
             (AKS — planned)
                    │
                    ▼
             Health Check
```

**ShipPilot is a deployment control plane — not a replacement for GitHub Actions, Docker, or Azure. It connects and governs those tools.**

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend | Node.js, Express |
| Database | MySQL 8 |
| CI/CD | GitHub Actions |
| Containerization | Docker |
| Container Registry | Azure Container Registry (ACR) |
| Cloud | Microsoft Azure |
| Initial Deploy Target | Azure App Service |
| Future Deploy Target | Azure Kubernetes Service (AKS) |
| Infrastructure as Code | Terraform |
| Secrets | Azure Key Vault / GitHub Actions Secrets |
| Monitoring | Azure Monitor, Application Insights |

---

## Project Structure

```
shippilot/
├── frontend/           # UI — HTML, CSS, Vanilla JS
├── backend/            # Node.js REST API
├── demo-app/           # Sample app used for CI/CD demonstration
├── database/           # SQL schema and migrations
├── infra/
│   └── terraform/      # Azure infrastructure as code
├── docs/               # Architecture diagrams and documentation
├── .github/
│   └── workflows/      # GitHub Actions CI/CD pipelines
├── docker-compose.yml  # Local development environment
└── README.md
```

---

## Local Setup

> Prerequisites: Node.js 20+, Docker, Docker Compose

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/shippilot.git
cd shippilot

# 2. Copy environment template
cp backend/.env.example backend/.env
# Fill in values in backend/.env

# 3. Start database
docker compose up db -d

# 4. Install backend dependencies
cd backend && npm install

# 5. Run migrations
npm run migrate

# 6. Start the API
npm run dev
```

Open `frontend/index.html` in your browser or serve it with any static server.

---

## Deployment Lifecycle

```
Created → Queued → Running → Succeeded
                          ↘ Failed
                          ↘ Cancelled
```

A deployment is marked **Succeeded** only after the GitHub Actions workflow reports success **and** the post-deployment health check passes. Triggering a workflow alone does not constitute success.

---

## Implementation Roadmap

| Phase | Goal | Status |
|---|---|---|
| 0 | Project foundation — repo, structure, tooling | 🟡 In Progress |
| 1 | UI skeleton + Node.js API + MySQL schema | 🔴 Planned |
| 2 | GitHub OAuth + repository import | 🔴 Planned |
| 3 | Demo app + first real CI pipeline | 🔴 Planned |
| 4 | Docker image → Azure Container Registry → App Service | 🔴 Planned |
| 5 | ShipPilot triggers and tracks real deployments | 🔴 Planned |
| 6 | Production safety, audit log, rollback | 🔴 Planned |
| 7 | Terraform IaC for all Azure resources | 🔴 Planned |
| 8 | Observability, metrics, alerts | 🔴 Planned |
| 9 | Multi-tenant SaaS features | 🔴 Planned |

---

## Security Principles

- Secrets are never stored in plaintext database columns or returned in API responses
- GitHub tokens are stored encrypted; values are never exposed to the browser
- Webhook events are verified using HMAC-SHA256 signature validation
- Production deployments require explicit confirmation and server-side authorization
- Separate credentials are used per environment (Development / Staging / Production)
- All deployment actions are recorded in an audit log
- Container images are tagged with Git commit SHA — never `latest` only

---

## Current Status

> **Phase 0 in progress.** Foundation is being laid. No Azure resources provisioned yet.
> Screenshots and demo will be added as each phase is completed and verified working.

---

## License

MIT
