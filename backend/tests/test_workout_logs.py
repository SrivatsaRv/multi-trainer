from datetime import datetime

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.booking import Booking, BookingStatus
from app.models.gym import Gym
from app.models.trainer import Trainer
from app.models.user import User
from app.models.workout import Exercise, ExerciseType, MeasurementUnit


def seed_booking(session: Session, user: User):
    gym = Gym(
        name="Log Gym",
        slug="log-gym",
        location="Loc",
        verification_status="APPROVED",
        admin_id=user.id,
    )
    session.add(gym)

    trainer = Trainer(user_id=user.id, bio="Bio", gym_ids=[gym.id])
    session.add(trainer)
    session.commit()
    session.refresh(trainer)

    booking = Booking(
        user_id=user.id,
        trainer_id=trainer.id,
        gym_id=gym.id,
        status=BookingStatus.SCHEDULED,
        start_time=datetime(2024, 1, 1, 10, 0),
        end_time=datetime(2024, 1, 1, 11, 0),
    )
    session.add(booking)

    ex = Exercise(
        name="Log Exercise",
        category=ExerciseType.STRENGTH,
        unit_type=MeasurementUnit.WEIGHT_REPS,
    )
    session.add(ex)

    session.commit()
    session.refresh(booking)
    session.refresh(ex)
    return booking, ex


def test_log_workout_to_booking(
    auth_client: TestClient, session: Session, test_user: User
):
    booking, ex = seed_booking(session, test_user)

    log_data = [
        {
            "exercise_id": ex.id,
            "sets": 3,
            "reps": 10,
            "weight_kg": 50,
            "notes": "Good set",
        }
    ]

    response = auth_client.post(f"/api/v1/bookings/{booking.id}/log", json=log_data)
    assert response.status_code == 200
    assert response.json()["count"] == 1


def test_log_invalid_booking(auth_client: TestClient):
    response = auth_client.post("/api/v1/bookings/99999/log", json=[])
    assert response.status_code == 404
