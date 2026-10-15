import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  MessageSquare,
  Search,
  Send,
  Clock,
  AlertTriangle,
  User,
  Building,
  Phone,
  Tag,
  Check,
  CheckCheck,
  FileCode,
  ShieldAlert,
} from 'lucide-react';

interface Conversation {
  id: string;
  status: string;
  unreadCount: number;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  windowExpiresAt: string | null;
  contact: {
    id: string;
    phone: string;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    leadStatus: string;
    optInStatus: string;
  };
  phoneNumber: {
    displayPhoneNumber: string;
  };
}

interface Message {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  type: string;
  content: string;
  status: string;
  createdAt: string;
}

export const InboxPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [textMessage, setTextMessage] = useState('');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedTemplateName, setSelectedTemplateName] = useState('');

  // Fetch Conversations List
  const { data: conversations = [], isLoading: isLoadingConvs } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: () => api.get('/conversations'),
    refetchInterval: 5000, // Poll every 5s for live chat updates
  });

  // Selected Conversation Details
  const selectedConv = conversations.find((c) => c.id === selectedConvId) || conversations[0] || null;

  // Fetch Messages for active thread
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: ['messages', selectedConv?.id],
    queryFn: () => (selectedConv ? api.get(`/conversations/${selectedConv.id}/messages`) : Promise.resolve([])),
    enabled: !!selectedConv,
    refetchInterval: 3000,
  });

  // Fetch approved templates for window-expired sending
  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ['templates-approved'],
    queryFn: () => api.get('/templates'),
  });

  // Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: any) => api.post(`/conversations/${selectedConv?.id}/messages`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConv?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setTextMessage('');
      setIsTemplateModalOpen(false);
    },
    onError: (err: any) => alert(err.message || 'Failed to dispatch message'),
  });

  // Check 24-hour service window
  const isWindowActive = selectedConv?.windowExpiresAt
    ? new Date(selectedConv.windowExpiresAt).getTime() > Date.now()
    : false;

  const windowRemaining = selectedConv?.windowExpiresAt
    ? Math.max(0, Math.floor((new Date(selectedConv.windowExpiresAt).getTime() - Date.now()) / (1000 * 60)))
    : 0;

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textMessage.trim() || !selectedConv) return;
    sendMessageMutation.mutate({
      type: 'TEXT',
      content: textMessage,
    });
  };

  const handleSendTemplate = (templateName: string) => {
    if (!templateName || !selectedConv) return;
    sendMessageMutation.mutate({
      type: 'TEMPLATE',
      templateName,
      templateParameters: {},
    });
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Conversation List */}
        <div className="w-80 border-r border-slate-800/80 bg-slate-900/60 flex flex-col shrink-0">
          {/* Search Bar */}
          <div className="p-3 border-b border-slate-800">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Threads List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
            {isLoadingConvs ? (
              <div className="p-6 text-center text-xs text-slate-500">Loading chats...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                No conversations active. Inbound messages or campaigns will appear here.
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = (selectedConv?.id || conversations[0]?.id) === conv.id;
                const windowOpen = conv.windowExpiresAt
                  ? new Date(conv.windowExpiresAt).getTime() > Date.now()
                  : false;

                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`p-3.5 cursor-pointer transition flex items-start gap-3 ${
                      isActive ? 'bg-slate-800/80 border-l-2 border-emerald-400' : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
                      {conv.contact.firstName ? conv.contact.firstName[0].toUpperCase() : 'C'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-semibold text-xs text-slate-100 truncate">
                          {conv.contact.firstName || conv.contact.lastName
                            ? `${conv.contact.firstName || ''} ${conv.contact.lastName || ''}`.trim()
                            : conv.contact.phone}
                        </span>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mb-1.5">
                        {conv.lastMessagePreview || 'No messages yet'}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                            windowOpen
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {windowOpen ? '24h Open' : 'Window Closed'}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 ml-auto">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center Pane: Active Thread Chat */}
        {selectedConv ? (
          <div className="flex-1 flex flex-col bg-slate-950/40 min-w-0">
            {/* Thread Header */}
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  {selectedConv.contact.firstName ? selectedConv.contact.firstName[0].toUpperCase() : 'C'}
                </div>
                <div>
                  <h3 className="font-bold text-xs text-white flex items-center gap-2">
                    {selectedConv.contact.firstName || selectedConv.contact.phone}
                    <span className="text-[10px] font-mono text-emerald-400">
                      via {selectedConv.phoneNumber.displayPhoneNumber}
                    </span>
                  </h3>
                  <div className="text-[10px] text-slate-400 font-mono">{selectedConv.contact.phone}</div>
                </div>
              </div>

              {/* 24-Hour Window Badge */}
              <div>
                {isWindowActive ? (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    24h Customer Service Window: {Math.floor(windowRemaining / 60)}h {windowRemaining % 60}m left
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    24h Window Closed (Template Required)
                  </div>
                )}
              </div>
            </div>

            {/* Meta Policy Alert Banner if outside window */}
            {!isWindowActive && (
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-300">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Meta WhatsApp Business Policy: More than 24 hours have passed since the customer's last reply.
                    Freeform messages are blocked by Meta. Send an approved template message to resume.
                  </span>
                </div>
                <button
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="px-3 py-1 rounded bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 transition text-[11px] shrink-0 ml-3"
                >
                  Send Template
                </button>
              </div>
            )}

            {/* Chat Bubbles */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#080d1a]/50">
              {isLoadingMessages ? (
                <div className="text-center text-xs text-slate-500 py-8">Loading message history...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-12">
                  No messages exchanged yet in this conversation.
                </div>
              ) : (
                messages.map((msg) => {
                  const isOut = msg.direction === 'OUTBOUND';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isOut ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-md ${
                          isOut
                            ? 'bg-emerald-600 text-white rounded-br-none'
                            : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                        }`}
                      >
                        {msg.type === 'TEMPLATE' && (
                          <div className="text-[10px] uppercase font-bold text-emerald-200 mb-1 flex items-center gap-1">
                            <FileCode className="w-3 h-3" /> Template Message
                          </div>
                        )}
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                            isOut ? 'text-emerald-200' : 'text-slate-400'
                          }`}
                        >
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isOut && (
                            <span>
                              {msg.status === 'READ' ? (
                                <CheckCheck className="w-3 h-3 text-cyan-200" />
                              ) : msg.status === 'DELIVERED' ? (
                                <CheckCheck className="w-3 h-3 text-emerald-200" />
                              ) : (
                                <Check className="w-3 h-3 text-emerald-300" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Composer */}
            <div className="p-3 border-t border-slate-800 bg-slate-900/60">
              <form onSubmit={handleSendText} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  title="Send Template Message"
                >
                  <FileCode className="w-4 h-4 text-emerald-400" />
                </button>
                <input
                  type="text"
                  placeholder={
                    isWindowActive
                      ? 'Type a WhatsApp message...'
                      : '24h session closed. Use template message...'
                  }
                  disabled={!isWindowActive}
                  value={textMessage}
                  onChange={(e) => setTextMessage(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!isWindowActive || !textMessage.trim() || sendMessageMutation.isPending}
                  className="p-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-40 transition shadow-md shadow-emerald-500/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
            Select a conversation on the left to start messaging.
          </div>
        )}

        {/* Right Pane: Contact Details & Lead CRM */}
        {selectedConv && (
          <div className="w-72 border-l border-slate-800 bg-slate-900/40 p-4 overflow-y-auto space-y-4 shrink-0">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Contact Profile</h4>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-white font-bold">
                <User className="w-4 h-4 text-emerald-400" />
                {selectedConv.contact.firstName || selectedConv.contact.lastName
                  ? `${selectedConv.contact.firstName || ''} ${selectedConv.contact.lastName || ''}`.trim()
                  : 'Unnamed'}
              </div>
              <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                {selectedConv.contact.phone}
              </div>
              {selectedConv.contact.companyName && (
                <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                  <Building className="w-3.5 h-3.5 text-slate-500" />
                  {selectedConv.contact.companyName}
                </div>
              )}
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Lead Stage</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {selectedConv.contact.leadStatus}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Consent / Opt-In</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {selectedConv.contact.optInStatus}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Template Selector Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileCode className="w-5 h-5 text-emerald-400" />
                Send Approved Template Message
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Initiate contact or re-engage past 24 hours using an official Meta template.
              </p>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {templates.length === 0 ? (
                <div className="text-xs text-slate-500 p-4 text-center">No approved templates available.</div>
              ) : (
                templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplateName(tpl.name)}
                    className={`p-3 rounded-xl border cursor-pointer transition text-xs ${
                      selectedTemplateName === tpl.name
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>{tpl.name}</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {tpl.category}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedTemplateName || sendMessageMutation.isPending}
                onClick={() => handleSendTemplate(selectedTemplateName)}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 disabled:opacity-40"
              >
                {sendMessageMutation.isPending ? 'Sending...' : 'Send Template Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
