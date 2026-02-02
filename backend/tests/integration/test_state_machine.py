from fastapi.testclient import TestClient
from sqlmodel import Session, select
from tests.test_constants import TEST_USER_PASSWORD
from app.models.user import User
from app.models.gym import Gym, VerificationStatus
from app.models.trainer import Trainer

def test_gym_lifecycle_draft_state(client: TestClient, session: Session):
    # 1. Register User (Gym Admin)
    reg_payload = {
        "full_name": "Integration Gym Owner",
        "email": "int_gym_owner@example.com",
        "password": TEST_USER_PASSWORD,
        "role": "GYM_ADMIN"
    }
    r = client.post("/api/v1/auth/register", json=reg_payload)
    assert r.status_code == 200
    
    # 2. Login
    login_payload = {
        "username": "int_gym_owner@example.com",
        "password": TEST_USER_PASSWORD
    }
    r = client.post("/api/v1/auth/login/access-token", data=login_payload)
    assert r.status_code == 200
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Create Gym (Frictionless)
    gym_payload = {
        "name": "Integration Gym",
        "slug": "int-gym",
        "location": "Test City"
    }
    r = client.post("/api/v1/gyms/", json=gym_payload, headers=headers)
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "Integration Gym"
    assert data["verification_status"] == "DRAFT"
    
    # 4. Verify DB State explicitly
    gym_in_db = session.exec(select(Gym).where(Gym.slug == "int-gym")).first()
    assert gym_in_db is not None
    assert gym_in_db.verification_status == VerificationStatus.DRAFT

def test_trainer_lifecycle_draft_state(client: TestClient, session: Session):
    # 1. Register User (Trainer)
    reg_payload = {
        "full_name": "Integration Trainer",
        "email": "int_trainer@example.com",
        "password": TEST_USER_PASSWORD,
        "role": "TRAINER"
    }
    r = client.post("/api/v1/auth/register", json=reg_payload)
    assert r.status_code == 200
    
    # 2. Login
    login_payload = {
        "username": "int_trainer@example.com",
        "password": TEST_USER_PASSWORD
    }
    r = client.post("/api/v1/auth/login/access-token", data=login_payload)
    assert r.status_code == 200
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Create Trainer (Frictionless)
    trainer_payload = {
        "bio": "I am an integration test trainer."
    }
    r = client.post("/api/v1/trainers/", json=trainer_payload, headers=headers)
    assert r.status_code == 201
    data = r.json()
    assert data["bio"] == "I am an integration test trainer."
    assert data["verification_status"] == "DRAFT"
    
    # 4. Verify DB State explicitly (Trainer doesn't have slug, search by user_id linked implicitly)
    # We can get 'me' to verify
    r = client.get("/api/v1/users/me", headers=headers)
    assert r.status_code == 200
    user_data = r.json()
    assert user_data["trainer"]["verification_status"] == "DRAFT"

def test_access_control_gym_edit(client: TestClient, session: Session):
    # TODO: Implement when Update endpoints are fully secured with ownership checks
    pass
