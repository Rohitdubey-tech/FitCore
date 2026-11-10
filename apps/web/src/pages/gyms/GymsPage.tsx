import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiSuccessResponse, GymBranchDTO, GymDTO } from '@fitcore/shared-types';
import {
  Building2,
  CheckCircle2,
  Edit3,
  Globe,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Badge, Card, Skeleton } from '../../components/ui/Card';
import { EmptyState, ErrorState } from '../../components/ui/StateViews';
import { api, getApiErrorMessage } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';

const gymFormSchema = z.object({
  name: z.string().trim().min(2, 'Gym name is required'),
  description: z.string().trim().max(1000).optional(),
  contactEmail: z.string().trim().email('Valid contact email is required'),
  contactPhone: z.string().trim().min(7, 'Phone is required'),
  website: z.string().trim().url('Valid URL required').optional().or(z.literal('')),
  timezone: z.string().trim().min(2).default('Asia/Kolkata'),
  currency: z.string().trim().length(3).default('INR'),
});

type GymFormValues = z.infer<typeof gymFormSchema>;

const branchFormSchema = z.object({
  name: z.string().trim().min(2, 'Branch name required'),
  address: z.string().trim().min(3, 'Address required'),
  city: z.string().trim().min(2, 'City required'),
  state: z.string().trim().min(2, 'State required'),
  postalCode: z.string().trim().min(3, 'Postal code required'),
  phone: z.string().trim().optional(),
  isPrimary: z.boolean().default(false),
});

type BranchFormValues = z.infer<typeof branchFormSchema>;

