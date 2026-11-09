# Security Policy & Hackathon Guardrails

## Non-Negotiable Architecture Safeguards

Clausora is built according to strict security and fintech boundaries:

1. **Advisory AI Boundaries**:
   - AI models (`Qwen/Qwen2.5-VL-7B-Instruct`) are strictly **advisory**.
   - AI outputs are validated against strict Zod schemas.
   - The AI engine **never** approves work, sets final payment amounts, modifies agreements unilaterally, or triggers PayPal payments.
   - AI services do not have access to PayPal API secrets, database write access, or server execution privileges.

2. **Deterministic Payment Safety**:
   - Payments are initiated solely via the **PayPal Developer Sandbox** (`Orders v2`).
   - Only an authenticated user with verified `client` project ownership can trigger milestone approval.
   - All monetary figures are stored as integer minor units (`cents`/`paise`) alongside ISO 4217 currency codes (`USD`, `EUR`, `INR`) to avoid floating point calculation errors.
   - Payment capture is verified on the backend directly with PayPal before a milestone changes to `PAID`.
   - Webhook events are processed idempotently.

3. **Tamper-Evident Agreement Fingerprints**:
   - Canonical agreement snapshots are normalized and hashed with `SHA-256`.
   - Scope drift amendments create new sequential versions without destroying the historical audit trail.

4. **Credential Isolation**:
   - `HF_TOKEN`, `PAYPAL_CLIENT_SECRET`, and `JWT_SECRET` reside strictly on the server backend (`apps/api`).
   - The frontend bundle never receives or exposes these secrets.

5. **Sandbox & Legal Notice**:
   - Clausora is a milestone orchestration and verification platform; it is not a bank, escrow service, or legal court.
   - All hackathon testing uses PayPal Sandbox accounts; no live cardholder data or real currencies are handled.
