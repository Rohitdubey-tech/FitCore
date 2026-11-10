from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/ai", tags=["ai-chat-meal"])


class ChatRequest(BaseModel):
    message: str
    authorizedContext: dict = {}


class MealAnalyzeRequest(BaseModel):
    description: str = ""
    imageBase64: str | None = None
    verifiedFoods: list[dict] = []


@router.post("/chat")
async def ai_fitness_chat(req: ChatRequest) -> dict:
    ctx = req.authorizedContext
    workouts = ctx.get("totalCompletedSessions", 0)
    volume = ctx.get("totalVolumeKg", 0)
    streak = ctx.get("currentStreakDays", 0)
    calories = ctx.get("todayCalories", 0)
    protein = ctx.get("todayProteinGrams", 0)

    q = req.message.lower()
    if "analyze" in q or "performance" in q or "progress" in q:
        reply = (
            f"Based on your recorded FITCORE history, you have completed {workouts} workout(s) "
            f"with a {streak}-day streak and {volume} kg total volume lifted. "
            f"Today's logged intake is {calories} kcal and {protein}g protein."
        )
    elif "bench" in q:
        reply = (
            "To increase your bench press: prioritize 2x/week horizontal pressing, "
            "focus on scapular retraction + leg drive, progress by 2.5 kg once target reps are hit, "
            "and support recovery with sufficient protein."
        )
    elif "squat" in q and "alternative" in q:
        reply = (
            "Effective squat alternatives include Leg Press, Bulgarian Split Squats, "
            "Goblet Squats, and Trap-Bar Deadlifts depending on joint comfort."
        )
    elif "eat" in q or "diet" in q or "vegetarian" in q:
        reply = (
            f"Today you have logged {calories} kcal and {protein}g protein. "
            "Great post-workout options from verified foods include Whey Protein, Paneer, "
            "Soya Chunks, Greek Yogurt, Moong Dal with Rice, or Eggs."
        )
    else:
        reply = (
            f"Your current FITCORE metrics show {workouts} completed workout(s) ({streak}-day streak) "
            f"and {calories} kcal logged today. Stay consistent with progressive overload and whole foods."
        )

    return {
        "reply": reply,
        "groundedStatsUsed": {
            "totalCompletedSessions": workouts,
            "currentStreakDays": streak,
            "totalVolumeKg": volume,
            "todayCalories": calories,
            "todayProteinGrams": protein,
        },
        "disclaimer": "Informational fitness guidance only — not medical advice.",
    }


@router.post("/meal/analyze")
async def analyze_meal(req: MealAnalyzeRequest) -> dict:
    desc = req.description.lower()
    matched = [f for f in req.verifiedFoods if f.get("name", "").lower().split(" ")[0] in desc]
    if not matched and req.verifiedFoods:
        matched = req.verifiedFoods[:1]

    total_cal = sum(float(f.get("calories", 220)) for f in matched)
    total_p = sum(float(f.get("proteinGrams", 12)) for f in matched)
    total_c = sum(float(f.get("carbsGrams", 25)) for f in matched)
    total_f = sum(float(f.get("fatsGrams", 8)) for f in matched)

    return {
        "identifiedItems": [f.get("name", "Mixed Meal") for f in matched] or ["Mixed Meal"],
        "estimatedPortion": "1 standard serving (estimated)",
        "estimates": {
            "calories": round(total_cal, 1),
            "proteinGrams": round(total_p, 1),
            "carbsGrams": round(total_c, 1),
            "fatsGrams": round(total_f, 1),
        },
        "uncertaintyDisclosure": (
            "Image- and description-based nutritional estimates are approximate and can vary "
            "significantly based on cooking oils, hidden ingredients, and actual portion weight."
        ),
    }

