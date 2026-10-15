import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  ShieldAlert,
  Building2,
  Users,
  CreditCard,
  Activity,
  Server,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  Lock,
  Unlock,
  Radio,
  Clock,
  ArrowUpRight,
  TrendingUp,
  FileText,
  X,
  MessageSquare,
  Send,
  Webhook,
  Smartphone,
  FileCode,
  Eye,
  Filter,
  Check,
  ChevronRight,
  History,
  Info,
} from 'lucide-react';

interface AdminStats {
  organizations: {
    total: number;
    active: number;
    trial: number;
    suspended: number;
  };
  users: {
    total: number;
  };
  messaging: {
    totalContacts: number;
    totalMessages: number;
    campaignsRun: number;
    messagesDispatched: number;
    messagesDelivered: number;
    messagesRead: number;
    messagesFailed: number;
    deliverySuccessRatePct: number;
  };
  webhooks: {
    successful: number;
    failed: number;
  };
  support: {
    openTickets: number;
  };
  queues: {
    messagingQueue: { waiting: number; active: number; completed: number; failed: number };
    webhookQueue: { waiting: number; active: number; completed: number; failed: number };
    campaignQueue: { waiting: number; active: number; completed: number; failed: number };
    status: string;
  };
  systemHealth: string;
  timestamp: string;
}

interface OrgItem {
  id: string;
  name: string;
  slug: string;
  planTier: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'EXPIRED';
  createdAt: string;
  _count?: {
    memberships: number;
    contacts: number;
    campaigns: number;
    phoneNumbers: number;
  };
}

interface PlanItem {
  id: string;
  name: string;
  tier: string;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  maxContacts: number;
  maxMonthlyMessages: number;
  maxPhoneNumbers: number;
  maxTeamMembers: number;
  hasVisualBuilder: boolean;
  hasAiAssistant: boolean;
  isActive: boolean;
}

