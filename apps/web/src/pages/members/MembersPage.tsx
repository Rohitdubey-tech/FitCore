import React, { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  EXPERIENCE_LEVELS,
  FITNESS_GOALS,
  GYM_MEMBER_STATUSES,
  type ApiSuccessResponse,
  type GymDTO,
  type GymMemberDTO,
  type TrainerDTO,
} from '@fitcore/shared-types';
import { Edit3, Plus, Search, Trash2, UserPlus, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Badge, Card, Skeleton } from '../../components/ui/Card';
import { EmptyState, ErrorState } from '../../components/ui/StateViews';
import { api, getApiErrorMessage } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';

const createMemberSchema = z.object({
  firstName: z.string().trim().min(1, 'First name required'),
  lastName: z.string().trim().min(1, 'Last name required'),
  email: z.string().trim().email('Valid email required'),
  phone: z.string().trim().optional(),
  branchId: z.string().optional(),
  assignedTrainerId: z.string().optional(),
  status: z.enum(GYM_MEMBER_STATUSES).default('active'),
  fitnessGoal: z.enum(FITNESS_GOALS).optional().or(z.literal('')),
  experienceLevel: z.enum(EXPERIENCE_LEVELS).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional(),
});

type MemberFormValues = z.infer<typeof createMemberSchema>;

