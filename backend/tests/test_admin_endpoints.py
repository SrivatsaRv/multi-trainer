import pytest
from app.models.user import User, UserRole
from app.models.gym import Gym, VerificationStatus
from app.models.trainer import Trainer
from tests.test_constants import TEST_USER_PASSWORD

def test_approve_gym(client, session, test_user):
    # Create a gym in pending status
    gym = Gym(
        name="Test Gym",
        slug="test-gym", 
        location="Test Location",
        admin_id=test_user.id,
        verification_status=VerificationStatus.PENDING
    )
    session.add(gym)
    session.commit()
    session.refresh(gym)
    
    # Create super admin user (using SAAS_ADMIN)
    admin_user = User(
        email="admin@example.com",
        hashed_password=get_password_hash(TEST_USER_PASSWORD),
        role=UserRole.SAAS_ADMIN,
        is_active=True
    )
    session.add(admin_user)
    session.commit()
    
    # Login as admin
    login_data = {
        "username": "admin@example.com",
        "password": TEST_USER_PASSWORD
    }
    response = client.post("/api/v1/auth/login/access-token", data=login_data)
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Approve gym
    response = client.post(f"/api/v1/admin/verifications/gym/{gym.id}/approve", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "approved"

def test_reject_gym(client, session, test_user):
    # Create a gym in pending status
    gym = Gym(
        name="Test Gym",
        slug="test-gym",
        location="Test Location", 
        admin_id=test_user.id,
        verification_status=VerificationStatus.PENDING
    )
    session.add(gym)
    session.commit()
    session.refresh(gym)
    
    # Create super admin user (using SAAS_ADMIN)
    admin_user = User(
        email="admin@example.com",
        hashed_password=get_password_hash(TEST_USER_PASSWORD),
        role=UserRole.SAAS_ADMIN,
        is_active=True
    )
    session.add(admin_user)
    session.commit()
    
    # Login as admin
    login_data = {
        "username": "admin@example.com",
        "password": TEST_USER_PASSWORD
    }
    response = client.post("/api/v1/auth/login/access-token", data=login_data)
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Reject gym
    response = client.post(f"/api/v1/admin/verifications/gym/{gym.id}/reject", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "rejected"

def test_approve_trainer(client, session):
    # Create trainer user
    trainer_user = User(
        email="trainer@example.com",
        hashed_password=get_password_hash(TEST_USER_PASSWORD),
        role=UserRole.TRAINER,
        is_active=True
    )
    session.add(trainer_user)
    session.commit()
    session.refresh(trainer_user)
    
    # Create trainer profile
    trainer = Trainer(
        bio="Test trainer",
        user_id=trainer_user.id,
        verification_status=VerificationStatus.PENDING
    )
    session.add(trainer)
    session.commit()
    session.refresh(trainer)
    
    # Create super admin user (using SAAS_ADMIN)
    admin_user = User(
        email="admin@example.com",
        hashed_password=get_password_hash(TEST_USER_PASSWORD),
        role=UserRole.SAAS_ADMIN,
        is_active=True
    )
    session.add(admin_user)
    session.commit()
    
    # Login as admin
    login_data = {
        "username": "admin@example.com",
        "password": TEST_USER_PASSWORD
    }
    response = client.post("/api/v1/auth/login/access-token", data=login_data)
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Approve trainer
    response = client.post(f"/api/v1/admin/verifications/trainer/{trainer.id}/approve", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "approved"

def test_list_verifications(client, session, test_user):
    # Create some items needing verification
    gym = Gym(
        name="Test Gym",
        slug="test-gym",
        location="Test Location",
        admin_id=test_user.id,
        verification_status=VerificationStatus.PENDING
    )
    session.add(gym)
    session.commit()
    
    # Create super admin user (using SAAS_ADMIN)
    admin_user = User(
        email="admin@example.com",
        hashed_password=get_password_hash(TEST_USER_PASSWORD),
        role=UserRole.SAAS_ADMIN,
        is_active=True
    )
    session.add(admin_user)
    session.commit()
    
    # Login as admin
    login_data = {
        "username": "admin@example.com",
        "password": TEST_USER_PASSWORD
    }
    response = client.post("/api/v1/auth/login/access-token", data=login_data)
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # List verifications
    response = client.get("/api/v1/admin/verifications", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert "gyms" in data
    assert "trainers" in data
    assert len(data["gyms"]) >= 1

def test_admin_access_denied_for_non_admin(client, test_user):
    # Login as regular user
    login_data = {
        "username": test_user.email,
        "password": TEST_USER_PASSWORD
    }
    response = client.post("/api/v1/auth/login/access-token", data=login_data)
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Try to access admin endpoint
    response = client.get("/api/v1/admin/verifications", headers=headers)
    
    assert response.status_code == 403
