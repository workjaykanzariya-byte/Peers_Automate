import React, { useState, useEffect, useRef } from 'react';
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
  Zap,
  RefreshCw,
  X,
  Copy,
  HelpCircle,
  Radio,
  Smile,
  Paperclip,
  ChevronRight,
  ChevronDown,
  Info,
} from 'lucide-react';

interface Conversation {
  id: string;
  status: string;
  unreadCount: number;
  lastMessageAt: string;
  lastMessagePreview?: string | null;
  lastMessage?: {
    body: string;
    direction: 'INBOUND' | 'OUTBOUND';
    status: string;
    createdAt: string;
  } | null;
  windowExpiresAt: string | null;
  isWindowActive?: boolean;
  windowRemainingMinutes?: number;
  contact: {
    id: string;
    phone: string;
    firstName: string | null;
    lastName: string | null;
    fullName?: string;
    companyName: string | null;
    leadStatus: string;
    optInStatus: string;
    tags?: string[];
  };
  phoneNumber: {
    id: string;
    displayPhoneNumber: string;
    verifiedName?: string;
  };
}

interface Message {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  type: string;
  content?: string;
  body?: string;
  text?: string;
  status: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  createdAt: string;
  errorCode?: string | null;
  errorMessage?: string | null;
}

const renderWhatsAppFormattedText = (text: string, isOut: boolean = false) => {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <div className="space-y-1">
      {lines.map((line, lineIdx) => {
        if (!line.trim()) {
          return <div key={lineIdx} className="h-1.5" />;
        }

        const regex = /(\*[^*]+\*|_[^_]+_|~[^~]+~|```[^`]+```|https?:\/\/[^\s]+)/g;
        const parts = line.split(regex);

        return (
          <p key={lineIdx} className="leading-relaxed break-words">
            {parts.map((part, partIdx) => {
              if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
                return (
                  <strong
                    key={partIdx}
                    className={`font-bold ${
                      isOut ? 'text-emerald-950 dark:text-emerald-50' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {part.slice(1, -1)}
                  </strong>
                );
              }
              if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
                return (
                  <em
                    key={partIdx}
                    className={`italic ${
                      isOut ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {part.slice(1, -1)}
                  </em>
                );
              }
              if (part.startsWith('~') && part.endsWith('~') && part.length > 2) {
                return (
                  <span key={partIdx} className="line-through opacity-70">
                    {part.slice(1, -1)}
                  </span>
                );
              }
              if (part.startsWith('```') && part.endsWith('```') && part.length > 6) {
                return (
                  <code key={partIdx} className="font-mono bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-[11px]">
                    {part.slice(3, -3)}
                  </code>
                );
              }
              if (part.startsWith('http://') || part.startsWith('https://')) {
                return (
                  <a
                    key={partIdx}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`underline break-all font-semibold ${
                      isOut
                        ? 'text-emerald-800 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100'
                        : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300'
                    }`}
                  >
                    {part}
                  </a>
                );
              }
              return <React.Fragment key={partIdx}>{part}</React.Fragment>;
            })}
          </p>
        );
      })}
    </div>
  );
};

export const InboxPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [textMessage, setTextMessage] = useState('');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(true);

  // Modals for Testing & Meta Integration
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [isMetaGuideOpen, setIsMetaGuideOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Simulation form state
  const [simPhone, setSimPhone] = useState('916353025164');
  const [simName, setSimName] = useState('kanjariyajay563');
  const [simMessage, setSimMessage] = useState('Hiii');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSuccess, setSimSuccess] = useState('');

  // Fetch Conversations List (Polls every 2 seconds for live incoming messages)
  const { data: conversations = [], isLoading: isLoadingConvs, refetch: refetchConvs } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: () => api.get('/conversations'),
    refetchInterval: 2000,
    refetchOnWindowFocus: true,
  });

  // Selected Conversation
  const selectedConv = conversations.find((c) => c.id === selectedConvId) || conversations[0] || null;

  // Auto-select first conversation if not yet selected
  useEffect(() => {
    if (!selectedConvId && conversations.length > 0) {
      setSelectedConvId(conversations[0].id);
    }
  }, [conversations, selectedConvId]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const prevMessagesLengthRef = useRef(0);

  // Automatically reset unread count when active conversation is viewed
  useEffect(() => {
    if (selectedConv?.id && (selectedConv.unreadCount || 0) > 0) {
      queryClient.setQueryData<Conversation[]>(['conversations'], (old = []) =>
        old.map((c) => (c.id === selectedConv.id ? { ...c, unreadCount: 0 } : c))
      );
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  }, [selectedConv?.id, selectedConv?.unreadCount, queryClient]);

  // Auto-scroll to bottom immediately when switching or opening a conversation
  useEffect(() => {
    if (selectedConv?.id) {
      const timer = setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [selectedConv?.id]);

  // Fetch Messages for active thread (Polls every 1.5 seconds for instant WhatsApp thread updates)
  const { data: messages = [], isLoading: isLoadingMessages, refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ['messages', selectedConv?.id],
    queryFn: async () => {
      if (!selectedConv?.id) return [];
      const data: any = await api.get(`/conversations/${selectedConv.id}/messages`);
      return Array.isArray(data) ? data : data?.messages || [];
    },
    enabled: !!selectedConv?.id,
    refetchInterval: 1500,
    refetchOnWindowFocus: true,
  });

  // Re-fetch instantly when user returns or focuses the browser tab
  useEffect(() => {
    const onFocus = () => {
      refetchConvs();
      if (selectedConv?.id) {
        refetchMessages();
      }
    };
    window.addEventListener('focus', onFocus);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') onFocus();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refetchConvs, refetchMessages, selectedConv?.id]);

  // When messages load or new messages arrive, auto-scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      const container = chatContainerRef.current;
      const isNewMessage = messages.length !== prevMessagesLengthRef.current;
      prevMessagesLengthRef.current = messages.length;

      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 260;
        if (isNearBottom || isNewMessage) {
          const timer = setTimeout(() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
            messagesEndRef.current?.scrollIntoView({ behavior: isNewMessage ? 'smooth' : 'auto' });
          }, 40);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [messages]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBottom(false);
  };

  const handleChatScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;
    const isFarFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight > 180;
    setShowScrollBottom(isFarFromBottom);
  };

  // Fetch approved templates for sending outside window
  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ['templates-approved'],
    queryFn: () => api.get('/templates'),
  });

  // Send Outbound Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: any) => api.post(`/conversations/${selectedConv?.id}/messages`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConv?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setTextMessage('');
      setIsTemplateModalOpen(false);
      setTimeout(scrollToBottom, 60);
    },
    onError: (err: any) => alert(err.message || 'Failed to dispatch message'),
  });

  // Send 24h Window Keep-Alive Message Mutation
  const keepAliveMutation = useMutation({
    mutationFn: () => api.post(`/conversations/${selectedConv?.id}/keep-alive`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConv?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      alert('24-Hour Keep-Alive message sent to customer successfully! When customer replies, the 24h window resets.');
      setTimeout(scrollToBottom, 60);
    },
    onError: (err: any) => alert(err.message || 'Failed to send keep-alive message'),
  });

  // Calculate 24-hour service window
  const isWindowActive = selectedConv?.windowExpiresAt
    ? new Date(selectedConv.windowExpiresAt).getTime() > Date.now()
    : false;

  const windowRemaining = selectedConv?.windowExpiresAt
    ? Math.max(0, Math.floor((new Date(selectedConv.windowExpiresAt).getTime() - Date.now()) / (1000 * 60)))
    : 0;

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConv) return;
    if (!textMessage.trim()) {
      textInputRef.current?.focus();
      return;
    }
    sendMessageMutation.mutate({
      type: 'TEXT',
      body: textMessage.trim(),
      content: textMessage.trim(),
    });
  };

  const handleSendTemplate = (templateName: string) => {
    if (!templateName || !selectedConv) return;
    sendMessageMutation.mutate({
      type: 'TEMPLATE',
      templateName,
      templateId: templates.find(t => t.name === templateName)?.id,
      templateParameters: {},
    });
  };

  // Simulate Inbound Meta Webhook Message
  const handleSimulateInbound = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    setSimSuccess('');
    try {
      const cleanPhone = simPhone.replace(/\D/g, '');
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '1475250733815899',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: selectedConv?.phoneNumber?.displayPhoneNumber || '919664620704',
                    phone_number_id: '1148211571702139',
                  },
                  contacts: [
                    {
                      profile: { name: simName },
                      wa_id: cleanPhone,
                    },
                  ],
                  messages: [
                    {
                      from: cleanPhone,
                      id: `wamid.sim_${Date.now()}`,
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      text: { body: simMessage },
                      type: 'text',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      await fetch('/api/v1/meta/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setSimSuccess('Inbound WhatsApp message received & processed successfully!');
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        queryClient.invalidateQueries({ queryKey: ['messages'] });
        setIsSimulateModalOpen(false);
        setSimSuccess('');
      }, 1000);
    } catch (err: any) {
      alert('Failed to simulate webhook: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSimulating(false);
    }
  };

  // Filter conversations by search term
  const filteredConvs = conversations.filter((conv) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const phone = conv.contact.phone?.toLowerCase() || '';
    const name = `${conv.contact.firstName || ''} ${conv.contact.lastName || ''}`.toLowerCase();
    const lastMsg = (conv.lastMessage?.body || conv.lastMessagePreview || '').toLowerCase();
    return phone.includes(s) || name.includes(s) || lastMsg.includes(s);
  });

  const contactDisplayName = selectedConv
    ? (() => {
        const raw = `${selectedConv.contact.firstName || ''} ${selectedConv.contact.lastName || ''}`.trim();
        if (raw && !raw.startsWith('Recipient')) return raw;
        if (selectedConv.contact.companyName) return selectedConv.contact.companyName;
        return selectedConv.contact.phone;
      })()
    : '';

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex-1 flex overflow-hidden">
        {/* ======================================================== */}
        {/* Left Pane: Conversation List (Resobrand / WhatsApp Web Style) */}
        {/* ======================================================== */}
        <div className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 flex flex-col shrink-0">
          {/* Top Bar with Live Indicator & Action Buttons */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wide">All Chats</span>
                <span className="text-[10px] text-slate-400 font-semibold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800">
                  {conversations.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsSimulateModalOpen(true)}
                  className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-[10px] font-bold flex items-center gap-1 transition"
                  title="Simulate Inbound WhatsApp Message from phone"
                >
                  <Zap className="w-3 h-3 text-emerald-600" />
                  Test Reply
                </button>
                <button
                  type="button"
                  onClick={() => setIsMetaGuideOpen(true)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
                  title="Meta Webhook Setup & Live Integration Guide"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    refetchConvs();
                    refetchMessages();
                  }}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
                  title="Refresh chats"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search chats or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Threads List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoadingConvs ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading chats...</div>
            ) : filteredConvs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                No conversations found.
              </div>
            ) : (
              filteredConvs.map((conv) => {
                const isSelected = (selectedConv?.id || filteredConvs[0]?.id) === conv.id;
                const windowOpen = conv.windowExpiresAt
                  ? new Date(conv.windowExpiresAt).getTime() > Date.now()
                  : false;
                const rawName = `${conv.contact.firstName || ''} ${conv.contact.lastName || ''}`.trim();
                const displayName =
                  rawName && !rawName.startsWith('Recipient')
                    ? rawName
                    : conv.contact.companyName || conv.contact.phone;
                const previewText = conv.lastMessage?.body || conv.lastMessagePreview || 'No messages yet';

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setSelectedConvId(conv.id);
                      if (conv.unreadCount > 0) {
                        queryClient.setQueryData<Conversation[]>(['conversations'], (old = []) =>
                          old.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
                        );
                        queryClient.invalidateQueries({ queryKey: ['conversations'] });
                      }
                    }}
                    className={`p-3 cursor-pointer transition flex items-start gap-3 border-l-[3px] ${
                      isSelected
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/25 border-emerald-500'
                        : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    {/* Avatar with WhatsApp Badge */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center font-bold text-sm">
                        {displayName ? displayName[0].toUpperCase() : 'C'}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                        <MessageSquare className="w-2 h-2 text-white" />
                      </div>
                    </div>

                    {/* Thread Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                            {displayName}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 shrink-0">
                            {conv.contact.leadStatus.toLowerCase() === 'new' ? 'guest' : conv.contact.leadStatus.toLowerCase()}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-medium">
                          {conv.lastMessageAt
                            ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ''}
                        </span>
                      </div>

                      {/* Last Message Preview */}
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate mb-1.5 font-normal">
                        {conv.lastMessage?.direction === 'OUTBOUND' && (
                          <span className="shrink-0">
                            {conv.lastMessage.status === 'READ' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] stroke-[2.8]" />
                            ) : conv.lastMessage.status === 'DELIVERED' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-slate-400 stroke-[2]" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-slate-400 stroke-[2]" />
                            )}
                          </span>
                        )}
                        <span className="truncate">{previewText}</span>
                      </div>

                      {/* Badges: Window status & Unread pill */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            windowOpen
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {windowOpen ? '24h Open' : 'Window Closed'}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
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

        {/* ======================================================== */}
        {/* Center Pane: Active WhatsApp Thread Chat View */}
        {/* ======================================================== */}
        {selectedConv ? (
          <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-950/40 min-w-0">
            {/* Header: Clean, Uncrowded & Guaranteed Zero Overlap */}
            <div className="h-16 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 shadow-xs gap-3">
              {/* Left Side: Avatar, Name & Subtitle with 24h Window Status */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-sm border border-emerald-200 dark:border-emerald-500/30">
                    {contactDisplayName ? contactDisplayName[0].toUpperCase() : 'C'}
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[140px] sm:max-w-[220px]">
                      {contactDisplayName}
                    </h3>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 shrink-0">
                      {selectedConv.contact.leadStatus.toLowerCase() === 'new' ? 'guest' : selectedConv.contact.leadStatus.toLowerCase()}
                    </span>
                    {selectedConv.contact.tags?.some((t) => t.toLowerCase().includes('agent') || t.toLowerCase().includes('handoff')) && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 shrink-0 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                        Human Attention Required
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    <span className="shrink-0">{selectedConv.contact.phone}</span>
                    <span className="text-slate-300 dark:text-slate-700 shrink-0">•</span>
                    {isWindowActive ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-sans font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20 shrink-0 whitespace-nowrap">
                        <Clock className="w-3 h-3" />
                        24h Window: {Math.floor(windowRemaining / 60)}h {windowRemaining % 60}m
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-sans font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20 shrink-0 whitespace-nowrap">
                        <AlertTriangle className="w-3 h-3" />
                        Window Closed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side: Sleek Action Buttons (Single line, no wrapping, sleek heights) */}
              <div className="flex items-center gap-2 shrink-0 flex-nowrap">
                {isWindowActive && (
                  <button
                    type="button"
                    onClick={() => keepAliveMutation.mutate()}
                    disabled={keepAliveMutation.isPending}
                    className="h-8 px-2.5 rounded-lg border border-amber-300 dark:border-amber-700/60 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
                    title="Send Stay-Connected keep-alive message to extend 24h Meta customer window"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-current" />
                    <span>{keepAliveMutation.isPending ? 'Extending...' : 'Extend 24h'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsSimulateModalOpen(true)}
                  className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0 cursor-pointer"
                  title="Simulate Inbound WhatsApp Message from phone"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Simulate</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className={`h-8 w-8 rounded-lg border transition shrink-0 flex items-center justify-center cursor-pointer ${
                    isProfileOpen
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                  title={isProfileOpen ? 'Hide Contact Profile' : 'Show Contact Profile'}
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 24h Window Keep-Alive Alert Banner when expiring within 3 hours */}
            {isWindowActive && windowRemaining < 180 && (
              <div className="bg-amber-50 dark:bg-amber-500/15 border-b border-amber-200 dark:border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    <strong>24-Hour Session Expiring Soon:</strong> This conversation closes in {Math.floor(windowRemaining / 60)}h {windowRemaining % 60}m. Click 'Extend 24h Window' to invite the customer to reply and keep freeform messaging open.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => keepAliveMutation.mutate()}
                  disabled={keepAliveMutation.isPending}
                  className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold transition text-[11px] shrink-0 ml-3 shadow-xs"
                >
                  ⚡ Send Keep-Alive Message
                </button>
              </div>
            )}

            {/* Meta Policy Alert Banner if outside window */}
            {!isWindowActive && (
              <div className="bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    Meta WhatsApp Business Policy: More than 24 hours have passed since the customer's last reply. Send an approved template message to resume.
                  </span>
                </div>
                <button
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="px-3 py-1 rounded-lg bg-amber-500 text-white font-bold hover:bg-amber-600 transition text-[11px] shrink-0 ml-3 shadow-xs"
                >
                  Send Template
                </button>
              </div>
            )}

            {/* WhatsApp Wallpaper Chat Stream */}
            <div
              ref={chatContainerRef}
              onScroll={handleChatScroll}
              className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#efeae2]/65 dark:bg-[#0b141a]"
            >
              {/* Date Divider Pill */}
              <div className="flex items-center justify-center my-2">
                <span className="px-3 py-1 rounded-md bg-white/95 dark:bg-[#182229] text-[11px] font-semibold text-slate-600 dark:text-slate-300 shadow-xs border border-slate-200/60 dark:border-slate-700/60">
                  {selectedConv.lastMessageAt
                    ? new Date(selectedConv.lastMessageAt).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'Today'}
                </span>
              </div>

              {isLoadingMessages ? (
                <div className="text-center text-xs text-slate-400 py-8">Loading message history...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-xs text-slate-500 dark:text-slate-400 py-12">
                  No messages exchanged yet in this conversation.
                </div>
              ) : (
                messages.map((msg) => {
                  const isOut = msg.direction === 'OUTBOUND';
                  const bodyContent = msg.content || msg.body || msg.text || '';
                  const isRead = msg.status === 'READ' || Boolean(msg.readAt);
                  const isDelivered = msg.status === 'DELIVERED' || Boolean(msg.deliveredAt);

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isOut ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[72%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-[0_1px_1px_rgba(0,0,0,0.08)] ${
                          isOut
                            ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-white rounded-tr-none'
                            : 'bg-white dark:bg-[#202c33] text-[#111b21] dark:text-slate-100 rounded-tl-none border border-slate-200/50 dark:border-slate-700/40'
                        }`}
                      >
                        {msg.type === 'TEMPLATE' && (
                          <div
                            className={`text-[10px] uppercase font-bold mb-1 flex items-center gap-1 ${
                              isOut ? 'text-emerald-800 dark:text-emerald-200' : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            <FileCode className="w-3 h-3" /> Template Message
                          </div>
                        )}
                        <div className="text-xs leading-relaxed">{renderWhatsAppFormattedText(bodyContent, isOut)}</div>
                        <div
                          className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${
                            isOut ? 'text-slate-600 dark:text-emerald-100' : 'text-slate-400 dark:text-slate-400'
                          }`}
                        >
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isOut && (
                            <span className="flex items-center ml-0.5">
                              {isRead ? (
                                <span title="Read by recipient (Blue double checkmarks)" className="inline-flex items-center">
                                  <CheckCheck className="w-4 h-4 text-[#53bdeb] stroke-[2.8]" />
                                </span>
                              ) : isDelivered ? (
                                <span title="Delivered to WhatsApp" className="inline-flex items-center">
                                  <CheckCheck className="w-3.5 h-3.5 text-slate-500 dark:text-emerald-200 stroke-[2.2]" />
                                </span>
                              ) : (
                                <span title="Sent to WhatsApp" className="inline-flex items-center">
                                  <Check className="w-3.5 h-3.5 text-slate-500 dark:text-emerald-200 stroke-[2.2]" />
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Auto-scroll bottom anchor */}
              <div ref={messagesEndRef} className="h-0.5" />
            </div>

            {/* Floating WhatsApp-Style Scroll To Bottom Button */}
            {showScrollBottom && (
              <button
                type="button"
                onClick={scrollToBottom}
                className="absolute bottom-20 right-6 p-2.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xl border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all z-20 flex items-center justify-center animate-bounce cursor-pointer"
                title="Scroll to latest message"
              >
                <ChevronDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </button>
            )}

            {/* Chat Composer Bar */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-[#f0f2f5] dark:bg-[#202c33]">
              <form onSubmit={handleSendText} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition shadow-2xs"
                  title="Send Template Message"
                >
                  <FileCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </button>
                <input
                  ref={textInputRef}
                  type="text"
                  placeholder={
                    isWindowActive
                      ? `Message to ${selectedConv.contact.firstName || selectedConv.contact.phone}...`
                      : '24h session closed. Use template message...'
                  }
                  disabled={!isWindowActive}
                  value={textMessage}
                  onChange={(e) => setTextMessage(e.target.value)}
                  className="flex-1 bg-white dark:bg-[#2a3942] border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-50 transition shadow-2xs"
                />
                <button
                  type="submit"
                  disabled={!isWindowActive || sendMessageMutation.isPending}
                  className={`w-10 h-10 rounded-full transition-all duration-150 flex items-center justify-center shrink-0 cursor-pointer shadow-sm ${
                    textMessage.trim()
                      ? 'bg-[#00a884] hover:bg-[#008f6f] text-white shadow-md shadow-emerald-500/30 scale-100 hover:scale-105 active:scale-95'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs hover:scale-105 active:scale-95'
                  } ${!isWindowActive ? 'opacity-40 cursor-not-allowed' : ''}`}
                  title={
                    !isWindowActive
                      ? '24h session window closed'
                      : textMessage.trim()
                      ? 'Send message (Enter)'
                      : 'Click to type message'
                  }
                >
                  {sendMessageMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Send className="w-4 h-4 ml-0.5 fill-white text-white" />
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
            Select a conversation on the left to start messaging.
          </div>
        )}

        {/* ======================================================== */}
        {/* Right Pane: Contact Details & CRM Info (Collapsible) */}
        {/* ======================================================== */}
        {selectedConv && isProfileOpen && (
          <div className="w-72 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 overflow-y-auto space-y-4 shrink-0 animate-fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-300 uppercase tracking-wider">
                Contact Profile
              </h4>
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
                <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="truncate">{contactDisplayName}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{selectedConv.contact.phone}</span>
              </div>
              {selectedConv.contact.companyName && (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                  <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{selectedConv.contact.companyName}</span>
                </div>
              )}
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Lead Stage</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                {selectedConv.contact.leadStatus}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Consent / Opt-In</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                {selectedConv.contact.optInStatus}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Connected Line</span>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                {selectedConv.phoneNumber.displayPhoneNumber}
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-semibold mt-0.5 truncate">
                  {selectedConv.phoneNumber.verifiedName || 'Peers Global Business Media Pvt Ltd'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* Modal 1: Simulate Inbound WhatsApp Message */}
      {/* ======================================================== */}
      {isSimulateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-600" />
                Simulate Inbound WhatsApp Message
              </h3>
              <button
                onClick={() => setIsSimulateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Trigger an authentic incoming WhatsApp message payload to DOOT's Meta Webhook engine. This simulates a customer texting your business number.
            </p>

            {simSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {simSuccess}
              </div>
            )}

            <form onSubmit={handleSimulateInbound} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Customer Phone Number (with country code)
                </label>
                <input
                  type="text"
                  value={simPhone}
                  onChange={(e) => setSimPhone(e.target.value)}
                  placeholder="916353025164"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Customer Name / WhatsApp Profile
                </label>
                <input
                  type="text"
                  value={simName}
                  onChange={(e) => setSimName(e.target.value)}
                  placeholder="kanjariyajay563"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Message Body
                </label>
                <textarea
                  value={simMessage}
                  onChange={(e) => setSimMessage(e.target.value)}
                  placeholder="Type inbound message here..."
                  rows={3}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSimulateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSimulating}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs disabled:opacity-50 transition flex items-center gap-1.5"
                >
                  {isSimulating ? 'Processing...' : 'Send Test Inbound Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Modal 2: Meta Webhook Setup & Live Integration Guide */}
      {/* ======================================================== */}
      {isMetaGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-emerald-600" />
                Meta Webhook Live Integration Setup
              </h3>
              <button
                onClick={() => setIsMetaGuideOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Why did Resobrand receive customer messages while DOOT is running locally? Meta Cloud API delivers all incoming customer WhatsApp messages to the <strong>Callback URL</strong> registered in your Meta Developer App.
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">Step 1: Webhook Callback URL</span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  When hosting DOOT publicly or using a tunnel (e.g. Cloudflare / Ngrok):
                </p>
                <div className="flex items-center gap-2 font-mono text-[11px] bg-slate-200/60 dark:bg-slate-900 px-2 py-1 rounded-lg">
                  <span className="truncate flex-1">https://your-domain.com/api/v1/meta/webhook</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">Step 2: Verification Token</span>
                <div className="flex items-center gap-2 font-mono text-[11px] bg-slate-200/60 dark:bg-slate-900 px-2 py-1 rounded-lg">
                  <span className="flex-1 font-bold text-emerald-600">doot_meta_verify_token_2026</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('doot_meta_verify_token_2026');
                      setCopiedToken(true);
                      setTimeout(() => setCopiedToken(false), 2000);
                    }}
                    className="p-1 hover:text-emerald-600 transition"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">Step 3: Webhook Field Subscription</span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  In Meta Developer App &rarr; WhatsApp &rarr; Configuration &rarr; Webhook Fields, subscribe to: <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono font-bold text-emerald-600">messages</code>.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsMetaGuideOpen(false)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Modal 3: Template Selector Modal */}
      {/* ======================================================== */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCode className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Send Approved Template Message
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Initiate contact or re-engage past 24 hours using an official Meta template.
              </p>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {templates.length === 0 ? (
                <div className="text-xs text-slate-400 p-4 text-center">No approved templates available.</div>
              ) : (
                templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplateName(tpl.name)}
                    className={`p-3 rounded-xl border cursor-pointer transition text-xs ${
                      selectedTemplateName === tpl.name
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-white font-bold'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>{tpl.name}</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {tpl.category}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedTemplateName || sendMessageMutation.isPending}
                onClick={() => handleSendTemplate(selectedTemplateName)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm disabled:opacity-40 transition"
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
