import pytest
from datetime import datetime, timedelta
from sqlmodel import Session, select
from app.core.session_manager import (
    create_user_session, 
    get_active_session, 
    invalidate_session,
    invalidate_user_sessions,
    get_user_active_session,
    cleanup_expired_sessions
)
from app.models.session import UserSession
from app.models.user import User, UserRole
from app.core.security import get_password_hash

def test_create_user_session(session: Session):
    # Create test user
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.TRAINER
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # Create session
    user_session = create_user_session(session, user.id)
    
    assert user_session.user_id == user.id
    assert user_session.token is not None
    assert user_session.is_active is True
    assert user_session.expires_at > datetime.utcnow()

def test_create_user_session_invalidates_existing(session: Session):
    # Create test user
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.TRAINER
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # Create first session
    session1 = create_user_session(session, user.id)
    
    # Create second session (should invalidate first)
    session2 = create_user_session(session, user.id)
    
    # Verify only second session exists
    active_sessions = session.exec(select(UserSession).where(
        UserSession.user_id == user.id
    )).all()
    
    assert len(active_sessions) == 1
    assert active_sessions[0].id == session2.id

def test_get_active_session(session: Session):
    # Create test user and session
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.TRAINER
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    
    user_session = create_user_session(session, user.id)
    
    # Test valid token
    retrieved_session = get_active_session(session, user_session.token)
    assert retrieved_session.id == user_session.id
    
    # Test invalid token
    invalid_session = get_active_session(session, "invalid_token")
    assert invalid_session is None

def test_invalidate_session(session: Session):
    # Create test user and session
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.TRAINER
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    
    user_session = create_user_session(session, user.id)
    
    # Invalidate session
    invalidate_session(session, user_session.token)
    
    # Verify session is gone
    retrieved_session = get_active_session(session, user_session.token)
    assert retrieved_session is None

def test_invalidate_user_sessions(session: Session):
    # Create test user
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.TRAINER
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # Create multiple sessions (though only one should exist due to enforcement)
    session1 = create_user_session(session, user.id)
    
    # Invalidate all user sessions
    invalidate_user_sessions(session, user.id)
    
    # Verify no active sessions
    active_session = get_user_active_session(session, user.id)
    assert active_session is None

def test_cleanup_expired_sessions(session: Session):
    # Create test user
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.TRAINER
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # Create expired session manually
    expired_session = UserSession(
        user_id=user.id,
        token="expired_token",
        expires_at=datetime.utcnow() - timedelta(hours=1),
        is_active=True
    )
    session.add(expired_session)
    session.commit()
    
    # Run cleanup
    cleanup_expired_sessions(session)
    
    # Verify expired session is removed
    retrieved_session = get_active_session(session, "expired_token")
    assert retrieved_session is None
