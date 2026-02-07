from enum import Enum
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from pydantic import BaseModel
from sqlalchemy import JSON, Column
from sqlmodel import Field, Relationship, SQLModel

from app.models.associations import GymTrainer

if TYPE_CHECKING:
    from app.models.trainer import Trainer
    from app.models.user import User
    from app.models.gym_application import GymApplication


class VerificationStatus(str, Enum):
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class GymBase(SQLModel):
    name: str = Field(index=True)
    slug: str = Field(index=True, unique=True)
    location: str
    description: Optional[str] = None

    # JSON Fields
    photos: List[str] = Field(default=[], sa_column=Column(JSON))
    amenities: List[str] = Field(default=[], sa_column=Column(JSON))
    operating_hours: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    social_links: Dict[str, str] = Field(default={}, sa_column=Column(JSON))

    business_reg_number: Optional[str] = None
    verification_status: VerificationStatus = VerificationStatus.PENDING


class GymCreate(BaseModel):
    name: str
    location: str
    slug: str


class GymUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    photos: Optional[List[str]] = None
    amenities: Optional[List[str]] = None
    operating_hours: Optional[Dict[str, Any]] = None
    social_links: Optional[Dict[str, str]] = None
    business_reg_number: Optional[str] = None
    verification_status: Optional[VerificationStatus] = None


class Gym(GymBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    admin_id: int = Field(foreign_key="user.id")

    # Relationships
    admin: Optional["User"] = Relationship(back_populates="gym")
    trainers: List["Trainer"] = Relationship(
        back_populates="gyms",
        link_model=GymTrainer,
        sa_relationship_kwargs={"cascade": "all"},
    )
    trainer_applications: List["GymApplication"] = Relationship(back_populates="gym")
