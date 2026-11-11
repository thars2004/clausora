# <img src="logo.png" alt="Clausora Logo" width="38" height="38" style="vertical-align: middle; margin-right: 10px;" /> Clausora — Comprehensive Feature & Functional Specification

**Document Version:** 1.0.0 (Production Release)  
**System Classification:** Technical Architecture & Feature Specification  
**Core Technologies:** Node.js, Express, TypeScript, React 18, Tailwind CSS, Vite, PayPal Orders v2 REST API, MongoDB Atlas, Hugging Face AI Models (`Qwen/Qwen2.5-VL-7B-Instruct`)

---

## 1. Executive Summary & Problem Domain

Clausora bridges the structural trust deficit in high-value freelance and enterprise software delivery contracts. Standard freelance platforms rely on subjective milestone dispute processes and unverified escrow disbursements, frequently resulting in scope drift, delayed deliverables, and payment friction.

Clausora enforces a **deterministic execution model**:
1. **Multimodal AI Work DNA Synthesis**: Powered by Hugging Face's `Qwen/Qwen2.5-VL-7B-Instruct` multimodal foundation model via `@huggingface/inference`, ingesting raw client briefs, architectural wireframes, and RFP documents into structured workstreams, verifiable tasks, and objective acceptance criteria.
2. **Strict Bilateral Counterpart Governance**: Eliminates unilateral project activation. Creators cannot approve their own proposals; assigned counterparts must review and activate agreements before contracts become active.
3. **Verifiable Proof Before Payment**: Milestone escrow funds remain cryptographically and operationally locked until assigned providers submit verifiable work proofs (URLs, screenshots, git repositories) and clients inspect them.
4. **Deterministic PayPal Orders v2 Sandbox Escrow Settlement**: Executes instant sandbox and production escrow captures via the PayPal Orders v2 API with support for custom split milestone installments and transparent balance tracking.
5. **Full Payment Project Closure Protocol**: Upon 100% full payment settlement, projects can be officially closed and archived with permanent immutable audit logs.

---

## 2. Exhaustive Feature Index

| Feature ID | Feature Name | Primary Role | Core Functionality |
| :--- | :--- | :--- | :--- |
| **FEAT-01** | AI Work DNA Blueprint Synthesis | Client / Admin | Parses briefs using Hugging Face `Qwen2.5-VL-7B-Instruct` into workstreams, criteria, and tech stacks. |
| **FEAT-02** | Multilingual & Tamil Dataset Extraction | All Users | Leverages Hugging Face multilingual tokenizers (including Tamil script) for standardized English blueprints. |
| **FEAT-03** | Financial & Timeline Safety Protection | System Engine | Strict financial safety: never invents speculative budgets if unconfirmed by a human stakeholder. |
| **FEAT-04** | Bilateral Counterpart Proposal Activation | Client / Provider | Creator self-approval strictly blocked (HTTP 403); opponent counterpart review and activation mandatory. |
| **FEAT-05** | SHA-256 Tamper-Evident Agreement Freezing | System Engine | Generates canonical deterministic SHA-256 fingerprint baseline to detect unauthorized term modifications. |
| **FEAT-06** | Evidence Hub & Work Proof Submission | Provider | Provider uploads verifiable deliverables (URLs, screenshots, repo links) tied directly to deliverable milestones. |
| **FEAT-07** | PayPal Sandbox Orders v2 Escrow Settlement | Client / Admin | Direct PayPal Sandbox checkout and instant capture updating live settled balances with split installment support. |
| **FEAT-08** | Dynamic Milestone Progress Synchronization | System Engine | Automatically calculates milestone progress and status from linked task execution statuses. |
| **FEAT-09** | Dynamic Task & Milestone Addition | All Users | Add custom tasks with dedicated or existing milestone allocation; updates project budget and roadmap. |
| **FEAT-10** | Role-Based Access Control & Tenant Scoping | All Users | Strict multi-tenant isolation separating Client, Provider, and Platform Admin data and routes. |
| **FEAT-11** | Full Observability & Analytics Engine | All Users | Enterprise charts for Budget vs. Settled Escrow Distribution and Deliverable Velocity breakdown. |
| **FEAT-12** | Full Payment Project Closure Protocol | Client / Admin | Enables official project closure after 100% full payment settlement with permanent audit preservation. |
| **FEAT-13** | Production-Grade Mobile-Responsive UX | All Users | Responsive slide-over drawer, fixed sidebar, clickable profile dropdown, and mobile-friendly modals. |

---

## 3. Deep-Dive Feature Specifications

