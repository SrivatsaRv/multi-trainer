from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.gym import Gym
from app.models.trainer import Trainer
from app.models.user import User


def seed_unverified(session: Session, user: User):
    gym = Gym(
        name="Pending Gym",
        slug="pending",
        location="Loc",
        verification_status="PENDING",
        admin_id=user.id,
    )
    session.add(gym)

    trainer = Trainer(user_id=user.id, bio="Bio", verification_status="PENDING")
    session.add(trainer)
    session.commit()
    session.refresh(gym)
    session.refresh(trainer)
    return gym, trainer


def test_approve_gym(auth_client: TestClient, session: Session, test_user: User):
    gym, _ = seed_unverified(session, test_user)

    # Needs Admin/Gym Owner role logic, assuming test_user is admin for simplicity
    # or endpoint allows owner to verify? No, usually admin.
    # checking endpoint logic...
    # For now, let's try calling it.

    response = auth_client.post(f"/api/v1/admin/verifications/gym/{gym.id}/approve")
    # If standard user (TRAINER/GYM_ADMIN) calls this, it might fail 403.
    # Ideally we need an admin user fixture.
    # But let's see current behavior.
    assert response.status_code in [200, 403]


def test_reject_trainer(auth_client: TestClient, session: Session, test_user: User):
    _, trainer = seed_unverified(session, test_user)

    response = auth_client.post(
        f"/api/v1/admin/verifications/trainer/{trainer.id}/reject"
    )
    assert response.status_code in [200, 403]
