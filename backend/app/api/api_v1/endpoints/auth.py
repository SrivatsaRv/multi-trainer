from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from app.db.session import get_session
from app.core.security import create_access_token, verify_password, get_password_hash
from app.core.session_manager import create_user_session, invalidate_session
from app.core.config import settings
from app.models.user import User, UserCreate, UserRole

router = APIRouter()

@router.post("/register", response_model=Any)
def register(
    request: Request,
    user_in: UserCreate,
    session: Session = Depends(get_session)
):
    # Check if user exists
    existing_user = session.exec(select(User).where(User.email == user_in.email)).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="The user with this user name already exists in the system",
        )
    
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        is_active=True
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    # Auto-Login (Create Session)
    user_session = create_user_session(session, user.id, request)

    return {
        "access_token": user_session.token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active
        }
    }

@router.post("/login/access-token")
def login_access_token(
    request: Request,
    session: Session = Depends(get_session),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Any:
    user = session.exec(select(User).where(User.email == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    # Create database-backed session (invalidates any existing sessions)
    user_session = create_user_session(session, user.id, request)
    
    return {
        "access_token": user_session.token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active
        }
    }

@router.post("/logout")
def logout(
    token: str,
    session: Session = Depends(get_session),
) -> Any:
    """
    Logout user by invalidating their session
    """
    success = invalidate_session(session, token)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"message": "Successfully logged out"}
