import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  CreditCard,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Check,
  ShieldAlert,
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
}

interface SubscriptionPaywallModalProps {
  isOpen: boolean;
  onRefresh: () => void;
  isRefreshing?: boolean;
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

export const SubscriptionPaywallModal: React.FC<SubscriptionPaywallModalProps> = ({
  isOpen,
  onRefresh,
  isRefreshing = false,
}) => {
  const { activeOrg, user } = useAuth();
  const queryClient = useQueryClient();

  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [simulatedCheckoutOrder, setSimulatedCheckoutOrder] = useState<any | null>(null);

  // Fetch available plans
  const { data: plans = [] } = useQuery<PlanItem[]>({
    queryKey: ['billing-plans'],
    queryFn: () => api.get('/billing/plans'),
    enabled: isOpen,
  });

  const { data: rzpConfig } = useQuery<{
    isConfigured: boolean;
    keyId: string;
    currency: string;
    isEnabled: boolean;
  }>({
    queryKey: ['razorpay-public-config'],
    queryFn: () => api.get('/billing/razorpay/config'),
    enabled: isOpen,
  });

  const activeCurrency = (rzpConfig?.currency || 'INR').toUpperCase();
  const isUSD = activeCurrency === 'USD';
  const currencySymbol = isUSD ? '$' : '₹';
  const currencyLocale = isUSD ? 'en-US' : 'en-IN';

  // Automatically default to Growth or first plan
  React.useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) {
      const growth = plans.find((p) => p.tier === 'GROWTH');
      setSelectedPlanId(growth ? growth.id : plans[0].id);
    }
  }, [plans, selectedPlanId]);

  if (!isOpen) return null;

  const currentSelectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  const handlePay = async () => {
    if (!currentSelectedPlan) return;
    try {
      setIsProcessing(true);
      setErrorMessage(null);

      const orderRes = await api.post<any>('/billing/razorpay/order', {
        planId: currentSelectedPlan.id,
        billingCycle,
      });

      if (orderRes.isSimulation) {
        setSimulatedCheckoutOrder(orderRes);
        setIsProcessing(false);
        return;
      }

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error('Failed to load Razorpay payment SDK. Please check your connection.');
      }

      const options = {
        key: orderRes.keyId,
        amount: orderRes.amount,
        currency: orderRes.currency,
        name: 'Peers Automate',
        description: `Subscription: ${currentSelectedPlan.name} (${billingCycle})`,
        image: 'https://cdn-icons-png.flaticon.com/512/1006/1006771.png',
        order_id: orderRes.orderId,
        handler: async (response: any) => {
          try {
            await api.post('/billing/razorpay/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              planId: currentSelectedPlan.id,
              billingCycle,
            });

            await queryClient.invalidateQueries({ queryKey: ['subscription'] });
            onRefresh();
          } catch (err: any) {
            setErrorMessage(err.message || 'Signature verification failed.');
          }
        },
        prefill: {
          name: user?.firstName ? `${user.firstName} ${user.lastName || ''}` : activeOrg?.name,
          email: user?.email,
        },
        theme: {
          color: '#059669',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        setErrorMessage(resp.error?.description || 'Payment was cancelled or unsuccessful.');
      });
      rzp.open();
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to start checkout.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteSimulation = async () => {
    if (!simulatedCheckoutOrder || !currentSelectedPlan) return;
    try {
      setIsProcessing(true);
      await api.post('/billing/razorpay/verify', {
        razorpayOrderId: simulatedCheckoutOrder.orderId,
        razorpayPaymentId: `pay_sim_${Date.now()}`,
        razorpaySignature: 'simulated_signature_bypass',
        planId: currentSelectedPlan.id,
        billingCycle,
      });

      setSimulatedCheckoutOrder(null);
      await queryClient.invalidateQueries({ queryKey: ['subscription'] });
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Simulation verification failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedPrice = currentSelectedPlan
    ? billingCycle === 'ANNUAL'
      ? currentSelectedPlan.annualPrice
      : currentSelectedPlan.monthlyPrice
    : 0;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 my-auto text-left relative animate-in fade-in zoom-in-95 duration-200">
        {/* Persistent Uncloseable Badge */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <Lock className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Subscription Payment Required</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                  PAYWALL ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Workspace: <strong className="text-slate-800 dark:text-slate-200">{activeOrg?.name}</strong>
              </p>
            </div>
          </div>

          {/* Refresh payment status */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
            title="Check if Administrator has activated your account"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
            <span>{isRefreshing ? 'Checking...' : 'Check Status'}</span>
          </button>
        </div>

        {/* Informative Alert */}
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>
              Your subscription is pending payment. Once payment is completed or approved by administrator, your full
              dashboard, visual bot flows, and WhatsApp messaging will be unlocked immediately.
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Billing Cycle Switcher */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Select Subscription Tier:</span>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                billingCycle === 'MONTHLY'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('ANNUAL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                billingCycle === 'ANNUAL'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>Yearly</span>
              <span className="text-[9px] font-extrabold px-1 rounded-full bg-emerald-500 text-white">20% OFF</span>
            </button>
          </div>
        </div>

        {/* Plan Cards Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {plans.map((p) => {
            const isSelected = p.id === currentSelectedPlan?.id;
            const price = billingCycle === 'ANNUAL' ? p.annualPrice : p.monthlyPrice;

            return (
              <div
                key={p.id}
                onClick={() => setSelectedPlanId(p.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-slate-900 dark:text-white text-xs">{p.name}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                    {currencySymbol}{Number(price).toLocaleString(currencyLocale)}
                    <span className="text-[10px] font-normal text-slate-500 block">
                      / {billingCycle === 'ANNUAL' ? 'year' : 'month'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                  <div>• {Number(p.maxContacts || 0).toLocaleString()} Contacts</div>
                  <div>• {Number(p.maxMonthlyMessages || 0).toLocaleString()} Messages</div>
                  <div>• {p.maxPhoneNumbers || 1} WhatsApp Line</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Razorpay Checkout Action */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Total payable amount:</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {currencySymbol}{Number(selectedPrice).toLocaleString(currencyLocale)}{' '}
              <span className="text-xs font-semibold text-slate-400 font-sans">
                ({billingCycle === 'ANNUAL' ? 'Yearly' : 'Monthly'})
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={isProcessing}
            onClick={handlePay}
            className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>{isProcessing ? 'Connecting Gateway...' : 'Pay Now with Razorpay'}</span>
          </button>
        </div>

        {/* Simulation Modal inside paywall if test order generated */}
        {simulatedCheckoutOrder && (
          <div className="mt-4 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>Instant Simulator Active</span>
              </span>
              <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300">
                Order: {simulatedCheckoutOrder.orderId}
              </span>
            </div>
            <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed">
              Test mode is enabled for this workspace. Click below to simulate an approved payment and immediately unlock
              your dashboard.
            </p>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleCompleteSimulation}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Complete Test Payment & Unlock Workspace</span>
            </button>
          </div>
        )}

        <div className="text-[11px] text-center text-slate-400 pt-1">
          Need offline/wire transfer activation? Reach out to support at{' '}
          <span className="font-semibold text-slate-600 dark:text-slate-300">support@peersglobal.com</span>
        </div>
      </div>
    </div>
  );
};

