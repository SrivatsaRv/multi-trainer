from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.gym import Gym, VerificationStatus
from app.models.trainer import Trainer
from app.models.user import User
from tests.test_constants import TEST_USER_PASSWORD
import pytest


@pytest.mark.integration
def test_gym_lifecycle_draft_state(client: TestClient, session: Session):
    # 1. Register User (Gym Admin)
    reg_payload = {
        "full_name": "Integration Gym Owner",
        "email": "int_gym_owner@example.com",
        "password": TEST_USER_PASSWORD,
        "role": "GYM_ADMIN",
    }
    r = client.post("/api/v1/auth/register", json=reg_payload)
    assert r.status_code == 200

    # 2. Login
    login_payload = {
        "username": "int_gym_owner@example.com",
        "password": TEST_USER_PASSWORD,
    }
    r = client.post("/api/v1/auth/access-token", data=login_payload)
    assert r.status_code == 200
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Create Gym (Frictionless) - Since registration already creates it,
    # we GET it and then UPDATE it to test onboarding.
    r = client.get("/api/v1/gyms/", headers=headers)
    assert r.status_code == 200
    gyms = r.json()
    # Find the gym we just created (should be the only one or linked to me)
    # The registration creates a gym with slug gym-{user_id}
    # We can just fetch me to get the ID
    me = client.get("/api/v1/users/me", headers=headers).json()
    gym_id = me["gym"]["id"]
    
    gym_payload = {
        "name": "Integration Gym",
        "slug": "int-gym",
        "location": "Test City",
    }
    r = client.put(f"/api/v1/gyms/{gym_id}", json=gym_payload, headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "Integration Gym"
    assert data["verification_status"] == "PENDING"
    
    # 4. Verify DB State via Client
    r = client.get(f"/api/v1/gyms/{gym_id}", headers=headers)
    assert r.status_code == 200
    assert r.json()["slug"] == "int-gym"
    assert r.json()["verification_status"] == "PENDING"


@pytest.mark.integration
def test_trainer_lifecycle_draft_state(client: TestClient, session: Session):
    # 1. Register User (Trainer)
    reg_payload = {
        "full_name": "Integration Trainer",
        "email": "int_trainer@example.com",
        "password": TEST_USER_PASSWORD,
        "role": "TRAINER",
    }
    r = client.post("/api/v1/auth/register", json=reg_payload)
    assert r.status_code == 200

    # 2. Login
    login_payload = {
        "username": "int_trainer@example.com",
        "password": TEST_USER_PASSWORD,
    }
    r = client.post("/api/v1/auth/access-token", data=login_payload)
    assert r.status_code == 200
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Create Trainer (Frictionless) - Update auto-created profile
    me = client.get("/api/v1/users/me", headers=headers).json()
    trainer_id = me["trainer"]["id"]
    
    trainer_payload = {"bio": "I am an integration test trainer."}
    r = client.put(f"/api/v1/trainers/{trainer_id}", json=trainer_payload, headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["bio"] == "I am an integration test trainer."
    assert data["verification_status"] == "PENDING"

    # 4. Verify DB State via Client
    r = client.get("/api/v1/users/me", headers=headers)
    assert r.status_code == 200
    user_data = r.json()
    assert user_data["trainer"]["verification_status"] == "PENDING"


def test_access_control_gym_edit(client: TestClient, session: Session):
    # TODO: Implement when Update endpoints are fully secured with ownership checks
    pass
