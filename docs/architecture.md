# Clausora Architecture & Technical Specifications

## 1. System Overview

Clausora is an AI-powered work intelligence and milestone payment orchestration layer. It transforms ambiguous briefs into verifiable deliverables, maintains an immutable agreement record via canonical SHA-256 fingerprinting, flags scope changes, and triggers PayPal sandbox payouts strictly upon human client verification.

```mermaid
flowchart TD
    Client["Client / User"] -->|Uploads Brief / Screenshot / REA Report| WorkDNA["Work DNA Engine\n(Qwen2.5-VL-7B-Instruct)"]
    WorkDNA -->|Synthesizes| Blueprint["Work Blueprint\n(Tasks, Criteria, Risks)"]
    Blueprint -->|Mutual Sign-off| Agreement["Canonical Agreement v1\n(SHA-256 Fingerprint)"]
    Agreement -->|Instantiates| Milestones["Milestones State Machine\n(CREATED -> IN_PROGRESS)"]
    Provider["Provider / Developer"] -->|Submits Proof / Traces| EvidenceGraph["Evidence Graph\n(Proof <-> Criteria)"]
    EvidenceGraph -->|Analyzes Limitations| AIReview["AI Advisory Review\n(Observation & Limitations)"]
    AIReview -->|Human Decision Only| ClientDecision["Client Verification\n(Approve / Revision)"]
    ClientDecision -->|Approved| PayPalSandbox["PayPal Orders v2\nSandbox (/v2/checkout/orders)"]
    PayPalSandbox -->|Server Capture Verification| Capture["Backend Capture Verification\n(/v2/checkout/orders/{id}/capture)"]
    Capture -->|COMPLETED| PaidMilestone["Milestone Status: PAID"]
    PaidMilestone -->|Append Event| AuditTimeline["Tamper-Evident Audit Timeline"]
```

## 2. Milestone State Machine Lifecycle

```mermaid
stateDiagram-v2
    [*] --> CREATED
    CREATED --> IN_PROGRESS: Activate Work
    IN_PROGRESS --> SUBMITTED: Provider Submits Evidence
    SUBMITTED --> AI_REVIEWED: AI Evidence Analysis
    AI_REVIEWED --> AWAITING_CLIENT_DECISION: Ready for Review
    AWAITING_CLIENT_DECISION --> REVISION_REQUESTED: Feedback
    REVISION_REQUESTED --> IN_PROGRESS: Revise Work
    AWAITING_CLIENT_DECISION --> APPROVED_FOR_PAYMENT: Explicit Client Sign-off
    APPROVED_FOR_PAYMENT --> PAYPAL_ORDER_CREATED: Server Creates Order
    PAYPAL_ORDER_CREATED --> PAYER_APPROVED: Buyer Sandbox Approval
    PAYER_APPROVED --> PAYMENT_CAPTURED: Server Verifies Capture
    PAYMENT_CAPTURED --> PAID: Verified Completed
    PAID --> [*]
```

## 3. Cryptographic Agreement Fingerprinting

To guarantee that agreement terms cannot be tampered with retroactively:
1. The agreed blueprint object (`projectTitle`, `workstreams`, `milestones`, `totalAmountMinor`, `currency`) is canonicalized using deterministic key sorting.
2. The canonical JSON string is hashed using `SHA-256`.
3. Both parties store the `snapshotHashSeen` with their digital timestamp upon signing.
4. Any subsequent change request detected by the Scope Drift Radar creates a new version (`v2`) with its own fingerprint, preserving the immutable history.

## 4. REA (Reverse Engineer Anything) Integration

In accordance with Section 15 of the specification:
- Developers and inspectors can run REA (`npx rea-agents setup` / `morluto/rea`) locally on authorized applications.
- REA extracts runtime traces, network captures, and discovered API surfaces into a standardized JSON report.
- Clausora's Work DNA Engine ingests this report via `POST /api/rea/import-report` and maps observed behaviors directly into verifiable deliverable milestones.
