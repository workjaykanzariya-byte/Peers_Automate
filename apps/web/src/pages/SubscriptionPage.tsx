import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  Calendar,
  RefreshCw,
  AlertTriangle,
  Zap,
  Check,
  FileText,
  Download,
  Lock,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  X,
  HelpCircle,
  Eye,
} from 'lucide-react';

interface PlanItem {
  id: string;
  name: string;
  tier: string;
  monthlyPrice: number | string;
  annualPrice: number | string;
  currency: string;
  maxContacts: number;
  maxMonthlyMessages: number;
  maxPhoneNumbers: number;
  maxTeamMembers: number;
  features: string[];
  isActive: boolean;
}

interface SubscriptionData {
  id?: string;
  organizationId?: string;
  planId?: string;
  status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'UNPAID' | 'TRIAL' | 'CANCELLED';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  provider?: string;
  daysRemaining: number;
  isExpired: boolean;
  plan: PlanItem;
}

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  amount: number | string;
  currency: string;
  status: string;
  billingDate: string;
  paidAt?: string;
  metadata?: any;
}

// Dynamically load Razorpay SDK
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const SubscriptionPage: React.FC = () => {
  const { activeOrg, user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'subscription' | 'invoices'>('subscription');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL');
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<PlanItem | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [isReceiptLoading, setIsReceiptLoading] = useState(false);
  const [simulationModal, setSimulationModal] = useState<{
    isOpen: boolean;
    orderData: any;
    plan: PlanItem;
  } | null>(null);

  // 1. Fetch Subscription status
  const {
    data: subscription,
    isLoading: subLoading,
    refetch: refetchSubscription,
  } = useQuery<SubscriptionData>({
    queryKey: ['subscription', activeOrg?.id],
    queryFn: () => api.get('/billing/subscription'),
  });

  // 2. Fetch Commercial Plans
  const { data: plans = [], isLoading: plansLoading } = useQuery<PlanItem[]>({
    queryKey: ['billing-plans'],
    queryFn: () => api.get('/billing/plans'),
  });

  // 3. Fetch Invoices
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<InvoiceItem[]>({
    queryKey: ['billing-invoices', activeOrg?.id],
    queryFn: () => api.get('/billing/invoices'),
  });

  // 4. Toggle Auto-Renew mutation
  const autoRenewMutation = useMutation({
    mutationFn: (cancelAtPeriodEnd: boolean) =>
      api.patch('/billing/subscription/auto-renew', { cancelAtPeriodEnd }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      setPaymentNotice({
        type: 'success',
        message: 'Auto-renewal preference updated successfully.',
      });
      setTimeout(() => setPaymentNotice(null), 4000);
    },
    onError: (err: any) => {
      setPaymentNotice({
        type: 'error',
        message: err.message || 'Failed to update auto-renewal preference.',
      });
    },
  });

  // Handle Checkout via Razorpay
  const handleInitiatePayment = async (plan: PlanItem) => {
    try {
      setIsProcessingPayment(true);
      setPaymentNotice(null);

      // Create Order on Backend
      const orderRes = await api.post<any>('/billing/razorpay/order', {
        planId: plan.id,
        billingCycle,
      });

      if (orderRes.isSimulation) {
        // Open simulation checkout modal for test environments
        setSimulationModal({
          isOpen: true,
          orderData: orderRes,
          plan,
        });
        setIsProcessingPayment(false);
        return;
      }

      // Load official Razorpay checkout script
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error('Failed to load Razorpay Checkout SDK. Please check your internet connection.');
      }

      const options = {
        key: orderRes.keyId,
        amount: orderRes.amount,
        currency: orderRes.currency,
        name: 'Peers Automate',
        description: `Subscription for ${orderRes.planName} (${billingCycle})`,
        image: 'https://cdn-icons-png.flaticon.com/512/1006/1006771.png',
        order_id: orderRes.orderId,
        handler: async (response: any) => {
          try {
            await api.post('/billing/razorpay/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              planId: plan.id,
              billingCycle,
            });

            await queryClient.invalidateQueries({ queryKey: ['subscription'] });
            await queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });

            setPaymentNotice({
              type: 'success',
              message: `🎉 Payment successful! You are now subscribed to ${plan.name}. Workspace is active!`,
            });
          } catch (verifyErr: any) {
            setPaymentNotice({
              type: 'error',
              message: verifyErr.message || 'Payment verification failed. Please contact platform support.',
            });
          }
        },
        prefill: {
          name: user?.firstName ? `${user.firstName} ${user.lastName || ''}` : activeOrg?.name,
          email: user?.email,
        },
        theme: {
          color: '#059669', // Emerald brand tone
        },
      };

      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.on('payment.failed', function (resp: any) {
        setPaymentNotice({
          type: 'error',
          message: resp.error.description || 'Payment was cancelled or failed.',
        });
      });
      razorpayInstance.open();
    } catch (err: any) {
      setPaymentNotice({
        type: 'error',
        message: err.message || 'Could not initialize payment checkout.',
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Complete Simulation Payment
  const handleCompleteSimulatedPayment = async () => {
    if (!simulationModal) return;
    try {
      setIsProcessingPayment(true);
      const simulatedPaymentId = `pay_sim_${Date.now()}`;

      await api.post('/billing/razorpay/verify', {
        razorpayOrderId: simulationModal.orderData.orderId,
        razorpayPaymentId: simulatedPaymentId,
        razorpaySignature: 'simulated_signature_bypass',
        planId: simulationModal.plan.id,
        billingCycle,
      });

      setSimulationModal(null);
      await queryClient.invalidateQueries({ queryKey: ['subscription'] });
      await queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });

      setPaymentNotice({
        type: 'success',
        message: `🎉 Payment verified! Workspace is now ACTIVE on ${simulationModal.plan.name}.`,
      });
    } catch (err: any) {
      setPaymentNotice({
        type: 'error',
        message: err.message || 'Simulation verification failed.',
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // View Receipt
  const handleViewReceipt = async (invoiceId: string) => {
    try {
      setIsReceiptLoading(true);
      const receipt = await api.get<any>(`/billing/invoices/${invoiceId}/receipt`);
      setSelectedReceipt(receipt);
    } catch (err: any) {
      alert(err.message || 'Failed to load invoice receipt.');
    } finally {
      setIsReceiptLoading(false);
    }
  };

  const isActive = subscription?.status === 'ACTIVE' && !subscription?.isExpired;
  const currentPlan = subscription?.plan;
  const daysLeft = subscription?.daysRemaining ?? 0;

  // Calculate monthly spend with tax
  const monthlySpend = React.useMemo(() => {
    if (!isActive || !currentPlan) return 0;
    const base = Number(currentPlan.monthlyPrice) || 0;
    // 18% GST standard
    const withTax = base * 1.18;
    return withTax;
  }, [isActive, currentPlan]);

  const activePlansCount = isActive ? 1 : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
        <span className="hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">Dashboard</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-800 dark:text-slate-200 font-semibold">Subscription Details</span>
      </div>

      {/* Payment / Notification Banners */}
      {paymentNotice && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-xs transition ${
            paymentNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
              : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {paymentNotice.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{paymentNotice.message}</span>
          </div>
          <button
            onClick={() => setPaymentNotice(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Subscription Details</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage your active plans, billing, and subscription preferences all in one place
            </p>
          </div>
        </div>

        {/* Tab switcher buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('subscription')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'subscription'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Subscription
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'invoices'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>Invoices</span>
            {invoices.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {invoices.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Top 3 Metric Cards matching reference UI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Metric 1: Active Plans */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Plans</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{activePlansCount}</div>
          </div>
        </div>

        {/* Metric 2: Monthly Spend */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-sky-50 dark:bg-sky-500/15 border border-sky-200 dark:border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
            <span className="text-lg font-black font-mono">₹</span>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Monthly Spend (With Tax)</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              ₹{monthlySpend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Metric 3: Next Renewal */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Next Renewal After</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {isActive ? `${daysLeft} days` : 'Pending'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">
          {/* Active Plan Detail Box (Matching Reference Screenshot) */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span
                  className={`w-3 h-3 rounded-full ${
                    isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                      : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                  }`}
                >
                  {isActive ? 'Active' : 'Pending Payment'}
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    {currentPlan?.name || 'Growth Plan'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Total: ₹
                    {Number(
                      billingCycle === 'ANNUAL' ? currentPlan?.annualPrice || 25000 : currentPlan?.monthlyPrice || 2999,
                    ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
                    / {billingCycle === 'ANNUAL' ? 'yearly' : 'monthly'} (Including Tax)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('commercial-plans-grid');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-500/10 dark:hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 text-xs font-bold transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Details / Change Plan</span>
                </button>
              </div>
            </div>

            {/* Dates & Auto-Renew Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-slate-500 dark:text-slate-400 font-medium">Started</div>
                  <div className="font-bold text-slate-900 dark:text-slate-200 text-sm mt-0.5">
                    {subscription?.currentPeriodStart
                      ? new Date(subscription.currentPeriodStart).toLocaleDateString('en-US', {
                          month: 'short',
                          day: '2-digit',
                          year: 'numeric',
                        })
                      : 'May 09, 2026'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-slate-500 dark:text-slate-400 font-medium">Renews</div>
                  <div className="font-bold text-slate-900 dark:text-slate-200 text-sm mt-0.5">
                    {subscription?.currentPeriodEnd
                      ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                          month: 'short',
                          day: '2-digit',
                          year: 'numeric',
                        })
                      : 'May 25, 2027'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-slate-500 dark:text-slate-400 font-medium">Auto-Renew</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                    {!subscription?.cancelAtPeriodEnd ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
              </div>
            </div>

            {/* Note & Actions Footer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="w-4 h-4" />
                <span>
                  Auto-renews on{' '}
                  {subscription?.currentPeriodEnd
                    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric',
                      })
                    : 'May 25, 2027'}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={autoRenewMutation.isPending}
                  onClick={() => autoRenewMutation.mutate(!subscription?.cancelAtPeriodEnd)}
                  className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>{subscription?.cancelAtPeriodEnd ? 'Enable Auto-Renew' : 'Disable Auto-Renew'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to cancel this plan at the end of the billing cycle?')) {
                      autoRenewMutation.mutate(true);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>

          {/* Available Subscription Plans Grid */}
          <div id="commercial-plans-grid" className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  <span>Choose or Upgrade Your Plan</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select a plan tailored for your messaging scale. All transactions processed securely via Razorpay.
                </p>
              </div>

              {/* Billing Cycle Toggle */}
              <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setBillingCycle('MONTHLY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    billingCycle === 'MONTHLY'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('ANNUAL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    billingCycle === 'ANNUAL'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>Yearly</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-emerald-500 text-white">
                    SAVE 20%
                  </span>
                </button>
              </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plansLoading ? (
                <div className="col-span-3 text-center py-12 text-slate-400 font-mono text-xs">
                  Loading subscription plans...
                </div>
              ) : (
                plans.map((p) => {
                  const isCurrent = currentPlan?.tier === p.tier && isActive;
                  const price = billingCycle === 'ANNUAL' ? p.annualPrice : p.monthlyPrice;

                  return (
                    <div
                      key={p.id}
                      className={`p-6 rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-200 flex flex-col justify-between shadow-xs ${
                        isCurrent
                          ? 'border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">{p.name}</h3>
                            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                              {p.tier}
                            </span>
                          </div>
                          {isCurrent && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300">
                              CURRENT
                            </span>
                          )}
                        </div>

                        {/* Price Display in INR */}
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                              ₹{Number(price).toLocaleString('en-IN')}
                            </span>
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              / {billingCycle === 'ANNUAL' ? 'year' : 'month'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">Plus applicable GST / taxes</p>
                        </div>

                        {/* Limits Checklist */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>
                              <strong>{Number(p.maxContacts || 0).toLocaleString('en-IN')}</strong> WhatsApp Contacts
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>
                              <strong>{Number(p.maxMonthlyMessages || 0).toLocaleString('en-IN')}</strong> Messages / Month
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>
                              <strong>{p.maxPhoneNumbers}</strong> WhatsApp Business Phone Line(s)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>
                              <strong>{p.maxTeamMembers}</strong> Team Seats & Agents
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>Visual DAG Bot Flow Builder</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>Meta Cloud API Official Direct Relay</span>
                          </div>
                        </div>
                      </div>

                      {/* Pay / Switch Button */}
                      <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
                        {isCurrent ? (
                          <button
                            type="button"
                            disabled
                            className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs font-extrabold cursor-not-allowed"
                          >
                            Active Subscription
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isProcessingPayment}
                            onClick={() => handleInitiatePayment(p)}
                            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                          >
                            <Zap className="w-4 h-4" />
                            <span>{isProcessingPayment ? 'Connecting Razorpay...' : 'Subscribe / Pay with Razorpay'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Billing History & Invoices</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Download printable tax invoices and payment receipts for your accounting records.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="px-4 py-3">Invoice Number</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoicesLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-mono">
                      Loading invoice records...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No invoices recorded yet. Once a payment is completed, invoices will appear here.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                        {new Date(inv.billingDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900 dark:text-slate-200">
                        ₹{Number(inv.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300">
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleViewReceipt(inv.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Simulated Checkout Modal (For instant testing without live Razorpay keys) */}
      {simulationModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Razorpay Checkout Gateway
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSimulationModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Plan Tier:</span>
                <span className="font-bold text-slate-900 dark:text-white">{simulationModal.plan.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cycle:</span>
                <span className="font-bold text-slate-900 dark:text-white">{billingCycle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Due:</span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                  ₹{Number(simulationModal.orderData.displayAmount).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Order ID:</span>
                <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                  {simulationModal.orderData.orderId}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30 text-[11px] text-sky-800 dark:text-sky-300 leading-relaxed">
              💡 <strong>Instant Checkout Simulator:</strong> Live Razorpay test orders simulate seamless UPI, Cards,
              and NetBanking processing. Clicking below will instantly activate your workspace.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSimulationModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handleCompleteSimulatedPayment}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-98"
              >
                <Check className="w-4 h-4" />
                <span>Complete Payment & Unlock</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Receipt Printable Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-500" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Payment Receipt</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-black text-base text-slate-900 dark:text-white font-mono">
                    {selectedReceipt.invoiceNumber}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    Billed to: <strong>{selectedReceipt.customerName}</strong>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300">
                  {selectedReceipt.status}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 font-mono">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Billing Date:</span>
                  <span>{new Date(selectedReceipt.billingDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Payment Date:</span>
                  <span>{new Date(selectedReceipt.paidAt || selectedReceipt.billingDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 dark:text-white text-sm pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span>Total Paid:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    ₹{Number(selectedReceipt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                <strong>Issued by:</strong> {selectedReceipt.issuer.name} • {selectedReceipt.issuer.address} • Contact:{' '}
                {selectedReceipt.issuer.supportEmail}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Print / Download</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPage;

