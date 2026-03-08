from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.associations import (AssociationStatus, ClientTrainer,
                                     GymTrainer)
from app.models.booking import Booking, BookingStatus, SessionPackage
from app.models.gym import Gym
from app.models.subscription import ClientSubscription, SubscriptionStatus
from app.models.trainer import Trainer
from app.models.user import User, UserRole
from tests.test_constants import TEST_USER_PASSWORD


@pytest.fixture(name="trainer_setup")
def trainer_setup_fixture(session: Session, trainer_user: User):
    trainer = session.exec(
        select(Trainer).where(Trainer.user_id == trainer_user.id)
    ).first()
    if not trainer:
        trainer = Trainer(user_id=trainer_user.id, bio="Pro Trainer")
        session.add(trainer)
        session.commit()
        session.refresh(trainer)
    return trainer


def test_trainer_full_crud(
    auth_client: TestClient,
    session: Session,
    trainer_user: User,
    trainer_setup: Trainer,
):
    # 1. READ
    response = auth_client.get(f"/api/v1/trainers/{trainer_setup.id}")
    assert response.status_code == 200
    assert response.json()["bio"] == "Pro Trainer"

    # 2. UPDATE (PUT)
    update_data = {"bio": "Elite Performance Coach", "experience_years": 10}
    # Need to login as trainer_user specifically or use auth_client if it matches
    # But conftest auth_client is test_user (GYM_ADMIN).
    # I should use trainer_user_token_headers in a separate client or login.

    # Let's use the trainer_user and login inside the test for clarity
    login_data = {"username": trainer_user.email, "password": TEST_USER_PASSWORD}
    login_res = auth_client.post("/api/v1/auth/access-token", data=login_data)
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = auth_client.put(
        f"/api/v1/trainers/{trainer_setup.id}", json=update_data, headers=headers
    )
    assert response.status_code == 200
    assert response.json()["bio"] == "Elite Performance Coach"

    # 3. PATCH
    patch_data = {"experience_years": 12}
    response = auth_client.patch(
        f"/api/v1/trainers/{trainer_setup.id}", json=patch_data, headers=headers
    )
    assert response.status_code == 200
    assert response.json()["experience_years"] == 12

    # 4. DELETE
    response = auth_client.delete(
        f"/api/v1/trainers/{trainer_setup.id}", headers=headers
    )
    assert response.status_code == 200

    # Verify
    response = auth_client.get(f"/api/v1/trainers/{trainer_setup.id}")
    assert response.status_code == 404


def test_trainer_gym_application(
    auth_client: TestClient,
    session: Session,
    trainer_user: User,
    trainer_setup: Trainer,
):
    # Setup: Create a gym
    gym = Gym(
        name="Association Gym", slug="assoc-gym", location="Loc", admin_id=1
    )  # admin_id placeholder
    session.add(gym)
    session.commit()
    session.refresh(gym)

    # Login as trainer
    login_data = {"username": trainer_user.email, "password": TEST_USER_PASSWORD}
    token = auth_client.post("/api/v1/auth/access-token", data=login_data).json()[
        "access_token"
    ]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. APPLY to Gym
    response = auth_client.post(
        f"/api/v1/trainers/{trainer_setup.id}/gyms?gym_id={gym.id}", headers=headers
    )
    assert response.status_code == 201
    assert "Application sent" in response.json()["message"]

    # 2. READ Trainer Gyms
    response = auth_client.get(
        f"/api/v1/trainers/{trainer_setup.id}/gyms", headers=headers
    )
    assert response.status_code == 200
    gyms = response.json()
    assert len(gyms) >= 1
    assert gyms[0]["gym"]["id"] == gym.id
    assert gyms[0]["status"] == "PENDING"


def test_trainer_client_onboarding(
    auth_client: TestClient,
    session: Session,
    trainer_user: User,
    trainer_setup: Trainer,
):
    # Setup: Gym and Active Association
    gym = Gym(name="Onboard Gym", slug="onboard-gym", location="Loc", admin_id=1)
    session.add(gym)
    session.commit()
    session.refresh(gym)

    assoc = GymTrainer(
        gym_id=gym.id, trainer_id=trainer_setup.id, status=AssociationStatus.ACTIVE
    )
    session.add(assoc)

    pkg = SessionPackage(
        name="Starter", price_inr=1000, session_count=10, gym_id=gym.id
    )
    session.add(pkg)
    session.commit()
    session.refresh(pkg)

    # Login as trainer
    login_data = {"username": trainer_user.email, "password": TEST_USER_PASSWORD}
    token = auth_client.post("/api/v1/auth/access-token", data=login_data).json()[
        "access_token"
    ]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. ONBOARD Client
    onboard_payload = {
        "full_name": "New Client",
        "email": "new_client@example.com",
        "gym_id": gym.id,
        "package_id": pkg.id,
    }
    response = auth_client.post(
        f"/api/v1/trainers/{trainer_setup.id}/clients/onboard",
        json=onboard_payload,
        headers=headers,
    )
    assert response.status_code == 201

    # 2. READ Trainer Clients
    response = auth_client.get(
        f"/api/v1/trainers/{trainer_setup.id}/clients", headers=headers
    )
    assert response.status_code == 200
    clients = response.json()
    assert any(c["email"] == "new_client@example.com" for c in clients)


def test_trainer_analytics_overview(
    auth_client: TestClient,
    session: Session,
    trainer_user: User,
    trainer_setup: Trainer,
):
    # Login as trainer
    login_data = {"username": trainer_user.email, "password": TEST_USER_PASSWORD}
    token = auth_client.post("/api/v1/auth/access-token", data=login_data).json()[
        "access_token"
    ]
    headers = {"Authorization": f"Bearer {token}"}

    # Call simple analytics
    response = auth_client.get(
        f"/api/v1/trainers/{trainer_setup.id}/analytics", headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "completed_sessions" in data
    assert "total_earnings" in data
