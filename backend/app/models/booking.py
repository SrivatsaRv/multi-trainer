from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship
from enum import Enum

class BookingStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"

class SessionPackage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None
    price_inr: int  # Storing in paise or just INR? Let's assume INR for simplicity as per requirement. integer is safer.
    session_count: int
    gym_id: int = Field(foreign_key="gym.id", index=True)
    
    # Relationships can be added later if needed (e.g. valid for specific trainers)

class Booking(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    gym_id: int = Field(foreign_key="gym.id", index=True)
    trainer_id: int = Field(foreign_key="trainer.id", index=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True) # Client
    
    start_time: datetime
    end_time: datetime
    status: BookingStatus = BookingStatus.SCHEDULED
    
    notes: Optional[str] = None
