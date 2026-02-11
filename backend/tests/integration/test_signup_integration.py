import pytest

from app.models.user import UserRole


def test_signup_and_onboarding_flow(client):
    # 1. Register a new trainer
    register_payload = {
        "email": "integration_trainer@example.com",
        "password": "strongpassword123",
        "full_name": "Integration Trainer",
        "role": "TRAINER",
    }

    response = client.post("/api/v1/auth/register", json=register_payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    token = data["access_token"]
    user_id = data["user"]["id"]

    # Verify User is created and Role is correct
    assert data["user"]["role"] == "TRAINER"

    # 2. Onboard (Create Profile / Update Profile)
    # This hits the endpoint that was failing before the fix
    headers = {"Authorization": f"Bearer {token}"}
    onboarding_payload = {"bio": "I am an integration test trainer."}

    response = client.post(
        "/api/v1/trainers/", json=onboarding_payload, headers=headers
    )

    # Should be 201 Created (or 200 OK depending on implementation, but standard create is 201)
    # Since we are updating, it might return the object.
    assert response.status_code == 201, f"Failed to onboard: {response.text}"

    trainer_data = response.json()
    assert trainer_data["bio"] == onboarding_payload["bio"]
    assert trainer_data["user_id"] == user_id

    # 3. Verify Trainer List contains this trainer
    response = client.get("/api/v1/trainers/")
    assert response.status_code == 200
    trainers = response.json()

    found = False
    for t in trainers:
        if t["user_id"] == user_id:
            assert t["bio"] == onboarding_payload["bio"]
            found = True
            break
    assert found, "Trainer not found in list"
