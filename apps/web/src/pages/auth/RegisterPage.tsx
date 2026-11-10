import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import type { ApiSuccessResponse, AuthResponseDTO } from '@fitcore/shared-types';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button } from '../../components/ui/Button';
import { api, getApiErrorMessage } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';

const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    email: z.string().trim().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Must include an uppercase letter')
      .regex(/[a-z]/, 'Must include a lowercase letter')
      .regex(/[0-9]/, 'Must include a number'),
    role: z.enum(['member', 'gym_admin']),
    gymName: z.string().optional(),
  })
  .refine(
    (data) => data.role !== 'gym_admin' || (data.gymName && data.gymName.trim().length >= 2),
    {
      message: 'Gym name is required for gym owner accounts',
      path: ['gymName'],
    }
  );

type RegisterFormValues = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const pushToast = useToastStore((s) => s.pushToast);

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'member',
    },
  });

  const selectedRole = watch('role');

  const registerMutation = useMutation({
    mutationFn: async (values: RegisterFormValues) => {
      const payload = {
        ...values,
        gymName: values.role === 'gym_admin' ? values.gymName?.trim() : undefined,
      };
      const res = await api.post<ApiSuccessResponse<AuthResponseDTO>>('/auth/register', payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      setSession({
        user: data.user,
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
      });
      pushToast({
        variant: 'success',
        title: 'Account created',
        description: 'Welcome to FITCORE.',
      });
      navigate('/dashboard');
    },
    onError: (err) => {
      pushToast({
        variant: 'error',
        title: 'Registration failed',
        description: getApiErrorMessage(err),
      });
    },
  });

  return (
    <AuthLayout
      title="Create your FITCORE account"
      subtitle="Join as a fitness member or onboard your gym business."
    >
      <form
        onSubmit={handleSubmit((values) => registerMutation.mutate(values))}
        className="space-y-4"
        noValidate
      >
        {registerMutation.isError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
            {getApiErrorMessage(registerMutation.error)}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-fitcore-muted">
              First name
            </label>
            <input placeholder="Aarav" className="fitcore-input" {...register('firstName')} />
            {errors.firstName && (
              <p className="mt-1 text-xs text-red-400">{errors.firstName.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-fitcore-muted">
              Last name
            </label>
            <input placeholder="Mehta" className="fitcore-input" {...register('lastName')} />
            {errors.lastName && (
              <p className="mt-1 text-xs text-red-400">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-fitcore-muted">
            Account type
          </label>
          <select className="fitcore-input" {...register('role')}>
            <option value="member">Gym Member / Fitness Enthusiast</option>
            <option value="gym_admin">Gym Owner / Business Admin</option>
          </select>
        </div>

        {selectedRole === 'gym_admin' && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-fitcore-muted">
              Gym or Studio Name
            </label>
            <input
              placeholder="Iron Pulse Performance Club"
              className="fitcore-input"
              {...register('gymName')}
            />
            {errors.gymName && (
              <p className="mt-1 text-xs text-red-400">{errors.gymName.message}</p>
            )}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-medium text-fitcore-muted">
            Email address
          </label>
          <input
            type="email"
            placeholder="you@domain.com"
            className="fitcore-input"
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-fitcore-muted">
            Password
          </label>
          <input
            type="password"
            placeholder="Min 8 chars, 1 uppercase, 1 number"
            className="fitcore-input"
            {...register('password')}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={registerMutation.isPending}
        >
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-fitcore-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-fitcore-accent hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
};

