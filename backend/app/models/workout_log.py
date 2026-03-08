from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import JSON, Column
from sqlmodel import Field, Relationship, SQLModel

from app.models.workout import MuscleGroup

if TYPE_CHECKING:
    from app.models.trainer import Trainer
    from app.models.user import User


class WorkoutLogBase(SQLModel):
    date: datetime = Field(default_factory=datetime.utcnow)
    name: str
    workout_category: Optional[MuscleGroup] = Field(default=None)
    notes: Optional[str] = None


class WorkoutLog(WorkoutLogBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    client_id: int = Field(foreign_key="user.id")
    trainer_id: int = Field(foreign_key="trainer.id")

    # Relationships
    client: "User" = Relationship(back_populates="workout_logs")
    trainer: "Trainer" = Relationship(back_populates="conducted_workouts")
    exercise_logs: List["ExerciseLog"] = Relationship(back_populates="workout_log")


class ExerciseLogBase(SQLModel):
    exercise_name: str
    sets: List[dict] = Field(default=[], sa_column=Column(JSON))
    # sets structure: [{"weight": 60, "reps": 12, "notes": "Easy"}, ...]


class ExerciseLog(ExerciseLogBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    workout_log_id: int = Field(foreign_key="workoutlog.id")

    # Relationships
    workout_log: "WorkoutLog" = Relationship(back_populates="exercise_logs")


class WorkoutLogCreate(WorkoutLogBase):
    client_id: int
    trainer_id: int
    exercises: List[ExerciseLogBase]


class WorkoutLogUpdate(SQLModel):
    notes: Optional[str] = None
