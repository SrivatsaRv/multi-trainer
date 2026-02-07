from typing import Any

from fastapi import APIRouter, Depends
# selectinload removed if unused
from sqlmodel import Session, select

from app.api.api_v1.deps import get_current_user
from app.db.session import get_session
from app.models.gym import Gym
from app.models.trainer import Trainer
from app.models.user import User

router = APIRouter()


@router.get("/me", response_model=Any)
def read_user_me(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get current user with their profile (Gym or Trainer).
    """
    # Eager load relationships
    # Note: SQLModel doesn't always play nice with Pydantic response models
    # for relationships if not explicitly defined in a Read schema.
    # For MVP, returning a custom dict is safer/faster than debugging
    # Pydantic recursion.

    user_data = {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active,
    }

    gym = session.exec(select(Gym).where(Gym.admin_id == current_user.id)).first()
    trainer = session.exec(
        select(Trainer).where(Trainer.user_id == current_user.id)
    ).first()

    return {
        "user": user_data,
        "gym": gym.model_dump() if gym else None,
        "trainer": trainer.model_dump() if trainer else None,
    }
