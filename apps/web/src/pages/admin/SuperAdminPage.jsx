import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, ShieldAlert } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Badge, Card, Skeleton } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/StateViews';
import { api, getApiErrorMessage } from '../../lib/api';
import { useToastStore } from '../../store/toastStore';
export const SuperAdminPage = () => {
    const queryClient = useQueryClient();
    const pushToast = useToastStore((s) => s.pushToast);
    const query = useQuery({
        queryKey: ['admin', 'overview'],
        queryFn: async () => {
            const res = await api.get('/admin/overview');
            return res.data.data;
        },
    });
    const gymStatusMutation = useMutation({
        mutationFn: async ({ id, status }) => {
            await api.patch(`/admin/gyms/${id}/status`, { status });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
            pushToast({ variant: 'success', title: 'Gym status updated' });
        },
    });
    if (query.isLoading) {
        return (<DashboardLayout>
        <Skeleton className="h-64"/>
      </DashboardLayout>);
    }
    if (query.isError || !query.data) {
        return (<DashboardLayout>
        <ErrorState title="Super Admin Access Required" message={getApiErrorMessage(query.error)}/>
      </DashboardLayout>);
    }
    const { metrics, gyms, auditLogs } = query.data;
    return (<DashboardLayout>
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-fitcore-accent">
            Platform Control Plane
          </p>
          <h1 className="mt-1 font-['Manrope'] text-2xl font-extrabold text-white">
            Super Admin Console
          </h1>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <p className="text-xs text-fitcore-muted">Total Registered Gyms</p>
            <p className="mt-2 font-['Manrope'] text-2xl font-extrabold text-white">
              {metrics.totalGyms}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-fitcore-muted">Active Gyms</p>
            <p className="mt-2 font-['Manrope'] text-2xl font-extrabold text-fitcore-accent">
              {metrics.activeGyms}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-fitcore-muted">Total Platform Users</p>
            <p className="mt-2 font-['Manrope'] text-2xl font-extrabold text-white">
              {metrics.totalUsers}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-fitcore-muted">Platform Revenue</p>
            <p className="mt-2 font-['Manrope'] text-2xl font-extrabold text-white">
              INR {metrics.subscriptionRevenue.toLocaleString()}
            </p>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-fitcore-accent"/>
              <h2 className="font-['Manrope'] text-lg font-bold text-white">Gym Tenants</h2>
            </div>
            <div className="space-y-2.5">
              {gyms.map((g) => (<div key={g.id} className="flex items-center justify-between rounded-xl border border-fitcore-border bg-[#141618] p-3 text-xs">
                  <div>
                    <p className="font-semibold text-white">{g.name}</p>
                    <p className="text-fitcore-muted">{g.contactEmail}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={g.status === 'active' ? 'success' : 'warning'}>
                      {g.status}
                    </Badge>
                    <Button size="sm" variant="secondary" onClick={() => gymStatusMutation.mutate({
                id: g.id,
                status: g.status === 'active' ? 'suspended' : 'active',
            })}>
                      {g.status === 'active' ? 'Suspend' : 'Activate'}
                    </Button>
                  </div>
                </div>))}
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-fitcore-accent"/>
              <h2 className="font-['Manrope'] text-lg font-bold text-white">Recent Audit Logs</h2>
            </div>
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1 text-xs">
              {auditLogs.map((log) => (<div key={log.id} className="flex items-center justify-between rounded-xl border border-fitcore-border bg-[#141618] px-3 py-2">
                  <div>
                    <p className="font-mono font-semibold text-white">{log.action}</p>
                    <p className="text-fitcore-muted">
                      {log.resourceType} · {log.actorRole || 'system'}
                    </p>
                  </div>
                  <span className="text-fitcore-muted">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                </div>))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>);
};
