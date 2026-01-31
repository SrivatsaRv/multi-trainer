from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel, Relationship
from app.models.user import User


class UserSession(SQLModel, table=True):
    """
    Database-backed user sessions for tracking active logins
    Enforces one active session per user
    """
    __tablename__ = "user_sessions"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True, index=True)
    token: str = Field(index=True, unique=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    is_active: bool = Field(default=True)
    
    # Relationship
    user: Optional[User] = Relationship()
