import pytest
from fastapi import HTTPException
from sqlmodel import Session, select

from app.api.api_v1.deps import get_current_user
from app.core.security import create_access_token
from app.core.session_manager import create_user_session, invalidate_session
from app.models.session import UserSession
from app.models.user import User, UserRole


def test_get_current_user_with_revoked_session(session: Session, test_user: User):
    """
    Test that get_current_user raises a 401 SESSION_EXPIRED when the session is invalidated
    in the database, even if the JWT itself is still valid.
    """
    # 1. Create a valid session
    user_session = create_user_session(session, test_user.id)
    token = user_session.token

    # 2. Verify it works initially
    user = get_current_user(session, token)
    assert user.id == test_user.id

    # 3. Invalidate the session in the DB
    invalidate_session(session, token)

    # 4. Attempt to get user again - should fail with SESSION_EXPIRED
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(session, token)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "SESSION_EXPIRED"


def test_get_current_user_with_deleted_session_record(
    session: Session, test_user: User
):
    """
    Test that get_current_user raises a 401 SESSION_EXPIRED when the session record
    is physically deleted from the database.
    """
    # 1. Create a valid session
    user_session = create_user_session(session, test_user.id)
    token = user_session.token

    # 2. Delete the session record
    session.delete(user_session)
    session.commit()

    # 3. Attempt to get user - should fail with SESSION_EXPIRED
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(session, token)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "SESSION_EXPIRED"


def test_get_current_user_with_inactive_session_flag(session: Session, test_user: User):
    """
    Test that get_current_user raises a 401 SESSION_EXPIRED when is_active is set to False.
    """
    # 1. Create a valid session
    user_session = create_user_session(session, test_user.id)
    token = user_session.token

    # 2. Set is_active to False
    user_session.is_active = False
    session.add(user_session)
    session.commit()

    # 3. Attempt to get user - should fail with SESSION_EXPIRED
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(session, token)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "SESSION_EXPIRED"
