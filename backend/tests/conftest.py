import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.db.session import get_session
from app.models.user import User, UserRole
from app.core.security import get_password_hash

# Use in-memory SQLite for tests
# check_same_thread=False is needed for FastAPI's threading
TEST_DATABASE_URL = "sqlite://"
engine = create_engine(
    TEST_DATABASE_URL, 
    connect_args={"check_same_thread": False}, 
    poolclass=StaticPool
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

@pytest.fixture(name="test_user")
def test_user_fixture(session: Session):
    print(f"Hashing password: 'password123' type: {type('password123')}")
    user = User(
        email="testuser@example.com",
        full_name="Test User",
        hashed_password=get_password_hash("password123"),
        role=UserRole.GYM_ADMIN,
        is_active=True
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
