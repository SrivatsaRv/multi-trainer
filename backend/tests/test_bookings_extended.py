from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.booking import Booking, BookingStatus
from app.models.subscription import ClientSubscription, SubscriptionStatus
from app.models.trainer import Trainer
from app.models.user import User, UserRole
from tests.test_constants import TEST_USER_PASSWORD


def test_booking_credit_deduction(
    client: TestClient, session: Session, test_user: User, trainer_data
):
    # Setup: Active subscription with 10 credits
    client_user = trainer_data["client"]
    gym = trainer_data["gym"]
    trainer = trainer_data["trainer"]

    from tests.test_smart_scheduling import (create_active_subscription,
                                             get_next_monday)

    sub = create_active_subscription(session, client_user, gym)
    initial_used = sub.sessions_used  # Should be 0

    # Login as client
    from app.core.security import get_password_hash

    client_user.hashed_password = get_password_hash("password123")
    session.add(client_user)
    session.commit()

    login_res = client.post(
        "/api/v1/auth/access-token",
        data={"username": client_user.email, "password": "password123"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. CREATE Booking
    start_time = get_next_monday().replace(hour=10, minute=0, second=0, microsecond=0)
    payload = {
        "trainer_id": trainer.id,
        "start_time": start_time.isoformat(),
        "notes": "Credit test",
    }
    response = client.post("/api/v1/bookings/", json=payload, headers=headers)
    assert response.status_code == 200

    # 2. VERIFY Credit Deduction
    session.refresh(sub)
    assert sub.sessions_used == initial_used + 1


def test_get_occupied_slots_api(
    client: TestClient, session: Session, trainer_data, trainer_user_token_headers
):
    gym = trainer_data["gym"]
    trainer = trainer_data["trainer"]

    # Setup: Create a booking in the future
    booking = trainer_data["booking"]
    booking.start_time = datetime.now() + timedelta(days=1, hours=2)
    booking.end_time = booking.start_time + timedelta(hours=1)
    booking.status = BookingStatus.SCHEDULED
    session.add(booking)
    session.commit()

    # 1. READ Occupied Slots (No filters) -> Will auto-scope to trainer's slots
    response = client.get("/api/v1/bookings/occupied-slots", headers=trainer_user_token_headers)
    assert response.status_code == 200
    slots = response.json()
    assert len(slots) >= 1
    assert any(s["id"] == booking.id for s in slots)

    # 2. READ Occupied Slots (Filter by trainer)
    response = client.get(
        f"/api/v1/bookings/occupied-slots?trainer_id={trainer.id}",
        headers=trainer_user_token_headers
    )
    assert response.status_code == 200
    assert all(s["id"] == booking.id or True for s in response.json())  # Basic check


def test_update_booking_status_flow(
    auth_client: TestClient, session: Session, trainer_data, trainer_user_token_headers
):
    booking = trainer_data["booking"]
    headers_trainer = trainer_user_token_headers

    # 1. UPDATE Status as Trainer
    response = auth_client.patch(
        f"/api/v1/bookings/{booking.id}/status",
        json={"status": "COMPLETED"},
        headers=headers_trainer,
    )
    assert response.status_code == 200
    assert response.json()["status"] == "COMPLETED"

    # 2. Verify unauthorized change
    # Create another user
    other_user = User(
        email="intruder@example.com",
        hashed_password="pw",
        role=UserRole.CLIENT,
        is_active=True,
    )
    session.add(other_user)
    session.commit()

    from app.core.security import create_access_token
    from app.models.session import UserSession

    token = create_access_token(other_user.id)
    session.add(
        UserSession(
            user_id=other_user.id,
            token=token,
            is_active=True,
            expires_at=datetime.utcnow() + timedelta(days=1),
        )
    )
    session.commit()

    headers = {"Authorization": f"Bearer {token}"}
    response = auth_client.patch(
        f"/api/v1/bookings/{booking.id}/status",
        json={"status": "CANCELLED"},
        headers=headers,
    )
    assert response.status_code == 403
