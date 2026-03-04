# CommonGround Feature Implementation Map

This document serves as a high-fidelity mapping of platform features to their respective code modules, services, and entry points. It is designed for engineers seeking to "trace the logic" from a user action to its backend execution.

---

## 🗺️ Feature Architecture Matrix

| Feature Domain | Backend Service (`backend/app/services/`) | API Endpoint (`backend/app/api/v1/`) | Frontend Entry View (`frontend/app/`) |
| :--- | :--- | :--- | :--- |
| **ARIA AI Pipeline** | `aria.py`, `aria_inference.py` | `messages.py` (intercept) | `/messages/` |
| **Agreement Builder**| `agreement.py`, `agreement_activation.py` | `agreements.py` | `/agreements/builder/` |
| **ClearFund Finance** | `clearfund.py`, `stripe_service.py` | `clearfund.py`, `wallet.py` | `/clearfund/` |
| **Silent Handoff™** | `custody_exchange.py`, `geolocation.py` | `exchanges.py` | `/schedule/exchanges/` |
| **KidComs™ Suite** | `daily_video.py`, `aria_call_monitor.py` | `kidcoms.py` | `/kidcoms/` |
| **Cubbie Profile** | `child.py` | `children.py` | `/children/[id]/cubbie/` |
| **Case Governance** | `family_file.py`, `case.py` | `family_files.py`, `cases.py` | `/dashboard/` |
| **Professional Access**| `court.py`, `access_control.py` | `professional.py` | `/professional/dashboard/` |

---

## 🛠️ Feature Deep-Dives

### 1. ARIA™ Safety Shield
- **Logic Path**: User Input → `WebSocket.on_message` → `AriaService.analyze_message` → `AriaInference (Claude 3.5)` → `Service Intervention` → Storage.
- **Key Files**: 
  - `backend/app/services/aria.py` (The brain)
  - `backend/app/services/aria_patterns.py` (Fast regex tier)
  - `frontend/lib/hooks/use-aria.ts` (State hook)

### 2. ClearFund™ Financial Engine
- **Logic Path**: Obligation Creation → Consensus Signature → `StripeService` Account Verification → `ClearFundService` Ledger Entry.
- **Verification**: `backend/app/services/exchange_compliance.py` verifies receipts against the obligation's `purpose_category`.

### 3. Silent Handoff™ & Verifiable Truth
- **Logic Path**: Mobile PWA Geo-Ping → `GeolocationService` → `CustodyExchangeService.verify_handshake` → `DB Instance Update`.
- **Integrity**: Uses PostGIS `ST_DWithin` queries to verify parent proximity without manual check-ins.

### 4. SharedCare Agreements (SCA)
- **Logic Path**: Wizard Progress → `AgreementService.update_section` → Digital Fingerprinting → `AgreementActivationService.finalize`.
- **Versioning**: Every activation creates an immutable snapshot in the `agreement_versions` table.

---

## 🔗 Traceability Links

For further detail, see:
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - For table-level field definitions.
- [PLATFORM_CAPABILITIES.md](./PLATFORM_CAPABILITIES.md) - For the user-facing capability matrix.
- [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) - For the high-level data flow diagrams.

---

> [!NOTE]
> This document has been pruned of redundant schema definitions to maintain its role as an implementation "Source Map." For specific API schemas, refer to the auto-generated Swagger docs at `/docs` during development.
