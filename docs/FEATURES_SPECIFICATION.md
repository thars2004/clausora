# <img src="logo.png" alt="Clausora Logo" width="38" height="38" style="vertical-align: middle; margin-right: 10px;" /> Clausora — Comprehensive Feature & Functional Specification

**Document Version:** 1.0.0 (Production Release)  
**Lead Architect & Author:** **Hari Tharshini T** (<haritharshinibscit@gmail.com>)  
**System Classification:** Technical Architecture & Feature Specification  
**Production Platforms:** Frontend on Vercel | Backend on Render (`https://clausora.onrender.com`) | Database on MongoDB Atlas | Email via Resend HTTPS | Escrow via PayPal Sandbox | AI via Google Gemini 1.5 Flash & Hugging Face `Qwen/Qwen2.5-VL-7B-Instruct`

---

## 1. Executive Summary & Problem Domain

Clausora bridges the structural trust deficit in high-value freelance and enterprise software delivery contracts. Standard freelance platforms rely on subjective milestone dispute processes and unverified escrow disbursements, frequently resulting in scope drift, delayed deliverables, and payment friction.

Clausora enforces a **deterministic execution model**:
1. **Multimodal AI Work DNA Synthesis**: Powered by dual engines (Google Gemini 1.5 Flash & Hugging Face `Qwen/Qwen2.5-VL-7B-Instruct`), ingesting raw client briefs, architectural wireframes, and RFP documents into structured workstreams, verifiable tasks, and objective acceptance criteria.
2. **Strict Bilateral Counterpart Governance**: Eliminates unilateral project activation. Creators cannot approve their own proposals; assigned counterparts must review and activate agreements before contracts become active.
3. **Verifiable Proof Before Payment**: Milestone escrow funds remain cryptographically and operationally locked until assigned providers submit verifiable work proofs (URLs, screenshots, git repositories) and clients inspect them.
4. **Multi-Agent AI Review Council ("The AI Jury")**: An autonomous 3-agent deliberative panel (Architecture Auditor, Security Verifier, QA Test Specialist) evaluating deliverables in parallel and computing consensus scores.
5. **Deterministic PayPal Orders v2 Sandbox Escrow Settlement**: Executes instant sandbox and production escrow captures via the PayPal Orders v2 API with support for custom split milestone installments and transparent balance tracking.
6. **Full Payment Project Closure Protocol**: Upon 100% full payment settlement, projects can be officially closed and archived with permanent immutable audit logs.

---

## 2. Exhaustive Feature Index

| Feature ID | Feature Name | Primary Role | Core Functionality |
| :--- | :--- | :--- | :--- |
| **FEAT-01** | AI Work DNA Blueprint Synthesis | Client / Admin | Parses briefs using Gemini & Hugging Face `Qwen2.5-VL-7B` into workstreams, criteria, and tech stacks. |
| **FEAT-02** | Multilingual & Tamil Dataset Extraction | All Users | Leverages multilingual tokenizers (including Tamil script) for standardized English blueprints. |
| **FEAT-03** | Financial & Timeline Safety Protection | System Engine | Strict financial safety: never invents speculative budgets if unconfirmed by a human stakeholder. |
| **FEAT-04** | Bilateral Counterpart Proposal Activation | Client / Provider | Creator self-approval strictly blocked (HTTP 403); opponent counterpart review and activation mandatory. |
| **FEAT-05** | SHA-256 Tamper-Evident Agreement Freezing | System Engine | Generates canonical deterministic SHA-256 fingerprint baseline to detect unauthorized term modifications. |
| **FEAT-06** | Evidence Hub & Work Proof Submission | Provider | Provider uploads verifiable deliverables (URLs, screenshots, repo links) tied directly to deliverable milestones. |
| **FEAT-07** | Multi-Agent AI Review Council ("The AI Jury") | All Users | 3 specialized AI agents evaluate submitted evidence, detecting unproven claims and giving consensus verdicts. |
| **FEAT-08** | PayPal Sandbox Orders v2 Escrow Settlement | Client / Admin | Direct PayPal Sandbox checkout and instant capture updating live settled balances with split installment support. |
| **FEAT-09** | Dynamic Milestone Progress Synchronization | System Engine | Automatically calculates milestone progress and status from linked task execution statuses. |
| **FEAT-10** | Dynamic Task & Milestone Addition | All Users | Add custom tasks with dedicated or existing milestone allocation; updates project budget and roadmap. |
| **FEAT-11** | Role-Based Access Control & Tenant Scoping | All Users | Strict multi-tenant isolation separating Client, Provider, and Platform Admin data and routes. |
| **FEAT-12** | Full Observability & Analytics Engine | All Users | Enterprise charts for Budget vs. Settled Escrow Distribution and Deliverable Velocity breakdown. |
| **FEAT-13** | Full Payment Project Closure Protocol | Client / Admin | Enables official project closure after 100% full payment settlement with permanent audit preservation. |

