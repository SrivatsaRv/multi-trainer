from datetime import datetime

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.booking import Booking, BookingStatus
from app.models.gym import Gym
from app.models.trainer import Trainer
from app.models.user import User
from app.models.workout import (Exercise, ExerciseType, MeasurementUnit,
                                WorkoutTemplate, WorkoutTemplateExercise)


def seed_test_data(session: Session, user: User):
    # 1. Create Gym
    gym = Gym(
        name="Test Gym",
        slug="test-gym",
        location="Test Loc",
        verification_status="APPROVED",
        admin_id=user.id,
    )
    session.add(gym)
    session.commit()
    session.refresh(gym)

    # 2. Create Trainer
    trainer = Trainer(
        user_id=user.id, bio="Test Bio", experience_years=5, gym_ids=[gym.id]
    )
    session.add(trainer)
    session.commit()
    session.refresh(trainer)

    # 3. Create Booking
    booking = Booking(
        user_id=user.id,
        trainer_id=trainer.id,
        gym_id=gym.id,
        start_time=datetime.now(),
        end_time=datetime.now(),
        status=BookingStatus.SCHEDULED,
        notes="Test Booking",
    )
    session.add(booking)

    # 4. Create Template & Exercise
    ex = Exercise(
        name="Bench Press",
        category=ExerciseType.STRENGTH,
        unit_type=MeasurementUnit.WEIGHT_REPS,
    )
    session.add(ex)

    dataset = WorkoutTemplate(name="Legs", description="Leg Day")
    session.add(dataset)
    session.commit()
    session.refresh(dataset)
    session.refresh(booking)

    # Link
    wte = WorkoutTemplateExercise(
        template_id=dataset.id, exercise_id=ex.id, sets=3, reps=10
    )
    session.add(wte)
    session.commit()

    return booking, dataset


from tests.test_constants import TEST_USER_EMAIL, TEST_USER_PASSWORD


def test_read_templates(auth_client: TestClient, session: Session, test_user: User):
    seed_test_data(session, test_user)
    # No manual headers needed
    response = auth_client.get(
        "/api/v1/templates"
    )  # Slash removed in backend, so client matches
    assert response.status_code == 200
    data = response.json()
    assert any(t["name"] == "Legs" for t in data)


def test_read_template_detail(
    auth_client: TestClient, session: Session, test_user: User
):
    booking, tmpl = seed_test_data(session, test_user)

    response = auth_client.get(f"/api/v1/templates/{tmpl.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["template"]["name"] == "Legs"
    assert len(data["exercises"]) > 0


def test_log_workout(auth_client: TestClient, session: Session, test_user: User):
    booking, tmpl = seed_test_data(session, test_user)

    # Need exercise ID
    ex_id = session.exec(select(Exercise)).first().id

    log_data = [
        {
            "exercise_id": ex_id,
            "sets": 4,
            "reps": 8,
            "weight_kg": 100,
            "notes": "Test Log",
        }
    ]

    response = auth_client.post(f"/api/v1/bookings/{booking.id}/log", json=log_data)
    assert response.status_code == 200
    assert response.json()["count"] == 1
