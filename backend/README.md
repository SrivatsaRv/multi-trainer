# Backend Service (FastAPI)

The core API service for the Multi-Trainer Platform. Handles business logic, database interactions, and authentication.

## Structure
- **`app/api`**: FastAPI Routes (v1).
- **`app/models`**: SQLModel database definitions (User, Booking, Workout).
- **`app/db`**: Database session and seeding scripts (`demo_data.py`).
- **`tests/`**: Pytest suite (Unit & Integration).

## Key Commands

```bash
# Run Tests (inside container)
make unit-tests

# Shell access (interactive Python)
make shell-backend

# Sitrep (Health Check)
python app/db/sitrep.py
```

## Database Schema
We use **PostgreSQL** with **SQLModel**.
Key relationships:
- `User` (1) <-> (1) `Trainer` / `Gym` / `Client` (Polymorphic-like association via ID).
- `Booking` -> Links `User`, `Trainer`, and `Gym`.
- `WorkoutSessionExercise` -> Links `Booking` to `Exercise`.

## Testing
Run tests via the root Makefile:
```bash
make unit-tests
```
This runs `pytest` inside the docker container to ensure environmental consistency.