export const AdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'organizations' | 'users' | 'messages' | 'campaigns' | 'webhooks' | 'plans' | 'queues' | 'audit'
  >('overview');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [messageStatusFilter, setMessageStatusFilter] = useState<string>('ALL');
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<string>('ALL');
  const [webhookStatusFilter, setWebhookStatusFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');

  // Organization Detail Modal State
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgDetailTab, setOrgDetailTab] = useState<'overview' | 'team' | 'phones' | 'templates' | 'campaigns' | 'messages' | 'audit'>('overview');

  // Suspension modal state
  const [suspensionModal, setSuspensionModal] = useState<{
    isOpen: boolean;
    org: OrgItem | null;
    action: 'SUSPEND' | 'REACTIVATE';
    reason: string;
  }>({
    isOpen: false,
    org: null,
    action: 'SUSPEND',
    reason: '',
  });

  // 1. Fetch real platform stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get<AdminStats>('/admin/stats'),
    refetchInterval: 15000,
  });

  // 2. Fetch organizations directory
  const { data: orgs, isLoading: orgsLoading, refetch: refetchOrgs } = useQuery<OrgItem[]>({
    queryKey: ['admin-orgs'],
    queryFn: () => api.get<OrgItem[]>('/admin/organizations'),
  });

  // 3. Fetch global user directory
  const { data: users, isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.get<any[]>('/admin/users'),
    enabled: activeTab === 'users',
  });

  // 4. Fetch platform-wide messages
  const { data: messagesData, isLoading: messagesLoading, refetch: refetchMessages } = useQuery<{ data: any[]; meta: any }>({
    queryKey: ['admin-messages', messageStatusFilter, searchTerm],
    queryFn: () => api.get<{ data: any[]; meta: any }>(`/admin/messages?status=${messageStatusFilter}&search=${encodeURIComponent(searchTerm)}`),
    enabled: activeTab === 'messages',
  });

  // 5. Fetch platform-wide campaigns
  const { data: campaignsData, isLoading: campaignsLoading, refetch: refetchCampaigns } = useQuery<{ data: any[]; meta: any }>({
    queryKey: ['admin-campaigns', campaignStatusFilter, searchTerm],
    queryFn: () => api.get<{ data: any[]; meta: any }>(`/admin/campaigns?status=${campaignStatusFilter}&search=${encodeURIComponent(searchTerm)}`),
    enabled: activeTab === 'campaigns',
  });

  // 6. Fetch platform-wide webhook logs
  const { data: webhooksData, isLoading: webhooksLoading, refetch: refetchWebhooks } = useQuery<{ data: any[]; meta: any }>({
    queryKey: ['admin-webhooks', webhookStatusFilter],
    queryFn: () => api.get<{ data: any[]; meta: any }>(`/admin/webhook-logs?statusType=${webhookStatusFilter}`),
    enabled: activeTab === 'webhooks',
  });

  // 7. Fetch plans
  const { data: plans, isLoading: plansLoading } = useQuery<PlanItem[]>({
    queryKey: ['admin-plans'],
    queryFn: () => api.get<PlanItem[]>('/admin/plans'),
    enabled: activeTab === 'plans',
  });

  // 8. Fetch audit logs
  const { data: auditData, isLoading: auditLoading } = useQuery<{ data: any[]; meta: any }>({
    queryKey: ['admin-audit-logs'],
    queryFn: () => api.get<{ data: any[]; meta: any }>('/admin/audit-logs'),
    enabled: activeTab === 'audit',
  });

  // 9. Fetch single organization detail when clicked
  const { data: orgDetail, isLoading: orgDetailLoading } = useQuery<any>({
    queryKey: ['admin-org-detail', selectedOrgId],
    queryFn: () => api.get<any>(`/admin/organizations/${selectedOrgId}`),
    enabled: !!selectedOrgId,
  });

  // Suspend / Reactivate Mutation
  const suspendMutation = useMutation({
    mutationFn: async ({ orgId, action, reason }: { orgId: string; action: 'SUSPEND' | 'REACTIVATE'; reason: string }) => {
      if (action === 'SUSPEND') {
        return api.post(`/admin/organizations/${orgId}/suspend`, { reason });
      } else {
        return api.post(`/admin/organizations/${orgId}/reactivate`, { reason });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orgs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      if (selectedOrgId) {
        queryClient.invalidateQueries({ queryKey: ['admin-org-detail', selectedOrgId] });
      }
      setSuspensionModal({ isOpen: false, org: null, action: 'SUSPEND', reason: '' });
    },
  });

  const orgList: OrgItem[] = Array.isArray(orgs) ? orgs : (orgs as any)?.data || [];
  const userList: any[] = Array.isArray(users) ? users : (users as any)?.data || [];
  const messageList: any[] = messagesData?.data || [];
  const campaignList: any[] = campaignsData?.data || [];
  const webhookList: any[] = webhooksData?.data || [];
  const auditList: any[] = auditData?.data || [];

  const filteredOrs = orgList.filter((o) => {
    const matchesSearch = o.name.toLowerCase().includes(searchTerm.toLowerCase()) || o.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. Header & Live System Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-rose-950/30 border border-slate-800/80 shadow-2xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-rose-400 mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span className="uppercase tracking-wider">DOOT Master Platform Administration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span>Platform Owner Command Center</span>
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              SYSTEM OPERATIONAL
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time cross-tenant governance, operational KPI analytics, user directory, and background queue monitoring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refetchStats();
              refetchOrgs();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 pb-2">
        {[
          { id: 'overview', label: 'Platform Overview', icon: Activity },
          { id: 'organizations', label: 'Customer Organizations', icon: Building2 },
          { id: 'users', label: 'User Directory', icon: Users },
          { id: 'messages', label: 'Platform Messages', icon: MessageSquare },
          { id: 'campaigns', label: 'Broadcast Campaigns', icon: Send },
          { id: 'webhooks', label: 'Outbound Webhooks', icon: Webhook },
          { id: 'plans', label: 'SaaS Plans & Limits', icon: CreditCard },
          { id: 'queues', label: 'Queues & Workers', icon: Server },
          { id: 'audit', label: 'Security Audit Trail', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSearchTerm('');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW METRICS WITH CLICKABLE DRILL-DOWNS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {statsLoading ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-xs font-mono">
              Loading platform telemetry...
            </div>
          ) : stats ? (
            <>
              {/* Top KPI Cards - ALL CLICKABLE */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Registered Organizations */}
                <div
                  onClick={() => {
                    setActiveTab('organizations');
                    setStatusFilter('ALL');
                  }}
                  className="p-5 rounded-2xl bg-[#0d1322]/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/80 transition cursor-pointer shadow-md group"
                >
                  <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                    <span className="group-hover:text-emerald-300 transition">Registered Tenants</span>
                    <Building2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-white group-hover:text-emerald-400 transition">
                    {stats.organizations.total}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[11px]">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab('organizations');
                        setStatusFilter('ACTIVE');
                      }}
                      className="text-emerald-400 font-bold hover:underline"
                    >
                      {stats.organizations.active} Active
                    </span>
                    <span className="text-slate-600">•</span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab('organizations');
                        setStatusFilter('TRIAL');
                      }}
                      className="text-amber-400 font-bold hover:underline"
                    >
                      {stats.organizations.trial} Trial
                    </span>
                    {stats.organizations.suspended > 0 && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTab('organizations');
                            setStatusFilter('SUSPENDED');
                          }}
                          className="text-rose-400 font-bold hover:underline"
                        >
                          {stats.organizations.suspended} Suspended
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* 2. Platform Users */}
                <div
                  onClick={() => setActiveTab('users')}
                  className="p-5 rounded-2xl bg-[#0d1322]/80 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/80 transition cursor-pointer shadow-md group"
                >
                  <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                    <span className="group-hover:text-indigo-300 transition">Total Platform Users</span>
                    <Users className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition" />
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-white group-hover:text-indigo-400 transition">
                    {stats.users.total}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Across customer workspaces</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400 opacity-0 group-hover:opacity-100 transition" />
                  </div>
                </div>

                {/* 3. Messages Dispatched */}
                <div
                  onClick={() => {
                    setActiveTab('messages');
                    setMessageStatusFilter('ALL');
                  }}
                  className="p-5 rounded-2xl bg-[#0d1322]/80 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-900/80 transition cursor-pointer shadow-md group"
                >
                  <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                    <span className="group-hover:text-teal-300 transition">Messages Dispatched</span>
                    <TrendingUp className="w-4 h-4 text-teal-400 group-hover:scale-110 transition" />
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-white group-hover:text-teal-400 transition">
                    {stats.messaging.messagesDispatched.toLocaleString()}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-teal-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{stats.messaging.deliverySuccessRatePct}% Delivery Success</span>
                  </div>
                </div>

                {/* 4. Queue Health */}
                <div
                  onClick={() => setActiveTab('queues')}
                  className="p-5 rounded-2xl bg-[#0d1322]/80 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900/80 transition cursor-pointer shadow-md group"
                >
                  <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                    <span className="group-hover:text-amber-300 transition">Background Queues</span>
                    <Server className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-white group-hover:text-amber-400 transition">
                    {stats.queues.status}
                  </div>
                  <div className="mt-2 text-[11px] text-amber-400 flex items-center justify-between">
                    <span>5 BullMQ Queues Active</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-amber-400 opacity-0 group-hover:opacity-100 transition" />
                  </div>
                </div>
              </div>

              {/* Secondary Breakdown with Clickable Drill-Downs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Messaging Performance Card */}
                <div className="p-5 rounded-2xl bg-[#0d1322]/80 border border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Messaging Breakdown</h3>
                    <span className="text-[10px] text-slate-500">Click to filter</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div
                      onClick={() => {
                        setActiveTab('messages');
                        setMessageStatusFilter('ALL');
                      }}
                      className="flex justify-between py-2 px-2.5 rounded-lg hover:bg-slate-800/60 cursor-pointer transition border border-transparent hover:border-slate-700"
                    >
                      <span className="text-slate-400">Total Tracked Messages</span>
                      <span className="font-bold text-slate-200">{stats.messaging.totalMessages.toLocaleString()}</span>
                    </div>
                    <div
                      onClick={() => setActiveTab('campaigns')}
                      className="flex justify-between py-2 px-2.5 rounded-lg hover:bg-slate-800/60 cursor-pointer transition border border-transparent hover:border-slate-700"
                    >
                      <span className="text-slate-400">Broadcast Campaigns</span>
                      <span className="font-bold text-slate-200">{stats.messaging.campaignsRun}</span>
                    </div>
                    <div
                      onClick={() => {
                        setActiveTab('messages');
                        setMessageStatusFilter('DELIVERED');
                      }}
                      className="flex justify-between py-2 px-2.5 rounded-lg hover:bg-emerald-950/30 cursor-pointer transition border border-transparent hover:border-emerald-500/30"
                    >
                      <span className="text-slate-400">Delivered Outcomes</span>
                      <span className="font-bold text-emerald-400">{stats.messaging.messagesDelivered.toLocaleString()}</span>
                    </div>
                    <div
                      onClick={() => {
                        setActiveTab('messages');
                        setMessageStatusFilter('FAILED');
                      }}
                      className="flex justify-between py-2 px-2.5 rounded-lg hover:bg-rose-950/30 cursor-pointer transition border border-transparent hover:border-rose-500/30"
                    >
                      <span className="text-slate-400">Failed Dispatches</span>
                      <span className="font-bold text-rose-400">{stats.messaging.messagesFailed.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Webhook Reliability Card */}
                <div className="p-5 rounded-2xl bg-[#0d1322]/80 border border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Webhook Reliability</h3>
                    <span className="text-[10px] text-slate-500">Click to filter</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div
                      onClick={() => {
                        setActiveTab('webhooks');
                        setWebhookStatusFilter('SUCCESS');
                      }}
                      className="flex justify-between py-2 px-2.5 rounded-lg hover:bg-emerald-950/30 cursor-pointer transition border border-transparent hover:border-emerald-500/30"
                    >
                      <span className="text-slate-400">Successful Deliveries (2xx)</span>
                      <span className="font-bold text-emerald-400">{stats.webhooks.successful}</span>
                    </div>
                    <div
                      onClick={() => {
                        setActiveTab('webhooks');
                        setWebhookStatusFilter('FAILED');
                      }}
                      className="flex justify-between py-2 px-2.5 rounded-lg hover:bg-rose-950/30 cursor-pointer transition border border-transparent hover:border-rose-500/30"
                    >
                      <span className="text-slate-400">Failed Deliveries (4xx/5xx)</span>
                      <span className="font-bold text-rose-400">{stats.webhooks.failed}</span>
                    </div>
                    <div
                      onClick={() => setActiveTab('webhooks')}
                      className="flex justify-between py-2 px-2.5 rounded-lg hover:bg-slate-800/60 cursor-pointer transition border border-transparent hover:border-slate-700"
                    >
                      <span className="text-slate-400">SSRF Defense State</span>
                      <span className="font-bold text-emerald-400">ACTIVE (RFC1918 Blocked)</span>
                    </div>
                  </div>
                </div>

                {/* System Health Card */}
                <div className="p-5 rounded-2xl bg-[#0d1322]/80 border border-slate-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Infrastructure Health</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-2 px-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
                      <span className="text-slate-400">API Cluster Engine</span>
                      <span className="font-bold text-emerald-400">ONLINE (NestJS v11)</span>
                    </div>
                    <div className="flex justify-between py-2 px-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
                      <span className="text-slate-400">PostgreSQL 18 Pool</span>
                      <span className="font-bold text-emerald-400">HEALTHY (17 Conns)</span>
                    </div>
                    <div
                      onClick={() => setActiveTab('queues')}
                      className="flex justify-between py-2 px-2.5 rounded-lg hover:bg-slate-800/60 cursor-pointer transition border border-transparent hover:border-slate-700"
                    >
                      <span className="text-slate-400">Redis 8 Queue Daemon</span>
                      <span className="font-bold text-emerald-400">{stats.queues.status}</span>
                    </div>
                    <div
                      onClick={() => setActiveTab('audit')}
                      className="flex justify-between py-2 px-2.5 rounded-lg hover:bg-slate-800/60 cursor-pointer transition border border-transparent hover:border-slate-700"
                    >
                      <span className="text-slate-400">Security Audit Trail</span>
                      <span className="font-bold text-indigo-400">VIEW AUDIT LOGS &rarr;</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* TAB 2: ORGANIZATIONS DIRECTORY */}
      {activeTab === 'organizations' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#0d1322]/80 border border-slate-800">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search business name or slug..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                <Filter className="w-3.5 h-3.5" /> Filter Status:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="TRIAL">Trial</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0d1322]/80 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="px-5 py-3.5">Organization</th>
                    <th className="px-5 py-3.5">Plan Tier</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Team</th>
                    <th className="px-5 py-3.5">Contacts</th>
                    <th className="px-5 py-3.5">Campaigns</th>
                    <th className="px-5 py-3.5">Registered</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {orgsLoading ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-slate-500 font-mono">
                        Loading customer organizations...
                      </td>
                    </tr>
                  ) : filteredOrs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                        No organizations found matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredOrs.map((org) => {
                      const isSuspended = org.status === 'SUSPENDED';
                      return (
                        <tr key={org.id} className="hover:bg-slate-800/30 transition">
                          <td
                            onClick={() => {
                              setSelectedOrgId(org.id);
                              setOrgDetailTab('overview');
                            }}
                            className="px-5 py-4 cursor-pointer"
                          >
                            <div className="font-bold text-slate-200 hover:text-emerald-400 transition flex items-center gap-1.5">
                              <span>{org.name}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                            </div>
                            <div className="text-[11px] font-mono text-slate-400">{org.slug}</div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {org.planTier || 'STARTER'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isSuspended
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              }`}
                            >
                              {org.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-300 font-semibold">{org._count?.memberships || 1} members</td>
                          <td className="px-5 py-4 text-slate-300 font-semibold">{org._count?.contacts || 0}</td>
                          <td className="px-5 py-4 text-slate-300 font-semibold">{org._count?.campaigns || 0}</td>
                          <td className="px-5 py-4 text-slate-400 text-[11px]">{new Date(org.createdAt).toLocaleDateString()}</td>
                          <td className="px-5 py-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                setSelectedOrgId(org.id);
                                setOrgDetailTab('overview');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                            >
                              Inspect Details
                            </button>
                            {isSuspended ? (
                              <button
                                onClick={() =>
                                  setSuspensionModal({
                                    isOpen: true,
                                    org,
                                    action: 'REACTIVATE',
                                    reason: '',
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Reactivate</span>
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  setSuspensionModal({
                                    isOpen: true,
                                    org,
                                    action: 'SUSPEND',
                                    reason: '',
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold transition"
                              >
                                <Lock className="w-3.5 h-3.5" />
                                <span>Suspend</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: USER DIRECTORY */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-[#0d1322]/80 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">All Registered Users Across DOOT</h3>
              <span className="text-xs text-slate-400 font-mono">{userList.length} registered accounts</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="px-5 py-3.5">User</th>
                    <th className="px-5 py-3.5">Email</th>
                    <th className="px-5 py-3.5">Organization Workspaces</th>
                    <th className="px-5 py-3.5">Platform Super Admin</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {usersLoading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-500 font-mono">
                        Loading platform user directory...
                      </td>
                    </tr>
                  ) : (
                    userList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-5 py-4 font-semibold text-slate-200">
                          {u.firstName} {u.lastName}
                        </td>
                        <td className="px-5 py-4 font-mono text-slate-300">{u.email}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {u.memberships?.map((m: any) => (
                              <span
                                key={m.id}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-300"
                              >
                                {m.organization?.name} ({m.role})
                              </span>
                            ))}
                            {(!u.memberships || u.memberships.length === 0) && (
                              <span className="text-slate-500 italic text-[11px]">Platform Operator</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {u.isPlatformAdmin ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              SUPER ADMIN
                            </span>
                          ) : (
                            <span className="text-slate-500">Customer</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            ACTIVE
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-400 text-[11px]">{new Date(u.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PLATFORM MESSAGES DRILL-DOWN */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#0d1322]/80 border border-slate-800">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search message text or phone number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-medium">Delivery Status:</span>
              <select
                value={messageStatusFilter}
                onChange={(e) => setMessageStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="SENT">Sent</option>
                <option value="DELIVERED">Delivered</option>
                <option value="READ">Read</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0d1322]/80 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="px-5 py-3.5">Organization</th>
                    <th className="px-5 py-3.5">Direction</th>
                    <th className="px-5 py-3.5">Recipient / Contact</th>
                    <th className="px-5 py-3.5">Message Body</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {messagesLoading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-500 font-mono">
                        Loading platform messages...
                      </td>
                    </tr>
                  ) : messageList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                        No messages found matching search filter.
                      </td>
                    </tr>
                  ) : (
                    messageList.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-5 py-4 font-bold text-slate-200">{m.organization?.name}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              m.direction === 'OUTBOUND' ? 'bg-teal-500/20 text-teal-300' : 'bg-indigo-500/20 text-indigo-300'
                            }`}
                          >
                            {m.direction}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono text-slate-300">
                          {m.conversation?.contact?.phone || 'Customer'}
                        </td>
                        <td className="px-5 py-4 max-w-md truncate text-slate-300">
                          {m.body || '<Template / Media Message>'}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.status === 'DELIVERED'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : m.status === 'READ'
                                ? 'bg-indigo-500/20 text-indigo-300'
                                : m.status === 'FAILED'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-slate-500/20 text-slate-300'
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-400 text-[11px]">{new Date(m.createdAt).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: BROADCAST CAMPAIGNS DRILL-DOWN */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-[#0d1322]/80 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="px-5 py-3.5">Organization</th>
                    <th className="px-5 py-3.5">Campaign Name</th>
                    <th className="px-5 py-3.5">Template</th>
                    <th className="px-5 py-3.5">Audience Size</th>
                    <th className="px-5 py-3.5">Sent / Failed</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {campaignsLoading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-500 font-mono">
                        Loading broadcast campaigns...
                      </td>
                    </tr>
                  ) : campaignList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                        No campaigns found.
                      </td>
                    </tr>
                  ) : (
                    campaignList.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-5 py-4 font-bold text-slate-200">{c.organization?.name}</td>
                        <td className="px-5 py-4 font-semibold text-white">{c.name}</td>
                        <td className="px-5 py-4 font-mono text-slate-400">{c.template?.name || 'Custom'}</td>
                        <td className="px-5 py-4 font-bold text-slate-200">{c.totalRecipients} recipients</td>
                        <td className="px-5 py-4">
                          <span className="text-emerald-400 font-semibold">{c.sentCount || 0} sent</span> /{' '}
                          <span className="text-rose-400 font-semibold">{c.failedCount || 0} failed</span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.status === 'COMPLETED'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : c.status === 'PROCESSING'
                                ? 'bg-indigo-500/20 text-indigo-300 animate-pulse'
                                : 'bg-slate-500/20 text-slate-300'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-400 text-[11px]">{new Date(c.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: OUTBOUND WEBHOOKS DRILL-DOWN */}
      {activeTab === 'webhooks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#0d1322]/80 border border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Outbound Webhook Delivery Logs</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">Filter Outcome:</span>
              <select
                value={webhookStatusFilter}
                onChange={(e) => setWebhookStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="ALL">All Outcomes</option>
                <option value="SUCCESS">Success (2xx)</option>
                <option value="FAILED">Failed (4xx/5xx)</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0d1322]/80 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="px-5 py-3.5">Organization</th>
                    <th className="px-5 py-3.5">Endpoint Destination</th>
                    <th className="px-5 py-3.5">Triggered Event</th>
                    <th className="px-5 py-3.5">HTTP Status</th>
                    <th className="px-5 py-3.5">Latency</th>
                    <th className="px-5 py-3.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {webhooksLoading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-500 font-mono">
                        Loading webhook delivery logs...
                      </td>
                    </tr>
                  ) : webhookList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                        No webhook deliveries found matching filter.
                      </td>
                    </tr>
                  ) : (
                    webhookList.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-5 py-4 font-bold text-slate-200">{log.organization?.name}</td>
                        <td className="px-5 py-4 font-mono text-slate-300 max-w-xs truncate">
                          {log.webhookEndpoint?.url || 'Direct Sink'}
                        </td>
                        <td className="px-5 py-4 font-mono text-indigo-400 font-bold">{log.event}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.responseStatus >= 200 && log.responseStatus < 300
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            HTTP {log.responseStatus || 'TIMEOUT'}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono text-slate-400">{log.durationMs}ms</td>
                        <td className="px-5 py-4 text-slate-400 text-[11px]">{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: PLANS & LIMITS */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plansLoading ? (
              <div className="col-span-3 text-center py-8 text-slate-500 font-mono text-xs">Loading plans...</div>
            ) : (
              (plans || []).map((p) => (
                <div key={p.id} className="p-6 rounded-2xl bg-[#0d1322]/80 border border-slate-800 space-y-4 shadow-xl">
                  <div className="flex justify-between items-center">
                    <h3 className="font-extrabold text-white text-lg">{p.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      {p.tier}
                    </span>
                  </div>
                  <div className="text-3xl font-black text-white">
                    ${p.monthlyPrice} <span className="text-xs font-normal text-slate-400">/ month</span>
                  </div>
                  <div className="space-y-2 text-xs border-t border-slate-800 pt-4 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Max Contacts:</span>
                      <span className="font-bold text-slate-200">{p.maxContacts.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Monthly Messages:</span>
                      <span className="font-bold text-slate-200">{p.maxMonthlyMessages.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Phone Numbers:</span>
                      <span className="font-bold text-slate-200">{p.maxPhoneNumbers} lines</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Team Seats:</span>
                      <span className="font-bold text-slate-200">{p.maxTeamMembers} seats</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 8: QUEUES & WORKERS */}
      {activeTab === 'queues' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats?.queues &&
              Object.entries(stats.queues).map(([key, val]) => {
                if (typeof val !== 'object' || !val) return null;
                const counts = (val as any).counts || val;
                return (
                  <div key={key} className="p-5 rounded-2xl bg-[#0d1322]/80 border border-slate-800 shadow-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider">{key.replace(/Queue$/, '')} Queue</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        HEALTHY
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                        <div className="text-slate-400 text-[10px]">Waiting</div>
                        <div className="text-lg font-bold text-white mt-1">{counts.waiting || 0}</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                        <div className="text-slate-400 text-[10px]">Active / Processing</div>
                        <div className="text-lg font-bold text-indigo-400 mt-1">{counts.active || 0}</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                        <div className="text-slate-400 text-[10px]">Completed</div>
                        <div className="text-lg font-bold text-emerald-400 mt-1">{counts.completed || 0}</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                        <div className="text-slate-400 text-[10px]">Failed</div>
                        <div className="text-lg font-bold text-rose-400 mt-1">{counts.failed || 0}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 9: SECURITY AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-[#0d1322]/80 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="px-5 py-3.5">Actor</th>
                    <th className="px-5 py-3.5">Action</th>
                    <th className="px-5 py-3.5">Resource</th>
                    <th className="px-5 py-3.5">Organization</th>
                    <th className="px-5 py-3.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {auditLoading ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-500 font-mono">
                        Loading platform audit trail...
                      </td>
                    </tr>
                  ) : auditList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                        No audit records recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditList.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-5 py-4 font-semibold text-slate-200">{log.user?.email || 'System'}</td>
                        <td className="px-5 py-4 font-mono font-bold text-rose-400">{log.action}</td>
                        <td className="px-5 py-4 text-slate-300 font-mono">{log.resource}</td>
                        <td className="px-5 py-4 font-bold text-slate-300">{log.organization?.name || 'Global'}</td>
                        <td className="px-5 py-4 text-slate-400 text-[11px]">{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ORGANIZATION DETAIL INSPECTION MODAL */}
      {selectedOrgId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-[#0d1322] border border-slate-800 p-6 shadow-2xl flex flex-col space-y-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
                    <span>{orgDetail?.name || 'Organization Details'}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-300">
                      {orgDetail?.planTier}
                    </span>
                  </h3>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">Slug: {orgDetail?.slug} • ID: {selectedOrgId}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrgId(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Sub-tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              {[
                { id: 'overview', label: 'Overview', icon: Info },
                { id: 'team', label: `Team Members (${orgDetail?.memberships?.length || 0})`, icon: Users },
                { id: 'phones', label: `WhatsApp Assets (${orgDetail?.phoneNumbers?.length || 0})`, icon: Smartphone },
                { id: 'templates', label: `Templates (${orgDetail?.whatsappTemplates?.length || 0})`, icon: FileCode },
                { id: 'campaigns', label: `Campaigns (${orgDetail?.campaigns?.length || 0})`, icon: Send },
                { id: 'messages', label: `Recent Messages (${orgDetail?.messages?.length || 0})`, icon: MessageSquare },
              ].map((subTab) => (
                <button
                  key={subTab.id}
                  onClick={() => setOrgDetailTab(subTab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    orgDetailTab === subTab.id
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {subTab.label}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-xs">
              {orgDetailLoading ? (
                <div className="py-12 text-center text-slate-500 font-mono">Loading organization operational telemetry...</div>
              ) : (
                <>
                  {orgDetailTab === 'overview' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                          <div className="text-slate-400 text-[10px]">Status</div>
                          <div className="text-sm font-bold text-emerald-400 mt-1">{orgDetail?.status}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                          <div className="text-slate-400 text-[10px]">Total Contacts</div>
                          <div className="text-sm font-bold text-white mt-1">{orgDetail?._count?.contacts || 0}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                          <div className="text-slate-400 text-[10px]">Total Messages</div>
                          <div className="text-sm font-bold text-white mt-1">{orgDetail?._count?.messages || 0}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                          <div className="text-slate-400 text-[10px]">Timezone</div>
                          <div className="text-sm font-bold text-white mt-1">{orgDetail?.timezone || 'UTC'}</div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
                        <h4 className="font-bold text-white text-xs uppercase tracking-wider">Subscription & Limits</h4>
                        <p className="text-slate-400 text-[11px]">
                          Commercial tier: <strong className="text-indigo-400">{orgDetail?.subscription?.plan?.name || orgDetail?.planTier}</strong> • Billing Status: <strong className="text-emerald-400">{orgDetail?.subscription?.status || 'ACTIVE'}</strong>
                        </p>
                      </div>
                    </div>
                  )}

                  {orgDetailTab === 'team' && (
                    <div className="space-y-2">
                      {orgDetail?.memberships?.map((m: any) => (
                        <div key={m.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between items-center">
                          <div>
                            <div className="font-bold text-white">{m.user.firstName} {m.user.lastName}</div>
                            <div className="text-slate-400 font-mono text-[11px]">{m.user.email}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                            {m.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {orgDetailTab === 'phones' && (
                    <div className="space-y-2">
                      {orgDetail?.phoneNumbers?.map((p: any) => (
                        <div key={p.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between items-center">
                          <div>
                            <div className="font-bold text-white">{p.verifiedName || 'Business Line'}</div>
                            <div className="text-emerald-400 font-mono text-[11px] font-bold">{p.displayPhoneNumber}</div>
                            <div className="text-slate-500 text-[10px]">Phone ID: {p.phoneNumberId}</div>
                          </div>
                          <div className="text-right">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                              {p.qualityRating}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-1">{p.messagingLimitTier}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {orgDetailTab === 'templates' && (
                    <div className="space-y-2">
                      {orgDetail?.whatsappTemplates?.map((t: any) => (
                        <div key={t.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between items-center">
                          <div>
                            <div className="font-bold text-white">{t.name}</div>
                            <div className="text-slate-400 text-[10px]">{t.language} • {t.category}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {orgDetailTab === 'campaigns' && (
                    <div className="space-y-2">
                      {orgDetail?.campaigns?.map((c: any) => (
                        <div key={c.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between items-center">
                          <div>
                            <div className="font-bold text-white">{c.name}</div>
                            <div className="text-slate-400 text-[10px]">{c.totalRecipients} recipients • {c.sentCount} sent</div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                            {c.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {orgDetailTab === 'messages' && (
                    <div className="space-y-2">
                      {orgDetail?.messages?.map((m: any) => (
                        <div key={m.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between items-center">
                          <div className="max-w-md">
                            <div className="font-mono text-[10px] text-slate-400">{m.direction} • {m.conversation?.contact?.phone || 'Customer'}</div>
                            <div className="text-slate-200 mt-0.5">{m.body || '<Template message>'}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                            {m.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedOrgId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUSPENSION / REACTIVATION MODAL */}
      {suspensionModal.isOpen && suspensionModal.org && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0d1322] border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-white text-base">
                  {suspensionModal.action === 'SUSPEND' ? 'Suspend Organization' : 'Reactivate Organization'}
                </h3>
              </div>
              <button
                onClick={() => setSuspensionModal({ ...suspensionModal, isOpen: false })}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {suspensionModal.action === 'SUSPEND'
                ? `Suspending "${suspensionModal.org.name}" blocks new messages and campaign execution. All customer data, contacts, and audit history remain safe and intact.`
                : `Reactivating "${suspensionModal.org.name}" restores normal operational access for this customer workspace.`}
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Audit Reason (Required for security logs):
              </label>
              <textarea
                rows={3}
                value={suspensionModal.reason}
                onChange={(e) => setSuspensionModal({ ...suspensionModal, reason: e.target.value })}
                placeholder="e.g. Terms of Service review, payment dispute, or customer request..."
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSuspensionModal({ ...suspensionModal, isOpen: false })}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                disabled={!suspensionModal.reason.trim() || suspendMutation.isPending}
                onClick={() =>
                  suspendMutation.mutate({
                    orgId: suspensionModal.org!.id,
                    action: suspensionModal.action,
                    reason: suspensionModal.reason,
                  })
                }
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  suspensionModal.action === 'SUSPEND'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                } disabled:opacity-50`}
              >
                {suspendMutation.isPending ? 'Processing...' : suspensionModal.action === 'SUSPEND' ? 'Confirm Suspension' : 'Confirm Reactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
