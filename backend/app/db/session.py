from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings
from app.models.gym import Gym  # noqa: F401
from app.models.session import UserSession  # noqa: F401
from app.models.trainer import Trainer  # noqa: F401
from app.models.user import User  # noqa: F401

engine = create_engine(settings.DATABASE_URL, echo=True)


def init_db():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
