
import requests
from app.core.security import get_password_hash
from sqlmodel import Session, select, create_engine
from app.models.user import User
from app.models.booking import Booking, BookingStatus
from app.models.workout import WorkoutSessionExercise, WorkoutSet
from app.db.session import engine
from ensure_session import ensure_session_for_today

# Setup
API_URL = "http://localhost:8000/api/v1"
TRAINER_EMAIL = "tr_active@example.com"
PASSWORD = "password123"

def get_token():
    resp = requests.post(f"{API_URL}/auth/access-token", data={"username": TRAINER_EMAIL, "password": PASSWORD})
    resp.raise_for_status()
    return resp.json()["access_token"]

def verify():
    # 1. Reset Session
    print("Resetting session...")
    # We need to run ensure_session logic. 
    # Since we are running this script inside docker (hopefully), we can import it.
    # checking imports... ensure_session is in same dir.
    ensure_session_for_today()
    
    # Get the session ID
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == TRAINER_EMAIL)).first()
        trainer = user.trainer
        booking = session.exec(select(Booking).where(Booking.trainer_id == trainer.id, Booking.status == BookingStatus.SCHEDULED)).first()
        if not booking:
            print("Failed to create session.")
            return

        print(f"Session ID: {booking.id}")
        
        # 2. Log a workout set (switch status to ATTENDED/COMPLETED implicitly? or just log)
        # The frontend uses /bookings/{id}/log
        # Payload: list of WorkoutLogItem
        token = get_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        from app.models.workout import Exercise
        
        # Create an exercise for the session if none exists
        wse = session.exec(select(WorkoutSessionExercise).where(WorkoutSessionExercise.booking_id == booking.id)).first()
        if not wse:
            print("Adding exercise to session...")
            exercise = session.exec(select(Exercise)).first()
            if not exercise:
                print("No exercises found in DB.")
                return

            wse = WorkoutSessionExercise(
                booking_id=booking.id,
                exercise_id=exercise.id,
                sets=3,
                reps=10,
                weight_kg=60
            )
            session.add(wse)
            session.commit()
            session.refresh(wse)
        
        log_payload = [
            {
                "exercise_id": wse.exercise_id,
                "sets": 1,
                "sets_data": [
                    {"set_number": 1, "weight_kg": 100, "reps": 10, "is_completed": True}
                ],
                 "notes": "API Verification"
            }
        ]
        
        print("Logging workout...")
        resp = requests.post(f"{API_URL}/bookings/{booking.id}/log", json=log_payload, headers=headers)
        if resp.status_code != 200:
            print(f"Log failed: {resp.text}")
            return

        print("Workout logged.")

        # 3. Check Analytics
        # Needs client_id. The booking has a user_id.
        client_id = booking.user_id
        
        print(f"Checking analytics for client {client_id}...")
        resp = requests.get(f"{API_URL}/trainers/{trainer.id}/clients/{client_id}/analytics/overview", headers=headers)
        if resp.status_code != 200:
             print(f"Analytics failed: {resp.text}")
             return
             
        data = resp.json()
        print("Analytics Data:", data)
        
        # Verify
        # total_sessions should be >= 1 (since we just logged one, status might become ATTENDED)
        # Wait, logging doesn't auto-complete the session in backend/api/bookings.py?
        # Let's check if status changed.
        session.refresh(booking)
        print(f"Booking Status: {booking.status}")
        
        # The fix I made was to include ATTENDED and COMPLETED.
        # Logging workout should set status to ATTENDED (or COMPLETED if finished).
        
        if booking.status not in [BookingStatus.ATTENDED, BookingStatus.COMPLETED]:
             print("Warning: Booking status is not ATTENDED/COMPLETED. It is:", booking.status)
        
        found_volume = False
        for vt in data['volume_trend']:
            # We logged 100 * 10 = 1000 volume
            if vt['volume'] >= 1000:
                found_volume = True
                break
        
        if found_volume or data['total_sessions'] > 0:
            print("SUCCESS: Analytics reflect the logged workout.")
        else:
            print("FAILURE: Analytics do not show the data.")

if __name__ == "__main__":
    verify()
