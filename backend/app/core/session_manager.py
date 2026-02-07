"""
Session management utilities for database-backed sessions
Enforces one active session per user
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import Request
from sqlmodel import Session, select

from app.core.config import settings
from app.core.security import create_access_token
from app.models.session import UserSession


def create_user_session(
    session: Session, user_id: int, request: Optional[Request] = None
) -> UserSession:
    """
    Create a new session for user, invalidating any existing sessions
    Enforces one session per user
    """
    # Delete all existing sessions for this user
    # (enforces one session per user)
    existing_sessions = session.exec(
        select(UserSession).where(UserSession.user_id == user_id)
    ).all()

    for existing in existing_sessions:
        session.delete(existing)

    session.flush()  # Ensure deletes are processed before insert

    # Create new token
    token = create_access_token(user_id)

    # Get client info
    ip_address = None
    user_agent = None
    if request:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

    # Create new session
    expires_at = datetime.utcnow() + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    user_session = UserSession(
        user_id=user_id,
        token=token,
        expires_at=expires_at,
        ip_address=ip_address,
        user_agent=user_agent,
        is_active=True,
    )

    session.add(user_session)
    session.commit()
    session.refresh(user_session)

    return user_session


def get_active_session(session: Session, token: str) -> Optional[UserSession]:
    """
    Get active session by token
    Returns None if session is invalid or expired
    """
    user_session = session.exec(
        select(UserSession).where(
            UserSession.token == token, UserSession.is_active.is_(True)
        )
    ).first()

    if not user_session:
        return None

    # Check expiration
    if user_session.expires_at < datetime.utcnow():
        user_session.is_active = False
        session.add(user_session)
        session.commit()
        return None

    # Update last activity
    user_session.last_activity = datetime.utcnow()
    session.add(user_session)
    session.commit()

    return user_session


def invalidate_session(session: Session, token: str) -> bool:
    """
    Invalidate a session (logout)
    Returns True if session was found and invalidated
    """
    user_session = session.exec(
        select(UserSession).where(UserSession.token == token)
    ).first()

    if not user_session:
        return False

    user_session.is_active = False
    session.add(user_session)
    session.commit()

    return True


def invalidate_user_sessions(session: Session, user_id: int) -> int:
    """
    Invalidate all sessions for a user
    Returns count of invalidated sessions
    """
    sessions = session.exec(
        select(UserSession).where(
            UserSession.user_id == user_id, UserSession.is_active.is_(True)
        )
    ).all()

    count = 0
    for user_session in sessions:
        user_session.is_active = False
        session.add(user_session)
        count += 1

    session.commit()
    return count


def get_user_active_session(session: Session, user_id: int) -> Optional[UserSession]:
    """
    Get the active session for a user
    Returns None if no active session exists
    """
    return session.exec(
        select(UserSession).where(
            UserSession.user_id == user_id, UserSession.is_active.is_(True)
        )
    ).first()


def cleanup_expired_sessions(session: Session) -> int:
    """
    Clean up expired sessions
    Returns count of cleaned up sessions
    """
    expired_sessions = session.exec(
        select(UserSession).where(
            UserSession.expires_at < datetime.utcnow(),
            UserSession.is_active.is_(True),
        )
    ).all()

    count = 0
    for user_session in expired_sessions:
        user_session.is_active = False
        session.add(user_session)
        count += 1

    session.commit()
    return count
