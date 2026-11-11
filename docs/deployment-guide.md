# <img src="logo.png" alt="Clausora Logo" width="38" height="38" style="vertical-align: middle; margin-right: 10px;" /> Clausora — Production Deployment Guide (Vercel + Render + MongoDB Atlas)

This guide walks you through deploying Clausora to production with:
- **Frontend**: React + Vite + Tailwind CSS deployed on **Vercel**
- **Backend**: Node.js + Express + TypeScript deployed on **Render**
- **Database**: **MongoDB Atlas**
- **AI**: **Hugging Face Inference Providers**
- **Payments**: **PayPal Developer Sandbox**

---

## 1. MongoDB Atlas Setup (5 Minutes)

1. Navigate to [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas) and sign in.
2. Create a free shared cluster (M0) in your closest region.
3. Under **Security > Database Access**:
   - Create a database user (e.g. `clausora_admin`) with a secure password.
4. Under **Security > Network Access**:
   - Add IP Address: `0.0.0.0/0` (Allow access from anywhere for cloud deployment).
5. Click **Connect > Drivers > Node.js** and copy your connection string:
   ```env
   mongodb+srv://clausora_admin:<password>@cluster0.abcde.mongodb.net/clausora?retryWrites=true&w=majority
   ```

---

## 2. Backend Deployment on Render (10 Minutes)

1. Push your repository to GitHub (`clausora`).
2. Log into [Render](https://dashboard.render.com).
3. Click **New + > Web Service** and connect your GitHub repository.
4. Configure service settings:
   - **Name**: `clausora-api`
   - **Root Directory**: Leave blank or set to repository root
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build:api`
   - **Start Command**: `npm run start:api`
   - **Health Check Path**: `/api/health`
5. Under **Environment Variables**, add:
   | Key | Value / Source |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` |
   | `MONGODB_URI` | *Your MongoDB Atlas connection string from Step 1* |
   | `JWT_SECRET` | *Generate a 32+ character random secret* |
   | `COOKIE_SECRET` | *Generate a random secret* |
   | `FRONTEND_URL` | *Your Vercel URL (e.g. https://clausora.vercel.app)* |
   | `APP_BASE_URL` | *Your Vercel URL* |
   | `HF_TOKEN` | *Your Hugging Face User Access Token* |
   | `HF_MODEL` | `Qwen/Qwen2.5-VL-7B-Instruct` |
   | `PAYPAL_MODE` | `sandbox` |
   | `PAYPAL_CLIENT_ID` | *PayPal Developer Sandbox Client ID* |
   | `PAYPAL_CLIENT_SECRET` | *PayPal Developer Sandbox Secret* |
   | `PAYPAL_BASE_URL` | `https://api-m.sandbox.paypal.com` |
   | `ENABLE_DEMO_SEED` | `true` |
6. Click **Deploy Web Service**.
7. Once deployed, test the health endpoint: `https://clausora-api.onrender.com/api/health`.

---

## 3. Frontend Deployment on Vercel (5 Minutes)

1. Log into [Vercel](https://vercel.com).
2. Click **Add New > Project** and import your GitHub repository.
3. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (or `apps/web`)
   - **Build Command**: `npm run build:web`
   - **Output Directory**: `apps/web/dist`
4. Under **Environment Variables**, add:
   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://clausora-api.onrender.com` *(Your Render URL)* |
5. Click **Deploy**.
6. Vercel automatically deploys the frontend and configures SPA rewrites via `vercel.json`.

---

## 4. PayPal Sandbox Configuration

1. Log into [developer.paypal.com](https://developer.paypal.com).
2. Under **Testing Tools > Sandbox Accounts**:
   - Note the **Personal / Buyer** test account email and password.
   - Note the **Business / Merchant** test account.
3. Under **Apps & Credentials > Sandbox**:
   - Create a REST API app named `Clausora Sandbox`.
   - Copy the `Client ID` and `Secret` to your Render environment variables.
4. Optional: Under **Webhooks**, register your public Render webhook URL:
   `https://clausora-api.onrender.com/api/webhooks/paypal`
   - Select event types: `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`.

---

## 5. Post-Deployment Verification Checklist

- [x] `GET https://clausora-api.onrender.com/api/health` returns `status: healthy`.
- [x] Open Vercel URL, landing page renders with dark theme and animations.
- [x] Click **Client Demo Fast Pass** on login page: auto-authenticates as Sarah Chen.
- [x] Open the pre-seeded demo project: shows Milestone 1 as `PAID` with verified capture reference.
- [x] Open Milestone 2: review evidence graph, click **Approve Milestone for Payment**.
- [x] Test PayPal Sandbox modal: order creation and server-side capture verification completes successfully.
- [x] Audit timeline reflects all actions in real time.

