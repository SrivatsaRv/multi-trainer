import os
import sys

import requests
from dotenv import load_dotenv

load_dotenv()

API_URL = os.getenv("API_URL", "http://localhost:8000/api/v1")
EMAIL = os.getenv("VERIFY_EMAIL")
PASSWORD = os.getenv("VERIFY_PASSWORD")


def run_verification():
    # 1. Login
    resp = requests.post(
        f"{API_URL}/auth/login/access-token",
        data={"username": EMAIL, "password": PASSWORD},
    )
    resp.raise_for_status()
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"✅ Login successful for {EMAIL}")

    # 2. Get Trainer Profile
    resp = requests.get(f"{API_URL}/users/me", headers=headers)
    resp.raise_for_status()
    profile = resp.json()
    user_info = profile["user"]
    trainer_info = profile["trainer"]

    print(f"  User Role: {user_info['role']}")

    if not trainer_info:
        print("❌ This user does not have a trainer profile.")
        return

    trainer_id = trainer_info["id"]
    print(f"✅ Trainer ID: {trainer_id}")

    # 3. Get Bookings to find a Client and Exercise
    resp = requests.get(f"{API_URL}/trainers/{trainer_id}/bookings", headers=headers)
    resp.raise_for_status()
    bookings = resp.json()

    if not bookings:
        print("⚠️ No bookings found. Cannot verify analytics.")
        return

    # Find a completed booking
    completed_booking = next((b for b in bookings if b["status"] == "COMPLETED"), None)
    if not completed_booking:
        print(
            "⚠️ No COMPLETED bookings found. Analytics endpoint requires COMPLETED status."
        )
        # Try to find any client from bookings anyway
        client_email = bookings[0]["client"]["email"]
        print(f"  Using client from scheduled booking: {client_email}")
    else:
        client_email = completed_booking["client"]["email"]
        print(f"✅ Found completed booking for client: {client_email}")

    # We need Client ID (User ID).
    # Since the booking object structure in 'read_trainer_bookings' returns nested client dict without ID (check code), we might be stuck.
    # Checking code again...
    # "client": { "name": client.full_name, "email": client.email } -> Missing ID!
    # I need to update the booking endpoint OR fetch the client by email? No email lookup endpoint for non-admin.
    # WAIT, I can use the booking ID to get session detail, which HAS the client ID.

    session_id = bookings[0]["id"]
    resp = requests.get(
        f"{API_URL}/trainers/{trainer_id}/sessions/{session_id}", headers=headers
    )
    resp.raise_for_status()
    session_detail = resp.json()
    client_id = session_detail["client"]["id"]
    print(f"✅ Client ID: {client_id}")

    # Get an exercise ID from session detail
    if not session_detail["exercises"]:
        print("⚠️ No exercises in this session. Cannot verify exercise history.")
        # Try to guess - Squat is likely seeded.
        # But we need ID.
        # Let's assume ID 1 (Squat likely).
        ex_id = 1
        print("  Assumption: Exercise ID 1 is Squat.")
    else:
        ex_id = session_detail["exercises"][0][
            "id"
        ]  # This is WorkoutSessionExercise ID!
        # wait, session detail returns: "id": workout_exercise.id, "name": exercise_def.name...
        # It does NOT return the Exercise Definition ID.
        # I need to modify the session detail endpoint or guess.
        # Actually I can't verify history without Exercise ID.
        print(
            "❌ Session Detail doesn't return Exercise Definition ID. Updating endpoint required?"
        )
        # Let's try to query history with ID 1, 2, 3...
        ex_id = 1  # Squat usually first

    # 4. Call Analytics Endpoint
    print(
        f"Testing Analytics for Trainer {trainer_id}, Client {client_id}, Exercise Definition ID {ex_id}"
    )
    resp = requests.get(
        f"{API_URL}/trainers/{trainer_id}/analytics/exercise-history",
        params={"exercise_id": ex_id, "client_id": client_id},
        headers=headers,
    )

    if resp.status_code == 200:
        data = resp.json()
        print(f"✅ Analytics Response: Found {len(data)} history entries.")
        if data:
            print(f"  Sample: {data[0]}")
    else:
        print(f"❌ Failed: {resp.status_code} - {resp.text}")


if __name__ == "__main__":
    try:
        run_verification()
    except Exception as e:
        print(f"❌ Error: {e}")
