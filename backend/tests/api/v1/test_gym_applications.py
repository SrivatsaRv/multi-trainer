import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from app.models.gym import Gym, VerificationStatus as GymVerificationStatus
from app.models.trainer import Trainer
from app.models.user import User, UserRole
from app.models.gym_application import GymApplication, ApplicationStatus
from app.models.associations import GymTrainer, AssociationStatus
from app.core.security import get_password_hash

# Helper to create a gym admin
def create_gym_admin_and_gym(client, session):
    admin = User(
        email="gym_admin_test@example.com",
        full_name="Gym Admin Test",
        hashed_password=get_password_hash("password123"),
        role=UserRole.GYM_ADMIN,
        is_active=True,
    )
    session.add(admin)
    session.commit()
    session.refresh(admin)

    test_gym = Gym(
        name="Test Gym App",
        slug="test-gym-app",
        location="Somewhere",
        admin_id=admin.id,
        verification_status=GymVerificationStatus.APPROVED
    )
    session.add(test_gym)
    session.commit()
    session.refresh(test_gym)

    login_data = {"username": admin.email, "password": "password123"}
    response = client.post("/api/v1/auth/access-token", data=login_data)
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    return test_gym, headers

def test_unverified_trainer_cannot_apply(
    client: TestClient, session: Session, trainer_user_token_headers: dict, trainer_data
):
    test_gym, _ = create_gym_admin_and_gym(client, session)

    # Ensure trainer is NOT approved
    trainer = session.exec(select(Trainer)).first()
    trainer.verification_status = GymVerificationStatus.PENDING
    session.add(trainer)
    session.commit()

    response = client.post(
        "/api/v1/gym-applications/",
        headers=trainer_user_token_headers,
        json={"gym_id": test_gym.id, "message": "Let me in"},
    )
    assert response.status_code == 403
    assert "must be APPROVED" in response.json()["detail"]


def test_cannot_apply_to_unverified_gym(
    client: TestClient, session: Session, trainer_user_token_headers: dict, trainer_data
):
    test_gym, _ = create_gym_admin_and_gym(client, session)

    # Ensure trainer IS approved
    trainer = session.exec(select(Trainer)).first()
    trainer.verification_status = GymVerificationStatus.APPROVED
    session.add(trainer)
    
    # Ensure gym is NOT approved
    test_gym.verification_status = GymVerificationStatus.PENDING
    session.add(test_gym)
    session.commit()

    response = client.post(
        "/api/v1/gym-applications/",
        headers=trainer_user_token_headers,
        json={"gym_id": test_gym.id, "message": "Let me in"},
    )
    assert response.status_code == 400
    assert "unapproved gym" in response.json()["detail"]


def test_approved_trainer_can_apply_to_approved_gym(
    client: TestClient, session: Session, trainer_user_token_headers: dict, trainer_data
):
    test_gym, _ = create_gym_admin_and_gym(client, session)

    # Ensure trainer is approved
    trainer = session.exec(select(Trainer)).first()
    trainer.verification_status = GymVerificationStatus.APPROVED
    session.add(trainer)
    session.commit()

    response = client.post(
        "/api/v1/gym-applications/",
        headers=trainer_user_token_headers,
        json={"gym_id": test_gym.id, "message": "Let me in"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "PENDING"
    assert data["gym_id"] == test_gym.id
    assert data["trainer_id"] == trainer.id


def test_gym_admin_approval_creates_association(
    client: TestClient, session: Session, trainer_user_token_headers: dict, trainer_data
):
    test_gym, gym_admin_token_headers = create_gym_admin_and_gym(client, session)

    # Setup approved trainer
    trainer = session.exec(select(Trainer)).first()
    trainer.verification_status = GymVerificationStatus.APPROVED
    session.add(trainer)
    session.commit()

    # Create application directly
    app = GymApplication(gym_id=test_gym.id, trainer_id=trainer.id, message="Hi")
    session.add(app)
    session.commit()
    session.refresh(app)

    # Approve application
    response = client.put(
        f"/api/v1/gym-applications/{app.id}/status",
        headers=gym_admin_token_headers,
        json={"status": "APPROVED"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "APPROVED"

    # Verify GymTrainer association was created atomically
    assoc = session.exec(
        select(GymTrainer).where(
            GymTrainer.gym_id == test_gym.id,
            GymTrainer.trainer_id == trainer.id
        )
    ).first()
    assert assoc is not None
    assert assoc.status == AssociationStatus.ACTIVE


def test_gym_admin_rejection_deletes_association(
    client: TestClient, session: Session, trainer_user_token_headers: dict, trainer_data
):
    test_gym, gym_admin_token_headers = create_gym_admin_and_gym(client, session)

    # Setup trainer
    trainer = session.exec(select(Trainer)).first()

    # Create application directly as APPROVED and insert Association
    app = GymApplication(gym_id=test_gym.id, trainer_id=trainer.id, status=ApplicationStatus.APPROVED)
    assoc = GymTrainer(gym_id=test_gym.id, trainer_id=trainer.id, status=AssociationStatus.ACTIVE)
    session.add(app)
    session.add(assoc)
    session.commit()
    session.refresh(app)

    # Admin changes mind, rejects application
    response = client.put(
        f"/api/v1/gym-applications/{app.id}/status",
        headers=gym_admin_token_headers,
        json={"status": "REJECTED"},
    )
    assert response.status_code == 200

    # Verify GymTrainer association was deleted
    deleted_assoc = session.exec(
        select(GymTrainer).where(
            GymTrainer.gym_id == test_gym.id,
            GymTrainer.trainer_id == trainer.id
        )
    ).first()
    assert deleted_assoc is None
