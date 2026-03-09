from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.api.api_v1.deps import get_session
# settings removed if unused
from app.models.user import User

router = APIRouter()


@router.delete("/purge-user")
def purge_test_user(
    email: str,
    session: Session = Depends(get_session),
):
    """
    DANGEROUS: Test utility to purge a user by email.
    Only allows deleting emails starting with 'test_'.
    """
    # Safety Check: only allow in test/local and only specific email patterns
    if not (email.startswith("test_") or email.startswith("e2e_")):
        raise HTTPException(
            status_code=400,
            detail="Can only purge test users (prefix 'test_' or 'e2e_')",
        )

    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        return {"status": "not_found"}

    from sqlalchemy import text

    # 1. Clear sessions first to avoid IntegrityError
    session.execute(
        text("DELETE FROM user_sessions WHERE user_id = :uid"), {"uid": user.id}
    )

    # 2. Cascade delete profiles & associations
    if user.gym:
        gid = user.gym.id
        session.execute(
            text("DELETE FROM gymapplication WHERE gym_id = :gid"), {"gid": gid}
        )
        session.execute(text("DELETE FROM booking WHERE gym_id = :gid"), {"gid": gid})
        session.execute(
            text("DELETE FROM clientsubscription WHERE gym_id = :gid"), {"gid": gid}
        )
        session.execute(
            text("DELETE FROM sessionpackage WHERE gym_id = :gid"), {"gid": gid}
        )
        session.execute(
            text("DELETE FROM gymtrainer WHERE gym_id = :gid"), {"gid": gid}
        )
        session.delete(user.gym)
    if user.trainer:
        tid = user.trainer.id
        session.execute(
            text("DELETE FROM gymapplication WHERE trainer_id = :tid"), {"tid": tid}
        )
        session.execute(
            text("DELETE FROM certificate WHERE trainer_id = :tid"), {"tid": tid}
        )
        session.execute(
            text("DELETE FROM booking WHERE trainer_id = :tid"), {"tid": tid}
        )
        session.execute(
            text("DELETE FROM gymtrainer WHERE trainer_id = :tid"), {"tid": tid}
        )
        session.execute(
            text("DELETE FROM clienttrainer WHERE trainer_id = :tid"), {"tid": tid}
        )

        # Cleanup trainer workouts
        session.execute(
            text(
                "DELETE FROM workoutlog WHERE session_id IN "
                "(SELECT id FROM workoutsession WHERE trainer_id = :tid)"
            ),
            {"tid": tid},
        )
        session.execute(
            text(
                "DELETE FROM workoutset WHERE exercise_id IN "
                "(SELECT id FROM workoutsessionexercise WHERE session_id IN "
                "(SELECT id FROM workoutsession WHERE trainer_id = :tid))"
            ),
            {"tid": tid},
        )
        session.execute(
            text(
                "DELETE FROM workoutsessionexercise WHERE session_id IN "
                "(SELECT id FROM workoutsession WHERE trainer_id = :tid)"
            ),
            {"tid": tid},
        )
        session.execute(
            text("DELETE FROM workoutsession WHERE trainer_id = :tid"), {"tid": tid}
        )
        session.execute(
            text("DELETE FROM workouttemplate WHERE trainer_id = :tid"), {"tid": tid}
        )

        session.delete(user.trainer)

    session.delete(user)
    session.commit()
    return {"status": "deleted", "email": email}
