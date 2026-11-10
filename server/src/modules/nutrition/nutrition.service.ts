import mongoose, { FilterQuery } from 'mongoose';
import {
  DailyNutritionSummaryDTO,
  DietPlanDTO,
  DietPlanMealItemDTO,
  FoodItemDTO,
  FoodLogDTO,
  MEAL_TYPES,
} from '@fitcore/shared-types';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors';
import { AuthActor } from '../gyms/gym.service';
import { GymMemberModel } from '../members/gymMember.model';
import { DietPlanModel, IDietPlan } from './dietPlan.model';
import { FoodItemModel, IFoodItem } from './foodItem.model';
import { FoodLogModel, IFoodLog } from './foodLog.model';
import { VERIFIED_FOODS } from './foodSeedData';
import {
  CreateDietPlanInput,
  CreateFoodLogInput,
  SearchFoodsQuery,
} from './nutrition.schema';

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

function toFoodItemDTO(food: IFoodItem): FoodItemDTO {
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

function toDietPlanDTO(plan: IDietPlan): DietPlanDTO {
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

function toFoodLogDTO(log: IFoodLog): FoodLogDTO {
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

export async function ensureVerifiedFoodsSeeded(): Promise<void> {
  const count = await FoodItemModel.countDocuments();
  if (count > 0) return;

  await FoodItemModel.bulkWrite(
    VERIFIED_FOODS.map((food) => ({
      updateOne: {
        filter: { slug: food.slug },
        update: { $setOnInsert: { ...food, isVerified: true } },
        upsert: true,
      },
    }))
  );
}

export async function searchFoods(query: SearchFoodsQuery): Promise<{
  foods: FoodItemDTO[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  await ensureVerifiedFoodsSeeded();

  const filter: FilterQuery<IFoodItem> = {};
  if (query.cuisine) filter.cuisine = query.cuisine;
  if (query.category) filter.category = query.category;
  if (query.dietaryTag) filter.dietaryTags = query.dietaryTag;
  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.name = { $regex: escaped, $options: 'i' };
  }

  const skip = (query.page - 1) * query.limit;
  const [foods, total] = await Promise.all([
    FoodItemModel.find(filter).sort({ name: 1 }).skip(skip).limit(query.limit),
    FoodItemModel.countDocuments(filter),
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

export async function createDietPlan(
  actor: AuthActor,
  input: CreateDietPlanInput
): Promise<DietPlanDTO> {
  await ensureVerifiedFoodsSeeded();

  let targetUserId = new mongoose.Types.ObjectId(actor.userId);
  if (input.memberId) {
    const member = await GymMemberModel.findOne({
      _id: input.memberId,
      isDeleted: { $ne: true },
    });
    if (!member) {
      throw new NotFoundError('Target gym member not found');
    }
    if (
      actor.role !== 'super_admin' &&
      !actor.gymIds.includes(member.gymId.toString())
    ) {
      throw new ForbiddenError('Cross-tenant gym access denied');
    }
    targetUserId = member.userId;
  }

  const foodIds = new Set<string>();
  for (const mealKey of MEAL_TYPES) {
    for (const item of input.meals[mealKey]) {
      if (item.foodItemId) foodIds.add(item.foodItemId);
    }
  }

  const verifiedFoodMap = new Map<string, IFoodItem>();
  if (foodIds.size > 0) {
    const docs = await FoodItemModel.find({
      _id: { $in: Array.from(foodIds).map((id) => new mongoose.Types.ObjectId(id)) },
    });
    for (const d of docs) verifiedFoodMap.set(d._id.toString(), d);
  }

  const resolveMealItems = (
    items: CreateDietPlanInput['meals'][typeof MEAL_TYPES[number]]
  ): DietPlanMealItemDTO[] =>
    items.map((item) => {
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
  await DietPlanModel.updateMany(
    { userId: targetUserId, status: 'active' },
    { $set: { status: 'archived' } }
  );

  const plan = await DietPlanModel.create({
    gymId: input.gymId ? new mongoose.Types.ObjectId(input.gymId) : undefined,
    userId: targetUserId,
    memberId: input.memberId ? new mongoose.Types.ObjectId(input.memberId) : undefined,
    createdByUserId: new mongoose.Types.ObjectId(actor.userId),
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

export async function listDietPlans(actor: AuthActor): Promise<DietPlanDTO[]> {
  const plans = await DietPlanModel.find({
    userId: new mongoose.Types.ObjectId(actor.userId),
  }).sort({ createdAt: -1 });

  return plans.map(toDietPlanDTO);
}

export async function logFoodOrWater(
  actor: AuthActor,
  input: CreateFoodLogInput
): Promise<FoodLogDTO> {
  const dateKey = input.dateKey || todayDateKey();

  if (input.mealType === 'water') {
    const waterMl = input.waterMl ?? 250;
    if (waterMl <= 0) {
      throw new BadRequestError('waterMl must be greater than 0');
    }
    const log = await FoodLogModel.create({
      gymId: actor.activeGymId ? new mongoose.Types.ObjectId(actor.activeGymId) : undefined,
      userId: new mongoose.Types.ObjectId(actor.userId),
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
    const food = await FoodItemModel.findById(input.foodItemId);
    if (!food) {
      throw new NotFoundError('Food item not found');
    }
    const log = await FoodLogModel.create({
      gymId: actor.activeGymId ? new mongoose.Types.ObjectId(actor.activeGymId) : undefined,
      userId: new mongoose.Types.ObjectId(actor.userId),
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
    throw new BadRequestError('Provide either foodItemId or foodName');
  }

  const log = await FoodLogModel.create({
    gymId: actor.activeGymId ? new mongoose.Types.ObjectId(actor.activeGymId) : undefined,
    userId: new mongoose.Types.ObjectId(actor.userId),
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

export async function getDailyNutritionSummary(
  actor: AuthActor,
  dateKeyInput?: string
): Promise<DailyNutritionSummaryDTO> {
  const dateKey = dateKeyInput || todayDateKey();

  const [logs, activePlan] = await Promise.all([
    FoodLogModel.find({
      userId: new mongoose.Types.ObjectId(actor.userId),
      dateKey,
    }).sort({ loggedAt: -1 }),
    DietPlanModel.findOne({
      userId: new mongoose.Types.ObjectId(actor.userId),
      status: 'active',
    }).sort({ createdAt: -1 }),
  ]);

  const consumed = logs.reduce(
    (acc, log) => ({
      calories: round1(acc.calories + log.calories),
      proteinGrams: round1(acc.proteinGrams + log.proteinGrams),
      carbsGrams: round1(acc.carbsGrams + log.carbsGrams),
      fatsGrams: round1(acc.fatsGrams + log.fatsGrams),
      waterMl: Math.round(acc.waterMl + log.waterMl),
    }),
    { calories: 0, proteinGrams: 0, carbsGrams: 0, fatsGrams: 0, waterMl: 0 }
  );

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

export async function deleteFoodLog(actor: AuthActor, logId: string): Promise<void> {
  const log = await FoodLogModel.findById(logId);
  if (!log) {
    throw new NotFoundError('Food log not found');
  }
  if (log.userId.toString() !== actor.userId && actor.role !== 'super_admin') {
    throw new ForbiddenError('Cannot delete another user food log');
  }
  await log.deleteOne();
}

