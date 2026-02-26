from datetime import datetime, timedelta

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.security import create_access_token
from app.core.session_manager import create_user_session
from app.main import app
from app.models.booking import Booking, BookingStatus
from app.models.gym import Gym
from app.models.session import UserSession
from app.models.trainer import Trainer
from app.models.user import User, UserRole
from app.models.workout import (Exercise, MeasurementUnit,
                                WorkoutSessionExercise)


def test_analytics_exercise_history(client: TestClient, session: Session):
    # 1. Setup User (Client)
    client_user = User(
        email="client_analytics@example.com",
        full_name="Client Analytics",
        role=UserRole.CLIENT,
        hashed_password="pw",
        is_active=True,
    )
    session.add(client_user)

    # 2. Setup Trainer
    trainer_user = User(
        email="trainer_analytics@example.com",
        full_name="Trainer Analytics",
        role=UserRole.TRAINER,
        hashed_password="pw",
        is_active=True,
    )
    session.add(trainer_user)
    session.commit()
    session.refresh(trainer_user)
    session.refresh(client_user)

    trainer_profile = Trainer(
        user_id=trainer_user.id, bio="Test Trainer", experience_years=5
    )
    session.add(trainer_profile)
    session.commit()
    session.refresh(trainer_profile)

    # 3. Setup Gym (Needed for Booking constraint)
    gym = Gym(
        name="Analytics Gym",
        slug="analytics-gym",
        location="Test Loc",
        admin_id=trainer_user.id,
    )  # Re-using trainer as admin for simplicity or create separate admin
    session.add(gym)
    session.commit()
    session.refresh(gym)

    # 4. Setup Exercise
    exercise = Exercise(
        name="Test Squat", category="STRENGTH", unit_type=MeasurementUnit.WEIGHT_REPS
    )
    session.add(exercise)
    session.commit()
    session.refresh(exercise)

    # 5. Create 2 Completed Bookings with History
    # Booking 1: 1 week ago
    b1 = Booking(
        user_id=client_user.id,
        trainer_id=trainer_profile.id,
        gym_id=gym.id,
        start_time=datetime.utcnow() - timedelta(days=7),
        end_time=datetime.utcnow() - timedelta(days=7, hours=1),
        status=BookingStatus.COMPLETED,
    )
    session.add(b1)
    session.commit()
    session.refresh(b1)

    w1 = WorkoutSessionExercise(
        booking_id=b1.id,
        exercise_id=exercise.id,
        sets=3,
        reps=5,
        weight_kg=100.0,
        notes="Week 1",
    )
    session.add(w1)

    # Booking 2: Today
    b2 = Booking(
        user_id=client_user.id,
        trainer_id=trainer_profile.id,
        gym_id=gym.id,
        start_time=datetime.utcnow(),
        end_time=datetime.utcnow() + timedelta(hours=1),
        status=BookingStatus.COMPLETED,
    )
    session.add(b2)
    session.commit()
    session.refresh(b2)

    w2 = WorkoutSessionExercise(
        booking_id=b2.id,
        exercise_id=exercise.id,
        sets=3,
        reps=5,
        weight_kg=105.0,
        notes="Week 2",
    )
    session.add(w2)
    session.commit()

    # 6. Authenticate as Trainer
    # Create session
    user_session = create_user_session(session, trainer_user.id)
    token = user_session.token
    headers = {"Authorization": f"Bearer {token}"}

    # 7. Call Analytics Endpoint
    response = client.get(
        f"/api/v1/trainers/{trainer_profile.id}/exercises/{exercise.id}/history",
        params={"client_id": client_user.id},
        headers=headers,
    )

    assert response.status_code == 200
    data = response.json()

    assert len(data) == 2
    # Verify Sorting (Oldest First)
    assert data[0]["notes"] == "Week 1"
    assert data[1]["notes"] == "Week 2"

    # Verify Data
    assert data[0]["weight_kg"] == 100.0
    assert data[1]["weight_kg"] == 105.0

    # Verify 1RM Calculation (Epley: w * (1 + r/30))
    # 100 * (1 + 5/30) = 116.66
    estimated_1rm_1 = 100 * (1 + 5 / 30)
    assert abs(data[0]["estimated_1rm"] - estimated_1rm_1) < 0.1
