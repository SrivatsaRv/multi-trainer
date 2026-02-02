from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from datetime import datetime, timedelta

from app.api.api_v1 import deps as deps
from app.models.user import User
from app.models.gym import Gym
from app.models.booking import Booking, BookingStatus, SessionPackage

router = APIRouter()

@router.get("/{gym_id}/analytics/overview")
def get_gym_analytics_overview(
    gym_id: int,
    session: Session = Depends(deps.get_session),
    current_user: User = Depends(deps.get_current_user),
):
    # Authorization: User must be admin of this gym
    gym = session.get(Gym, gym_id)
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")
    if gym.admin_id != current_user.id and current_user.role != "SAAS_ADMIN":
         raise HTTPException(status_code=403, detail="Not authorized")

    # 1. Total Revenue (from Sold Packages)
    # Ideally we'd have a 'Purchase' model, but for now let's assume Bookings are *part* of a package.
    # OR, since we didn't implement Purchase model yet, we can approximate Revenue based on COMPLETED bookings * Average Session Price?
    # Wait, the plan said "SessionPackage" is a revenue source.
    # But User buys a package. We need a "UserPackage" or "Purchase".
    # Since I didn't create "Purchase" model, I'll calculate revenue based on "Assumed" value of Bookings for MVP.
    # OR, better: Add a quick "Purchase" model? 
    # The user said "backend integration will be a separate follow-up", but I changed plan to "Core Models first".
    # I successfully seeded "SessionPackage" but not "Purchases".
    # Let's pivot: Revenue = Sum of Price of all SessionPackages (Mocking volume) OR
    # Revenue = Count of Completed Bookings * Fixed Rate?
    # Let's do: Revenue = Completed Bookings * (Average Package Price / Session Count)
    # This gives a realistic estimate without a Purchase table.
    
    # Calculate Average Price Per Session for this gym
    packages = session.exec(select(SessionPackage).where(SessionPackage.gym_id == gym_id)).all()
    if packages:
        avg_price_per_session = sum(p.price_inr / p.session_count for p in packages) / len(packages)
    else:
        avg_price_per_session = 500.0 # Fallback 500 INR
        
    completed_bookings_count = session.exec(
        select(func.count(Booking.id))
        .where(Booking.gym_id == gym_id)
        .where(Booking.status == BookingStatus.COMPLETED)
    ).one()
    
    total_revenue = int(completed_bookings_count * avg_price_per_session)

    # 2. Active Members (Unique Users in last 30 days)
    thirty_days_ago = datetime.now() - timedelta(days=30)
    active_members = session.exec(
        select(func.count(func.distinct(Booking.user_id)))
        .where(Booking.gym_id == gym_id)
        .where(Booking.start_time >= thirty_days_ago)
    ).one()

    # 3. Occupancy Rate (Last 30 days)
    # Capacity = Open Hours * Trainers? Or just total slots?
    # Let's assume standard capacity = 12 hours * Number of Trainers * 30 days
    trainers_count = len(gym.trainers) if gym.trainers else 1
    total_capacity_slots = 12 * trainers_count * 30
    
    booked_slots = session.exec(
        select(func.count(Booking.id))
        .where(Booking.gym_id == gym_id)
        .where(Booking.start_time >= thirty_days_ago)
    ).one()
    
    occupancy_rate = round((booked_slots / total_capacity_slots) * 100, 1) if total_capacity_slots > 0 else 0

    return {
        "revenue": total_revenue,
        "active_members": active_members,
        "occupancy_rate": occupancy_rate,
        "currency": "INR"
    }

@router.get("/{gym_id}/analytics/attendance")
def get_gym_attendance(
    gym_id: int,
    session: Session = Depends(deps.get_session),
    current_user: User = Depends(deps.get_current_user),
):
     # Recent bookings
    bookings = session.exec(
        select(Booking)
        .where(Booking.gym_id == gym_id)
        .order_by(Booking.start_time.desc())
        .limit(10)
    ).all()
    
    return bookings
