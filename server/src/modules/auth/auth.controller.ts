import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import * as authService from './auth.service';

function getSessionMeta(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.registerUser(req.body, getSessionMeta(req));
  return sendSuccess(res, result, {
    statusCode: 201,
    message: 'Account created successfully',
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.loginUser(req.body, getSessionMeta(req));
  return sendSuccess(res, result, {
    message: 'Login successful',
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.refreshUserTokens(req.body.refreshToken, getSessionMeta(req));
  return sendSuccess(res, result, {
    message: 'Tokens refreshed',
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logoutUser(req.auth!.userId, req.body, getSessionMeta(req));
  return sendSuccess(res, { loggedOut: true }, { message: 'Logged out successfully' });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.requestPasswordReset(req.body.email);
  return sendSuccess(res, result, {
    message: 'If an account exists for that email, reset instructions have been issued',
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetUserPassword(req.body.token, req.body.newPassword);
  return sendSuccess(res, { reset: true }, { message: 'Password updated successfully' });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.verifyUserEmail(req.body.token);
  return sendSuccess(res, { user }, { message: 'Email verified successfully' });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getUserProfile(req.auth!.userId);
  return sendSuccess(res, { user });
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.updateUserProfile(req.auth!.userId, req.body);
  return sendSuccess(res, { user }, { message: 'Profile updated' });
});

export const deleteMe = asyncHandler(async (req: Request, res: Response) => {
  await authService.deleteUserAccount(req.auth!.userId);
  return sendSuccess(res, { deleted: true }, { message: 'Account deleted' });
});

