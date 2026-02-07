from typing import TYPE_CHECKING, Dict, List, Optional

from pydantic import BaseModel
from sqlalchemy import JSON, Column
from sqlmodel import Field, Relationship, SQLModel

from app.models.associations import GymTrainer
from app.models.gym import VerificationStatus

if TYPE_CHECKING:
    from app.models.gym import Gym
    from app.models.user import User


class TrainerBase(SQLModel):
    bio: Optional[str] = None
    headshot_url: Optional[str] = None
    specializations: List[str] = Field(default=[], sa_column=Column(JSON))
    certifications: List[Dict[str, str]] = Field(default=[], sa_column=Column(JSON))
    experience_years: int = Field(default=0)
    social_links: Dict[str, str] = Field(default={}, sa_column=Column(JSON))
    availability: Dict[str, List[str]] = Field(default={}, sa_column=Column(JSON))
    verification_status: VerificationStatus = VerificationStatus.PENDING


class Trainer(TrainerBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")

    # Relationships
    user: Optional["User"] = Relationship(back_populates="trainer")
    gyms: List["Gym"] = Relationship(back_populates="trainers", link_model=GymTrainer)


class TrainerCreate(BaseModel):
    # Minimal create requirements for friction-less onboarding
    bio: Optional[str] = None


class TrainerUpdate(BaseModel):
    bio: Optional[str] = None
    headshot_url: Optional[str] = None
    specializations: Optional[List[str]] = None
    certifications: Optional[List[Dict[str, str]]] = None
    experience_years: Optional[int] = None
    social_links: Optional[Dict[str, str]] = None
    availability: Optional[Dict[str, List[str]]] = None
    verification_status: Optional[VerificationStatus] = None
