# Aria Sentiment Shield: Massive Expansion & Safety Overhaul

## 1. Overview
The Aria Sentiment Shield has been significantly upgraded to move beyond simple profanity filtering into a comprehensive **Co-Parenting Safety System**. This expansion focuses on detecting high-conflict behaviors that are specifically harmful in co-parenting contexts (weaponizing custody, financial coercion) and enforcing zero-tolerance policies for hate speech and harassment.

## 2. Why These Changes?
- **Court Admissibility**: Messages are now scored and flagged with stricter "Court Context" warnings. Judges view custody threats and financial coercion extremely negatively; Aria now explicitly catches these to protect the user's legal standing.
- **Safety First**: Severe toxicity (Hate Speech, Sexual Harassment, Physical Threats) is now **auto-blocked**. This protects recipients from abuse while preserving the evidence in the system.
- **Constructive Communication**: Instead of just blocking words (leaving broken sentences like "I you"), Aria now offers **constructive replacements** (e.g., "I am feeling frustrated") to de-escalate conflict while keeping communication flowing.

## 3. Detailed Changes

### A. Backend Detection ([aria.py](file:///Users/tj/Desktop/CommonGround/cg-v1.110.26/backend/app/services/aria.py))
- **New Categories**: 
  - `HATE_SPEECH`: Zero-tolerance for racial, ethnic, religious, and gender identity slurs.
  - `SEXUAL_HARASSMENT`: Zero-tolerance for unwanted sexual advances and objectification.
  - `CUSTODY_WEAPONIZATION`: Specific detection for "you won't see the kids", "pay me or else".
  - `FINANCIAL_COERCION`: Detection for "starve you out", "bleed you dry".
- **Massive Pattern Expansion**: 
  - Added hundreds of patterns covering **Modern Toxicity** (`gaslighting`, `narcissist`, `groomer`), **Leetspeak** (`f*ck`, `n1gger`), and **Parenting Attacks** (`unfit mother`, `deadbeat`).
- **Scoring Logic**:
  - `HATE_SPEECH` and `SEXUAL_HARASSMENT` are strictly weighted at **1.0 (SEVERE)**.
  - `HIGH` toxicity (0.6 - 0.85) now triggers **Intelligent Phrase Replacement** instead of generic templates.

### B. Frontend Enforcement ([aria-intervention.tsx](file:///Users/tj/Desktop/CommonGround/cg-v1.110.26/frontend/components/messages/aria-intervention.tsx))
- **Blocked State**: Messages flagged as `SEVERE` (Hate Speech/Harassment) or `THREATENING` trigger a **"Message Blocked"** state. The "Send Anyway" button is **removed**.
- **UX Improvements**: Categories are now formatted in Title Case (e.g., "Custody Weaponization" instead of "custody_weaponization") for better readability.

### C. API ([api.ts](file:///Users/tj/Desktop/CommonGround/cg-v1.110.26/frontend/lib/api.ts))
- Added `block_send` flag to the analysis response to coordinate blocking between backend and frontend.

## 4. How to Test & Check

### A. Automated Verification
Run the comprehensive test suite which covers all new patterns and blocking logic:

```bash
# Run detection and blocking tests for all new categories
./venv/bin/python -m pytest tests/integration/test_aria_messaging.py -k "TestARIAService" -v
```

### B. Manual Verification (Examples)
To verify the system in the UI or via API, try these inputs:

| Input Message | Expected Result | Reason |
|---------------|-----------------|--------|
| "You are a nigger" | **BLOCKED** ("Message Blocked") | Hate Speech (Zero Tolerance) |
| "Send me nudes" | **BLOCKED** ("Message Blocked") | Sexual Harassment (Zero Tolerance) |
| "Kill yourself" | **BLOCKED** ("Message Blocked") | Suicide Baiting (Severe Threat) |
| "If you don't pay, you won't see the kids" | **Flagged (Severe)** | Custody Weaponization |
| "Stop gaslighting me you fuck ass" | **Suggestion**: "Stop misrepresenting the situation I am (frustrated)" | Intelligent Replacement |
| "This is fuck ass behavior" | **Suggestion**: "This is I am frustrated behavior" | Intelligent Replacement |

## 5. Summary of Files Changed
- [backend/app/services/aria.py](file:///Users/tj/Desktop/CommonGround/cg-v1.110.26/backend/app/services/aria.py): Core detection logic, patterns, and suggestions.
- [backend/app/api/v1/endpoints/messages.py](file:///Users/tj/Desktop/CommonGround/cg-v1.110.26/backend/app/api/v1/endpoints/messages.py): API integration for blocking.
- [backend/tests/integration/test_aria_messaging.py](file:///Users/tj/Desktop/CommonGround/cg-v1.110.26/backend/tests/integration/test_aria_messaging.py): Verification suite.
- [frontend/lib/api.ts](file:///Users/tj/Desktop/CommonGround/cg-v1.110.26/frontend/lib/api.ts): Type definitions for blocking.
- [frontend/components/messages/aria-intervention.tsx](file:///Users/tj/Desktop/CommonGround/cg-v1.110.26/frontend/components/messages/aria-intervention.tsx): UI for blocking and alerts.
