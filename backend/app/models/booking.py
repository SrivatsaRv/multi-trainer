from datetime import datetime
from enum import Enum
from typing import Optional

from sqlmodel import Field, SQLModel


class BookingStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"
    LATE = "LATE"


class SessionPackage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None
    price_inr: int  # Storing in paise or INR?
    # Assume INR for simplicity as per requirement. integer is safer.
    session_count: int
    gym_id: int = Field(foreign_key="gym.id", index=True)

    # Relationships can be added later if needed
    # (e.g. valid for specific trainers)


class Booking(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    gym_id: int = Field(foreign_key="gym.id", index=True)
    trainer_id: int = Field(foreign_key="trainer.id", index=True)
    user_id: Optional[int] = Field(
        default=None, foreign_key="user.id", index=True
    )  # Client

    start_time: datetime
    end_time: datetime
    status: BookingStatus = BookingStatus.SCHEDULED

    workout_focus: Optional[str] = None  # e.g. "Legs" (Matches Template Name)

    notes: Optional[str] = None
