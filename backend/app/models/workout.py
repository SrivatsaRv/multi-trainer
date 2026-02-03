from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from enum import Enum

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

class Exercise(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    description: Optional[str] = None
    category: ExerciseType = ExerciseType.STRENGTH
    unit_type: MeasurementUnit = Field(default=MeasurementUnit.WEIGHT_REPS) # New field
    video_url: Optional[str] = None

class WorkoutSessionExercise(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    booking_id: int = Field(foreign_key="booking.id", index=True)
    exercise_id: int = Field(foreign_key="exercise.id")
    
    # Flexible columns
    sets: int = Field(default=1)
    reps: Optional[int] = None
    weight_kg: Optional[float] = None
    duration_seconds: Optional[int] = None
    distance_meters: Optional[float] = None
    
    notes: Optional[str] = None
    
    # Relationships
    # Note: We'll retrieve Exercise details manually or via join
