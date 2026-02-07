from datetime import datetime

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.gym import Gym
from app.models.subscription import ClientSubscription, SubscriptionStatus
from app.models.user import User


def test_create_subscription(
    auth_client: TestClient, session: Session, test_user: User
):
    # Seed Gym
    gym = Gym(
        name="Sub Gym",
        slug="sub-gym",
        location="Loc",
        verification_status="APPROVED",
        admin_id=test_user.id,
    )
    session.add(gym)
    session.commit()
    session.refresh(gym)

    # Create Sub manually (logic test)
    sub = ClientSubscription(
        user_id=test_user.id,
        gym_id=gym.id,
        total_sessions=10,
        sessions_used=0,
        start_date=datetime.now(),
        expiry_date=datetime.now(),
        status=SubscriptionStatus.ACTIVE,
    )
    session.add(sub)
    session.commit()
    session.refresh(sub)

    assert sub.id is not None
    assert sub.status == SubscriptionStatus.ACTIVE
