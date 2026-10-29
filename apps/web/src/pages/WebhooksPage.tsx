import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  Webhook,
  Plus,
  RefreshCw,
  Shield,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  ExternalLink,
  Lock,
  Layers,
  MessageSquare,
  Send,
  Check,
  CheckCheck,
  Search,
  Filter,
  Info,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

interface OutboundWebhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret: string;
  createdAt: string;
}

interface DeliveryLog {
  id: string;
  eventId: string;
  event: string;
  endpoint: { id: string; name: string; url: string };
  responseStatus: number | null;
  durationMs: number | null;
  attempts: number;
  errorMessage: string | null;
  createdAt: string;
}

interface WhatsAppMessageLog {
  id: string;
  metaMessageId: string | null;
  recipientPhone: string;
  recipientName: string;
  senderPhone: string;
  senderName?: string;
  direction: 'INBOUND' | 'OUTBOUND';
  type: string;
  body: string | null;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  errorCode?: string | null;
  errorMessage?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  createdAt: string;
}

const SUPPORTED_EVENTS = [
  { id: 'contact.created', label: 'Contact Created' },
  { id: 'contact.updated', label: 'Contact Updated' },
  { id: 'lead.stage_changed', label: 'Lead Stage Changed' },
  { id: 'message.received', label: 'Inbound Message Received' },
  { id: 'message.delivered', label: 'Message Delivered' },
  { id: 'campaign.completed', label: 'Campaign Completed' },
];

