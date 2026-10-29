import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Users,
  MessageSquare,
  FileCode,
  Send,
  Workflow,
  Webhook,
  Smartphone,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user, activeOrg } = useAuth();

  const {
    data: stats,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['dashboard-stats', activeOrg?.id],
    queryFn: () => api.get<any>('/dashboard/stats'),
    enabled: !!activeOrg?.id,
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. Header Greeting & Organization Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-2xl bg-gradient-to-r from-emerald-50/90 via-white to-indigo-50/50 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-indigo-950/40 border border-slate-200 dark:border-slate-800/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multi-Tenant Enterprise Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Welcome back, {user?.firstName || 'Operator'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Active workspace: <strong className="text-slate-800 dark:text-slate-200">{activeOrg?.name}</strong> • Plan Tier:{' '}
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">{stats?.organization?.planTier || 'GROWTH'}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium border border-slate-200 dark:border-slate-700 shadow-xs transition"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-emerald-500' : ''}`} />
            <span>Sync Stats</span>
          </button>
          <Link
            to="/campaigns"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-sm transition"
          >
            <Send className="w-4 h-4" />
            <span>New Campaign</span>
          </Link>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50" />
          ))}
        </div>
      )}

      {/* Platform Admin Banner if no active tenant */}
      {!activeOrg && user?.isPlatformAdmin && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-rose-50 via-indigo-50 to-white dark:from-rose-950/40 dark:via-indigo-950/40 dark:to-slate-900 border border-indigo-200 dark:border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>PLATFORM SUPER ADMIN SESSION</span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Platform Owner Command Center Available</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
              You are authenticated with global platform administration rights. You can govern all customer organizations, monitor queues, inspect message delivery logs, and manage subscription tiers.
            </p>
          </div>
          <Link
            to="/admin"
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm transition whitespace-nowrap"
          >
            Open Command Center &rarr;
          </Link>
        </div>
      )}

      {/* Error Card */}
      {isError && !user?.isPlatformAdmin && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 flex items-center justify-between text-rose-700 dark:text-rose-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400" />
            <span>Unable to load live dashboard statistics for this tenant.</span>
          </div>
          <button
            onClick={() => refetch()}
            className="px-3 py-1 bg-rose-600 text-white hover:bg-rose-500 rounded-lg text-xs font-semibold transition"
          >
            Retry
          </button>
        </div>
      )}

      {stats && (
        <>
          {/* 2. Plan Quotas & Usage Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-xs">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Contact Directory Utilization</span>
                <span className="font-bold text-slate-900 dark:text-slate-200">
                  {stats.quotas.contacts.used} / {stats.quotas.contacts.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                  style={{ width: `${stats.quotas.contacts.percentage}%` }}
                />
              </div>
              <div className="text-xs text-slate-500 mt-2 flex justify-between">
                <span>{stats.quotas.contacts.percentage}% of tier quota used</span>
                <Link to="/contacts" className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold">
                  Manage Contacts &rarr;
                </Link>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-xs">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Monthly WhatsApp Broadcast Dispatch</span>
                <span className="font-bold text-slate-900 dark:text-slate-200">
                  {stats.quotas.monthlyMessages.used.toLocaleString()} /{' '}
                  {stats.quotas.monthlyMessages.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-400 transition-all duration-500"
                  style={{ width: `${stats.quotas.monthlyMessages.percentage}%` }}
                />
              </div>
              <div className="text-xs text-slate-500 mt-2 flex justify-between">
                <span>{stats.quotas.monthlyMessages.percentage}% of monthly allocation</span>
                <Link to="/campaigns" className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
                  View Broadcasts &rarr;
                </Link>
              </div>
            </div>
          </div>

          {/* 3. Core KPI Stat Cards - ALL CLICKABLE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/contacts"
              className="p-6 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/70 hover:border-emerald-500/50 hover:shadow-md transition cursor-pointer group block"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition">
                  Total Contacts
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">{stats.contacts.total}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{stats.contacts.newLeads} new</span> •{' '}
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{stats.contacts.wonLeads} won</span>
                </div>
              </div>
            </Link>

            <Link
              to="/templates"
              className="p-6 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/70 hover:border-indigo-500/50 hover:shadow-md transition cursor-pointer group block"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition">
                  WhatsApp Templates
                </span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition">
                  <FileCode className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                  {stats.whatsapp.templates.total}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {stats.whatsapp.templates.approved} approved
                  </span>{' '}
                  • {stats.whatsapp.templates.pending} pending
                </div>
              </div>
            </Link>

            <Link
              to="/inbox"
              className="p-6 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/70 hover:border-purple-500/50 hover:shadow-md transition cursor-pointer group block"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-purple-600 dark:group-hover:text-purple-300 transition">
                  Active Inboxes
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                  {stats.conversations.open}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span>{stats.conversations.messagesLast24h} messages (24h)</span>
                </div>
              </div>
            </Link>

            <Link
              to="/webhooks"
              className="p-6 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/70 hover:border-teal-500/50 hover:shadow-md transition cursor-pointer group block"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-teal-600 dark:group-hover:text-teal-300 transition">
                  Webhook Health
                </span>
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:scale-110 transition">
                  <Webhook className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition">
                  {stats.webhooks.successRatePercentage}%
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span>{stats.webhooks.successfulDeliveries} successful deliveries</span>
                </div>
              </div>
            </Link>
          </div>

          {/* 4. WhatsApp Connected Asset & Delivery Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* WhatsApp Connection Card */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Connected WhatsApp Asset</span>
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                  TIER 10K
                </span>
              </div>

              {stats.whatsapp.defaultPhoneNumber ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Verified Display Name</div>
                  <div className="text-base font-bold text-slate-900 dark:text-white">
                    {stats.whatsapp.defaultPhoneNumber.verifiedName || 'Business Line'}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800/60 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Phone Number:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {stats.whatsapp.defaultPhoneNumber.displayPhoneNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Quality Status:</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-medium">
                      {stats.whatsapp.defaultPhoneNumber.qualityRating}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-dashed border-slate-300 dark:border-slate-800 text-center text-sm text-slate-500 dark:text-slate-400">
                  No WhatsApp Phone Number connected yet.
                  <Link to="/whatsapp" className="block text-emerald-600 dark:text-emerald-400 font-semibold mt-2">
                    Connect via Meta Embedded Signup &rarr;
                  </Link>
                </div>
              )}

              <Link
                to="/whatsapp"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-sm font-semibold transition"
              >
                <span>Manage WhatsApp Numbers</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Campaign Broadcast Delivery Funnel */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Campaign Message Delivery Funnel</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Aggregated Meta Cloud API delivery receipts</p>
                </div>
                <Link to="/campaigns" className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
                  All Campaigns &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Sent</div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{stats.campaigns.sent}</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Delivered</div>
                  <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                    {stats.campaigns.delivered}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Read</div>
                  <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">{stats.campaigns.read}</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Failed</div>
                  <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">{stats.campaigns.failed}</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-500/20 text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>All customer message streams cryptographically scoped by tenant ID.</span>
                </div>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">Isolation Active</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
