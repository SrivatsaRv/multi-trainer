from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.api.api_v1.deps import get_current_user
from app.db.session import get_session
from app.models.booking import Booking, BookingStatus  # noqa: F401
from app.models.trainer import Trainer, TrainerCreate, TrainerUpdate
from app.models.user import User


class ClientOnboardSchema(BaseModel):
    full_name: str
    email: str
    gym_id: int
    package_id: int
    start_time: Optional[datetime] = None


router = APIRouter()


@router.get("/", response_model=List[Trainer])
def read_trainers(
    session: Session = Depends(get_session),
    skip: int = 0,
    limit: int = 100,
):
    trainers = session.exec(select(Trainer).offset(skip).limit(limit)).all()
    return trainers


@router.post("/", response_model=Trainer, status_code=status.HTTP_201_CREATED)
def create_trainer(
    trainer_in: TrainerCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # Check if trainer profile exists
    existing_trainer = session.exec(
        select(Trainer).where(Trainer.user_id == current_user.id)
    ).first()
    if existing_trainer:
        # Idempotent approach: Update the existing profile with new data
        trainer_data = trainer_in.model_dump(exclude_unset=True)
        for key, value in trainer_data.items():
            setattr(existing_trainer, key, value)
        session.add(existing_trainer)
        session.commit()
        session.refresh(existing_trainer)
        return existing_trainer

    db_obj = Trainer(**trainer_in.model_dump(), user_id=current_user.id)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


@router.get("/{trainer_id}", response_model=Trainer)
def read_trainer(
    trainer_id: int,
    session: Session = Depends(get_session),
):
    trainer = session.get(Trainer, trainer_id)
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    return trainer


@router.put("/{trainer_id}", response_model=Trainer)
def update_trainer(
    trainer_id: int,
    trainer_in: TrainerUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    trainer = session.get(Trainer, trainer_id)
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    if trainer.user_id != current_user.id and current_user.role != "SAAS_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")

    trainer_data = trainer_in.model_dump(exclude_unset=True)
    for key, value in trainer_data.items():
        setattr(trainer, key, value)

    session.add(trainer)
    session.commit()
    session.refresh(trainer)
    return trainer


@router.delete("/{trainer_id}", status_code=status.HTTP_200_OK)
def delete_trainer(
    trainer_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    trainer = session.get(Trainer, trainer_id)
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    if trainer.user_id != current_user.id and current_user.role != "SAAS_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    session.delete(trainer)
    session.commit()
    return {"message": "Trainer deleted"}


@router.get("/{trainer_id}/analytics", response_model=Any)
def get_trainer_analytics(
    trainer_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    trainer = session.get(Trainer, trainer_id)
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    if trainer.user_id != current_user.id and current_user.role != "SAAS_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")

    # from datetime import datetime (removed, imported at top)

    # from app.models.booking import Booking, BookingStatus (already at top)

    bookings = session.exec(
        select(Booking).where(Booking.trainer_id == trainer_id)
    ).all()

    from app.models.associations import ClientTrainer

    clients_from_assoc = session.exec(
        select(ClientTrainer.client_id).where(ClientTrainer.trainer_id == trainer_id)
    ).all()
    clients_from_bookings = [b.user_id for b in bookings if b.user_id]

    unique_clients = set(list(clients_from_assoc) + clients_from_bookings)

    completed = [b for b in bookings if b.status == BookingStatus.COMPLETED]
    upcoming = [b for b in bookings if b.status == BookingStatus.SCHEDULED]

    # Simple earnings logic: 500 INR per completed session
    earnings = len(completed) * 500

    # Chart Data: Group by Month
    chart_data = {}
    for b in completed:
        month_key = b.start_time.strftime("%b %Y")
        chart_data[month_key] = chart_data.get(month_key, 0) + 1

    # Convert to list and sort?
    # For demo simpler to just return list.
    # To sort chronologically, we might need original date.
    # Group by (Year, Month) tuple first.
    grouped = {}
    for b in completed:
        key = (b.start_time.year, b.start_time.month)
        grouped[key] = grouped.get(key, 0) + 1

    sorted_keys = sorted(grouped.keys())
    chart_list = []
    from calendar import month_abbr

    for y, m in sorted_keys:
        chart_list.append({"name": f"{month_abbr[m]} {y}", "sessions": grouped[(y, m)]})

    return {
        "completed_sessions": len(completed),
        "upcoming_sessions": len(upcoming),
        "active_clients": len(unique_clients),
        "total_earnings": earnings,
        "chart_data": chart_list,
    }


@router.get("/{trainer_id}/gyms", response_model=List[Any])
def read_trainer_gyms(
    trainer_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    trainer = session.get(Trainer, trainer_id)
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    if trainer.user_id != current_user.id and current_user.role != "SAAS_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")

    from app.models.associations import GymTrainer
    from app.models.gym import Gym

    links = session.exec(
        select(GymTrainer).where(GymTrainer.trainer_id == trainer_id)
    ).all()

    results = []
    for link in links:
        gym = session.get(Gym, link.gym_id)
        if gym:
            results.append(
                {
                    "gym": gym,  # Gym model is safe to return fully for now
                    "status": link.status,
                    "updated_at": link.updated_at,
                }
            )
    return results


@router.post("/{trainer_id}/gyms", status_code=status.HTTP_201_CREATED)
def apply_to_gym(
    trainer_id: int,
    gym_id: int,  # Payload could be just gym_id or an object
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # Dynamic import
    from app.models.associations import AssociationStatus, GymTrainer
    from app.models.gym import Gym

    trainer = session.get(Trainer, trainer_id)
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    if trainer.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    gym = session.get(Gym, gym_id)
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")

    # Check existing
    existing = session.exec(
        select(GymTrainer).where(
            GymTrainer.gym_id == gym_id, GymTrainer.trainer_id == trainer_id
        )
    ).first()

    if existing:
        return {"message": "Already associated or applied", "status": existing.status}

    new_link = GymTrainer(
        gym_id=gym_id,
        trainer_id=trainer_id,
        status=AssociationStatus.PENDING,
    )
    session.add(new_link)
    session.commit()
    return {"message": "Application sent to gym"}


@router.get("/{trainer_id}/bookings", response_model=List[Any])
def read_trainer_bookings(
    trainer_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    trainer = session.get(Trainer, trainer_id)
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    if trainer.user_id != current_user.id and current_user.role != "SAAS_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")

    from app.models.booking import Booking
    from app.models.gym import Gym
    from app.models.user import User as UserModel

    # Aliases for clarity (though not strictly needed if models are distinct)
    # Join Booking -> Gym
    # Join Booking -> User (Client)
    bookings = session.exec(
        select(Booking, Gym, UserModel)
        .join(Gym, Booking.gym_id == Gym.id)
        .join(UserModel, Booking.user_id == UserModel.id)
        .where(Booking.trainer_id == trainer_id)
        .order_by(Booking.start_time.asc())
        .limit(100)
    ).all()

    # Get active subscriptions for these clients to show usage (e.g. 7/12)
    # Optimization: Fetch all active subs for these users
    from app.models.subscription import ClientSubscription, SubscriptionStatus

    user_ids = [b.user_id for b, g, u in bookings if b.user_id]
    subs = session.exec(
        select(ClientSubscription).where(
            ClientSubscription.user_id.in_(user_ids),
            ClientSubscription.status == SubscriptionStatus.ACTIVE,
        )
    ).all()
    sub_map = {s.user_id: s for s in subs}

    results = []
    for booking, gym, client in bookings:
        sub = sub_map.get(client.id)
        session_info = f"{sub.sessions_used}/{sub.total_sessions}" if sub else "N/A"

        results.append(
            {
                "id": booking.id,
                "start_time": booking.start_time,
                "end_time": booking.end_time,
                "status": booking.status,
                "workout_focus": booking.workout_focus or "General",
                "session_count": session_info,
                "gym": {"name": gym.name, "location": gym.location},
                "client": {
                    "id": client.id,
                    "name": client.full_name,
                    "email": client.email,
                },
                "notes": booking.notes,
            }
        )
    return results


@router.get("/{trainer_id}/sessions/{session_id}", response_model=Any)
def read_trainer_session_detail(
    trainer_id: int,
    session_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    trainer = session.get(Trainer, trainer_id)
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    if trainer.user_id != current_user.id and current_user.role != "SAAS_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")

    from app.models.booking import Booking
    from app.models.gym import Gym
    from app.models.user import User as UserModel
    from app.models.workout import Exercise, WorkoutSessionExercise

    # Fetch booking with Gym and Client
    result = session.exec(
        select(Booking, Gym, UserModel)
        .join(Gym, Booking.gym_id == Gym.id)
        .join(UserModel, Booking.user_id == UserModel.id)
        .where(Booking.id == session_id)
        .where(Booking.trainer_id == trainer_id)
    ).first()

    if not result:
        raise HTTPException(status_code=404, detail="Session not found")

    booking, gym, client = result

    # Fetch exercises
    exercises = session.exec(
        select(WorkoutSessionExercise, Exercise)
        .join(Exercise, WorkoutSessionExercise.exercise_id == Exercise.id)
        .where(WorkoutSessionExercise.booking_id == session_id)
    ).all()

    from app.models.workout import WorkoutSet

    formatted_exercises = []
    for workout_exercise, exercise_def in exercises:
        # Fetch detailed sets
        sets = session.exec(
            select(WorkoutSet)
            .where(WorkoutSet.session_exercise_id == workout_exercise.id)
            .order_by(WorkoutSet.set_number.asc())
        ).all()

        formatted_exercises.append(
            {
                "id": workout_exercise.id,
                "exercise_id": exercise_def.id,
                "name": exercise_def.name,
                "unit_type": exercise_def.unit_type,
                "sets": workout_exercise.sets,
                "reps": workout_exercise.reps,
                "weight_kg": workout_exercise.weight_kg,
                "notes": workout_exercise.notes,
                "sets_data": sets,
            }
        )

    return {
        "id": booking.id,
        "start_time": booking.start_time,
        "end_time": booking.end_time,
        "status": booking.status,
        "notes": booking.notes,
        "gym": {"name": gym.name, "location": gym.location, "id": gym.id},
        "client": {
            "id": client.id,
            "name": client.full_name,
            "email": client.email,
            "photo_url": getattr(client, "photo_url", None),  # Safe access
        },
        "exercises": formatted_exercises,
    }


@router.patch("/{trainer_id}/sessions/{session_id}/status", response_model=Any)
def update_session_status(
    trainer_id: int,
    session_id: int,
    status_update: dict,  # expect {"status": "COMPLETED" | "NO_SHOW"}
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    trainer = session.get(Trainer, trainer_id)
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    if trainer.user_id != current_user.id and current_user.role != "SAAS_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")

    # from app.models.booking import Booking, BookingStatus (removed)

    booking = session.get(Booking, session_id)
    if not booking or booking.trainer_id != trainer_id:
        raise HTTPException(status_code=404, detail="Session not found")

    new_status = status_update.get("status")
    if new_status:
        booking.status = new_status
        session.add(booking)
        session.commit()
        session.refresh(booking)

    return booking


@router.get("/{trainer_id}/exercises/{exercise_id}/history", response_model=List[Any])
def read_exercise_history(
    trainer_id: int,
    exercise_id: int,
    client_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    trainer = session.get(Trainer, trainer_id)
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    if trainer.user_id != current_user.id and current_user.role != "SAAS_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")

    # from app.models.booking import Booking, BookingStatus (already at top)
    from app.models.workout import WorkoutSessionExercise

    # Query: Get all completed sessions for this client containing this exercise
    results = session.exec(
        select(
            Booking.start_time,
            WorkoutSessionExercise.weight_kg,
            WorkoutSessionExercise.reps,
            WorkoutSessionExercise.sets,
            WorkoutSessionExercise.notes,
            WorkoutSessionExercise.duration_seconds,
            WorkoutSessionExercise.distance_meters,
        )
        .join(WorkoutSessionExercise, Booking.id == WorkoutSessionExercise.booking_id)
        .where(
            Booking.user_id == client_id,
            WorkoutSessionExercise.exercise_id == exercise_id,
            Booking.status == BookingStatus.COMPLETED,
        )
        .order_by(Booking.start_time.asc())
    ).all()

    history = []
    for date, weight, reps, sets, notes, duration, distance in results:
        # Calculate Volume / 1RM
        one_rm = 0
        if weight and reps:
            # Epley Formula: 1RM = Weight * (1 + Reps/30)
            one_rm = weight * (1 + reps / 30)

        history.append(
            {
                "date": date,
                "weight_kg": weight,
                "reps": reps,
                "sets": sets,
                "estimated_1rm": one_rm,
                "duration_seconds": duration,
                "distance_meters": distance,
                "notes": notes,
            }
        )

    return history


@router.get("/{trainer_id}/clients", response_model=List[Any])
def read_trainer_clients(
    trainer_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    trainer = session.get(Trainer, trainer_id)
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    if trainer.user_id != current_user.id and current_user.role != "SAAS_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")

    from sqlalchemy import func

    from app.models.associations import ClientTrainer
    from app.models.booking import Booking
    from app.models.subscription import ClientSubscription, SubscriptionStatus
    from app.models.user import User as UserModel

    # 1. Get all unique users associated with this trainer
    # (via ClientTrainer or Booking). This ensures onboarded
    # clients show up even before their first booking.
    client_ids_from_assoc = session.exec(
        select(ClientTrainer.client_id).where(ClientTrainer.trainer_id == trainer_id)
    ).all()
    client_ids_from_bookings = session.exec(
        select(Booking.user_id).where(Booking.trainer_id == trainer_id)
    ).all()

    all_client_ids = list(set(client_ids_from_assoc + client_ids_from_bookings))
    clients = session.exec(
        select(UserModel).where(UserModel.id.in_(all_client_ids))
    ).all()

    # 2. Fetch their subscriptions
    client_ids = [c.id for c in clients]
    subs = session.exec(
        select(ClientSubscription).where(
            ClientSubscription.user_id.in_(client_ids),
            ClientSubscription.status == SubscriptionStatus.ACTIVE,
        )
    ).all()
    sub_map = {s.user_id: s for s in subs}

    # 3. Get last session date per client
    # This might be heavy, but strictly required for UI
    last_sessions = session.exec(
        select(Booking.user_id, func.max(Booking.start_time))
        .where(Booking.trainer_id == trainer_id)
        .group_by(Booking.user_id)
    ).all()
    last_session_map = {uid: dt for uid, dt in last_sessions}

    results = []
    for c in clients:
        sub = sub_map.get(c.id)
        results.append(
            {
                "id": c.id,
                "name": c.full_name,
                "email": c.email,
                "photo_url": getattr(c, "photo_url", None),
                "subscription_status": (
                    sub.status if sub else "EXPIRED"
                ),  # Simplification
                "sessions_remaining": (
                    sub.total_sessions - sub.sessions_used if sub else 0
                ),
                "last_session": last_session_map.get(c.id),
            }
        )
    return results


@router.get("/{trainer_id}/clients/{client_id}", response_model=Any)
def read_trainer_client(
    trainer_id: int,
    client_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    trainer = session.get(Trainer, trainer_id)
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    if trainer.user_id != current_user.id and current_user.role != "SAAS_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")

    from app.models.associations import ClientTrainer
    from app.models.subscription import ClientSubscription, SubscriptionStatus
    from app.models.user import User as UserModel

    # Verify association exists
    assoc = session.exec(
        select(ClientTrainer).where(
            ClientTrainer.trainer_id == trainer_id, ClientTrainer.client_id == client_id
        )
    ).first()

    client = session.get(UserModel, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    sub = session.exec(
        select(ClientSubscription).where(
            ClientSubscription.user_id == client_id,
            ClientSubscription.status == SubscriptionStatus.ACTIVE,
        )
    ).first()

    return {
        "id": client.id,
        "name": client.full_name,
        "email": client.email,
        "photo_url": getattr(client, "photo_url", None),
        "subscription": (
            {
                "status": sub.status if sub else "EXPIRED",
                "sessions_remaining": (
                    (sub.total_sessions - sub.sessions_used) if sub else 0
                ),
                "total_sessions": sub.total_sessions if sub else 0,
                "expiry_date": sub.expiry_date if sub else None,
            }
            if sub
            else None
        ),
        "is_associated": assoc is not None,
    }


@router.get("/{trainer_id}/clients/{client_id}/analytics/overview", response_model=Any)
def read_trainer_client_analytics(
    trainer_id: int,
    client_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    trainer = session.get(Trainer, trainer_id)
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    if trainer.user_id != current_user.id and current_user.role != "SAAS_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")

    from sqlalchemy import func

    # from app.models.booking import Booking, BookingStatus (already at top)
    from app.models.workout import Exercise, WorkoutSessionExercise

    # 1. Total Sessions
    total_sessions = session.exec(
        select(func.count(Booking.id)).where(
            Booking.user_id == client_id,
            Booking.trainer_id == trainer_id,
            Booking.status == BookingStatus.COMPLETED,
        )
    ).one()

    # 2. Top Exercises
    top_exercises = session.exec(
        select(Exercise.name, func.count(WorkoutSessionExercise.id).label("count"))
        .join(WorkoutSessionExercise, Exercise.id == WorkoutSessionExercise.exercise_id)
        .join(Booking, WorkoutSessionExercise.booking_id == Booking.id)
        .where(Booking.user_id == client_id, Booking.status == BookingStatus.COMPLETED)
        .group_by(Exercise.name)
        .order_by(func.count(WorkoutSessionExercise.id).desc())
        .limit(5)
    ).all()

    # 3. Volume Trend (Weight * Reps * Sets)
    volume_results = session.exec(
        select(
            Booking.start_time,
            func.sum(
                WorkoutSessionExercise.weight_kg
                * WorkoutSessionExercise.reps
                * WorkoutSessionExercise.sets
            ),
        )
        .join(WorkoutSessionExercise, Booking.id == WorkoutSessionExercise.booking_id)
        .where(Booking.user_id == client_id, Booking.status == BookingStatus.COMPLETED)
        .group_by(Booking.start_time)
        .order_by(Booking.start_time.asc())
    ).all()

    volume_trend = [{"date": dt, "volume": vol} for dt, vol in volume_results]

    return {
        "total_sessions": total_sessions,
        "top_exercises": [
            {"name": name, "count": count} for name, count in top_exercises
        ],
        "volume_trend": volume_trend,
    }


@router.post("/{trainer_id}/clients/onboard", status_code=status.HTTP_201_CREATED)
def onboard_client(
    trainer_id: int,
    payload: ClientOnboardSchema,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    trainer = session.get(Trainer, trainer_id)
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    if trainer.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    from app.core.security import get_password_hash
    from app.models.booking import SessionPackage
    from app.models.subscription import ClientSubscription, SubscriptionStatus
    from app.models.user import User as UserModel
    from app.models.user import UserRole

    # 1. Check/Create User
    client = session.exec(
        select(UserModel).where(UserModel.email == payload.email)
    ).first()
    if not client:
        # Create new client user
        client = UserModel(
            email=payload.email,
            full_name=payload.full_name,
            hashed_password=get_password_hash("changeme123"),  # Default password
            role=UserRole.CLIENT,
            is_active=True,
        )
        session.add(client)
        session.commit()
        session.refresh(client)

    # 2. Verify Package and Gym Ownership
    package = session.get(SessionPackage, payload.package_id)
    if not package or package.gym_id != payload.gym_id:
        raise HTTPException(status_code=400, detail="Invalid package for selected gym")

    # 2.1 Verify Trainer is associated with this gym
    from app.models.associations import AssociationStatus, GymTrainer

    assoc_check = session.exec(
        select(GymTrainer).where(
            GymTrainer.gym_id == payload.gym_id,
            GymTrainer.trainer_id == trainer_id,
            GymTrainer.status == AssociationStatus.ACTIVE,
        )
    ).first()

    if not assoc_check:
        raise HTTPException(
            status_code=403, detail="Trainer is not actively associated with this gym"
        )

    # 3. Create Subscription
    from datetime import datetime, timedelta

    # Check if active subscription exists? Maybe purely additive for now.
    sub = ClientSubscription(
        user_id=client.id,
        gym_id=payload.gym_id,
        session_package_id=package.id,
        total_sessions=package.session_count,
        sessions_used=0,
        start_date=datetime.now(),
        expiry_date=datetime.now() + timedelta(days=90),  # Default 3 months
        status=SubscriptionStatus.ACTIVE,
    )
    session.add(sub)

    # 3.1 Create Client-Trainer Association
    from app.models.associations import AssociationStatus, ClientTrainer

    existing_assoc = session.exec(
        select(ClientTrainer).where(
            ClientTrainer.client_id == client.id, ClientTrainer.trainer_id == trainer_id
        )
    ).first()

    if not existing_assoc:
        assoc = ClientTrainer(
            client_id=client.id, trainer_id=trainer_id, status=AssociationStatus.ACTIVE
        )
        session.add(assoc)

    session.commit()

    # 4. Create First Booking (Optional)
    booking = None
    if payload.start_time:
        # from app.models.booking import Booking, BookingStatus (removed)
        from app.services.booking_service import BookingService

        # Assuming BookingService is available to import
        try:
            booking = BookingService.create_booking(
                session=session,
                user=client,
                trainer_id=trainer_id,
                start_time=payload.start_time,
                notes="First Session (Onboarding)",
            )
            booking.gym_id = payload.gym_id  # Ensure gym match
            session.add(booking)
            session.commit()
        except Exception as e:
            # If booking fails, we still return success for onboarding but warn?
            # Or fail whole transaction? Ideally fail whole transaction.
            # For MVP, let's swallow and return warning or raise HTTP
            raise HTTPException(
                status_code=400,
                detail=f"Onboarding successful but booking failed: {str(e)}",
            )

    return {
        "message": "Client onboarded successfully",
        "client_id": client.id,
        "subscription_id": sub.id,
    }
