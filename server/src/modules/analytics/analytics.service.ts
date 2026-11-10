import mongoose from 'mongoose';
import { ForbiddenError } from '../../utils/errors';
import { AttendanceModel } from '../attendance/attendance.model';
import { AuditLogModel } from '../audit/auditLog.model';
import { GymModel } from '../gyms/gym.model';
import { AuthActor } from '../gyms/gym.service';
import { GymMemberModel } from '../members/gymMember.model';
import { SubscriptionModel } from '../memberships/subscription.model';
import { getDailyNutritionSummary } from '../nutrition/nutrition.service';
import { PaymentModel } from '../payments/payment.model';
import { TrainerModel } from '../trainers/trainer.model';
import { UserModel } from '../users/user.model';
import { WorkoutSessionModel } from '../workouts/workoutSession.model';
import { getWorkoutHistory } from '../workouts/workout.service';
import { CreateBodyMetricInput, CreateProgressPhotoInput } from './analytics.schema';
import { BodyMetricModel } from './bodyMetric.model';
import { ProgressPhotoModel } from './progressPhoto.model';

function resolveGymId(actor: AuthActor, requestedGymId?: string): string | undefined {
  if (requestedGymId) {
    if (actor.role !== 'super_admin' && !actor.gymIds.includes(requestedGymId)) {
      throw new ForbiddenError('Cross-tenant gym access denied');
    }
    return requestedGymId;
  }
  return actor.activeGymId || actor.gymIds[0];
}

export async function getDashboardAnalytics(actor: AuthActor, requestedGymId?: string) {
  if (actor.role === 'super_admin' && !requestedGymId) {
    const [totalGyms, activeGyms, totalUsers, revenueAgg, recentAudits] = await Promise.all([
      GymModel.countDocuments({ isDeleted: { $ne: true } }),
      GymModel.countDocuments({ isDeleted: { $ne: true }, status: 'active' }),
      UserModel.countDocuments({ isDeleted: { $ne: true } }),
      PaymentModel.aggregate<{ total: number }>([
        { $match: { status: { $in: ['paid', 'partially_refunded'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      AuditLogModel.find().sort({ createdAt: -1 }).limit(10).lean(),
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
    const gymObjId = new mongoose.Types.ObjectId(gymId);
    const todayKey = new Date().toISOString().slice(0, 10);
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const [totalMembers, activeMembers, trainers, activeSubs, monthlyRevAgg, todayCheckIns] =
      await Promise.all([
        GymMemberModel.countDocuments({ gymId: gymObjId, isDeleted: { $ne: true } }),
        GymMemberModel.countDocuments({ gymId: gymObjId, isDeleted: { $ne: true }, status: 'active' }),
        TrainerModel.countDocuments({ gymId: gymObjId, isDeleted: { $ne: true }, status: 'active' }),
        SubscriptionModel.countDocuments({ gymId: gymObjId, status: 'active', isDeleted: { $ne: true } }),
        PaymentModel.aggregate<{ total: number }>([
          {
            $match: {
              gymId: gymObjId,
              status: { $in: ['paid', 'partially_refunded'] },
              paidAt: { $gte: monthStart },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        AttendanceModel.countDocuments({ gymId: gymObjId, dateKey: todayKey }),
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
    getWorkoutHistory(actor, { page: 1, limit: 5 }),
    getDailyNutritionSummary(actor),
    BodyMetricModel.findOne({ userId: actor.userId }).sort({ recordedAt: -1 }),
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

export async function getWorkoutAnalytics(actor: AuthActor, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sessions = await WorkoutSessionModel.find({
    userId: new mongoose.Types.ObjectId(actor.userId),
    status: 'completed',
    startedAt: { $gte: since },
  }).sort({ startedAt: 1 });

  const dailyMap = new Map<string, { date: string; volumeKg: number; sessions: number; prs: number }>();
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

export async function logBodyMetric(actor: AuthActor, input: CreateBodyMetricInput) {
  let bmi: number | undefined;
  if (input.heightCm && input.heightCm > 0) {
    const heightM = input.heightCm / 100;
    bmi = Math.round((input.weightKg / (heightM * heightM)) * 10) / 10;
  }

  const metric = await BodyMetricModel.create({
    gymId: input.gymId ? new mongoose.Types.ObjectId(input.gymId) : undefined,
    userId: new mongoose.Types.ObjectId(actor.userId),
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

export async function logProgressPhoto(actor: AuthActor, input: CreateProgressPhotoInput) {
  const photo = await ProgressPhotoModel.create({
    gymId: input.gymId ? new mongoose.Types.ObjectId(input.gymId) : undefined,
    userId: new mongoose.Types.ObjectId(actor.userId),
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

export async function getBodyProgress(actor: AuthActor) {
  const [metrics, photos] = await Promise.all([
    BodyMetricModel.find({ userId: actor.userId }).sort({ recordedAt: 1 }).limit(90),
    ProgressPhotoModel.find({ userId: actor.userId }).sort({ takenAt: -1 }).limit(30),
  ]);

  const first = metrics[0];
  const latest = metrics[metrics.length - 1];
  const weightDeltaKg =
    first && latest ? Math.round((latest.weightKg - first.weightKg) * 10) / 10 : 0;

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

export async function getRevenueAnalytics(actor: AuthActor, requestedGymId?: string) {
  if (actor.role !== 'super_admin' && actor.role !== 'gym_admin') {
    throw new ForbiddenError('Insufficient permissions for revenue analytics');
  }

  const gymId = resolveGymId(actor, requestedGymId);
  const matchGym = gymId ? { gymId: new mongoose.Types.ObjectId(gymId) } : {};

  const [monthlyPayments, memberGrowth, planDistribution] = await Promise.all([
    PaymentModel.aggregate<{ _id: string; revenue: number; count: number }>([
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
    GymMemberModel.aggregate<{ _id: string; newMembers: number }>([
      { $match: { ...matchGym, isDeleted: { $ne: true } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$joinedAt' } },
          newMembers: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    SubscriptionModel.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
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

export async function getAttendanceAnalytics(
  actor: AuthActor,
  requestedGymId?: string,
  days = 30
) {
  if (actor.role !== 'super_admin' && actor.role !== 'gym_admin' && actor.role !== 'trainer') {
    throw new ForbiddenError('Insufficient permissions for attendance analytics');
  }

  const gymId = resolveGymId(actor, requestedGymId);
  if (!gymId) {
    return { days, dailyTrend: [], totalCheckIns: 0 };
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const dailyTrend = await AttendanceModel.aggregate<{ _id: string; checkIns: number }>([
    {
      $match: {
        gymId: new mongoose.Types.ObjectId(gymId),
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

