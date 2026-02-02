"""
Demo Data Management Script
Manages persistent demo accounts for manual UI testing.
"""
import sys
import os
from sqlmodel import Session, select, create_engine, SQLModel
from typing import List, Tuple

# Ensure we can import app modules
sys.path.append(os.getcwd())

# Import Models
from app.models.user import User
from app.models.gym import Gym, VerificationStatus
from app.models.trainer import Trainer
from app.models.session import UserSession
from app.models.booking import Booking, SessionPackage, BookingStatus
from app.core.config import settings
from app.core.security import get_password_hash

# DATABASE CONNECTION
try:
    from app.db.session import engine
except Exception:
    print("Could not import engine from app.db.session. Constructing manually...")
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/app")
    engine = create_engine(db_url)

DEMO_PASSWORD = os.environ["DEMO_PASSWORD"]
DEMO_GYM_PASSWORD = os.environ["DEMO_GYM_PASSWORD"]
DEMO_TRAINER_PASSWORD = os.environ["DEMO_TRAINER_PASSWORD"]
DEMO_ADMIN_PASSWORD = os.environ["DEMO_ADMIN_PASSWORD"]

# (Role, Email, VerificationStatus, Password)
DEMO_PERSONAS: List[Tuple[str, str, str, str]] = [
    ("GYM_ADMIN", "gym_draft@example.com", "DRAFT", DEMO_GYM_PASSWORD),
    ("GYM_ADMIN", "gym_pending@example.com", "PENDING", DEMO_GYM_PASSWORD),
    ("GYM_ADMIN", "gym_active@example.com", "APPROVED", DEMO_GYM_PASSWORD),
    ("GYM_ADMIN", "gym_rejected@example.com", "REJECTED", DEMO_GYM_PASSWORD),
    ("TRAINER", "tr_draft@example.com", "DRAFT", DEMO_TRAINER_PASSWORD),
    ("TRAINER", "tr_pending@example.com", "PENDING", DEMO_TRAINER_PASSWORD),
    ("TRAINER", "tr_active@example.com", "APPROVED", DEMO_TRAINER_PASSWORD),
    ("TRAINER", "tr_rejected@example.com", "REJECTED", DEMO_TRAINER_PASSWORD),
    ("PLATFORM_ADMIN", "admin@example.com", None, DEMO_ADMIN_PASSWORD),
]

def seed():
    print(f"🌱 Seeding Demo Users with Role-Specific Passwords")
    print(f"  - Gym users: {DEMO_GYM_PASSWORD}")
    print(f"  - Trainer users: {DEMO_TRAINER_PASSWORD}")
    print(f"  - Admin user: {DEMO_ADMIN_PASSWORD}")
    
    with Session(engine) as session:
        for role_str, email, status, password in DEMO_PERSONAS:
            existing = session.exec(select(User).where(User.email == email)).first()
            if existing:
                # Clean sessions first
                sessions = session.exec(select(UserSession).where(UserSession.user_id == existing.id)).all()
                for s in sessions:
                    session.delete(s)

                if existing.gym:
                    session.delete(existing.gym)
                if existing.trainer:
                    session.delete(existing.trainer)
                session.delete(existing)
                session.commit()
            
            actual_role = "SAAS_ADMIN" if role_str == "PLATFORM_ADMIN" else role_str
            user = User(
                email=email,
                full_name=f"Demo {role_str} {status or 'Admin'}",
                hashed_password=get_password_hash(password),
                role=actual_role,
                is_active=True,
                is_demo=True # Mark as demo user
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            
            if role_str == "GYM_ADMIN" and status:
                gym = Gym(
                    admin_id=user.id,
                    name=f"Gym {status.capitalize()}",
                    slug=f"gym-{status.lower()}",
                    location="Demo City",
                    verification_status=status
                )
                session.add(gym)
            elif role_str == "TRAINER" and status:
                trainer = Trainer(
                    user_id=user.id,
                    bio=f"This is a {status} trainer profile.",
                    verification_status=status
                )
                session.add(trainer)
                
            session.commit()
            print(f"  ✅ {email} -> {status or 'ADMIN'}")

def clean_gyms():
    print("🧹 Cleaning Demo Gyms (is_demo=True, role=GYM_ADMIN)...")
    with Session(engine) as session:
        demo_gym_admins = session.exec(select(User).where(User.is_demo == True, User.role == "GYM_ADMIN")).all()
        for user in demo_gym_admins:
             print(f"  Deleting demo gym admin: {user.email}")
             if user.gym:
                 session.delete(user.gym)
             session.delete(user)
        session.commit()
    print("Done.")

def clean_trainers():
    print("🧹 Cleaning Demo Trainers (is_demo=True, role=TRAINER)...")
    with Session(engine) as session:
        demo_trainers = session.exec(select(User).where(User.is_demo == True, User.role == "TRAINER")).all()
        for user in demo_trainers:
             print(f"  Deleting demo trainer: {user.email}")
             if user.trainer:
                 session.delete(user.trainer)
             session.delete(user)
        session.commit()
    print("Done.")
            
def seed_gyms():
    print(f"🏋️  Seeding Demo Gyms (Password: {DEMO_PASSWORD})")
    with Session(engine) as session:
        for role_str, email, status in DEMO_PERSONAS:
            if role_str != "GYM_ADMIN" or not status:
                continue
            
            existing = session.exec(select(User).where(User.email == email)).first()
            if existing:
                # Clean sessions first
                sessions = session.exec(select(UserSession).where(UserSession.user_id == existing.id)).all()
                for s in sessions:
                    session.delete(s)

                if existing.gym:
                    session.delete(existing.gym)
                session.delete(existing)
                session.commit()
            
            user = User(
                email=email,
                full_name=f"Demo Gym {status}",
                hashed_password=get_password_hash(DEMO_PASSWORD),
                role="GYM_ADMIN",
                is_active=True,
                is_demo=True
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            
            gym = Gym(
                admin_id=user.id,
                name=f"Gym {status.capitalize()}",
                slug=f"gym-{status.lower()}",
                location="Demo City",
                verification_status=status
            )
            session.add(gym)
            session.commit()
            print(f"  ✅ {email} -> {status}")

def seed_trainers():
    print(f"👟 Seeding Demo Trainers (Password: {DEMO_PASSWORD})")
    with Session(engine) as session:
        for role_str, email, status in DEMO_PERSONAS:
            if role_str != "TRAINER" or not status:
                continue
            
            existing = session.exec(select(User).where(User.email == email)).first()
            if existing:
                # Clean sessions first
                sessions = session.exec(select(UserSession).where(UserSession.user_id == existing.id)).all()
                for s in sessions:
                    session.delete(s)

                if existing.trainer:
                    session.delete(existing.trainer)
                session.delete(existing)
                session.commit()
            
            user = User(
                email=email,
                full_name=f"Demo Trainer {status}",
                hashed_password=get_password_hash(DEMO_PASSWORD),
                role="TRAINER",
                is_active=True,
                is_demo=True
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            
            trainer = Trainer(
                user_id=user.id,
                bio=f"This is a {status} trainer profile.",
                verification_status=status
            )
            session.add(trainer)
            session.commit()
            print(f"  ✅ {email} -> {status}")

from faker import Faker
import random
from datetime import datetime, timedelta

def seed_analytics():
    print("📈 Seeding Analytics Data (Bookings & Packages)...")
    SQLModel.metadata.create_all(engine)
    fake = Faker('en_IN') # Use Indian locale for INR context
    
    with Session(engine) as session:
        # 1. Get all Gyms
        gyms = session.exec(select(Gym)).all()
        
        for gym in gyms:
            print(f"  Processing Gym: {gym.name}")
            
            # 2. Create Session Packages (Revenue Source)
            packages = [
                SessionPackage(name="Single Drop-in", price_inr=500, session_count=1, gym_id=gym.id),
                SessionPackage(name="5 Session Pack", price_inr=2200, session_count=5, gym_id=gym.id),
                SessionPackage(name="10 Session Pack", price_inr=4000, session_count=10, gym_id=gym.id),
                SessionPackage(name="Monthly Unlimited", price_inr=8000, session_count=30, gym_id=gym.id),
            ]
            for p in packages:
                session.add(p)
            session.commit()
            
            # 3. Get Trainers and a subset of Users (as Clients)
            trainers = session.exec(select(Trainer)).all() # In a real app, query by gym assoc
            # For demo simplified, assume all trainers available to all gyms or filter if needed. 
            # Ideally verify GymTrainer association, but for demo_data let's keep it simple or strictly association based?
            # Let's strictly check association if possible, or just grab all for robust seeding if assoc is empty.
            
            # Filter trainers associated with this gym
            # gym.trainers is available via relationship
            gym_trainers = gym.trainers
            if not gym_trainers:
                print(f"    ⚠️ No trainers found for {gym.name}, attempting to associate one...")
                all_trainers = session.exec(select(Trainer)).all()
                if all_trainers:
                    # Pick a random trainer to associate
                    random_trainer = random.choice(all_trainers)
                    # Create Association
                    # Need to import GymTrainer if not imported.
                    # It is imported in app.models.gym (as string?) No, GymTrainer is in app.models.associations
                    # I need to import it.
                    from app.models.associations import GymTrainer, AssociationStatus
                    assoc = GymTrainer(gym_id=gym.id, trainer_id=random_trainer.id, status=AssociationStatus.ACTIVE)
                    session.add(assoc)
                    session.commit()
                    session.refresh(gym)
                    gym_trainers = gym.trainers
                    print(f"    ✅ Associated {random_trainer.user.full_name} with {gym.name}")
                else:
                     print(f"    ❌ No trainers exist in DB at all. Skipping bookings.")
                     continue

            clients = session.exec(select(User).where(User.role == "CLIENT")).all()
            if not clients:
                # Create a few dummy clients if none exist
                for i in range(5):
                    c = User(email=f"client_{gym.id}_{i}@example.com", full_name=fake.name(), hashed_password=get_password_hash("client123"), role="CLIENT")
                    session.add(c)
                    clients.append(c)
                session.commit()

            # 4. Generate Bookings (Past 6 Months + Future 2 Weeks)
            start_date = datetime.now() - timedelta(days=180)
            end_date = datetime.now() + timedelta(days=14)
            
            current = start_date
            while current < end_date:
                # Randomly determine if a booking happens this hour
                if current.hour >= 6 and current.hour <= 20: # Operating hours 6am-8pm
                     if random.random() < 0.3: # 30% chance of booking per hour slot
                        trainer = random.choice(gym_trainers)
                        client = random.choice(clients)
                        
                        status = BookingStatus.COMPLETED if current < datetime.now() else BookingStatus.SCHEDULED
                        if current < datetime.now() and random.random() < 0.1:
                            status = BookingStatus.CANCELLED
                        
                        booking = Booking(
                            gym_id=gym.id,
                            trainer_id=trainer.id,
                            user_id=client.id,
                            start_time=current,
                            end_time=current + timedelta(hours=1),
                            status=status
                        )
                        session.add(booking)
                
                current += timedelta(hours=1)
            
            session.commit()
            print(f"    ✅ Generated bookings for {gym.name}")
            
    print("Done seeding analytics.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python demo_data.py [seed|clean|seed-gyms|seed-trainers|clean-gyms|clean-trainers]")
        sys.exit(1)
    
    cmd = sys.argv[1]
    if cmd == "seed":
        seed()
    elif cmd == "clean":
        clean()
    elif cmd == "seed-gyms":
        seed_gyms()
    elif cmd == "seed-trainers":
        seed_trainers()
    elif cmd == "clean-gyms":
        clean_gyms()
    elif cmd == "clean-trainers":
        clean_trainers()
    elif cmd == "seed-analytics":
        seed_analytics()
    else:
        print(f"Unknown command: {cmd}")
