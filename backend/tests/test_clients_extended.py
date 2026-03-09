from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.client_profile import ClientProfile
from app.models.gym import Gym
from app.models.user import User, UserRole
from tests.test_constants import TEST_USER_PASSWORD


@pytest.fixture(name="client_user")
def client_user_fixture(session: Session):
    user = User(
        email="test_client@example.com",
        full_name="Test Client",
        hashed_password="hash",
        role=UserRole.CLIENT,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def test_client_profile_crud(client: TestClient, session: Session, client_user: User):
    # 1. Login as Client
    login_data = {
        "username": client_user.email,
        "password": "hash",
    }  # Note: conftest might use a different hashing if I don't use get_password_hash
    # To be safe, let's use a known hash from conftest or create properly
    from app.core.security import get_password_hash

    client_user.hashed_password = get_password_hash("password123")
    session.add(client_user)
    session.commit()

    login_data = {"username": client_user.email, "password": "password123"}
    response = client.post("/api/v1/auth/access-token", data=login_data)
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. CREATE Profile
    profile_payload = {
        "user_id": client_user.id,
        "date_of_birth": "1990-01-01",
        "gender": "MALE",
        "weight_kg": 75.0,
        "height_cm": 180.0,
        "emergency_contact": "9876543210",
    }
    response = client.post("/api/v1/clients/", json=profile_payload, headers=headers)
    assert response.status_code == 201

    # 3. READ Profile
    response = client.get(f"/api/v1/clients/{client_user.id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["weight_kg"] == 75.0

    # 4. UPDATE Profile
    update_payload = {"weight_kg": 74.0}
    response = client.patch(
        f"/api/v1/clients/{client_user.id}", json=update_payload, headers=headers
    )
    assert response.status_code == 200
    assert response.json()["weight_kg"] == 74.0


def test_client_profile_permissions(
    client: TestClient, session: Session, client_user: User, test_user: User
):
    # Setup profile for client_user
    profile = ClientProfile(user_id=client_user.id, weight_kg=75.0)
    session.add(profile)
    session.commit()

    # 1. Login as gym admin (test_user)
    login_data = {"username": test_user.email, "password": TEST_USER_PASSWORD}
    response = client.post("/api/v1/auth/access-token", data=login_data)
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Setup necessary RBAC relations for GYM_ADMIN to read client profile
    gym = Gym(name="Test Gym", slug="test-gym-admin", location="Test", admin_id=test_user.id)
    session.add(gym)
    session.flush()
    from app.models.subscription import ClientSubscription, SubscriptionStatus
    sub = ClientSubscription(
        user_id=client_user.id,
        gym_id=gym.id,
        status=SubscriptionStatus.ACTIVE,
        total_sessions=10,
        sessions_used=0,
        start_date=datetime.now(),
        expiry_date=datetime.now() + timedelta(days=30),
    )
    session.add(sub)
    session.commit()

    # 2. READ client profile as gym admin (should be allowed)
    response = client.get(f"/api/v1/clients/{client_user.id}", headers=headers)
    assert response.status_code == 200

    # 3. Create another client who shouldn't see this profile
    from app.core.security import get_password_hash

    other_client = User(
        email="other@example.com",
        hashed_password=get_password_hash("pw"),
        role=UserRole.CLIENT,
        is_active=True,
    )
    session.add(other_client)
    session.commit()

    login_data = {"username": other_client.email, "password": "pw"}
    response = client.post("/api/v1/auth/access-token", data=login_data)
    token = response.json()["access_token"]
    headers_other = {"Authorization": f"Bearer {token}"}

    # 4. READ client profile as another client (should be forbidden)
    response = client.get(f"/api/v1/clients/{client_user.id}", headers=headers_other)
    assert response.status_code == 403
