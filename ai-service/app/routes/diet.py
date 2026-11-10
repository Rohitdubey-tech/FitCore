from typing import Literal
from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.services.nutrition_engine import calculate_macro_targets
from app.validators.safety import check_medical_flags

router = APIRouter(prefix="/ai/diet", tags=["ai-diet"])


class VerifiedFoodRef(BaseModel):
    id: str
    name: str
    servingLabel: str
    calories: float
    proteinGrams: float
    carbsGrams: float
    fatsGrams: float
    dietaryTags: list[str] = []
    cuisine: str = "indian"


class DietGenerateRequest(BaseModel):
    age: int = Field(ge=14, le=90)
    weightKg: float = Field(gt=30, lt=300)
    heightCm: float = Field(gt=100, lt=250)
    gender: Literal["male", "female", "other"] = "male"
    fitnessGoal: Literal["fat_loss", "muscle_gain", "strength", "endurance", "general_fitness"]
    activityLevel: Literal["sedentary", "light", "moderate", "active", "very_active"] = "moderate"
    dietaryPreference: Literal["vegetarian", "vegan", "eggetarian", "non_vegetarian"] = "vegetarian"
    cuisine: Literal["indian", "international", "mixed"] = "indian"
    allergies: list[str] = []
    restrictions: list[str] = []
    budget: Literal["budget", "moderate", "flexible"] = "moderate"
    availableIngredients: list[str] = []
    mealsPerDay: int = Field(default=4, ge=3, le=6)
    verifiedFoods: list[VerifiedFoodRef] = []


@router.post("/generate")
async def generate_diet_plan(req: DietGenerateRequest) -> dict:
    targets = calculate_macro_targets(
        age=req.age,
        weight_kg=req.weightKg,
        height_cm=req.heightCm,
        gender=req.gender,
        activity_level=req.activityLevel,
        fitness_goal=req.fitnessGoal,
    )

    blocked_terms = {a.lower().strip() for a in (req.allergies + req.restrictions) if a.strip()}

    eligible = [
        f
        for f in req.verifiedFoods
        if req.dietaryPreference in f.dietaryTags
        and not any(term in f.name.lower() for term in blocked_terms)
        and (req.cuisine == "mixed" or f.cuisine == req.cuisine or len(req.verifiedFoods) <= 6)
    ]
    if not eligible:
        eligible = [
            f
            for f in req.verifiedFoods
            if not any(term in f.name.lower() for term in blocked_terms)
        ]

    slots = ["breakfast", "lunch", "dinner", "snacks"]
    meals: dict[str, list[dict]] = {s: [] for s in slots}
    for idx, food in enumerate(eligible[:8]):
        slot = slots[idx % len(slots)]
        meals[slot].append(
            {
                "foodItemId": food.id,
                "name": food.name,
                "quantityLabel": food.servingLabel,
                "calories": food.calories,
                "proteinGrams": food.proteinGrams,
                "carbsGrams": food.carbsGrams,
                "fatsGrams": food.fatsGrams,
            }
        )

    safety = check_medical_flags(None, req.allergies)

    return {
        "dailyTargets": {**targets, "waterMl": max(2500, round(req.weightKg * 40))},
        "meals": meals,
        "grocerySuggestions": [f.name for f in eligible[:10]],
        "alternatives": [f.name for f in eligible[8:12]],
        "safety": safety.model_dump(),
    }

