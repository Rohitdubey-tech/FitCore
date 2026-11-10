import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button } from '../../components/ui/Button';
import { api, getApiErrorMessage } from '../../lib/api';
import { useToastStore } from '../../store/toastStore';
const schema = z.object({
    email: z.string().email('Enter a valid email address'),
});
export const ForgotPasswordPage = () => {
    const pushToast = useToastStore((s) => s.pushToast);
    const [devResetToken, setDevResetToken] = useState(null);
    const { register, handleSubmit, formState: { errors }, } = useForm({
        resolver: zodResolver(schema),
    });
    const mutation = useMutation({
        mutationFn: async (values) => {
            const res = await api.post('/auth/forgot-password', values);
            return res.data.data;
        },
        onSuccess: (data) => {
            if (data.resetToken) {
                setDevResetToken(data.resetToken);
            }
            pushToast({
                variant: 'success',
                title: 'Reset request sent',
                description: 'Check your email for password reset instructions.',
            });
        },
        onError: (err) => {
            pushToast({
                variant: 'error',
                title: 'Request failed',
                description: getApiErrorMessage(err),
            });
        },
    });
    return (<AuthLayout title="Reset your password" subtitle="Enter your registered email to receive a reset token.">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fitcore-muted">
            Email address
          </label>
          <input type="email" placeholder="you@domain.com" className="fitcore-input" {...register('email')}/>
          {errors.email && (<p className="mt-1 text-xs text-red-400">{errors.email.message}</p>)}
        </div>

        <Button type="submit" className="w-full" isLoading={mutation.isPending}>
          Send reset link
        </Button>
      </form>

      {devResetToken && (<div className="rounded-xl border border-fitcore-accent/30 bg-fitcore-accent/10 p-4 text-xs">
          <p className="font-semibold text-fitcore-accent">Password Reset Ready</p>
          <p className="mt-1 text-fitcore-muted">
            Use the link below to set your new password immediately.
          </p>
          <Link to={`/reset-password?token=${encodeURIComponent(devResetToken)}`} className="mt-2 inline-block font-semibold text-fitcore-accent underline">
            Continue to reset password →
          </Link>
        </div>)}

      <p className="text-center text-sm text-fitcore-muted">
        Remembered your password?{' '}
        <Link to="/login" className="font-semibold text-fitcore-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>);
};
