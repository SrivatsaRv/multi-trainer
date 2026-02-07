from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from app.core.security import get_password_hash, verify_password
from app.core.session_manager import create_user_session, invalidate_session
from app.db.session import get_session
from app.models.user import User, UserCreate, UserRole

router = APIRouter()


@router.post("/register", response_model=Any)
def register(
    request: Request,
    user_in: UserCreate,
    session: Session = Depends(get_session),
):
    # Check if user exists
    existing_user = session.exec(
        select(User).where(User.email == user_in.email)
    ).first()
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
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    # Create empty profile based on role
    if user.role == UserRole.TRAINER:
        from app.models.trainer import Trainer

        trainer = Trainer(user_id=user.id)
        session.add(trainer)
    elif user.role == UserRole.GYM_ADMIN:
        from app.models.gym import Gym

        # Gym requires name/location/slug.
        # Using placeholders that they can update during onboarding.
        gym = Gym(
            admin_id=user.id,
            name=f"{user.full_name}'s Gym",
            location="To be updated",
            slug=f"gym-{user.id}",
        )
        session.add(gym)

    session.commit()

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
            "is_active": user.is_active,
        },
    }


@router.post("/access-token")
def login_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = session.exec(select(User).where(User.email == form_data.username)).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    user_session = create_user_session(session, user.id, request)

    return {
        "access_token": user_session.token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
        },
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
