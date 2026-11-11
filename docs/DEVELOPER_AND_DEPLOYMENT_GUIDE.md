# <img src="logo.png" alt="Clausora Logo" width="38" height="38" style="vertical-align: middle; margin-right: 10px;" /> Clausora — Developer Setup & Production Deployment Guide

**Document Version:** 1.0.0 (Production Release)  
**System Requirements:** Node.js v18+, npm v9+, MongoDB Atlas (Optional with in-memory fallback)

---

## 1. Quickstart Development Setup

### 1.1 Prerequisites
- Node.js 18.0.0 or higher
- npm 9.0.0 or higher
- Python 3.10+ (for documentation generation)

### 1.2 Installation
Clone the repository and install workspace dependencies:
```bash
git clone <repository_url> clausora
cd clausora
npm install
```

### 1.3 Environment Configuration
Create a `.env` file in the project root:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=clausora_super_secure_jwt_secret_key_2026
JWT_EXPIRATION=86400
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/clausora?retryWrites=true&w=majority
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=AY_demo_client_id_placeholder
PAYPAL_CLIENT_SECRET=EH_demo_client_secret_placeholder
```

*Note: If `MONGODB_URI` is omitted or cluster is unreachable, Clausora automatically activates its high-performance in-memory store with full state persistence during execution.*

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
Executes all 33 unit, integration, and security test suites using the native Node.js test runner:
```bash
npm run test -w @clausora/api
```

### 3.2 Build Production Web Bundle
Runs TypeScript typechecking and compiles the optimized Vite production distribution:
```bash
npm run build -w @clausora/web
```

---

## 4. Production Deployment

### 4.1 Vercel Deployment (Frontend)
The web application is configured with `vercel.json` for SPA client-side routing.
```bash
vercel --prod
```

### 4.2 Render Deployment (Backend API)
The backend is configured with `render.yaml` for containerized or Node.js web service deployment.
```bash
npm run build
node apps/api/dist/server.js
```

### 4.3 Docker Deployment
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app .
EXPOSE 5000
CMD ["node", "apps/api/dist/server.js"]
```

