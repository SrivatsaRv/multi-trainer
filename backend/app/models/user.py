from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from pydantic import BaseModel
from enum import Enum

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
