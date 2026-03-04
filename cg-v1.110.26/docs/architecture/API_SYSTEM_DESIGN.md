# CommonGround API System Design

This document describes the architectural patterns, security protocols, and lifecycle of the CommonGround REST API.

## Architectural Overview

The API is built using **FastAPI (Python 3.11)**, following an async-first approach to maximize performance and handle high-concurrency video/realtime workloads.

### Layered Structure
1.  **Endpoints (`app/api/v1/`)**: Thin routing layer. Responsible for parameter validation (Pydantic) and dependency injection.
2.  **Services (`app/services/`)**: The business logic heart. Services are stateless and handle complex operations (ARIA mediation, consensus logic, PDF generation).
3.  **Models (`app/models/`)**: SQLAlchemy 2.0 async ORM. Defines the schema and data integrity constraints.
4.  **Schemas (`app/schemas/`)**: Pydantic models for request validation and response serialization.

## Core Patterns

### 1. Dependency Injection
We use FastAPI's `Depends()` for robust, testable resource management:
- `get_db`: Yields an async database session per request.
- `get_current_user`: Handles JWT validation and loads the active user.
- `get_active_family_file`: Validates that the user is a participant in the requested case.

### 2. ARIA Mediation Pipeline
Messaging isn't a direct database write. It follows a monitored lifecycle:
1.  **Intake**: Parent submits message.
2.  **Tier 1 Analysis (Regex)**: Instant safety/threat check.
3.  **Tier 2 Analysis (AI)**: Claude 3.5 Sonnet scores sentiment and provides "Safe Suggestions."
4.  **Intervention**: If toxic, returns a 403-intercept with suggests; if clean, commits to `Message` table.

### 3. Dual-Parent Consensus Workflow
Endpoints managing "Shared Truth" (Children, Agreements, QuickAccords) follow a `Propose -> Approve -> Activate` flow:
- `POST /propose`: Creates a draft record.
- `POST /approve`: The other parent toggles their approval bit.
- `Finalization`: The system automatically promotes the record to `active` once both bits are set.

## Security & Reliability

### Authentication & Authorization
- **Auth**: Handled via Supabase Auth (JWT).
- **RBAC**: Role-Based Access Control is enforced at the service level.
- **Case Scoping**: Professionals use `CaseAssignment` tokens to access specific modules of a Family File.

### Error Handling
The API uses a global exception handler in `app/main.py`:
- Ensures **all** errors (including 500s) include proper CORS headers.
- Standardizes RFC-7807 problem details in responses.
- Automatically captures stack traces during development for rapid debugging.

### Real-Time Features
- **WebSockets**: Used for real-time chat updates and KidComs call signaling.
- **Background Tasks**: Long-running operations (PDF export, OCR, Email) are offloaded using FastAPI `BackgroundTasks`.

## API Best Practices for Engineers

- **Async Always**: Every I/O operation (DB, API, Storage) must use `await`.
- **Validation First**: Never trust client input. Use strict Pydantic models for every request.
- **Stateless Services**: Services should not hold state. Pass the `db` session and `current_user` explicitly.
- **Audit Everything**: Ensure sensitive operations (accessing children data, exporting evidence) are logged to the compliance/audit tables.
