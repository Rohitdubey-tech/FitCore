import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Scale, TrendingUp } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, } from 'recharts';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Card, Skeleton } from '../../components/ui/Card';
import { api, getApiErrorMessage } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
export const AnalyticsPage = () => {
    const queryClient = useQueryClient();
    const user = useAuthStore((s) => s.user);
    const pushToast = useToastStore((s) => s.pushToast);
    const [weightKg, setWeightKg] = useState('72');
    const [heightCm, setHeightCm] = useState('175');
    const [waistCm, setWaistCm] = useState('82');
    const [bodyFatPercent, setBodyFatPercent] = useState('16');
    const isAdmin = user?.role === 'super_admin' || user?.role === 'gym_admin';
    const workoutQuery = useQuery({
        queryKey: ['analytics', 'workouts'],
        queryFn: async () => {
            const res = await api.get('/analytics/workouts');
            return res.data.data;
        },
    });
    const bodyQuery = useQuery({
        queryKey: ['analytics', 'body-progress'],
        queryFn: async () => {
            const res = await api.get('/analytics/body-progress');
            return res.data.data;
        },
    });
    const revenueQuery = useQuery({
        queryKey: ['analytics', 'revenue'],
        enabled: isAdmin,
        queryFn: async () => {
            const res = await api.get('/analytics/revenue');
            return res.data.data;
        },
    });
    const logMetricMutation = useMutation({
        mutationFn: async () => {
            await api.post('/analytics/body-metrics', {
                weightKg: Number(weightKg),
                heightCm: Number(heightCm) || undefined,
                waistCm: Number(waistCm) || undefined,
                bodyFatPercent: Number(bodyFatPercent) || undefined,
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['analytics', 'body-progress'] });
            pushToast({ variant: 'success', title: 'Body metrics logged' });
        },
        onError: (err) => {
            pushToast({ variant: 'error', title: 'Failed', description: getApiErrorMessage(err) });
        },
    });
    const body = bodyQuery.data;
    return (<DashboardLayout>
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-fitcore-accent">
            Performance & Business Intelligence
          </p>
          <h1 className="mt-1 font-['Manrope'] text-2xl font-extrabold text-white">
            Progress Analytics & Reports
          </h1>
          <p className="mt-1 text-sm text-fitcore-muted">
            Track body composition, training volume, and gym business performance over time.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <div className="flex items-center justify-between text-xs text-fitcore-muted">
              <span>Latest Weight</span>
              <Scale className="h-4 w-4 text-fitcore-accent"/>
            </div>
            <p className="mt-2 font-['Manrope'] text-2xl font-extrabold text-white">
              {body?.latest ? `${body.latest.weightKg} kg` : '—'}
            </p>
            <p className="mt-1 text-xs text-fitcore-muted">
              BMI: {body?.latest?.bmi ?? '—'} · Delta: {body?.weightDeltaKg ?? 0} kg
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between text-xs text-fitcore-muted">
              <span>30-Day Workouts</span>
              <Activity className="h-4 w-4 text-fitcore-accent"/>
            </div>
            <p className="mt-2 font-['Manrope'] text-2xl font-extrabold text-fitcore-accent">
              {workoutQuery.data?.totalSessions ?? 0}
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between text-xs text-fitcore-muted">
              <span>Body Fat %</span>
              <TrendingUp className="h-4 w-4 text-fitcore-accent"/>
            </div>
            <p className="mt-2 font-['Manrope'] text-2xl font-extrabold text-white">
              {body?.latest?.bodyFatPercent ? `${body.latest.bodyFatPercent}%` : '—'}
            </p>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Weight Chart */}
          <Card className="lg:col-span-2">
            <h2 className="mb-4 font-['Manrope'] text-lg font-bold text-white">
              Body Weight Trend (kg)
            </h2>
            {bodyQuery.isLoading ? (<Skeleton className="h-64"/>) : (body?.series || []).length === 0 ? (<p className="py-16 text-center text-xs text-fitcore-muted">
                Log your first body measurement on the right to visualize progress.
              </p>) : (<div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={body?.series}>
                    <CartesianGrid stroke="#303438" strokeDasharray="3 3"/>
                    <XAxis dataKey="date" stroke="#A1A1AA" fontSize={11}/>
                    <YAxis stroke="#A1A1AA" fontSize={11} domain={['auto', 'auto']}/>
                    <Tooltip contentStyle={{
                backgroundColor: '#1C1F20',
                borderColor: '#303438',
                color: '#FFF',
            }}/>
                    <Area type="monotone" dataKey="weightKg" stroke="#C6FF45" fill="#C6FF45" fillOpacity={0.18}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>)}
          </Card>

          {/* Log Body Metrics Form */}
          <Card className="space-y-3.5">
            <h2 className="font-['Manrope'] text-lg font-bold text-white">Log Body Metrics</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-fitcore-muted">Weight (kg)</label>
                <input type="number" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className="fitcore-input"/>
              </div>
              <div>
                <label className="mb-1 block text-xs text-fitcore-muted">Height (cm)</label>
                <input type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} className="fitcore-input"/>
              </div>
              <div>
                <label className="mb-1 block text-xs text-fitcore-muted">Waist (cm)</label>
                <input type="number" value={waistCm} onChange={(e) => setWaistCm(e.target.value)} className="fitcore-input"/>
              </div>
              <div>
                <label className="mb-1 block text-xs text-fitcore-muted">Body Fat %</label>
                <input type="number" step="0.1" value={bodyFatPercent} onChange={(e) => setBodyFatPercent(e.target.value)} className="fitcore-input"/>
              </div>
            </div>
            <Button className="w-full" onClick={() => logMetricMutation.mutate()} isLoading={logMetricMutation.isPending}>
              Save Measurement
            </Button>
          </Card>
        </div>

        {/* Workout Volume & Gym Revenue Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 font-['Manrope'] text-lg font-bold text-white">
              Workout Volume (kg)
            </h2>
            {(workoutQuery.data?.series || []).length === 0 ? (<p className="py-14 text-center text-xs text-fitcore-muted">
                No completed workouts in the last 30 days.
              </p>) : (<div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workoutQuery.data?.series}>
                    <CartesianGrid stroke="#303438" strokeDasharray="3 3"/>
                    <XAxis dataKey="date" stroke="#A1A1AA" fontSize={11}/>
                    <YAxis stroke="#A1A1AA" fontSize={11}/>
                    <Tooltip contentStyle={{
                backgroundColor: '#1C1F20',
                borderColor: '#303438',
                color: '#FFF',
            }}/>
                    <Bar dataKey="volumeKg" fill="#C6FF45" radius={[6, 6, 0, 0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>)}
          </Card>

          {isAdmin && (<Card>
              <h2 className="mb-4 font-['Manrope'] text-lg font-bold text-white">
                Monthly Gym Revenue (INR)
              </h2>
              {(revenueQuery.data?.monthlyRevenue || []).length === 0 ? (<p className="py-14 text-center text-xs text-fitcore-muted">
                  No paid transactions recorded yet.
                </p>) : (<div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueQuery.data?.monthlyRevenue}>
                      <CartesianGrid stroke="#303438" strokeDasharray="3 3"/>
                      <XAxis dataKey="month" stroke="#A1A1AA" fontSize={11}/>
                      <YAxis stroke="#A1A1AA" fontSize={11}/>
                      <Tooltip contentStyle={{
                    backgroundColor: '#1C1F20',
                    borderColor: '#303438',
                    color: '#FFF',
                }}/>
                      <Bar dataKey="revenue" fill="#C6FF45" radius={[6, 6, 0, 0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>)}
            </Card>)}
        </div>
      </div>
    </DashboardLayout>);
};
