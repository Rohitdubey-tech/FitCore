import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import * as analyticsService from './analytics.service';

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.getDashboardAnalytics(
    req.auth!,
    req.query.gymId as string | undefined
  );
  return sendSuccess(res, data);
});

export const getWorkouts = asyncHandler(async (req: Request, res: Response) => {
  const days = Number(req.query.days) || 30;
  const data = await analyticsService.getWorkoutAnalytics(req.auth!, days);
  return sendSuccess(res, data);
});

export const getBodyProgress = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.getBodyProgress(req.auth!);
  return sendSuccess(res, data);
});

export const logBodyMetric = asyncHandler(async (req: Request, res: Response) => {
  const metric = await analyticsService.logBodyMetric(req.auth!, req.body);
  return sendSuccess(res, { metric }, { statusCode: 201, message: 'Body metric recorded' });
});

export const logProgressPhoto = asyncHandler(async (req: Request, res: Response) => {
  const photo = await analyticsService.logProgressPhoto(req.auth!, req.body);
  return sendSuccess(res, { photo }, { statusCode: 201, message: 'Progress photo saved' });
});

export const getRevenue = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.getRevenueAnalytics(
    req.auth!,
    req.query.gymId as string | undefined
  );
  return sendSuccess(res, data);
});

export const getAttendance = asyncHandler(async (req: Request, res: Response) => {
  const days = Number(req.query.days) || 30;
  const data = await analyticsService.getAttendanceAnalytics(
    req.auth!,
    req.query.gymId as string | undefined,
    days
  );
  return sendSuccess(res, data);
});

