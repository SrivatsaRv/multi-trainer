from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.api_v1.deps import get_current_user
from app.db.session import get_session
from app.models.associations import AssociationStatus, GymTrainer
from app.models.gym import Gym
from app.models.gym_application import (
    ApplicationStatus,
    GymApplication,
    GymApplicationCreate,
    GymApplicationUpdate,
)
from app.models.trainer import Trainer
from app.models.user import User

router = APIRouter()


@router.get("/", response_model=List[GymApplication])
def read_applications(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve applications for the current trainer.
    """
    trainer = session.exec(select(Trainer).where(Trainer.user_id == current_user.id)).first()
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer profile not found")

    return trainer.gym_applications


@router.post("/", response_model=GymApplication, status_code=status.HTTP_201_CREATED)
def create_application(
    application_in: GymApplicationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Submit a new application to a gym.
    """
    trainer = session.exec(select(Trainer).where(Trainer.user_id == current_user.id)).first()
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer profile not found")

    # Check max gyms (active associations)
    active_gyms_count = session.exec(
        select(GymTrainer).where(
            GymTrainer.trainer_id == trainer.id,
            GymTrainer.status == AssociationStatus.ACTIVE,
        )
    ).all()
    
    if len(active_gyms_count) >= 3:
         raise HTTPException(status_code=400, detail="Maximum of 3 active gym associations allowed.")

    # Check if already applied or associated
    existing_app = session.exec(
        select(GymApplication).where(
            GymApplication.trainer_id == trainer.id,
            GymApplication.gym_id == application_in.gym_id,
            GymApplication.status == ApplicationStatus.PENDING,
        )
    ).first()
    if existing_app:
        raise HTTPException(status_code=400, detail="Pending application already exists")
    
    existing_assoc = session.exec(
        select(GymTrainer).where(
            GymTrainer.trainer_id == trainer.id,
            GymTrainer.gym_id == application_in.gym_id,
        )
    ).first()
    if existing_assoc:
         raise HTTPException(status_code=400, detail="Already associated with this gym")


    application = GymApplication(
        **application_in.model_dump(), trainer_id=trainer.id
    )
    session.add(application)
    session.commit()
    session.refresh(application)
    return application


@router.delete("/{application_id}", status_code=status.HTTP_200_OK)
def cancel_application(
    application_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Cancel a pending application.
    """
    trainer = session.exec(select(Trainer).where(Trainer.user_id == current_user.id)).first()
    if not trainer:
         raise HTTPException(status_code=404, detail="Trainer profile not found")

    application = session.get(GymApplication, application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    if application.trainer_id != trainer.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if application.status != ApplicationStatus.PENDING:
         raise HTTPException(status_code=400, detail="Can only cancel pending applications")

    session.delete(application)
    session.commit()
    return {"message": "Application cancelled"}

# Gym-side endpoints could go here or in gyms.py
# For now keeping it trainer-centric as per folder name, 
# but approvals need to be done by Gym Admins.
# Let's add an approval endpoint here protected by Gym Admin check.

@router.put("/{application_id}/status", response_model=GymApplication)
def update_application_status(
    application_id: int,
    status_update: GymApplicationUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Approve or Reject an application (Gym Admin only).
    """
    application = session.get(GymApplication, application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    gym = session.get(Gym, application.gym_id)
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")
    
    if gym.admin_id != current_user.id and current_user.role != "SAAS_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")

    if status_update.status == ApplicationStatus.APPROVED:
        # Create Association
        new_assoc = GymTrainer(
            gym_id=gym.id,
            trainer_id=application.trainer_id,
            status=AssociationStatus.ACTIVE
        )
        session.add(new_assoc)
    
    application.status = status_update.status
    session.add(application)
    session.commit()
    session.refresh(application)
    return application
