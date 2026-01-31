from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.api.api_v1.deps import get_current_user, get_session
from app.models.user import User, UserRole
from app.models.gym import Gym, VerificationStatus
from app.models.trainer import Trainer

router = APIRouter()

# Dependency to check if user is Super Admin (Platform Admin) - repurposing GYM_ADMIN conceptually? 
# Actually, for this MVP, let's assume we need a new ROLE or just re-use GYM_ADMIN for simpler MVP? 
# User Requirements imply a Platform Admin. Let's stick to the PRD concept.
# PRD said "Admins". Let's assume a user with is_superuser or a specific ROLE.
# Looking at UserRole in user.py? Let's check user.py.

def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != UserRole.SAAS_ADMIN:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    return current_user

@router.get("/verifications", response_model=Any)
def list_verifications(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin),
) -> Any:
    """
    List all Gyms and Trainers with PENDING status.
    """
    pending_gyms = session.exec(select(Gym).where(Gym.verification_status == VerificationStatus.PENDING)).all()
    pending_trainers = session.exec(select(Trainer).where(Trainer.verification_status == VerificationStatus.PENDING)).all()
    
    return {
        "gyms": pending_gyms,
        "trainers": pending_trainers
    }

@router.post("/verifications/gym/{gym_id}/approve")
def approve_gym(
    gym_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin),
):
    gym = session.get(Gym, gym_id)
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")
    
    gym.verification_status = VerificationStatus.APPROVED
    session.add(gym)
    session.commit()
    return {"status": "approved"}

@router.post("/verifications/gym/{gym_id}/reject")
def reject_gym(
    gym_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin),
):
    gym = session.get(Gym, gym_id)
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")
    
    gym.verification_status = VerificationStatus.REJECTED
    session.add(gym)
    session.commit()
    return {"status": "rejected"}

@router.post("/verifications/trainer/{trainer_id}/approve")
def approve_trainer(
    trainer_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin),
):
    trainer = session.get(Trainer, trainer_id)
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    
    trainer.verification_status = VerificationStatus.APPROVED
    session.add(trainer)
    session.commit()
    return {"status": "approved"}

@router.post("/verifications/trainer/{trainer_id}/reject")
def reject_trainer(
    trainer_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin),
):
    trainer = session.get(Trainer, trainer_id)
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    
    trainer.verification_status = VerificationStatus.REJECTED
    session.add(trainer)
    session.commit()
    return {"status": "rejected"}
