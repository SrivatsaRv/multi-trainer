from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, func, select

from app.api.api_v1 import deps as deps
from app.models.booking import Booking, BookingStatus, SessionPackage
from app.models.gym import Gym
from app.models.user import User

router = APIRouter()


@router.get("/{gym_id}/analytics/overview")
def get_gym_analytics_overview(
    gym_id: int,
    session: Session = Depends(deps.get_session),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Detailed analytics for a gym, including revenue, attendance trends, and
    trainer performance.
    """
    gym = session.get(Gym, gym_id)
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")
    if gym.admin_id != current_user.id and current_user.role != "SAAS_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")

    from app.models.associations import AssociationStatus, GymTrainer
    from app.models.subscription import ClientSubscription
    from app.models.trainer import Trainer
    from app.models.user import User as UserModel

    # 1. Total Revenue (Sales)
    revenue_statement = (
        select(func.sum(SessionPackage.price_inr))
        .join(
            ClientSubscription,
            SessionPackage.id == ClientSubscription.session_package_id,
        )
        .where(ClientSubscription.gym_id == gym_id)
    )
    total_revenue = session.exec(revenue_statement).one() or 0

    # 2. Attendance Trends (Last 30 days)
    thirty_days_ago = datetime.now() - timedelta(days=30)
    attendance_statement = (
        select(func.date(Booking.start_time), func.count(Booking.id))
        .where(Booking.gym_id == gym_id)
        .where(Booking.status.in_([BookingStatus.COMPLETED, BookingStatus.ATTENDED]))
        .where(Booking.start_time >= thirty_days_ago)
        .group_by(func.date(Booking.start_time))
        .order_by(func.date(Booking.start_time).asc())
    )
    attendance_results = session.exec(attendance_statement).all()
    attendance_trends = [{"date": str(d), "sessions": c} for d, c in attendance_results]

    # 3. Trainer Performance
    gym_trainers = session.exec(
        select(Trainer, UserModel)
        .join(GymTrainer, Trainer.id == GymTrainer.trainer_id)
        .join(UserModel, Trainer.user_id == UserModel.id)
        .where(GymTrainer.gym_id == gym_id)
        .where(GymTrainer.status == AssociationStatus.ACTIVE)
    ).all()

    trainer_stats = []
    for trainer, user in gym_trainers:
        completed_count = session.exec(
            select(func.count(Booking.id))
            .where(Booking.trainer_id == trainer.id)
            .where(Booking.gym_id == gym_id)
            .where(
                Booking.status.in_([BookingStatus.COMPLETED, BookingStatus.ATTENDED])
            )
        ).one()

        client_count = session.exec(
            select(func.count(func.distinct(Booking.user_id)))
            .where(Booking.trainer_id == trainer.id)
            .where(Booking.gym_id == gym_id)
        ).one()

        trainer_stats.append(
            {
                "trainer_id": trainer.id,
                "name": user.full_name,
                "completed_sessions": completed_count,
                "total_clients": client_count,
                "business_value": completed_count * 500,
            }
        )

    total_sessions_count = sum(t["sessions"] for t in attendance_trends)
    occupancy_rate = (
        (total_sessions_count / 360.0) * 100 if total_sessions_count else 0.0
    )

    return {
        "total_revenue": total_revenue,
        "currency": "INR",
        "attendance_trends": attendance_trends,
        "trainer_stats": trainer_stats,
        "total_active_clients": sum(t["total_clients"] for t in trainer_stats),
        "occupancy_rate": occupancy_rate,
    }


@router.get("/{gym_id}/analytics/recent-bookings")
def get_gym_recent_bookings(
    gym_id: int,
    session: Session = Depends(deps.get_session),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Fetch recent bookings for the gym.
    """
    # Recent bookings
    bookings = session.exec(
        select(Booking)
        .where(Booking.gym_id == gym_id)
        .order_by(Booking.start_time.desc())
        .limit(10)
    ).all()

    return bookings
