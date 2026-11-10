import React from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ApiSuccessResponse, SubscriptionDTO, UserProfileDTO } from '@fitcore/shared-types';
import {
  Activity,
  ArrowRight,
  Building2,
  Calendar,
  CreditCard,
  Droplets,
  Dumbbell,
  Flame,
  IndianRupee,
  QrCode,
  Scale,
  Sparkles,
  Users,
  Utensils,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Badge, Card, Skeleton } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/StateViews';
import { api, getApiErrorMessage } from '../../lib/api';

interface DashboardResponse {
  scope: 'platform' | 'gym' | 'personal';
  gymId?: string;
  kpis: Record<string, number | null>;
}

export const OverviewPage: React.FC = () => {
  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get<ApiSuccessResponse<{ user: UserProfileDTO }>>('/auth/me');
      return res.data.data.user;
    },
  });

  const dashboardQuery = useQuery({
    queryKey: ['analytics', 'dashboard', meQuery.data?.activeGymId],
    enabled: Boolean(meQuery.data),
    queryFn: async () => {
      const res = await api.get<ApiSuccessResponse<DashboardResponse>>('/analytics/dashboard', {
        params: meQuery.data?.activeGymId ? { gymId: meQuery.data.activeGymId } : undefined,
      });
      return res.data.data;
    },
  });

  const subsQuery = useQuery({
    queryKey: ['dashboard', 'subscriptions', meQuery.data?.activeGymId, meQuery.data?.role],
    enabled: Boolean(meQuery.data),
    queryFn: async () => {
      const isAdmin =
        meQuery.data?.role === 'gym_admin' || meQuery.data?.role === 'super_admin';
      const res = await api.get<ApiSuccessResponse<{ subscriptions: SubscriptionDTO[] }>>(
        '/subscriptions',
        {
          params: isAdmin
            ? { gymId: meQuery.data?.activeGymId, expiringWithinDays: 7, limit: 5 }
            : { limit: 3 },
        }
      );
      return res.data.data.subscriptions;
    },
  });

  if (meQuery.isLoading || dashboardQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-72" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <Skeleton className="h-56" />
        </div>
      </DashboardLayout>
    );
  }

  if (meQuery.isError || !meQuery.data) {
    return (
      <DashboardLayout>
        <ErrorState
          title="Unable to load your dashboard"
          message={getApiErrorMessage(meQuery.error)}
          onRetry={() => void meQuery.refetch()}
        />
      </DashboardLayout>
    );
  }

  const user = meQuery.data;
  const dash = dashboardQuery.data;
  const kpis = dash?.kpis || {};
  const subs = subsQuery.data || [];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Banner */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-fitcore-accent">
              Your Gym. Your Goals. Your Progress.
            </p>
            <h1 className="mt-1 font-['Manrope'] text-3xl font-extrabold tracking-tight text-white">
              Welcome back, {user.firstName}
            </h1>
            <p className="mt-1 text-sm text-fitcore-muted">
              {user.role === 'gym_admin'
                ? 'Here is today’s operational snapshot for your gym.'
                : user.role === 'trainer'
                ? 'Review your training schedule, client progress, and coaching alerts.'
                : user.role === 'super_admin'
                ? 'Platform-wide gym, user, and revenue metrics.'
                : 'Track today’s workouts, nutrition targets, and body progress.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {user.role === 'gym_admin' ? (
              <>
                <Link to="/members">
                  <Button size="sm">
                    <Users className="h-4 w-4" />
                    Manage Members
                  </Button>
                </Link>
                <Link to="/attendance">
                  <Button size="sm" variant="secondary">
                    <QrCode className="h-4 w-4" />
                    QR Desk
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/workouts">
                  <Button size="sm">
                    <Flame className="h-4 w-4" />
                    Start Workout
                  </Button>
                </Link>
                <Link to="/nutrition">
                  <Button size="sm" variant="secondary">
                    <Utensils className="h-4 w-4" />
                    Log Meal
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Role-Aware Live KPI Grid */}
        {dash?.scope === 'gym' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <div className="flex items-center justify-between text-xs text-fitcore-muted">
                <span>Active Members</span>
                <Users className="h-4 w-4 text-fitcore-accent" />
              </div>
              <p className="mt-2 font-['Manrope'] text-3xl font-extrabold text-white">
                {kpis.activeMembers ?? 0}
              </p>
              <p className="mt-1 text-xs text-fitcore-muted">
                of {kpis.totalMembers ?? 0} registered
              </p>
            </Card>
            <Card>
              <div className="flex items-center justify-between text-xs text-fitcore-muted">
                <span>Monthly Revenue</span>
                <IndianRupee className="h-4 w-4 text-fitcore-accent" />
              </div>
              <p className="mt-2 font-['Manrope'] text-3xl font-extrabold text-fitcore-accent">
                INR {(kpis.monthlyRevenue ?? 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-fitcore-muted">
                {kpis.activeSubscriptions ?? 0} active subscriptions
              </p>
            </Card>
            <Card>
              <div className="flex items-center justify-between text-xs text-fitcore-muted">
                <span>Trainers</span>
                <Dumbbell className="h-4 w-4 text-fitcore-accent" />
              </div>
              <p className="mt-2 font-['Manrope'] text-3xl font-extrabold text-white">
                {kpis.trainers ?? 0}
              </p>
              <p className="mt-1 text-xs text-fitcore-muted">Active coaching staff</p>
            </Card>
            <Card>
              <div className="flex items-center justify-between text-xs text-fitcore-muted">
                <span>Today&apos;s Check-Ins</span>
                <QrCode className="h-4 w-4 text-fitcore-accent" />
              </div>
              <p className="mt-2 font-['Manrope'] text-3xl font-extrabold text-white">
                {kpis.todayCheckIns ?? 0}
              </p>
              <p className="mt-1 text-xs text-fitcore-muted">QR & front desk</p>
            </Card>
          </div>
        )}

        {dash?.scope === 'platform' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <div className="flex items-center justify-between text-xs text-fitcore-muted">
                <span>Total Gyms</span>
                <Building2 className="h-4 w-4 text-fitcore-accent" />
              </div>
              <p className="mt-2 font-['Manrope'] text-3xl font-extrabold text-white">
                {kpis.totalGyms ?? 0}
              </p>
            </Card>
            <Card>
              <div className="flex items-center justify-between text-xs text-fitcore-muted">
                <span>Active Gyms</span>
                <Activity className="h-4 w-4 text-fitcore-accent" />
              </div>
              <p className="mt-2 font-['Manrope'] text-3xl font-extrabold text-fitcore-accent">
                {kpis.activeGyms ?? 0}
              </p>
            </Card>
            <Card>
              <div className="flex items-center justify-between text-xs text-fitcore-muted">
                <span>Total Users</span>
                <Users className="h-4 w-4 text-fitcore-accent" />
              </div>
              <p className="mt-2 font-['Manrope'] text-3xl font-extrabold text-white">
                {kpis.totalUsers ?? 0}
              </p>
            </Card>
            <Card>
              <div className="flex items-center justify-between text-xs text-fitcore-muted">
                <span>Platform Revenue</span>
                <IndianRupee className="h-4 w-4 text-fitcore-accent" />
              </div>
              <p className="mt-2 font-['Manrope'] text-3xl font-extrabold text-white">
                INR {(kpis.platformRevenue ?? 0).toLocaleString()}
              </p>
            </Card>
          </div>
        )}

        {dash?.scope === 'personal' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <div className="flex items-center justify-between text-xs text-fitcore-muted">
                <span>Workout Streak</span>
                <Flame className="h-4 w-4 text-fitcore-accent" />
              </div>
              <p className="mt-2 font-['Manrope'] text-3xl font-extrabold text-fitcore-accent">
                {kpis.workoutStreakDays ?? 0} days
              </p>
              <p className="mt-1 text-xs text-fitcore-muted">
                {kpis.completedWorkouts ?? 0} sessions completed
              </p>
            </Card>
            <Card>
              <div className="flex items-center justify-between text-xs text-fitcore-muted">
                <span>Daily Calories</span>
                <Utensils className="h-4 w-4 text-fitcore-accent" />
              </div>
              <p className="mt-2 font-['Manrope'] text-3xl font-extrabold text-white">
                {kpis.todayCalories ?? 0}
              </p>
              <p className="mt-1 text-xs text-fitcore-muted">
                Target: {kpis.calorieTarget ?? 2200} kcal · Protein: {kpis.todayProteinGrams ?? 0}g
              </p>
            </Card>
            <Card>
              <div className="flex items-center justify-between text-xs text-fitcore-muted">
                <span>Hydration Today</span>
                <Droplets className="h-4 w-4 text-fitcore-accent" />
              </div>
              <p className="mt-2 font-['Manrope'] text-3xl font-extrabold text-white">
                {kpis.todayWaterMl ?? 0} ml
              </p>
              <p className="mt-1 text-xs text-fitcore-muted">Stay hydrated across sessions</p>
            </Card>
            <Card>
              <div className="flex items-center justify-between text-xs text-fitcore-muted">
                <span>Latest Weight & BMI</span>
                <Scale className="h-4 w-4 text-fitcore-accent" />
              </div>
              <p className="mt-2 font-['Manrope'] text-3xl font-extrabold text-white">
                {kpis.latestWeightKg ? `${kpis.latestWeightKg} kg` : '—'}
              </p>
              <p className="mt-1 text-xs text-fitcore-muted">
                BMI: {kpis.latestBmi ?? 'Not logged yet'}
              </p>
            </Card>
          </div>
        )}

        {/* Quick Launch & Membership / Expiring Widget */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-4">
            <h2 className="font-['Manrope'] text-lg font-bold text-white">Quick Actions</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(user.role === 'gym_admin' || user.role === 'super_admin'
                ? [
                    { to: '/members', label: 'Register New Member', sub: 'Onboard & assign branch', icon: Users },
                    { to: '/memberships', label: 'Membership Plans', sub: 'Pricing & renewals', icon: CreditCard },
                    { to: '/payments', label: 'Billing & Invoices', sub: 'Razorpay orders & receipts', icon: IndianRupee },
                    { to: '/analytics', label: 'Revenue & Growth', sub: 'Charts & attendance reports', icon: Activity },
                  ]
                : [
                    { to: '/workouts', label: 'Workout Tracker', sub: 'Log sets, weights & PRs', icon: Dumbbell },
                    { to: '/nutrition', label: 'Log Meals & Water', sub: 'Verified macro tracker', icon: Utensils },
                    { to: '/ai-studio', label: 'AI Fitness Studio', sub: 'Personalized diet & splits', icon: Sparkles },
                    { to: '/analytics', label: 'Body Progress', sub: 'Weight, BMI & measurements', icon: Scale },
                  ]
              ).map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.to}
                    to={action.to}
                    className="group flex items-center justify-between rounded-xl border border-fitcore-border bg-[#141618] p-3.5 transition hover:border-fitcore-accent/60"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-fitcore-accent/15 text-fitcore-accent">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{action.label}</p>
                        <p className="text-xs text-fitcore-muted">{action.sub}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-fitcore-muted transition group-hover:text-fitcore-accent" />
                  </Link>
                );
              })}
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-fitcore-accent" />
                <h2 className="font-['Manrope'] text-lg font-bold text-white">
                  {user.role === 'gym_admin' || user.role === 'super_admin'
                    ? 'Expiring Soon (Next 7 Days)'
                    : 'Active Membership'}
                </h2>
              </div>
              <Link
                to="/memberships"
                className="text-xs font-semibold text-fitcore-accent hover:underline"
              >
                View all →
              </Link>
            </div>

            {subs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-fitcore-border p-6 text-center text-xs text-fitcore-muted">
                {user.role === 'gym_admin'
                  ? 'No memberships expiring in the next 7 days.'
                  : 'No active gym membership assigned yet.'}
              </div>
            ) : (
              <div className="space-y-2.5">
                {subs.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between rounded-xl border border-fitcore-border bg-[#141618] px-3.5 py-3 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-white">
                        {sub.member
                          ? `${sub.member.firstName} ${sub.member.lastName}`
                          : sub.plan?.name || 'Membership'}
                      </p>
                      <p className="text-fitcore-muted">
                        {sub.plan?.name} · Expires {new Date(sub.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={sub.status === 'active' ? 'success' : 'warning'}>
                      {sub.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};
