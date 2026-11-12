<p align="center">
  <img src="logo.png" alt="Clausora Logo" width="44" height="44" style="vertical-align: middle; margin-right: 10px;" />
  <span style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px; vertical-align: middle;">CLAUSORA</span>
</p>

<p align="center">
  <b>Official Technical Documentation & Engineering Specifications</b><br>
  <i>Author & Lead Architect: <b>Hari Tharshini T</b> (<a href="mailto:haritharshinibscit@gmail.com">haritharshinibscit@gmail.com</a>)</i>
</p>

---

## 📚 Technical Documentation Index

Welcome to the official technical documentation suite for **Clausora**, the enterprise deliverable verification and PayPal escrow execution platform.

| Document | Purpose | Key Contents |
| :--- | :--- | :--- |
| **[App Feature Specification](FEATURES_SPECIFICATION.md)** | Functional Specifications | Breakdown of all 13 core features, AI Work DNA engine, multi-agent AI Review Council, proof-before-payout rules, and project closure. |
| **[Architecture & API Reference](ARCHITECTURE_AND_API.md)** | Technical Architecture | Monorepo layout, data flow models, Zod schema contracts, and complete RESTful API endpoints reference. |
| **[Developer & Deployment Guide](DEVELOPER_AND_DEPLOYMENT_GUIDE.md)** | Operational Runbook | Local development instructions, live cloud platform matrix (Vercel, Render, MongoDB Atlas, Resend, PayPal), and test verification. |
| **[Interactive Demo Script](demo-script.md)** | Evaluator Walkthrough | Fast 3-minute guided evaluation script covering Fast-Pass personas, Work DNA generation, and PayPal sandbox capture. |
| **[Official Engineering Whitepaper (PDF)](Clausora_Documentation.pdf)** | Publication-Grade PDF | Complete technical specification formatted with ReportLab for offline evaluation and architectural review. |

---

## ☁️ Production Platform Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 🌐 Vercel Edge SPA (React 19, Vite, Tailwind CSS)                          │
│    └── Reverse Proxy: /api/:path* ──┐                                      │
│                                     ▼                                      │
│ ⚙️ Render Web Service (Node.js 20 LTS, Express, TypeScript)                │
│    ├── 🗄️ MongoDB Atlas (M0 Multi-Tenant Replica Set Cluster)             │
│    ├── 📧 Resend HTTPS REST API (Port 443 Transactional OTP Delivery)      │
│    ├── 🧠 Google Gemini 1.5 Flash + Hugging Face Qwen2.5-VL-7B             │
│    └── 💳 PayPal Developer Orders v2 REST API (Sandbox Escrow)            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧪 Verification Standard

All 50 unit and integration test suites pass natively with 100% green status:
```bash
npm run test -w @clausora/api
```
- Multi-Agent Review Council & Clausora AI: **12 / 12 PASS**
- Security, Auth & Tenant Isolation: **4 / 4 PASS**
- Password Recovery, OTP & Email System: **5 / 5 PASS**
- AI Work DNA Blueprint Synthesis: **1 / 1 PASS**
- Express Server Health & Route Mounting: **2 / 2 PASS**
- Project Permissions & Bilateral Acceptance: **12 / 12 PASS**
- Milestone State Machine Safety: **3 / 3 PASS**
- SHA-256 Canonical Agreement Hash: **2 / 2 PASS**
- Admin User Edit & Delete Capabilities: **2 / 2 PASS**
- Advanced Work DNA Engine (Tamil & 9-Dim Quality): **7 / 7 PASS**
