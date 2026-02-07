from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.api.api_v1.deps import get_current_user
from app.db.session import get_session
from app.models.gym import Gym, GymCreate, GymUpdate
from app.models.user import User

router = APIRouter()


@router.get("/", response_model=List[Gym])
def read_gyms(
    session: Session = Depends(get_session),
    skip: int = 0,
    limit: int = 100,
):
    gyms = session.exec(select(Gym).offset(skip).limit(limit)).all()
    return gyms


@router.post("/", response_model=Gym, status_code=status.HTTP_201_CREATED)
def create_gym(
    gym_in: GymCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # Check if user already has a gym
    existing_gym = session.exec(
        select(Gym).where(Gym.admin_id == current_user.id)
    ).first()
    if existing_gym:
        raise HTTPException(status_code=400, detail="User already has a gym profile")

    db_obj = Gym(**gym_in.model_dump(), admin_id=current_user.id)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


@router.get("/{gym_id}", response_model=Gym)
def read_gym(
    gym_id: int,
    session: Session = Depends(get_session),
):
    gym = session.get(Gym, gym_id)
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")
    return gym


@router.put("/{gym_id}", response_model=Gym)
def update_gym(
    gym_id: int,
    gym_in: GymUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    gym = session.get(Gym, gym_id)
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")
    if gym.admin_id != current_user.id and current_user.role != "SAAS_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")

    gym_data = gym_in.model_dump(exclude_unset=True)
    for key, value in gym_data.items():
        setattr(gym, key, value)

    session.add(gym)
    session.commit()
    session.refresh(gym)
    return gym


@router.delete("/{gym_id}", status_code=status.HTTP_200_OK)
def delete_gym(
    gym_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    gym = session.get(Gym, gym_id)
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")
    if gym.admin_id != current_user.id and current_user.role != "SAAS_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")

    session.delete(gym)
    session.commit()
    return {"message": "Gym deleted"}


@router.get("/{gym_id}/trainers", response_model=List[Any])
def read_gym_trainers(
    gym_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    gym = session.get(Gym, gym_id)
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")
    if gym.admin_id != current_user.id and current_user.role != "SAAS_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to view this gym")

    # Return trainers with status
    # This involves a join or manually fetching the link objects
    # For MVP, simpler to just fetch the link objects and the trainer details
    from app.models.associations import GymTrainer
    from app.models.trainer import Trainer

    # Select GymTrainer links for this gym
    links = session.exec(select(GymTrainer).where(GymTrainer.gym_id == gym_id)).all()

    # We might want to return the Trainer object + status.
    # Let's construct a response list.
    results = []
    for link in links:
        trainer = session.get(Trainer, link.trainer_id)
        if trainer:
            # Explicitly fetch user and format response
            user = trainer.user
            trainer_data = trainer.model_dump()
            if user:
                trainer_data["user"] = {
                    "email": user.email,
                    "full_name": user.full_name,
                    "id": user.id,
                }

            results.append(
                {
                    "trainer": trainer_data,
                    "status": link.status,
                    "updated_at": link.updated_at,
                }
            )
    return results


class TrainerInviteSchema(BaseModel):
    # Use str for now or explicit EmailStr if pydantic[email] is installed
    email: str
    message: Optional[str] = None


@router.post("/{gym_id}/trainers", status_code=status.HTTP_201_CREATED)
def invite_trainer(
    gym_id: int,
    invite_data: TrainerInviteSchema,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    from app.models.associations import AssociationStatus, GymTrainer
    from app.models.trainer import Trainer
    from app.models.user import User as UserModel

    # Logic continues...
    # ... logic continues ...

    gym = session.get(Gym, gym_id)
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")
    if gym.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Validate payload manually if type hint is Any (temporary fallback)
    # Let's assume invite_data is dict and valid, but proper way is using
    # Schema in arg type. We will refine this in next step to add the
    # import at top.

    # Ideally: find User by email -> find Trainer profile -> Create Link
    # If User doesn't exist -> we can't invite yet (MVP limitation) OR we
    # create a "Pending Invite" but the PRD says "Create trainer
    # invitations".

    # Let's assume user must exist for now (MVP).
    target_user = session.exec(
        select(UserModel).where(UserModel.email == invite_data.email)
    ).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User with this email not found")

    trainer = session.exec(
        select(Trainer).where(Trainer.user_id == target_user.id)
    ).first()
    if not trainer:
        raise HTTPException(status_code=400, detail="User is not a trainer")

    # Check existing association
    existing_link = session.exec(
        select(GymTrainer).where(
            GymTrainer.gym_id == gym_id, GymTrainer.trainer_id == trainer.id
        )
    ).first()

    if existing_link:
        if existing_link.status == AssociationStatus.REJECTED:
            existing_link.status = AssociationStatus.INVITED
            session.add(existing_link)
            session.commit()
            return {"message": "Trainer re-invited"}
        return {"message": "Trainer already associated or invited"}

    new_link = GymTrainer(
        gym_id=gym_id, trainer_id=trainer.id, status=AssociationStatus.INVITED
    )
    session.add(new_link)
    session.commit()
    return {"message": f"Invitation sent to {invite_data.email}"}


@router.get("/{gym_id}/bookings", response_model=List[Any])
def read_gym_bookings(
    gym_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    gym = session.get(Gym, gym_id)
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")
    if gym.admin_id != current_user.id and current_user.role != "SAAS_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")

    # Fetch bookings for this gym
    # Join with User (Client) and Trainer for display
    # This might be heavy if many bookings, simplified for MVP
    # Optimized query with aliases
    from sqlalchemy.orm import aliased

    from app.models.booking import Booking
    from app.models.trainer import Trainer
    from app.models.user import User as UserModel

    ClientUser = aliased(UserModel)
    TrainerUser = aliased(UserModel)

    statement = (
        select(Booking, ClientUser, Trainer, TrainerUser)
        .join(ClientUser, Booking.user_id == ClientUser.id)
        .join(Trainer, Booking.trainer_id == Trainer.id)
        .join(TrainerUser, Trainer.user_id == TrainerUser.id)
        .where(Booking.gym_id == gym_id)
        .order_by(Booking.start_time.desc())
        .limit(100)
    )

    bookings = session.exec(statement).all()

    results = []
    for booking, client, trainer, trainer_user in bookings:
        results.append(
            {
                "id": booking.id,
                "start_time": booking.start_time,
                "end_time": booking.end_time,
                "status": booking.status,
                "client": {"name": client.full_name, "email": client.email},
                "trainer": {
                    "id": trainer.id,
                    "name": trainer_user.full_name,
                    "email": trainer_user.email,
                },
            }
        )
    return results


@router.get("/{gym_id}/clients", response_model=List[Any])
def read_gym_clients(
    gym_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    gym = session.get(Gym, gym_id)
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")

    # Authz: Only gym admin or SAAS_ADMIN
    if gym.admin_id != current_user.id and current_user.role != "SAAS_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")

    from app.models.subscription import ClientSubscription, SubscriptionStatus
    from app.models.user import User as UserModel

    # Select users who have an active subscription at this gym
    statement = (
        select(UserModel, ClientSubscription)
        .join(ClientSubscription, UserModel.id == ClientSubscription.user_id)
        .where(ClientSubscription.gym_id == gym_id)
        .where(ClientSubscription.status == SubscriptionStatus.ACTIVE)
    )

    results = session.exec(statement).all()

    formatted_results = []
    for user, sub in results:
        formatted_results.append(
            {
                "id": user.id,
                "name": user.full_name,
                "email": user.email,
                "subscription": {
                    "status": sub.status,
                    "sessions_remaining": sub.total_sessions - sub.sessions_used,
                    "expiry_date": sub.expiry_date,
                },
            }
        )

    return formatted_results




@router.get("/{gym_id}/packages", response_model=List[Any])
def read_gym_packages(
    gym_id: int,
    session: Session = Depends(get_session),
):
    from app.models.booking import SessionPackage

    packages = session.exec(
        select(SessionPackage).where(SessionPackage.gym_id == gym_id)
    ).all()
    return packages


@router.post(
    "/{gym_id}/packages", response_model=Any, status_code=status.HTTP_201_CREATED
)
def create_gym_package(
    gym_id: int,
    package_data: dict,  # Simplified for now, can use Schema
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    gym = session.get(Gym, gym_id)
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")
    if gym.admin_id != current_user.id and current_user.role != "SAAS_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")

    from app.models.booking import SessionPackage

    db_obj = SessionPackage(
        name=package_data["name"],
        description=package_data.get("description"),
        price_inr=package_data["price_inr"],
        session_count=package_data["session_count"],
        gym_id=gym_id,
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


@router.put("/{gym_id}/packages/{package_id}", response_model=Any)
def update_gym_package(
    gym_id: int,
    package_id: int,
    package_data: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    gym = session.get(Gym, gym_id)
    from app.models.booking import SessionPackage

    package = session.get(SessionPackage, package_id)

    if not gym or not package or package.gym_id != gym_id:
        raise HTTPException(status_code=404, detail="Resource not found")

    if gym.admin_id != current_user.id and current_user.role != "SAAS_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")

    for key, value in package_data.items():
        if hasattr(package, key):
            setattr(package, key, value)

    session.add(package)
    session.commit()
    session.refresh(package)
    return package


@router.delete("/{gym_id}/packages/{package_id}")
def delete_gym_package(
    gym_id: int,
    package_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    gym = session.get(Gym, gym_id)
    from app.models.booking import SessionPackage

    package = session.get(SessionPackage, package_id)

    if not gym or not package or package.gym_id != gym_id:
        raise HTTPException(status_code=404, detail="Resource not found")

    if gym.admin_id != current_user.id and current_user.role != "SAAS_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")

    session.delete(package)
    session.commit()
    return {"message": "Package deleted"}


@router.patch("/{gym_id}/trainers/{trainer_id}/status", response_model=Any)
def update_trainer_association_status(
    gym_id: int,
    trainer_id: int,
    status_update: dict,  # expect {"status": "ACTIVE" | "REJECTED"}
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    from app.models.associations import AssociationStatus, GymTrainer

    gym = session.get(Gym, gym_id)
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")

    # Authz: Only gym admin or SAAS_ADMIN
    if gym.admin_id != current_user.id and current_user.role != "SAAS_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")

    link = session.exec(
        select(GymTrainer).where(
            GymTrainer.gym_id == gym_id, GymTrainer.trainer_id == trainer_id
        )
    ).first()

    if not link:
        raise HTTPException(status_code=404, detail="Association not found")

    new_status = status_update.get("status")
    if new_status and hasattr(AssociationStatus, new_status):
        link.status = new_status
        session.add(link)
        session.commit()
        session.refresh(link)

    return {
        "message": f"Trainer status updated to {link.status}",
        "status": link.status,
    }
