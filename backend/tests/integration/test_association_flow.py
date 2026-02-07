from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.gym import Gym
from app.models.trainer import Trainer
from app.models.user import User, UserRole
from tests.test_constants import TEST_USER_PASSWORD


import pytest


@pytest.mark.integration
def test_gym_trainer_invite_flow(client: TestClient, session: Session):
    # 1. Register Gym Admin
    gym_email = "int_gym_assoc@example.com"
    gym_password = TEST_USER_PASSWORD
    gym_reg = {
        "full_name": "Integration Gym Owner",
        "email": gym_email,
        "password": gym_password,
        "role": "GYM_ADMIN",
    }
    r = client.post("/api/v1/auth/register", json=gym_reg)
    assert r.status_code == 200

    # 1.5 Login Gym Admin
    login_data = {"username": gym_email, "password": gym_password}
    r = client.post("/api/v1/auth/access-token", data=login_data)
    assert r.status_code == 200
    gym_token = r.json()["access_token"]
    gym_headers = {"Authorization": f"Bearer {gym_token}"}

    # 2. Register Trainer
    trainer_email = "int_trainer_assoc@example.com"
    trainer_password = TEST_USER_PASSWORD
    trainer_reg = {
        "full_name": "Integration Trainer",
        "email": trainer_email,
        "password": trainer_password,
        "role": "TRAINER",
    }
    r = client.post("/api/v1/auth/register", json=trainer_reg)
    assert r.status_code == 200

    # 2.5 Login Trainer
    trainer_login = {"username": trainer_email, "password": trainer_password}
    r = client.post("/api/v1/auth/access-token", data=trainer_login)
    assert r.status_code == 200
    trainer_token = r.json()["access_token"]
    trainer_headers = {"Authorization": f"Bearer {trainer_token}"}

    # 3. Setup Gym Profile (Gym Admin) - Update auto-created one
    me = client.get("/api/v1/users/me", headers=gym_headers).json()
    gym_id = me["gym"]["id"]
    
    gym_payload = {
        "name": "Association Test Gym",
        "slug": "assoc-gym",
        "location": "Test City",
    }
    r = client.put(f"/api/v1/gyms/{gym_id}", json=gym_payload, headers=gym_headers)
    assert r.status_code == 200

    # 4. Setup Trainer Profile (Trainer) - Update auto-created one
    me_tr = client.get("/api/v1/users/me", headers=trainer_headers).json()
    trainer_id = me_tr["trainer"]["id"]
    
    trainer_payload = {"bio": "Ready for association."}
    r = client.put(f"/api/v1/trainers/{trainer_id}", json=trainer_payload, headers=trainer_headers)
    assert r.status_code == 200
    trainer_user_data = client.get("/api/v1/users/me", headers=trainer_headers).json()
    # Handle dict vs list for trainer object if needed, but in API response it should be dict
    trainer_id = trainer_user_data["trainer"]["id"]

    # 5. Gym Invites Trainer
    invite_payload = {"email": "int_trainer_assoc@example.com"}
    r = client.post(
        f"/api/v1/gyms/{gym_id}/trainers", json=invite_payload, headers=gym_headers
    )
    assert r.status_code == 201, r.text
    assert r.json()["message"] == "Invitation sent to int_trainer_assoc@example.com"

    # 6. Verify Invitation Status (Gym View)
    r = client.get(f"/api/v1/gyms/{gym_id}/trainers", headers=gym_headers)
    assert r.status_code == 200
    trainers_list = r.json()
    assert len(trainers_list) == 1
    assert trainers_list[0]["status"] == "INVITED"
    assert (
        trainers_list[0]["trainer"]["user"]["email"] == "int_trainer_assoc@example.com"
    )

    # 7. Verify Invitation Visibility (Trainer View)
    r = client.get(f"/api/v1/trainers/{trainer_id}/gyms", headers=trainer_headers)
    assert r.status_code == 200
    gyms_list = r.json()
    assert len(gyms_list) == 1
    assert gyms_list[0]["status"] == "INVITED"
    assert gyms_list[0]["gym"]["id"] == gym_id


@pytest.mark.integration
def test_trainer_apply_flow(client: TestClient, session: Session):
    # 1. Register & Login Gym Admin
    gym_email = "int_gym_apply@example.com"
    gym_password = TEST_USER_PASSWORD
    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Gym Target",
            "email": gym_email,
            "password": gym_password,
            "role": "GYM_ADMIN",
        },
    )
    r = client.post(
        "/api/v1/auth/access-token",
        data={"username": gym_email, "password": gym_password},
    )
    gym_token = r.json()["access_token"]
    gym_headers = {"Authorization": f"Bearer {gym_token}"}

    # Create Gym
    me = client.get("/api/v1/users/me", headers=gym_headers).json()
    gym_id = me["gym"]["id"]
    r = client.put(
        f"/api/v1/gyms/{gym_id}",
        json={"name": "Target Gym", "slug": "target-gym", "location": "City"},
        headers=gym_headers,
    )
    assert r.status_code == 200

    # 2. Register & Login Trainer
    tr_email = "int_trainer_apply@example.com"
    tr_password = TEST_USER_PASSWORD
    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Applicant Trainer",
            "email": tr_email,
            "password": tr_password,
            "role": "TRAINER",
        },
    )
    r = client.post(
        "/api/v1/auth/access-token",
        data={"username": tr_email, "password": tr_password},
    )
    tr_token = r.json()["access_token"]
    tr_headers = {"Authorization": f"Bearer {tr_token}"}
 
    # Setup Trainer Profile
    me_tr = client.get("/api/v1/users/me", headers=tr_headers).json()
    trainer_id = me_tr["trainer"]["id"]
    client.put(f"/api/v1/trainers/{trainer_id}", json={"bio": "Applying..."}, headers=tr_headers)

    # 3. Trainer Applies to Gym
    # POST /trainers/{trainer_id}/gyms?gym_id={gym_id} or body?
    # Checking implementation: `def apply_to_gym(..., gym_id: int, ...)` -> Query param expected based on signature `gym_id: int` without Body/Form
    r = client.post(
        f"/api/v1/trainers/{trainer_id}/gyms?gym_id={gym_id}", headers=tr_headers
    )
    assert r.status_code == 201
    assert r.json()["message"] == "Application sent to gym"

    # 4. Verify Pending Status (Trainer View)
    r = client.get(f"/api/v1/trainers/{trainer_id}/gyms", headers=tr_headers)
    assert r.status_code == 200
    gyms = r.json()
    assert gyms[0]["status"] == "PENDING"

    # 5. Verify Pending Status (Gym View)
    r = client.get(f"/api/v1/gyms/{gym_id}/trainers", headers=gym_headers)
    assert r.status_code == 200
    trainers = r.json()
    assert trainers[0]["status"] == "PENDING"
