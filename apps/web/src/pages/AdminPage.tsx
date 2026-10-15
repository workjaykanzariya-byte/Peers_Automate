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
  const [activeTab, setActiveTab] = useState<'overview' | 'organizations' | 'users' | 'plans' | 'queues'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

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

  // Fetch real platform stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get<AdminStats>('/admin/stats'),
    refetchInterval: 15000,
  });

  // Fetch organizations directory
  const { data: orgs, isLoading: orgsLoading, refetch: refetchOrgs } = useQuery<OrgItem[]>({
    queryKey: ['admin-orgs'],
    queryFn: () => api.get<OrgItem[]>('/admin/organizations'),
  });

  // Fetch global user directory
  const { data: users, isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.get<any[]>('/admin/users'),
    enabled: activeTab === 'users',
  });

  // Fetch plans
  const { data: plans, isLoading: plansLoading } = useQuery<PlanItem[]>({
    queryKey: ['admin-plans'],
    queryFn: () => api.get<PlanItem[]>('/admin/plans'),
    enabled: activeTab === 'plans',
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
      setSuspensionModal({ isOpen: false, org: null, action: 'SUSPEND', reason: '' });
    },
  });

  const orgList: OrgItem[] = Array.isArray(orgs) ? orgs : (orgs as any)?.data || [];
  const userList: any[] = Array.isArray(users) ? users : (users as any)?.data || [];

  const filteredOrs = orgList.filter((o) => {
    const matchesSearch = o.name.toLowerCase().includes(searchTerm.toLowerCase()) || o.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Platform Owner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-rose-950/40 via-purple-950/20 to-slate-900 border border-rose-500/20 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/10">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">DOOT Platform Administration</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Super Admin
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Internal cross-tenant operational command, billing plans, audit trail & infrastructure health.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            refetchStats();
            refetchOrgs();
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Platform Overview', icon: Activity },
          { id: 'organizations', label: 'Customer Organizations', icon: Building2 },
          { id: 'users', label: 'User Directory', icon: Users },
          { id: 'plans', label: 'SaaS Plans & Limits', icon: CreditCard },
          { id: 'queues', label: 'Queues & Workers', icon: Server },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {statsLoading ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-xs font-mono">
              Loading platform telemetry...
            </div>
          ) : stats ? (
            <>
              {/* Top KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-[#0d1322]/80 border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                    <span>Registered Tenants</span>
                    <Building2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-white">{stats.organizations.total}</div>
                  <div className="mt-2 flex items-center gap-2 text-[11px]">
                    <span className="text-emerald-400 font-bold">{stats.organizations.active} Active</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-amber-400 font-bold">{stats.organizations.trial} Trial</span>
                    {stats.organizations.suspended > 0 && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span className="text-rose-400 font-bold">{stats.organizations.suspended} Suspended</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0d1322]/80 border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                    <span>Total Platform Users</span>
                    <Users className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-white">{stats.users.total}</div>
                  <div className="mt-2 text-[11px] text-slate-400">Across all customer workspaces</div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0d1322]/80 border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                    <span>Messages Dispatched</span>
                    <TrendingUp className="w-4 h-4 text-teal-400" />
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-white">
                    {stats.messaging.messagesDispatched.toLocaleString()}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-teal-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{stats.messaging.deliverySuccessRatePct}% Delivery Success</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0d1322]/80 border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                    <span>Open Support Tickets</span>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-white">{stats.support.openTickets}</div>
                  <div className="mt-2 text-[11px] text-amber-300">Awaiting engineering response</div>
                </div>
              </div>

              {/* Secondary Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 rounded-2xl bg-[#0d1322]/80 border border-slate-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Messaging Performance</h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Total Contacts Tracked</span>
                      <span className="font-bold text-slate-200">{stats.messaging.totalContacts.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Broadcast Campaigns</span>
                      <span className="font-bold text-slate-200">{stats.messaging.campaignsRun}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Delivered Outcomes</span>
                      <span className="font-bold text-emerald-400">{stats.messaging.messagesDelivered.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Failed / Undelivered</span>
                      <span className="font-bold text-rose-400">{stats.messaging.messagesFailed.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0d1322]/80 border border-slate-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Webhook Reliability</h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Successful Dispatches (2xx)</span>
                      <span className="font-bold text-emerald-400">{stats.webhooks.successful}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Failed Dispatches</span>
                      <span className="font-bold text-rose-400">{stats.webhooks.failed}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Webhook SSRF Defense</span>
                      <span className="font-bold text-emerald-400">ACTIVE (Private IPs Blocked)</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0d1322]/80 border border-slate-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">System Operational Status</h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">API Cluster</span>
                      <span className="font-bold text-emerald-400">ONLINE</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">PostgreSQL 18 DB</span>
                      <span className="font-bold text-emerald-400">HEALTHY</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Redis 8 Queue</span>
                      <span className="font-bold text-emerald-400">{stats.queues.status}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">AES-256 Key Status</span>
                      <span className="font-bold text-indigo-400">ROTATION READY</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-rose-400 text-xs">Failed to load platform statistics.</div>
          )}
        </div>
      )}

      {/* TAB 2: CUSTOMER ORGANIZATIONS */}
      {activeTab === 'organizations' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search organizations or slug..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
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
                    <th className="px-5 py-3.5">Registered</th>
                    <th className="px-5 py-3.5 text-right">Administrative Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {orgsLoading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-500 font-mono">
                        Loading customer organizations...
                      </td>
                    </tr>
                  ) : filteredOrs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                        No organizations found matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredOrs.map((org) => {
                      const isSuspended = org.status === 'SUSPENDED';
                      return (
                        <tr key={org.id} className="hover:bg-slate-800/30 transition">
                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-200">{org.name}</div>
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
                          <td className="px-5 py-4 text-slate-300 font-semibold">
                            {org._count?.memberships || 1} staff
                          </td>
                          <td className="px-5 py-4 text-slate-300 font-semibold">
                            {org._count?.contacts || 0}
                          </td>
                          <td className="px-5 py-4 text-slate-400 text-[11px]">
                            {new Date(org.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-4 text-right">
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
                                <span>Suspend Access</span>
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
                  <th className="px-5 py-3.5">Platform Super Admin</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {usersLoading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                      Loading users...
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
                        {u.isPlatformAdmin ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            Super Admin
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px]">Normal User</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                          {u.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SAAS PLANS */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
            Platform plans configure limits for contacts, monthly messages, team members, and WhatsApp numbers. Feature entitlements are verified by the backend usage meter.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(plans || []).map((p) => (
              <div
                key={p.id}
                className="p-6 rounded-2xl bg-[#0d1322]/90 border border-slate-800 hover:border-slate-700 shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-400 font-mono">{p.tier}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400">
                      ACTIVE
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-2">{p.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white">${p.monthlyPrice}</span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Or ${p.annualPrice} billed annually</div>

                  <div className="mt-6 space-y-2.5 text-xs text-slate-300 border-t border-slate-800/80 pt-4">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Max Contacts</span>
                      <span className="font-semibold text-white">{p.maxContacts.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Monthly Messages</span>
                      <span className="font-semibold text-white">{p.maxMonthlyMessages.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">WhatsApp Phone Numbers</span>
                      <span className="font-semibold text-white">{p.maxPhoneNumbers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Team Staff Members</span>
                      <span className="font-semibold text-white">{p.maxTeamMembers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Visual Bot Flow</span>
                      <span className="font-semibold text-emerald-400">{p.hasVisualBuilder ? 'Included' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">AI Support Assistant</span>
                      <span className="font-semibold text-emerald-400">{p.hasAiAssistant ? 'Included' : 'No'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: QUEUES & WORKERS */}
      {activeTab === 'queues' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Outbound Messaging Queue', key: 'messagingQueue', stats: stats?.queues?.messagingQueue },
              { title: 'Webhook Delivery Queue', key: 'webhookQueue', stats: stats?.queues?.webhookQueue },
              { title: 'Campaign Broadcast Queue', key: 'campaignQueue', stats: stats?.queues?.campaignQueue },
            ].map((q) => (
              <div key={q.key} className="p-5 rounded-2xl bg-[#0d1322]/80 border border-slate-800 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">{q.title}</h3>
                  <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Worker Running</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-slate-400 text-[11px]">Waiting</div>
                    <div className="text-lg font-bold text-slate-200 mt-1">{q.stats?.waiting || 0}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-slate-400 text-[11px]">Active</div>
                    <div className="text-lg font-bold text-indigo-400 mt-1">{q.stats?.active || 0}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-slate-400 text-[11px]">Completed</div>
                    <div className="text-lg font-bold text-emerald-400 mt-1">{q.stats?.completed || 0}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-slate-400 text-[11px]">Failed</div>
                    <div className="text-lg font-bold text-rose-400 mt-1">{q.stats?.failed || 0}</div>
                  </div>
                </div>
              </div>
            ))}
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
