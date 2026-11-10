from typing import Literal


def calculate_macro_targets(
    age: int,
    weight_kg: float,
    height_cm: float,
    gender: Literal["male", "female", "other"],
    activity_level: Literal["sedentary", "light", "moderate", "active", "very_active"],
    fitness_goal: Literal["fat_loss", "muscle_gain", "strength", "endurance", "general_fitness"],
) -> dict[str, int]:
    # Mifflin-St Jeor BMR
    gender_offset = 5 if gender == "male" else -161 if gender == "female" else -78
    bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + gender_offset

    multipliers = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725,
        "very_active": 1.9,
    }
    tdee = bmr * multipliers[activity_level]

    if fitness_goal == "fat_loss":
        target_calories = max(1300, round(tdee - 450))
        protein_g = round(weight_kg * 2.0)
    elif fitness_goal in ("muscle_gain", "strength"):
        target_calories = round(tdee + 300)
        protein_g = round(weight_kg * 1.9)
    else:
        target_calories = round(tdee)
        protein_g = round(weight_kg * 1.6)

    fats_g = max(40, round((target_calories * 0.25) / 9))
    remaining_kcal = max(200, target_calories - (protein_g * 4 + fats_g * 9))
    carbs_g = round(remaining_kcal / 4)

    return {
        "calories": target_calories,
        "proteinGrams": protein_g,
        "carbsGrams": carbs_g,
        "fatsGrams": fats_g,
    }

