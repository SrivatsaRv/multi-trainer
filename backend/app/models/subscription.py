from datetime import datetime
from enum import Enum
from typing import Optional

from sqlmodel import Field, SQLModel


class SubscriptionStatus(str, Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    PAUSED = "PAUSED"
    CANCELLED = "CANCELLED"


class ClientSubscription(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    gym_id: Optional[int] = Field(default=None, foreign_key="gym.id")

    session_package_id: Optional[int] = Field(
        default=None, foreign_key="sessionpackage.id"
    )

    total_sessions: int
    sessions_used: int = 0

    start_date: datetime = Field(default_factory=datetime.now)
    expiry_date: Optional[datetime] = None

    status: SubscriptionStatus = SubscriptionStatus.ACTIVE

    # We could add relationships to User, Gym, etc. here if needed
