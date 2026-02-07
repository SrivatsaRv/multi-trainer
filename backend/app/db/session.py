from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings
from app.models.associations import *  # noqa: F401, F403
from app.models.booking import Booking, SessionPackage  # noqa: F401
from app.models.certificate import Certificate  # noqa: F401
from app.models.gym import Gym  # noqa: F401
from app.models.gym_application import GymApplication  # noqa: F401
from app.models.session import UserSession  # noqa: F401
from app.models.subscription import ClientSubscription  # noqa: F401
from app.models.trainer import Trainer  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.workout import *  # noqa: F401, F403
from app.models.workout_log import *  # noqa: F401, F403

engine = create_engine(settings.DATABASE_URL, echo=True)


def init_db():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
