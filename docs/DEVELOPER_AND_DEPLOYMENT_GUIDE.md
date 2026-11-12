# <img src="logo.png" alt="Clausora Logo" width="38" height="38" style="vertical-align: middle; margin-right: 10px;" /> Clausora — Developer Setup & Cloud Deployment Guide

**Document Version:** 1.0.0 (Production Release)  
**Lead Architect & Author:** **Hari Tharshini T** (<haritharshinit@gmail.com>)  
**System Requirements:** Node.js v18+, npm v9+, Python 3.10+ (for documentation generation)

---

## 1. Quickstart Development Setup

### 1.1 Prerequisites
- **Node.js**: v18.0.0 or higher (v20 LTS recommended)
- **npm**: v9.0.0 or higher
- **Python**: v3.10+ (optional, for regenerating publication PDF)

### 1.2 Installation
Clone the repository and install all monorepo workspace dependencies:
```bash
git clone <repository_url> clausora
cd clausora
npm install
```

### 1.3 Environment Configuration
Create a `.env` file in the project root:
```env
# Server
PORT=5000
NODE_ENV=development
JWT_SECRET=clausora_super_secure_jwt_secret_key_2026
JWT_EXPIRATION=86400

# Cloud Database
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/clausora?retryWrites=true&w=majority

# Transactional Email (Resend HTTPS API)
RESEND_API_KEY=re_your_resend_api_key_here
EMAIL_FROM="Clausora <notifications@clausora.dev>"

# Escrow & Payments (PayPal Sandbox)
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com

# AI Models (Google Gemini Higher Model & Hugging Face)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-pro
HF_TOKEN=hf_your_token_here
HF_MODEL=Qwen/Qwen2.5-VL-7B-Instruct
```

*Note: If `MONGODB_URI` is omitted or temporarily unreachable, Clausora automatically activates its high-performance in-memory collection store with zero-downtime execution.*

---

## 2. Running Locally

### 2.1 Start Development Servers
Run both API backend (Port 5000) and Web frontend (Port 5173) concurrently:
```bash
npm run dev
```

### 2.2 Run API Server Individually
```bash
npm run dev -w @clausora/api
```

### 2.3 Run Web Application Individually
```bash
npm run dev -w @clausora/web
```

---

## 3. Testing & Verification

### 3.1 Run Complete Backend Test Suite
Executes all 50 unit, integration, and security test suites using the native Node.js test runner:
```bash
npm run test -w @clausora/api
```

### 3.2 Build Monorepo Production Bundle
Runs TypeScript typechecking and compiles all packages:
```bash
npm run build
```

---

## 4. Production Cloud Deployment Architecture

Clausora is architected for modern multi-cloud deployment:

| Component | Target Platform | Deployment Configuration | Operational Notes |
| :--- | :--- | :--- | :--- |
| **Frontend Web** | **Vercel** | `vercel.json` | Configured with SPA edge rewrites and reverse proxy for `/api/:path*` to Render backend. |
| **Backend API** | **Render** | `render.yaml` | Deployed as Node.js web service. Configured with `trust proxy: 1` and rate limiting. Health check: `/api/health`. |
| **Database** | **MongoDB Atlas** | Atlas M0 Cluster | Multi-tenant user, project, milestone collections. Whitelist `0.0.0.0/0` in Atlas Network Access for dynamic cloud IPs. |
| **Transactional Email** | **Resend** | HTTPS REST API | Port 443 outbound HTTPS calls bypass hosting firewall blocks on ports 25, 465, and 587. |
| **Escrow Engine** | **PayPal Sandbox** | Orders v2 REST API | Client credentials cached in memory with 3600-second TTL. Instant server-side capture verification. |

### 4.1 Vercel Deployment (Frontend)
1. Link your repository in the Vercel dashboard.
2. Root Directory: `./` (or `apps/web` with build command `npm run build:web`).
3. Output Directory: `apps/web/dist`.
4. Environment variables:
   - `VITE_API_BASE_URL`: Left empty when using Vercel reverse proxy, or set to `https://clausora.onrender.com/api`.

### 4.2 Render Deployment (Backend API)
1. Create a **New Web Service** pointing to your repository.
2. Build Command: `npm install --include=dev && npm run build`
3. Start Command: `node apps/api/dist/server.js`
4. Set Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `RESEND_API_KEY`: Your Resend API key
   - `JWT_SECRET`: Production secret string
   - `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`: PayPal Sandbox credentials
5. Health Check Path: `/api/health`.
