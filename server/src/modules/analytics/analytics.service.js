"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardAnalytics = getDashboardAnalytics;
exports.getWorkoutAnalytics = getWorkoutAnalytics;
exports.logBodyMetric = logBodyMetric;
exports.logProgressPhoto = logProgressPhoto;
exports.getBodyProgress = getBodyProgress;
exports.getRevenueAnalytics = getRevenueAnalytics;
exports.getAttendanceAnalytics = getAttendanceAnalytics;
const mongoose_1 = __importDefault(require("mongoose"));
const errors_1 = require("../../utils/errors");
const attendance_model_1 = require("../attendance/attendance.model");
const auditLog_model_1 = require("../audit/auditLog.model");
const gym_model_1 = require("../gyms/gym.model");
const gymMember_model_1 = require("../members/gymMember.model");
const subscription_model_1 = require("../memberships/subscription.model");
const nutrition_service_1 = require("../nutrition/nutrition.service");
const payment_model_1 = require("../payments/payment.model");
const trainer_model_1 = require("../trainers/trainer.model");
const user_model_1 = require("../users/user.model");
const workoutSession_model_1 = require("../workouts/workoutSession.model");
const workout_service_1 = require("../workouts/workout.service");
const bodyMetric_model_1 = require("./bodyMetric.model");
const progressPhoto_model_1 = require("./progressPhoto.model");
function resolveGymId(actor, requestedGymId) {
    if (requestedGymId) {
        if (actor.role !== 'super_admin' && !actor.gymIds.includes(requestedGymId)) {
            throw new errors_1.ForbiddenError('Cross-tenant gym access denied');
        }
        return requestedGymId;
    }
    return actor.activeGymId || actor.gymIds[0];
}
async function getDashboardAnalytics(actor, requestedGymId) {
    if (actor.role === 'super_admin' && !requestedGymId) {
        const [totalGyms, activeGyms, totalUsers, revenueAgg, recentAudits] = await Promise.all([
            gym_model_1.GymModel.countDocuments({ isDeleted: { $ne: true } }),
            gym_model_1.GymModel.countDocuments({ isDeleted: { $ne: true }, status: 'active' }),
            user_model_1.UserModel.countDocuments({ isDeleted: { $ne: true } }),
            payment_model_1.PaymentModel.aggregate([
                { $match: { status: { $in: ['paid', 'partially_refunded'] } } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            auditLog_model_1.AuditLogModel.find().sort({ createdAt: -1 }).limit(10).lean(),
        ]);
        return {
            scope: 'platform',
            kpis: {
                totalGyms,
                activeGyms,
                totalUsers,
                platformRevenue: revenueAgg[0]?.total ?? 0,
            },
            recentAudits,
        };
    }
    if (actor.role === 'gym_admin' || (actor.role === 'super_admin' && requestedGymId)) {
        const gymId = resolveGymId(actor, requestedGymId);
        if (!gymId) {
            return { scope: 'gym', kpis: { totalMembers: 0, activeMembers: 0, trainers: 0, monthlyRevenue: 0, todayCheckIns: 0 } };
        }
        const gymObjId = new mongoose_1.default.Types.ObjectId(gymId);
        const todayKey = new Date().toISOString().slice(0, 10);
        const monthStart = new Date();
        monthStart.setUTCDate(1);
        monthStart.setUTCHours(0, 0, 0, 0);
        const [totalMembers, activeMembers, trainers, activeSubs, monthlyRevAgg, todayCheckIns] = await Promise.all([
            gymMember_model_1.GymMemberModel.countDocuments({ gymId: gymObjId, isDeleted: { $ne: true } }),
            gymMember_model_1.GymMemberModel.countDocuments({ gymId: gymObjId, isDeleted: { $ne: true }, status: 'active' }),
            trainer_model_1.TrainerModel.countDocuments({ gymId: gymObjId, isDeleted: { $ne: true }, status: 'active' }),
            subscription_model_1.SubscriptionModel.countDocuments({ gymId: gymObjId, status: 'active', isDeleted: { $ne: true } }),
            payment_model_1.PaymentModel.aggregate([
                {
                    $match: {
                        gymId: gymObjId,
                        status: { $in: ['paid', 'partially_refunded'] },
                        paidAt: { $gte: monthStart },
                    },
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            attendance_model_1.AttendanceModel.countDocuments({ gymId: gymObjId, dateKey: todayKey }),
        ]);
        return {
            scope: 'gym',
            gymId,
            kpis: {
                totalMembers,
                activeMembers,
                trainers,
                activeSubscriptions: activeSubs,
                monthlyRevenue: monthlyRevAgg[0]?.total ?? 0,
                todayCheckIns,
            },
        };
    }
    // Member or Trainer personal fitness overview
    const [workoutData, nutritionData, latestMetric] = await Promise.all([
        (0, workout_service_1.getWorkoutHistory)(actor, { page: 1, limit: 5 }),
        (0, nutrition_service_1.getDailyNutritionSummary)(actor),
        bodyMetric_model_1.BodyMetricModel.findOne({ userId: actor.userId }).sort({ recordedAt: -1 }),
    ]);
    return {
        scope: 'personal',
        kpis: {
            workoutStreakDays: workoutData.stats.currentStreakDays,
            completedWorkouts: workoutData.stats.totalCompletedSessions,
            totalVolumeKg: workoutData.stats.totalVolumeKg,
            todayCalories: nutritionData.consumed.calories,
            calorieTarget: nutritionData.targets.calories,
            todayProteinGrams: nutritionData.consumed.proteinGrams,
            proteinTarget: nutritionData.targets.proteinGrams,
            todayWaterMl: nutritionData.consumed.waterMl,
            latestWeightKg: latestMetric?.weightKg ?? null,
            latestBmi: latestMetric?.bmi ?? null,
        },
    };
}
async function getWorkoutAnalytics(actor, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const sessions = await workoutSession_model_1.WorkoutSessionModel.find({
        userId: new mongoose_1.default.Types.ObjectId(actor.userId),
        status: 'completed',
        startedAt: { $gte: since },
    }).sort({ startedAt: 1 });
    const dailyMap = new Map();
    for (const s of sessions) {
        const key = s.startedAt.toISOString().slice(0, 10);
        const existing = dailyMap.get(key) || { date: key, volumeKg: 0, sessions: 0, prs: 0 };
        existing.volumeKg = Math.round((existing.volumeKg + s.totalVolumeKg) * 100) / 100;
        existing.sessions += 1;
        existing.prs += s.personalRecordsHit;
        dailyMap.set(key, existing);
    }
    return {
        days,
        totalSessions: sessions.length,
        series: Array.from(dailyMap.values()),
    };
}
async function logBodyMetric(actor, input) {
    let bmi;
    if (input.heightCm && input.heightCm > 0) {
        const heightM = input.heightCm / 100;
        bmi = Math.round((input.weightKg / (heightM * heightM)) * 10) / 10;
    }
    const metric = await bodyMetric_model_1.BodyMetricModel.create({
        gymId: input.gymId ? new mongoose_1.default.Types.ObjectId(input.gymId) : undefined,
        userId: new mongoose_1.default.Types.ObjectId(actor.userId),
        recordedAt: input.recordedAt ? new Date(input.recordedAt) : new Date(),
        weightKg: input.weightKg,
        heightCm: input.heightCm,
        bmi,
        bodyFatPercent: input.bodyFatPercent,
        chestCm: input.chestCm,
        waistCm: input.waistCm,
        hipCm: input.hipCm,
        armCm: input.armCm,
        notes: input.notes,
    });
    return {
        id: metric._id.toString(),
        recordedAt: metric.recordedAt.toISOString(),
        weightKg: metric.weightKg,
        heightCm: metric.heightCm,
        bmi: metric.bmi,
        bodyFatPercent: metric.bodyFatPercent,
        chestCm: metric.chestCm,
        waistCm: metric.waistCm,
        hipCm: metric.hipCm,
        armCm: metric.armCm,
        notes: metric.notes,
    };
}
async function logProgressPhoto(actor, input) {
    const photo = await progressPhoto_model_1.ProgressPhotoModel.create({
        gymId: input.gymId ? new mongoose_1.default.Types.ObjectId(input.gymId) : undefined,
        userId: new mongoose_1.default.Types.ObjectId(actor.userId),
        angle: input.angle,
        imageUrl: input.imageUrl,
        caption: input.caption,
    });
    return {
        id: photo._id.toString(),
        takenAt: photo.takenAt.toISOString(),
        angle: photo.angle,
        imageUrl: photo.imageUrl,
        caption: photo.caption,
    };
}
async function getBodyProgress(actor) {
    const [metrics, photos] = await Promise.all([
        bodyMetric_model_1.BodyMetricModel.find({ userId: actor.userId }).sort({ recordedAt: 1 }).limit(90),
        progressPhoto_model_1.ProgressPhotoModel.find({ userId: actor.userId }).sort({ takenAt: -1 }).limit(30),
    ]);
    const first = metrics[0];
    const latest = metrics[metrics.length - 1];
    const weightDeltaKg = first && latest ? Math.round((latest.weightKg - first.weightKg) * 10) / 10 : 0;
    return {
        latest: latest
            ? {
                id: latest._id.toString(),
                recordedAt: latest.recordedAt.toISOString(),
                weightKg: latest.weightKg,
                heightCm: latest.heightCm,
                bmi: latest.bmi,
                bodyFatPercent: latest.bodyFatPercent,
                chestCm: latest.chestCm,
                waistCm: latest.waistCm,
                hipCm: latest.hipCm,
                armCm: latest.armCm,
            }
            : null,
        weightDeltaKg,
        series: metrics.map((m) => ({
            id: m._id.toString(),
            date: m.recordedAt.toISOString().slice(0, 10),
            recordedAt: m.recordedAt.toISOString(),
            weightKg: m.weightKg,
            bmi: m.bmi,
            bodyFatPercent: m.bodyFatPercent,
            waistCm: m.waistCm,
        })),
        photos: photos.map((p) => ({
            id: p._id.toString(),
            takenAt: p.takenAt.toISOString(),
            angle: p.angle,
            imageUrl: p.imageUrl,
            caption: p.caption,
        })),
    };
}
async function getRevenueAnalytics(actor, requestedGymId) {
    if (actor.role !== 'super_admin' && actor.role !== 'gym_admin') {
        throw new errors_1.ForbiddenError('Insufficient permissions for revenue analytics');
    }
    const gymId = resolveGymId(actor, requestedGymId);
    const matchGym = gymId ? { gymId: new mongoose_1.default.Types.ObjectId(gymId) } : {};
    const [monthlyPayments, memberGrowth, planDistribution] = await Promise.all([
        payment_model_1.PaymentModel.aggregate([
            { $match: { ...matchGym, status: { $in: ['paid', 'partially_refunded'] } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: { $ifNull: ['$paidAt', '$createdAt'] } } },
                    revenue: { $sum: '$amount' },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]),
        gymMember_model_1.GymMemberModel.aggregate([
            { $match: { ...matchGym, isDeleted: { $ne: true } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$joinedAt' } },
                    newMembers: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]),
        subscription_model_1.SubscriptionModel.aggregate([
            { $match: { ...matchGym, status: 'active', isDeleted: { $ne: true } } },
            { $group: { _id: '$planId', count: { $sum: 1 } } },
        ]),
    ]);
    return {
        monthlyRevenue: monthlyPayments.map((m) => ({
            month: m._id,
            revenue: m.revenue,
            transactions: m.count,
        })),
        memberGrowth: memberGrowth.map((g) => ({
            month: g._id,
            newMembers: g.newMembers,
        })),
        activePlanDistribution: planDistribution.map((p) => ({
            planId: p._id.toString(),
            count: p.count,
        })),
    };
}
async function getAttendanceAnalytics(actor, requestedGymId, days = 30) {
    if (actor.role !== 'super_admin' && actor.role !== 'gym_admin' && actor.role !== 'trainer') {
        throw new errors_1.ForbiddenError('Insufficient permissions for attendance analytics');
    }
    const gymId = resolveGymId(actor, requestedGymId);
    if (!gymId) {
        return { days, dailyTrend: [], totalCheckIns: 0 };
    }
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const dailyTrend = await attendance_model_1.AttendanceModel.aggregate([
        {
            $match: {
                gymId: new mongoose_1.default.Types.ObjectId(gymId),
                checkInAt: { $gte: since },
            },
        },
        { $group: { _id: '$dateKey', checkIns: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ]);
    return {
        days,
        totalCheckIns: dailyTrend.reduce((acc, r) => acc + r.checkIns, 0),
        dailyTrend: dailyTrend.map((r) => ({ date: r._id, checkIns: r.checkIns })),
    };
}
