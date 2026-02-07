from enum import Enum
from typing import TYPE_CHECKING, List, Optional

from pydantic import BaseModel
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.gym import Gym
    from app.models.trainer import Trainer
    from app.models.workout_log import WorkoutLog


class UserRole(str, Enum):
    SAAS_ADMIN = "SAAS_ADMIN"
    GYM_ADMIN = "GYM_ADMIN"
    TRAINER = "TRAINER"
    CLIENT = "CLIENT"


class UserBase(SQLModel):
    email: str = Field(unique=True, index=True)
    full_name: Optional[str] = None
    role: UserRole = UserRole.TRAINER
    is_active: bool = True
    is_demo: bool = Field(default=False, description="Flag to identify demo/test users")


class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str

    # Relationships
    gym: Optional["Gym"] = Relationship(back_populates="admin")
    trainer: Optional["Trainer"] = Relationship(back_populates="user")
    workout_logs: List["WorkoutLog"] = Relationship(back_populates="client")


class UserCreate(BaseModel):
    email: str
    full_name: Optional[str] = None
    role: UserRole = UserRole.TRAINER
    password: str


class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
