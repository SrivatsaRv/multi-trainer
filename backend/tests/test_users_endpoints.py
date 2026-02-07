import pytest

from app.api.api_v1.endpoints.users import read_user_me
from tests.test_constants import TEST_USER_PASSWORD


def test_read_user_me(client, test_user):
    # Login to get token
    login_data = {"username": test_user.email, "password": TEST_USER_PASSWORD}
    response = client.post("/api/v1/auth/access-token", data=login_data)
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get current user info
    response = client.get("/api/v1/users/me", headers=headers)

    assert response.status_code == 200
    data = response.json()
    # The endpoint returns a nested structure with user, gym, trainer
    assert "user" in data
    user_data = data["user"]
    assert user_data["id"] == test_user.id
    assert user_data["email"] == test_user.email
    assert user_data["full_name"] == test_user.full_name
    assert user_data["role"] == test_user.role
    assert user_data["is_active"] == test_user.is_active


def test_read_user_me_unauthorized(client):
    response = client.get("/api/v1/users/me")

    assert response.status_code == 401


def test_read_user_me_invalid_token(client):
    headers = {"Authorization": "Bearer invalid_token"}
    response = client.get("/api/v1/users/me", headers=headers)

    assert response.status_code == 403
