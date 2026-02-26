from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from app.api.api_v1.deps import get_current_user
from app.db.session import get_session
from app.models.booking import Booking, BookingStatus
from app.models.trainer import Trainer
from app.models.user import User

router = APIRouter()


@router.get("/occupied-slots", response_model=List[Any])
def get_occupied_slots(
    trainer_id: Optional[int] = None,
    gym_id: Optional[int] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get all occupied slots for a trainer or gym to show in the scheduling wizard.
    """
    from sqlmodel import select

    from app.models.booking import Booking, BookingStatus
    from app.models.user import User as UserModel

    statement = select(Booking, UserModel).join(
        UserModel, Booking.user_id == UserModel.id
    )

    if trainer_id:
        statement = statement.where(Booking.trainer_id == trainer_id)
    if gym_id:
        statement = statement.where(Booking.gym_id == gym_id)

    statement = statement.where(
        Booking.status.in_([
            BookingStatus.SCHEDULED,
            BookingStatus.COMPLETED,
            BookingStatus.PENDING,
            BookingStatus.BLOCKED
        ])
    )
    statement = statement.where(Booking.start_time >= datetime.now())

    results = session.exec(statement).all()

    return [
        {
            "id": b.id,
            "start_time": b.start_time,
            "end_time": b.end_time,
            "client_name": u.full_name,
            "status": b.status,
        }
        for b, u in results
    ]


class BookingCreate(BaseModel):
    trainer_id: int
    user_id: Optional[int] = None
    start_time: datetime
    notes: str = ""


class BookingStatusUpdate(BaseModel):
    status: BookingStatus


@router.post("/", response_model=Booking)
def create_booking(
    expiry: BookingCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new booking with strict business rule enforcement
    via BookingService.
    """
    from app.services.booking_service import BookingService

    return BookingService.create_booking(
        session=session,
        user=current_user,
        trainer_id=expiry.trainer_id,
        user_id=expiry.user_id,
        start_time=expiry.start_time,
        notes=expiry.notes,
    )


@router.patch("/{booking_id}/status")
def update_booking_status(
    booking_id: int,
    status_update: BookingStatusUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    from app.services.booking_service import BookingService

    return BookingService.update_booking_status(
        session=session,
        booking_id=booking_id,
        new_status=status_update.status,
        user=current_user,
    )


class WorkoutSetItem(BaseModel):
    set_number: int
    reps: Optional[int] = None
    weight_kg: Optional[float] = None
    rpe: Optional[float] = None
    duration_seconds: Optional[int] = None
    distance_meters: Optional[float] = None


class WorkoutLogItem(BaseModel):
    exercise_id: int
    sets: int
    sets_data: Optional[List[WorkoutSetItem]] = None
    reps: int = 0
    weight_kg: float = 0
    duration_seconds: int = 0
    distance_meters: float = 0
    notes: str = ""


@router.post("/{booking_id}/log", response_model=Any)
def log_workout(
    booking_id: int,
    logs: List[WorkoutLogItem],
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Log exercises for a booking.
    """
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Authz check: Trainer or Owner or Admin
    trainer = session.get(Trainer, booking.trainer_id)
    is_trainer = trainer and trainer.user_id == current_user.id
    is_client = booking.user_id == current_user.id
    is_admin = current_user.role == "SAAS_ADMIN"

    if not (is_trainer or is_client or is_admin):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Import here to avoid circulars if any
    from app.models.workout import WorkoutSessionExercise, WorkoutSet

    created_logs = []
    for log in logs:
        wse = WorkoutSessionExercise(
            booking_id=booking_id,
            exercise_id=log.exercise_id,
            sets=log.sets,
            reps=log.reps,
            weight_kg=log.weight_kg,
            duration_seconds=log.duration_seconds,
            distance_meters=log.distance_meters,
            notes=log.notes,
        )
        session.add(wse)
        session.flush()  # Ensure wse.id is available

        if log.sets_data:
            for s in log.sets_data:
                ws = WorkoutSet(
                    session_exercise_id=wse.id,
                    set_number=s.set_number,
                    reps=s.reps,
                    weight_kg=s.weight_kg,
                    rpe=s.rpe,
                    duration_seconds=s.duration_seconds,
                    distance_meters=s.distance_meters,
                )
                session.add(ws)

        created_logs.append(wse)

    # Auto-transition status to ATTENDED if it was SCHEDULED or PENDING
    if booking.status in [BookingStatus.SCHEDULED, BookingStatus.PENDING]:
        booking.status = BookingStatus.ATTENDED
        session.add(booking)

    session.commit()
    return {
        "message": f"Logged {len(created_logs)} exercises",
        "count": len(created_logs),
    }
