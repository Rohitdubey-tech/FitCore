import React, { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shield, Trash2, UserCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Badge, Card, Skeleton } from '../../components/ui/Card';
import { api, getApiErrorMessage } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
const profileSchema = z.object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    phone: z.string().trim().optional(),
});
export const ProfilePage = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { updateUser, clearSession } = useAuthStore();
    const pushToast = useToastStore((s) => s.pushToast);
    const meQuery = useQuery({
        queryKey: ['auth', 'me'],
        queryFn: async () => {
            const res = await api.get('/auth/me');
            return res.data.data.user;
        },
    });
    const { register, handleSubmit, reset, formState: { errors, isDirty }, } = useForm({
        resolver: zodResolver(profileSchema),
    });
    useEffect(() => {
        if (meQuery.data) {
            updateUser(meQuery.data);
            reset({
                firstName: meQuery.data.firstName,
                lastName: meQuery.data.lastName,
                phone: meQuery.data.phone || '',
            });
        }
    }, [meQuery.data, reset, updateUser]);
    const updateMutation = useMutation({
        mutationFn: async (values) => {
            const res = await api.patch('/auth/me', {
                firstName: values.firstName,
                lastName: values.lastName,
                phone: values.phone || undefined,
            });
            return res.data.data.user;
        },
        onSuccess: (updated) => {
            updateUser(updated);
            queryClient.setQueryData(['auth', 'me'], updated);
            pushToast({ variant: 'success', title: 'Profile updated' });
        },
        onError: (err) => {
            pushToast({ variant: 'error', title: 'Update failed', description: getApiErrorMessage(err) });
        },
    });
    const deleteMutation = useMutation({
        mutationFn: async () => {
            await api.delete('/auth/me');
        },
        onSuccess: () => {
            clearSession();
            pushToast({ variant: 'info', title: 'Account deleted' });
            navigate('/login');
        },
        onError: (err) => {
            pushToast({ variant: 'error', title: 'Delete failed', description: getApiErrorMessage(err) });
        },
    });
    if (meQuery.isLoading || !meQuery.data) {
        return (<DashboardLayout>
        <Skeleton className="h-72"/>
      </DashboardLayout>);
    }
    const user = meQuery.data;
    return (<DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-fitcore-accent">
            Account Settings
          </p>
          <h1 className="mt-1 font-['Manrope'] text-2xl font-extrabold text-white">
            Profile & Security
          </h1>
        </div>

        <Card>
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <UserCheck className="h-5 w-5 text-fitcore-accent"/>
              <h2 className="font-['Manrope'] text-lg font-bold text-white">
                Personal Information
              </h2>
            </div>
            <Badge variant="accent">
              <Shield className="h-3 w-3"/>
              {user.role.replace('_', ' ')}
            </Badge>
          </div>

          <form onSubmit={handleSubmit((values) => updateMutation.mutate(values))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-fitcore-muted">
                  First name
                </label>
                <input className="fitcore-input" {...register('firstName')}/>
                {errors.firstName && (<p className="mt-1 text-xs text-red-400">{errors.firstName.message}</p>)}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-fitcore-muted">
                  Last name
                </label>
                <input className="fitcore-input" {...register('lastName')}/>
                {errors.lastName && (<p className="mt-1 text-xs text-red-400">{errors.lastName.message}</p>)}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-fitcore-muted">Email</label>
              <input value={user.email} disabled className="fitcore-input cursor-not-allowed opacity-60"/>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-fitcore-muted">Phone</label>
              <input placeholder="+91 98765 43210" className="fitcore-input" {...register('phone')}/>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={!isDirty} isLoading={updateMutation.isPending}>
                Save changes
              </Button>
            </div>
          </form>
        </Card>

        <Card className="border-red-500/30">
          <h2 className="font-['Manrope'] text-base font-bold text-red-400">Danger Zone</h2>
          <p className="mt-1 text-xs text-fitcore-muted">
            Deactivating your account signs out all active sessions and disables access.
          </p>
          <Button variant="danger" size="sm" className="mt-4" isLoading={deleteMutation.isPending} onClick={() => {
            if (window.confirm('Are you sure you want to delete your FITCORE account?')) {
                deleteMutation.mutate();
            }
        }}>
            <Trash2 className="h-4 w-4"/>
            Delete account
          </Button>
        </Card>
      </div>
    </DashboardLayout>);
};
