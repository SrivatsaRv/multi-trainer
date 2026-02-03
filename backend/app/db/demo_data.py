"""
Demo Data Management Script
Manages persistent demo accounts for manual UI testing.
"""
import sys
import os
from sqlmodel import Session, select, delete, create_engine, SQLModel
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
    from app.models.associations import GymTrainer
    # Need to import where WorkoutSessionExercise is defined, likely app.models.workout
    from app.models.workout import WorkoutSessionExercise, Exercise, ExerciseType, MeasurementUnit
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
                print(f"    Cleaning up existing user: {email}")
                # Clean sessions first
                session.exec(delete(UserSession).where(UserSession.user_id == existing.id))
                
                # Clean associations if any (Trainer <-> Gym)
                if existing.trainer:
                    session.exec(delete(GymTrainer).where(GymTrainer.trainer_id == existing.trainer.id))
                    session.exec(delete(Trainer).where(Trainer.id == existing.trainer.id))
                
                if existing.gym:
                    # Deep clean gym dependencies
                    session.exec(delete(Booking).where(Booking.gym_id == existing.gym.id))
                    session.exec(delete(SessionPackage).where(SessionPackage.gym_id == existing.gym.id))
                    session.exec(delete(GymTrainer).where(GymTrainer.gym_id == existing.gym.id))
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
                is_demo=True # Mark as demo user
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
                gym = Gym(
                    admin_id=user.id,
                    name=name,
                    slug=name.lower().replace(" ", "-").replace("'", ""),
                    location="Demo City, India",
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
            
def clean():
    print("🧹 Cleaning ALL Demo Data (Brute Force)...")
    with Session(engine) as session:
        # Delete in strict dependency order
        print("  - Deleting WorkoutSessionExercises...")
        try:
             session.exec(delete(WorkoutSessionExercise))
        except Exception:
             print("    (WorkoutSessionExercise table might not exist or be empty, skipping)")

        print("  - Deleting Bookings...")
        session.exec(delete(Booking))
        print("  - Deleting SessionPackages...")
        session.exec(delete(SessionPackage))
        print("  - Deleting GymTrainers...")
        session.exec(delete(GymTrainer))
        print("  - Deleting Trainers...")
        session.exec(delete(Trainer).where(Trainer.verification_status.in_(["DRAFT", "PENDING", "APPROVED", "REJECTED"]))) 
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
                session.exec(delete(GymTrainer).where(GymTrainer.trainer_id == u.trainer.id))
                # Delete trainer later
            if u.gym:
                session.exec(delete(Booking).where(Booking.gym_id == u.gym.id))
                session.exec(delete(SessionPackage).where(SessionPackage.gym_id == u.gym.id))
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
        
        # Track trainer bookings to prevent conflicts: trainer_id -> set(start_time)
        trainer_bookings_log = {} 
        
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
            
            # GUARANTEE: Ensure tr_active is associated with the first gym so tests always have data
            # Check if tr_active is already in gym_trainers
            # We need to find tr_active user first
            tr_active_user = session.exec(select(User).where(User.email == "tr_active@example.com")).first()
            if tr_active_user and tr_active_user.trainer and gym.id == gyms[0].id: # Only for first gym
                is_linked = any(t.id == tr_active_user.trainer.id for t in gym_trainers)
                if not is_linked:
                     from app.models.associations import GymTrainer, AssociationStatus
                     assoc = GymTrainer(gym_id=gym.id, trainer_id=tr_active_user.trainer.id, status=AssociationStatus.ACTIVE)
                     session.add(assoc)
                     session.commit()
                     session.refresh(gym)
                     gym_trainers.append(tr_active_user.trainer)
                     print(f"    ✅ FORCE Associated tr_active with {gym.name} for testing")

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
                # Determine if a booking happens this hour
                # Operating hours 6am-8pm, bookings are hourly on the dot
                if current.hour >= 6 and current.hour <= 20: 
                     if random.random() < 0.3: # 30% chance of booking per slot
                        trainer = random.choice(gym_trainers)
                        client = random.choice(clients)
                        # Ensure trainer isn't already booked at this time
                        if trainer.id not in trainer_bookings_log:
                            trainer_bookings_log[trainer.id] = set()
                        
                        booking_time_key = current.replace(minute=0, second=0, microsecond=0)
                        
                        if booking_time_key in trainer_bookings_log[trainer.id]:
                            continue # Skip this slot, trainer is busy
                            
                        # Suggest status based on time
                        status = BookingStatus.COMPLETED if current < datetime.now() else BookingStatus.SCHEDULED
                        if current < datetime.now() and random.random() < 0.1:
                            status = BookingStatus.CANCELLED

                        # Realistic Workout Intents
                        intents = [
                            "Legs", "Chest", "Shoulder and Core", 
                            "HIIT", "Cardio", "Back and Biceps"
                        ]
                        
                        booking = Booking(
                            gym_id=gym.id,
                            trainer_id=trainer.id,
                            user_id=client.id,
                            start_time=booking_time_key,
                            end_time=(current + timedelta(hours=1)).replace(minute=0, second=0, microsecond=0),
                            status=status,
                            notes=random.choice(intents) # Using notes field for Intent for now
                        )
                        session.add(booking)
                        trainer_bookings_log[trainer.id].add(booking_time_key)
                
                current += timedelta(hours=1)
            
            session.commit()
            
            # --- Generate Workout Data (Progressive Overload) ---
            generated_wse_count = 0
            # Retrieve all bookings just added via query (since we committed)
            # We filter by gym_id and date range we just processed
            start_date_q = datetime.now() - timedelta(days=180 + 1)
            end_date_q = datetime.now() + timedelta(days=14 + 1)
            
            gym_bookings = session.exec(select(Booking).where(
                Booking.gym_id == gym.id, 
                Booking.status == BookingStatus.COMPLETED,
                Booking.start_time >= start_date_q
            )).all()
            
            intent_map = {
                "Legs": ["Squat", "Leg Press", "Lunges", "RDL", "Leg Extension", "Calf Raise"],
                "Chest": ["Bench Press", "Incline DB Press", "Cable Fly", "Pushups", "Dips"],
                "Back and Biceps": ["Pullups", "Lat Pulldown", "DB Row", "Barbell Curl", "Hammer Curl"],
                "Shoulder and Core": ["OHP", "Lateral Raise", "Front Raise", "Plank", "Russian Twist"],
                "HIIT": ["Burpees", "Box Jumps", "Kettlebell Swings", "Battle Ropes"],
                "Cardio": ["Treadmill Run", "Rowing", "Cycling", "Jump Rope"]
            }

            for booking in gym_bookings:
                if not booking.notes: continue
                
                relevant_exercises = intent_map.get(booking.notes, [])
                if not relevant_exercises: continue

                # Calculate "Weeks Ago" for progression
                weeks_since_start = (booking.start_time.date() - (datetime.now() - timedelta(days=180)).date()).days // 7
                progression_factor = max(0, weeks_since_start) 

                for ex_name in relevant_exercises:
                    exercise = session.exec(select(Exercise).where(Exercise.name == ex_name)).first()
                    if exercise:
                        sets = 3
                        reps = 10
                        weight = None
                        duration = None
                        
                        if exercise.unit_type == MeasurementUnit.WEIGHT_REPS:
                            base_weight = 40.0 
                            weight = base_weight + (progression_factor * 2.5) 
                            weight += random.choice([-2.5, 0, 2.5])
                            
                        elif exercise.unit_type == MeasurementUnit.REPS_ONLY:
                            base_reps = 10
                            reps = base_reps + progression_factor
                            
                        elif exercise.unit_type == MeasurementUnit.TIME_ONLY:
                            base_time = 30 
                            duration = base_time + (progression_factor * 5)
                            
                        elif exercise.unit_type == MeasurementUnit.TIME_DISTANCE:
                             duration = 600 + (progression_factor * 30) 
                             # distance logic...
                        
                        # Check existance to avoid dupes if re-running
                        # existing_wse = session.exec(select(WorkoutSessionExercise).where(WorkoutSessionExercise.booking_id == booking.id, WorkoutSessionExercise.exercise_id == exercise.id)).first()
                        # if not existing_wse:
                        wse = WorkoutSessionExercise(
                            booking_id=booking.id,
                            exercise_id=exercise.id,
                            sets=sets,
                            reps=reps,
                            weight_kg=weight,
                            duration_seconds=duration,
                            notes="Generated"
                        )
                        session.add(wse)
                        generated_wse_count += 1
            
            session.commit()
            print(f"    ✅ Generated {generated_wse_count} workout logs for {gym.name}")

            # GUARANTEE: Create a booking for TODAY for tr_active if this is the first gym
            # This ensures E2E tests which look for "Today's Schedule" always find something
            if gym.id == gyms[0].id:
                 tr_active_user = session.exec(select(User).where(User.email == "tr_active@example.com")).first()
                 if tr_active_user and tr_active_user.trainer:
                     # Find a client
                     any_client = clients[0] if clients else None
                     if any_client:
                         now = datetime.now()
                         # Book for next full hour
                         start_time = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
                         if start_time.hour > 20: # If too late, book for 8pm today (or just let it be past?)
                             start_time = now.replace(hour=20, minute=0, second=0, microsecond=0)
                         
                         end_time = start_time + timedelta(hours=1)
                         
                         # Check if already booked (though unlikely with random, but good to be safe)
                         if start_time not in trainer_bookings_log.get(tr_active_user.trainer.id, set()):
                             booking = Booking(
                                 gym_id=gym.id,
                                 trainer_id=tr_active_user.trainer.id,
                                 user_id=any_client.id,
                                 start_time=start_time,
                                 end_time=end_time,
                                 status=BookingStatus.SCHEDULED,
                                 notes="Guaranteed Session for Testing"
                             )
                             session.add(booking)


def seed_exercises(session: Session):
    print("Seeding Exercise Library...")
    SQLModel.metadata.create_all(engine)
    
    exercises_data = {
        "Legs": [
            ("Squat", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("Leg Press", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("Lunges", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("RDL", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("Leg Extension", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("Calf Raise", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("Goblet Squat", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
        ],
        "Chest": [
            ("Bench Press", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("Incline DB Press", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("Cable Fly", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("Pushups", ExerciseType.STRENGTH, MeasurementUnit.REPS_ONLY),
            ("Dips", ExerciseType.STRENGTH, MeasurementUnit.REPS_ONLY),
        ],
        "Back and Biceps": [
            ("Pullups", ExerciseType.STRENGTH, MeasurementUnit.REPS_ONLY),
            ("Lat Pulldown", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("DB Row", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("Barbell Curl", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("Hammer Curl", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
        ],
        "Shoulder and Core": [
            ("OHP", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("Lateral Raise", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("Front Raise", ExerciseType.STRENGTH, MeasurementUnit.WEIGHT_REPS),
            ("Plank", ExerciseType.STRENGTH, MeasurementUnit.TIME_ONLY),
            ("Russian Twist", ExerciseType.STRENGTH, MeasurementUnit.REPS_ONLY),
        ],
        "HIIT": [
            ("Burpees", ExerciseType.HIIT, MeasurementUnit.REPS_ONLY),
            ("Box Jumps", ExerciseType.HIIT, MeasurementUnit.REPS_ONLY),
            ("Kettlebell Swings", ExerciseType.HIIT, MeasurementUnit.WEIGHT_REPS),
            ("Battle Ropes", ExerciseType.HIIT, MeasurementUnit.TIME_ONLY),
        ],
        "Cardio": [
            ("Treadmill Run", ExerciseType.CARDIO, MeasurementUnit.TIME_DISTANCE),
            ("Rowing", ExerciseType.CARDIO, MeasurementUnit.TIME_DISTANCE),
            ("Cycling", ExerciseType.CARDIO, MeasurementUnit.TIME_DISTANCE),
            ("Jump Rope", ExerciseType.CARDIO, MeasurementUnit.TIME_ONLY),
        ]
    }

    created_count = 0
    for category, exercises in exercises_data.items():
        for name, ex_type, unit in exercises:
            existing = session.exec(select(Exercise).where(Exercise.name == name)).first()
            if not existing:
                ex = Exercise(name=name, category=ex_type, unit_type=unit)
                session.add(ex)
                created_count += 1
    
    session.commit()
    print(f"✅ Created {created_count} exercises.")

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
        with Session(engine) as session:
            seed_exercises(session)
        seed_analytics()
    else:
        print(f"Unknown command: {cmd}")
