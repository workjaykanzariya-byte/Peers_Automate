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
  Webhook,
  Activity,
  Trash2,
  Edit3,
  Plus,
  Copy,
  ExternalLink,
  Globe,
  Check,
  RefreshCw,
  X,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeOrg } = useAuth();
  const [activeTab, setActiveTab] = useState<'USAGE' | 'WEBHOOKS' | 'INVOICES' | 'AI_ASSISTANT' | 'MESSENGER' | 'GENERAL' | 'TEAM' | 'AUDIT'>('USAGE');

  // AI Assistant State
  const [aiProvider, setAiProvider] = useState<'OPENAI' | 'ANTHROPIC' | 'GEMINI'>('OPENAI');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiInstructions, setAiInstructions] = useState('You are a helpful customer support agent for our company.');
  const [aiEnabled, setAiEnabled] = useState(false);

  // Fetch AI Config
  const { data: aiConfig } = useQuery<any>({
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
      alert('AI Configuration saved successfully!');
    },
  });

  // Org Settings State & Query
  const [orgName, setOrgName] = useState(activeOrg?.name || '');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [country, setCountry] = useState('IN');
  const [generalNotice, setGeneralNotice] = useState<{ success: boolean; message: string } | null>(null);

  const { data: currentOrg } = useQuery<any>({
    queryKey: ['current-organization'],
    queryFn: async () => {
      const res = await api.get<any>('/organizations/current');
      if (res?.name) setOrgName(res.name);
      if (res?.timezone) setTimezone(res.timezone);
      if (res?.settings?.country) setCountry(res.settings.country);
      return res;
    },
  });

  // Save General Org Settings Mutation
  const updateOrgSettingsMutation = useMutation({
    mutationFn: (data: any) => api.patch('/organizations/current', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-organization'] });
      setGeneralNotice({ success: true, message: 'Organization preferences saved successfully!' });
      setTimeout(() => setGeneralNotice(null), 4000);
    },
    onError: (err: any) => {
      setGeneralNotice({ success: false, message: `Failed to save preferences: ${err.message || 'Error'}` });
      setTimeout(() => setGeneralNotice(null), 6000);
    },
  });

  // Webhooks State
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [webhookNotice, setWebhookNotice] = useState<{ success: boolean; message: string } | null>(null);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);

  // Create Webhook State
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookSecret, setNewWebhookSecret] = useState('doot_dynamic_verify_token_2026');
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(['message.received', 'message.status_update']);

  // Edit Webhook State
  const [editingWebhook, setEditingWebhook] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
    url: string;
    secret: string;
    events: string[];
    isActive: boolean;
  } | null>(null);

  // Fetch Webhook Endpoints
  const { data: webhooks = [], isLoading: webhooksLoading, refetch: refetchWebhooks } = useQuery<any[]>({
    queryKey: ['tenant-webhooks'],
    queryFn: () => api.get<any[]>('/webhooks/endpoints'),
    enabled: activeTab === 'WEBHOOKS',
  });

  // Create Webhook Mutation
  const createWebhookMutation = useMutation({
    mutationFn: (payload: any) => api.post('/webhooks/endpoints', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-webhooks'] });
      setShowCreateWebhook(false);
      setNewWebhookName('');
      setNewWebhookUrl('');
      setNewWebhookSecret('doot_dynamic_verify_token_2026');
      setNewWebhookEvents(['message.received', 'message.status_update']);
      setWebhookNotice({ success: true, message: 'Outbound webhook destination registered successfully!' });
      setTimeout(() => setWebhookNotice(null), 4000);
    },
    onError: (err: any) => {
      setWebhookNotice({ success: false, message: `Failed to register webhook: ${err.message}` });
      setTimeout(() => setWebhookNotice(null), 6000);
    },
  });

  // Update Webhook Mutation
  const updateWebhookMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/webhooks/endpoints/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-webhooks'] });
      setEditingWebhook(null);
      setWebhookNotice({ success: true, message: 'Webhook destination updated successfully!' });
      setTimeout(() => setWebhookNotice(null), 4000);
    },
    onError: (err: any) => {
      setWebhookNotice({ success: false, message: `Failed to update webhook: ${err.message}` });
      setTimeout(() => setWebhookNotice(null), 6000);
    },
  });

  // Delete Webhook Mutation
  const deleteWebhookMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/webhooks/endpoints/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-webhooks'] });
      setWebhookNotice({ success: true, message: 'Webhook endpoint removed.' });
      setTimeout(() => setWebhookNotice(null), 3000);
    },
    onError: (err: any) => {
      setWebhookNotice({ success: false, message: `Failed to delete webhook: ${err.message}` });
      setTimeout(() => setWebhookNotice(null), 6000);
    },
  });

  // Test Webhook Delivery Mutation
  const testWebhookMutation = useMutation({
    mutationFn: (id: string) => api.post(`/webhooks/endpoints/${id}/test`),
    onSuccess: (data: any) => {
      setTestingWebhookId(null);
      const isSuccess = data?.responseStatus >= 200 && data?.responseStatus < 300;
      setWebhookNotice({
        success: isSuccess,
        message: `HTTP ${data?.responseStatus || 'Error'} (${data?.durationMs || 0}ms): ${data?.errorMessage || 'Delivery verified to destination server!'}`,
      });
      queryClient.invalidateQueries({ queryKey: ['tenant-webhooks'] });
      setTimeout(() => setWebhookNotice(null), 6000);
    },
    onError: (err: any) => {
      setTestingWebhookId(null);
      setWebhookNotice({ success: false, message: `Delivery test failed: ${err.message}` });
      setTimeout(() => setWebhookNotice(null), 6000);
    },
  });

  // Fetch Usage & Plan Quotas
  const { data: usageData } = useQuery<any>({
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

  // Inbound Webhook values
  const metaInboundUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'https://amiee-daimonic-shantelle.ngrok-free.dev/api/v1/meta/webhook'
    : `${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/meta/webhook`;
  const metaVerifyToken = 'unity_whatsapp_webhook_verify_token_2026';

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Organization Settings & Integrations
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage workspace configuration, webhooks, billing & invoices, AI assistant, team access, and audit logs.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'USAGE', label: 'Plan & Quotas', icon: CreditCard },
          { id: 'WEBHOOKS', label: 'Webhooks & Relays', icon: Webhook },
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
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
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
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-emerald-50 via-white to-indigo-50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-indigo-950/40 border border-emerald-200 dark:border-emerald-500/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40">
                  {usageData?.plan?.tier || activeOrg?.planTier || 'GROWTH'} PLAN
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Monthly Subscription Active</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                {activeOrg?.name || currentOrg?.name || 'Your Organization'}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-md">
                High-throughput WhatsApp Cloud API routing with automatic E.164 normalization and isolated relational PostgreSQL multi-tenancy.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('INVOICES')}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs transition cursor-pointer"
              >
                Manage Invoices
              </button>
              <button
                onClick={() => alert('Plan upgrade request submitted. Our team will contact you.')}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm cursor-pointer"
              >
                Upgrade Plan
              </button>
            </div>
          </div>

          {/* Real Quota Progress Bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contacts Quota */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">Contact Storage Quota</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {usageData?.usage?.contacts?.current || 0} / {usageData?.plan?.maxContacts || 10000}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-950 overflow-hidden">
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
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Total unique international customer contacts stored across all tags and lists.
              </p>
            </div>

            {/* Monthly Messages */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">Monthly WhatsApp Message Quota</span>
                <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                  {usageData?.usage?.monthlyMessages?.current || 0} / {usageData?.plan?.maxMonthlyMessages || 25000}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-950 overflow-hidden">
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
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Broadcast campaigns and customer chat messages dispatched this billing cycle.
              </p>
            </div>

            {/* Phone Assets */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">Connected Phone Lines</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  {usageData?.usage?.phoneNumbers?.current || 1} / {usageData?.plan?.maxPhoneNumbers || 3}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-950 overflow-hidden">
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
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Authorized Meta WhatsApp phone numbers registered for this tenant.
              </p>
            </div>

            {/* Team Members */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">Team Seats</span>
                <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                  {usageData?.usage?.teamMembers?.current || 1} / {usageData?.plan?.maxTeamMembers || 10}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-950 overflow-hidden">
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
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Active team members with role-based access control.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Webhooks & Relays */}
      {activeTab === 'WEBHOOKS' && (
        <div className="space-y-6">
          {/* Notification Alert */}
          {webhookNotice && (
            <div
              className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 ${
                webhookNotice.success
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {webhookNotice.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span>{webhookNotice.message}</span>
            </div>
          )}

          {/* Section 1: Inbound Meta WhatsApp Cloud API Webhook */}
          <div className="bg-white dark:bg-[#0d1322]/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Meta WhatsApp Inbound Webhook
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                      LIVE INBOUND
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Meta delivers incoming WhatsApp messages, user replies, read receipts (blue ticks), and template approvals to this endpoint.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Callback URL (Meta App Dashboard)
                  </label>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(metaInboundUrl, 'META_URL')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
                  >
                    {copiedKey === 'META_URL' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'META_URL' ? 'Copied!' : 'Copy URL'}</span>
                  </button>
                </div>
                <div className="font-mono text-xs text-slate-800 dark:text-slate-200 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 break-all select-all">
                  {metaInboundUrl}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Verification Token (Verify Token)
                  </label>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(metaVerifyToken, 'META_TOKEN')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
                  >
                    {copiedKey === 'META_TOKEN' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'META_TOKEN' ? 'Copied!' : 'Copy Token'}</span>
                  </button>
                </div>
                <div className="font-mono text-xs text-slate-800 dark:text-slate-200 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 select-all">
                  {metaVerifyToken}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200">
              <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Meta App Configuration Guide:</strong> In your Meta Developers Portal, go to <strong>WhatsApp &gt; Configuration</strong>, paste the Callback URL and Verify Token above, then click <em>Verify and Save</em>. Enable Webhook Field subscriptions for: <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded font-mono">messages</code>, <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded font-mono">message_deliveries</code>, <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded font-mono">message_reads</code>, and <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded font-mono">message_template_status_update</code>.
              </div>
            </div>
          </div>

          {/* Section 2: Outbound Webhooks & Dynamic External Relays */}
          <div className="bg-white dark:bg-[#0d1322]/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Webhook className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Outbound Webhooks &amp; Event Relays
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Forward incoming customer messages, delivery receipts, and template approvals to your own CRM, ERP, or custom backend.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => refetchWebhooks()}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                  title="Refresh webhooks list"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateWebhook(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register Webhook</span>
                </button>
              </div>
            </div>

            {/* Outbound Webhook List */}
            {webhooksLoading ? (
              <div className="py-8 text-center text-slate-400 font-mono text-xs">Loading webhook configurations...</div>
            ) : webhooks.length === 0 ? (
              <div className="py-10 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <Webhook className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-xs">No outbound webhooks registered</h4>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Register a webhook destination to automatically relay customer chat replies and message delivery receipts to your server.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateWebhook(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30 text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register First Webhook</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {webhooks.map((ep: any) => (
                  <div
                    key={ep.id}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between md:items-center gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">{ep.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            ep.isActive !== false
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                          }`}
                        >
                          {ep.isActive !== false ? 'ACTIVE' : 'PAUSED'}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {ep._count?.deliveryLogs || 0} deliveries
                        </span>
                      </div>

                      <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 break-all select-all">
                        {ep.url}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                        <span>Events: <strong className="text-slate-700 dark:text-slate-300">{ep.events?.join(', ')}</strong></span>
                        {ep.secret && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[10px]">
                              Token: {ep.secret.length > 20 ? `${ep.secret.slice(0, 10)}...` : ep.secret}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(ep.secret, `RELAY_${ep.id}`)}
                              className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer text-[10px] inline-flex items-center gap-0.5 font-medium"
                            >
                              <Copy className="w-2.5 h-2.5" />
                              <span>{copiedKey === `RELAY_${ep.id}` ? 'Copied!' : 'Copy'}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingWebhook({
                            isOpen: true,
                            id: ep.id,
                            name: ep.name,
                            url: ep.url,
                            secret: ep.secret || '',
                            events: ep.events || ['message.received', 'message.status_update'],
                            isActive: ep.isActive !== false,
                          });
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 text-xs font-semibold cursor-pointer transition"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        disabled={testingWebhookId === ep.id}
                        onClick={() => {
                          setTestingWebhookId(ep.id);
                          testWebhookMutation.mutate(ep.id);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition disabled:opacity-50"
                      >
                        <Activity className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{testingWebhookId === ep.id ? 'Testing...' : 'Test Delivery'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Are you sure you want to remove webhook "${ep.name}"?`)) {
                            deleteWebhookMutation.mutate(ep.id);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold cursor-pointer transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Invoices & Billing History */}
      {activeTab === 'INVOICES' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0d1322]/80 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Subscription Invoices &amp; Receipts</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Official commercial invoices issued for your DOOT subscription.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="px-5 py-3.5">Invoice #</th>
                    <th className="px-5 py-3.5">Billing Date</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Receipt Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                        No invoice history available for this billing period.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                        <td className="px-5 py-4 font-mono font-bold text-slate-900 dark:text-slate-200">{inv.invoiceNumber}</td>
                        <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-[11px]">
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                          ${inv.amount} {inv.currency}
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => window.print()}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
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
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#0d1322]/80 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  AI Support Assistant Configuration
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure extensible LLM models to draft human-approved customer responses with automatic PII masking.
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                PII Masking Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">AI Provider</label>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-200 focus:outline-none"
                >
                  <option value="OPENAI">OpenAI (GPT-4o)</option>
                  <option value="ANTHROPIC">Anthropic (Claude 3.5 Sonnet)</option>
                  <option value="GEMINI">Google Gemini Pro 1.5</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">API Key</label>
                <input
                  type="password"
                  placeholder={aiConfig?.apiKey ? '••••••••••••••••' : 'Enter provider API key'}
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">System Instructions</label>
              <textarea
                rows={3}
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-200 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Enable Assistant Drafting</span>
              </label>

              <button
                onClick={() => saveAiMutation.mutate({ provider: aiProvider, apiKey: aiApiKey, instructions: aiInstructions, enabled: aiEnabled })}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Save AI Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Facebook Messenger */}
      {activeTab === 'MESSENGER' && (
        <div className="max-w-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Facebook Messenger Integration</h3>
              <p className="text-xs text-slate-500">Connect Facebook pages for unified omnichannel customer support.</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Omnichannel Messenger webhook is pre-configured to your organization account. Authorize your Meta Page in the Meta Business Manager to route incoming chats to the shared Live Chat inbox.
          </p>
        </div>
      )}

      {/* Tab Content: General Settings (Workspace Profile) */}
      {activeTab === 'GENERAL' && (
        <div className="max-w-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Workspace Configuration</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage your company legal name, timezone, and phone parsing format.</p>
            </div>
            <span className="text-xs font-mono text-slate-400">ID: {currentOrg?.id || activeOrg?.id}</span>
          </div>

          {generalNotice && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                generalNotice.success
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {generalNotice.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span>{generalNotice.message}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateOrgSettingsMutation.mutate({
                name: orgName.trim(),
                timezone,
                settings: { country },
              });
            }}
            className="space-y-4 text-xs"
          >
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Organization Legal Name *</label>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Default Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+5:30)</option>
                <option value="America/New_York">America/New_York (EST - UTC-5:00)</option>
                <option value="Europe/London">Europe/London (GMT - UTC+0:00)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST - UTC+4:00)</option>
                <option value="UTC">UTC (Universal)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Default Country for Phone Parsing</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 uppercase focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Used to parse unformatted national numbers entered without +country code (e.g. IN for India).
              </p>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={updateOrgSettingsMutation.isPending}
                className="px-5 py-2.5 font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{updateOrgSettingsMutation.isPending ? 'Saving...' : 'Save Preferences'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab Content: Team Members */}
      {activeTab === 'TEAM' && (
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Authorized Team Members</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Users with access to this tenant workspace.</p>
            </div>
            <button
              onClick={() => alert('Invite member link copied to clipboard!')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" /> Invite Member
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950/80 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-5">Member Name</th>
                  <th className="py-3 px-5">Email</th>
                  <th className="py-3 px-5">Role</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {teamMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Loading team members...
                    </td>
                  </tr>
                ) : (
                  teamMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                      <td className="py-3 px-5 font-semibold text-slate-900 dark:text-white">
                        {m.user?.firstName} {m.user?.lastName}
                      </td>
                      <td className="py-3 px-5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">{m.user?.email}</td>
                      <td className="py-3 px-5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {m.role}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                          {m.isActive ? 'ACTIVE' : 'INVITED'}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-slate-500 text-[11px]">
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
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Security Audit Trail</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Immutable record of administrative, campaign, and credential activities.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950/80 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-5">Timestamp</th>
                  <th className="py-3 px-5">Actor</th>
                  <th className="py-3 px-5">Action</th>
                  <th className="py-3 px-5">Entity Type</th>
                  <th className="py-3 px-5">Entity ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No security audit entries recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                      <td className="py-2.5 px-5 text-slate-500 dark:text-slate-400 text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-5 text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                        {log.user ? `${log.user.firstName} (${log.user.email})` : 'SYSTEM'}
                      </td>
                      <td className="py-2.5 px-5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-5 text-slate-600 dark:text-slate-400">{log.entityType}</td>
                      <td className="py-2.5 px-5 font-mono text-[11px] text-slate-500">
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

      {/* MODAL 1: REGISTER NEW OUTBOUND WEBHOOK */}
      {showCreateWebhook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Register Outbound Webhook</h3>
                  <p className="text-xs text-slate-500">Forward WhatsApp events in real-time to your custom system.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateWebhook(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createWebhookMutation.mutate({
                  name: newWebhookName.trim(),
                  url: newWebhookUrl.trim(),
                  secret: newWebhookSecret.trim() || 'doot_dynamic_verify_token_2026',
                  events: newWebhookEvents.length ? newWebhookEvents : ['message.received', 'message.status_update'],
                });
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Destination Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My CRM Inbound Relay"
                  value={newWebhookName}
                  onChange={(e) => setNewWebhookName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Webhook URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://your-crm.com/api/v1/whatsapp/webhook"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-[11px] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Verify Token / Shared Secret</label>
                <input
                  type="text"
                  placeholder="doot_dynamic_verify_token_2026"
                  value={newWebhookSecret}
                  onChange={(e) => setNewWebhookSecret(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-[11px] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">Subscribe to Events</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'message.received', label: 'Incoming Messages (message.received)' },
                    { id: 'message.status_update', label: 'Delivery Receipts (message.status_update)' },
                    { id: 'template.status_update', label: 'Template Approvals (template.status_update)' },
                    { id: 'conversation.status', label: 'Chat Lifecycle (conversation.status)' },
                  ].map((evt) => {
                    const isChecked = newWebhookEvents.includes(evt.id);
                    return (
                      <label key={evt.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setNewWebhookEvents(
                              e.target.checked
                                ? [...newWebhookEvents, evt.id]
                                : newWebhookEvents.filter((x) => x !== evt.id)
                            );
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                        />
                        <span className="text-[11px] text-slate-700 dark:text-slate-300">{evt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateWebhook(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-semibold cursor-pointer transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createWebhookMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer transition shadow-xs text-xs disabled:opacity-50"
                >
                  {createWebhookMutation.isPending ? 'Registering...' : 'Register Webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT OUTBOUND WEBHOOK */}
      {editingWebhook?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Edit Webhook Endpoint</h3>
                  <p className="text-xs text-slate-500">Update destination URL, verification secret, and active status.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingWebhook(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateWebhookMutation.mutate({
                  id: editingWebhook.id,
                  data: {
                    name: editingWebhook.name.trim(),
                    url: editingWebhook.url.trim(),
                    secret: editingWebhook.secret.trim(),
                    events: editingWebhook.events,
                    isActive: editingWebhook.isActive,
                  },
                });
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Destination Name *</label>
                <input
                  type="text"
                  required
                  value={editingWebhook.name}
                  onChange={(e) => setEditingWebhook({ ...editingWebhook, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Webhook URL *</label>
                <input
                  type="url"
                  required
                  value={editingWebhook.url}
                  onChange={(e) => setEditingWebhook({ ...editingWebhook, url: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-[11px] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Verify Token / Shared Secret</label>
                <input
                  type="text"
                  value={editingWebhook.secret}
                  onChange={(e) => setEditingWebhook({ ...editingWebhook, secret: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-[11px] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">Subscribe to Events</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'message.received', label: 'Incoming Messages (message.received)' },
                    { id: 'message.status_update', label: 'Delivery Receipts (message.status_update)' },
                    { id: 'template.status_update', label: 'Template Approvals (template.status_update)' },
                    { id: 'conversation.status', label: 'Chat Lifecycle (conversation.status)' },
                  ].map((evt) => {
                    const isChecked = editingWebhook.events.includes(evt.id);
                    return (
                      <label key={evt.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newEvts = e.target.checked
                              ? [...editingWebhook.events, evt.id]
                              : editingWebhook.events.filter((x) => x !== evt.id);
                            setEditingWebhook({ ...editingWebhook, events: newEvts });
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                        />
                        <span className="text-[11px] text-slate-700 dark:text-slate-300">{evt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">Relay Delivery Active</div>
                  <div className="text-[11px] text-slate-500">Enable or pause forwarding real-time events to this destination.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingWebhook.isActive}
                    onChange={(e) => setEditingWebhook({ ...editingWebhook, isActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingWebhook(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-semibold cursor-pointer transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateWebhookMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer transition shadow-xs text-xs disabled:opacity-50"
                >
                  {updateWebhookMutation.isPending ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
