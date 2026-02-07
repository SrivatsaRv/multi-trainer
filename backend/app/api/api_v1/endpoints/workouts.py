from typing import Any, List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.api_v1.deps import get_current_user
from app.db.session import get_session
from app.models.trainer import Trainer
from app.models.user import User
from app.models.workout_log import (
    WorkoutLog,
    WorkoutLogCreate,
    WorkoutLogUpdate,
    ExerciseLog,
)
# --- Templates ---

from app.models.workout import (
    WorkoutTemplate,
    WorkoutTemplateExercise,
    Exercise
)
from pydantic import BaseModel

class WorkoutTemplateCreateSchema(BaseModel):
    name: str
    description: Optional[str] = None
    exercises: List[dict] # [{"exercise_id": 1, "sets": 3, "reps": 10, "notes": ""}]

class WorkoutTemplateUpdateSchema(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    exercises: Optional[List[dict]] = None

@router.get("/templates", response_model=List[WorkoutTemplate])
def read_templates(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    trainer = session.exec(select(Trainer).where(Trainer.user_id == current_user.id)).first()
    if not trainer:
         raise HTTPException(status_code=404, detail="Trainer profile not found")

    # Eager load exercises
    # The default relationship loading might be lazy, but SQLModel/Pydantic response will try to access it.
    # To be safe/efficient we logic:
    templates = session.exec(
        select(WorkoutTemplate).where(WorkoutTemplate.trainer_id == trainer.id)
    ).all()
    return templates


@router.post("/templates", response_model=WorkoutTemplate, status_code=status.HTTP_201_CREATED)
def create_template(
    template_in: WorkoutTemplateCreateSchema,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    trainer = session.exec(select(Trainer).where(Trainer.user_id == current_user.id)).first()
    if not trainer:
         raise HTTPException(status_code=404, detail="Trainer profile not found")

    # Create Template
    template = WorkoutTemplate(
        name=template_in.name,
        description=template_in.description,
        trainer_id=trainer.id
    )
    session.add(template)
    session.commit()
    session.refresh(template)

    # Create Template Exercises
    if template_in.exercises:
        for ex_data in template_in.exercises:
            # ex_data expected: { "exercise_id": 1, "sets": 3, "reps": 10 ... }
            # If backend uses names, we might need lookup. 
            # For MVP let's assume exercise_id is passed OR we look up by name if provided?
            # The previous JSON model implies detailed object. 
            # Let's support "exercise_id" primarily.
            
            ex_id = ex_data.get("exercise_id")
            if not ex_id:
                # Try lookup by name?
                # skipping for robustness unless needed
                continue
                
            wte = WorkoutTemplateExercise(
                template_id=template.id,
                exercise_id=ex_id,
                sets=ex_data.get("sets", 3),
                reps=ex_data.get("reps", 10),
                notes=ex_data.get("notes")
            )
            session.add(wte)
        session.commit()
        session.refresh(template)
    
    return template


@router.put("/templates/{template_id}", response_model=WorkoutTemplate)
def update_template(
    template_id: int,
    template_in: WorkoutTemplateUpdateSchema,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    trainer = session.exec(select(Trainer).where(Trainer.user_id == current_user.id)).first()
    if not trainer:
         raise HTTPException(status_code=404, detail="Trainer profile not found")
    
    template = session.get(WorkoutTemplate, template_id)
    if not template or template.trainer_id != trainer.id:
        raise HTTPException(status_code=404, detail="Template not found")

    if template_in.name is not None:
        template.name = template_in.name
    if template_in.description is not None:
        template.description = template_in.description

    if template_in.exercises is not None:
        # Full replace of exercises
        # Delete existing
        existing = session.exec(select(WorkoutTemplateExercise).where(WorkoutTemplateExercise.template_id == template.id)).all()
        for e in existing:
            session.delete(e)
        
        # Add new
        for ex_data in template_in.exercises:
            ex_id = ex_data.get("exercise_id")
            if ex_id:
                wte = WorkoutTemplateExercise(
                    template_id=template.id,
                    exercise_id=ex_id,
                    sets=ex_data.get("sets", 3),
                    reps=ex_data.get("reps", 10),
                    notes=ex_data.get("notes")
                )
                session.add(wte)

    session.add(template)
    session.commit()
    session.refresh(template)
    return template


@router.delete("/templates/{template_id}")
def delete_template(
    template_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    trainer = session.exec(select(Trainer).where(Trainer.user_id == current_user.id)).first()
    if not trainer:
         raise HTTPException(status_code=404, detail="Trainer profile not found")
    
    template = session.get(WorkoutTemplate, template_id)
    if not template or template.trainer_id != trainer.id:
        raise HTTPException(status_code=404, detail="Template not found")

    session.delete(template)
    session.commit()
    return {"message": "Template deleted"}


# --- Logs ---

@router.get("/logs", response_model=List[WorkoutLog])
def read_logs(
    client_id: Optional[int] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    trainer = session.exec(select(Trainer).where(Trainer.user_id == current_user.id)).first()
    if not trainer:
         raise HTTPException(status_code=404, detail="Trainer profile not found")

    query = select(WorkoutLog).where(WorkoutLog.trainer_id == trainer.id)
    if client_id:
        query = query.where(WorkoutLog.client_id == client_id)
    
    query = query.order_by(WorkoutLog.date.desc())
    return session.exec(query).all()


@router.post("/logs", response_model=WorkoutLog, status_code=status.HTTP_201_CREATED)
def create_log(
    log_in: WorkoutLogCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    trainer = session.exec(select(Trainer).where(Trainer.user_id == current_user.id)).first()
    if not trainer:
         raise HTTPException(status_code=404, detail="Trainer profile not found")
    
    # Verify trainer matches payload (if redundant check needed)
    if log_in.trainer_id != trainer.id:
         raise HTTPException(status_code=400, detail="Trainer mismatch")

    # Create Log
    db_log = WorkoutLog(
        client_id=log_in.client_id,
        trainer_id=trainer.id,
        date=log_in.date,
        name=log_in.name,
        notes=log_in.notes
    )
    session.add(db_log)
    session.commit()
    session.refresh(db_log)

    # Create Exercise Logs
    for ex_in in log_in.exercises:
        db_ex = ExerciseLog(
            workout_log_id=db_log.id,
            exercise_name=ex_in.exercise_name,
            sets=ex_in.sets
        )
        session.add(db_ex)
    
    session.commit()
    session.refresh(db_log) # Refresh to load relationships
    return db_log
