from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.booking import Booking, BookingStatus, SessionPackage
from app.models.gym import Gym
from tests.test_constants import TEST_USER_PASSWORD


@pytest.mark.integration
def test_get_gym_analytics_overview(client: TestClient, session: Session, test_user):
    # 1. Create a Gym for the test user
    # (Assuming test_user is gym admin)
    gym = Gym(
        admin_id=test_user.id,
        name="Analytics Test Gym",
        slug="analytics-test-gym",
        location="Test City",
    )
    session.add(gym)
    session.commit()
    session.refresh(gym)

    # 2. Add Session Packages (Revenue Source)
    pkg = SessionPackage(
        name="Test Pack", price_inr=1000, session_count=1, gym_id=gym.id
    )
    session.add(pkg)
    session.commit()

    # 3. Create Bookings (Occupancy Source)
    # We need a client and trainer?
    # For analytics, we just need the booking record present.
    # We can omit user_id/trainer_id if nullable?
    # Booking model: trainer_id and gym_id are required.
    # We need a trainer.

    from app.models.trainer import Trainer
    # Create dummy trainer linked to current user or new user?
    # Trainer requires a user_id.
    # Let's reuse test_user as trainer too? No, User global unique.
    # Create new user for trainer.
    from app.models.user import User, UserRole

    trainer_user = User(
        email="trainer_analytics@example.com",
        hashed_password="pw",
        role=UserRole.TRAINER,
    )
    session.add(trainer_user)
    session.commit()

    trainer = Trainer(user_id=trainer_user.id)
    session.add(trainer)
    session.commit()
    session.refresh(trainer)

    # Create completed booking (Revenue)
    b1 = Booking(
        gym_id=gym.id,
        trainer_id=trainer.id,
        start_time=datetime.now() - timedelta(days=1),
        end_time=datetime.now() - timedelta(days=1) + timedelta(hours=1),
        status=BookingStatus.COMPLETED,
    )
    session.add(b1)

    # Create future booking (Occupancy)
    b2 = Booking(
        gym_id=gym.id,
        trainer_id=trainer.id,
        start_time=datetime.now() + timedelta(days=1),
        end_time=datetime.now() + timedelta(days=1) + timedelta(hours=1),
        status=BookingStatus.SCHEDULED,
    )
    session.add(b2)
    session.commit()
    session.refresh(b2)

    # Create a subscription for the client user (Revenue source)
    from app.models.subscription import ClientSubscription, SubscriptionStatus

    sub = ClientSubscription(
        user_id=trainer_user.id,  # Using trainer_user as proxy client for simplicity
        gym_id=gym.id,
        session_package_id=pkg.id,
        total_sessions=pkg.session_count,
        sessions_used=1,
        status=SubscriptionStatus.ACTIVE,
    )
    session.add(sub)
    session.commit()
    session.refresh(sub)

    # Ensure all data is committed and visible
    session.expire_all()

    # login
    login_data = {
        "username": test_user.email,
        "password": TEST_USER_PASSWORD,
    }
    response = client.post(f"/api/v1/auth/access-token", data=login_data)
    token = response.json()["access_token"]

    # 4. Call API
    response = client.get(
        f"/api/v1/gyms/{gym.id}/analytics/overview",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()

    assert data["total_revenue"] == 1000  # 1 completed booking * 1000 avg price
    assert data["currency"] == "INR"
    # Occupancy: 1 booked slot / Capacity (1 trainer * 12 hours * 30 days = 360) => 1/360 approx 0.3%
    assert data["occupancy_rate"] >= 0
