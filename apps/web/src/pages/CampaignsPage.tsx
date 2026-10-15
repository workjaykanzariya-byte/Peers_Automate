import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  Send,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Users,
  Eye,
  Sliders,
  Play,
  Calendar,
  Layers,
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  template: { name: string };
  phoneNumber: { displayPhoneNumber: string };
  createdAt: string;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export const CampaignsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE'>('LIST');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Wizard state
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [campaignName, setCampaignName] = useState('');
  const [selectedPhoneId, setSelectedPhoneId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [targetAudience, setTargetAudience] = useState<'ALL' | 'TAG'>('ALL');
  const [targetTag, setTargetTag] = useState('');
  const [scheduleType, setScheduleType] = useState<'NOW' | 'SCHEDULED'>('NOW');
  const [scheduledTime, setScheduledTime] = useState('');

  // Fetch Campaigns
  const { data: campaigns = [], isLoading, refetch, isFetching } = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: () => api.get('/campaigns'),
  });

  // Fetch Phone Numbers
  const { data: phoneNumbers = [] } = useQuery<any[]>({
    queryKey: ['phone-numbers'],
    queryFn: () => api.get('/organizations/current/phone-numbers'),
  });

  // Fetch Templates
  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ['templates-approved'],
    queryFn: () => api.get('/templates'),
  });

  // Launch Campaign Mutation
  const launchMutation = useMutation({
    mutationFn: (data: any) => api.post('/campaigns', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setActiveTab('LIST');
      setWizardStep(1);
      setCampaignName('');
      alert('Campaign dispatched to queue successfully!');
    },
    onError: (err: any) => alert(err.message || 'Failed to dispatch campaign'),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Completed
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
            Processing...
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Scheduled
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Failed
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Send className="w-6 h-6 text-emerald-400" />
            WhatsApp Marketing & Bulk Campaigns
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Dispatch broadcast campaigns to segmented customer audiences with BullMQ queuing & rate-limit compliance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-emerald-400' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setActiveTab(activeTab === 'LIST' ? 'CREATE' : 'LIST')}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-lg shadow-emerald-500/20"
          >
            {activeTab === 'LIST' ? (
              <>
                <Plus className="w-4 h-4" /> New Campaign Wizard
              </>
            ) : (
              'View All Campaigns'
            )}
          </button>
        </div>
      </div>

      {activeTab === 'LIST' ? (
        /* Campaigns List View */
        <div className="space-y-4">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500">
              <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin mx-auto mb-3" />
              Loading campaigns...
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
              <Send className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <h3 className="text-base font-bold text-white mb-1">No Broadcast Campaigns Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                Launch a targeted broadcast to announce new products, send festival greetings, or follow up on leads.
              </p>
              <button
                onClick={() => setActiveTab('CREATE')}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition"
              >
                Create First Campaign
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {campaigns.map((c) => {
                const deliveryPct =
                  c.totalRecipients > 0 ? Math.round((c.sentCount / c.totalRecipients) * 100) : 0;

                return (
                  <div
                    key={c.id}
                    className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 transition shadow-xl space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-white">{c.name}</h3>
                          {getStatusBadge(c.status)}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Template: <span className="text-slate-200 font-mono">{c.template?.name || '—'}</span> •
                          Sender: <span className="text-slate-200 font-mono">{c.phoneNumber?.displayPhoneNumber || '—'}</span>
                        </p>
                      </div>
                      <div className="text-xs text-slate-500 text-right">
                        <div>Created {new Date(c.createdAt).toLocaleDateString()}</div>
                        {c.completedAt && (
                          <div className="text-emerald-400/80">
                            Completed in{' '}
                            {Math.max(
                              1,
                              Math.round(
                                (new Date(c.completedAt).getTime() - new Date(c.startedAt || c.createdAt).getTime()) /
                                  1000,
                              ),
                            )}
                            s
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5 text-slate-400">
                        <span>Dispatch Progress</span>
                        <span className="font-semibold text-white">
                          {c.sentCount} / {c.totalRecipients} ({deliveryPct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                          style={{ width: `${deliveryPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Funnel Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/60 text-xs">
                      <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Sent</span>
                        <span className="text-base font-extrabold text-slate-100">{c.sentCount}</span>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Delivered</span>
                        <span className="text-base font-extrabold text-emerald-400">{c.deliveredCount}</span>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Read</span>
                        <span className="text-base font-extrabold text-cyan-400">{c.readCount}</span>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Failed</span>
                        <span className="text-base font-extrabold text-rose-400">{c.failedCount}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Create Campaign Wizard */
        <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-emerald-400" />
              Configure WhatsApp Broadcast Campaign
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Deliver high-volume templated messages compliant with Meta messaging policy.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              launchMutation.mutate({
                name: campaignName,
                phoneNumberId: selectedPhoneId,
                templateId: selectedTemplateId,
                audienceFilter: targetAudience === 'TAG' ? { tag: targetTag } : {},
                scheduledAt: scheduleType === 'SCHEDULED' ? scheduledTime : undefined,
              });
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Campaign Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Diwali Flash Sale Announcement"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Sending WhatsApp Phone Asset *
                </label>
                <select
                  required
                  value={selectedPhoneId}
                  onChange={(e) => setSelectedPhoneId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                >
                  <option value="">Select phone line...</option>
                  {phoneNumbers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayPhoneNumber} ({p.verifiedName || 'WABA'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Meta Approved Template *
                </label>
                <select
                  required
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                >
                  <option value="">Select template...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.category})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Target Audience Selection
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setTargetAudience('ALL')}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    targetAudience === 'ALL'
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="font-bold text-xs">All Opted-in Contacts</div>
                  <div className="text-[10px] text-slate-500 mt-1">Excludes unsubscribed numbers automatically</div>
                </div>

                <div
                  onClick={() => setTargetAudience('TAG')}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    targetAudience === 'TAG'
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="font-bold text-xs">Filter by Tag</div>
                  <div className="text-[10px] text-slate-500 mt-1">Broadcast only to contacts with a specific tag</div>
                </div>
              </div>
            </div>

            {targetAudience === 'TAG' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Tag Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Customers, Leads, Newsletter"
                  value={targetTag}
                  onChange={(e) => setTargetTag(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Dispatch Schedule
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="schedule"
                    checked={scheduleType === 'NOW'}
                    onChange={() => setScheduleType('NOW')}
                    className="accent-emerald-500"
                  />
                  Send Immediately
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="schedule"
                    checked={scheduleType === 'SCHEDULED'}
                    onChange={() => setScheduleType('SCHEDULED')}
                    className="accent-emerald-500"
                  />
                  Schedule for Later
                </label>
              </div>
            </div>

            {scheduleType === 'SCHEDULED' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Scheduled Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('LIST')}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={launchMutation.isPending}
                className="px-6 py-2.5 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition flex items-center gap-2"
              >
                {launchMutation.isPending ? 'Queuing Campaign...' : 'Launch Campaign'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
