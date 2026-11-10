"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureVerifiedFoodsSeeded = ensureVerifiedFoodsSeeded;
exports.searchFoods = searchFoods;
exports.createDietPlan = createDietPlan;
exports.listDietPlans = listDietPlans;
exports.logFoodOrWater = logFoodOrWater;
exports.getDailyNutritionSummary = getDailyNutritionSummary;
exports.deleteFoodLog = deleteFoodLog;
const mongoose_1 = __importDefault(require("mongoose"));
const shared_types_1 = require("@fitcore/shared-types");
const errors_1 = require("../../utils/errors");
const gymMember_model_1 = require("../members/gymMember.model");
const dietPlan_model_1 = require("./dietPlan.model");
const foodItem_model_1 = require("./foodItem.model");
const foodLog_model_1 = require("./foodLog.model");
const foodSeedData_1 = require("./foodSeedData");
function todayDateKey() {
    return new Date().toISOString().slice(0, 10);
}
function round1(val) {
    return Math.round(val * 10) / 10;
}
function toFoodItemDTO(food) {
    return {
        id: food._id.toString(),
        name: food.name,
        slug: food.slug,
        category: food.category,
        cuisine: food.cuisine,
        dietaryTags: food.dietaryTags || [],
        servingSizeGrams: food.servingSizeGrams,
        servingLabel: food.servingLabel,
        calories: food.calories,
        proteinGrams: food.proteinGrams,
        carbsGrams: food.carbsGrams,
        fatsGrams: food.fatsGrams,
        fiberGrams: food.fiberGrams,
        isVerified: food.isVerified,
        source: food.source,
    };
}
function toDietPlanDTO(plan) {
    return {
        id: plan._id.toString(),
        gymId: plan.gymId?.toString(),
        userId: plan.userId.toString(),
        memberId: plan.memberId?.toString(),
        title: plan.title,
        dietaryPreference: plan.dietaryPreference,
        dailyTargets: plan.dailyTargets,
        meals: plan.meals,
        isAIGenerated: plan.isAIGenerated,
        status: plan.status,
        createdAt: plan.createdAt.toISOString(),
        updatedAt: plan.updatedAt.toISOString(),
    };
}
function toFoodLogDTO(log) {
    return {
        id: log._id.toString(),
        userId: log.userId.toString(),
        dateKey: log.dateKey,
        mealType: log.mealType,
        foodItemId: log.foodItemId?.toString(),
        foodName: log.foodName,
        servings: log.servings,
        calories: log.calories,
        proteinGrams: log.proteinGrams,
        carbsGrams: log.carbsGrams,
        fatsGrams: log.fatsGrams,
        waterMl: log.waterMl,
        loggedAt: log.loggedAt.toISOString(),
    };
}
async function ensureVerifiedFoodsSeeded() {
    const count = await foodItem_model_1.FoodItemModel.countDocuments();
    if (count > 0)
        return;
    await foodItem_model_1.FoodItemModel.bulkWrite(foodSeedData_1.VERIFIED_FOODS.map((food) => ({
        updateOne: {
            filter: { slug: food.slug },
            update: { $setOnInsert: { ...food, isVerified: true } },
            upsert: true,
        },
    })));
}
async function searchFoods(query) {
    await ensureVerifiedFoodsSeeded();
    const filter = {};
    if (query.cuisine)
        filter.cuisine = query.cuisine;
    if (query.category)
        filter.category = query.category;
    if (query.dietaryTag)
        filter.dietaryTags = query.dietaryTag;
    if (query.search) {
        const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.name = { $regex: escaped, $options: 'i' };
    }
    const skip = (query.page - 1) * query.limit;
    const [foods, total] = await Promise.all([
        foodItem_model_1.FoodItemModel.find(filter).sort({ name: 1 }).skip(skip).limit(query.limit),
        foodItem_model_1.FoodItemModel.countDocuments(filter),
    ]);
    return {
        foods: foods.map(toFoodItemDTO),
        meta: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / query.limit)),
        },
    };
}
async function createDietPlan(actor, input) {
    await ensureVerifiedFoodsSeeded();
    let targetUserId = new mongoose_1.default.Types.ObjectId(actor.userId);
    if (input.memberId) {
        const member = await gymMember_model_1.GymMemberModel.findOne({
            _id: input.memberId,
            isDeleted: { $ne: true },
        });
        if (!member) {
            throw new errors_1.NotFoundError('Target gym member not found');
        }
        if (actor.role !== 'super_admin' &&
            !actor.gymIds.includes(member.gymId.toString())) {
            throw new errors_1.ForbiddenError('Cross-tenant gym access denied');
        }
        targetUserId = member.userId;
    }
    const foodIds = new Set();
    for (const mealKey of shared_types_1.MEAL_TYPES) {
        for (const item of input.meals[mealKey]) {
            if (item.foodItemId)
                foodIds.add(item.foodItemId);
        }
    }
    const verifiedFoodMap = new Map();
    if (foodIds.size > 0) {
        const docs = await foodItem_model_1.FoodItemModel.find({
            _id: { $in: Array.from(foodIds).map((id) => new mongoose_1.default.Types.ObjectId(id)) },
        });
        for (const d of docs)
            verifiedFoodMap.set(d._id.toString(), d);
    }
    const resolveMealItems = (items) => items.map((item) => {
        const ref = item.foodItemId ? verifiedFoodMap.get(item.foodItemId) : undefined;
        if (ref) {
            return {
                foodItemId: ref._id.toString(),
                name: ref.name,
                quantityLabel: `${item.servings} × ${ref.servingLabel}`,
                calories: round1(ref.calories * item.servings),
                proteinGrams: round1(ref.proteinGrams * item.servings),
                carbsGrams: round1(ref.carbsGrams * item.servings),
                fatsGrams: round1(ref.fatsGrams * item.servings),
            };
        }
        return {
            name: item.name,
            quantityLabel: item.quantityLabel,
            calories: round1(item.calories ?? 0),
            proteinGrams: round1(item.proteinGrams ?? 0),
            carbsGrams: round1(item.carbsGrams ?? 0),
            fatsGrams: round1(item.fatsGrams ?? 0),
        };
    });
    // Archive prior active plans for this user
    await dietPlan_model_1.DietPlanModel.updateMany({ userId: targetUserId, status: 'active' }, { $set: { status: 'archived' } });
    const plan = await dietPlan_model_1.DietPlanModel.create({
        gymId: input.gymId ? new mongoose_1.default.Types.ObjectId(input.gymId) : undefined,
        userId: targetUserId,
        memberId: input.memberId ? new mongoose_1.default.Types.ObjectId(input.memberId) : undefined,
        createdByUserId: new mongoose_1.default.Types.ObjectId(actor.userId),
        title: input.title,
        dietaryPreference: input.dietaryPreference,
        dailyTargets: input.dailyTargets,
        meals: {
            breakfast: resolveMealItems(input.meals.breakfast),
            lunch: resolveMealItems(input.meals.lunch),
            dinner: resolveMealItems(input.meals.dinner),
            snacks: resolveMealItems(input.meals.snacks),
        },
        isAIGenerated: false,
        status: 'active',
    });
    return toDietPlanDTO(plan);
}
async function listDietPlans(actor) {
    const plans = await dietPlan_model_1.DietPlanModel.find({
        userId: new mongoose_1.default.Types.ObjectId(actor.userId),
    }).sort({ createdAt: -1 });
    return plans.map(toDietPlanDTO);
}
async function logFoodOrWater(actor, input) {
    const dateKey = input.dateKey || todayDateKey();
    if (input.mealType === 'water') {
        const waterMl = input.waterMl ?? 250;
        if (waterMl <= 0) {
            throw new errors_1.BadRequestError('waterMl must be greater than 0');
        }
        const log = await foodLog_model_1.FoodLogModel.create({
            gymId: actor.activeGymId ? new mongoose_1.default.Types.ObjectId(actor.activeGymId) : undefined,
            userId: new mongoose_1.default.Types.ObjectId(actor.userId),
            dateKey,
            mealType: 'water',
            foodName: `Water (${waterMl} ml)`,
            servings: 1,
            calories: 0,
            proteinGrams: 0,
            carbsGrams: 0,
            fatsGrams: 0,
            waterMl,
        });
        return toFoodLogDTO(log);
    }
    if (input.foodItemId) {
        const food = await foodItem_model_1.FoodItemModel.findById(input.foodItemId);
        if (!food) {
            throw new errors_1.NotFoundError('Food item not found');
        }
        const log = await foodLog_model_1.FoodLogModel.create({
            gymId: actor.activeGymId ? new mongoose_1.default.Types.ObjectId(actor.activeGymId) : undefined,
            userId: new mongoose_1.default.Types.ObjectId(actor.userId),
            dateKey,
            mealType: input.mealType,
            foodItemId: food._id,
            foodName: food.name,
            servings: input.servings,
            calories: round1(food.calories * input.servings),
            proteinGrams: round1(food.proteinGrams * input.servings),
            carbsGrams: round1(food.carbsGrams * input.servings),
            fatsGrams: round1(food.fatsGrams * input.servings),
            waterMl: 0,
        });
        return toFoodLogDTO(log);
    }
    if (!input.foodName) {
        throw new errors_1.BadRequestError('Provide either foodItemId or foodName');
    }
    const log = await foodLog_model_1.FoodLogModel.create({
        gymId: actor.activeGymId ? new mongoose_1.default.Types.ObjectId(actor.activeGymId) : undefined,
        userId: new mongoose_1.default.Types.ObjectId(actor.userId),
        dateKey,
        mealType: input.mealType,
        foodName: input.foodName,
        servings: input.servings,
        calories: round1((input.calories ?? 0) * input.servings),
        proteinGrams: round1((input.proteinGrams ?? 0) * input.servings),
        carbsGrams: round1((input.carbsGrams ?? 0) * input.servings),
        fatsGrams: round1((input.fatsGrams ?? 0) * input.servings),
        waterMl: 0,
    });
    return toFoodLogDTO(log);
}
async function getDailyNutritionSummary(actor, dateKeyInput) {
    const dateKey = dateKeyInput || todayDateKey();
    const [logs, activePlan] = await Promise.all([
        foodLog_model_1.FoodLogModel.find({
            userId: new mongoose_1.default.Types.ObjectId(actor.userId),
            dateKey,
        }).sort({ loggedAt: -1 }),
        dietPlan_model_1.DietPlanModel.findOne({
            userId: new mongoose_1.default.Types.ObjectId(actor.userId),
            status: 'active',
        }).sort({ createdAt: -1 }),
    ]);
    const consumed = logs.reduce((acc, log) => ({
        calories: round1(acc.calories + log.calories),
        proteinGrams: round1(acc.proteinGrams + log.proteinGrams),
        carbsGrams: round1(acc.carbsGrams + log.carbsGrams),
        fatsGrams: round1(acc.fatsGrams + log.fatsGrams),
        waterMl: Math.round(acc.waterMl + log.waterMl),
    }), { calories: 0, proteinGrams: 0, carbsGrams: 0, fatsGrams: 0, waterMl: 0 });
    const targets = activePlan?.dailyTargets ?? {
        calories: 2200,
        proteinGrams: 140,
        carbsGrams: 240,
        fatsGrams: 70,
        waterMl: 3000,
    };
    return {
        dateKey,
        targets,
        consumed,
        logs: logs.map(toFoodLogDTO),
    };
}
async function deleteFoodLog(actor, logId) {
    const log = await foodLog_model_1.FoodLogModel.findById(logId);
    if (!log) {
        throw new errors_1.NotFoundError('Food log not found');
    }
    if (log.userId.toString() !== actor.userId && actor.role !== 'super_admin') {
        throw new errors_1.ForbiddenError('Cannot delete another user food log');
    }
    await log.deleteOne();
}
