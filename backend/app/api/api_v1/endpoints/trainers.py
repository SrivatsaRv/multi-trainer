from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.db.session import get_session
from app.models.trainer import Trainer, TrainerCreate, TrainerUpdate
from app.models.user import User
from app.api.api_v1.deps import get_current_user

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
    existing_trainer = session.exec(select(Trainer).where(Trainer.user_id == current_user.id)).first()
    if existing_trainer:
        raise HTTPException(status_code=400, detail="User already has a trainer profile")

    db_obj = Trainer(
        **trainer_in.model_dump(),
        user_id=current_user.id
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj
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
    
    links = session.exec(select(GymTrainer).where(GymTrainer.trainer_id == trainer_id)).all()
    
    results = []
    for link in links:
        gym = session.get(Gym, link.gym_id)
        if gym:
            results.append({
                "gym": gym, # Gym model is safe to return fully for now
                "status": link.status,
                "updated_at": link.updated_at
            })
    return results

@router.post("/{trainer_id}/gyms", status_code=status.HTTP_201_CREATED)
def apply_to_gym(
    trainer_id: int,
    gym_id: int, # Payload could be just gym_id or an object
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # Dynamic import
    from app.models.associations import GymTrainer, AssociationStatus
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
    existing = session.exec(select(GymTrainer).where(
        GymTrainer.gym_id == gym_id,
        GymTrainer.trainer_id == trainer_id
    )).first()

    if existing:
        return {"message": "Already associated or applied", "status": existing.status}
    
    new_link = GymTrainer(
        gym_id=gym_id,
        trainer_id=trainer_id,
        status=AssociationStatus.PENDING # Trainer applying = PENDING approval from Gym
    )
    session.add(new_link)
    session.commit()
    return {"message": "Application sent to gym"}
