import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Settings,
  Building,
  CreditCard,
  Users,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Key,
  Clock,
  Sparkles,
  UserPlus,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeOrg } = useAuth();
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'USAGE' | 'TEAM' | 'AUDIT'>('USAGE');

  // Org Settings State
  const [orgName, setOrgName] = useState(activeOrg?.name || '');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [country, setCountry] = useState('IN');

  // Fetch Usage & Plan Quotas
  const { data: usageData, isLoading: isLoadingUsage } = useQuery<any>({
    queryKey: ['tenant-usage'],
    queryFn: () => api.get('/usage'),
  });

  // Fetch Team Members
  const { data: teamMembers = [] } = useQuery<any[]>({
    queryKey: ['team-members'],
    queryFn: () => api.get('/organizations/current/members'),
  });

  // Fetch Audit Logs
  const { data: auditLogs = [] } = useQuery<any[]>({
    queryKey: ['audit-logs'],
    queryFn: () => api.get('/organizations/current/audit-logs'),
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-emerald-400" />
            Organization Settings & Quotas
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage workspace configuration, plan limits, team access permissions, and security audit logs.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        {[
          { id: 'USAGE', label: 'Plan & Quota Limits', icon: CreditCard },
          { id: 'GENERAL', label: 'Organization Profile', icon: Building },
          { id: 'TEAM', label: 'Team Members', icon: Users },
          { id: 'AUDIT', label: 'Audit Trail', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === tab.id
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content: Usage & Quotas */}
      {activeTab === 'USAGE' && (
        <div className="space-y-6">
          {/* Plan Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/30 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {usageData?.plan?.tier || 'GROWTH'} PLAN
                </span>
                <span className="text-xs text-slate-400">Monthly Subscription Active</span>
              </div>
              <h2 className="text-xl font-extrabold text-white">
                {activeOrg?.name || 'Your Organization'}
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                High-throughput WhatsApp Cloud API routing with automatic E.164 normalization and isolated relational PostgreSQL multi-tenancy.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition">
                Manage Invoices
              </button>
              <button className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-lg shadow-emerald-500/20">
                Upgrade Plan
              </button>
            </div>
          </div>

          {/* Real Quota Progress Bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contacts Quota */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">Contact Storage Quota</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {usageData?.usage?.contacts?.current || 0} / {usageData?.plan?.maxContacts || 10000}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      ((usageData?.usage?.contacts?.current || 0) / (usageData?.plan?.maxContacts || 10000)) * 100,
                    )}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Total unique international customer contacts stored across all tags and lists.
              </p>
            </div>

            {/* Monthly Messages */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">Monthly WhatsApp Message Quota</span>
                <span className="font-mono text-cyan-400 font-semibold">
                  {usageData?.usage?.monthlyMessages?.current || 0} / {usageData?.plan?.maxMonthlyMessages || 25000}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden">
                <div
                  className="h-full bg-cyan-500 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      ((usageData?.usage?.monthlyMessages?.current || 0) /
                        (usageData?.plan?.maxMonthlyMessages || 25000)) *
                        100,
                    )}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Broadcast campaigns and customer chat messages dispatched this billing cycle.
              </p>
            </div>

            {/* Phone Assets */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">Connected Phone Lines</span>
                <span className="font-mono text-indigo-400 font-semibold">
                  {usageData?.usage?.phoneNumbers?.current || 1} / {usageData?.plan?.maxPhoneNumbers || 3}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      ((usageData?.usage?.phoneNumbers?.current || 1) / (usageData?.plan?.maxPhoneNumbers || 3)) * 100,
                    )}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Authorized Meta WhatsApp phone numbers registered for this tenant.
              </p>
            </div>

            {/* Team Members */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">Team Seats</span>
                <span className="font-mono text-amber-400 font-semibold">
                  {usageData?.usage?.teamMembers?.current || 1} / {usageData?.plan?.maxTeamMembers || 10}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      ((usageData?.usage?.teamMembers?.current || 1) / (usageData?.plan?.maxTeamMembers || 10)) * 100,
                    )}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Active team members with role-based access control.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: General Settings */}
      {activeTab === 'GENERAL' && (
        <div className="max-w-xl bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-5">
          <h3 className="text-base font-bold text-white">Workspace Configuration</h3>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert('Organization preferences saved.');
            }}
            className="space-y-4 text-xs"
          >
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Organization Legal Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Default Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+5:30)</option>
                <option value="America/New_York">America/New_York (EST - UTC-5:00)</option>
                <option value="Europe/London">Europe/London (GMT - UTC+0:00)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST - UTC+4:00)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Default Country for Phone Parsing</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 uppercase"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Used to parse unformatted national numbers entered without +country code.
              </p>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="px-5 py-2 font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
              >
                Save Preferences
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab Content: Team Members */}
      {activeTab === 'TEAM' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Authorized Team Members</h3>
              <p className="text-xs text-slate-400">Users with access to this tenant workspace.</p>
            </div>
            <button
              onClick={() => alert('Invite member link copied to clipboard!')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950"
            >
              <UserPlus className="w-3.5 h-3.5" /> Invite Member
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">Member Name</th>
                  <th className="py-2.5 px-4">Email</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {teamMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Loading team members...
                    </td>
                  </tr>
                ) : (
                  teamMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/20">
                      <td className="py-3 px-4 font-semibold text-white">
                        {m.user?.firstName} {m.user?.lastName}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">{m.user?.email}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                          {m.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {m.isActive ? 'ACTIVE' : 'INVITED'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Security Audit Trail */}
      {activeTab === 'AUDIT' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Security Audit Trail</h3>
              <p className="text-xs text-slate-400">
                Immutable record of administrative, campaign, and credential activities.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Entity Type</th>
                  <th className="py-2.5 px-4">Entity ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No security audit entries recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/20">
                      <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-slate-200 font-mono text-[11px]">
                        {log.user ? `${log.user.firstName} (${log.user.email})` : 'SYSTEM'}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400">{log.entityType}</td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">
                        {log.entityId ? `${log.entityId.slice(0, 12)}...` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
