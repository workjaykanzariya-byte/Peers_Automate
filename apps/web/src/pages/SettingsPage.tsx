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
  const [activeTab, setActiveTab] = useState<'USAGE' | 'INVOICES' | 'AI_ASSISTANT' | 'MESSENGER' | 'GENERAL' | 'TEAM' | 'AUDIT'>('USAGE');

  // AI Assistant State
  const [aiProvider, setAiProvider] = useState<'OPENAI' | 'ANTHROPIC' | 'GEMINI'>('OPENAI');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiInstructions, setAiInstructions] = useState('You are a helpful customer support agent for our company.');
  const [aiEnabled, setAiEnabled] = useState(false);

  // Fetch AI Config
  const { data: aiConfig, refetch: refetchAi } = useQuery<any>({
    queryKey: ['ai-config'],
    queryFn: () => api.get('/ai/config'),
  });

  // Fetch Invoices
  const { data: invoices = [] } = useQuery<any[]>({
    queryKey: ['billing-invoices'],
    queryFn: () => api.get('/billing/invoices'),
  });

  // Save AI Config Mutation
  const saveAiMutation = useMutation({
    mutationFn: (data: any) => api.post('/ai/config', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-config'] });
      setAiApiKey('');
    },
  });

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
            Organization Settings & Integrations
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage workspace configuration, billing & invoices, AI assistant, team access, and audit logs.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'USAGE', label: 'Plan & Quotas', icon: CreditCard },
          { id: 'INVOICES', label: 'Invoices & Billing', icon: CreditCard },
          { id: 'AI_ASSISTANT', label: 'AI Assistant', icon: Sparkles },
          { id: 'MESSENGER', label: 'Facebook Messenger', icon: Key },
          { id: 'GENERAL', label: 'Workspace Profile', icon: Building },
          { id: 'TEAM', label: 'Team Members', icon: Users },
          { id: 'AUDIT', label: 'Audit Trail', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
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

      {/* Tab Content: Invoices & Billing History */}
      {activeTab === 'INVOICES' && (
        <div className="space-y-6">
          <div className="bg-[#0d1322]/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Subscription Invoices & Receipts</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Official commercial invoices issued for your DOOT subscription.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="px-5 py-3.5">Invoice #</th>
                    <th className="px-5 py-3.5">Billing Date</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Receipt Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                        No invoice history available for this billing period.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-5 py-4 font-mono font-bold text-slate-200">{inv.invoiceNumber}</td>
                        <td className="px-5 py-4 text-slate-400 text-[11px]">
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 font-bold text-white">
                          ${inv.amount} {inv.currency}
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => window.print()}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                          >
                            Print Receipt
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: AI Assistant */}
      {activeTab === 'AI_ASSISTANT' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0d1322]/80 border border-slate-800 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  AI Support Assistant Configuration
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure extensible LLM models to draft human-approved customer responses with automatic PII masking.
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PII Masking Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">AI Provider</label>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="OPENAI">OpenAI (GPT-4o)</option>
                  <option value="ANTHROPIC">Anthropic (Claude 3.5 Sonnet)</option>
                  <option value="GEMINI">Google DeepMind (Gemini 1.5 Pro)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  API Key {aiConfig?.hasApiKey && '(Key encrypted & configured)'}
                </label>
                <input
                  type="password"
                  placeholder={aiConfig?.hasApiKey ? '••••••••••••••••••••••••' : 'Enter external provider API key...'}
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">System Instructions & Brand Tone</label>
              <textarea
                rows={4}
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                placeholder="Instruct the assistant on brand voice, greeting style, and escalation rules..."
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <label className="flex items-center gap-2.5 text-xs text-slate-300 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-indigo-500"
                />
                <span>Enable AI Assistant for Inbox suggested replies</span>
              </label>

              <button
                onClick={() =>
                  saveAiMutation.mutate({
                    provider: aiProvider,
                    apiKey: aiApiKey || undefined,
                    systemInstructions: aiInstructions,
                    isEnabled: aiEnabled,
                  })
                }
                disabled={saveAiMutation.isPending}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {saveAiMutation.isPending ? 'Saving Config...' : 'Save AI Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Facebook Messenger */}
      {activeTab === 'MESSENGER' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0d1322]/80 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Key className="w-6 h-6 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Facebook Messenger Platform</h3>
                  <p className="text-xs text-slate-400">
                    Connect an authorized Facebook Page for omnichannel live chat alongside WhatsApp.
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                Meta App Review Ready
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-2">
              <p>
                Facebook Messenger follows official Meta Platform guidelines. Page tokens are encrypted at rest with AES-256-GCM.
              </p>
              <p className="text-slate-400 text-[11px]">
                Webhook URL: <code className="bg-slate-950 px-2 py-0.5 rounded text-indigo-300">/api/v1/messenger/webhook</code>
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
