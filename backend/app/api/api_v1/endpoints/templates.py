from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.api.api_v1.deps import get_current_user
from app.db.session import get_session
from app.models.user import User
from app.models.workout import (Exercise, WorkoutTemplate,
                                WorkoutTemplateExercise)

router = APIRouter()


@router.get("", response_model=List[WorkoutTemplate])
def read_templates(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    """
    Retrieve global workout templates.
    """
    templates = session.exec(select(WorkoutTemplate).offset(skip).limit(limit)).all()
    return templates


@router.get("/{template_id}", response_model=Any)
def read_template(
    template_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve a specific template with its exercises.
    """
    template = session.get(WorkoutTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Manual join to get exercises
    # Returns { template: ..., exercises: [{name:..., sets:..., reps:...}] }

    wte_records = session.exec(
        select(WorkoutTemplateExercise, Exercise)
        .where(WorkoutTemplateExercise.template_id == template_id)
        .join(Exercise, WorkoutTemplateExercise.exercise_id == Exercise.id)
    ).all()

    exercises_data = []
    for wte, exercise in wte_records:
        exercises_data.append(
            {
                "id": exercise.id,
                "name": exercise.name,
                "category": exercise.category,
                "video_url": exercise.video_url,
                "sets": wte.sets,
                "reps": wte.reps,
                "notes": wte.notes,
            }
        )

    return {"template": template, "exercises": exercises_data}
