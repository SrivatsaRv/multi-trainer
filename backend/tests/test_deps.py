from datetime import datetime, timedelta

import pytest
from fastapi import HTTPException

from app.api.api_v1.deps import get_current_user
from app.core.security import create_access_token, get_password_hash
from app.core.session_manager import create_user_session
from app.models.session import UserSession
from app.models.user import User, UserRole


def test_get_current_user_valid_token(session, test_user):
    # Create session for user
    user_session = create_user_session(session, test_user.id)

    # Test with valid token
    current_user = get_current_user(session, user_session.token)
    assert current_user.id == test_user.id
    assert current_user.email == test_user.email


def test_get_current_user_invalid_token(session):
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(session, "invalid_token")

    assert exc_info.value.status_code == 403
    assert "Could not validate credentials" in str(exc_info.value.detail)


def test_get_current_user_nonexistent_user(session):
    # Create token for non-existent user
    fake_token = create_access_token(99999)

    # Create session even for non-existent user to pass first check
    session.add(
        UserSession(
            user_id=99999,
            token=fake_token,
            is_active=True,
            expires_at=datetime.utcnow() + timedelta(days=1),
        )
    )
    session.commit()

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(session, fake_token)

    assert exc_info.value.status_code == 404
    assert "User not found" in str(exc_info.value.detail)


def test_get_current_user_inactive_user(session):
    # Create inactive user
    inactive_user = User(
        email="inactive@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.TRAINER,
        is_active=False,
    )
    session.add(inactive_user)
    session.commit()
    session.refresh(inactive_user)

    # Create token for inactive user
    token = create_access_token(inactive_user.id)
    # Create session
    session.add(
        UserSession(
            user_id=inactive_user.id,
            token=token,
            is_active=True,
            expires_at=datetime.utcnow() + timedelta(days=1),
        )
    )
    session.commit()

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(session, token)

    assert exc_info.value.status_code == 400
    assert "Inactive user" in str(exc_info.value.detail)
