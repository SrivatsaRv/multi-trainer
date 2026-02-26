import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from datetime import datetime, timedelta

from app.models.workout import Exercise, ExerciseType, MeasurementUnit, WorkoutTemplate
from app.models.workout_log import WorkoutLog, ExerciseLog
from app.models.trainer import Trainer
from app.models.user import User, UserRole
from tests.test_constants import TEST_USER_PASSWORD

@pytest.fixture(name="trainer_context")
def trainer_context_fixture(session: Session, trainer_user: User):
    trainer = session.exec(select(Trainer).where(Trainer.user_id == trainer_user.id)).first()
    if not trainer:
        trainer = Trainer(user_id=trainer_user.id, bio="Workout Pro")
        session.add(trainer)
        session.commit()
        session.refresh(trainer)
    
    # Login as trainer
    from app.core.security import create_access_token
    from app.models.session import UserSession
    token = create_access_token(trainer_user.id)
    session.add(UserSession(user_id=trainer_user.id, token=token, is_active=True, expires_at=datetime.utcnow() + timedelta(days=1)))
    session.commit()
    
    return {"trainer": trainer, "headers": {"Authorization": f"Bearer {token}"}}

def test_exercise_lifecycle(auth_client: TestClient, session: Session):
    # 1. CREATE Exercise
    payload = {
        "name": "Barbell Rows",
        "category": "STRENGTH",
        "unit_type": "WEIGHT_REPS",
        "description": "Back exercise"
    }
    response = auth_client.post("/api/v1/exercises", json=payload)
    assert response.status_code == 200
    ex_id = response.json()["id"]

    # 2. READ Exercises
    response = auth_client.get("/api/v1/exercises")
    assert response.status_code == 200
    assert any(ex["name"] == "Barbell Rows" for ex in response.json())

def test_workout_template_extended_crud(auth_client: TestClient, session: Session, trainer_context):
    headers = trainer_context["headers"]
    
    # Setup exercise
    ex = Exercise(name="Lat Pulldown", category=ExerciseType.STRENGTH, unit_type=MeasurementUnit.WEIGHT_REPS)
    session.add(ex)
    session.commit()
    session.refresh(ex)

    # 1. CREATE Template
    template_payload = {
        "name": "Back Day",
        "description": "Wings focus",
        "exercises": [
            {"exercise_id": ex.id, "sets": 4, "reps": 12, "notes": "Stretch at top"}
        ]
    }
    response = auth_client.post("/api/v1/workouts/templates", json=template_payload, headers=headers)
    assert response.status_code == 201
    tmpl_id = response.json()["id"]

    # 2. UPDATE Template
    update_payload = {
        "name": "Back & Biceps",
        "exercises": [
            {"exercise_id": ex.id, "sets": 5, "reps": 10}
        ]
    }
    response = auth_client.put(f"/api/v1/workouts/templates/{tmpl_id}", json=update_payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Back & Biceps"

    # 3. DELETE Template
    response = auth_client.delete(f"/api/v1/workouts/templates/{tmpl_id}", headers=headers)
    assert response.status_code == 200

def test_workout_log_creation(auth_client: TestClient, session: Session, trainer_context):
    headers = trainer_context["headers"]
    trainer = trainer_context["trainer"]
    
    # Setup client
    client_user = User(email="log_client@example.com", full_name="Log Client", hashed_password="hash", role=UserRole.CLIENT, is_active=True)
    session.add(client_user)
    session.commit()
    session.refresh(client_user)

    # 1. CREATE Log
    log_payload = {
        "client_id": client_user.id,
        "trainer_id": trainer.id,
        "date": datetime.now().isoformat(),
        "name": "Monday Session",
        "exercises": [
            {"exercise_name": "Pushups", "sets": [{"weight": 0, "reps": 20}]}
        ]
    }
    response = auth_client.post("/api/v1/workouts/logs", json=log_payload, headers=headers)
    assert response.status_code == 201
    log_id = response.json()["id"]

    # 2. READ Logs
    response = auth_client.get(f"/api/v1/workouts/logs?client_id={client_user.id}", headers=headers)
    assert response.status_code == 200
    logs = response.json()
    assert len(logs) >= 1
    assert logs[0]["name"] == "Monday Session"
