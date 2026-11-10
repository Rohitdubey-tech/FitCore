import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, LogOut, QrCode, UserCheck } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Badge, Card, Skeleton } from '../../components/ui/Card';
import { EmptyState, ErrorState } from '../../components/ui/StateViews';
import { api, getApiErrorMessage } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
export const AttendancePage = () => {
    const queryClient = useQueryClient();
    const user = useAuthStore((s) => s.user);
    const pushToast = useToastStore((s) => s.pushToast);
    const [selectedGymId, setSelectedGymId] = useState(user?.activeGymId || '');
    const [qrToken, setQrToken] = useState('');
    const [membershipCode, setMembershipCode] = useState('');
    const canGenerateQR = user?.role === 'super_admin' || user?.role === 'gym_admin' || user?.role === 'trainer';
    const gymsQuery = useQuery({
        queryKey: ['gyms', 'for-attendance'],
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
    const listQuery = useQuery({
        queryKey: ['attendance', selectedGymId],
        enabled: Boolean(selectedGymId),
        queryFn: async () => {
            const res = await api.get('/attendance', { params: { gymId: selectedGymId } });
            return res.data.data.attendance;
        },
    });
    const qrMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/attendance/qr-token', { gymId: selectedGymId, ttlMinutes: 15 });
            return res.data.data;
        },
        onSuccess: (data) => {
            setQrToken(data.qrToken);
            pushToast({ variant: 'success', title: 'Signed QR token generated (15 min TTL)' });
        },
        onError: (err) => {
            pushToast({ variant: 'error', title: 'Failed', description: getApiErrorMessage(err) });
        },
    });
    const checkInMutation = useMutation({
        mutationFn: async () => {
            await api.post('/attendance/check-in', {
                gymId: selectedGymId,
                ...(qrToken.trim() && !membershipCode.trim()
                    ? { qrToken: qrToken.trim() }
                    : { membershipCode: membershipCode.trim() || undefined }),
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['attendance'] });
            void queryClient.invalidateQueries({ queryKey: ['notifications'] });
            setMembershipCode('');
            pushToast({ variant: 'success', title: 'Member checked in' });
        },
        onError: (err) => {
            pushToast({ variant: 'error', title: 'Check-in failed', description: getApiErrorMessage(err) });
        },
    });
    const checkOutMutation = useMutation({
        mutationFn: async (memberId) => {
            await api.post('/attendance/check-out', { gymId: selectedGymId, memberId });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['attendance'] });
            pushToast({ variant: 'success', title: 'Checked out' });
        },
        onError: (err) => {
            pushToast({ variant: 'error', title: 'Check-out failed', description: getApiErrorMessage(err) });
        },
    });
    const rows = listQuery.data || [];
    return (<DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-fitcore-accent">
              Front Desk & Member Access
            </p>
            <h1 className="mt-1 font-['Manrope'] text-2xl font-extrabold text-white">
              QR Attendance & Check-Ins
            </h1>
          </div>
          <select value={selectedGymId} onChange={(e) => setSelectedGymId(e.target.value)} className="fitcore-input max-w-xs">
            {(gymsQuery.data || []).map((gym) => (<option key={gym.id} value={gym.id}>
                {gym.name}
              </option>))}
          </select>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {canGenerateQR && (<Card className="space-y-4">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-fitcore-accent"/>
                <h2 className="font-['Manrope'] text-lg font-bold text-white">
                  Signed QR Check-In Token
                </h2>
              </div>
              <Button onClick={() => qrMutation.mutate()} isLoading={qrMutation.isPending} disabled={!selectedGymId}>
                Generate 15-Min QR Token
              </Button>
              {qrToken && (<div className="rounded-xl border border-fitcore-accent/30 bg-[#141618] p-3 text-xs">
                  <p className="font-semibold text-fitcore-accent">Active QR Payload</p>
                  <p className="mt-1 break-all font-mono text-white">{qrToken}</p>
                </div>)}
            </Card>)}

          <Card className="space-y-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-fitcore-accent"/>
              <h2 className="font-['Manrope'] text-lg font-bold text-white">
                Check-In Member
              </h2>
            </div>
            <input value={membershipCode} onChange={(e) => setMembershipCode(e.target.value)} placeholder="Membership code (e.g. IP-2026-0001) or leave blank for QR/self" className="fitcore-input"/>
            <Button onClick={() => checkInMutation.mutate()} isLoading={checkInMutation.isPending} disabled={!selectedGymId}>
              <CheckCircle2 className="h-4 w-4"/>
              Check In Now
            </Button>
          </Card>
        </div>

        <Card className="overflow-hidden p-0">
          {listQuery.isLoading ? (<div className="p-6">
              <Skeleton className="h-40"/>
            </div>) : listQuery.isError ? (<div className="p-6">
              <ErrorState message={getApiErrorMessage(listQuery.error)} onRetry={() => void listQuery.refetch()}/>
            </div>) : rows.length === 0 ? (<div className="p-6">
              <EmptyState title="No attendance logs yet" description="Check in using a signed QR token or membership code above."/>
            </div>) : (<div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-fitcore-border bg-[#141618] text-xs uppercase text-fitcore-muted">
                  <tr>
                    <th className="px-5 py-3.5">Member</th>
                    <th className="px-5 py-3.5">Method</th>
                    <th className="px-5 py-3.5">Check-In</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fitcore-border">
                  {rows.map((r) => (<tr key={r.id}>
                      <td className="px-5 py-3.5 font-medium text-white">
                        {r.memberName || r.memberId}
                      </td>
                      <td className="px-5 py-3.5 uppercase text-xs text-fitcore-muted">
                        {r.method}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-fitcore-muted">
                        {new Date(r.checkInAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={r.status === 'checked_in' ? 'success' : 'neutral'}>
                          {r.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {r.status === 'checked_in' && (<Button size="sm" variant="secondary" onClick={() => checkOutMutation.mutate(r.memberId)}>
                            <LogOut className="h-3.5 w-3.5"/>
                            Check Out
                          </Button>)}
                      </td>
                    </tr>))}
                </tbody>
              </table>
            </div>)}
        </Card>
      </div>
    </DashboardLayout>);
};