### 3.1 FEAT-01: Hugging Face AI Work DNA Blueprint Synthesis
- **Endpoint**: `POST /api/blueprint/generate`
- **Foundation Model**: `Qwen/Qwen2.5-VL-7B-Instruct` (Hugging Face Model ID: `Qwen/Qwen2.5-VL-7B-Instruct`)
- **SDK & Infrastructure**: `@huggingface/inference` (v2.8.1) utilizing the Hugging Face Serverless Inference Router (`https://router.huggingface.co/models/Qwen/Qwen2.5-VL-7B-Instruct`).
- **Dataset & Multimodal Capabilities**:
  - Pretrained on comprehensive vision-language technical datasets, enabling ingestion of text briefs, wireframes, architecture diagrams, and scope documents.
  - Extracts core business objectives, target audience, and user problems solved.
  - Categorizes requirements into discrete types: `functional`, `technical`, `security`, `ui_ux`, `compliance`, and `performance`.
  - Generates modular workstreams with sequential tasks, effort estimates, and recommended verification methods (`automated_test`, `visual_inspection`, `api_verification`, `security_scan`).
  - Computes objective quality radar scores across 9 dimensions: Requirement Coverage, Technical Completeness, Task Clarity, Acceptance Criteria Quality, Dependency Consistency, Timeline Consistency, Risk Identification, Evidence Readiness, and Language Accuracy.
  - Implements a single-pass JSON self-repair pipeline to ensure all outputs strictly conform to Zod runtime schemas (`WorkBlueprintSchema`).

### 3.2 FEAT-02: Multilingual & Tamil Input Detection
- **Capability**: Detects non-English briefs across Tamil (தமிழ்), Hindi, Spanish, French, German, Arabic, and Japanese.
- **Processing**: Identifies Unicode character blocks (e.g. `[\u0B80-\u0BFF]` for Tamil) and safely synthesizes standardized English technical deliverables while preserving original language metadata (`LanguageMetadata`).

### 3.3 FEAT-03: Financial & Timeline Safety Protection
- **Rules Enforced**:
  - If the user brief does not contain an explicit, confirmed budget number, `totalBudgetMinor` is left as `null` or `0`, with `budgetConfirmedByHuman: false`.
  - The system never hallucinates financial commitments.
  - If target start or end dates are absent, timeline estimates are tagged with human input requirements before contractual agreements are frozen.

### 3.4 FEAT-04: Bilateral Counterpart Proposal Activation
- **Endpoint**: `POST /api/projects/:projectId/accept`
- **Security Rule**:
  $$\text{CanActivate} = (\text{actorId} \ne \text{createdBy}) \land (\text{actorId} = \text{assignedOpponent} \lor \text{actorRole} = \text{'admin'})$$
- **Workflow**:
  - When a Client creates a project, status is initialized as `awaiting_approval`.
  - The Client cannot click "Approve & Activate" on their own proposal (returns HTTP 403 Forbidden).
  - The assigned Provider reviews the scope, deliverables, and payment allocations.
  - Once the Provider accepts, the project transitions to `active`, unblocking escrow fund locks and milestone delivery.

### 3.5 FEAT-05: SHA-256 Tamper-Evident Agreement Freezing
- **Endpoint**: `POST /api/agreements/:id/freeze`
- **Algorithm**:
  1. Serializes contract terms, milestone scopes, agreed budgets, and deadline constraints.
  2. Recursively sorts all JSON dictionary keys alphabetically.
  3. Generates a cryptographic SHA-256 digest:
     $$\text{Hash} = \text{SHA-256}(\text{CanonicalJSON}(\text{AgreementTerms}))$$
  4. Stores snapshot hash and marks agreement version as frozen. Any posterior tampering alters the hash and triggers an integrity alert.

### 3.6 FEAT-06: Evidence Hub & Work Proof Submission
- **Endpoint**: `POST /api/milestones/:id/evidence`
- **Workflow**:
  - The assigned Provider completes deliverable tasks.
  - Before requesting milestone fund release, the Provider submits evidence: title, artifact description, and verifiable URI (staging link, git commit hash, screenshot URL, or documentation path).
  - The milestone status updates to `SUBMITTED`, notifying the Client for inspection.
  - The Client inspects the live evidence within the Evidence Hub prior to authorizing payout.

