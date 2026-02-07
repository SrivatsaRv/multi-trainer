from typing import Any, List

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.api.api_v1.deps import get_current_user, get_session
from app.models.user import User
from app.models.workout import Exercise

router = APIRouter()


@router.get("", response_model=List[Exercise])
def read_exercises(
    session: Session = Depends(get_session),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Retrieve exercises.
    """
    exercises = session.exec(select(Exercise).offset(skip).limit(limit)).all()
    return exercises


@router.post("", response_model=Exercise)
def create_exercise(
    *,
    session: Session = Depends(get_session),
    exercise_in: Exercise,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Create new exercise.
    """
    exercise = Exercise.model_validate(exercise_in)
    session.add(exercise)
    session.commit()
    session.refresh(exercise)
    return exercise
