import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.associations import AssociationStatus, GymTrainer
from app.models.booking import SessionPackage
from app.models.gym import Gym, VerificationStatus
from app.models.trainer import Trainer
from app.models.user import User, UserRole
from tests.test_constants import TEST_USER_PASSWORD


def test_gym_full_crud(auth_client: TestClient, session: Session, test_user: User):
    # 1. READ (already auto-created by register flow in some cases, but here we use test_user)
    # Check if test_user has a gym
    gym = session.exec(select(Gym).where(Gym.admin_id == test_user.id)).first()
    if not gym:
        gym = Gym(
            name="Initial Gym",
            slug="initial-gym",
            location="Loc",
            admin_id=test_user.id,
        )
        session.add(gym)
        session.commit()
        session.refresh(gym)

    # 2. UPDATE
    update_data = {"name": "Updated Gym Name", "location": "New Location"}
    response = auth_client.put(f"/api/v1/gyms/{gym.id}", json=update_data)
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Gym Name"
    assert response.json()["location"] == "New Location"

    # 3. DELETE
    response = auth_client.delete(f"/api/v1/gyms/{gym.id}")
    assert response.status_code == 200

    # Verify deletion
    response = auth_client.get(f"/api/v1/gyms/{gym.id}")
    assert response.status_code == 404


def test_gym_package_crud(auth_client: TestClient, session: Session, test_user: User):
    # Setup: Create a gym
    gym = Gym(name="Package Gym", slug="pkg-gym", location="Loc", admin_id=test_user.id)
    session.add(gym)
    session.commit()
    session.refresh(gym)

    # 1. CREATE Package
    pkg_payload = {
        "name": "Gold Membership",
        "description": "Premium access",
        "price_inr": 5000,
        "session_count": 12,
    }
    response = auth_client.post(f"/api/v1/gyms/{gym.id}/packages", json=pkg_payload)
    assert response.status_code == 201
    pkg_id = response.json()["id"]

    # 2. READ Packages
    response = auth_client.get(f"/api/v1/gyms/{gym.id}/packages")
    assert response.status_code == 200
    assert len(response.json()) >= 1
    assert response.json()[0]["name"] == "Gold Membership"

    # 3. UPDATE Package
    update_payload = {"price_inr": 6000}
    response = auth_client.put(
        f"/api/v1/gyms/{gym.id}/packages/{pkg_id}", json=update_payload
    )
    assert response.status_code == 200
    assert response.json()["price_inr"] == 6000

    # 4. DELETE Package
    response = auth_client.delete(f"/api/v1/gyms/{gym.id}/packages/{pkg_id}")
    assert response.status_code == 200

    # Verify deletion
    response = auth_client.get(f"/api/v1/gyms/{gym.id}/packages")
    packages = response.json()
    assert not any(p["id"] == pkg_id for p in packages)


def test_gym_trainer_invitation_flow(
    auth_client: TestClient, session: Session, test_user: User, trainer_user: User
):
    # Setup: Create a gym
    gym = Gym(
        name="Invite Gym", slug="invite-gym", location="Loc", admin_id=test_user.id
    )
    session.add(gym)

    # Ensure trainer_user has a trainer profile
    trainer_profile = session.exec(
        select(Trainer).where(Trainer.user_id == trainer_user.id)
    ).first()
    if not trainer_profile:
        trainer_profile = Trainer(user_id=trainer_user.id)
        session.add(trainer_profile)

    session.commit()
    session.refresh(gym)
    session.refresh(trainer_profile)

    # 1. INVITE Trainer
    invite_payload = {"email": trainer_user.email, "message": "Join us!"}
    response = auth_client.post(f"/api/v1/gyms/{gym.id}/trainers", json=invite_payload)
    assert response.status_code == 201
    assert "Invitation sent" in response.json()["message"]

    # 2. READ Gym Trainers (Roster)
    response = auth_client.get(f"/api/v1/gyms/{gym.id}/trainers")
    assert response.status_code == 200
    roster = response.json()
    assert len(roster) >= 1
    assert roster[0]["trainer"]["user"]["email"] == trainer_user.email
    assert roster[0]["status"] == "INVITED"

    # 3. UPDATE Trainer Status (Gym Admin perspective)
    # Case: Approve trainer (normally trainer accepts, but gym admin can also force activate for tests/admin purposes if endpoint allows)
    status_payload = {"status": "ACTIVE", "is_compliant": True}
    response = auth_client.patch(
        f"/api/v1/gyms/{gym.id}/trainers/{trainer_profile.id}/status",
        json=status_payload,
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ACTIVE"
    assert response.json()["is_compliant"] is True
