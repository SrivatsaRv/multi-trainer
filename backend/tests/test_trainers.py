from app.core.security import get_password_hash
from app.models.trainer import Trainer
from app.models.user import User, UserRole
from tests.test_constants import TEST_USER_PASSWORD


def test_create_trainer_authenticated(client, session):
    # 1. Create a Trainer User (as test_user is GYM_ADMIN usually)
    user2 = User(
        email="trainer@example.com",
        full_name="New Trainer",
        hashed_password=get_password_hash(TEST_USER_PASSWORD),
        role=UserRole.TRAINER,
        is_active=True,
    )
    session.add(user2)
    session.commit()
    session.refresh(user2)

    # 2. Login
    login_data = {"username": "trainer@example.com", "password": TEST_USER_PASSWORD}
    response = client.post("/api/v1/auth/access-token", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Create Trainer (Minimal)
    payload = {"bio": "Expert in HIIT and Yoga."}

    response = client.post("/api/v1/trainers/", json=payload, headers=headers)

    if response.status_code != 201:
        print(f"FAILED: {response.text}")

    assert response.status_code == 201
    data = response.json()
    assert data["bio"] == payload["bio"]
    assert data["user_id"] == user2.id
    assert data["verification_status"] == "PENDING"


def test_list_trainers(client, session):
    # Manual seed
    user = User(
        email="trainer2@example.com",
        hashed_password=get_password_hash("pass"),
        role=UserRole.TRAINER,
    )
    session.add(user)
    session.commit()

    trainer = Trainer(bio="Bio 1", user_id=user.id)
    session.add(trainer)
    session.commit()

    response = client.get("/api/v1/trainers/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["bio"] == "Bio 1"
