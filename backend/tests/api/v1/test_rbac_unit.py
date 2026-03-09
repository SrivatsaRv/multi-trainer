import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.api.api_v1.deps import require_role
from app.models.user import User, UserRole


def test_require_role_dependency_success():
    """deps.py: require_role succeeding when user has the allowed role"""
    user = User(role=UserRole.GYM_ADMIN, email="test@test.com", is_active=True)
    guard = require_role("GYM_ADMIN", "SAAS_ADMIN")
    # Should return user without raising exception
    result = guard(current_user=user)
    assert result == user


def test_require_role_dependency_failure():
    """deps.py: require_role raising HTTP 403 when user does not have role"""
    user = User(role=UserRole.CLIENT, email="test@test.com", is_active=True)
    guard = require_role("GYM_ADMIN", "SAAS_ADMIN")
    with pytest.raises(HTTPException) as exc:
        guard(current_user=user)
    assert exc.value.status_code == 403
    assert exc.value.detail == "Insufficient privileges"


def test_create_gym_rbac_enforcement(client: TestClient, session: Session):
    """gyms.py: create_gym should reject CLIENT/TRAINER roles"""
    from tests.conftest import get_password_hash

    # Create a simple CLIENT user
    regular_user = User(
        email="client_gym_creator@example.com",
        full_name="Client",
        hashed_password=get_password_hash("password123"),
        role=UserRole.CLIENT,
        is_active=True,
    )
    session.add(regular_user)
    session.commit()

    login_data = {
        "username": "client_gym_creator@example.com",
        "password": "password123",
    }
    token_res = client.post("/api/v1/auth/access-token", data=login_data)
    headers = {"Authorization": f"Bearer {token_res.json()['access_token']}"}

    gym_payload = {
        "name": "Hacked Gym",
        "location": "Internet",
        "description": "Attempting privilege escalation",
    }
    # Should be 403 because role is CLIENT, expected GYM_ADMIN or SAAS_ADMIN
    response = client.post("/api/v1/gyms/", json=gym_payload, headers=headers)
    assert response.status_code == 403


def test_create_trainer_rbac_enforcement(client: TestClient, session: Session):
    """trainers.py: create_trainer should reject CLIENT/GYM_ADMIN roles"""
    from tests.conftest import get_password_hash

    # Create a GYM_ADMIN user
    admin_user = User(
        email="admin_trainer_creator@example.com",
        full_name="Admin",
        hashed_password=get_password_hash("password123"),
        role=UserRole.GYM_ADMIN,
        is_active=True,
    )
    session.add(admin_user)
    session.commit()

    login_data = {
        "username": "admin_trainer_creator@example.com",
        "password": "password123",
    }
    token_res = client.post("/api/v1/auth/access-token", data=login_data)
    headers = {"Authorization": f"Bearer {token_res.json()['access_token']}"}

    trainer_payload = {
        "bio": "I am a gym admin trying to be a trainer",
        "certifications": [],
        "specialties": [],
        "availability": {},
    }
    # Should be 403 because role is GYM_ADMIN, expected TRAINER or SAAS_ADMIN
    response = client.post("/api/v1/trainers/", json=trainer_payload, headers=headers)
    assert response.status_code == 403


def test_read_client_profile_rbac_failure(client: TestClient, session: Session):
    """clients.py: reading a client profile without active relationship should fail (403)"""
    from app.models.client_profile import ClientProfile
    from tests.conftest import get_password_hash

    target_client = User(
        email="target_client@example.com",
        hashed_password=get_password_hash("pw"),
        role=UserRole.CLIENT,
        is_active=True,
    )
    unrelated_trainer = User(
        email="unrelated_trainer@example.com",
        hashed_password=get_password_hash("pw"),
        role=UserRole.TRAINER,
        is_active=True,
    )
    session.add_all([target_client, unrelated_trainer])
    session.commit()

    # Create profile for the target client
    profile = ClientProfile(user_id=target_client.id, weight_kg=80.0)
    session.add(profile)
    session.commit()

    # Login as unrelated trainer (no ClientTrainer relation)
    token_res = client.post(
        "/api/v1/auth/access-token",
        data={"username": "unrelated_trainer@example.com", "password": "pw"},
    )
    headers = {"Authorization": f"Bearer {token_res.json()['access_token']}"}

    # Action
    response = client.get(f"/api/v1/clients/{target_client.id}", headers=headers)
    # Since there is NO ClientTrainer link, the scope validation throws 403
    assert response.status_code == 403


def test_get_occupied_slots_rbac_failure(client: TestClient, session: Session):
    """bookings.py: testing isolation on get_occupied_slots for cross-tenant access"""
    from app.models.trainer import Trainer
    from tests.conftest import get_password_hash

    trainer1_user = User(
        email="t1@example.com",
        hashed_password=get_password_hash("pw"),
        role=UserRole.TRAINER,
        is_active=True,
    )
    trainer2_user = User(
        email="t2@example.com",
        hashed_password=get_password_hash("pw"),
        role=UserRole.TRAINER,
        is_active=True,
    )
    session.add_all([trainer1_user, trainer2_user])
    session.flush()

    t1 = Trainer(user_id=trainer1_user.id)
    t2 = Trainer(user_id=trainer2_user.id)
    session.add_all([t1, t2])
    session.commit()

    # Login as Trainer 1
    token_res = client.post(
        "/api/v1/auth/access-token",
        data={"username": "t1@example.com", "password": "pw"},
    )
    headers = {"Authorization": f"Bearer {token_res.json()['access_token']}"}

    # Action: Trainer 1 tries to query Trainer 2's occupied slots
    response = client.get(
        f"/api/v1/bookings/occupied-slots?trainer_id={t2.id}", headers=headers
    )

    # Expect 403 since trainer_id parameter doesn't match Trainer 1's ID
    assert response.status_code == 403
