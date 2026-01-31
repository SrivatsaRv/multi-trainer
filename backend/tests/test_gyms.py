from app.models.gym import Gym

def test_create_gym_authenticated(client, test_user):
    # 1. Login to get token
    login_data = {
        "username": "testuser@example.com",
        "password": "password123"
    }
    response = client.post("/api/v1/auth/login/access-token", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Gym (Minimal Data)
    payload = {
        "name": "Iron Paradise",
        "location": "123 Muscle Beach",
        "slug": "iron-paradise"
    }
    
    response = client.post("/api/v1/gyms/", json=payload, headers=headers)
    
    # Debug info
    if response.status_code != 201:
        print(f"FAILED: {response.text}")

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == payload["name"]
    assert data["slug"] == payload["slug"]
    assert data["admin_id"] == test_user.id
    assert data["verification_status"] == "DRAFT"

def test_list_gyms(client, session, test_user):
    # Seed data
    gym1 = Gym(name="Gym 1", slug="gym-1", location="Loc 1", admin_id=test_user.id)
    gym2 = Gym(name="Gym 2", slug="gym-2", location="Loc 2", admin_id=test_user.id)
    session.add(gym1)
    session.add(gym2)
    session.commit()

    response = client.get("/api/v1/gyms/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2

def test_get_gym_by_id(client, session, test_user):
    gym = Gym(name="Target Gym", slug="target-gym", location="Loc", admin_id=test_user.id)
    session.add(gym)
    session.commit()
    session.refresh(gym)
    
    response = client.get(f"/api/v1/gyms/{gym.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Target Gym"
