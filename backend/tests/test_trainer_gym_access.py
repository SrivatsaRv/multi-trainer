from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.main import app
from app.models.gym import Gym
from app.models.trainer import Trainer
from app.models.user import User


def test_gym_admin_can_read_trainer_gyms(
    client: TestClient, session: Session, token_headers: dict, trainer_user: User
):
    # Ensure trainer exists
    trainer = session.exec(
        select(Trainer).where(Trainer.user_id == trainer_user.id)
    ).first()
    if not trainer:
        trainer = Trainer(user_id=trainer_user.id)
        session.add(trainer)
        session.commit()
        session.refresh(trainer)

    # Try to read trainer gyms as Gym Admin (token_headers is GYM_ADMIN by default in conftest)
    response = client.get(
        f"/api/v1/trainers/{trainer.id}/gyms",
        headers=token_headers,
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_unauthorized_user_cannot_read_trainer_gyms(
    client: TestClient,
    session: Session,
    trainer_user_token_headers: dict,
    trainer_user: User,
):
    # Create another trainer
    other_user = User(
        email="other@example.com",
        full_name="Other Trainer",
        hashed_password="hash",
        role="TRAINER",
        is_active=True,
    )
    session.add(other_user)
    session.commit()
    session.refresh(other_user)

    other_trainer = Trainer(user_id=other_user.id)
    session.add(other_trainer)
    session.commit()
    session.refresh(other_trainer)

    # trainer_user_token_headers is for trainer_user (id=1 usually)
    # They should NOT be able to read other_trainer's gyms
    response = client.get(
        f"/api/v1/trainers/{other_trainer.id}/gyms",
        headers=trainer_user_token_headers,
    )
    assert response.status_code == 403
