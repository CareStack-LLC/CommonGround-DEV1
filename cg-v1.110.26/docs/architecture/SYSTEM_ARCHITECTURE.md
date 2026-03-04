# CommonGround System Architecture Encyclopedia

This document over-explains the high-level design, data flows, and technical orchestration that make the CommonGround platform "High-Integrity" and "Court-Ready."

---

## 🏗️ The 4-Tier Architecture

CommonGround follows a strict separation of concerns to ensure scalability and legal auditability.

### 1. Presentation Tier (Frontend Next.js)
- **Tech Stack**: Next.js 16 (App Router), Tailwind CSS, Framer Motion.
- **Role**: State-managed interfaces for Parents, Children (KidComs), and Professionals.
- **Communication**: REST for transactions; WebSockets for real-time presence/notifications.

### 2. API Gateway Tier (FastAPI Gateway)
- **Tech Stack**: FastAPI (Python 3.11), SQLAlchemy Async (PostgreSQL), Pydantic V2.
- **Role**: Authentication, Role-Based Access Control (RBAC), and request validation.
- **Endpoint Pattern**: Categorized into `/v1/parent/`, `/v1/professional/`, and `/v1/kidcoms/`.

### 3. Service Orchestration Tier (Business Logic)
- **Role**: This is where the "CommonGround Magic" happens. The API Layer calls the Service Layer (`backend/app/services/`) to perform complex multi-step actions.
- **Key Orchestrators**:
    - `AgreementService`: Manages versioning and consensus.
    - `AriaService`: Coordinates the AI safety pipeline.
    - `ClearFundService`: Manages the Stripe ledger and purpose-locked obligations.

### 4. Data & Infrastructure Tier
- **Database**: PostgreSQL (Supabase) with PostGIS for Silent Handoff™ geofencing.
- **File Storage**: Supabase Storage for receipts and Family Files.
- **Third-Party Integrations**:
    - **Stripe**: Payments and virtual card issuing (v2).
    - **Daily.co**: WebRTC video/audio for KidComs.
    - **Claude 3.5 Sonnet**: The intelligence behind ARIA.

---

## 🛡️ ARIA™ Safety Shield Pipeline

ARIA is not just a chatbot; it is a real-time mediation pipeline.

### The Interception Flow:
1.  **Ingress**: Parent sends a message via WebSocket.
2.  **Detection**: Message passes through `aria_patterns.py` (fast regex checks for immediate threats).
3.  **Inference**: Message is sent to `aria_inference.py` where Claude 3.5 Sonnet analyzes Sentiment, Toxicity, and Passive-Aggression.
4.  **Mitigation**: If flagged, the `AriaService` generates "Safe Suggestions."
5.  **Audit**: The original and rewritten versions are stored in the database for professional review.

---

## 📡 Real-Time & KidComs™ Architecture

KidComs requires synchronized state across video, games, and drawing.

- **WebSocket Orchestration**: `backend/app/core/websocket.py` handles room subscriptions and presence.
- **Shared State**: Phaser.js games in the frontend sync via low-latency WebSocket events.
- **Audio Monitoring**: `aria_call_monitor.py` listens to Daily.co audio streams (via Whisper transcription) to ensure safe language is used around children.

---

## 🧭 Silent Handoff™ (GPS & Geofencing)

A high-integrity system for verifying custody exchanges without parental interaction.

1.  **Geofence Definition**: When an exchange is scheduled, `GeolocationService` calculates a 100m radius around the address using PostGIS.
2.  **Background Check-in**: The mobile PWA sends periodic GPS pings during the "Exchange Window."
3.  **Automated Truth**: If both parents are detected within the geofence simultaneously, the `CustodyExchangeInstance` is marked as "Completed - GPS Verified."

---

## 🔒 Security & Legal Integrity

- **SHA-256 Hashing**: Every generated report is hashed and the hash is stored in the `investigation_reports` table.
- **Chain of Custody**: Professionals access data via "Grants" that expire automatically. Every "View" action is logged in `court_access_logs`.
- **Immutability**: Legal records (agreements, signed attestations) cannot be edited once "Activated." Any change requires a new `AgreementVersion`.
