from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.api_v1.deps import get_current_user
from app.db.session import get_session
from app.models.client_profile import (ClientProfile, ClientProfileCreate,
                                       ClientProfileUpdate)
from app.models.user import User, UserRole

router = APIRouter()


@router.get("/{user_id}", response_model=ClientProfile)
def read_client_profile(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # Only the user themselves, their trainer, or gym admin/saas admin can see profile
    profile = session.exec(
        select(ClientProfile).where(ClientProfile.user_id == user_id)
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if current_user.id != user_id and current_user.role not in [
        UserRole.SAAS_ADMIN,
        UserRole.GYM_ADMIN,
        UserRole.TRAINER,
    ]:
        raise HTTPException(status_code=403, detail="Not authorized")

    return profile


@router.post("", response_model=ClientProfile, status_code=status.HTTP_201_CREATED)
def create_client_profile(
    profile_in: ClientProfileCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if (
        current_user.id != profile_in.user_id
        and current_user.role != UserRole.SAAS_ADMIN
    ):
        raise HTTPException(status_code=403, detail="Not authorized")

    existing = session.exec(
        select(ClientProfile).where(ClientProfile.user_id == profile_in.user_id)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists")

    db_obj = ClientProfile(**profile_in.model_dump())
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


@router.patch("/{user_id}", response_model=ClientProfile)
def update_client_profile(
    user_id: int,
    profile_in: ClientProfileUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    profile = session.exec(
        select(ClientProfile).where(ClientProfile.user_id == user_id)
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if current_user.id != user_id and current_user.role != UserRole.SAAS_ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")

    update_data = profile_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(profile, key, value)

    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile
