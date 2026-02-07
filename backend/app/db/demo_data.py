"""
Demo Data Management Script
Manages persistent demo accounts for manual UI testing.
"""

import os
import sys
from typing import List, Tuple

from sqlmodel import Session, SQLModel, create_engine, delete, select

# Ensure we can import app modules
sys.path.append(os.getcwd())

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.associations import ClientTrainer, GymTrainer
from app.models.booking import Booking, BookingStatus, SessionPackage
from app.models.gym import Gym, VerificationStatus
from app.models.session import UserSession
from app.models.subscription import ClientSubscription, SubscriptionStatus
from app.models.trainer import Trainer
# Import Models
from app.models.user import User
from app.models.workout import (Exercise, ExerciseType, MeasurementUnit,
                                MuscleGroup, WorkoutSessionExercise,
                                WorkoutSet)

# DATABASE CONNECTION
try:
    from app.db.session import engine
except Exception:
    print("Could not import engine from app.db.session. Constructing manually...")
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/app")
    engine = create_engine(db_url)

DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "password")
DEMO_GYM_PASSWORD = os.getenv("DEMO_GYM_PASSWORD", "password")
DEMO_TRAINER_PASSWORD = os.getenv("DEMO_TRAINER_PASSWORD", "password")
DEMO_ADMIN_PASSWORD = os.getenv("DEMO_ADMIN_PASSWORD", "password")

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
    # Test personas for E2E stability
    ("GYM_ADMIN", "testuser@example.com", "APPROVED", DEMO_PASSWORD),
]


def seed():
    print(f"🌱 Seeding Demo Users with Role-Specific Passwords")
    print(f"  - Gym users: {DEMO_GYM_PASSWORD}")
    print(f"  - Trainer users: {DEMO_TRAINER_PASSWORD}")
    print(f"  - Admin user: {DEMO_ADMIN_PASSWORD}")

    SQLModel.metadata.create_all(engine)

    # Pre-seed exercises for analytics dependency
    with Session(engine) as session:
        seed_exercises(session)

    with Session(engine) as session:
        for role_str, email, status, password in DEMO_PERSONAS:
            existing = session.exec(select(User).where(User.email == email)).first()
            if existing:
                print(f"    Cleaning up existing user: {email}")
                # Clean sessions first
                session.exec(
                    delete(UserSession).where(UserSession.user_id == existing.id)
                )

                # Clean associations if any (Trainer <-> Gym, Trainer <-> Client)
                if existing.trainer:
                    session.exec(
                        delete(GymTrainer).where(
                            GymTrainer.trainer_id == existing.trainer.id
                        )
                    )
                    session.exec(
                        delete(ClientTrainer).where(
                            ClientTrainer.trainer_id == existing.trainer.id
                        )
                    )
                    session.exec(
                        delete(Trainer).where(Trainer.id == existing.trainer.id)
                    )

                if existing.gym:
                    # Deep clean gym dependencies
                    # Deep clean gym dependencies
                    gym_bookings = session.exec(
                        select(Booking).where(Booking.gym_id == existing.gym.id)
                    ).all()
                    booking_ids = [b.id for b in gym_bookings]
                    if booking_ids:
                        # Find WSEs to delete their sets first
                        wses = session.exec(
                            select(WorkoutSessionExercise).where(
                                WorkoutSessionExercise.booking_id.in_(booking_ids)
                            )
                        ).all()
                        wse_ids = [w.id for w in wses]
                        if wse_ids:
                            session.exec(
                                delete(WorkoutSet).where(
                                    WorkoutSet.session_exercise_id.in_(wse_ids)
                                )
                            )
                            session.exec(
                                delete(WorkoutSessionExercise).where(
                                    WorkoutSessionExercise.id.in_(wse_ids)
                                )
                            )

                    session.exec(
                        delete(Booking).where(Booking.gym_id == existing.gym.id)
                    )
                    # Add ClientSubscription cleanup
                    from app.models.subscription import ClientSubscription

                    session.exec(
                        delete(ClientSubscription).where(
                            ClientSubscription.gym_id == existing.gym.id
                        )
                    )

                    session.exec(
                        delete(SessionPackage).where(
                            SessionPackage.gym_id == existing.gym.id
                        )
                    )
                    session.exec(
                        delete(GymTrainer).where(GymTrainer.gym_id == existing.gym.id)
                    )
                    session.exec(delete(Gym).where(Gym.id == existing.gym.id))

                session.exec(delete(User).where(User.id == existing.id))
                session.commit()

            actual_role = "SAAS_ADMIN" if role_str == "PLATFORM_ADMIN" else role_str
            user = User(
                email=email,
                full_name=f"Demo {role_str} {status or 'Admin'}",
                hashed_password=get_password_hash(password),
                role=actual_role,
                is_active=True,
                is_demo=True,  # Mark as demo user
            )
            session.add(user)
            session.commit()
            session.refresh(user)

            if role_str == "GYM_ADMIN" and status:
                gym_names = {
                    "APPROVED": "Titan Fitness",
                    "PENDING": "Gold's Gym",
                    "DRAFT": "Anytime Fitness",
                    "REJECTED": "Local Gym",
                }

                name = gym_names.get(status, f"Gym {status.capitalize()}")
                if "testuser" in email:
                    name = "E2E Test Gym"
                gym = Gym(
                    admin_id=user.id,
                    name=name,
                    slug=name.lower().replace(" ", "-").replace("'", ""),
                    location="Demo City, India",
                    verification_status=status,
                )
                session.add(gym)
            elif role_str == "TRAINER" and status:
                trainer = Trainer(
                    user_id=user.id,
                    bio=f"This is a {status} trainer profile.",
                    verification_status=status,
                )
                session.add(trainer)

            session.commit()
            print(f"  ✅ {email} -> {status or 'ADMIN'}")

    # Finally seed the analytics data for a complete experience
    print("📈 Seeding Analytics & Workouts...")
    seed_analytics()


def clean():
    print("🧹 Cleaning ALL Demo Data (Brute Force)...")
    with Session(engine) as session:
        # Delete in strict dependency order
        print("  - Deleting WorkoutSessionExercises & Sets...")
        try:
            session.exec(delete(WorkoutSet))
            session.exec(delete(WorkoutSessionExercise))
        except Exception as e:
            print(f"    Warning: Could not delete workout data: {e}")

        print("  - Deleting ClientSubscriptions...")
        # Ensure import is available
        from app.models.subscription import ClientSubscription

        session.exec(delete(ClientSubscription))
        session.commit()

        print("  - Deleting Workout Templates & Exercises...")
        from app.models.workout import (Exercise, WorkoutTemplate,
                                        WorkoutTemplateExercise)

        session.exec(delete(WorkoutTemplateExercise))
        session.exec(delete(WorkoutTemplate))
        session.exec(delete(Exercise))
        session.commit()

        print("  - Deleting Bookings...")
        session.exec(delete(Booking))
        print("  - Deleting SessionPackages...")
        session.exec(delete(SessionPackage))
        print("  - Deleting GymTrainers...")
        session.exec(delete(GymTrainer))
        print("  - Deleting Trainers...")
        session.exec(
            delete(Trainer).where(
                Trainer.verification_status.in_(
                    ["DRAFT", "PENDING", "APPROVED", "REJECTED"]
                )
            )
        )
        # Note: Above filter is imperfect, better to rely on cascade or user.is_demo but Trainer doesn't have is_demo.
        # Actually proper way: delete trainers linked to demo users.

        # Better approach:
        # 1. Find demo users
        demo_users = session.exec(select(User).where(User.is_demo == True)).all()
        demo_user_ids = [u.id for u in demo_users]

        if not demo_user_ids:
            print("  No demo users found.")
            return

        # Delete Bookings for these users (Client or Trainer)
        # OR just delete all bookings for demo gyms?
        # Let's delete ALL bookings for now if they are just demo data?
        # No, might wipe real data if any (but this is a demo environment).
        # Safe bet: Delete bookings where trainer or user is demo.

        # Simplify: Just delete everything related to demo users
        print("  - deleting dependent data for demo users...")
        for u in demo_users:
            session.exec(delete(UserSession).where(UserSession.user_id == u.id))
            if u.trainer:
                session.exec(delete(Booking).where(Booking.trainer_id == u.trainer.id))
                session.exec(
                    delete(GymTrainer).where(GymTrainer.trainer_id == u.trainer.id)
                )
                # Delete trainer later
            if u.gym:
                session.exec(delete(Booking).where(Booking.gym_id == u.gym.id))
                session.exec(
                    delete(SessionPackage).where(SessionPackage.gym_id == u.gym.id)
                )
                session.exec(delete(GymTrainer).where(GymTrainer.gym_id == u.gym.id))
                # Delete gym later

        session.commit()

        # Now delete the primary entities
        for u in demo_users:
            if u.trainer:
                session.exec(delete(Trainer).where(Trainer.id == u.trainer.id))
            if u.gym:
                session.exec(delete(Gym).where(Gym.id == u.gym.id))

        session.commit()

        print("  - Deleting Users...")
        session.exec(delete(User).where(User.is_demo == True))
        session.commit()
    print("Done clean.")


