import pytest
from app.models.gym import Gym, GymCreate, GymUpdate, VerificationStatus

def test_create_gym_with_defaults():
    gym = Gym(
        name="Test Gym",
        slug="test-gym",
        location="Test Location",
        admin_id=1
    )
    
    assert gym.name == "Test Gym"
    assert gym.slug == "test-gym"
    assert gym.location == "Test Location"
    assert gym.admin_id == 1
    assert gym.verification_status == VerificationStatus.DRAFT
    assert gym.description is None

def test_create_gym_with_all_fields():
    gym = Gym(
        name="Premium Gym",
        slug="premium-gym",
        location="Premium Location",
        description="A premium fitness facility",
        admin_id=1,
        verification_status=VerificationStatus.APPROVED
    )
    
    assert gym.name == "Premium Gym"
    assert gym.description == "A premium fitness facility"
    assert gym.verification_status == VerificationStatus.APPROVED

def test_verification_status_enum():
    assert VerificationStatus.DRAFT == "DRAFT"
    assert VerificationStatus.PENDING == "PENDING"
    assert VerificationStatus.APPROVED == "APPROVED"
    assert VerificationStatus.REJECTED == "REJECTED"

def test_gym_create_model():
    gym_create = GymCreate(
        name="New Gym",
        slug="new-gym",
        location="New Location"
    )
    
    assert gym_create.name == "New Gym"
    assert gym_create.slug == "new-gym"
    assert gym_create.location == "New Location"

def test_gym_update_model():
    gym_update = GymUpdate(
        name="Updated Gym",
        description="Updated description"
    )
    
    assert gym_update.name == "Updated Gym"
    assert gym_update.description == "Updated description"
    assert gym_update.location is None  # Optional field
