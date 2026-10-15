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
  eventType: string;
  statusCode: number | null;
  status: string;
  attemptCount: number;
  errorMessage: string | null;
  createdAt: string;
  webhook: { url: string; name: string };
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['message.received', 'message.delivered']);

  // Fetch Outbound Webhooks
  const { data: webhooks = [], isLoading: isLoadingWebhooks, refetch: refetchWebhooks } = useQuery<
    OutboundWebhook[]
  >({
    queryKey: ['webhooks'],
    queryFn: () => api.get('/webhooks'),
  });

  // Fetch Delivery Logs
  const { data: logs = [], isLoading: isLoadingLogs, refetch: refetchLogs } = useQuery<DeliveryLog[]>({
    queryKey: ['webhook-logs'],
    queryFn: () => api.get('/webhooks/logs'),
  });

  // Create Webhook Mutation
  const createWebhookMutation = useMutation({
    mutationFn: (data: any) => api.post('/webhooks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setIsAddModalOpen(false);
      setName('');
      setUrl('');
      setSecret('');
    },
    onError: (err: any) => alert(err.message || 'Failed to configure webhook'),
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Webhook className="w-6 h-6 text-emerald-400" />
            Outbound Webhooks & Delivery Logs
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Dispatch real-time HTTP webhooks to your external CRM or backend with HMAC-SHA256 signatures & SSRF protection.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refetchWebhooks();
              refetchLogs();
            }}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            Add Webhook Endpoint
          </button>
        </div>
      </div>

      {/* Security Banner */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
        <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-bold text-slate-200">Zero-Trust Outbound Webhook Security Active</div>
          <p className="text-slate-400 leading-relaxed">
            All requests are signed using your secret via <code className="text-emerald-400 font-mono">X-Doot-Signature: sha256=...</code>.
            SSRF filters strictly block calls to internal private networks (RFC1918), localhost/loopback, and Cloud Metadata APIs (<code className="text-slate-300 font-mono">169.254.169.254</code>).
          </p>
        </div>
      </div>

      {/* Configured Webhooks List */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          Active Webhook Endpoints ({webhooks.length})
        </h3>

        {isLoadingWebhooks ? (
          <div className="p-6 text-center text-xs text-slate-500">Loading endpoints...</div>
        ) : webhooks.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
            No outbound webhooks configured. Add an endpoint to receive live real-time events.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {webhooks.map((wh) => (
              <div
                key={wh.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-white">{wh.name}</h4>
                    <div className="font-mono text-xs text-emerald-400 truncate max-w-sm">{wh.url}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
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
                        className="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 text-slate-300 border border-slate-800"
                      >
                        {evt}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 font-mono">
                    <Lock className="w-3 h-3 text-slate-600" /> Secret: ••••••••
                  </span>
                  <span>{new Date(wh.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Webhook Delivery Logs */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Real-Time Delivery Logs ({logs.length})
          </h3>
          <span className="text-xs text-slate-400">Past 50 delivery dispatches</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
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
            <tbody className="divide-y divide-slate-800/40">
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
                  <tr key={log.id} className="hover:bg-slate-800/20">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                      {log.eventId.slice(0, 12)}...
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{log.eventType}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 truncate max-w-xs">
                      {log.webhook?.url || '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {log.statusCode ? (
                        <span className={log.statusCode < 300 ? 'text-emerald-400' : 'text-rose-400'}>
                          {log.statusCode}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2.5 px-3">{log.attemptCount}</td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {log.status !== 'SUCCESS' && (
                        <button
                          onClick={() => retryMutation.mutate(log.id)}
                          disabled={retryMutation.isPending}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                        >
                          <RotateCw className="w-3 h-3 text-emerald-400" />
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

      {/* Add Webhook Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Webhook className="w-5 h-5 text-emerald-400" />
                Configure Outbound Webhook
              </h3>
              <p className="text-xs text-slate-400 mt-1">
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">Webhook Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zapier Lead Sync or Production CRM"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Destination URL (HTTPS required) *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://your-crm.example.com/api/doot-events"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Signing Secret (Optional HMAC Secret)
                </label>
                <input
                  type="password"
                  placeholder="Leave blank to auto-generate secure secret"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Event Subscriptions *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SUPPORTED_EVENTS.map((evt) => (
                    <label
                      key={evt.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer text-xs text-slate-300"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(evt.id)}
                        onChange={() => toggleEvent(evt.id)}
                        className="accent-emerald-500 rounded"
                      />
                      <span>{evt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createWebhookMutation.isPending}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
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