### 3.7 FEAT-07: PayPal Sandbox Orders v2 Escrow Settlement Engine
- **Base URL**: `https://api-m.sandbox.paypal.com`
- **API Standard**: PayPal Orders v2 REST API (`/v2/checkout/orders`)
- **Authentication**: OAuth2 Client Credentials grant (`POST /v1/oauth2/token`) with in-memory token caching (3,600-second TTL).
- **Core Endpoints**:
  - `POST /api/payments/create-order`: Initializes PayPal Order with `intent: 'CAPTURE'`, reference IDs, currency, and deliverable descriptions.
  - `POST /api/payments/capture-order`: Captures approved payment order from PayPal Sandbox and marks milestone as `PAID`.
  - `POST /api/payments/sandbox-capture`: Direct sandbox capture simulator for rapid automated testing and demo walkthroughs.
- **Split Milestone Installment Mechanics**:
  - Supports custom split milestone payouts (e.g. 50% upfront, 50% upon final acceptance test).
  - Automatically tracks paid and remaining minor amounts:
    $$\text{RemainingMinor} = \max(0, \text{TotalMilestoneMinor} - \text{PaidMinor})$$
    $$\text{ProjectSettledMinor} = \sum_{m \in \text{Milestones}} \text{PaidMinor}(m)$$
  - Records cryptographic payer email, merchant ID, and PayPal order IDs into the immutable audit trail.

### 3.8 FEAT-08: Dynamic Milestone Progress Synchronization
- **Endpoint**: `PATCH /api/projects/:projectId/tasks/:taskId`
- **Logic**:
  - Every milestone computes progress dynamically from its associated task deliverables:
    $$\text{Progress} = \frac{\sum_{t \in \text{Tasks}} \text{Score}(t)}{|\text{Tasks}|}$$
    Where $\text{Score}(\text{'done'}) = 100$, $\text{Score}(\text{'submitted'}) = 80$, $\text{Score}(\text{'in\_progress'}) = 50$, $\text{Score}(\text{'todo'}) = 0$.
  - When all associated tasks reach `done`, milestone automatically advances to `APPROVED_FOR_PAYMENT`.

### 3.9 FEAT-09: Dynamic Task & Milestone Addition
- **Endpoint**: `POST /api/projects/:projectId/tasks`
- **Features**:
  - Stakeholders can add custom tasks during project execution.
  - Supports allocating task to an existing milestone or automatically spinning up a dedicated deliverable milestone.
  - Dynamically recalculates project total budget and updates the delivery roadmap.

### 3.10 FEAT-10: Role-Based Access Control & Tenant Scoping
- **Roles**:
  - `client`: Project creation, scope review, work proof inspection, escrow release authorization.
  - `provider`: Scope review, proposal acceptance, deliverable implementation, work proof submission.
  - `admin`: Global visibility, platform audits, user management, override authorization.
- **Session Security**: Stateless JSON Web Tokens (JWT) signed with HMAC-SHA256, strictly expiring after 24 hours (86,400 seconds).

### 3.11 FEAT-11: Full Observability & Analytics Engine
- **Charts**:
  1. **Project Budget vs. Settled Escrow Distribution**: Multi-bar visualizer displaying agreed total budget against confirmed PayPal captured funds per project.
  2. **Deliverable Velocity & Execution Breakdown**: Status breakdown of tasks across `Completed`, `Submitted / Review`, `In Progress`, and `Todo`.
- **Audit Ledger**: Real-time immutable event log tracking all creations, approvals, captures, and status updates.

### 3.12 FEAT-12: Full Payment Project Closure Protocol
- **Endpoint**: `POST /api/projects/:projectId/close`
- **Prerequisite**:
  $$\text{IsFullyPaid} = (\text{settledAmountMinor} \ge \text{totalAmountMinor} > 0) \lor (\forall m \in \text{Milestones}, m.\text{status} = \text{'PAID'})$$
- **Workflow**:
  - When 100% of agreed funds have been settled through PayPal, a prominent "Close Project" button is enabled in the project cockpit action bar and completion hero banner.
  - The Client owner or assigned provider confirms closure in a dedicated modal.
  - Project status transitions to `completed`.
  - The project is cleanly removed from the active "Current Projects" sidebar list and preserved in permanent historical records with full audit trail integrity.

### 3.13 FEAT-13: Production-Grade Mobile-Responsive UX
- **Navigation**:
  - Fixed desktop sidebar with scrollable interior and pinned escrow engine footer.
  - Full mobile slide-over drawer with backdrop dismiss.
  - Dedicated action bar placed cleanly below the title and metadata for unobstructed title readability.
  - Top bar clickable profile dropdown with user initials, active session indicator, and logout button without cluttering role badges.
  - Responsive modals with custom scrollbars preventing viewport lockups.
