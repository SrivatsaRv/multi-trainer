import pytest

from app.core.security import get_password_hash
from app.models.user import User, UserRole
from tests.test_constants import TEST_USER_PASSWORD


def test_create_user_with_defaults():
    user = User(email="test@example.com", hashed_password="hashed_password")

    assert user.email == "test@example.com"
    assert user.hashed_password == "hashed_password"
    assert user.role == UserRole.TRAINER  # Default role
    assert user.is_active is True  # Default active
    assert user.full_name is None


def test_create_user_with_all_fields():
    user = User(
        email="admin@example.com",
        hashed_password="hashed_password",
        full_name="Admin User",
        role=UserRole.GYM_ADMIN,
        is_active=False,
    )

    assert user.email == "admin@example.com"
    assert user.full_name == "Admin User"
    assert user.role == UserRole.GYM_ADMIN
    assert user.is_active is False


def test_user_roles():
    assert UserRole.TRAINER == "TRAINER"
    assert UserRole.GYM_ADMIN == "GYM_ADMIN"
    assert UserRole.SAAS_ADMIN == "SAAS_ADMIN"  # Changed from SUPER_ADMIN


def test_user_create_model():
    from app.models.user import UserCreate

    user_create = UserCreate(
        email="new@example.com", password=TEST_USER_PASSWORD, full_name="New User"
    )

    assert user_create.email == "new@example.com"
    assert user_create.password == TEST_USER_PASSWORD
    assert user_create.full_name == "New User"


def test_user_update_model():
    from app.models.user import UserUpdate

    user_update = UserUpdate(full_name="Updated Name", role=UserRole.GYM_ADMIN)

    assert user_update.full_name == "Updated Name"
    assert user_update.role == UserRole.GYM_ADMIN
    assert user_update.email is None  # Optional field
