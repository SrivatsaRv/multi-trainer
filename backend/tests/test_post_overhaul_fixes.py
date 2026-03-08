import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.session import get_session
from app.main import app
from app.models.user import User, UserRole


@pytest.fixture
def test_user(session: Session):
    user = User(
        email="fixer@example.com",
        full_name="Original Name",
        hashed_password=get_password_hash("password"),
        role=UserRole.TRAINER,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def test_patch_me_endpoint(client: TestClient, session: Session):
    # Mock current user
    user = User(
        email="patchme@example.com",
        full_name="Old Name",
        hashed_password=get_password_hash("password"),
        role=UserRole.TRAINER,
    )
    session.add(user)
    session.commit()

    # Login to get token (or use dependency override)
    from app.api.api_v1.deps import get_current_user

    app.dependency_overrides[get_current_user] = lambda: user

    response = client.patch("/api/v1/users/me", json={"full_name": "New Premium Name"})

    assert response.status_code == 200
    assert response.json()["user"]["full_name"] == "New Premium Name"

    # Verify in DB
    session.refresh(user)
    assert user.full_name == "New Premium Name"

    app.dependency_overrides.clear()


def test_read_trainer_client_robustness(client: TestClient, session: Session):
    # Test that it doesn't 500 when package is missing but subscription exists
    # Create trainer and client
    from datetime import datetime

    from app.models.associations import AssociationStatus, ClientTrainer
    from app.models.subscription import ClientSubscription, SubscriptionStatus
    from app.models.trainer import Trainer

    trainer_user = User(email="t1@ex.com", hashed_password="pw", role=UserRole.TRAINER)
    client_user = User(email="c1@ex.com", hashed_password="pw", role=UserRole.CLIENT)
    session.add_all([trainer_user, client_user])
    session.commit()

    trainer = Trainer(user_id=trainer_user.id)
    session.add(trainer)
    session.commit()

    assoc = ClientTrainer(
        client_id=client_user.id,
        trainer_id=trainer.id,
        status=AssociationStatus.ACTIVE,
        created_at=datetime.now(),
    )
    session.add(assoc)

    # Subscription WITHOUT session_package_id (or with invalid one)
    sub = ClientSubscription(
        user_id=client_user.id,
        total_sessions=10,
        sessions_used=2,
        start_date=datetime.now(),
        status=SubscriptionStatus.ACTIVE,
        session_package_id=None,  # This was the 500 case
    )
    session.add(sub)
    session.commit()

    from app.api.api_v1.deps import get_current_user

    app.dependency_overrides[get_current_user] = lambda: trainer_user

    response = client.get(f"/api/v1/trainers/{trainer.id}/clients/{client_user.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["subscription"]["package_name"] == "N/A"
    assert data["created_at"] is not None

    app.dependency_overrides.clear()
