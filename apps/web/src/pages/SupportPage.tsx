import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  LifeBuoy,
  Plus,
  MessageSquare,
  AlertCircle,
  Clock,
  CheckCircle2,
  Send,
  X,
  Tag,
  ShieldCheck,
} from 'lucide-react';

interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'NEW' | 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  comments?: TicketComment[];
}

interface TicketComment {
  id: string;
  authorId: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
}

export const SupportPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [replyText, setReplyText] = useState('');

  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: 'TECHNICAL',
    priority: 'MEDIUM',
    message: '',
  });

  // Fetch tickets for active organization
  const { data: tickets, isLoading } = useQuery<SupportTicket[]>({
    queryKey: ['support-tickets'],
    queryFn: () => api.get<SupportTicket[]>('/support/tickets'),
  });

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: (data: typeof newTicket) => api.post('/support/tickets', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      setIsCreateOpen(false);
      setNewTicket({ subject: '', category: 'TECHNICAL', priority: 'MEDIUM', message: '' });
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: ({ ticketId, message }: { ticketId: string; message: string }) =>
      api.post(`/support/tickets/${ticketId}/comments`, { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      setReplyText('');
    },
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
      case 'CLOSED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'PENDING':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-[#0d1322]/80 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <LifeBuoy className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">Help & Support Tickets</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Submit technical assistance requests, WhatsApp Cloud API queries, or billing inquiries to DOOT engineers.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-teal-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Open Support Ticket</span>
        </button>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Tickets List */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-800 bg-[#0d1322]/80 overflow-hidden shadow-xl flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-800 bg-slate-900/60 font-semibold text-xs text-slate-300 flex items-center justify-between">
            <span>Your Support Inquiries</span>
            <span className="font-mono text-slate-500 text-[11px]">{(tickets || []).length} tickets</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">Loading tickets...</div>
            ) : (tickets || []).length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No support tickets filed yet. All systems operational!
              </div>
            ) : (
              (tickets || []).map((ticket) => {
                const isSelected = selectedTicket?.id === ticket.id;
                return (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`w-full p-4 text-left transition flex flex-col gap-1.5 ${
                      isSelected ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400">{ticket.ticketNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${getStatusBadge(
                          ticket.status,
                        )}`}
                      >
                        {ticket.status}
                      </span>
                    </div>

                    <div className="font-semibold text-xs text-slate-200 line-clamp-1">{ticket.subject}</div>

                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${getPriorityBadge(
                          ticket.priority,
                        )}`}
                      >
                        {ticket.priority}
                      </span>
                      <span className="text-[10px] text-slate-400">{ticket.category}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Ticket Detail & Conversation Thread */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-[#0d1322]/80 overflow-hidden shadow-xl flex flex-col h-[600px]">
          {selectedTicket ? (
            <div className="flex-1 flex flex-col h-full">
              {/* Ticket Top bar */}
              <div className="p-5 border-b border-slate-800 bg-slate-900/60 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-indigo-400 font-bold">{selectedTicket.ticketNumber}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getStatusBadge(
                        selectedTicket.status,
                      )}`}
                    >
                      {selectedTicket.status}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-white mt-1">{selectedTicket.subject}</h2>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>Category: {selectedTicket.category}</span>
                    <span>•</span>
                    <span>Opened: {new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Comments Thread */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4">
                {(selectedTicket.comments || []).map((comm) => (
                  <div key={comm.id} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold text-slate-300">
                        {comm.isInternal ? 'Platform Support Engineer' : 'Customer Workspace'}
                      </span>
                      <span className="text-[11px] font-mono">{new Date(comm.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{comm.message}</p>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              <div className="p-4 border-t border-slate-800 bg-slate-900/80">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your message to support..."
                    className="flex-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                  <button
                    disabled={!replyText.trim() || addCommentMutation.isPending}
                    onClick={() =>
                      addCommentMutation.mutate({
                        ticketId: selectedTicket.id,
                        message: replyText,
                      })
                    }
                    className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Reply</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <LifeBuoy className="w-12 h-12 text-slate-600 mb-3" />
              <h3 className="text-sm font-bold text-slate-300">Select a ticket to view conversation</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Choose an existing support ticket from the list or create a new request for the engineering team.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE TICKET MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0d1322] border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-white text-base">Open Technical Support Ticket</h3>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
                <input
                  type="text"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  placeholder="e.g. Inbound WhatsApp webhook latency..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={newTicket.category}
                    onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="TECHNICAL">Technical / API</option>
                    <option value="WHATSAPP_API">Meta WhatsApp Verification</option>
                    <option value="BILLING">Billing & Plans</option>
                    <option value="FEATURE_REQUEST">Feature Request</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Issue Details</label>
                <textarea
                  rows={4}
                  value={newTicket.message}
                  onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                  placeholder="Describe your issue with steps to reproduce or affected phone number..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                disabled={!newTicket.subject.trim() || !newTicket.message.trim() || createTicketMutation.isPending}
                onClick={() => createTicketMutation.mutate(newTicket)}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {createTicketMutation.isPending ? 'Submitting...' : 'Submit Support Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
