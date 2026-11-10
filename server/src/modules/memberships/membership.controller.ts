import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { ListPlansQuery, ListSubscriptionsQuery } from './membership.schema';
import * as membershipService from './membership.service';

export const createPlan = asyncHandler(async (req: Request, res: Response) => {
  const plan = await membershipService.createPlan(req.auth!, req.body);
  return sendSuccess(res, { plan }, { statusCode: 201, message: 'Membership plan created' });
});

export const listPlans = asyncHandler(async (req: Request, res: Response) => {
  const result = await membershipService.listPlans(
    req.auth!,
    req.query as unknown as ListPlansQuery
  );
  return sendSuccess(res, { plans: result.plans }, { meta: result.meta });
});

export const updatePlan = asyncHandler(async (req: Request, res: Response) => {
  const plan = await membershipService.updatePlan(req.auth!, req.params.id, req.body);
  return sendSuccess(res, { plan }, { message: 'Membership plan updated' });
});

export const createSubscription = asyncHandler(async (req: Request, res: Response) => {
  const subscription = await membershipService.createSubscription(req.auth!, req.body);
  return sendSuccess(
    res,
    { subscription },
    { statusCode: 201, message: 'Subscription activated' }
  );
});

export const listSubscriptions = asyncHandler(async (req: Request, res: Response) => {
  const result = await membershipService.listSubscriptions(
    req.auth!,
    req.query as unknown as ListSubscriptionsQuery
  );
  return sendSuccess(res, { subscriptions: result.subscriptions }, { meta: result.meta });
});

export const updateSubscription = asyncHandler(async (req: Request, res: Response) => {
  const subscription = await membershipService.updateSubscription(
    req.auth!,
    req.params.id,
    req.body
  );
  return sendSuccess(res, { subscription }, { message: 'Subscription updated' });
});

