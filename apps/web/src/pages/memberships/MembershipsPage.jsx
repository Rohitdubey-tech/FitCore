import React, { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PLAN_DURATION_TYPES, SUBSCRIPTION_STATUSES, } from '@fitcore/shared-types';
import { Calendar, Check, CreditCard, PauseCircle, PlayCircle, Plus, RefreshCw, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Badge, Card, Skeleton } from '../../components/ui/Card';
import { EmptyState, ErrorState } from '../../components/ui/StateViews';
import { api, getApiErrorMessage } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
const planFormSchema = z.object({
    name: z.string().trim().min(2, 'Plan name required'),
    description: z.string().trim().optional(),
    durationType: z.enum(PLAN_DURATION_TYPES),
    durationDays: z.coerce.number().int().min(1).max(3650).optional(),
    price: z.coerce.number().min(0),
    featuresText: z.string().trim().optional(),
    includesPersonalTraining: z.boolean().default(false),
});
const subFormSchema = z.object({
    memberId: z.string().min(1, 'Select a member'),
    planId: z.string().min(1, 'Select a plan'),
    autoRenew: z.boolean().default(false),
});
export const MembershipsPage = () => {
    const queryClient = useQueryClient();
    const user = useAuthStore((s) => s.user);
    const pushToast = useToastStore((s) => s.pushToast);
    const [tab, setTab] = useState('plans');
    const [selectedGymId, setSelectedGymId] = useState(user?.activeGymId || '');
    const [subStatusFilter, setSubStatusFilter] = useState('');
    const [expiringOnly, setExpiringOnly] = useState(false);
    const [planModalOpen, setPlanModalOpen] = useState(false);
    const [subModalOpen, setSubModalOpen] = useState(false);
    const canManage = user?.role === 'super_admin' || user?.role === 'gym_admin';
    const gymsQuery = useQuery({
        queryKey: ['gyms', 'for-memberships'],
        queryFn: async () => {
            const res = await api.get('/gyms');
            return res.data.data.gyms;
        },
    });
    useEffect(() => {
        if (!selectedGymId && gymsQuery.data && gymsQuery.data.length > 0) {
            setSelectedGymId(user?.activeGymId || gymsQuery.data[0].id);
        }
    }, [gymsQuery.data, selectedGymId, user?.activeGymId]);
    const plansQuery = useQuery({
        queryKey: ['membership-plans', selectedGymId],
        enabled: Boolean(selectedGymId),
        queryFn: async () => {
            const res = await api.get('/membership-plans', { params: { gymId: selectedGymId } });
            return res.data.data.plans;
        },
    });
    const subscriptionsQuery = useQuery({
        queryKey: ['subscriptions', selectedGymId, subStatusFilter, expiringOnly],
        enabled: Boolean(selectedGymId),
        queryFn: async () => {
            const res = await api.get('/subscriptions', {
                params: {
                    gymId: selectedGymId,
                    status: expiringOnly ? undefined : subStatusFilter || undefined,
                    expiringWithinDays: expiringOnly ? 7 : undefined,
                },
            });
            return res.data.data.subscriptions;
        },
    });
    const membersQuery = useQuery({
        queryKey: ['members', 'for-subs', selectedGymId],
        enabled: Boolean(subModalOpen && selectedGymId),
        queryFn: async () => {
            const res = await api.get(`/gyms/${selectedGymId}/members`, { params: { limit: 100 } });
            return res.data.data.members;
        },
    });
    const planForm = useForm({
        resolver: zodResolver(planFormSchema),
        defaultValues: { durationType: 'monthly', price: 1999, includesPersonalTraining: false },
    });
    const subForm = useForm({
        resolver: zodResolver(subFormSchema),
        defaultValues: { autoRenew: false },
    });
    const createPlanMutation = useMutation({
        mutationFn: async (values) => {
            const features = (values.featuresText || '')
                .split(',')
                .map((f) => f.trim())
                .filter(Boolean);
            const res = await api.post('/membership-plans', {
                gymId: selectedGymId,
                name: values.name,
                description: values.description || undefined,
                durationType: values.durationType,
                durationDays: values.durationType === 'custom' ? values.durationDays : undefined,
                price: values.price,
                features,
                includesPersonalTraining: values.includesPersonalTraining,
            });
            return res.data.data.plan;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['membership-plans'] });
            pushToast({ variant: 'success', title: 'Membership plan created' });
            setPlanModalOpen(false);
        },
        onError: (err) => {
            pushToast({
                variant: 'error',
                title: 'Plan creation failed',
                description: getApiErrorMessage(err),
            });
        },
    });
    const createSubMutation = useMutation({
        mutationFn: async (values) => {
            await api.post('/subscriptions', {
                gymId: selectedGymId,
                ...values,
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
            pushToast({ variant: 'success', title: 'Subscription activated' });
            setSubModalOpen(false);
        },
        onError: (err) => {
            pushToast({
                variant: 'error',
                title: 'Failed to activate subscription',
                description: getApiErrorMessage(err),
            });
        },
    });
    const subActionMutation = useMutation({
        mutationFn: async ({ id, action, }) => {
            await api.patch(`/subscriptions/${id}`, { action });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
            pushToast({ variant: 'success', title: 'Subscription updated' });
        },
        onError: (err) => {
            pushToast({
                variant: 'error',
                title: 'Action failed',
                description: getApiErrorMessage(err),
            });
        },
    });
    const selectedDuration = planForm.watch('durationType');
    const plans = plansQuery.data || [];
    const subscriptions = subscriptionsQuery.data || [];
    return (<DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-fitcore-accent">
              Billing & Access Tiers
            </p>
            <h1 className="mt-1 font-['Manrope'] text-2xl font-extrabold text-white">
              Plans & Subscriptions
            </h1>
            <p className="mt-1 text-sm text-fitcore-muted">
              Configure membership tiers, assign plans, and manage renewals or holds.
            </p>
          </div>
          {canManage && selectedGymId && (<div className="flex gap-2">
              <Button variant="secondary" onClick={() => setPlanModalOpen(true)}>
                <Plus className="h-4 w-4"/>
                New plan
              </Button>
              <Button onClick={() => setSubModalOpen(true)}>
                <CreditCard className="h-4 w-4"/>
                Assign subscription
              </Button>
            </div>)}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-fitcore-border bg-fitcore-card p-1">
            <button onClick={() => setTab('plans')} className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${tab === 'plans' ? 'bg-fitcore-accent text-black font-semibold' : 'text-fitcore-muted'}`}>
              Membership Plans ({plans.length})
            </button>
            <button onClick={() => setTab('subscriptions')} className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${tab === 'subscriptions'
            ? 'bg-fitcore-accent text-black font-semibold'
            : 'text-fitcore-muted'}`}>
              Subscriptions ({subscriptions.length})
            </button>
          </div>

          <select value={selectedGymId} onChange={(e) => setSelectedGymId(e.target.value)} className="fitcore-input max-w-xs">
            {(gymsQuery.data || []).map((gym) => (<option key={gym.id} value={gym.id}>
                {gym.name}
              </option>))}
          </select>
        </div>

        {tab === 'plans' ? (plansQuery.isLoading ? (<div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-52"/>
              <Skeleton className="h-52"/>
              <Skeleton className="h-52"/>
            </div>) : plansQuery.isError ? (<ErrorState message={getApiErrorMessage(plansQuery.error)} onRetry={() => void plansQuery.refetch()}/>) : plans.length === 0 ? (<EmptyState title="No membership plans yet" description="Create monthly, quarterly, annual, or custom plans for your gym." actionLabel={canManage ? 'Create plan' : undefined} onAction={canManage ? () => setPlanModalOpen(true) : undefined}/>) : (<div className="grid gap-5 md:grid-cols-3">
              {plans.map((plan) => (<Card key={plan.id} className="flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-['Manrope'] text-lg font-bold text-white">
                          {plan.name}
                        </h3>
                        <p className="text-xs capitalize text-fitcore-muted">
                          {plan.durationType.replace('_', ' ')} · {plan.durationDays} days
                        </p>
                      </div>
                      <Badge variant={plan.status === 'active' ? 'success' : 'neutral'}>
                        {plan.status}
                      </Badge>
                    </div>

                    <p className="mt-4 font-['Manrope'] text-3xl font-extrabold text-fitcore-accent">
                      {plan.currency} {plan.price.toLocaleString()}
                    </p>

                    {plan.description && (<p className="mt-2 text-xs text-fitcore-muted">{plan.description}</p>)}

                    <ul className="mt-4 space-y-1.5 text-xs text-fitcore-muted">
                      {plan.features.map((f) => (<li key={f} className="flex items-center gap-2 text-white">
                          <Check className="h-3.5 w-3.5 text-fitcore-accent"/>
                          {f}
                        </li>))}
                    </ul>
                  </div>
                </Card>))}
            </div>)) : (<div className="space-y-4">
            <Card className="flex flex-wrap items-center gap-3 p-4">
              <select value={subStatusFilter} disabled={expiringOnly} onChange={(e) => setSubStatusFilter(e.target.value)} className="fitcore-input max-w-xs">
                <option value="">All statuses</option>
                {SUBSCRIPTION_STATUSES.map((s) => (<option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>))}
              </select>
              <label className="flex items-center gap-2 text-xs text-fitcore-muted">
                <input type="checkbox" checked={expiringOnly} onChange={(e) => setExpiringOnly(e.target.checked)}/>
                Expiring within 7 days
              </label>
            </Card>

            {subscriptionsQuery.isLoading ? (<Skeleton className="h-48"/>) : subscriptionsQuery.isError ? (<ErrorState message={getApiErrorMessage(subscriptionsQuery.error)} onRetry={() => void subscriptionsQuery.refetch()}/>) : subscriptions.length === 0 ? (<EmptyState title="No subscriptions found" description="Assign a membership plan to a member to track expirations and renewals."/>) : (<Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-fitcore-border bg-[#141618] text-xs uppercase text-fitcore-muted">
                      <tr>
                        <th className="px-5 py-3.5">Member</th>
                        <th className="px-5 py-3.5">Plan</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5">Expires</th>
                        {canManage && <th className="px-5 py-3.5 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-fitcore-border">
                      {subscriptions.map((sub) => (<tr key={sub.id} className="hover:bg-white/[0.02]">
                          <td className="px-5 py-4">
                            <p className="font-semibold text-white">
                              {sub.member
                        ? `${sub.member.firstName} ${sub.member.lastName}`
                        : sub.memberId}
                            </p>
                            <p className="text-xs text-fitcore-muted">
                              {sub.member?.membershipCode}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-white">{sub.plan?.name || sub.planId}</p>
                            <p className="text-xs text-fitcore-muted">
                              Renewals: {sub.renewalCount}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <Badge variant={sub.status === 'active' ? 'success' : 'warning'}>
                              {sub.status.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="px-5 py-4 text-xs text-fitcore-muted">
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-fitcore-accent"/>
                              {new Date(sub.endDate).toLocaleDateString()}
                            </span>
                          </td>
                          {canManage && (<td className="px-5 py-4 text-right">
                              <div className="inline-flex gap-1.5">
                                <Button size="sm" variant="secondary" onClick={() => subActionMutation.mutate({ id: sub.id, action: 'renew' })}>
                                  <RefreshCw className="h-3.5 w-3.5"/>
                                  Renew
                                </Button>
                                {sub.status === 'active' ? (<Button size="sm" variant="ghost" onClick={() => subActionMutation.mutate({ id: sub.id, action: 'suspend' })}>
                                    <PauseCircle className="h-3.5 w-3.5"/>
                                  </Button>) : (<Button size="sm" variant="ghost" onClick={() => subActionMutation.mutate({ id: sub.id, action: 'resume' })}>
                                    <PlayCircle className="h-3.5 w-3.5"/>
                                  </Button>)}
                              </div>
                            </td>)}
                        </tr>))}
                    </tbody>
                  </table>
                </div>
              </Card>)}
          </div>)}
      </div>

      {/* Create Plan Modal */}
      {planModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-fitcore-border bg-fitcore-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-['Manrope'] text-lg font-bold text-white">
                Create Membership Plan
              </h2>
              <button onClick={() => setPlanModalOpen(false)} className="rounded-lg p-1 text-fitcore-muted hover:text-white">
                <X className="h-5 w-5"/>
              </button>
            </div>
            <form onSubmit={planForm.handleSubmit((v) => createPlanMutation.mutate(v))} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs text-fitcore-muted">Plan name</label>
                <input placeholder="Pro Monthly" className="fitcore-input" {...planForm.register('name')}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-fitcore-muted">Duration type</label>
                  <select className="fitcore-input" {...planForm.register('durationType')}>
                    {PLAN_DURATION_TYPES.map((d) => (<option key={d} value={d}>
                        {d.replace('_', ' ')}
                      </option>))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-fitcore-muted">Price (INR)</label>
                  <input type="number" className="fitcore-input" {...planForm.register('price')}/>
                </div>
              </div>
              {selectedDuration === 'custom' && (<div>
                  <label className="mb-1 block text-xs text-fitcore-muted">Custom days</label>
                  <input type="number" placeholder="45" className="fitcore-input" {...planForm.register('durationDays')}/>
                </div>)}
              <div>
                <label className="mb-1 block text-xs text-fitcore-muted">
                  Features (comma-separated)
                </label>
                <input placeholder="24/7 Access, Locker Room, Group Classes" className="fitcore-input" {...planForm.register('featuresText')}/>
              </div>
              <label className="flex items-center gap-2 text-xs text-fitcore-muted">
                <input type="checkbox" {...planForm.register('includesPersonalTraining')}/>
                Includes personal training sessions
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setPlanModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={createPlanMutation.isPending}>
                  Create plan
                </Button>
              </div>
            </form>
          </div>
        </div>)}

      {/* Assign Subscription Modal */}
      {subModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-fitcore-border bg-fitcore-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-['Manrope'] text-lg font-bold text-white">
                Assign Subscription
              </h2>
              <button onClick={() => setSubModalOpen(false)} className="rounded-lg p-1 text-fitcore-muted hover:text-white">
                <X className="h-5 w-5"/>
              </button>
            </div>
            <form onSubmit={subForm.handleSubmit((v) => createSubMutation.mutate(v))} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs text-fitcore-muted">Member</label>
                <select className="fitcore-input" {...subForm.register('memberId')}>
                  <option value="">Select member...</option>
                  {(membersQuery.data || []).map((m) => (<option key={m.id} value={m.id}>
                      {m.user.firstName} {m.user.lastName} ({m.membershipCode})
                    </option>))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-fitcore-muted">Membership Plan</label>
                <select className="fitcore-input" {...subForm.register('planId')}>
                  <option value="">Select plan...</option>
                  {plans
                .filter((p) => p.status === 'active')
                .map((p) => (<option key={p.id} value={p.id}>
                        {p.name} — {p.currency} {p.price} ({p.durationDays}d)
                      </option>))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-fitcore-muted">
                <input type="checkbox" {...subForm.register('autoRenew')}/>
                Enable auto-renew
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setSubModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={createSubMutation.isPending}>
                  Activate subscription
                </Button>
              </div>
            </form>
          </div>
        </div>)}
    </DashboardLayout>);
};
