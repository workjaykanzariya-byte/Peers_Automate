import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  Trophy,
  Plus,
  RefreshCw,
  Clock,
  Calendar,
  Building,
  User,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Filter,
} from 'lucide-react';

const STAGES = [
  { key: 'NEW', label: 'New Inquiries', color: 'border-blue-500/40 bg-blue-500/5 text-blue-400' },
  { key: 'CONTACTED', label: 'Contacted', color: 'border-yellow-500/40 bg-yellow-500/5 text-yellow-400' },
  { key: 'QUALIFIED', label: 'Qualified Leads', color: 'border-indigo-500/40 bg-indigo-500/5 text-indigo-400' },
  { key: 'PROPOSAL', label: 'In Proposal', color: 'border-purple-500/40 bg-purple-500/5 text-purple-400' },
  { key: 'WON', label: 'Deals Won', color: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400' },
  { key: 'LOST', label: 'Lost / Disqualified', color: 'border-rose-500/40 bg-rose-500/5 text-rose-400' },
];

export const LeadsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [targetStage, setTargetStage] = useState('');
  const [leadNotes, setLeadNotes] = useState('');
  const [leadPriority, setLeadPriority] = useState('MEDIUM');
  const [leadFollowUp, setLeadFollowUp] = useState('');

  const { data: pipeline = {}, isLoading, refetch, isFetching } = useQuery<Record<string, any[]>>({
    queryKey: ['leads-pipeline'],
    queryFn: () => api.get('/leads/pipeline'),
  });

  const updateStageMutation = useMutation({
    mutationFn: (data: { id: string; stage: string; notes?: string; priority?: string; followUpDate?: string }) =>
      api.patch(`/leads/${data.id}/stage`, {
        stage: data.stage,
        notes: data.notes,
        priority: data.priority,
        followUpDate: data.followUpDate || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-pipeline'] });
      setSelectedLead(null);
    },
    onError: (err: any) => alert(err.message || 'Failed to update lead status'),
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-emerald-400" />
            Leads Pipeline & Kanban CRM
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track customer sales journeys from first WhatsApp inquiry to closed-won deals.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-emerald-400' : ''}`} />
          Refresh Pipeline
        </button>
      </div>

      {/* Kanban Board Container */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500">
          <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin mx-auto mb-3" />
          Loading sales pipeline...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-6">
          {STAGES.map((col) => {
            const items = pipeline[col.key] || [];
            return (
              <div
                key={col.key}
                className="flex flex-col bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 min-w-[260px] h-[75vh]"
              >
                {/* Column Header */}
                <div className={`p-2.5 rounded-xl border mb-3 flex items-center justify-between ${col.color}`}>
                  <span className="font-bold text-xs uppercase tracking-wider">{col.label}</span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-slate-950/60">
                    {items.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {items.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-slate-600 border border-dashed border-slate-800 rounded-xl">
                      Empty stage
                    </div>
                  ) : (
                    items.map((lead: any) => (
                      <div
                        key={lead.id}
                        onClick={() => {
                          setSelectedLead(lead);
                          setTargetStage(lead.leadStatus);
                          setLeadNotes(lead.notes || '');
                          setLeadPriority(lead.priority || 'MEDIUM');
                          setLeadFollowUp(lead.followUpDate ? lead.followUpDate.split('T')[0] : '');
                        }}
                        className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 cursor-pointer transition shadow-md group hover:bg-slate-900/90"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="font-semibold text-xs text-white group-hover:text-emerald-300 transition">
                            {lead.firstName || lead.lastName
                              ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim()
                              : 'Unnamed Prospect'}
                          </div>
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              lead.priority === 'HIGH'
                                ? 'bg-rose-500/20 text-rose-400'
                                : lead.priority === 'LOW'
                                ? 'bg-slate-800 text-slate-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}
                          >
                            {lead.priority || 'MEDIUM'}
                          </span>
                        </div>

                        <div className="text-[11px] font-mono text-emerald-400 mb-2">{lead.phone}</div>

                        {lead.companyName && (
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-2">
                            <Building className="w-3 h-3 text-slate-500" />
                            {lead.companyName}
                          </div>
                        )}

                        {lead.notes && (
                          <p className="text-[11px] text-slate-300 line-clamp-2 bg-slate-900/70 p-1.5 rounded-lg border border-slate-800/60 mb-2 italic">
                            "{lead.notes}"
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-900">
                          {lead.followUpDate ? (
                            <span className="flex items-center gap-1 text-yellow-400/80">
                              <Calendar className="w-3 h-3" />
                              {new Date(lead.followUpDate).toLocaleDateString()}
                            </span>
                          ) : (
                            <span>No follow-up set</span>
                          )}
                          <span className="text-[9px]">{new Date(lead.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Stage / Notes Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-emerald-400" />
                Update Lead: {selectedLead.firstName || selectedLead.phone}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Move between stages and log customer follow-up notes.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateStageMutation.mutate({
                  id: selectedLead.id,
                  stage: targetStage,
                  notes: leadNotes,
                  priority: leadPriority,
                  followUpDate: leadFollowUp || undefined,
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Pipeline Stage *</label>
                <select
                  value={targetStage}
                  onChange={(e) => setTargetStage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                >
                  {STAGES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                <select
                  value={leadPriority}
                  onChange={(e) => setLeadPriority(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High Priority</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Next Follow-Up Date</label>
                <input
                  type="date"
                  value={leadFollowUp}
                  onChange={(e) => setLeadFollowUp(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Activity & Lead Notes</label>
                <textarea
                  rows={3}
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  placeholder="Record customer interest, pricing discussions, or next call agenda..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateStageMutation.isPending}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
                >
                  {updateStageMutation.isPending ? 'Saving...' : 'Save Lead Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
