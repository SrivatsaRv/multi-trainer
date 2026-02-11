"""
Seeding script for test personas.
Run via: python app/db/seed_test_data.py
WARNING: Clears existing users with these emails.
"""

import os
import sys

from sqlmodel import Session, create_engine, select

# Ensure we can import app modules
sys.path.append(os.getcwd())

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.session import engine
from app.models.gym import Gym, VerificationStatus
from app.models.trainer import Trainer
from app.models.user import User, UserRole

# Get password from ENV or default (SAFE: local dev only)
TEST_PASSWORD = os.environ.get("TEST_USER_PASSWORD", "password123")

PERSONAS = [
    # Role, Email, GymState/TrainerState
    ("GYM_ADMIN", "testuser@example.com", "E2E"),
    ("GYM_ADMIN", "gym_draft@example.com", "DRAFT"),
    ("GYM_ADMIN", "gym_pending@example.com", "PENDING"),
    ("GYM_ADMIN", "gym_active@example.com", "APPROVED"),
    ("GYM_ADMIN", "gym_rejected@example.com", "REJECTED"),
    ("TRAINER", "tr_draft@example.com", "DRAFT"),
    ("TRAINER", "tr_active@example.com", "APPROVED"),
    ("PLATFORM_ADMIN", "admin@example.com", None),  # Special admin
]


from sqlalchemy import text


def seed_personas():
    with Session(engine) as session:
        for role_str, email, status in PERSONAS:
            # 1. Cleanup existing (Aggressive raw SQL)
            existing = session.exec(select(User).where(User.email == email)).first()
            if existing:
                print(f"Aggressive cleanup for {email}...")
                uid = existing.id
                # 1.1 Find Gym and Trainer IDs
                gid = session.exec(select(Gym.id).where(Gym.admin_id == uid)).first()
                tid = session.exec(
                    select(Trainer.id).where(Trainer.user_id == uid)
                ).first()

                # 1.2 Delete by Trainer ID
                if tid:
                    session.execute(
                        text(
                            "DELETE FROM workoutset WHERE session_exercise_id IN (SELECT id FROM workoutsessionexercise WHERE booking_id IN (SELECT id FROM booking WHERE trainer_id = :tid))"
                        ),
                        {"tid": tid},
                    )
                    session.execute(
                        text(
                            "DELETE FROM workoutsessionexercise WHERE booking_id IN (SELECT id FROM booking WHERE trainer_id = :tid)"
                        ),
                        {"tid": tid},
                    )
                    session.execute(
                        text("DELETE FROM booking WHERE trainer_id = :tid"),
                        {"tid": tid},
                    )
                    session.execute(
                        text("DELETE FROM gymtrainer WHERE trainer_id = :tid"),
                        {"tid": tid},
                    )
                    session.execute(
                        text("DELETE FROM clienttrainer WHERE trainer_id = :tid"),
                        {"tid": tid},
                    )
                    session.execute(
                        text("DELETE FROM trainer WHERE id = :tid"), {"tid": tid}
                    )

                # 1.3 Delete by Gym ID
                if gid:
                    session.execute(
                        text(
                            "DELETE FROM workoutset WHERE session_exercise_id IN (SELECT id FROM workoutsessionexercise WHERE booking_id IN (SELECT id FROM booking WHERE gym_id = :gid))"
                        ),
                        {"gid": gid},
                    )
                    session.execute(
                        text(
                            "DELETE FROM workoutsessionexercise WHERE booking_id IN (SELECT id FROM booking WHERE gym_id = :gid)"
                        ),
                        {"gid": gid},
                    )
                    session.execute(
                        text("DELETE FROM booking WHERE gym_id = :gid"), {"gid": gid}
                    )
                    session.execute(
                        text("DELETE FROM clientsubscription WHERE gym_id = :gid"),
                        {"gid": gid},
                    )
                    session.execute(
                        text("DELETE FROM sessionpackage WHERE gym_id = :gid"),
                        {"gid": gid},
                    )
                    session.execute(
                        text("DELETE FROM gymtrainer WHERE gym_id = :gid"), {"gid": gid}
                    )
                    session.execute(
                        text("DELETE FROM gym WHERE id = :gid"), {"gid": gid}
                    )

                # 1.4 Delete User and Sessions
                session.execute(
                    text("DELETE FROM user_sessions WHERE user_id = :uid"), {"uid": uid}
                )
                session.execute(
                    text('DELETE FROM "user" WHERE id = :uid'), {"uid": uid}
                )
                session.commit()

            # 2. Create User
            print(f"Creating {email} [{role_str}]...")
            actual_role = (
                role_str if role_str != "PLATFORM_ADMIN" else "GYM_ADMIN"
            )  # Fallback for now as Enum might strict

            user = User(
                email=email,
                full_name=f"Test {role_str} {status}",
                hashed_password=get_password_hash(TEST_PASSWORD),
                role=actual_role,
                is_active=True,
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
                    verification_status=status if status != "E2E" else "APPROVED",
                )
                session.add(gym)

            elif role_str == "TRAINER" and status:
                trainer = Trainer(
                    user_id=user.id,
                    bio="I am a test trainer",
                    verification_status=status,
                )
                session.add(trainer)

            session.commit()
            print(f"✅ seeded {email}")


if __name__ == "__main__":
    seed_personas()
