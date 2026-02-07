import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.core.security import get_password_hash
from app.db.session import get_session
from app.main import app
from app.models.user import User, UserRole

# Use in-memory SQLite for tests
# check_same_thread=False is needed for FastAPI's threading
TEST_DATABASE_URL = "sqlite://"
engine = create_engine(
    TEST_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool
)


@pytest.fixture(name="session")
def session_fixture():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


from tests.test_constants import TEST_USER_EMAIL, TEST_USER_PASSWORD


@pytest.fixture(name="test_user")
def test_user_fixture(session: Session):
    print(f"Hashing password: '{TEST_USER_PASSWORD}' type: {type(TEST_USER_PASSWORD)}")
    user = User(
        email=TEST_USER_EMAIL,
        full_name="Test User",
        hashed_password=get_password_hash(TEST_USER_PASSWORD),
        role=UserRole.GYM_ADMIN,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="token_headers")
def token_headers_fixture(client: TestClient, test_user: User):
    from tests.test_constants import TEST_USER_EMAIL, TEST_USER_PASSWORD

    data = {"username": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
    response = client.post("/api/v1/auth/access-token", data=data)
    access_token = response.json()["access_token"]
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture(name="auth_client")
def auth_client_fixture(client: TestClient, token_headers):
    client.headers.update(token_headers)
    return client


@pytest.fixture(name="trainer_user")
def trainer_user_fixture(session: Session):
    from app.core.security import get_password_hash
    from tests.test_constants import TEST_USER_PASSWORD

    user = User(
        email="trainer@example.com",
        full_name="Trainer User",
        hashed_password=get_password_hash(TEST_USER_PASSWORD),
        role=UserRole.TRAINER,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="trainer_user_token_headers")
def trainer_user_token_headers_fixture(client: TestClient, trainer_user: User):
    from tests.test_constants import TEST_USER_PASSWORD

    data = {"username": trainer_user.email, "password": TEST_USER_PASSWORD}
    response = client.post("/api/v1/auth/access-token", data=data)
    access_token = response.json()["access_token"]
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture(name="trainer_data")
def trainer_data_fixture(session: Session, trainer_user: User):
    from datetime import datetime, timedelta

    from app.models.booking import Booking, BookingStatus
    from app.models.gym import Gym
    from app.models.trainer import Trainer

    # 1. Create Trainer Profile
    trainer = Trainer(
        user_id=trainer_user.id,
        bio="Test Trainer",
        availability={"Monday": ["09:00-17:00"]},
    )
    session.add(trainer)
    session.commit()
    session.refresh(trainer)

    # 1.5 Create Gym Admin
    admin_user = User(
        email="gym_admin@example.com",
        full_name="Gym Admin",
        hashed_password="hash",
        role=UserRole.GYM_ADMIN,
        is_active=True,
    )
    session.add(admin_user)
    session.commit()  # Commit to get ID
    session.refresh(admin_user)

    # 2. Create Gym
    gym = Gym(
        name="Test Gym",
        slug="test-gym",
        location="Test Location",
        admin_id=admin_user.id,
    )
    session.add(gym)

    # 3. Create Client (User)
    client_user = User(
        email="client@example.com",
        full_name="Client User",
        hashed_password="hash",
        role=UserRole.CLIENT,
        is_active=True,
    )
    session.add(client_user)
    session.commit()

    # 4. Create Booking
    booking = Booking(
        trainer_id=trainer.id,
        user_id=client_user.id,
        gym_id=gym.id,
        start_time=datetime.now(),
        end_time=datetime.now() + timedelta(hours=1),
        status=BookingStatus.SCHEDULED,
    )
    session.add(booking)
    session.commit()
    session.refresh(booking)

    return {"trainer": trainer, "gym": gym, "client": client_user, "booking": booking}