---

## 3. Deep-Dive Feature Specifications

### 3.1 FEAT-01: Multimodal AI Work DNA Blueprint Synthesis
- **Endpoint**: `POST /api/blueprint/generate`
- **Foundation Models**: Google Gemini 1.5 Flash & Hugging Face `Qwen/Qwen2.5-VL-7B-Instruct`
- **Capabilities**:
  - Ingests text briefs, wireframes, architecture diagrams, and scope documents.
  - Categorizes requirements into discrete types: `functional`, `technical`, `security`, `ui_ux`, `compliance`, and `performance`.
  - Generates modular workstreams with sequential tasks, effort estimates, and recommended verification methods (`automated_test`, `visual_inspection`, `api_verification`, `security_scan`).
  - Computes objective quality radar scores across 9 dimensions: Requirement Coverage, Technical Completeness, Task Clarity, Acceptance Criteria Quality, Dependency Consistency, Timeline Consistency, Risk Identification, Evidence Readiness, and Language Accuracy.

### 3.2 FEAT-02: Multilingual & Tamil Input Detection
- **Capability**: Detects non-English briefs across Tamil (தமிழ் `[\u0B80-\u0BFF]`), Hindi, Spanish, French, German, Arabic, and Japanese.
- **Processing**: Synthesizes standardized English technical deliverables while preserving original language metadata (`LanguageMetadata`).

### 3.3 FEAT-03: Financial & Timeline Safety Protection
- **Rules Enforced**:
  - If the user brief does not contain an explicit, confirmed budget number, `totalBudgetMinor` is left as `null` or `0`, with `budgetConfirmedByHuman: false`.
  - The system never hallucinates financial commitments.
  - If target dates are absent, timeline estimates are tagged with human confirmation gates.

### 3.4 FEAT-04: Bilateral Counterpart Proposal Activation
- **Endpoint**: `POST /api/projects/:projectId/accept`
- **Security Rule**:
  $$\text{CanActivate} = (\text{actorId} \ne \text{createdBy}) \land (\text{actorId} = \text{assignedOpponent} \lor \text{actorRole} = \text{'admin'})$$
- **Workflow**:
  - When a Client creates a project, status is initialized as `awaiting_approval`.
  - The Client cannot click "Approve & Activate" on their own proposal (returns HTTP 403 Forbidden).
  - The assigned Provider reviews the scope, deliverables, and payment allocations.
  - Once the Provider accepts, the project transitions to `active`.

### 3.5 FEAT-05: SHA-256 Tamper-Evident Agreement Freezing
- **Endpoint**: `POST /api/agreements/:id/freeze`
- **Algorithm**:
  1. Serializes contract terms, milestone scopes, agreed budgets, and deadline constraints.
  2. Recursively sorts all JSON dictionary keys alphabetically.
  3. Generates a cryptographic SHA-256 digest:
     $$\text{Hash} = \text{SHA-256}(\text{CanonicalJSON}(\text{AgreementTerms}))$$
  4. Stores snapshot hash and marks agreement version as frozen.