def clean_gyms():
    print("🧹 Cleaning Demo Gyms (is_demo=True, role=GYM_ADMIN)...")
    with Session(engine) as session:
        demo_gym_admins = session.exec(
            select(User).where(User.is_demo == True, User.role == "GYM_ADMIN")
        ).all()
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
        demo_trainers = session.exec(
            select(User).where(User.is_demo == True, User.role == "TRAINER")
        ).all()
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
                sessions = session.exec(
                    select(UserSession).where(UserSession.user_id == existing.id)
                ).all()
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
                is_demo=True,
            )
            session.add(user)
            session.commit()
            session.refresh(user)

            gym_names = {
                "APPROVED": "Titan Fitness",
                "PENDING": "Gold's Gym",
                "DRAFT": "Anytime Fitness",
                "REJECTED": "Local Gym",
            }
            name = gym_names.get(status, f"Gym {status.capitalize()}")

            gym = Gym(
                admin_id=user.id,
                name=name,
                slug=name.lower().replace(" ", "-").replace("'", ""),
                location="Demo City, India",
                verification_status=status,
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
                sessions = session.exec(
                    select(UserSession).where(UserSession.user_id == existing.id)
                ).all()
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
                is_demo=True,
            )
            session.add(user)
            session.commit()
            session.refresh(user)

            trainer = Trainer(
                user_id=user.id,
                bio=f"This is a {status} trainer profile. Passionate about helping clients reach their fitness goals.",
                verification_status=status,
                experience_years=5,
                specializations=["Strength Training", "HIIT", "Nutrition"],
                certifications=[
                    {"name": "ACE CPT", "issuer": "American Council on Exercise"}
                ],
                availability={
                    "Monday": [
                        {"start": "08:00", "end": "12:00"},
                        {"start": "14:00", "end": "20:00"},
                    ],
                    "Tuesday": [
                        {"start": "08:00", "end": "12:00"},
                        {"start": "14:00", "end": "20:00"},
                    ],
                    "Wednesday": [
                        {"start": "08:00", "end": "12:00"},
                        {"start": "14:00", "end": "20:00"},
                    ],
                    "Thursday": [
                        {"start": "08:00", "end": "12:00"},
                        {"start": "14:00", "end": "20:00"},
                    ],
                    "Friday": [
                        {"start": "08:00", "end": "12:00"},
                        {"start": "14:00", "end": "20:00"},
                    ],
                    "Saturday": [{"start": "09:00", "end": "14:00"}],
                    "Sunday": [],
                },
            )
            session.add(trainer)
            session.commit()
            print(f"  ✅ {email} -> {status}")


import random
from datetime import datetime, timedelta

from faker import Faker


