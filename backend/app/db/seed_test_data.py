"""
Seeding script for test personas.
Run via: python app/db/seed_test_data.py
WARNING: Clears existing users with these emails.
"""
import os
import sys
from sqlmodel import Session, select, create_engine

# Ensure we can import app modules
sys.path.append(os.getcwd())

from app.core.config import settings
from app.db.session import engine
from app.models.user import User, UserRole
from app.models.gym import Gym, VerificationStatus
from app.models.trainer import Trainer
from app.core.security import get_password_hash

# Get password from ENV or default (SAFE: local dev only)
TEST_PASSWORD = os.environ["TEST_USER_PASSWORD"]

PERSONAS = [
    # Role, Email, GymState/TrainerState
    ("GYM_ADMIN", "gym_draft@example.com", "DRAFT"),
    ("GYM_ADMIN", "gym_pending@example.com", "PENDING"),
    ("GYM_ADMIN", "gym_active@example.com", "APPROVED"),
    ("GYM_ADMIN", "gym_rejected@example.com", "REJECTED"),
    ("TRAINER", "tr_draft@example.com", "DRAFT"),
    ("TRAINER", "tr_active@example.com", "APPROVED"),
    ("PLATFORM_ADMIN", "admin@example.com", None), # Special admin
]

def seed_personas():
    with Session(engine) as session:
        for role_str, email, status in PERSONAS:
            # 1. Cleanup existing
            existing = session.exec(select(User).where(User.email == email)).first()
            if existing:
                print(f"Deleting existing {email}...")
                session.delete(existing)
                session.commit()
            
            # 2. Create User
            print(f"Creating {email} [{role_str}]...")
            actual_role = role_str if role_str != "PLATFORM_ADMIN" else "GYM_ADMIN" # Fallback for now as Enum might strict
            
            user = User(
                email=email,
                full_name=f"Test {role_str} {status}",
                hashed_password=get_password_hash(TEST_PASSWORD),
                role=actual_role,
                is_active=True
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            
            # 3. Create Profile based on Role/Status
            if role_str == "GYM_ADMIN" and status:
                gym = Gym(
                    admin_id=user.id,
                    name=f"Gym {status}",
                    slug=f"gym-{status.lower()}",
                    location="Test City",
                    verification_status=status
                )
                session.add(gym)
            
            elif role_str == "TRAINER" and status:
                trainer = Trainer(
                    user_id=user.id,
                    bio="I am a test trainer",
                    verification_status=status
                )
                session.add(trainer)
            
            session.commit()
            print(f"✅ seeded {email}")

if __name__ == "__main__":
    seed_personas()