### 3.6 FEAT-06: Evidence Hub & Work Proof Submission
- **Endpoint**: `POST /api/milestones/:id/evidence`
- **Workflow**:
  - The assigned Provider completes deliverable tasks.
  - Before requesting milestone fund release, the Provider submits evidence: title, artifact description, and verifiable URI (staging link, git commit hash, screenshot URL, or documentation path).
  - The milestone status updates to `SUBMITTED`, notifying the Client for inspection.

### 3.7 FEAT-07: Multi-Agent AI Review Council ("The AI Jury")
- **Endpoint**: `POST /api/milestones/:id/council-review`
- **Jury Panel**:
  - **Architecture Auditor**: Verifies modularity, REST API design, and schema adherence.
  - **Security Verifier**: Audits authentication, rate limiting, and defensive transport.
  - **QA Test Specialist**: Inspects test coverage and proof validity.
- **Consensus Rule**:
  - If zero evidence is submitted, returns immediate WARNING blocking payout recommendation.
  - When evidence is provided, calculates weighted score and issues `APPROVED`, `REVISE`, or `REJECT` verdict.

### 3.8 FEAT-08: PayPal Sandbox Orders v2 Escrow Settlement Engine
- **Base URL**: `https://api-m.sandbox.paypal.com`
- **API Standard**: PayPal Orders v2 REST API (`/v2/checkout/orders`)
- **Authentication**: OAuth2 Client Credentials grant (`POST /v1/oauth2/token`) with in-memory token caching (3,600-second TTL).
- **Core Endpoints**:
  - `POST /api/payments/create-order`: Initializes PayPal Order with `intent: 'CAPTURE'`, reference IDs, currency, and deliverable descriptions.
  - `POST /api/payments/capture-order`: Captures approved payment order from PayPal Sandbox and marks milestone as `PAID`.
  - `POST /api/payments/sandbox-capture`: Direct sandbox capture simulator for rapid automated testing.

### 3.9 FEAT-09: Dynamic Milestone Progress Synchronization
- Every milestone computes progress dynamically from its associated task deliverables:
  $$\text{Progress} = \frac{\sum_{t \in \text{Tasks}} \text{Score}(t)}{|\text{Tasks}|}$$
  Where $\text{Score}(\text{'done'}) = 100$, $\text{Score}(\text{'submitted'}) = 80$, $\text{Score}(\text{'in\_progress'}) = 50$, $\text{Score}(\text{'todo'}) = 0$.

### 3.10 FEAT-10: Dynamic Task & Milestone Addition
- Stakeholders can add custom tasks during project execution.
- Supports allocating task to an existing milestone or automatically spinning up a dedicated deliverable milestone.
- Dynamically recalculates project total budget and updates the delivery roadmap.

### 3.11 FEAT-11: Role-Based Access Control & Tenant Scoping
- `client`: Project creation, scope review, work proof inspection, escrow release authorization.
- `provider`: Scope review, proposal acceptance, deliverable implementation, work proof submission.
- `admin`: Global visibility, platform audits, user management, override authorization.
- Stateless JSON Web Tokens (JWT) signed with HMAC-SHA256, strictly expiring after 24 hours.

### 3.12 FEAT-12: Full Observability & Analytics Engine
- **Project Budget vs. Settled Escrow Distribution**: Multi-bar visualizer displaying agreed total budget against confirmed PayPal captured funds.
- **Deliverable Velocity & Execution Breakdown**: Status breakdown of tasks across `Completed`, `Submitted / Review`, `In Progress`, and `Todo`.

### 3.13 FEAT-13: Full Payment Project Closure Protocol
- **Endpoint**: `POST /api/projects/:projectId/close`
- **Prerequisite**:
  $$\text{IsFullyPaid} = (\text{settledAmountMinor} \ge \text{totalAmountMinor} > 0) \lor (\forall m \in \text{Milestones}, m.\text{status} = \text{'PAID'})$$
- When 100% of agreed funds have been settled through PayPal, a prominent "Close Project" button is enabled.
- Project status transitions to `completed` and is archived from active navigation while preserving permanent audit records.
