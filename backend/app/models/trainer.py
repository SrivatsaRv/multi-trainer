from typing import TYPE_CHECKING, Dict, List, Optional

from pydantic import BaseModel, field_validator
from sqlalchemy import JSON, Column
from sqlmodel import Field, Relationship, SQLModel

from app.models.associations import GymTrainer
from app.models.gym import VerificationStatus

if TYPE_CHECKING:
    from app.models.gym import Gym
    from app.models.user import User
    from app.models.certificate import Certificate
    from app.models.gym_application import GymApplication
    from app.models.workout_template import WorkoutTemplate
    from app.models.workout_log import WorkoutLog


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
    certificates: List["Certificate"] = Relationship(back_populates="trainer")
    gym_applications: List["GymApplication"] = Relationship(back_populates="trainer")
    workout_templates: List["WorkoutTemplate"] = Relationship(back_populates="trainer")
    conducted_workouts: List["WorkoutLog"] = Relationship(back_populates="trainer")


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

    @field_validator("specializations")
    @classmethod
    def validate_specializations(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v and len(v) > 5:
            raise ValueError("Trainers can have a maximum of 5 specializations")
        return v
