import pytest
from datetime import datetime, timedelta
from jose import jwt
from app.core.security import create_access_token, verify_password, get_password_hash
from app.core.config import settings

from tests.test_constants import TEST_USER_PASSWORD

def test_get_password_hash():
    password = TEST_USER_PASSWORD
    hashed = get_password_hash(password)
    
    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("wrongpassword", hashed)

def test_create_access_token():
    user_id = 123
    token = create_access_token(user_id)
    
    assert token is not None
    assert isinstance(token, str)
    
    # Decode and verify token
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    assert payload["sub"] == str(user_id)
    assert "exp" in payload

def test_create_access_token_with_custom_expiry():
    user_id = 456
    expires_delta = timedelta(minutes=30)
    token = create_access_token(user_id, expires_delta)
    
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    exp_time = datetime.utcfromtimestamp(payload["exp"])
    expected_time = datetime.utcnow() + expires_delta
    
    # Allow 5 second tolerance
    assert abs((exp_time - expected_time).total_seconds()) < 5
