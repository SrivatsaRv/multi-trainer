from datetime import datetime

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.booking import Booking, BookingStatus, SessionPackage
from app.models.gym import Gym
from app.models.trainer import Trainer
from app.models.user import User, UserRole
from tests.test_constants import TEST_USER_PASSWORD
import pytest


@pytest.mark.integration
def test_get_gym_bookings(client: TestClient, session: Session, test_user):
    # 1. Setup Data
    # Gym
    gym = Gym(
        admin_id=test_user.id,
        name="Booking Test Gym",
        slug="booking-test",
        location="Remote",
    )
    session.add(gym)
    session.commit()
    session.refresh(gym)

    # Trainer
    trainer_user = User(
        email="trainerB@example.com",
        hashed_password="pw",
        full_name="Trainer B",
        role=UserRole.TRAINER,
    )
    session.add(trainer_user)
    session.commit()  # commit to get ID

    trainer = Trainer(user_id=trainer_user.id)
    session.add(trainer)
    session.commit()

    # Client
    client_user = User(
        email="clientB@example.com",
        hashed_password="pw",
        full_name="Client B",
        role=UserRole.CLIENT,
    )
    session.add(client_user)
    session.commit()

    # Booking
    booking = Booking(
        gym_id=gym.id,
        trainer_id=trainer.id,
        user_id=client_user.id,
        start_time=datetime.now(),
        end_time=datetime.now(),
        status=BookingStatus.SCHEDULED,
    )
    session.add(booking)
    session.commit()

    # 2. Login
    login_data = {
        "username": test_user.email,
        "password": TEST_USER_PASSWORD,
    }
    response = client.post(f"/api/v1/auth/access-token", data=login_data)
    token = response.json()["access_token"]

    # 3. Test API
    response = client.get(
        f"/api/v1/gyms/{gym.id}/bookings", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["client"]["name"] == "Client B"
    assert data[0]["trainer"]["name"] == "Trainer B"
    assert data[0]["status"] == "SCHEDULED"
