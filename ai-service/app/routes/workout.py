from typing import Literal
from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.validators.safety import check_medical_flags

router = APIRouter(prefix="/ai/workout", tags=["ai-workout"])


class ExerciseRef(BaseModel):
    id: str
    name: str
    muscleGroup: str
    equipment: str
    difficulty: str


class WorkoutGenerateRequest(BaseModel):
    fitnessGoal: Literal["fat_loss", "muscle_gain", "strength", "endurance", "general_fitness"]
    experienceLevel: Literal["beginner", "intermediate", "advanced"] = "intermediate"
    availableEquipment: list[str] = ["barbell", "dumbbell", "bodyweight", "cable"]
    workoutDays: int = Field(default=4, ge=1, le=7)
    workoutDurationMinutes: int = Field(default=50, ge=20, le=180)
    targetMuscleGroups: list[str] = []
    limitations: str | None = None
    availableExercises: list[ExerciseRef] = []


@router.post("/generate")
async def generate_workout_plan(req: WorkoutGenerateRequest) -> dict:
    pool = [
        ex
        for ex in req.availableExercises
        if ex.equipment in req.availableEquipment or not req.availableEquipment
    ]
    if not pool:
        pool = req.availableExercises

    sets_count = 3 if req.experienceLevel == "beginner" else 4
    reps_range = "5-6" if req.fitnessGoal == "strength" else "8-12"
    rest_seconds = 120 if req.fitnessGoal == "strength" else 75

    days = []
    for day_idx in range(req.workoutDays):
        slice_start = (day_idx * 3) % max(1, len(pool))
        day_exs = []
        for offset in range(min(4, len(pool))):
            ex = pool[(slice_start + offset) % len(pool)]
            day_exs.append(
                {
                    "exerciseId": ex.id,
                    "exerciseName": ex.name,
                    "muscleGroup": ex.muscleGroup,
                    "sets": sets_count,
                    "reps": reps_range,
                    "restSeconds": rest_seconds,
                }
            )
        days.append(
            {
                "dayNumber": day_idx + 1,
                "title": f"Day {day_idx + 1} — {req.fitnessGoal.replace('_', ' ').title()}",
                "exercises": day_exs,
            }
        )

    safety = check_medical_flags(req.limitations, [])
    return {
        "planName": f"AI {req.fitnessGoal.replace('_', ' ').title()} ({req.workoutDays}-Day Split)",
        "daysPerWeek": req.workoutDays,
        "days": days,
        "progressionRecommendation": "Add 2.5 kg when you complete all target sets at the top of the rep range.",
        "recoverySuggestions": "Target 7–9 hours of sleep, 1–2 rest days weekly, and light mobility warm-ups.",
        "safety": safety.model_dump(),
    }

