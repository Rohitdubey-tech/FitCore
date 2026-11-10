import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ApiSuccessResponse } from '@fitcore/shared-types';
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  CreditCard,
  Dumbbell,
  Flame,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  QrCode,
  Shield,
  ShieldAlert,
  Sparkles,
  User as UserIcon,
  Users,
  Utensils,
  X,
} from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { api, getApiErrorMessage } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { Badge } from '../ui/Card';
import { Button } from '../ui/Button';

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, refreshToken, clearSession } = useAuthStore();
  const pushToast = useToastStore((s) => s.pushToast);
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const notifQuery = useQuery({
    queryKey: ['notifications', 'unread-badge'],
    enabled: Boolean(user),
    queryFn: async () => {
      const res = await api.get<ApiSuccessResponse<{ unreadCount: number }>>('/notifications', {
        params: { limit: 1 },
      });
      return res.data.data.unreadCount;
    },
    refetchInterval: 30000,
  });

  const unreadCount = notifQuery.data ?? 0;

  const isStaff =
    user?.role === 'super_admin' || user?.role === 'gym_admin' || user?.role === 'trainer';
  const isAdmin = user?.role === 'super_admin' || user?.role === 'gym_admin';

  const navSections = [
    {
      title: 'Workspace',
      items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true }],
    },
    {
      title: isStaff ? 'Gym Operations' : 'Membership',
      items: [
        { to: '/gyms', label: 'Gyms & Branches', icon: Building2, show: isAdmin },
        { to: '/members', label: 'Members', icon: Users, show: isStaff },
        { to: '/trainers', label: 'Trainers', icon: Dumbbell, show: isAdmin || user?.role === 'trainer' },
        {
          to: '/memberships',
          label: isAdmin ? 'Plans & Subscriptions' : 'My Membership',
          icon: CreditCard,
          show: true,
        },
        {
          to: '/payments',
          label: isAdmin ? 'Payments & Invoices' : 'Payment History',
          icon: IndianRupee,
          show: true,
        },
        { to: '/attendance', label: 'QR Attendance', icon: QrCode, show: true },
      ],
    },
    {
      title: 'Training & Wellness',
      items: [
        { to: '/workouts', label: 'Workouts & Exercises', icon: Flame, show: true },
        { to: '/nutrition', label: 'Nutrition & Food DB', icon: Utensils, show: true },
        { to: '/ai-studio', label: 'AI Fitness Studio', icon: Sparkles, show: true },
        { to: '/analytics', label: 'Progress & Reports', icon: BarChart3, show: true },
        { to: '/messages', label: 'Coaching Messages', icon: MessageSquare, show: true },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          to: '/notifications',
          label: 'Notifications',
          icon: Bell,
          badge: unreadCount > 0 ? unreadCount : undefined,
          show: true,
        },
        { to: '/profile', label: 'Profile & Settings', icon: UserIcon, show: true },
        {
          to: '/admin',
          label: 'Super Admin Console',
          icon: ShieldAlert,
          show: user?.role === 'super_admin',
        },
      ],
    },
  ];

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch (err) {
      pushToast({
        variant: 'info',
        title: 'Signed out',
        description: getApiErrorMessage(err),
      });
    } finally {
      clearSession();
      navigate('/login');
    }
  };

  const renderNavLinks = (onSelect?: () => void) => (
    <div className="space-y-5">
      {navSections.map((section) => {
        const visible = section.items.filter((i) => i.show);
        if (visible.length === 0) return null;
        return (
          <div key={section.title}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-fitcore-muted">
              {section.title}
            </p>
            <nav className="space-y-1">
              {visible.map((item) => {
                const Icon = item.icon;
                const badgeCount = 'badge' in item ? item.badge : undefined;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onSelect}
                    className={({ isActive }) =>
                      `flex items-center justify-between rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                        isActive
                          ? 'bg-fitcore-accent text-black font-semibold'
                          : 'text-fitcore-muted hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </span>
                    {badgeCount ? (
                      <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {badgeCount}
                      </span>
                    ) : null}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-fitcore-bg text-white">
      <header className="sticky top-0 z-30 border-b border-fitcore-border bg-fitcore-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="rounded-lg border border-fitcore-border p-1.5 text-fitcore-muted hover:text-white lg:hidden"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-fitcore-accent text-black">
                <Activity className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div>
                <span className="font-['Manrope'] text-lg font-extrabold tracking-tight text-white">
                  FITCORE
                </span>
                <span className="ml-2 hidden text-xs text-fitcore-muted sm:inline">
                  Your Gym. Your Goals.
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/notifications"
              className="relative rounded-xl border border-fitcore-border bg-fitcore-card p-2 text-fitcore-muted transition hover:text-white"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-fitcore-accent px-1 text-[10px] font-bold text-black">
                  {unreadCount}
                </span>
              )}
            </Link>

            {user && (
              <Link
                to="/profile"
                className="hidden items-center gap-2.5 sm:flex"
              >
                <Badge variant="accent">
                  <Shield className="h-3 w-3" />
                  {user.role.replace('_', ' ')}
                </Badge>
                <div className="flex items-center gap-2 rounded-xl border border-fitcore-border bg-fitcore-card px-3 py-1.5 text-xs transition hover:border-fitcore-accent/50">
                  <UserIcon className="h-3.5 w-3.5 text-fitcore-muted" />
                  <span className="font-medium text-white">
                    {user.firstName} {user.lastName}
                  </span>
                </div>
              </Link>
            )}

            <Button variant="secondary" size="sm" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-fitcore-border bg-fitcore-card px-4 py-4 lg:hidden">
            {renderNavLinks(() => setMobileMenuOpen(false))}
          </div>
        )}
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24 rounded-2xl border border-fitcore-border bg-fitcore-card p-3.5">
            {renderNavLinks()}
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
};
