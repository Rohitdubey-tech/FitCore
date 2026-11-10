import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { ListMembersQuery } from './member.schema';
import * as memberService from './member.service';

export const createGymMember = asyncHandler(async (req: Request, res: Response) => {
  const member = await memberService.createGymMember(req.auth!, req.params.id, req.body);
  return sendSuccess(res, { member }, { statusCode: 201, message: 'Member registered successfully' });
});

export const listGymMembers = asyncHandler(async (req: Request, res: Response) => {
  const result = await memberService.listGymMembers(
    req.auth!,
    req.params.id,
    req.query as unknown as ListMembersQuery
  );
  return sendSuccess(res, { members: result.members }, { meta: result.meta });
});

export const getMember = asyncHandler(async (req: Request, res: Response) => {
  const member = await memberService.getMemberById(req.auth!, req.params.id);
  return sendSuccess(res, { member });
});

export const updateMember = asyncHandler(async (req: Request, res: Response) => {
  const member = await memberService.updateMember(req.auth!, req.params.id, req.body);
  return sendSuccess(res, { member }, { message: 'Member updated successfully' });
});

export const deleteMember = asyncHandler(async (req: Request, res: Response) => {
  await memberService.deleteMember(req.auth!, req.params.id);
  return sendSuccess(res, { deleted: true }, { message: 'Member removed from gym' });
});