export const WebhooksPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'MESSAGE_LOGS' | 'WEBHOOK_ENDPOINTS'>('MESSAGE_LOGS');

  // Filter states for message logs
  const [messageFilterStatus, setMessageFilterStatus] = useState<string>('ALL');
  const [messageFilterDirection, setMessageFilterDirection] = useState<'ALL' | 'OUTBOUND' | 'INBOUND'>('ALL');
  const [messageSearchQuery, setMessageSearchQuery] = useState<string>('');

  // Webhook Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['message.received', 'message.delivered']);

  // Fetch WhatsApp Message Logs
  const {
    data: messageLogsData,
    isLoading: isLoadingMessages,
    refetch: refetchMessageLogs,
    isFetching: isFetchingMessages,
  } = useQuery<any>({
    queryKey: ['whatsapp-message-logs', messageFilterStatus, messageFilterDirection, messageSearchQuery],
    queryFn: () => {
      const params = new URLSearchParams();
      if (messageFilterStatus && messageFilterStatus !== 'ALL') params.append('status', messageFilterStatus);
      if (messageFilterDirection && messageFilterDirection !== 'ALL') params.append('direction', messageFilterDirection);
      if (messageSearchQuery) params.append('search', messageSearchQuery);
      const qs = params.toString() ? `?${params.toString()}` : '';
      return api.get(`/webhooks/message-logs${qs}`);
    },
  });

  const messageLogs: WhatsAppMessageLog[] = Array.isArray(messageLogsData)
    ? messageLogsData
    : messageLogsData?.data || [];

  // Fetch Outbound Webhooks
  const {
    data: webhooksData,
    isLoading: isLoadingWebhooks,
    refetch: refetchWebhooks,
  } = useQuery<any>({
    queryKey: ['webhooks-endpoints'],
    queryFn: () => api.get('/webhooks/endpoints'),
  });

  const webhooks: OutboundWebhook[] = Array.isArray(webhooksData)
    ? webhooksData
    : webhooksData?.data || [];

  // Fetch Delivery Logs
  const {
    data: logsData,
    isLoading: isLoadingLogs,
    refetch: refetchLogs,
  } = useQuery<any>({
    queryKey: ['webhook-logs'],
    queryFn: () => api.get('/webhooks/logs'),
  });

  const logs: DeliveryLog[] = Array.isArray(logsData)
    ? logsData
    : logsData?.data || [];

  // Create Webhook Mutation
  const createWebhookMutation = useMutation({
    mutationFn: (data: any) => api.post('/webhooks/endpoints', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks-endpoints'] });
      setIsAddModalOpen(false);
      setName('');
      setUrl('');
      setSecret('');
    },
    onError: (err: any) => alert(err.message || 'Failed to configure webhook endpoint'),
  });

  // Retry Delivery Mutation
  const retryMutation = useMutation({
    mutationFn: (logId: string) => api.post(`/webhooks/logs/${logId}/retry`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-logs'] });
      alert('Delivery retried successfully!');
    },
    onError: (err: any) => alert(err.message || 'Retry failed'),
  });

  const toggleEvent = (evt: string) => {
    setSelectedEvents((prev) =>
      prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt],
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READ':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#53bdeb]/15 text-[#0369a1] dark:text-[#53bdeb] border border-[#53bdeb]/40 shadow-xs">
            <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] stroke-[2.8]" />
            READ
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <CheckCheck className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 stroke-[2.2]" />
            DELIVERED
          </span>
        );
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
            <Check className="w-3.5 h-3.5 text-blue-500 stroke-[2.2]" />
            SENT
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            FAILED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Webhook className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Webhooks & Message Delivery Logs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track real-time WhatsApp message delivery receipts and manage outbound HTTP webhooks with HMAC signatures.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (activeTab === 'MESSAGE_LOGS') {
                refetchMessageLogs();
              } else {
                refetchWebhooks();
                refetchLogs();
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingMessages ? 'animate-spin text-emerald-500' : ''}`} />
            Refresh
          </button>
          {activeTab === 'WEBHOOK_ENDPOINTS' && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Webhook Endpoint
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('MESSAGE_LOGS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'MESSAGE_LOGS'
              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
        >
          <MessageSquare className="w-4 h-4" />
          WhatsApp Message Logs & Delivery Receipts
        </button>

        <button
          onClick={() => setActiveTab('WEBHOOK_ENDPOINTS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'WEBHOOK_ENDPOINTS'
              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
        >
          <Layers className="w-4 h-4" />
          Outbound Webhooks & CRM Endpoints
        </button>
      </div>

      {/* TAB 1: WHATSAPP MESSAGE LOGS */}
      {activeTab === 'MESSAGE_LOGS' && (
        <div className="space-y-4">
          {/* WhatsApp Cloud Policy Info Notice */}
          <div className="p-4 rounded-xl bg-amber-50/90 dark:bg-slate-900/60 border border-amber-200 dark:border-slate-800 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-bold text-amber-950 dark:text-slate-200">
                Official Meta 24-Hour Customer Window Rule
              </div>
              <p className="text-amber-900/90 dark:text-slate-400 leading-relaxed">
                • <strong>Meta Approved Templates:</strong> Can be sent anytime to any opted-in WhatsApp number (Marketing, Utility, Authentication).
                <br />
                • <strong>Freeform Direct Messages:</strong> Meta requires the customer to have sent a message within the last 24 hours. Outside of this 24h service window, Meta blocks freeform messages and requires an approved template to re-engage.
              </p>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 w-full lg:w-80 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search phone (+E.164), wamid, or content..."
                value={messageSearchQuery}
                onChange={(e) => setMessageSearchQuery(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 outline-none w-full"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Direction Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Direction:
                </span>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setMessageFilterDirection('ALL')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${messageFilterDirection === 'ALL'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                  >
                    All Messages
                  </button>
                  <button
                    onClick={() => setMessageFilterDirection('OUTBOUND')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${messageFilterDirection === 'OUTBOUND'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" /> Outbound (System Sent)
                  </button>
                  <button
                    onClick={() => setMessageFilterDirection('INBOUND')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${messageFilterDirection === 'INBOUND'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" /> Inbound (Customer)
                  </button>
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Status:
                </span>
                <div className="flex items-center gap-1">
                  {['ALL', 'SENT', 'DELIVERED', 'READ', 'FAILED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setMessageFilterStatus(st)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${messageFilterStatus === st
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Messages Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                WhatsApp Message History ({messageLogs.length})
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">Live Meta delivery receipts</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-950/80 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Direction</th>
                    <th className="py-3 px-4">Sender (From)</th>
                    <th className="py-3 px-4">Recipient (To)</th>
                    <th className="py-3 px-4">Type & Content</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Meta WAMID</th>
                    <th className="py-3 px-4">Sent At</th>
                    <th className="py-3 px-4">Delivered At</th>
                    <th className="py-3 px-4">Read At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {isLoadingMessages ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        Loading message logs...
                      </td>
                    </tr>
                  ) : messageLogs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        No messages matching this filter yet. Send a test message or launch a campaign to inspect delivery logs!
                      </td>
                    </tr>
                  ) : (
                    messageLogs.map((msg) => {
                      const isOut = msg.direction === 'OUTBOUND';
                      return (
                        <tr key={msg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                          <td className="py-3 px-4 whitespace-nowrap">
                            {isOut ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                Outbound (System)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                                <ArrowDownLeft className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                Inbound (Customer)
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white font-mono text-xs">
                              {msg.senderPhone}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {msg.senderName || (isOut ? 'Peers Automate' : 'Customer')}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white font-mono text-xs">
                              {msg.recipientPhone}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {msg.recipientName || (isOut ? 'Customer' : 'Peers Automate')}
                            </div>
                          </td>

                          <td className="py-3 px-4 max-w-xs">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {msg.type}
                              </span>
                            </div>
                            <div className="text-xs text-slate-800 dark:text-slate-200 truncate">
                              {msg.body || '—'}
                            </div>
                            {msg.errorMessage && (
                              <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-medium">
                                Error: {msg.errorMessage}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            {getStatusBadge(msg.status)}
                          </td>

                          <td className="py-3 px-4 font-mono text-[10px] text-slate-500 dark:text-slate-400 max-w-[140px] truncate" title={msg.metaMessageId || ''}>
                            {msg.metaMessageId ? `${msg.metaMessageId.slice(0, 18)}...` : '—'}
                          </td>

                          <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                            {msg.sentAt ? new Date(msg.sentAt).toLocaleTimeString() : new Date(msg.createdAt).toLocaleTimeString()}
                          </td>

                          <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                            {msg.deliveredAt ? (
                              <span className="text-slate-700 dark:text-slate-300 font-medium">
                                {new Date(msg.deliveredAt).toLocaleTimeString()}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                            {msg.readAt ? (
                              <span className="text-[#0284c7] dark:text-[#53bdeb] font-semibold">
                                {new Date(msg.readAt).toLocaleTimeString()}
                              </span>
                            ) : (
                              '—'
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

      {/* TAB 2: OUTBOUND WEBHOOK ENDPOINTS */}
      {activeTab === 'WEBHOOK_ENDPOINTS' && (
        <div className="space-y-6">
          {/* Security Banner */}
          <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-slate-900/60 border border-emerald-200 dark:border-slate-800 flex items-start gap-3">
            <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-bold text-emerald-950 dark:text-slate-200">Zero-Trust Outbound Webhook Security Active</div>
              <p className="text-emerald-900/80 dark:text-slate-400 leading-relaxed">
                All outbound requests are signed using your secret via <code className="text-emerald-700 dark:text-emerald-400 font-mono font-semibold">X-DOOT-Signature: sha256=...</code>.
                SSRF filters strictly block calls to internal private networks (RFC1918), localhost/loopback, and Cloud Metadata APIs (<code className="text-slate-800 dark:text-slate-300 font-mono">169.254.169.254</code>).
              </p>
            </div>
          </div>

          {/* Configured Webhooks List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Active Webhook Endpoints ({webhooks.length})
            </h3>

            {isLoadingWebhooks ? (
              <div className="p-6 text-center text-xs text-slate-500">Loading endpoints...</div>
            ) : webhooks.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
                No outbound webhooks configured. Add an endpoint to receive live real-time events.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {webhooks.map((wh) => (
                  <div
                    key={wh.id}
                    className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{wh.name}</h4>
                        <div className="font-mono text-xs text-emerald-600 dark:text-emerald-400 truncate max-w-sm font-medium">{wh.url}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                        Active
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                        Subscribed Events ({wh.events?.length || 0})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {wh.events?.map((evt) => (
                          <span
                            key={evt}
                            className="px-2 py-0.5 rounded text-[10px] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
                          >
                            {evt}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-900 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-mono">
                        <Lock className="w-3 h-3 text-slate-400 dark:text-slate-600" /> Secret: ••••••••
                      </span>
                      <span>{new Date(wh.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Webhook Delivery Logs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Outbound HTTP Webhook Dispatch Logs ({logs.length})
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">Past 50 delivery dispatches</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-950/80 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Event ID</th>
                    <th className="py-2.5 px-3">Event Type</th>
                    <th className="py-2.5 px-3">Endpoint</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">HTTP Code</th>
                    <th className="py-2.5 px-3">Attempts</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {isLoadingLogs ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        Loading webhook delivery logs...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No webhook events dispatched yet.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {log.eventId ? `${log.eventId.slice(0, 12)}...` : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-200">{log.event}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-xs">
                          {log.endpoint?.url || '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${log.responseStatus && log.responseStatus < 300
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                              }`}
                          >
                            {log.responseStatus && log.responseStatus < 300 ? 'SUCCESS' : 'FAILED'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {log.responseStatus ? (
                            <span className={log.responseStatus < 300 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-semibold'}>
                              {log.responseStatus}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-medium">{log.attempts}</td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {(!log.responseStatus || log.responseStatus >= 300) && (
                            <button
                              onClick={() => retryMutation.mutate(log.id)}
                              disabled={retryMutation.isPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
                            >
                              <RotateCw className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              Retry
                            </button>
                          )}
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

      {/* Add Webhook Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Webhook className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Configure Outbound Webhook
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter your external HTTPS endpoint. SSRF protection prevents calls to private networks.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createWebhookMutation.mutate({
                  name,
                  url,
                  secret: secret || undefined,
                  events: selectedEvents,
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Webhook Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zapier Lead Sync or Production CRM"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Destination URL (HTTPS required) *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://your-crm.example.com/api/doot-events"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Signing Secret (Optional HMAC Secret)
                </label>
                <input
                  type="password"
                  placeholder="Leave blank to auto-generate secure secret"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Event Subscriptions *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SUPPORTED_EVENTS.map((evt) => (
                    <label
                      key={evt.id}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer text-xs text-slate-700 dark:text-slate-300"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(evt.id)}
                        onChange={() => toggleEvent(evt.id)}
                        className="accent-emerald-600 rounded"
                      />
                      <span>{evt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createWebhookMutation.isPending}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition disabled:opacity-50"
                >
                  {createWebhookMutation.isPending ? 'Saving...' : 'Save Webhook Endpoint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
