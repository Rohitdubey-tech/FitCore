import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button } from '../../components/ui/Button';
import { api, getApiErrorMessage } from '../../lib/api';
import { useToastStore } from '../../store/toastStore';

const schema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[0-9]/, 'Must include a number'),
});

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const pushToast = useToastStore((s) => s.pushToast);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      token: searchParams.get('token') || '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      await api.post('/auth/reset-password', values);
    },
    onSuccess: () => {
      pushToast({
        variant: 'success',
        title: 'Password updated',
        description: 'You can now sign in with your new password.',
      });
      navigate('/login');
    },
    onError: (err) => {
      pushToast({
        variant: 'error',
        title: 'Reset failed',
        description: getApiErrorMessage(err),
      });
    },
  });

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a strong password for your FITCORE account."
    >
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fitcore-muted">
            Reset token
          </label>
          <input className="fitcore-input font-mono text-xs" {...register('token')} />
          {errors.token && (
            <p className="mt-1 text-xs text-red-400">{errors.token.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-fitcore-muted">
            New password
          </label>
          <input
            type="password"
            placeholder="Min 8 chars, 1 uppercase, 1 number"
            className="fitcore-input"
            {...register('newPassword')}
          />
          {errors.newPassword && (
            <p className="mt-1 text-xs text-red-400">{errors.newPassword.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" isLoading={mutation.isPending}>
          Update password
        </Button>
      </form>

      <p className="text-center text-sm text-fitcore-muted">
        <Link to="/login" className="font-semibold text-fitcore-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
};

