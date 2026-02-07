import pytest
from sqlmodel import Session, select

from app.models.booking import Booking, BookingStatus
from app.models.trainer import Trainer
from app.models.user import User


def test_session_attendance_flow(
    session: Session, auth_client, trainer_user_token_headers, trainer_data
):
    # 1. Setup: Trainer & Booking from fixture
    booking = trainer_data["booking"]
    trainer = trainer_data["trainer"]

    assert booking is not None, "Need a seeded booking"

    # 2. Mark as LATE
    response = auth_client.patch(
        f"/api/v1/trainers/{trainer.id}/sessions/{booking.id}/status",
        headers=trainer_user_token_headers,
        json={"status": "LATE"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "LATE"

    # Verify DB
    session.refresh(booking)
    assert booking.status == BookingStatus.LATE

    # 3. Mark as COMPLETED
    response = auth_client.patch(
        f"/api/v1/trainers/{trainer.id}/sessions/{booking.id}/status",
        headers=trainer_user_token_headers,
        json={"status": "COMPLETED"},
    )
    assert response.status_code == 200
    session.refresh(booking)
    assert booking.status == BookingStatus.COMPLETED

    # 4. Mark as NO_SHOW
    response = auth_client.patch(
        f"/api/v1/trainers/{trainer.id}/sessions/{booking.id}/status",
        headers=trainer_user_token_headers,
        json={"status": "NO_SHOW"},
    )
    assert response.status_code == 200
    session.refresh(booking)
    assert booking.status == BookingStatus.NO_SHOW
