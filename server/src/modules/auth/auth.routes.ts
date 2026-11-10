import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { authRateLimiter } from '../../middleware/rateLimiter';
import { validate } from '../../middleware/validate';
import * as authController from './auth.controller';
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
} from './auth.schema';

const router = Router();

router.post('/register', authRateLimiter, validate({ body: registerSchema }), authController.register);
router.post('/login', authRateLimiter, validate({ body: loginSchema }), authController.login);
router.post('/refresh', authRateLimiter, validate({ body: refreshSchema }), authController.refresh);
router.post('/logout', authenticate, validate({ body: logoutSchema }), authController.logout);
router.post(
  '/forgot-password',
  authRateLimiter,
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword
);
router.post(
  '/reset-password',
  authRateLimiter,
  validate({ body: resetPasswordSchema }),
  authController.resetPassword
);
router.post('/verify-email', validate({ body: verifyEmailSchema }), authController.verifyEmail);

router.get('/me', authenticate, authController.getMe);
router.patch('/me', authenticate, validate({ body: updateProfileSchema }), authController.updateMe);
router.delete('/me', authenticate, authController.deleteMe);

export const authRoutes = router;