def seed_analytics():
    print("📈 Seeding Analytics Data (Bookings & Packages)...")
    SQLModel.metadata.create_all(engine)
    fake = Faker("en_IN")  # Use Indian locale for INR context

    with Session(engine) as session:
        # 1. Get all Gyms
        gyms = session.exec(select(Gym)).all()

        # Track trainer bookings to prevent conflicts: trainer_id -> set(start_time)
        trainer_bookings_log = {}

        # Map Category -> Exercise List (Moved up for scope access)
        template_definitions = {
            "Chest": [
                "Bench Press",
                "Incline DB Press",
                "Cable Fly",
                "Pushups",
                "Dips",
                "Chest Press Machine",
                "Pec Deck",
                "Landmine Press",
            ],
            "Shoulder": [
                "OHP",
                "Lateral Raise",
                "Front Raise",
                "Face Pulls",
                "Reverse Pec Deck",
                "Shrugs",
                "Arnold Press",
                "Upright Row",
            ],
            "Back": [
                "Pullups",
                "Lat Pulldown",
                "DB Row",
                "Barbell Row",
                "Seated Cable Row",
                "T-Bar Row",
                "Deadlift",
                "Face Pulls",
            ],
            "Biceps": [
                "Barbell Curl",
                "Hammer Curl",
                "Preacher Curl",
                "Concentration Curl",
                "Cable Curl",
                "Chin-ups",
                "Incline DB Curl",
                "EZ Bar Curl",
            ],
            "Triceps": [
                "Tricep Pushdown",
                "Skullcrushers",
                "Overhead Extension",
                "Dips",
                "Close-Grip Bench",
                "Kickbacks",
                "Rope Extension",
                "Diamond Pushups",
            ],
            "Legs": [
                "Squat",
                "Leg Press",
                "Lunges",
                "RDL",
                "Leg Extension",
                "Calf Raise",
                "Bulgarian Split Squat",
                "Hack Squat",
                "Hip Thrust",
                "Goblet Squat",
            ],
            "Core": [
                "Plank",
                "Russian Twist",
                "Leg Raise",
                "Ab Wheel",
                "Crunches",
                "Bicycle Crunches",
                "Mountain Climbers",
                "Hanging Leg Raise",
            ],
            "Cardio": [
                "Treadmill Run",
                "Rowing",
                "Cycling",
                "Jump Rope",
                "Elliptical",
                "Stair Climber",
                "Assault Bike",
                "Burpees",
            ],
            "HIIT": [
                "Burpees",
                "Box Jumps",
                "Kettlebell Swings",
                "Battle Ropes",
                "Jump Squats",
                "Mountain Climbers",
                "Sprints",
                "Thrusters",
            ],
        }

        for gym in gyms:
            print(f"  Processing Gym: {gym.name}")

            # 2. Create Session Packages (Revenue Source)
            packages = [
                SessionPackage(
                    name="Single Drop-in", price_inr=500, session_count=1, gym_id=gym.id
                ),
                SessionPackage(
                    name="5 Session Pack",
                    price_inr=2200,
                    session_count=5,
                    gym_id=gym.id,
                ),
                SessionPackage(
                    name="10 Session Pack",
                    price_inr=4000,
                    session_count=10,
                    gym_id=gym.id,
                ),
                SessionPackage(
                    name="Monthly Unlimited",
                    price_inr=8000,
                    session_count=30,
                    gym_id=gym.id,
                ),
            ]
            for p in packages:
                session.add(p)
            session.commit()

            # 3. Get Trainers and a subset of Users (as Clients)
            trainers = session.exec(
                select(Trainer)
            ).all()  # In a real app, query by gym assoc
            # For demo simplified, assume all trainers available to all gyms or filter if needed.
            # Ideally verify GymTrainer association, but for demo_data let's keep it simple or strictly association based?
            # Let's strictly check association if possible, or just grab all for robust seeding if assoc is empty.

            # Filter trainers associated with this gym
            # gym.trainers is available via relationship
            gym_trainers = gym.trainers
            if not gym_trainers:
                print(
                    f"    ⚠️ No trainers found for {gym.name}, attempting to associate one..."
                )
                all_trainers = session.exec(select(Trainer)).all()
                if all_trainers:
                    # Pick a random trainer to associate
                    random_trainer = random.choice(all_trainers)
                    # Create Association
                    # Need to import GymTrainer if not imported.
                    # It is imported in app.models.gym (as string?) No, GymTrainer is in app.models.associations
                    # I need to import it.
                    from app.models.associations import (AssociationStatus,
                                                         GymTrainer)

                    assoc = GymTrainer(
                        gym_id=gym.id,
                        trainer_id=random_trainer.id,
                        status=AssociationStatus.ACTIVE,
                    )
                    session.add(assoc)
                    session.commit()
                    session.refresh(gym)
                    gym_trainers = gym.trainers
                    print(
                        f"    ✅ Associated {random_trainer.user.full_name} with {gym.name}"
                    )
                else:
                    print(f"    ❌ No trainers exist in DB at all. Skipping bookings.")
                    continue

            # GUARANTEE: Ensure tr_active is associated with the first gym so tests always have data
            # Check if tr_active is already in gym_trainers
            # We need to find tr_active user first
            tr_active_user = session.exec(
                select(User).where(User.email == "tr_active@example.com")
            ).first()
            if (
                tr_active_user and tr_active_user.trainer and gym.id == gyms[0].id
            ):  # Only for first gym
                is_linked = any(t.id == tr_active_user.trainer.id for t in gym_trainers)
                if not is_linked:
                    from app.models.associations import (AssociationStatus,
                                                         GymTrainer)

                    assoc = GymTrainer(
                        gym_id=gym.id,
                        trainer_id=tr_active_user.trainer.id,
                        status=AssociationStatus.ACTIVE,
                    )
                    session.add(assoc)
                    session.commit()
                    session.refresh(gym)
                    gym_trainers.append(tr_active_user.trainer)
                    print(
                        f"    ✅ FORCE Associated tr_active with {gym.name} for testing"
                    )

            clients = session.exec(select(User).where(User.role == "CLIENT")).all()
            if not clients:
                # Create a few dummy clients if none exist
                # Guarantee a client named Sam for the demo
                sam = User(
                    email=f"sam_{gym.id}@example.com",
                    full_name="Sam",
                    hashed_password=get_password_hash("client123"),
                    role="CLIENT",
                )
                session.add(sam)
                clients.append(sam)

                for i in range(4):
                    c = User(
                        email=f"client_{gym.id}_{i}@example.com",
                        full_name=fake.name(),
                        hashed_password=get_password_hash("client123"),
                        role="CLIENT",
                    )
                    session.add(c)
                    clients.append(c)
                session.commit()

            # 4. Generate Bookings (Smartly per day to ensure availability match)
            start_date = datetime.now() - timedelta(days=180)
            end_date = datetime.now() + timedelta(days=60)

            # Create Subscriptions for Clients
            from app.models.subscription import (ClientSubscription,
                                                 SubscriptionStatus)

            client_subs = {}  # client_id -> Subscription

            for client in clients:
                # User Request: 8-12 sessions/month, 3 months max. So ~36 sessions.
                sub = ClientSubscription(
                    user_id=client.id,
                    gym_id=gym.id,
                    total_sessions=36,  # 12 sessions * 3 months
                    sessions_used=0,
                    start_date=start_date,
                    expiry_date=start_date + timedelta(days=90),  # 3 months expiry
                    status=SubscriptionStatus.ACTIVE,
                )
                session.add(sub)
                # Map for quick access (assuming single active sub for demo)
                client_subs[client.id] = sub
            session.commit()
            # Refresh subs
            for sub in client_subs.values():
                session.refresh(sub)

            # Helper to parse slots
            def parse_slots(slots):
                parsed = []
                for slot in slots:
                    try:
                        if isinstance(slot, str):
                            s, e = slot.split("-")
                        else:
                            s, e = slot.get("start"), slot.get("end")
                        s_h = int(s.split(":")[0])
                        e_h = int(e.split(":")[0])
                        parsed.append((s_h, e_h))
                    except:
                        continue
                return parsed

            current_day = start_date
            while current_day < end_date:
                day_name = current_day.strftime("%A")

                # Iterate through trainers and try to book them
                for trainer in gym_trainers:
                    if not trainer.availability:
                        continue
                    slots = trainer.availability.get(day_name, [])
                    if not slots:
                        continue

                    valid_hours = parse_slots(slots)  # (start_hour, end_hour) tuples

                    # Try to book 1-2 slots per trainer per day
                    if random.random() < 0.4:  # 40% chance trainer works this day
                        # Pick a random client
                        client = random.choice(clients)
                        client_sub = client_subs.get(client.id)

                        if (
                            not client_sub
                            or client_sub.sessions_used >= client_sub.total_sessions
                        ):
                            continue  # Skip if no credits

                        # Pick a valid hour
                        # Flatten valid hours: [(8,12), (14,20)] -> [8,9,10,11, 14,15,16...19]
                        possible_starts = []
                        for s_h, e_h in valid_hours:
                            possible_starts.extend(range(s_h, e_h))

                        if not possible_starts:
                            continue

                        # Decide how many bookings (1 or 2)
                        num_bookings = 1 if random.random() < 0.7 else 2
                        chosen_hours = random.sample(
                            possible_starts, min(len(possible_starts), num_bookings)
                        )

                        for h in chosen_hours:
                            booking_time = current_day.replace(
                                hour=h, minute=0, second=0, microsecond=0
                            )

                            # Check overlap locally
                            if trainer.id not in trainer_bookings_log:
                                trainer_bookings_log[trainer.id] = set()

                            if booking_time in trainer_bookings_log[trainer.id]:
                                continue

                            status = (
                                BookingStatus.COMPLETED
                                if booking_time < datetime.now()
                                else BookingStatus.SCHEDULED
                            )
                            if booking_time < datetime.now() and random.random() < 0.1:
                                status = BookingStatus.CANCELLED

                            # Use Template Keys
                            intents = list(template_definitions.keys())
                            focus = random.choice(intents)

                            try:
                                # Use BookingService
                                from app.services.booking_service import \
                                    BookingService

                                booking = BookingService.create_booking(
                                    session=session,
                                    user=client,
                                    trainer_id=trainer.id,
                                    start_time=booking_time,
                                    notes=focus,
                                )
                                # Override status/focus
                                booking.status = status
                                booking.workout_focus = focus
                                booking.notes = focus
                                session.add(booking)
                                session.commit()

                                trainer_bookings_log[trainer.id].add(booking_time)

                            except Exception as e:
                                print(f"    Skipping booking due to constraint: {e}")
                                continue

                current_day += timedelta(days=1)

            # --- Generate Workout Data Based on Templates ---
            generated_wse_count = 0

            # 1. Define Global Templates & Exercises
            from app.models.workout import (Exercise, ExerciseType,
                                            MeasurementUnit, WorkoutSet,
                                            WorkoutTemplate,
                                            WorkoutTemplateExercise)

            # Create Exercises and Templates
            template_objs = {}
            for t_name, ex_names in template_definitions.items():
                # Create Template
                tmpl = session.exec(
                    select(WorkoutTemplate).where(WorkoutTemplate.name == t_name)
                ).first()
                if not tmpl:
                    tmpl = WorkoutTemplate(
                        name=t_name, description=f"{t_name} Focus Workout"
                    )
                    session.add(tmpl)
                    session.commit()
                    session.refresh(tmpl)
                template_objs[t_name] = tmpl

                # Add Exercises
                for ex_name in ex_names:
                    # Create Exercise if not exists
                    ex = session.exec(
                        select(Exercise).where(Exercise.name == ex_name)
                    ).first()
                    if not ex:
                        # Infer type/unit roughly
                        # Infer type/unit/muscle roughly
                        category = ExerciseType.STRENGTH
                        unit = MeasurementUnit.WEIGHT_REPS
                        muscle_grp = MuscleGroup.FULL_BODY

                        # Map Template Name to Muscle Group
                        mg_map = {
                            "Chest": MuscleGroup.CHEST,
                            "Shoulder": MuscleGroup.SHOULDERS,
                            "Back": MuscleGroup.BACK,
                            "Biceps": MuscleGroup.ARMS,
                            "Triceps": MuscleGroup.ARMS,
                            "Legs": MuscleGroup.LEGS,
                            "Core": MuscleGroup.CORE,
                            "Cardio": MuscleGroup.CARDIO,
                            "HIIT": MuscleGroup.FULL_BODY,
                        }
                        muscle_grp = mg_map.get(t_name, MuscleGroup.FULL_BODY)

                        if t_name in ["Cardio", "HIIT"]:
                            category = ExerciseType.CARDIO
                            unit = MeasurementUnit.TIME_DISTANCE
                        elif t_name == "Core":
                            unit = MeasurementUnit.REPS_ONLY

                        ex = Exercise(
                            name=ex_name,
                            category=category,
                            unit_type=unit,
                            muscle_group=muscle_grp,
                        )
                        session.add(ex)
                        session.commit()
                        session.refresh(ex)

                    # Link to Template
                    link = session.exec(
                        select(WorkoutTemplateExercise).where(
                            WorkoutTemplateExercise.template_id == tmpl.id,
                            WorkoutTemplateExercise.exercise_id == ex.id,
                        )
                    ).first()
                    if not link:
                        wte = WorkoutTemplateExercise(
                            template_id=tmpl.id, exercise_id=ex.id, sets=3, reps=10
                        )
                        session.add(wte)
            session.commit()

            # 2. Enrich Past Bookings with Workout Focus & Logs
            # We filter by gym_id and date range we just processed
            start_date_q = datetime.now() - timedelta(days=180 + 1)

            gym_bookings = session.exec(
                select(Booking).where(
                    Booking.gym_id == gym.id,
                    Booking.status == BookingStatus.COMPLETED,
                    Booking.start_time >= start_date_q,
                )
            ).all()

            for booking in gym_bookings:
                # Assign random focus if not set
                if not booking.workout_focus:
                    focus = random.choice(list(template_definitions.keys()))
                    booking.workout_focus = focus
                    booking.notes = focus  # Legacy support
                    session.add(booking)
                else:
                    focus = booking.workout_focus

                # Generate Logs based on Template
                tmpl = template_objs.get(focus)
                if tmpl:
                    # Get exercises for this template
                    wte_links = session.exec(
                        select(WorkoutTemplateExercise).where(
                            WorkoutTemplateExercise.template_id == tmpl.id
                        )
                    ).all()

                    weeks_since_start = (
                        booking.start_time.date()
                        - (datetime.now() - timedelta(days=180)).date()
                    ).days // 7
                    progression_factor = max(0, weeks_since_start)

                    for link in wte_links:
                        # 50% chance to do each exercise in template
                        if random.random() < 0.5:
                            wse = WorkoutSessionExercise(
                                booking_id=booking.id,
                                exercise_id=link.exercise_id,
                                sets=link.sets,
                                reps=link.reps + (progression_factor // 2),
                                weight_kg=20 + (progression_factor * 2.5),
                                notes="Auto-generated from Template",
                            )
                            session.add(wse)
                            session.commit()
                            session.refresh(wse)

                            # Create Granular Sets
                            for s_num in range(1, link.sets + 1):
                                w_set = WorkoutSet(
                                    session_exercise_id=wse.id,
                                    set_number=s_num,
                                    reps=wse.reps,
                                    weight_kg=wse.weight_kg,
                                    rpe=7.0
                                    + (
                                        random.random() * 2
                                    ),  # Random RPE between 7 and 9
                                )
                                session.add(w_set)

                            generated_wse_count += 1

            session.commit()
            print(
                f"    ✅ Generated {generated_wse_count} workout logs for {gym.name} using Global Templates"
            )

            # GUARANTEE: Create a booking for TODAY for tr_active if this is the first gym
            # This ensures E2E tests which look for "Today's Schedule" always find something
            if gym.id == gyms[0].id:
                tr_active_user = session.exec(
                    select(User).where(User.email == "tr_active@example.com")
                ).first()
                if tr_active_user and tr_active_user.trainer:
                    trainer_obj = tr_active_user.trainer
                    # Find a client
                    any_client = clients[0] if clients else None

                    # FORCE REVENUE: Generate 10 past completed sessions
                    if any_client:
                        for i in range(1, 11):
                            past_time = datetime.now() - timedelta(
                                days=i * 2
                            )  # Every 2 days
                            past_time = past_time.replace(
                                hour=10, minute=0, second=0, microsecond=0
                            )

                            # Check avail (assuming Mon-Fri 8-8 covers it, or skip check for force)
                            # We'll skip check for this guaranteed data to ensure revenue shows up.
                            b = Booking(
                                gym_id=gym.id,
                                trainer_id=trainer_obj.id,
                                user_id=any_client.id,
                                start_time=past_time,
                                end_time=past_time + timedelta(hours=1),
                                status=BookingStatus.COMPLETED,
                                notes="Guaranteed Past Session",
                            )
                            session.add(b)

                            # Deduct credit
                            sub = client_subs.get(any_client.id)
                            if sub:
                                sub.sessions_used += 1
                                session.add(sub)

                        session.commit()

                    if any_client:
                        now = datetime.now()
                        # Book for next full hour
                        start_time = now.replace(
                            minute=0, second=0, microsecond=0
                        ) + timedelta(hours=1)
                        if (
                            start_time.hour > 20
                        ):  # If too late, book for 8pm today (or just let it be past?)
                            start_time = now.replace(
                                hour=20, minute=0, second=0, microsecond=0
                            )

                        end_time = start_time + timedelta(hours=1)

                        # Check if already booked (though unlikely with random, but good to be safe)
                        if start_time not in trainer_bookings_log.get(
                            trainer_obj.id, set()
                        ):
                            booking = Booking(
                                gym_id=gym.id,
                                trainer_id=trainer_obj.id,
                                user_id=any_client.id,
                                start_time=start_time,
                                end_time=end_time,
                                status=BookingStatus.SCHEDULED,
                                notes="Guaranteed Session for Testing",
                            )
                            session.add(booking)


def seed_exercises(session: Session):
    print("Seeding Exercise Library...")
    SQLModel.metadata.create_all(engine)

    exercises_data = {
        MuscleGroup.LEGS: [
            ("Squat", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("Leg Press", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("Lunges", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("RDL", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("Leg Extension", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("Calf Raise", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("Goblet Squat", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
        ],
        MuscleGroup.CHEST: [
            ("Bench Press", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("Incline DB Press", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("Cable Fly", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("Pushups", ExerciseType.STRENGTH, MeasurementUnit.REPS_ONLY),
            ("Dips", ExerciseType.STRENGTH, MeasurementUnit.REPS_ONLY),
        ],
        MuscleGroup.BACK: [
            ("Pullups", ExerciseType.STRENGTH, MeasurementUnit.REPS_ONLY),
            ("Lat Pulldown", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("DB Row", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
        ],
        MuscleGroup.ARMS: [
            ("Barbell Curl", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("Hammer Curl", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
        ],
        MuscleGroup.SHOULDERS: [
            ("OHP", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("Lateral Raise", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("Front Raise", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
        ],
        MuscleGroup.CORE: [
            ("Plank", ExerciseType.STRENGTH, MeasurementUnit.TIME_ONLY),
            ("Russian Twist", ExerciseType.STRENGTH, MeasurementUnit.REPS_ONLY),
        ],
        MuscleGroup.FULL_BODY: [
            ("Burpees", ExerciseType.HIIT, MeasurementUnit.REPS_ONLY),
            ("Box Jumps", ExerciseType.HIIT, MeasurementUnit.REPS_ONLY),
            ("Kettlebell Swings", ExerciseType.HIIT, MeasurementUnit.WEIGHT_REPS),
            ("Battle Ropes", ExerciseType.HIIT, MeasurementUnit.TIME_ONLY),
        ],
        MuscleGroup.CARDIO: [
            ("Treadmill Run", ExerciseType.CARDIO, MeasurementUnit.TIME_DISTANCE),
            ("Rowing", ExerciseType.CARDIO, MeasurementUnit.TIME_DISTANCE),
            ("Cycling", ExerciseType.CARDIO, MeasurementUnit.TIME_DISTANCE),
            ("Jump Rope", ExerciseType.CARDIO, MeasurementUnit.TIME_ONLY),
        ],
    }

    created_count = 0
    for muscle_grp, exercises in exercises_data.items():
        for name, ex_type, unit in exercises:
            existing = session.exec(
                select(Exercise).where(Exercise.name == name)
            ).first()
            if not existing:
                ex = Exercise(
                    name=name, category=ex_type, unit_type=unit, muscle_group=muscle_grp
                )
                session.add(ex)
                created_count += 1

    session.commit()
    print(f"✅ Created {created_count} exercises.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(
            "Usage: python demo_data.py [seed|clean|seed-gyms|seed-trainers|clean-gyms|clean-trainers]"
        )
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
    elif cmd == "seed-analytics":
        with Session(engine) as session:
            seed_exercises(session)
        seed_analytics()
    else:
        print(f"Unknown command: {cmd}")
