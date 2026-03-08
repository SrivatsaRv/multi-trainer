import pytest
from sqlmodel import Session, select

from app.models.booking import Booking, BookingStatus
from app.models.subscription import ClientSubscription, SubscriptionStatus
from app.models.user import User, UserRole
from app.services.booking_service import BookingService


def test_no_show_deducts_credit(session: Session, trainer_data):
    # Setup
    client_user = trainer_data["client"]
    gym = trainer_data["gym"]
    booking = trainer_data["booking"]
    trainer = trainer_data["trainer"]

    from tests.test_smart_scheduling import create_active_subscription

    sub = create_active_subscription(session, client_user, gym)
    # Booking creation logic in conftest/trainer_data already deducts credit?
    # Let's check BookingService.create_booking.
    # Actually, let's manually set it to ensure consistency in test.
    sub.sessions_used = 1
    booking.status = BookingStatus.SCHEDULED
    session.add(sub)
    session.add(booking)
    session.commit()

    # Transition to NO_SHOW
    trainer_user = session.get(User, trainer.user_id)

    updated = BookingService.update_booking_status(
        session=session,
        booking_id=booking.id,
        new_status=BookingStatus.NO_SHOW,
        user=trainer_user,
    )

    assert updated.status == BookingStatus.NO_SHOW
    session.refresh(sub)
    # It should stay deducted (1), as NO_SHOW counts as a used session.
    assert sub.sessions_used == 1


def test_cancelled_refunds_credit(session: Session, trainer_data):
    # Setup
    client_user = trainer_data["client"]
    gym = trainer_data["gym"]
    booking = trainer_data["booking"]
    trainer = trainer_data["trainer"]

    from tests.test_smart_scheduling import create_active_subscription

    sub = create_active_subscription(session, client_user, gym)
    sub.sessions_used = 1
    booking.status = BookingStatus.SCHEDULED
    session.add(sub)
    session.add(booking)
    session.commit()

    trainer_user = session.get(User, trainer.user_id)

    # Transition to CANCELLED
    updated = BookingService.update_booking_status(
        session=session,
        booking_id=booking.id,
        new_status=BookingStatus.CANCELLED,
        user=trainer_user,
    )

    assert updated.status == BookingStatus.CANCELLED
    session.refresh(sub)
    # Should be refunded (0)
    assert sub.sessions_used == 0


def test_attended_keeps_credit_deducted(session: Session, trainer_data):
    # Setup
    client_user = trainer_data["client"]
    gym = trainer_data["gym"]
    booking = trainer_data["booking"]
    trainer = trainer_data["trainer"]

    from tests.test_smart_scheduling import create_active_subscription

    sub = create_active_subscription(session, client_user, gym)
    sub.sessions_used = 1
    booking.status = BookingStatus.SCHEDULED
    session.add(sub)
    session.add(booking)
    session.commit()

    trainer_user = session.get(User, trainer.user_id)

    # Transition to ATTENDED
    updated = BookingService.update_booking_status(
        session=session,
        booking_id=booking.id,
        new_status=BookingStatus.ATTENDED,
        user=trainer_user,
    )

    assert updated.status == BookingStatus.ATTENDED
    session.refresh(sub)
    assert sub.sessions_used == 1


def test_cancelled_to_scheduled_rededucts_credit(session: Session, trainer_data):
    # Setup
    client_user = trainer_data["client"]
    gym = trainer_data["gym"]
    booking = trainer_data["booking"]
    trainer = trainer_data["trainer"]

    from tests.test_smart_scheduling import create_active_subscription

    sub = create_active_subscription(session, client_user, gym)
    sub.sessions_used = 0  # Currently cancelled or refunded
    booking.status = BookingStatus.CANCELLED
    session.add(sub)
    session.add(booking)
    session.commit()

    trainer_user = session.get(User, trainer.user_id)

    # Transition back to SCHEDULED
    updated = BookingService.update_booking_status(
        session=session,
        booking_id=booking.id,
        new_status=BookingStatus.SCHEDULED,
        user=trainer_user,
    )

    assert updated.status == BookingStatus.SCHEDULED
    session.refresh(sub)
    # Should be re-deducted
    assert sub.sessions_used == 1
