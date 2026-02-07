from datetime import datetime, timedelta

import pytest
from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.booking import Booking, BookingStatus, SessionPackage
from app.models.subscription import ClientSubscription, SubscriptionStatus
from app.models.trainer import Trainer
from app.models.user import User, UserRole
from app.services.booking_service import BookingService


def create_active_subscription(session, user, gym):
    # Create Package if not exists
    pkg = session.exec(
        select(SessionPackage).where(SessionPackage.name == "Test Package")
    ).first()
    if not pkg:
        pkg = SessionPackage(
            gym_id=gym.id, name="Test Package", session_count=10, price_inr=1000
        )
        session.add(pkg)
        session.commit()

    sub = ClientSubscription(
        user_id=user.id,
        gym_id=gym.id,
        session_package_id=pkg.id,
        total_sessions=10,
        sessions_used=0,
        start_date=datetime.now(),
        expiry_date=datetime.now() + timedelta(days=30),
        status=SubscriptionStatus.ACTIVE,
    )
    session.add(sub)
    session.commit()
    return sub


def get_next_monday():
    today = datetime.now()
    days_ahead = 0 - today.weekday()  # Monday is 0
    if days_ahead <= 0:  # Target day already happened this week or is today
        days_ahead += 7
    return today + timedelta(days=days_ahead)


def test_booking_conflict_detection(session: Session, trainer_data):
    """
    Test that creating a booking in an occupied slot raises an error.
    """
    trainer = trainer_data["trainer"]
    client_user = trainer_data["client"]
    gym = trainer_data["gym"]

    create_active_subscription(session, client_user, gym)

    # 1. Create first booking
    # Trainer is available on Mondays 09:00-17:00
    base_time = get_next_monday().replace(hour=10, minute=0, second=0, microsecond=0)
    start_time = base_time

    booking1 = BookingService.create_booking(
        session=session,
        user=client_user,
        trainer_id=trainer.id,
        start_time=start_time,
        notes="First Booking",
    )
    booking1.gym_id = gym.id
    session.add(booking1)
    session.commit()

    # 2. Try to create second booking at same time
    # Create another client
    client2 = User(
        email="client2@example.com",
        full_name="Client Two",
        hashed_password="pw",
        role=UserRole.CLIENT,
    )
    session.add(client2)
    session.commit()
    session.refresh(client2)

    create_active_subscription(session, client2, gym)

    with pytest.raises(HTTPException) as excinfo:
        BookingService.create_booking(
            session=session,
            user=client2,
            trainer_id=trainer.id,
            start_time=start_time,
            notes="Conflict Booking",
        )

    assert excinfo.value.status_code == 400
    assert "Time slot not available" in excinfo.value.detail


def test_booking_overlap_detection(session: Session, trainer_data):
    """
    Test that overlapping bookings are detected.
    Existing: 10:00 - 11:00
    New: 10:30 - 11:30
    """
    trainer = trainer_data["trainer"]
    client_user = trainer_data["client"]
    gym = trainer_data["gym"]

    create_active_subscription(session, client_user, gym)

    start_time = get_next_monday().replace(hour=10, minute=0, second=0, microsecond=0)

    booking1 = BookingService.create_booking(
        session=session,
        user=client_user,
        trainer_id=trainer.id,
        start_time=start_time,
        notes="First Booking",
    )
    booking1.gym_id = gym.id
    session.add(booking1)
    session.commit()

    # Create another client
    client2 = User(
        email="client3@example.com",
        full_name="Client Three",
        hashed_password="pw",
        role=UserRole.CLIENT,
    )
    session.add(client2)
    session.commit()

    create_active_subscription(session, client2, gym)

    # Try overlapping start
    overlap_time = start_time + timedelta(minutes=30)

    with pytest.raises(HTTPException) as excinfo:
        BookingService.create_booking(
            session=session,
            user=client2,
            trainer_id=trainer.id,
            start_time=overlap_time,
            notes="Overlap Booking",
        )

    assert excinfo.value.status_code == 400
    assert "Time slot not available" in excinfo.value.detail


def test_trainer_double_booking_protection(session: Session, trainer_data):
    """
    Ensure the same trainer cannot be booked twice even if different gyms (if applicable) or same gym.
    """
    trainer = trainer_data["trainer"]
    client_user = trainer_data["client"]
    gym = trainer_data["gym"]

    create_active_subscription(session, client_user, gym)

    # Use 14:00 on Monday (Available is 09:00-17:00)
    start_time = get_next_monday().replace(hour=14, minute=0, second=0, microsecond=0)

    # Booking 1
    BookingService.create_booking(
        session=session,
        user=client_user,
        trainer_id=trainer.id,
        start_time=start_time,
        notes="Base",
    )

    # Booking 2 (Same trainer, same time, potentially different client)
    client2 = User(
        email="client4@example.com",
        full_name="Client Four",
        hashed_password="pw",
        role=UserRole.CLIENT,
    )
    session.add(client2)
    session.commit()

    with pytest.raises(HTTPException):
        BookingService.create_booking(
            session=session,
            user=client2,
            trainer_id=trainer.id,
            start_time=start_time,
            notes="Double Book",
        )
