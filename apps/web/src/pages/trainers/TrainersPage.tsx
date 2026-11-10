import React, { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  TRAINER_STATUSES,
  type ApiSuccessResponse,
  type GymDTO,
  type GymMemberDTO,
  type TrainerDTO,
} from '@fitcore/shared-types';
import { Award, CalendarClock, Dumbbell, Plus, Search, Users, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Badge, Card, Skeleton } from '../../components/ui/Card';
import { EmptyState, ErrorState } from '../../components/ui/StateViews';
import { api, getApiErrorMessage } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';

const trainerFormSchema = z.object({
  firstName: z.string().trim().min(1, 'First name required'),
  lastName: z.string().trim().min(1, 'Last name required'),
  email: z.string().trim().email('Valid email required'),
  phone: z.string().trim().optional(),
  experienceYears: z.coerce.number().min(0).max(60).default(1),
  specializationsText: z.string().trim().optional(),
  bio: z.string().trim().max(1000).optional(),
  status: z.enum(TRAINER_STATUSES).default('active'),
});

type TrainerFormValues = z.infer<typeof trainerFormSchema>;

export const TrainersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const pushToast = useToastStore((s) => s.pushToast);

  const [selectedGymId, setSelectedGymId] = useState(user?.activeGymId || '');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [assignModalTrainer, setAssignModalTrainer] = useState<TrainerDTO | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const canManage = user?.role === 'super_admin' || user?.role === 'gym_admin';

  const gymsQuery = useQuery({
    queryKey: ['gyms', 'for-trainers'],
    queryFn: async () => {
      const res = await api.get<ApiSuccessResponse<{ gyms: GymDTO[] }>>('/gyms');
      return res.data.data.gyms;
    },
  });

  useEffect(() => {
    if (!selectedGymId && gymsQuery.data && gymsQuery.data.length > 0) {
      setSelectedGymId(user?.activeGymId || gymsQuery.data[0].id);
    }
  }, [gymsQuery.data, selectedGymId, user?.activeGymId]);

  const trainersQuery = useQuery({
    queryKey: ['trainers', selectedGymId, search],
    enabled: Boolean(selectedGymId),
    queryFn: async () => {
      const res = await api.get<ApiSuccessResponse<{ trainers: TrainerDTO[] }>>(
        `/gyms/${selectedGymId}/trainers`,
        { params: { search: search.trim() || undefined } }
      );
      return res.data.data.trainers;
    },
  });

  const gymMembersQuery = useQuery({
    queryKey: ['members', 'assign-list', selectedGymId],
    enabled: Boolean(assignModalTrainer && selectedGymId),
    queryFn: async () => {
      const res = await api.get<ApiSuccessResponse<{ members: GymMemberDTO[] }>>(
        `/gyms/${selectedGymId}/members`,
        { params: { limit: 100 } }
      );
      return res.data.data.members;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TrainerFormValues>({
    resolver: zodResolver(trainerFormSchema),
    defaultValues: { experienceYears: 2, status: 'active' },
  });

  const createTrainerMutation = useMutation({
    mutationFn: async (values: TrainerFormValues) => {
      const specializations = (values.specializationsText || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await api.post<ApiSuccessResponse<{ trainer: TrainerDTO }>>(
        `/gyms/${selectedGymId}/trainers`,
        {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone || undefined,
          experienceYears: values.experienceYears,
          specializations,
          bio: values.bio || undefined,
          status: values.status,
        }
      );
      return res.data.data.trainer;
    },
    onSuccess: (trainer) => {
      void queryClient.invalidateQueries({ queryKey: ['trainers'] });
      pushToast({
        variant: 'success',
        title: 'Trainer added',
        description: `${trainer.user.firstName} ${trainer.user.lastName}`,
      });
      setModalOpen(false);
    },
    onError: (err) => {
      pushToast({
        variant: 'error',
        title: 'Failed to add trainer',
        description: getApiErrorMessage(err),
      });
    },
  });

  const assignMembersMutation = useMutation({
    mutationFn: async () => {
      if (!assignModalTrainer) return;
      await api.post(`/trainers/${assignModalTrainer.id}/assign-members`, {
        memberIds: selectedMemberIds,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trainers'] });
      void queryClient.invalidateQueries({ queryKey: ['members'] });
      pushToast({ variant: 'success', title: 'Assigned members updated' });
      setAssignModalTrainer(null);
    },
    onError: (err) => {
      pushToast({
        variant: 'error',
        title: 'Assignment failed',
        description: getApiErrorMessage(err),
      });
    },
  });

  const openAssignModal = (trainer: TrainerDTO) => {
    setAssignModalTrainer(trainer);
    setSelectedMemberIds([]);
  };

  useEffect(() => {
    if (assignModalTrainer && gymMembersQuery.data) {
      const preselected = gymMembersQuery.data
        .filter((m) => m.assignedTrainerId === assignModalTrainer.id)
        .map((m) => m.id);
      setSelectedMemberIds(preselected);
    }
  }, [assignModalTrainer, gymMembersQuery.data]);

  const trainers = trainersQuery.data || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-fitcore-accent">
              Coaching Team
            </p>
            <h1 className="mt-1 font-['Manrope'] text-2xl font-extrabold text-white">
              Trainer Management
            </h1>
            <p className="mt-1 text-sm text-fitcore-muted">
              Onboard personal trainers, review schedules, and assign members.
            </p>
          </div>
          {canManage && selectedGymId && (
            <Button
              onClick={() => {
                reset({ experienceYears: 2, status: 'active' });
                setModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add trainer
            </Button>
          )}
        </div>

        <Card className="p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-fitcore-muted">
                Gym Tenant
              </label>
              <select
                value={selectedGymId}
                onChange={(e) => setSelectedGymId(e.target.value)}
                className="fitcore-input"
              >
                {(gymsQuery.data || []).map((gym) => (
                  <option key={gym.id} value={gym.id}>
                    {gym.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-fitcore-muted">
                Search trainers
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fitcore-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, email, or specialization..."
                  className="fitcore-input pl-10"
                />
              </div>
            </div>
          </div>
        </Card>

        {trainersQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        ) : trainersQuery.isError ? (
          <ErrorState
            message={getApiErrorMessage(trainersQuery.error)}
            onRetry={() => void trainersQuery.refetch()}
          />
        ) : trainers.length === 0 ? (
          <EmptyState
            title="No trainers yet"
            description="Add personal trainers to assign clients and manage coaching schedules."
            actionLabel={canManage ? 'Add trainer' : undefined}
            onAction={canManage ? () => setModalOpen(true) : undefined}
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {trainers.map((trainer) => (
              <Card key={trainer.id} className="flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-fitcore-accent/15 text-fitcore-accent">
                        <Dumbbell className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-['Manrope'] text-lg font-bold text-white">
                          {trainer.user.firstName} {trainer.user.lastName}
                        </h3>
                        <p className="text-xs text-fitcore-muted">{trainer.user.email}</p>
                      </div>
                    </div>
                    <Badge variant={trainer.status === 'active' ? 'success' : 'warning'}>
                      {trainer.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  {trainer.bio && (
                    <p className="mt-3 text-sm text-fitcore-muted">{trainer.bio}</p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {trainer.specializations.map((spec) => (
                      <Badge key={spec} variant="neutral">
                        {spec}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-fitcore-muted">
                    <span className="flex items-center gap-1.5">
                      <Award className="h-3.5 w-3.5 text-fitcore-accent" />
                      {trainer.experienceYears} yrs experience
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-fitcore-accent" />
                      {trainer.assignedMemberCount} assigned members
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5 text-fitcore-accent" />
                      {trainer.schedule.filter((s) => s.isAvailable).length} active days/wk
                    </span>
                  </div>
                </div>

                {canManage && (
                  <div className="border-t border-fitcore-border pt-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openAssignModal(trainer)}
                    >
                      <Users className="h-3.5 w-3.5" />
                      Assign members ({trainer.assignedMemberCount})
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Trainer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-fitcore-border bg-fitcore-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-['Manrope'] text-lg font-bold text-white">Add Trainer</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-fitcore-muted hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={handleSubmit((values) => createTrainerMutation.mutate(values))}
              className="space-y-3.5"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-fitcore-muted">First name</label>
                  <input className="fitcore-input" {...register('firstName')} />
                  {errors.firstName && (
                    <p className="mt-1 text-xs text-red-400">{errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs text-fitcore-muted">Last name</label>
                  <input className="fitcore-input" {...register('lastName')} />
                  {errors.lastName && (
                    <p className="mt-1 text-xs text-red-400">{errors.lastName.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-fitcore-muted">Email</label>
                  <input className="fitcore-input" {...register('email')} />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs text-fitcore-muted">Experience (yrs)</label>
                  <input type="number" className="fitcore-input" {...register('experienceYears')} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-fitcore-muted">
                  Specializations (comma-separated)
                </label>
                <input
                  placeholder="Strength, Fat Loss, Mobility"
                  className="fitcore-input"
                  {...register('specializationsText')}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-fitcore-muted">Bio</label>
                <textarea rows={2} className="fitcore-input" {...register('bio')} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={createTrainerMutation.isPending}>
                  Add trainer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Members Modal */}
      {assignModalTrainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-fitcore-border bg-fitcore-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-['Manrope'] text-lg font-bold text-white">
                  Assign Members
                </h2>
                <p className="text-xs text-fitcore-muted">
                  Coach: {assignModalTrainer.user.firstName} {assignModalTrainer.user.lastName}
                </p>
              </div>
              <button
                onClick={() => setAssignModalTrainer(null)}
                className="rounded-lg p-1 text-fitcore-muted hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {gymMembersQuery.isLoading ? (
              <Skeleton className="h-32" />
            ) : (gymMembersQuery.data || []).length === 0 ? (
              <p className="py-6 text-center text-xs text-fitcore-muted">
                No members registered in this gym yet.
              </p>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {(gymMembersQuery.data || []).map((m) => {
                  const checked = selectedMemberIds.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className="flex cursor-pointer items-center justify-between rounded-xl border border-fitcore-border bg-[#141618] px-3 py-2.5 text-sm"
                    >
                      <div>
                        <p className="font-medium text-white">
                          {m.user.firstName} {m.user.lastName}
                        </p>
                        <p className="text-xs text-fitcore-muted">{m.membershipCode}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedMemberIds((prev) =>
                            checked ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                          )
                        }
                      />
                    </label>
                  );
                })}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAssignModalTrainer(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => assignMembersMutation.mutate()}
                isLoading={assignMembersMutation.isPending}
              >
                Save assignments
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

