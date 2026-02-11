import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.security import get_password_hash
from app.models.associations import AssociationStatus, ClientTrainer
from app.models.gym import Gym
from app.models.subscription import ClientSubscription, SubscriptionStatus
from app.models.trainer import Trainer
from app.models.user import User, UserRole
from tests.test_constants import TEST_USER_PASSWORD


@pytest.fixture
def trainer_a(session: Session):
    user = User(
        email="trainer_a@example.com",
        full_name="Trainer A",
        hashed_password=get_password_hash(TEST_USER_PASSWORD),
        role=UserRole.TRAINER,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    trainer = Trainer(
        user_id=user.id, bio="Trainer A Bio", verification_status="APPROVED"
    )
    session.add(trainer)
    session.commit()
    session.refresh(trainer)
    return trainer, user


@pytest.fixture
def trainer_b(session: Session):
    user = User(
        email="trainer_b@example.com",
        full_name="Trainer B",
        hashed_password=get_password_hash(TEST_USER_PASSWORD),
        role=UserRole.TRAINER,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    trainer = Trainer(
        user_id=user.id, bio="Trainer B Bio", verification_status="APPROVED"
    )
    session.add(trainer)
    session.commit()
    session.refresh(trainer)
    return trainer, user


@pytest.fixture
def gym_admin_a(session: Session):
    user = User(
        email="gym_a@example.com",
        full_name="Gym Admin A",
        hashed_password=get_password_hash(TEST_USER_PASSWORD),
        role=UserRole.GYM_ADMIN,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    gym = Gym(
        admin_id=user.id,
        name="Gym A",
        slug="gym-a",
        location="Loc A",
        verification_status="APPROVED",
    )
    session.add(gym)
    session.commit()
    session.refresh(gym)
    return gym, user


@pytest.fixture
def gym_admin_b(session: Session):
    user = User(
        email="gym_b@example.com",
        full_name="Gym Admin B",
        hashed_password=get_password_hash(TEST_USER_PASSWORD),
        role=UserRole.GYM_ADMIN,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    gym = Gym(
        admin_id=user.id,
        name="Gym B",
        slug="gym-b",
        location="Loc B",
        verification_status="APPROVED",
    )
    session.add(gym)
    session.commit()
    session.refresh(gym)
    return gym, user


def get_token(client, email):
    login_data = {"username": email, "password": TEST_USER_PASSWORD}
    response = client.post("/api/v1/auth/access-token", data=login_data)
    return response.json()["access_token"]


def test_trainer_isolation(client: TestClient, trainer_a, trainer_b):
    # Trainer A tries to access Trainer B's client list
    # Assuming Trainer B has a client (we'll just use the ID)
    token_a = get_token(client, trainer_a[1].email)
    headers = {"Authorization": f"Bearer {token_a}"}

    # URL fidgeting: change ID to Trainer B's
    response = client.get(
        f"/api/v1/trainers/{trainer_b[0].id}/clients", headers=headers
    )
    assert response.status_code == 403
    assert "Not authorized" in response.text


def test_gym_isolation(client: TestClient, gym_admin_a, gym_admin_b):
    # Gym Admin A tries to access Gym B's client list
    token_a = get_token(client, gym_admin_a[1].email)
    headers = {"Authorization": f"Bearer {token_a}"}

    # URL fidgeting: change ID to Gym B's
    response = client.get(f"/api/v1/gyms/{gym_admin_b[0].id}/clients", headers=headers)
    assert response.status_code == 403
    assert "Not authorized" in response.text


def test_trainer_cannot_access_gym_clients(client: TestClient, trainer_a, gym_admin_a):
    # Trainer A tries to access their Gym's facility-wide client list
    token_a = get_token(client, trainer_a[1].email)
    headers = {"Authorization": f"Bearer {token_a}"}

    # Even if they are IN the gym, they are NOT the admin
    response = client.get(f"/api/v1/gyms/{gym_admin_a[0].id}/clients", headers=headers)
    assert response.status_code == 403
    assert "Not authorized" in response.text


def test_trainer_onboarding_isolation(
    client: TestClient, trainer_a, trainer_b, gym_admin_a
):
    # Trainer A tries to onboard a client for Trainer B
    token_a = get_token(client, trainer_a[1].email)
    headers = {"Authorization": f"Bearer {token_a}"}

    payload = {
        "full_name": "Stolen Client",
        "email": "stolen@example.com",
        "gym_id": gym_admin_a[0].id,
        "package_id": 1,  # Assume exists or would fail for other reasons, but 403 should hit first
    }

    response = client.post(
        f"/api/v1/trainers/{trainer_b[0].id}/clients/onboard",
        json=payload,
        headers=headers,
    )
    assert response.status_code == 403


def test_gym_admin_cannot_patch_trainer_profile(
    client: TestClient, gym_admin_a, trainer_a
):
    # Gym Admin A tries to edit Trainer A's profile
    token_admin = get_token(client, gym_admin_a[1].email)
    headers = {"Authorization": f"Bearer {token_admin}"}

    payload = {"bio": "Hacked by Admin"}
    response = client.patch(
        f"/api/v1/trainers/{trainer_a[0].id}", json=payload, headers=headers
    )

    assert response.status_code == 403
    assert "Not authorized" in response.text


def test_cross_trainer_patch_protection(client: TestClient, trainer_a, trainer_b):
    # Trainer A tries to edit Trainer B's profile
    token_a = get_token(client, trainer_a[1].email)
    headers = {"Authorization": f"Bearer {token_a}"}

    payload = {"bio": "Hacked by Trainer A"}
    response = client.patch(
        f"/api/v1/trainers/{trainer_b[0].id}", json=payload, headers=headers
    )

    assert response.status_code == 403
