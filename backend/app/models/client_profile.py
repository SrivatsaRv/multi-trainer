from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.user import User


class ClientProfileBase(SQLModel):
    dob: Optional[datetime] = None
    gender: Optional[str] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    medical_history: Optional[str] = None
    fitness_goals: Optional[str] = None
    emergency_contact: Optional[str] = None
    address: Optional[str] = None


class ClientProfile(ClientProfileBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True, unique=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationship
    user: "User" = Relationship()


class ClientProfileCreate(ClientProfileBase):
    user_id: int


class ClientProfileUpdate(ClientProfileBase):
    pass
