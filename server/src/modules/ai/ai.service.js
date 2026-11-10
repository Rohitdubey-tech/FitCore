"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAIDietPlan = generateAIDietPlan;
exports.generateAIWorkoutPlan = generateAIWorkoutPlan;
exports.chatWithFitnessAssistant = chatWithFitnessAssistant;
exports.analyzeMeal = analyzeMeal;
exports.listRecommendations = listRecommendations;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("../../config/env");
const foodItem_model_1 = require("../nutrition/foodItem.model");
const nutrition_service_1 = require("../nutrition/nutrition.service");
const exercise_model_1 = require("../workouts/exercise.model");
const workout_service_1 = require("../workouts/workout.service");
const aiRecommendation_model_1 = require("./aiRecommendation.model");
const conversation_model_1 = require("./conversation.model");
const MEDICAL_DISCLAIMER = 'FITCORE AI output is for informational fitness guidance only and is not medical advice.';
async function tryFastAPI(path, payload) {
    if (env_1.env.NODE_ENV === 'test')
        return null;
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        const resp = await fetch(`${env_1.env.AI_SERVICE_URL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        clearTimeout(timer);
        if (!resp.ok)
            return null;
        return (await resp.json());
    }
    catch {
        return null;
    }
}
function computeMacros(input) {
    const offset = input.gender === 'male' ? 5 : input.gender === 'female' ? -161 : -78;
    const bmr = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + offset;
    const mult = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        very_active: 1.9,
    };
    const tdee = bmr * (mult[input.activityLevel] ?? 1.55);
    const calories = input.fitnessGoal === 'fat_loss'
        ? Math.max(1300, Math.round(tdee - 450))
        : input.fitnessGoal === 'muscle_gain' || input.fitnessGoal === 'strength'
            ? Math.round(tdee + 300)
            : Math.round(tdee);
    const proteinGrams = Math.round(input.weightKg * (input.fitnessGoal === 'fat_loss' ? 2.0 : 1.9));
    const fatsGrams = Math.max(40, Math.round((calories * 0.25) / 9));
    const carbsGrams = Math.max(50, Math.round((calories - (proteinGrams * 4 + fatsGrams * 9)) / 4));
    return {
        calories,
        proteinGrams,
        carbsGrams,
        fatsGrams,
        waterMl: Math.max(2500, Math.round(input.weightKg * 40)),
    };
}
async function generateAIDietPlan(actor, input) {
    await (0, nutrition_service_1.ensureVerifiedFoodsSeeded)();
    const foods = await foodItem_model_1.FoodItemModel.find().lean();
    const remote = await tryFastAPI('/ai/diet/generate', {
        ...input,
        verifiedFoods: foods.map((f) => ({
            id: f._id.toString(),
            name: f.name,
            servingLabel: f.servingLabel,
            calories: f.calories,
            proteinGrams: f.proteinGrams,
            carbsGrams: f.carbsGrams,
            fatsGrams: f.fatsGrams,
            dietaryTags: f.dietaryTags,
            cuisine: f.cuisine,
        })),
    });
    let result = remote;
    if (!result) {
        const blocked = new Set([...input.allergies, ...input.restrictions].map((s) => s.toLowerCase().trim()).filter(Boolean));
        const eligible = foods.filter((f) => f.dietaryTags.includes(input.dietaryPreference) &&
            !Array.from(blocked).some((b) => f.name.toLowerCase().includes(b)) &&
            (input.cuisine === 'mixed' || f.cuisine === input.cuisine || foods.length <= 6));
        const pool = eligible.length > 0 ? eligible : foods.filter((f) => !Array.from(blocked).some((b) => f.name.toLowerCase().includes(b)));
        const slots = ['breakfast', 'lunch', 'dinner', 'snacks'];
        const meals = {
            breakfast: [],
            lunch: [],
            dinner: [],
            snacks: [],
        };
        pool.slice(0, 8).forEach((food, idx) => {
            const slot = slots[idx % slots.length];
            meals[slot].push({
                foodItemId: food._id.toString(),
                name: food.name,
                quantityLabel: food.servingLabel,
                calories: food.calories,
                proteinGrams: food.proteinGrams,
                carbsGrams: food.carbsGrams,
                fatsGrams: food.fatsGrams,
            });
        });
        result = {
            dailyTargets: computeMacros(input),
            meals,
            grocerySuggestions: pool.slice(0, 10).map((f) => f.name),
            alternatives: pool.slice(8, 12).map((f) => f.name),
            safety: {
                medical_disclaimer: MEDICAL_DISCLAIMER,
                professional_review_recommended: input.allergies.length > 0,
                allergy_checked: true,
            },
        };
    }
    if (input.saveAsActivePlan) {
        const dt = result.dailyTargets;
        const mealsObj = result.meals;
        await (0, nutrition_service_1.createDietPlan)(actor, {
            gymId: actor.activeGymId,
            title: `AI ${input.dietaryPreference} Plan (${input.fitnessGoal.replace('_', ' ')})`,
            dietaryPreference: input.dietaryPreference,
            dailyTargets: dt,
            meals: {
                breakfast: mealsObj.breakfast.map((m) => ({ ...m, servings: 1 })),
                lunch: mealsObj.lunch.map((m) => ({ ...m, servings: 1 })),
                dinner: mealsObj.dinner.map((m) => ({ ...m, servings: 1 })),
                snacks: mealsObj.snacks.map((m) => ({ ...m, servings: 1 })),
            },
        });
    }
    const recommendation = await aiRecommendation_model_1.AIRecommendationModel.create({
        gymId: actor.activeGymId ? new mongoose_1.default.Types.ObjectId(actor.activeGymId) : undefined,
        userId: new mongoose_1.default.Types.ObjectId(actor.userId),
        type: 'diet_plan',
        title: `AI Diet Plan — ${input.dietaryPreference} (${input.fitnessGoal})`,
        inputParams: input,
        outputPayload: result,
        safetyDisclosure: MEDICAL_DISCLAIMER,
    });
    return { recommendationId: recommendation._id.toString(), plan: result };
}
async function generateAIWorkoutPlan(actor, input) {
    await (0, workout_service_1.ensureSystemExercisesSeeded)();
    const exercises = await exercise_model_1.ExerciseModel.find({ isDeleted: { $ne: true } }).lean();
    const remote = await tryFastAPI('/ai/workout/generate', {
        ...input,
        availableExercises: exercises.map((e) => ({
            id: e._id.toString(),
            name: e.name,
            muscleGroup: e.muscleGroup,
            equipment: e.equipment,
            difficulty: e.difficulty,
        })),
    });
    let result = remote;
    if (!result) {
        const pool = exercises.filter((e) => input.availableEquipment.includes(e.equipment));
        const usable = pool.length > 0 ? pool : exercises;
        const sets = input.experienceLevel === 'beginner' ? 3 : 4;
        const reps = input.fitnessGoal === 'strength' ? '5-6' : '8-12';
        const restSeconds = input.fitnessGoal === 'strength' ? 120 : 75;
        const days = Array.from({ length: input.workoutDays }, (_, dayIdx) => {
            const sliceStart = (dayIdx * 3) % Math.max(1, usable.length);
            const dayExercises = Array.from({ length: Math.min(4, usable.length) }, (__, offset) => {
                const ex = usable[(sliceStart + offset) % usable.length];
                return {
                    exerciseId: ex._id.toString(),
                    exerciseName: ex.name,
                    muscleGroup: ex.muscleGroup,
                    sets,
                    reps,
                    restSeconds,
                };
            });
            return {
                dayNumber: dayIdx + 1,
                title: `Day ${dayIdx + 1} — ${input.fitnessGoal.replace('_', ' ')}`,
                exercises: dayExercises,
            };
        });
        result = {
            planName: `AI ${input.fitnessGoal.replace('_', ' ')} (${input.workoutDays}-Day Split)`,
            daysPerWeek: input.workoutDays,
            days,
            progressionRecommendation: 'Increase load by 2.5 kg once all prescribed sets hit the top of the rep range with clean form.',
            recoverySuggestions: 'Aim for 7–9 hours of sleep and active mobility between sessions.',
            safety: {
                medical_disclaimer: MEDICAL_DISCLAIMER,
                professional_review_recommended: Boolean(input.limitations),
            },
        };
    }
    if (input.savePlan) {
        const days = result.days;
        await (0, workout_service_1.createWorkoutPlan)(actor, {
            gymId: actor.activeGymId,
            name: String(result.planName || 'AI Workout Plan'),
            goal: input.fitnessGoal,
            difficulty: input.experienceLevel,
            daysPerWeek: input.workoutDays,
            days,
        });
    }
    const recommendation = await aiRecommendation_model_1.AIRecommendationModel.create({
        gymId: actor.activeGymId ? new mongoose_1.default.Types.ObjectId(actor.activeGymId) : undefined,
        userId: new mongoose_1.default.Types.ObjectId(actor.userId),
        type: 'workout_plan',
        title: String(result.planName || 'AI Workout Plan'),
        inputParams: input,
        outputPayload: result,
        safetyDisclosure: MEDICAL_DISCLAIMER,
    });
    return { recommendationId: recommendation._id.toString(), workout: result };
}
async function chatWithFitnessAssistant(actor, message) {
    const [workoutHistory, nutritionSummary] = await Promise.all([
        (0, workout_service_1.getWorkoutHistory)(actor, { page: 1, limit: 5 }),
        (0, nutrition_service_1.getDailyNutritionSummary)(actor),
    ]);
    const authorizedContext = {
        totalCompletedSessions: workoutHistory.stats.totalCompletedSessions,
        currentStreakDays: workoutHistory.stats.currentStreakDays,
        totalVolumeKg: workoutHistory.stats.totalVolumeKg,
        totalPersonalRecords: workoutHistory.stats.totalPersonalRecords,
        todayCalories: nutritionSummary.consumed.calories,
        todayProteinGrams: nutritionSummary.consumed.proteinGrams,
    };
    const remote = await tryFastAPI('/ai/chat', {
        message,
        authorizedContext,
    });
    const q = message.toLowerCase();
    const fallbackReply = q.includes('analyze') || q.includes('performance') || q.includes('progress')
        ? `Based on your recorded FITCORE history: ${authorizedContext.totalCompletedSessions} completed workout(s), ${authorizedContext.currentStreakDays}-day streak, ${authorizedContext.totalVolumeKg} kg total volume, and ${authorizedContext.todayCalories} kcal (${authorizedContext.todayProteinGrams}g protein) logged today.`
        : q.includes('bench')
            ? 'To increase your bench press: train horizontal pressing twice weekly, maintain scapular retraction and leg drive, and progress by 2.5 kg once target reps are achieved.'
            : q.includes('squat') && q.includes('alternative')
                ? 'Effective squat alternatives include Leg Press, Bulgarian Split Squats, and Goblet Squats.'
                : `Your FITCORE telemetry shows ${authorizedContext.totalCompletedSessions} completed workout(s) and ${authorizedContext.todayCalories} kcal logged today. Keep prioritizing progressive overload and adequate protein.`;
    const replyPayload = remote ?? {
        reply: fallbackReply,
        groundedStatsUsed: authorizedContext,
        disclaimer: MEDICAL_DISCLAIMER,
    };
    let convo = await conversation_model_1.ConversationModel.findOne({
        userId: actor.userId,
        channel: 'ai_assistant',
    });
    if (!convo) {
        convo = new conversation_model_1.ConversationModel({
            gymId: actor.activeGymId ? new mongoose_1.default.Types.ObjectId(actor.activeGymId) : undefined,
            userId: new mongoose_1.default.Types.ObjectId(actor.userId),
            channel: 'ai_assistant',
            messages: [],
        });
    }
    convo.messages.push({ senderId: new mongoose_1.default.Types.ObjectId(actor.userId), role: 'user', content: message, createdAt: new Date() }, { role: 'assistant', content: replyPayload.reply, createdAt: new Date() });
    await convo.save();
    return replyPayload;
}
async function analyzeMeal(actor, input) {
    await (0, nutrition_service_1.ensureVerifiedFoodsSeeded)();
    const foods = await foodItem_model_1.FoodItemModel.find().lean();
    const remote = await tryFastAPI('/ai/meal/analyze', {
        ...input,
        verifiedFoods: foods,
    });
    let result = remote;
    if (!result) {
        const desc = input.description.toLowerCase();
        const matched = foods.filter((f) => desc.includes(f.name.toLowerCase().split(' ')[0]));
        const items = matched.length > 0 ? matched : foods.slice(0, 1);
        result = {
            identifiedItems: items.map((i) => i.name),
            estimatedPortion: '1 standard serving (estimated)',
            estimates: {
                calories: Math.round(items.reduce((a, b) => a + b.calories, 0) * 10) / 10,
                proteinGrams: Math.round(items.reduce((a, b) => a + b.proteinGrams, 0) * 10) / 10,
                carbsGrams: Math.round(items.reduce((a, b) => a + b.carbsGrams, 0) * 10) / 10,
                fatsGrams: Math.round(items.reduce((a, b) => a + b.fatsGrams, 0) * 10) / 10,
            },
            uncertaintyDisclosure: 'Image- and description-based nutritional estimates are approximate and may vary with cooking oils and actual portion sizes.',
        };
    }
    await aiRecommendation_model_1.AIRecommendationModel.create({
        gymId: actor.activeGymId ? new mongoose_1.default.Types.ObjectId(actor.activeGymId) : undefined,
        userId: new mongoose_1.default.Types.ObjectId(actor.userId),
        type: 'meal_analysis',
        title: 'Meal Analyzer Estimate',
        inputParams: { description: input.description, hasImage: Boolean(input.imageBase64) },
        outputPayload: result,
        safetyDisclosure: String(result.uncertaintyDisclosure || MEDICAL_DISCLAIMER),
    });
    return result;
}
async function listRecommendations(actor) {
    const recommendations = await aiRecommendation_model_1.AIRecommendationModel.find({
        userId: new mongoose_1.default.Types.ObjectId(actor.userId),
    })
        .sort({ createdAt: -1 })
        .limit(30);
    return recommendations.map((r) => ({
        id: r._id.toString(),
        type: r.type,
        title: r.title,
        outputPayload: r.outputPayload,
        safetyDisclosure: r.safetyDisclosure,
        createdAt: r.createdAt.toISOString(),
    }));
}
