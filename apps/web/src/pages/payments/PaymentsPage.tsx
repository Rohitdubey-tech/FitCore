import React, { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PAYMENT_STATUSES,
  type ApiSuccessResponse,
  type GymDTO,
  type GymMemberDTO,
  type InvoiceDTO,
  type MembershipPlanDTO,
  type PaymentDTO,
  type RevenueSummaryDTO,
} from '@fitcore/shared-types';
import {
  CheckCircle2,
  FileText,
  IndianRupee,
  Plus,
  Printer,
  RotateCcw,
  ShieldCheck,
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

const orderFormSchema = z.object({
  memberId: z.string().min(1, 'Select a member'),
  planId: z.string().min(1, 'Select a plan'),
});

const verifyFormSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1, 'Payment ID is required'),
  razorpaySignature: z.string().min(1, 'Signature is required'),
});

export const PaymentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const pushToast = useToastStore((s) => s.pushToast);

  const [selectedGymId, setSelectedGymId] = useState(user?.activeGymId || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<PaymentDTO | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceDTO | null>(null);

  const canManage = user?.role === 'super_admin' || user?.role === 'gym_admin';

  const gymsQuery = useQuery({
    queryKey: ['gyms', 'for-payments'],
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

  const historyQuery = useQuery({
    queryKey: ['payments', selectedGymId, statusFilter],
    enabled: Boolean(selectedGymId),
    queryFn: async () => {
      const res = await api.get<
        ApiSuccessResponse<{ payments: PaymentDTO[]; summary: RevenueSummaryDTO }>
      >('/payments/history', {
        params: {
          gymId: selectedGymId,
          status: statusFilter || undefined,
        },
      });
      return res.data.data;
    },
  });

  const membersQuery = useQuery({
    queryKey: ['members', 'for-payments', selectedGymId],
    enabled: Boolean(orderModalOpen && selectedGymId),
    queryFn: async () => {
      const res = await api.get<ApiSuccessResponse<{ members: GymMemberDTO[] }>>(
        `/gyms/${selectedGymId}/members`,
        { params: { limit: 100 } }
      );
      return res.data.data.members;
    },
  });

  const plansQuery = useQuery({
    queryKey: ['plans', 'for-payments', selectedGymId],
    enabled: Boolean(orderModalOpen && selectedGymId),
    queryFn: async () => {
      const res = await api.get<ApiSuccessResponse<{ plans: MembershipPlanDTO[] }>>(
        '/membership-plans',
        { params: { gymId: selectedGymId, status: 'active' } }
      );
      return res.data.data.plans;
    },
  });

  const orderForm = useForm<z.infer<typeof orderFormSchema>>({
    resolver: zodResolver(orderFormSchema),
  });

  const verifyForm = useForm<z.infer<typeof verifyFormSchema>>({
    resolver: zodResolver(verifyFormSchema),
  });

  const createOrderMutation = useMutation({
    mutationFn: async (values: z.infer<typeof orderFormSchema>) => {
      const res = await api.post<
        ApiSuccessResponse<{
          payment: PaymentDTO;
          razorpay: { orderId: string; mode: string; keyId: string };
        }>
      >('/payments/orders', {
        gymId: selectedGymId,
        ...values,
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['payments'] });
      setOrderModalOpen(false);
      pushToast({
        variant: 'success',
        title: 'Razorpay order created',
        description: `Order ID: ${data.razorpay.orderId}`,
      });
    },
    onError: (err) => {
      pushToast({
        variant: 'error',
        title: 'Order creation failed',
        description: getApiErrorMessage(err),
      });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (values: z.infer<typeof verifyFormSchema>) => {
      const res = await api.post<ApiSuccessResponse<{ payment: PaymentDTO }>>(
        '/payments/verify',
        values
      );
      return res.data.data.payment;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payments'] });
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      setVerifyTarget(null);
      pushToast({
        variant: 'success',
        title: 'Payment verified',
        description: 'Invoice issued and subscription activated.',
      });
    },
    onError: (err) => {
      pushToast({
        variant: 'error',
        title: 'Verification failed',
        description: getApiErrorMessage(err),
      });
    },
  });

  const sandboxCompleteMutation = useMutation({
    mutationFn: async (razorpayOrderId: string) => {
      const res = await api.post<ApiSuccessResponse<{ payment: PaymentDTO }>>(
        '/payments/sandbox-complete',
        { razorpayOrderId }
      );
      return res.data.data.payment;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payments'] });
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      setVerifyTarget(null);
      pushToast({
        variant: 'success',
        title: 'Payment completed',
        description: 'Invoice issued and membership subscription activated.',
      });
    },
    onError: (err) => {
      pushToast({
        variant: 'error',
        title: 'Payment completion failed',
        description: getApiErrorMessage(err),
      });
    },
  });

  const refundMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      await api.post(`/payments/${paymentId}/refund`, {
        reason: 'Refund issued from FITCORE billing console',
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payments'] });
      pushToast({ variant: 'success', title: 'Refund processed' });
    },
    onError: (err) => {
      pushToast({
        variant: 'error',
        title: 'Refund failed',
        description: getApiErrorMessage(err),
      });
    },
  });

  const loadInvoice = async (paymentId: string) => {
    try {
      const res = await api.get<ApiSuccessResponse<{ invoice: InvoiceDTO }>>(
        `/payments/${paymentId}/invoice`
      );
      setInvoiceData(res.data.data.invoice);
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Unable to load invoice',
        description: getApiErrorMessage(err),
      });
    }
  };

  const payments = historyQuery.data?.payments || [];
  const summary = historyQuery.data?.summary;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-fitcore-accent">
              Razorpay Billing & Invoices
            </p>
            <h1 className="mt-1 font-['Manrope'] text-2xl font-extrabold text-white">
              Payments & Revenue
            </h1>
            <p className="mt-1 text-sm text-fitcore-muted">
              Track Razorpay orders, HMAC-verified payments, refunds, and generated invoices.
            </p>
          </div>
          {selectedGymId && (
            <Button onClick={() => setOrderModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Create payment order
            </Button>
          )}
        </div>

        {/* Summary KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <p className="text-xs text-fitcore-muted">Total Collected</p>
            <p className="mt-2 font-['Manrope'] text-2xl font-extrabold text-fitcore-accent">
              {summary?.currency || 'INR'} {(summary?.totalCollected ?? 0).toLocaleString()}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-fitcore-muted">Pending Orders</p>
            <p className="mt-2 font-['Manrope'] text-2xl font-extrabold text-white">
              {summary?.currency || 'INR'} {(summary?.pendingAmount ?? 0).toLocaleString()}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-fitcore-muted">Refunded</p>
            <p className="mt-2 font-['Manrope'] text-2xl font-extrabold text-amber-400">
              {summary?.currency || 'INR'} {(summary?.refundedAmount ?? 0).toLocaleString()}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-fitcore-muted">Paid Transactions</p>
            <p className="mt-2 font-['Manrope'] text-2xl font-extrabold text-white">
              {summary?.paidCount ?? 0}
            </p>
          </Card>
        </div>

        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <select
            value={selectedGymId}
            onChange={(e) => setSelectedGymId(e.target.value)}
            className="fitcore-input max-w-xs"
          >
            {(gymsQuery.data || []).map((gym) => (
              <option key={gym.id} value={gym.id}>
                {gym.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="fitcore-input max-w-xs"
          >
            <option value="">All payment statuses</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </Card>

        {historyQuery.isLoading ? (
          <Skeleton className="h-56" />
        ) : historyQuery.isError ? (
          <ErrorState
            message={getApiErrorMessage(historyQuery.error)}
            onRetry={() => void historyQuery.refetch()}
          />
        ) : payments.length === 0 ? (
          <EmptyState
            title="No payment transactions yet"
            description="Create a Razorpay payment order for a member plan to begin tracking revenue and invoices."
            actionLabel="Create payment order"
            onAction={() => setOrderModalOpen(true)}
          />
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-fitcore-border bg-[#141618] text-xs uppercase text-fitcore-muted">
                  <tr>
                    <th className="px-5 py-3.5">Order / Invoice</th>
                    <th className="px-5 py-3.5">Member & Plan</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fitcore-border">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-4">
                        <p className="font-mono text-xs text-white">{p.razorpayOrderId}</p>
                        <p className="mt-0.5 font-mono text-xs text-fitcore-accent">
                          {p.invoiceNumber || p.receipt}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-white">
                          {p.member ? `${p.member.firstName} ${p.member.lastName}` : p.memberId}
                        </p>
                        <p className="text-xs text-fitcore-muted">{p.plan?.name}</p>
                      </td>
                      <td className="px-5 py-4 font-semibold text-white">
                        <span className="inline-flex items-center">
                          <IndianRupee className="h-3.5 w-3.5 text-fitcore-accent" />
                          {p.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          variant={
                            p.status === 'paid'
                              ? 'success'
                              : p.status === 'pending'
                              ? 'neutral'
                              : 'warning'
                          }
                        >
                          {p.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex gap-1.5">
                          {p.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setVerifyTarget(p);
                                verifyForm.reset({
                                  razorpayOrderId: p.razorpayOrderId,
                                  razorpayPaymentId: '',
                                  razorpaySignature: '',
                                });
                              }}
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Verify
                            </Button>
                          )}
                          {p.invoiceNumber && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => void loadInvoice(p.id)}
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Invoice
                            </Button>
                          )}
                          {canManage &&
                            (p.status === 'paid' || p.status === 'partially_refunded') && (
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => {
                                  if (window.confirm('Issue full refund for this payment?')) {
                                    refundMutation.mutate(p.id);
                                  }
                                }}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Create Order Modal */}
      {orderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-fitcore-border bg-fitcore-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-['Manrope'] text-lg font-bold text-white">
                Create Razorpay Order
              </h2>
              <button
                onClick={() => setOrderModalOpen(false)}
                className="rounded-lg p-1 text-fitcore-muted hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={orderForm.handleSubmit((v) => createOrderMutation.mutate(v))}
              className="space-y-3.5"
            >
              <div>
                <label className="mb-1 block text-xs text-fitcore-muted">Member</label>
                <select className="fitcore-input" {...orderForm.register('memberId')}>
                  <option value="">Select member...</option>
                  {(membersQuery.data || []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.user.firstName} {m.user.lastName} ({m.membershipCode})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-fitcore-muted">Membership Plan</label>
                <select className="fitcore-input" {...orderForm.register('planId')}>
                  <option value="">Select plan...</option>
                  {(plansQuery.data || []).map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name} — {pl.currency} {pl.price}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setOrderModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={createOrderMutation.isPending}>
                  Create order
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verify Payment Modal */}
      {verifyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-fitcore-border bg-fitcore-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-['Manrope'] text-lg font-bold text-white">
                Verify Razorpay Signature
              </h2>
              <button
                onClick={() => setVerifyTarget(null)}
                className="rounded-lg p-1 text-fitcore-muted hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={verifyForm.handleSubmit((v) => verifyMutation.mutate(v))}
              className="space-y-3"
            >
              <div>
                <label className="mb-1 block text-xs text-fitcore-muted">Razorpay Order ID</label>
                <input
                  readOnly
                  className="fitcore-input font-mono text-xs opacity-70"
                  {...verifyForm.register('razorpayOrderId')}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-fitcore-muted">
                  Razorpay Payment ID
                </label>
                <input
                  placeholder="pay_..."
                  className="fitcore-input font-mono text-xs"
                  {...verifyForm.register('razorpayPaymentId')}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-fitcore-muted">HMAC Signature</label>
                <input
                  placeholder="64-char hex HMAC-SHA256"
                  className="fitcore-input font-mono text-xs"
                  {...verifyForm.register('razorpaySignature')}
                />
              </div>
              <div className="flex flex-wrap justify-between gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  isLoading={sandboxCompleteMutation.isPending}
                  onClick={() => sandboxCompleteMutation.mutate(verifyTarget.razorpayOrderId)}
                >
                  Complete Test Payment
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setVerifyTarget(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={verifyMutation.isPending}>
                    <CheckCircle2 className="h-4 w-4" />
                    Verify signature
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-fitcore-border bg-fitcore-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-fitcore-accent">FITCORE INVOICE</p>
                <h2 className="font-['Manrope'] text-lg font-bold text-white">
                  {invoiceData.invoiceNumber}
                </h2>
              </div>
              <button
                onClick={() => setInvoiceData(null)}
                className="rounded-lg p-1 text-fitcore-muted hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 rounded-xl border border-fitcore-border bg-[#141618] p-4 text-sm">
              <div className="flex justify-between">
                <div>
                  <p className="text-xs text-fitcore-muted">Issued by</p>
                  <p className="font-semibold text-white">{invoiceData.gym.name}</p>
                  <p className="text-xs text-fitcore-muted">{invoiceData.gym.contactEmail}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-fitcore-muted">Issued date</p>
                  <p className="text-white">
                    {new Date(invoiceData.issuedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="border-t border-fitcore-border pt-3">
                <p className="text-xs text-fitcore-muted">Billed to</p>
                <p className="font-semibold text-white">{invoiceData.member.name}</p>
                <p className="text-xs text-fitcore-muted">
                  {invoiceData.member.email} · {invoiceData.member.membershipCode}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-fitcore-border pt-3">
                <div>
                  <p className="font-medium text-white">{invoiceData.plan.name}</p>
                  <p className="text-xs text-fitcore-muted">
                    {invoiceData.plan.durationDays} days validity
                  </p>
                </div>
                <p className="font-['Manrope'] text-xl font-extrabold text-fitcore-accent">
                  {invoiceData.currency} {invoiceData.amount.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                Print / Save PDF
              </Button>
              <Button onClick={() => setInvoiceData(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