export const GymsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuthStore();
  const pushToast = useToastStore((s) => s.pushToast);

  const [search, setSearch] = useState('');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingGym, setEditingGym] = useState<GymDTO | null>(null);
  const [branchModalGym, setBranchModalGym] = useState<GymDTO | null>(null);

  const canManageGyms = user?.role === 'super_admin' || user?.role === 'gym_admin';

  const gymsQuery = useQuery({
    queryKey: ['gyms', search],
    queryFn: async () => {
      const res = await api.get<ApiSuccessResponse<{ gyms: GymDTO[] }>>('/gyms', {
        params: { search: search.trim() || undefined },
      });
      return res.data.data.gyms;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GymFormValues>({
    resolver: zodResolver(gymFormSchema),
    defaultValues: { timezone: 'Asia/Kolkata', currency: 'INR' },
  });

  const branchForm = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: { isPrimary: false },
  });

  const saveGymMutation = useMutation({
    mutationFn: async (values: GymFormValues) => {
      if (modalMode === 'edit' && editingGym) {
        const res = await api.patch<ApiSuccessResponse<{ gym: GymDTO }>>(
          `/gyms/${editingGym.id}`,
          values
        );
        return res.data.data.gym;
      }
      const res = await api.post<ApiSuccessResponse<{ gym: GymDTO }>>('/gyms', values);
      return res.data.data.gym;
    },
    onSuccess: (savedGym) => {
      void queryClient.invalidateQueries({ queryKey: ['gyms'] });
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      if (user && !user.gymIds.includes(savedGym.id)) {
        updateUser({
          ...user,
          gymIds: [...user.gymIds, savedGym.id],
          activeGymId: savedGym.id,
        });
      }
      pushToast({
        variant: 'success',
        title: modalMode === 'edit' ? 'Gym updated' : 'Gym created',
        description: savedGym.name,
      });
      setModalMode(null);
      setEditingGym(null);
    },
    onError: (err) => {
      pushToast({
        variant: 'error',
        title: 'Unable to save gym',
        description: getApiErrorMessage(err),
      });
    },
  });

  const deleteGymMutation = useMutation({
    mutationFn: async (gymId: string) => {
      await api.delete(`/gyms/${gymId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['gyms'] });
      pushToast({ variant: 'success', title: 'Gym deleted' });
    },
    onError: (err) => {
      pushToast({
        variant: 'error',
        title: 'Delete failed',
        description: getApiErrorMessage(err),
      });
    },
  });

  const switchGymMutation = useMutation({
    mutationFn: async (gymId: string) => {
      const res = await api.post<ApiSuccessResponse<{ activeGymId: string }>>(
        `/gyms/${gymId}/switch`
      );
      return res.data.data;
    },
    onSuccess: ({ activeGymId }) => {
      if (user) {
        updateUser({ ...user, activeGymId });
      }
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      pushToast({ variant: 'success', title: 'Active gym switched' });
    },
    onError: (err) => {
      pushToast({
        variant: 'error',
        title: 'Failed to switch active gym',
        description: getApiErrorMessage(err),
      });
    },
  });

  const updateBranchesMutation = useMutation({
    mutationFn: async ({
      gymId,
      branches,
    }: {
      gymId: string;
      branches: Array<Omit<GymBranchDTO, 'id'> & { id?: string }>;
    }) => {
      const res = await api.patch<ApiSuccessResponse<{ gym: GymDTO }>>(`/gyms/${gymId}`, {
        branches,
      });
      return res.data.data.gym;
    },
    onSuccess: (updatedGym) => {
      setBranchModalGym(updatedGym);
      void queryClient.invalidateQueries({ queryKey: ['gyms'] });
      branchForm.reset({
        name: '',
        address: '',
        city: '',
        state: '',
        postalCode: '',
        phone: '',
        isPrimary: false,
      });
      pushToast({ variant: 'success', title: 'Branches updated' });
    },
    onError: (err) => {
      pushToast({
        variant: 'error',
        title: 'Branch update failed',
        description: getApiErrorMessage(err),
      });
    },
  });

  const openCreateModal = () => {
    setEditingGym(null);
    setModalMode('create');
    reset({
      name: '',
      description: '',
      contactEmail: user?.email || '',
      contactPhone: user?.phone || '',
      website: '',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
    });
  };

  const openEditModal = (gym: GymDTO) => {
    setEditingGym(gym);
    setModalMode('edit');
    reset({
      name: gym.name,
      description: gym.description || '',
      contactEmail: gym.contactEmail,
      contactPhone: gym.contactPhone,
      website: gym.website || '',
      timezone: gym.timezone,
      currency: gym.currency,
    });
  };

  const handleAddBranch = (values: BranchFormValues) => {
    if (!branchModalGym) return;
    const existing = branchModalGym.branches.map((b) => ({
      ...b,
      isPrimary: values.isPrimary ? false : b.isPrimary,
    }));
    updateBranchesMutation.mutate({
      gymId: branchModalGym.id,
      branches: [
        ...existing,
        {
          ...values,
          isPrimary: values.isPrimary || existing.length === 0,
        },
      ],
    });
  };

  const handleRemoveBranch = (branchId: string) => {
    if (!branchModalGym) return;
    const remaining = branchModalGym.branches.filter((b) => b.id !== branchId);
    updateBranchesMutation.mutate({
      gymId: branchModalGym.id,
      branches: remaining,
    });
  };

  const gyms = gymsQuery.data || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-fitcore-accent">
              Multi-Tenant Facilities
            </p>
            <h1 className="mt-1 font-['Manrope'] text-2xl font-extrabold text-white">
              Gyms & Branches
            </h1>
            <p className="mt-1 text-sm text-fitcore-muted">
              Manage gym profiles, operating hours, contact info, and multiple branch locations.
            </p>
          </div>
          {canManageGyms && (
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              Create gym
            </Button>
          )}
        </div>

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fitcore-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search gyms by name, email, or city..."
            className="fitcore-input pl-10"
          />
        </div>

        {gymsQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-52" />
            <Skeleton className="h-52" />
          </div>
        ) : gymsQuery.isError ? (
          <ErrorState
            message={getApiErrorMessage(gymsQuery.error)}
            onRetry={() => void gymsQuery.refetch()}
          />
        ) : gyms.length === 0 ? (
          <EmptyState
            title="No gyms found"
            description="Create your first gym profile to start onboarding branches and members."
            actionLabel={canManageGyms ? 'Create gym' : undefined}
            onAction={canManageGyms ? openCreateModal : undefined}
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {gyms.map((gym) => {
              const isActive = user?.activeGymId === gym.id;
              return (
                <Card key={gym.id} className="flex flex-col justify-between space-y-5">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-fitcore-accent/15 text-fitcore-accent">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-['Manrope'] text-lg font-bold text-white">
                            {gym.name}
                          </h3>
                          <p className="text-xs text-fitcore-muted">/{gym.slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <Badge variant="accent">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </Badge>
                        )}
                        <Badge variant={gym.status === 'active' ? 'success' : 'warning'}>
                          {gym.status}
                        </Badge>
                      </div>
                    </div>

                    {gym.description && (
                      <p className="mt-3 text-sm text-fitcore-muted">{gym.description}</p>
                    )}

                    <div className="mt-4 space-y-1.5 text-xs text-fitcore-muted">
                      <p className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-fitcore-accent" />
                        {gym.contactEmail}
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-fitcore-accent" />
                        {gym.contactPhone} · {gym.currency} ({gym.timezone})
                      </p>
                      {gym.website && (
                        <p className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-fitcore-accent" />
                          {gym.website}
                        </p>
                      )}
                      <p className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-fitcore-accent" />
                        {gym.branches.length}{' '}
                        {gym.branches.length === 1 ? 'branch' : 'branches'} configured
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-fitcore-border pt-4">
                    <div className="flex flex-wrap gap-2">
                      {!isActive && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => switchGymMutation.mutate(gym.id)}
                          isLoading={switchGymMutation.isPending}
                        >
                          Set active
                        </Button>
                      )}
                      {canManageGyms && (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setBranchModalGym(gym)}
                          >
                            <MapPin className="h-3.5 w-3.5" />
                            Branches ({gym.branches.length})
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditModal(gym)}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                        </>
                      )}
                    </div>
                    {canManageGyms && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          if (window.confirm(`Delete "${gym.name}"?`)) {
                            deleteGymMutation.mutate(gym.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Gym Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-fitcore-border bg-fitcore-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-['Manrope'] text-lg font-bold text-white">
                {modalMode === 'edit' ? 'Edit Gym Profile' : 'Create New Gym'}
              </h2>
              <button
                onClick={() => setModalMode(null)}
                className="rounded-lg p-1 text-fitcore-muted hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit((values) => saveGymMutation.mutate(values))}
              className="space-y-3.5"
            >
              <div>
                <label className="mb-1 block text-xs text-fitcore-muted">Gym name</label>
                <input className="fitcore-input" {...register('name')} />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs text-fitcore-muted">Description</label>
                <textarea rows={2} className="fitcore-input" {...register('description')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-fitcore-muted">Contact email</label>
                  <input className="fitcore-input" {...register('contactEmail')} />
                  {errors.contactEmail && (
                    <p className="mt-1 text-xs text-red-400">{errors.contactEmail.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs text-fitcore-muted">Contact phone</label>
                  <input className="fitcore-input" {...register('contactPhone')} />
                  {errors.contactPhone && (
                    <p className="mt-1 text-xs text-red-400">{errors.contactPhone.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="mb-1 block text-xs text-fitcore-muted">Currency</label>
                  <input className="fitcore-input" {...register('currency')} />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs text-fitcore-muted">Timezone</label>
                  <input className="fitcore-input" {...register('timezone')} />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-fitcore-muted">Website (optional)</label>
                <input
                  placeholder="https://yourgym.com"
                  className="fitcore-input"
                  {...register('website')}
                />
                {errors.website && (
                  <p className="mt-1 text-xs text-red-400">{errors.website.message}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setModalMode(null)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={saveGymMutation.isPending}>
                  {modalMode === 'edit' ? 'Save changes' : 'Create gym'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Branches Modal */}
      {branchModalGym && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-fitcore-border bg-fitcore-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-['Manrope'] text-lg font-bold text-white">
                  Branches — {branchModalGym.name}
                </h2>
                <p className="text-xs text-fitcore-muted">
                  Add or remove physical locations under this gym tenant.
                </p>
              </div>
              <button
                onClick={() => setBranchModalGym(null)}
                className="rounded-lg p-1 text-fitcore-muted hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6 space-y-2.5">
              {branchModalGym.branches.length === 0 ? (
                <p className="rounded-xl border border-dashed border-fitcore-border p-4 text-center text-xs text-fitcore-muted">
                  No branches added yet.
                </p>
              ) : (
                branchModalGym.branches.map((branch) => (
                  <div
                    key={branch.id}
                    className="flex items-center justify-between rounded-xl border border-fitcore-border bg-[#141618] p-3.5"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{branch.name}</span>
                        {branch.isPrimary && <Badge variant="accent">Primary</Badge>}
                      </div>
                      <p className="mt-0.5 text-xs text-fitcore-muted">
                        {branch.address}, {branch.city}, {branch.state} {branch.postalCode}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleRemoveBranch(branch.id)}
                      disabled={updateBranchesMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={branchForm.handleSubmit(handleAddBranch)}
              className="space-y-3 border-t border-fitcore-border pt-4"
            >
              <h3 className="text-sm font-semibold text-white">Add new branch</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    placeholder="Branch name"
                    className="fitcore-input"
                    {...branchForm.register('name')}
                  />
                </div>
                <div>
                  <input
                    placeholder="Phone (optional)"
                    className="fitcore-input"
                    {...branchForm.register('phone')}
                  />
                </div>
              </div>
              <input
                placeholder="Street address"
                className="fitcore-input"
                {...branchForm.register('address')}
              />
              <div className="grid grid-cols-3 gap-3">
                <input
                  placeholder="City"
                  className="fitcore-input"
                  {...branchForm.register('city')}
                />
                <input
                  placeholder="State"
                  className="fitcore-input"
                  {...branchForm.register('state')}
                />
                <input
                  placeholder="Postal code"
                  className="fitcore-input"
                  {...branchForm.register('postalCode')}
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-fitcore-muted">
                <input type="checkbox" {...branchForm.register('isPrimary')} />
                Mark as primary branch
              </label>
              <div className="flex justify-end">
                <Button type="submit" size="sm" isLoading={updateBranchesMutation.isPending}>
                  <Plus className="h-3.5 w-3.5" />
                  Add branch
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

