# CommonGround Universal Engineer Onboarding

Welcome to the definitive guide for engineers contributing to the CommonGround ecosystem. This document provides a high-fidelity map of every feature, platform, and interconnecting logic within our co-parenting sanctuary.

---

## 🏛️ One Platform, Three Access Points

CommonGround is delivered across three distinct interfaces, all backed by a unified FastAPI backend.

### 1. The Mobile App (PWA)
Optimized for on-the-go parents. High-frequency interactions occur here.
- **Features**: GPS check-ins, real-time chat, KidComs calls, mobile notifications.
- **Implementation**: Next.js optimized with Service Workers (`sw.js`). PWA manifest allows "Install to Home Screen" on iOS and Android.

### 2. The Web Tablet/Desktop Portal
The full suite for administrative and legal tasks.
- **Features**: 18-section Agreement builder, Financial reporting, document uploads (Family Files).
- **Implementation**: Responsive Next.js 16 (App Router).

### 3. The Professional Portal
A specialized interface for Attorneys, Mediators, and Paralegals.
- **Features**: Firm management, Case Assignments, Compliance Dashboards, ARIA Intervention control.
- **Implementation**: Scoped access via `backend/app/api/v1/endpoints/professional.py`.

---

## � Exhaustive Feature Catalog

### 🛡️ ARIA Safety Shield Suite
The AI Relationship Intelligence Assistant (ARIA) is the core of our "Sanctuary of Truth."
- **Tier 1 (Instant)**: Regex-based toxicity checks catch immediate threats.
- **Tier 2 (AI Analysis)**: Claude 3.5 Sonnet analyzes sentiment (Blame, Passive-Aggression).
- **Intervention**: Replaces toxic content with "Safe Suggestions."
- **Professional Control**: Legal pros can adjust thresholds (Sensitivity) and toggle auto-intervention.

### 🎥 KidComs™ (Child-Centric Video)
A safe digital bridge for children to communicate with their "Circle" (parents, grandparents).
- **Voice/Video**: Backed by Daily.co with AI call monitoring.
- **The Arcade**: Multiplayer web games (Phaser.js) synced over WebSockets.
- **Theater**: Collaborative video sync for movie nights.
- **Whiteboard**: Real-time collaborative drawings.
- **Circle Controls**: Parents must approve every contact in a child's list.

### 📄 The Reporting System
Our "Court-Ready" guarantee is delivered through these specific report types.

| Report Type | Purpose | Audience |
| :--- | :--- | :--- |
| **Custody Time** | Actual vs. Agreed parenting time split. | Parents / Legal |
| **Communication** | Sentiment trends and ARIA intervention logs. | Legal / Court |
| **Expense Summary** | ClearFund obligation and payment auditing. | Parents / Legal |
| **Schedule History** | GPS-verified exchange timestamps and locations. | Parents / Court |
| **Court Investigation** | Consolidated "Case in a Box" package. | Professional Only |

---

## � Feature Interconnectivity (The "How it Relates")

### From Message to Evidence
1.  **Parent A** sends a message on the **Mobile App**.
2.  **ARIA** intercepts, flags hostility, and suggests a rewrite.
3.  **Parent A** ignores the suggestion and sends anyway (logged as "Bad Faith").
4.  **Attorney** views the "Good Faith Score" in the **Professional Portal**.
5.  **Attorney** generates a **Communication Analysis Report** including the original toxic draft as evidence.

### From Agreement to Financials
1.  **Parents** build an **SCA (SharedCare Agreement)** on the **Web Desktop**.
2.  **Section 12 (Child Support)** defines a $500 monthly obligation.
3.  The system automatically populates **ClearFund** with an upcoming obligation.
4.  **Parent B** pays via **Mobile App** (Stripe integration).
5.  **Financial Compliance Report** reflects 100% on-time payment history for court.

---

## 🛠️ Codebase Navigation for Feature Leads

- `backend/app/services/aria.py`: The AI brain.
- `backend/app/services/reports/`: The PDF generation engine.
- `backend/app/api/v1/endpoints/kidcoms.py`: The complex socket/video logic.
- `frontend/components/professional/`: UI for the legal portal.
- `frontend/lib/consensus.ts`: Frontend hooks for dual-parent approval workflows.

---

## � Pro Tips for Deep Contributors

- **Scoping**: When adding a feature, ask: "Should a Professional see this?" If yes, add a new `CaseAssignmentScope`.
- **Latency**: KidComs is sensitive to latency. Use WebSockets (`websocket-context.tsx`) for non-video sync.
- **Truth**: Never overwrite a record that has been "Activated" via dual-parent consensus. Always create a new version (`AgreementVersion`).
