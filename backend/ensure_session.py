from datetime import datetime, timedelta
from sqlmodel import Session, select
from app.db.session import engine
from app.models.user import User
from app.models.booking import Booking, BookingStatus
from app.models.gym import Gym

def ensure_session_for_today():
    with Session(engine) as session:
        # Get Trainer
        user = session.exec(select(User).where(User.email == "tr_active@example.com")).first()
        if not user or not user.trainer:
            print("Trainer not found")
            return None

        trainer = user.trainer
        
        # Check for booking today
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        existing = session.exec(select(Booking).where(
            Booking.trainer_id == trainer.id,
            Booking.start_time >= today_start,
            Booking.start_time < today_end
        )).first()
        
        if existing:
            print(f"Session exists for today: {existing.id}. Deleting for clean test state.")
            
            # Manual cascade delete with raw SQL to be robust
            from sqlalchemy import text
            
            # Delete sets
            session.exec(text(f"DELETE FROM workoutset WHERE session_exercise_id IN (SELECT id FROM workoutsessionexercise WHERE booking_id = {existing.id})"))
            # Delete exercises
            session.exec(text(f"DELETE FROM workoutsessionexercise WHERE booking_id = {existing.id}"))
            # Delete booking
            session.exec(text(f"DELETE FROM booking WHERE id = {existing.id}"))
            
            session.commit()
            print("Deleted existing session and related data.")
            # Continue to create new one

        # Create one
        print("Creating session for today...")
        gym = session.exec(select(Gym).where(Gym.id == 1)).first() # valid gym
        if not gym:
            gym = session.exec(select(Gym)).first()

        client = session.exec(select(User).where(User.role == "CLIENT")).first()
        
        booking = Booking(
            gym_id=gym.id,
            trainer_id=trainer.id,
            user_id=client.id,
            start_time=datetime.now().replace(hour=14, minute=0, second=0, microsecond=0),
            end_time=datetime.now().replace(hour=15, minute=0, second=0, microsecond=0),
            status=BookingStatus.SCHEDULED,
            workout_focus="Strength",
            notes="Test Session"
        )
        session.add(booking)
        session.commit()
        session.refresh(booking)
        print(f"Created session {booking.id} for {booking.start_time}")
        return booking

if __name__ == "__main__":
    ensure_session_for_today()