export const MembersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const pushToast = useToastStore((s) => s.pushToast);

  const [selectedGymId, setSelectedGymId] = useState<string>(user?.activeGymId || '');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [goalFilter, setGoalFilter] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<GymMemberDTO | null>(null);

  const canWrite = user?.role === 'super_admin' || user?.role === 'gym_admin';

  const gymsQuery = useQuery({
    queryKey: ['gyms', 'for-members'],
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

  const activeGym = gymsQuery.data?.find((g) => g.id === selectedGymId);

  const trainersQuery = useQuery({
    queryKey: ['trainers', 'for-member-assign', selectedGymId],
    enabled: Boolean(selectedGymId),
    queryFn: async () => {
      const res = await api.get<ApiSuccessResponse<{ trainers: TrainerDTO[] }>>(
        `/gyms/${selectedGymId}/trainers`,
        { params: { limit: 100 } }
      );
      return res.data.data.trainers;
    },
  });

  const membersQuery = useQuery({
    queryKey: ['members', selectedGymId, search, statusFilter, goalFilter, page],
    enabled: Boolean(selectedGymId),
    queryFn: async () => {
      const res = await api.get<ApiSuccessResponse<{ members: GymMemberDTO[] }>>(
        `/gyms/${selectedGymId}/members`,
        {
          params: {
            page,
            limit: 10,
            search: search.trim() || undefined,
            status: statusFilter || undefined,
            fitnessGoal: goalFilter || undefined,
          },
        }
      );
      return res.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: { status: 'active' },
  });

  const saveMemberMutation = useMutation({
    mutationFn: async (values: MemberFormValues) => {
      const payload = {
        ...values,
        phone: values.phone || undefined,
        branchId: values.branchId || undefined,
        assignedTrainerId: values.assignedTrainerId || undefined,
        fitnessGoal: values.fitnessGoal || undefined,
        experienceLevel: values.experienceLevel || undefined,
      };
      if (editingMember) {
        const res = await api.patch<ApiSuccessResponse<{ member: GymMemberDTO }>>(
          `/members/${editingMember.id}`,
          payload
        );
        return res.data.data.member;
      }
      const res = await api.post<ApiSuccessResponse<{ member: GymMemberDTO }>>(
        `/gyms/${selectedGymId}/members`,
        payload
      );
      return res.data.data.member;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['members'] });
      pushToast({
        variant: 'success',
        title: editingMember ? 'Member updated' : 'Member registered',
      });
      setModalOpen(false);
      setEditingMember(null);
    },
    onError: (err) => {
      pushToast({
        variant: 'error',
        title: 'Save failed',
        description: getApiErrorMessage(err),
      });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await api.delete(`/members/${memberId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['members'] });
      pushToast({ variant: 'success', title: 'Member removed' });
    },
    onError: (err) => {
      pushToast({
        variant: 'error',
        title: 'Remove failed',
        description: getApiErrorMessage(err),
      });
    },
  });

  const openCreateModal = () => {
    setEditingMember(null);
    reset({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      branchId: '',
      assignedTrainerId: '',
      status: 'active',
      fitnessGoal: '',
      experienceLevel: '',
      notes: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (member: GymMemberDTO) => {
    setEditingMember(member);
    reset({
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      email: member.user.email,
      phone: member.user.phone || '',
      branchId: member.branchId || '',
      assignedTrainerId: member.assignedTrainerId || '',
      status: member.status,
      fitnessGoal: member.fitnessGoal || '',
      experienceLevel: member.experienceLevel || '',
      notes: member.notes || '',
    });
    setModalOpen(true);
  };

  const members = membersQuery.data?.data.members || [];
  const meta = membersQuery.data?.meta;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-fitcore-accent">
              Roster & Onboarding
            </p>
            <h1 className="mt-1 font-['Manrope'] text-2xl font-extrabold text-white">
              Member Management
            </h1>
            <p className="mt-1 text-sm text-fitcore-muted">
              Register, search, filter, and manage members scoped to your authorized gym.
            </p>
          </div>
          {canWrite && selectedGymId && (
            <Button onClick={openCreateModal}>
              <UserPlus className="h-4 w-4" />
              Register member
            </Button>
          )}
        </div>

        {/* Filters bar */}
        <Card className="p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-fitcore-muted">
                Gym Tenant
              </label>
              <select
                value={selectedGymId}
                onChange={(e) => {
                  setSelectedGymId(e.target.value);
                  setPage(1);
                }}
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
                Search
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fitcore-muted" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Name, email, or code..."
                  className="fitcore-input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-fitcore-muted">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="fitcore-input"
              >
                <option value="">All statuses</option>
                {GYM_MEMBER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-fitcore-muted">
                Fitness Goal
              </label>
              <select
                value={goalFilter}
                onChange={(e) => {
                  setGoalFilter(e.target.value);
                  setPage(1);
                }}
                className="fitcore-input"
              >
                <option value="">All goals</option>
                {FITNESS_GOALS.map((g) => (
                  <option key={g} value={g}>
                    {g.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {!selectedGymId && !gymsQuery.isLoading ? (
          <EmptyState
            title="No gym available"
            description="Create a gym first under Gyms & Branches before onboarding members."
          />
        ) : membersQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : membersQuery.isError ? (
          <ErrorState
            message={getApiErrorMessage(membersQuery.error)}
            onRetry={() => void membersQuery.refetch()}
          />
        ) : members.length === 0 ? (
          <EmptyState
            title="No members found"
            description="Try adjusting your filters or register your first gym member."
            actionLabel={canWrite ? 'Register member' : undefined}
            onAction={canWrite ? openCreateModal : undefined}
          />
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-fitcore-border bg-[#141618] text-xs uppercase text-fitcore-muted">
                  <tr>
                    <th className="px-5 py-3.5">Member</th>
                    <th className="px-5 py-3.5">Code</th>
                    <th className="px-5 py-3.5">Goal & Level</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Joined</th>
                    {canWrite && <th className="px-5 py-3.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-fitcore-border">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-white">
                          {member.user.firstName} {member.user.lastName}
                        </p>
                        <p className="text-xs text-fitcore-muted">{member.user.email}</p>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-fitcore-accent">
                        {member.membershipCode}
                      </td>
                      <td className="px-5 py-4 text-xs text-fitcore-muted">
                        <span className="capitalize text-white">
                          {member.fitnessGoal?.replace('_', ' ') || 'Not set'}
                        </span>
                        {member.experienceLevel && ` · ${member.experienceLevel}`}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={member.status === 'active' ? 'success' : 'warning'}>
                          {member.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-xs text-fitcore-muted">
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </td>
                      {canWrite && (
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditModal(member)}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Remove ${member.user.firstName} ${member.user.lastName}?`
                                  )
                                ) {
                                  deleteMemberMutation.mutate(member.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {meta && (meta.totalPages ?? 1) > 1 && (
              <div className="flex items-center justify-between border-t border-fitcore-border px-5 py-3 text-xs text-fitcore-muted">
                <span>
                  Page {meta.page} of {meta.totalPages} ({meta.total} total)
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page >= (meta.totalPages ?? 1)}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Register / Edit Member Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-fitcore-border bg-fitcore-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-['Manrope'] text-lg font-bold text-white">
                {editingMember ? 'Edit Member Profile' : 'Register Gym Member'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-fitcore-muted hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit((values) => saveMemberMutation.mutate(values))}
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
                  <input
                    disabled={Boolean(editingMember)}
                    className={`fitcore-input ${editingMember ? 'opacity-60' : ''}`}
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs text-fitcore-muted">Phone</label>
                  <input className="fitcore-input" {...register('phone')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-fitcore-muted">Fitness goal</label>
                  <select className="fitcore-input" {...register('fitnessGoal')}>
                    <option value="">Select goal</option>
                    {FITNESS_GOALS.map((g) => (
                      <option key={g} value={g}>
                        {g.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-fitcore-muted">Experience</label>
                  <select className="fitcore-input" {...register('experienceLevel')}>
                    <option value="">Select level</option>
                    {EXPERIENCE_LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-fitcore-muted">Status</label>
                  <select className="fitcore-input" {...register('status')}>
                    {GYM_MEMBER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-fitcore-muted">Branch</label>
                  <select className="fitcore-input" {...register('branchId')}>
                    <option value="">Main / Unassigned</option>
                    {(activeGym?.branches || []).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-fitcore-muted">
                  Assigned Personal Trainer
                </label>
                <select className="fitcore-input" {...register('assignedTrainerId')}>
                  <option value="">No trainer assigned</option>
                  {(trainersQuery.data || []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.user.firstName} {t.user.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-fitcore-muted">Notes</label>
                <textarea rows={2} className="fitcore-input" {...register('notes')} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={saveMemberMutation.isPending}>
                  <Plus className="h-4 w-4" />
                  {editingMember ? 'Save changes' : 'Register member'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

