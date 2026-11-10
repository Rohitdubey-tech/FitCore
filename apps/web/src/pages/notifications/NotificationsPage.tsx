import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiSuccessResponse, UserProfileDTO } from '@fitcore/shared-types';
import { Bell, CheckCheck, CheckCircle2 } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Badge, Card, Skeleton } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/StateViews';
import { api, getApiErrorMessage } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';

interface NotificationDTO {
  id: string;
  type: string;
  title: string;
  body: string;
  channels: string[];
  isRead: boolean;
  createdAt: string;
}

export const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuthStore();
  const pushToast = useToastStore((s) => s.pushToast);

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get<
        ApiSuccessResponse<{ notifications: NotificationDTO[]; unreadCount: number }>
      >('/notifications');
      return res.data.data;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      pushToast({ variant: 'success', title: 'All notifications marked as read' });
    },
  });

  const prefsMutation = useMutation({
    mutationFn: async (prefs: { email?: boolean; push?: boolean; inApp?: boolean }) => {
      const res = await api.patch<ApiSuccessResponse<{ user: UserProfileDTO }>>('/auth/me', {
        notificationPreferences: prefs,
      });
      return res.data.data.user;
    },
    onSuccess: (updated) => {
      updateUser(updated);
      pushToast({ variant: 'success', title: 'Notification preferences saved' });
    },
    onError: (err) => {
      pushToast({ variant: 'error', title: 'Update failed', description: getApiErrorMessage(err) });
    },
  });

  const items = query.data?.notifications || [];
  const unread = query.data?.unreadCount ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-fitcore-accent">
              Alerts & Preferences
            </p>
            <h1 className="mt-1 font-['Manrope'] text-2xl font-extrabold text-white">
              Notifications ({unread} unread)
            </h1>
          </div>
          {unread > 0 && (
            <Button
              variant="secondary"
              onClick={() => markAllMutation.mutate()}
              isLoading={markAllMutation.isPending}
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>

        <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Bell className="h-4 w-4 text-fitcore-accent" />
            Delivery Channels
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-fitcore-muted">
            {[
              { key: 'inApp' as const, label: 'In-App Alerts' },
              { key: 'email' as const, label: 'Transactional Email' },
              { key: 'push' as const, label: 'Mobile Push (FCM)' },
            ].map((ch) => (
              <label key={ch.key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={user?.notificationPreferences?.[ch.key] ?? true}
                  onChange={(e) =>
                    prefsMutation.mutate({ [ch.key]: e.target.checked })
                  }
                />
                {ch.label}
              </label>
            ))}
          </div>
        </Card>

        {query.isLoading ? (
          <Skeleton className="h-48" />
        ) : items.length === 0 ? (
          <EmptyState
            title="All caught up"
            description="Notifications for attendance, memberships, payments, and coaching messages will appear here."
          />
        ) : (
          <div className="space-y-3">
            {items.map((n) => (
              <Card
                key={n.id}
                className={`flex flex-wrap items-center justify-between gap-3 p-4 ${
                  !n.isRead ? 'border-fitcore-accent/50' : ''
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={n.isRead ? 'neutral' : 'accent'}>
                      {n.type.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-fitcore-muted">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1.5 font-semibold text-white">{n.title}</p>
                  <p className="text-xs text-fitcore-muted">{n.body}</p>
                </div>
                {!n.isRead && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => markReadMutation.mutate(n.id)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Mark read
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

