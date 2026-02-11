from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.gym import Gym
    from app.models.trainer import Trainer


class ApplicationStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class GymApplicationBase(SQLModel):
    status: ApplicationStatus = Field(default=ApplicationStatus.PENDING)
    message: Optional[str] = None


class GymApplication(GymApplicationBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    trainer_id: int = Field(foreign_key="trainer.id")
    gym_id: int = Field(foreign_key="gym.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    trainer: "Trainer" = Relationship(back_populates="gym_applications")
    gym: "Gym" = Relationship(back_populates="trainer_applications")


class GymApplicationCreate(SQLModel):
    gym_id: int
    message: Optional[str] = None


class GymApplicationUpdate(SQLModel):
    status: ApplicationStatus
