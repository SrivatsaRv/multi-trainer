from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.booking import Booking, BookingStatus
from app.models.subscription import ClientSubscription, SubscriptionStatus
from app.models.trainer import Trainer
from app.models.user import User


class BookingService:
    @staticmethod
    def create_booking(
        session: Session,
        user: User,
        trainer_id: int,
        start_time: datetime,
        user_id: Optional[int] = None,
        notes: str = "",
    ) -> Booking:
        """
        Create a booking with strict business rule enforcement:
        1. Check Client Subscription (Must have credits & be active)
        2. Check Trainer Availability (Must match slots)
        3. Check Overlaps
        """

        # Determine target user
        target_user_id = user_id if user_id and user.role == "TRAINER" else user.id

        # 1. Check Subscription
        subscription = session.exec(
            select(ClientSubscription)
            .where(ClientSubscription.user_id == target_user_id)
            .where(ClientSubscription.status == SubscriptionStatus.ACTIVE)
            .where(ClientSubscription.expiry_date >= datetime.now())
        ).first()

        if not subscription:
            raise HTTPException(
                status_code=400, detail="No active subscription found for client."
            )

        if subscription.sessions_used >= subscription.total_sessions:
            raise HTTPException(
                status_code=400, detail="Subscription credits exhausted."
            )

        # 2. Check Trainer Availability
        trainer = session.get(Trainer, trainer_id)
        if not trainer:
            raise HTTPException(status_code=404, detail="Trainer not found")

        # Ensure trainer exists and matches requester if provided
        if user.role == "TRAINER" and trainer.user_id != user.id:
            raise HTTPException(
                status_code=403, detail="You can only book sessions for yourself."
            )

        req_day = start_time.strftime("%A")
        if not trainer.availability:
            raise HTTPException(
                status_code=400, detail="No availability set for this day."
            )

        slots = trainer.availability.get(req_day, [])
        if not slots:
            raise HTTPException(status_code=400, detail=f"Not available on {req_day}s.")

        is_slot_valid = False
        req_hour = start_time.hour

        for slot in slots:
            try:
                if isinstance(slot, str):
                    start_str, end_str = slot.split("-")
                else:
                    start_str = slot.get("start")
                    end_str = slot.get("end")

                s_h = int(start_str.split(":")[0])
                e_h = int(end_str.split(":")[0])

                if s_h <= req_hour < e_h:
                    is_slot_valid = True
                    break
            except Exception:
                continue

        if not is_slot_valid:
            raise HTTPException(
                status_code=400, detail="Selected time is outside available hours."
            )

        # 3. Check Overlaps
        end_time = start_time + timedelta(hours=1)

        existing = session.exec(
            select(Booking).where(
                Booking.trainer_id == trainer_id,
                Booking.start_time < end_time,
                Booking.end_time > start_time,
                Booking.status.in_([BookingStatus.SCHEDULED, BookingStatus.COMPLETED]),
            )
        ).first()

        if existing:
            raise HTTPException(status_code=400, detail="Time slot not available")

        # Proceed
        booking = Booking(
            user_id=target_user_id,
            trainer_id=trainer_id,
            gym_id=trainer.gyms[0].id if trainer.gyms else 1,  # Fallback
            start_time=start_time,
            end_time=start_time + timedelta(hours=1),
            status=BookingStatus.SCHEDULED,
            notes=notes,
        )
        session.add(booking)

        # Deduct Credit
        subscription.sessions_used += 1
        session.add(subscription)

        session.commit()
        session.refresh(booking)
        return booking
