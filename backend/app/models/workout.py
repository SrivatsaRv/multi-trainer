from enum import Enum
from typing import TYPE_CHECKING, List, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.trainer import Trainer


class ExerciseType(str, Enum):
    STRENGTH = "STRENGTH"
    CARDIO = "CARDIO"
    FLEXIBILITY = "FLEXIBILITY"
    HIIT = "HIIT"


class MeasurementUnit(str, Enum):
    WEIGHT_REPS = "WEIGHT_REPS"
    REPS_ONLY = "REPS_ONLY"
    TIME_DISTANCE = "TIME_DISTANCE"
    TIME_ONLY = "TIME_ONLY"


class MuscleGroup(str, Enum):
    LEGS = "LEGS"
    CHEST = "CHEST"
    BACK = "BACK"
    SHOULDERS = "SHOULDERS"
    ARMS = "ARMS"
    CORE = "CORE"
    FULL_BODY = "FULL_BODY"
    CARDIO = "CARDIO"


class Exercise(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    description: Optional[str] = None
    category: ExerciseType = ExerciseType.STRENGTH
    muscle_group: MuscleGroup = Field(
        default=MuscleGroup.FULL_BODY
    )  # New grouping field
    unit_type: MeasurementUnit = Field(default=MeasurementUnit.WEIGHT_REPS)
    video_url: Optional[str] = None


class WorkoutSessionExercise(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    booking_id: int = Field(foreign_key="booking.id", index=True)
    exercise_id: int = Field(foreign_key="exercise.id")

    # Flexible summary columns (can be updated when sets are saved)
    sets: int = Field(default=1)
    reps: Optional[int] = None
    weight_kg: Optional[float] = None
    duration_seconds: Optional[int] = None
    distance_meters: Optional[float] = None

    notes: Optional[str] = None

    # Relationships
    workout_sets: List["WorkoutSet"] = Relationship(
        back_populates="session_exercise",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class WorkoutSet(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_exercise_id: int = Field(
        foreign_key="workoutsessionexercise.id", index=True
    )

    set_number: int
    reps: Optional[int] = None
    weight_kg: Optional[float] = None
    rpe: Optional[float] = None  # Rate of Perceived Exertion

    duration_seconds: Optional[int] = None
    distance_meters: Optional[float] = None

    is_completed: bool = Field(default=True)

    # Relationships
    session_exercise: WorkoutSessionExercise = Relationship(
        back_populates="workout_sets"
    )


class WorkoutTemplate(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    description: Optional[str] = None
    trainer_id: Optional[int] = Field(default=None, foreign_key="trainer.id")
    
    # Relationships
    trainer: Optional["Trainer"] = Relationship(back_populates="workout_templates")
    workout_template_exercises: List["WorkoutTemplateExercise"] = Relationship(back_populates="template")


class WorkoutTemplateExercise(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    template_id: int = Field(foreign_key="workouttemplate.id", index=True)
    exercise_id: int = Field(foreign_key="exercise.id")

    sets: int = Field(default=3)
    reps: Optional[int] = Field(default=10)
    notes: Optional[str] = None

    # Relationships
    template: WorkoutTemplate = Relationship(back_populates="workout_template_exercises")
    exercise: Exercise = Relationship()
