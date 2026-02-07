# Multi-Trainer SaaS Platform

**A comprehensive fitness management platform connecting Gyms, Trainers, and Clients.**
Built with **Next.js 14 (Frontend)**, **FastAPI (Backend)**, and **PostgreSQL**.
Features real-time booking, workout logging, analytics, and role-based access control.

## Quick Start (Investor Demo)

The easiest way to see the platform in action is to run the standardized demo setup:

```bash
# Full Teardown & Rebuild with Seeded Data (Users, Templates, Bookings)
make investor-demo-setup
```

Access the application at: [http://localhost:3000](http://localhost:3000)

### Default Credentials
| Role | Email | Password |
|---|---|---|
| **Trainer** | `tr_active@example.com` | `password` |
| **Gym Owner** | `gym_owner@example.com` | `password` |
| **Client** | `client_active@example.com` | `password` |

---

## Key Features

### 1. Smart Booking System
- **Real-time Availability**: Trainers define slots; Clients book based on gym hours.
- **Credit System**: Clients purchase session packages; credits deduct automatically.
- **Rules Engine**: Prevents double-booking and enforces cancellation policies.

### 2. Global Workout Templates & Logging
- **Template Library**: 8+ Global Templates (Legs, Chest, HIIT, etc.).
- **One-Click Load**: Trainers can load a full workout into a client session.
- **Exercise History**: Tracks volume, sets, reps, and 1RM progress over time.

### 3. Analytics & Dashboard
- **Trainer View**: "Today's Schedule", Revenue Charts, Client Retention.
- **Gym View**: Facility utilisation, Trainer Roster management.
- **Client View**: Progress tracking and booking history.

### 4. Robust Architecture
- **Unified Profile Service**: Single source of truth for User attributes.
- **Atomic State Management**: strictly typed state transitions (Draft -> Verified).
- **Security**: JWT Authentication, Role-Based Access Control (RBAC).

---

## Development Setup

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (Local Dev)
- Python 3.11+ (Local Dev)

### Commands
Standardized via `Makefile`:

```bash
# Start Environment (Full Build & Up)
make up

# Run Unit Tests (Backend & Frontend)
make unit-tests

# Run All Tests (Unit + Integration + E2E)
make test

# View System Status (Sitrep)
make sitrep

# Logs
make logs
```

## Testing Strategy
We employ a 3-layer testing pyramid:
1.  **Unit Tests** (`backend/tests`): Business logic, Models, Auth (Pytest).
2.  **Integration Tests**: API Endpoints with DB (Dockerized).
3.  **E2E Tests** (`frontend/tests`): Critical User Journeys via **Playwright**.
    - Authentication Flow
    - Trainer Template Loading
    - Gym Association

## Tech Stack
- **Frontend**: Next.js 14 (App Router), TailwindCSS, ShadCN UI, Recharts.
- **Backend**: FastAPI, SQLModel (SQLAlchemy+Pydantic), Postgres.
- **Infrastructure**: Docker Compose, Nginx (optional proxy), Make.

---
*Generated for One2N Multi-Trainer Project - Feb 2026*
