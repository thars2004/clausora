# <img src="logo.png" alt="Clausora Logo" width="38" height="38" style="vertical-align: middle; margin-right: 10px;" /> Clausora — System Architecture & Complete API Reference

**Document Version:** 1.0.0 (Production Release)  
**System Architecture:** Monorepo with Express TypeScript Backend, Vite React Frontend, and Shared Domain Contracts  
**Key Integrations:** Hugging Face AI (`Qwen/Qwen2.5-VL-7B-Instruct`), PayPal Orders v2 Sandbox Escrow, MongoDB Atlas

---

## 1. System Architecture Overview

Clausora employs a modern monorepo design organized into clean, decoupled tiers:

```
clausora/
├── apps/
│   ├── api/             # Express.js RESTful API & Escrow Business Logic
│   │   ├── src/
│   │   │   ├── database/     # MongoDB Mongoose Models & High-Performance In-Memory Store
│   │   │   ├── routes/       # Auth, Project, Milestone, Payment, Blueprint, Scope Drift, Audit
│   │   │   ├── services/     # PayPal Sandbox Client, Hugging Face AI Synthesis, Notifications
│   │   │   └── middleware/   # JWT Authentication & RBAC Authorization Gateways
│   │   └── tests/            # Automated Node.js Native Test Suites (33 Comprehensive Tests)
│   └── web/             # Vite + React 18 Single Page Application (SPA)
│       └── src/
│           ├── components/   # Layout, Workflow Visualizer, Evidence Graph, PayPal Modal
│           ├── context/      # AuthContext, ToastContext
│           └── pages/        # Dashboard, Projects, Project Detail, Analytics, Admin, Auth
├── packages/
│   └── shared/          # Universal TypeScript Type Contracts & Domain Models
└── docs/                # Architectural Specifications & Technical Whitepaper
```

### High-Level Data Flow Architecture

```
[ Client / Provider Browser ]
             │
             ▼ (HTTPS / JSON REST API)
[ Express API Gateway (Port 5000) ]
   ├── Authentication Middleware (JWT HMAC-SHA256, 24h TTL)
   ├── Role-Based Access Control (RBAC Tenant Isolation)
   ├── Bilateral Approval State Machine
   │
   ├── AI Blueprint Synthesis Engine (Hugging Face Qwen2.5-VL-7B-Instruct / Local Fallback)
   ├── PayPal Orders v2 Sandbox Integration (Capture & Split Settlement)
   │
   ▼ (Dual-Persistence Tier)
[ MongoDB Atlas Database ] ◄──Failover──► [ In-Memory Store (Zero Downtime) ]
```

---

## 2. Deep Integration Specifications

### 2.1 Hugging Face Vision-Language AI Pipeline
- **Package**: `@huggingface/inference` (v2.8.1)
- **Model**: `Qwen/Qwen2.5-VL-7B-Instruct`
- **Inference Router**: `https://router.huggingface.co/models/Qwen/Qwen2.5-VL-7B-Instruct`
- **Execution Flow**:
  1. Frontend submits project brief text and optional wireframe URLs.
  2. Backend formats a structured prompt with multi-dimensional taxonomy schema.
  3. Hugging Face client sends chat completion with low temperature ($T = 0.2$) for deterministic structured output.
  4. Single-pass self-healing JSON parser strips markdown fences and balances braces.
  5. Runtime validation via Zod (`WorkBlueprintSchema`).
  6. If Hugging Face token is absent or upstream rate-limited, local Work DNA synthesis fallback executes with zero interruption.

### 2.2 PayPal Sandbox Orders v2 Escrow Architecture
- **Environment**: Sandbox (`https://api-m.sandbox.paypal.com`)
- **OAuth2 Flow**: `POST /v1/oauth2/token` (`grant_type=client_credentials`) with cached access token management.
- **Order Lifecycle**:
  ```
  [Milestone SUBMITTED] ──► [Client Clicks Pay]
                                   │
                                   ▼
                   POST /api/payments/create-order
                                   │
                                   ▼
                 PayPal Sandbox Order (ID: ORDER_...)
                                   │
                                   ▼
                   POST /api/payments/capture-order
                                   │
                                   ▼
              PayPal Orders v2 Capture (Status: COMPLETED)
                                   │
                                   ▼
            Milestone Marked PAID + Settled Balance Incremented
  ```
- **Split Payout Equation**:
  $$\text{RemainingMinor} = \max(0, \text{TotalMilestoneMinor} - \text{PaidMinor})$$

---

## 3. Complete RESTful API Reference

All requests require `Authorization: Bearer <JWT_TOKEN>` header except `/api/auth/login` and `/api/auth/register`.

### 3.1 Authentication & Identity (`/api/auth`)

#### `POST /api/auth/register`
Registers a new platform user with designated tenant role (`client` | `provider` | `admin`).

#### `POST /api/auth/login`
Authenticates existing user and issues 24-hour signed JWT.

#### `GET /api/auth/me`
Retrieves currently authenticated session identity.

---

### 3.2 Project Management (`/api/projects`)

#### `GET /api/projects`
Retrieves all accessible projects scoped strictly by caller role (Client sees owned, Provider sees assigned, Admin sees all).

#### `POST /api/projects`
Creates a new project workspace. If created by Client or Provider, initialized with `status: 'awaiting_approval'`.

#### `GET /api/projects/:projectId`
Fetches detailed workspace including milestones, blueprint, agreements, and live settled metrics.

#### `POST /api/projects/:projectId/accept`
Bilateral counterpart proposal acceptance. Activates project and unlocks milestone deliveries.
- **Security**: Creator strictly forbidden from self-approval (HTTP 403). Counterpart or Admin only.

#### `POST /api/projects/:projectId/close`
Closes and finalizes a project after full escrow payment settlement.
- **Security**: Requires `settledAmountMinor >= totalAmountMinor` or all milestones `PAID`.

#### `POST /api/projects/:projectId/tasks`
Adds a dynamic deliverable task to the project workspace with dedicated or existing milestone allocation.

#### `PATCH /api/projects/:projectId/tasks/:taskId`
Updates execution status of a task (`'todo'` | `'in_progress'` | `'submitted'` | `'done'`). Automatically recalculates linked milestone progress and status.

---

### 3.3 Milestone & Evidence Hub (`/api/milestones`)

#### `GET /api/milestones/:id/evidence`
Retrieves all submitted proof artifacts for the milestone.

#### `POST /api/milestones/:id/evidence`
Submits verifiable work proof (URLs, screenshots, repo links) before escrow release.

---

### 3.4 PayPal Sandbox Escrow Settlement (`/api/payments`)

#### `POST /api/payments/create-order`
Creates a PayPal Orders v2 transaction for milestone fund locking.

#### `POST /api/payments/capture-order`
Captures an authorized PayPal Sandbox payment order.

#### `POST /api/payments/sandbox-capture`
Direct developer/sandbox simulation endpoint for testing instant escrow release and split installments.

---

### 3.5 Work DNA AI Engine (`/api/blueprint`)

#### `POST /api/blueprint/generate`
Synthesizes multimodal project brief into Work DNA specification using Hugging Face `Qwen2.5-VL-7B-Instruct`.
