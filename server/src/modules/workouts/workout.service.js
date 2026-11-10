"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureSystemExercisesSeeded = ensureSystemExercisesSeeded;
exports.listExercises = listExercises;
exports.createCustomExercise = createCustomExercise;
exports.createWorkoutPlan = createWorkoutPlan;
exports.listWorkoutPlans = listWorkoutPlans;
exports.getWorkoutPlanById = getWorkoutPlanById;
exports.updateWorkoutPlan = updateWorkoutPlan;
exports.logWorkoutSession = logWorkoutSession;
exports.updateWorkoutSession = updateWorkoutSession;
exports.getWorkoutHistory = getWorkoutHistory;
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = __importDefault(require("mongoose"));
const errors_1 = require("../../utils/errors");
const gymMember_model_1 = require("../members/gymMember.model");
const exercise_model_1 = require("./exercise.model");
const exerciseSeedData_1 = require("./exerciseSeedData");
const workoutPlan_model_1 = require("./workoutPlan.model");
const workoutSession_model_1 = require("./workoutSession.model");
function assertGymAccess(actor, gymId) {
    if (!gymId || actor.role === 'super_admin')
        return;
    if (!actor.gymIds.includes(gymId)) {
        throw new errors_1.ForbiddenError('Cross-tenant gym access denied');
    }
}
function toExerciseDTO(ex) {
    return {
        id: ex._id.toString(),
        gymId: ex.gymId?.toString(),
        name: ex.name,
        slug: ex.slug,
        muscleGroup: ex.muscleGroup,
        secondaryMuscles: ex.secondaryMuscles || [],
        equipment: ex.equipment,
        difficulty: ex.difficulty,
        description: ex.description,
        instructions: ex.instructions || [],
        tips: ex.tips || [],
        isSystem: ex.isSystem,
    };
}
function toWorkoutPlanDTO(plan, exerciseMap) {
    return {
        id: plan._id.toString(),
        gymId: plan.gymId?.toString(),
        createdByUserId: plan.createdByUserId.toString(),
        assignedMemberId: plan.assignedMemberId?.toString(),
        name: plan.name,
        goal: plan.goal,
        difficulty: plan.difficulty,
        daysPerWeek: plan.daysPerWeek,
        days: (plan.days || []).map((d) => ({
            dayNumber: d.dayNumber,
            title: d.title,
            exercises: (d.exercises || []).map((ex) => {
                const ref = exerciseMap?.get(ex.exerciseId.toString());
                return {
                    exerciseId: ex.exerciseId.toString(),
                    exerciseName: ref?.name,
                    muscleGroup: ref?.muscleGroup,
                    sets: ex.sets,
                    reps: ex.reps,
                    restSeconds: ex.restSeconds,
                    targetWeightKg: ex.targetWeightKg,
                    notes: ex.notes,
                };
            }),
        })),
        status: plan.status,
        createdAt: plan.createdAt.toISOString(),
        updatedAt: plan.updatedAt.toISOString(),
    };
}
function toWorkoutSessionDTO(session) {
    return {
        id: session._id.toString(),
        gymId: session.gymId?.toString(),
        userId: session.userId.toString(),
        memberId: session.memberId?.toString(),
        workoutPlanId: session.workoutPlanId?.toString(),
        title: session.title,
        startedAt: session.startedAt.toISOString(),
        completedAt: session.completedAt?.toISOString(),
        durationMinutes: session.durationMinutes,
        status: session.status,
        exercises: (session.exercises || []).map((ex) => ({
            exerciseId: ex.exerciseId.toString(),
            exerciseName: ex.exerciseName,
            sets: (ex.sets || []).map((s) => ({
                setNumber: s.setNumber,
                reps: s.reps,
                weightKg: s.weightKg,
                rpe: s.rpe,
                isCompleted: s.isCompleted,
                isPersonalRecord: s.isPersonalRecord,
            })),
        })),
        totalVolumeKg: session.totalVolumeKg,
        personalRecordsHit: session.personalRecordsHit,
        notes: session.notes,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
    };
}
async function ensureSystemExercisesSeeded() {
    const count = await exercise_model_1.ExerciseModel.countDocuments({ isSystem: true });
    if (count > 0)
        return;
    await exercise_model_1.ExerciseModel.bulkWrite(exerciseSeedData_1.SYSTEM_EXERCISES.map((ex) => ({
        updateOne: {
            filter: { slug: ex.slug },
            update: { $setOnInsert: { ...ex, isSystem: true, isDeleted: false } },
            upsert: true,
        },
    })));
}
async function listExercises(actor, query) {
    await ensureSystemExercisesSeeded();
    const filter = {
        isDeleted: { $ne: true },
        $or: [
            { isSystem: true },
            ...(actor.gymIds.length > 0
                ? [{ gymId: { $in: actor.gymIds.map((id) => new mongoose_1.default.Types.ObjectId(id)) } }]
                : []),
        ],
    };
    if (query.muscleGroup)
        filter.muscleGroup = query.muscleGroup;
    if (query.equipment)
        filter.equipment = query.equipment;
    if (query.difficulty)
        filter.difficulty = query.difficulty;
    if (query.search) {
        const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$and = [
            {
                $or: [
                    { name: { $regex: escaped, $options: 'i' } },
                    { description: { $regex: escaped, $options: 'i' } },
                ],
            },
        ];
    }
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
        exercise_model_1.ExerciseModel.find(filter).sort({ name: 1 }).skip(skip).limit(query.limit),
        exercise_model_1.ExerciseModel.countDocuments(filter),
    ]);
    return {
        exercises: items.map(toExerciseDTO),
        meta: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / query.limit)),
        },
    };
}
async function createCustomExercise(actor, input) {
    const gymId = input.gymId || actor.activeGymId;
    if (gymId)
        assertGymAccess(actor, gymId);
    const baseSlug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    const slug = `${baseSlug}-${crypto_1.default.randomBytes(3).toString('hex')}`;
    const exercise = await exercise_model_1.ExerciseModel.create({
        gymId: gymId ? new mongoose_1.default.Types.ObjectId(gymId) : undefined,
        name: input.name,
        slug,
        muscleGroup: input.muscleGroup,
        secondaryMuscles: input.secondaryMuscles,
        equipment: input.equipment,
        difficulty: input.difficulty,
        description: input.description,
        instructions: input.instructions,
        tips: input.tips,
        isSystem: false,
    });
    return toExerciseDTO(exercise);
}
async function hydrateExerciseMap(plans) {
    const ids = new Set();
    for (const plan of plans) {
        for (const day of plan.days || []) {
            for (const ex of day.exercises || []) {
                ids.add(ex.exerciseId.toString());
            }
        }
    }
    if (ids.size === 0)
        return new Map();
    const docs = await exercise_model_1.ExerciseModel.find({
        _id: { $in: Array.from(ids).map((id) => new mongoose_1.default.Types.ObjectId(id)) },
    });
    return new Map(docs.map((d) => [d._id.toString(), d]));
}
async function createWorkoutPlan(actor, input) {
    const gymId = input.gymId || actor.activeGymId;
    if (gymId)
        assertGymAccess(actor, gymId);
    if (input.assignedMemberId && gymId) {
        const validMember = await gymMember_model_1.GymMemberModel.exists({
            _id: input.assignedMemberId,
            gymId,
            isDeleted: { $ne: true },
        });
        if (!validMember) {
            throw new errors_1.NotFoundError('Assigned member not found in this gym');
        }
    }
    const plan = await workoutPlan_model_1.WorkoutPlanModel.create({
        gymId: gymId ? new mongoose_1.default.Types.ObjectId(gymId) : undefined,
        createdByUserId: new mongoose_1.default.Types.ObjectId(actor.userId),
        assignedMemberId: input.assignedMemberId
            ? new mongoose_1.default.Types.ObjectId(input.assignedMemberId)
            : undefined,
        name: input.name,
        goal: input.goal,
        difficulty: input.difficulty,
        daysPerWeek: input.daysPerWeek,
        days: input.days.map((d) => ({
            dayNumber: d.dayNumber,
            title: d.title,
            exercises: d.exercises.map((e) => ({
                exerciseId: new mongoose_1.default.Types.ObjectId(e.exerciseId),
                sets: e.sets,
                reps: e.reps,
                restSeconds: e.restSeconds,
                targetWeightKg: e.targetWeightKg,
                notes: e.notes,
            })),
        })),
        status: 'active',
    });
    const exMap = await hydrateExerciseMap([plan]);
    return toWorkoutPlanDTO(plan, exMap);
}
async function listWorkoutPlans(actor, query) {
    const filter = { isDeleted: { $ne: true } };
    if (query.gymId) {
        assertGymAccess(actor, query.gymId);
        filter.gymId = new mongoose_1.default.Types.ObjectId(query.gymId);
    }
    else if (actor.role !== 'super_admin') {
        filter.$or = [
            { createdByUserId: new mongoose_1.default.Types.ObjectId(actor.userId) },
            ...(actor.gymIds.length > 0
                ? [{ gymId: { $in: actor.gymIds.map((id) => new mongoose_1.default.Types.ObjectId(id)) } }]
                : []),
        ];
    }
    if (actor.role === 'member') {
        const memberDocs = await gymMember_model_1.GymMemberModel.find({
            userId: new mongoose_1.default.Types.ObjectId(actor.userId),
            isDeleted: { $ne: true },
        }).select('_id');
        const memberIds = memberDocs.map((m) => m._id);
        filter.$and = [
            {
                $or: [
                    { createdByUserId: new mongoose_1.default.Types.ObjectId(actor.userId) },
                    ...(memberIds.length > 0 ? [{ assignedMemberId: { $in: memberIds } }] : []),
                ],
            },
        ];
    }
    else if (query.assignedMemberId) {
        filter.assignedMemberId = new mongoose_1.default.Types.ObjectId(query.assignedMemberId);
    }
    if (query.status)
        filter.status = query.status;
    const skip = (query.page - 1) * query.limit;
    const [plans, total] = await Promise.all([
        workoutPlan_model_1.WorkoutPlanModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
        workoutPlan_model_1.WorkoutPlanModel.countDocuments(filter),
    ]);
    const exMap = await hydrateExerciseMap(plans);
    return {
        workouts: plans.map((p) => toWorkoutPlanDTO(p, exMap)),
        meta: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / query.limit)),
        },
    };
}
async function getWorkoutPlanById(actor, planId) {
    const plan = await workoutPlan_model_1.WorkoutPlanModel.findOne({
        _id: planId,
        isDeleted: { $ne: true },
    });
    if (!plan) {
        throw new errors_1.NotFoundError('Workout plan not found');
    }
    if (plan.gymId) {
        assertGymAccess(actor, plan.gymId.toString());
    }
    else if (actor.role !== 'super_admin' &&
        plan.createdByUserId.toString() !== actor.userId) {
        throw new errors_1.ForbiddenError('Access denied');
    }
    const exMap = await hydrateExerciseMap([plan]);
    return toWorkoutPlanDTO(plan, exMap);
}
async function updateWorkoutPlan(actor, planId, input) {
    const plan = await workoutPlan_model_1.WorkoutPlanModel.findOne({
        _id: planId,
        isDeleted: { $ne: true },
    });
    if (!plan) {
        throw new errors_1.NotFoundError('Workout plan not found');
    }
    if (plan.gymId) {
        assertGymAccess(actor, plan.gymId.toString());
    }
    else if (actor.role !== 'super_admin' &&
        plan.createdByUserId.toString() !== actor.userId) {
        throw new errors_1.ForbiddenError('Access denied');
    }
    if (input.name !== undefined)
        plan.name = input.name;
    if (input.goal !== undefined)
        plan.goal = input.goal;
    if (input.difficulty !== undefined)
        plan.difficulty = input.difficulty;
    if (input.daysPerWeek !== undefined)
        plan.daysPerWeek = input.daysPerWeek;
    if (input.status !== undefined)
        plan.status = input.status;
    if (input.days !== undefined) {
        plan.days = input.days.map((d) => ({
            dayNumber: d.dayNumber,
            title: d.title,
            exercises: d.exercises.map((e) => ({
                exerciseId: new mongoose_1.default.Types.ObjectId(e.exerciseId),
                sets: e.sets,
                reps: e.reps,
                restSeconds: e.restSeconds,
                targetWeightKg: e.targetWeightKg,
                notes: e.notes,
            })),
        }));
    }
    await plan.save();
    const exMap = await hydrateExerciseMap([plan]);
    return toWorkoutPlanDTO(plan, exMap);
}
async function computeVolumeAndPersonalRecords(userId, exercisesInput, excludeSessionId) {
    const exerciseIds = exercisesInput.map((e) => new mongoose_1.default.Types.ObjectId(e.exerciseId));
    const priorMaxMap = new Map();
    if (exerciseIds.length > 0) {
        const matchStage = {
            userId: new mongoose_1.default.Types.ObjectId(userId),
            status: 'completed',
            'exercises.exerciseId': { $in: exerciseIds },
        };
        if (excludeSessionId) {
            matchStage._id = { $ne: new mongoose_1.default.Types.ObjectId(excludeSessionId) };
        }
        const priorMaxRows = await workoutSession_model_1.WorkoutSessionModel.aggregate([
            { $match: matchStage },
            { $unwind: '$exercises' },
            { $match: { 'exercises.exerciseId': { $in: exerciseIds } } },
            { $unwind: '$exercises.sets' },
            { $match: { 'exercises.sets.isCompleted': true } },
            {
                $group: {
                    _id: '$exercises.exerciseId',
                    maxWeight: { $max: '$exercises.sets.weightKg' },
                },
            },
        ]);
        for (const row of priorMaxRows) {
            priorMaxMap.set(row._id.toString(), row.maxWeight);
        }
    }
    let totalVolumeKg = 0;
    let personalRecordsHit = 0;
    const processedExercises = exercisesInput.map((ex) => {
        let currentBest = priorMaxMap.get(ex.exerciseId) ?? 0;
        const sets = ex.sets.map((s) => {
            let isPersonalRecord = false;
            if (s.isCompleted) {
                totalVolumeKg += s.reps * s.weightKg;
                if (s.weightKg > 0 && s.weightKg > currentBest) {
                    isPersonalRecord = true;
                    currentBest = s.weightKg;
                    personalRecordsHit += 1;
                }
            }
            return {
                setNumber: s.setNumber,
                reps: s.reps,
                weightKg: s.weightKg,
                rpe: s.rpe,
                isCompleted: s.isCompleted,
                isPersonalRecord,
            };
        });
        return {
            exerciseId: new mongoose_1.default.Types.ObjectId(ex.exerciseId),
            exerciseName: ex.exerciseName,
            sets,
        };
    });
    return {
        exercises: processedExercises,
        totalVolumeKg: Math.round(totalVolumeKg * 100) / 100,
        personalRecordsHit,
    };
}
async function logWorkoutSession(actor, input) {
    const gymId = input.gymId || actor.activeGymId;
    if (gymId)
        assertGymAccess(actor, gymId);
    const member = gymId
        ? await gymMember_model_1.GymMemberModel.findOne({
            gymId,
            userId: actor.userId,
            isDeleted: { $ne: true },
        }).select('_id')
        : null;
    const { exercises, totalVolumeKg, personalRecordsHit } = await computeVolumeAndPersonalRecords(actor.userId, input.exercises);
    const startedAt = input.startedAt ? new Date(input.startedAt) : new Date();
    const completedAt = input.status === 'completed'
        ? input.completedAt
            ? new Date(input.completedAt)
            : new Date()
        : undefined;
    const session = await workoutSession_model_1.WorkoutSessionModel.create({
        gymId: gymId ? new mongoose_1.default.Types.ObjectId(gymId) : undefined,
        userId: new mongoose_1.default.Types.ObjectId(actor.userId),
        memberId: member?._id,
        workoutPlanId: input.workoutPlanId
            ? new mongoose_1.default.Types.ObjectId(input.workoutPlanId)
            : undefined,
        title: input.title,
        startedAt,
        completedAt,
        durationMinutes: input.durationMinutes,
        status: input.status,
        exercises,
        totalVolumeKg,
        personalRecordsHit,
        notes: input.notes,
    });
    return toWorkoutSessionDTO(session);
}
async function updateWorkoutSession(actor, sessionId, input) {
    const session = await workoutSession_model_1.WorkoutSessionModel.findById(sessionId);
    if (!session) {
        throw new errors_1.NotFoundError('Workout session not found');
    }
    if (session.userId.toString() !== actor.userId && actor.role !== 'super_admin') {
        throw new errors_1.ForbiddenError('Cannot modify another user workout session');
    }
    if (input.title !== undefined)
        session.title = input.title;
    if (input.status !== undefined)
        session.status = input.status;
    if (input.durationMinutes !== undefined)
        session.durationMinutes = input.durationMinutes;
    if (input.notes !== undefined)
        session.notes = input.notes;
    if (input.status === 'completed' && !session.completedAt) {
        session.completedAt = input.completedAt ? new Date(input.completedAt) : new Date();
    }
    if (input.exercises !== undefined) {
        const computed = await computeVolumeAndPersonalRecords(session.userId.toString(), input.exercises, session._id.toString());
        session.exercises = computed.exercises;
        session.totalVolumeKg = computed.totalVolumeKg;
        session.personalRecordsHit = computed.personalRecordsHit;
    }
    await session.save();
    return toWorkoutSessionDTO(session);
}
function calculateStreakDays(completedDates) {
    if (completedDates.length === 0)
        return 0;
    const daySet = new Set(completedDates.map((d) => {
        const copy = new Date(d);
        copy.setUTCHours(0, 0, 0, 0);
        return copy.getTime();
    }));
    const oneDayMs = 24 * 60 * 60 * 1000;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    let cursor = today.getTime();
    if (!daySet.has(cursor)) {
        cursor -= oneDayMs;
        if (!daySet.has(cursor)) {
            return 0;
        }
    }
    let streak = 0;
    while (daySet.has(cursor)) {
        streak += 1;
        cursor -= oneDayMs;
    }
    return streak;
}
async function getWorkoutHistory(actor, query) {
    const filter = {
        userId: new mongoose_1.default.Types.ObjectId(actor.userId),
    };
    if (query.gymId) {
        assertGymAccess(actor, query.gymId);
        filter.gymId = new mongoose_1.default.Types.ObjectId(query.gymId);
    }
    if (query.status)
        filter.status = query.status;
    if (query.exerciseId) {
        filter['exercises.exerciseId'] = new mongoose_1.default.Types.ObjectId(query.exerciseId);
    }
    const skip = (query.page - 1) * query.limit;
    const [sessions, total, allCompleted] = await Promise.all([
        workoutSession_model_1.WorkoutSessionModel.find(filter).sort({ startedAt: -1 }).skip(skip).limit(query.limit),
        workoutSession_model_1.WorkoutSessionModel.countDocuments(filter),
        workoutSession_model_1.WorkoutSessionModel.find({
            userId: new mongoose_1.default.Types.ObjectId(actor.userId),
            status: 'completed',
        })
            .select('startedAt completedAt totalVolumeKg personalRecordsHit')
            .sort({ startedAt: -1 }),
    ]);
    const stats = {
        totalCompletedSessions: allCompleted.length,
        currentStreakDays: calculateStreakDays(allCompleted.map((s) => s.completedAt || s.startedAt)),
        totalVolumeKg: Math.round(allCompleted.reduce((acc, s) => acc + (s.totalVolumeKg || 0), 0) * 100) / 100,
        totalPersonalRecords: allCompleted.reduce((acc, s) => acc + (s.personalRecordsHit || 0), 0),
    };
    return {
        sessions: sessions.map(toWorkoutSessionDTO),
        stats,
        meta: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / query.limit)),
        },
    };
}
