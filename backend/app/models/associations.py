from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr
from sqlmodel import Field, SQLModel


class AssociationStatus(str, Enum):
    PENDING = "PENDING"
    INVITED = "INVITED"
    ACTIVE = "ACTIVE"
    REJECTED = "REJECTED"
    TERMINATED = "TERMINATED"


class GymTrainer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    gym_id: int = Field(foreign_key="gym.id")
    trainer_id: int = Field(foreign_key="trainer.id")
    status: AssociationStatus = Field(default=AssociationStatus.PENDING)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships are defined in Gym and Trainer models to avoid circular
    # imports?
    # Actually, often better to define them here if using string forward refs,
    # but SQLModel usually prefers them on the main classes.
    # We will leave simple Link fields here.


class ClientTrainer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    client_id: int = Field(
        foreign_key="user.id"
    )  # Assuming Client is a User role for now
    trainer_id: int = Field(foreign_key="trainer.id")
    status: AssociationStatus = Field(default=AssociationStatus.PENDING)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TrainerInviteSchema(BaseModel):
    email: EmailStr
    message: Optional[str] = None


class GymTrainerUpdateSchema(BaseModel):
    status: AssociationStatus
