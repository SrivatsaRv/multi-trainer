import os
import sys
from datetime import datetime

import requests
from sqlmodel import Session, create_engine, func, select

# Add current directory to path for imports
sys.path.append(os.getcwd())

from app.models.booking import Booking, SessionPackage  # noqa: E402
from app.models.gym import Gym  # noqa: E402
from app.models.certificate import Certificate  # noqa: E402
from app.models.gym_application import GymApplication  # noqa: E402
from app.models.session import UserSession  # noqa: E402
from app.models.subscription import ClientSubscription  # noqa: E402
from app.models.trainer import Trainer  # noqa: E402
from app.models.user import User  # noqa: E402
from app.models.workout import WorkoutTemplate  # noqa: E402
from app.models.workout_log import WorkoutLog  # noqa: E402

# Situation Report Script
# Shows system health and database statistics.

# Create engine without echo to suppress SQL logs
try:
    from app.core.config import settings  # noqa: E402

    DATABASE_URL = settings.DATABASE_URL
except ImportError:
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./multi_trainer.db")

engine = create_engine(DATABASE_URL, echo=False)


def get_db_stats():
    with Session(engine) as session:
        stats = {
            "users": session.exec(select(func.count(User.id))).one(),
            "gyms": session.exec(select(func.count(Gym.id))).one(),
            "trainers": session.exec(select(func.count(Trainer.id))).one(),
            "bookings": session.exec(select(func.count(Booking.id))).one(),
            "active_sessions": session.exec(
                select(func.count(UserSession.id)).where(
                    UserSession.is_active.is_(True)
                )
            ).one(),
            "active_subscriptions": (
                session.exec(
                    select(func.count(ClientSubscription.id)).where(
                        ClientSubscription.is_active.is_(True)
                    )
                ).one()
                if hasattr(ClientSubscription, "is_active")
                else 0
            ),
            "packages": session.exec(select(func.count(SessionPackage.id))).one(),
        }
        return stats


def check_health():
    try:
        response = requests.get(
            "http://localhost:8000/health", timeout=2
        )
        return response.status_code == 200
    except Exception:
        return False


def main():
    print("=" * 40)
    print(f"SITUATION REPORT - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 40)

    print("\n[DB STATISTICS]")
    try:
        stats = get_db_stats()
        for key, val in stats.items():
            print(f"- {key.replace('_', ' ').title()}: {val}")
    except Exception as e:
        print(f"Error fetching DB stats: {e}")

    print("\n[SERVICES HEALTH]")
    health = "ONLINE" if check_health() else "OFFLINE (or port 8000 blocked)"
    print(f"- Backend API: {health}")

    print("\n" + "=" * 40)


if __name__ == "__main__":
    main()
