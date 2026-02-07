from datetime import datetime, timedelta

import pytest

from app.models.session import UserSession


def test_create_user_session():
    expires_at = datetime.utcnow() + timedelta(hours=8)

    session = UserSession(
        user_id=1,
        token="test_token_123",
        expires_at=expires_at,
        ip_address="192.168.1.1",
        user_agent="Mozilla/5.0 Test Browser",
        is_active=True,
    )

    assert session.user_id == 1
    assert session.token == "test_token_123"
    assert session.expires_at == expires_at
    assert session.ip_address == "192.168.1.1"
    assert session.user_agent == "Mozilla/5.0 Test Browser"
    assert session.is_active is True


def test_user_session_defaults():
    session = UserSession(
        user_id=1, token="test_token", expires_at=datetime.utcnow() + timedelta(hours=1)
    )

    assert session.user_id == 1
    assert session.token == "test_token"
    assert session.ip_address is None
    assert session.user_agent is None
    assert session.is_active is True  # Default value
