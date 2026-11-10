import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button } from '../../components/ui/Button';
import { api, getApiErrorMessage } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
const loginSchema = z.object({
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
});
export const LoginPage = () => {
    const navigate = useNavigate();
    const setSession = useAuthStore((s) => s.setSession);
    const pushToast = useToastStore((s) => s.pushToast);
    const { register, handleSubmit, formState: { errors }, } = useForm({
        resolver: zodResolver(loginSchema),
    });
    const loginMutation = useMutation({
        mutationFn: async (values) => {
            const res = await api.post('/auth/login', values);
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
                title: `Welcome back, ${data.user.firstName}`,
            });
            navigate('/dashboard');
        },
        onError: (err) => {
            pushToast({
                variant: 'error',
                title: 'Sign in failed',
                description: getApiErrorMessage(err),
            });
        },
    });
    return (<AuthLayout title="Sign in to FITCORE" subtitle="Access your gym dashboard, training logs, and AI insights.">
      <form onSubmit={handleSubmit((values) => loginMutation.mutate(values))} className="space-y-4" noValidate>
        {loginMutation.isError && (<div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
            {getApiErrorMessage(loginMutation.error)}
          </div>)}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-fitcore-muted">
            Email address
          </label>
          <input id="email" type="email" autoComplete="email" placeholder="you@gymdomain.com" className="fitcore-input" {...register('email')}/>
          {errors.email && (<p className="mt-1 text-xs text-red-400">{errors.email.message}</p>)}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="text-xs font-medium text-fitcore-muted">
              Password
            </label>
            <Link to="/forgot-password" className="text-xs font-medium text-fitcore-accent hover:underline">
              Forgot password?
            </Link>
          </div>
          <input id="password" type="password" autoComplete="current-password" placeholder="••••••••" className="fitcore-input" {...register('password')}/>
          {errors.password && (<p className="mt-1 text-xs text-red-400">{errors.password.message}</p>)}
        </div>

        <Button type="submit" className="w-full" size="lg" isLoading={loginMutation.isPending}>
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-fitcore-muted">
        New to FITCORE?{' '}
        <Link to="/register" className="font-semibold text-fitcore-accent hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>);
};
