import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  Workflow,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  ArrowRight,
  MessageSquare,
  Sparkles,
  X,
  Send,
  Zap,
  Trash2,
  Edit3,
  Bot,
  Tag,
  ShieldCheck,
  HelpCircle,
  Layers,
  RefreshCw,
  Sliders,
  Check,
  ChevronRight,
  Terminal,
  Activity,
  PhoneCall,
  UserCheck,
  BookOpen,
  Headphones,
  LifeBuoy,
} from 'lucide-react';

const DEFAULT_COMPANY_SUMMARY = `Peers Global Pvt Ltd (Peers Automate) is an enterprise WhatsApp Business API & AI automation platform based in Gujarat, India.

1. Capabilities & Services:
• Official WhatsApp Cloud API Integration with Verified Green Tick support.
• 24/7 Intelligent Automated Chatbots with keyword flows, knowledge base QA, and instant lead capture.
• Meta Broadcast Campaigns reaching 100,000+ verified customer contacts with media & interactive CTA buttons.
• Unified Multi-Agent Team Inbox with real-time human chat handoff and conversation assignment.
• CRM & Webhook Integrations connecting WhatsApp with Shopify, WooCommerce, HubSpot, Salesforce, and custom web portals.

2. Commercial Pricing & Subscription Plans:
• Starter Plan: $29/month — Up to 5,000 messages, 2 team seats, standard bot flows, and basic reporting.
• Growth Plan: $79/month — Unlimited bot flows, 5 team seats, priority queues, and webhook relays.
• Enterprise Plan: Custom pricing — Dedicated cloud infrastructure, custom SLA guarantee, and custom CRM integration.

3. Demo, Appointments & Contact Details:
• Website: https://peersglobal.com
• Direct Hotline & WhatsApp: +91 70411 51714
• Official Support Email: support@peersglobal.com
• Turnaround Time: Standard setup is completed within 24 to 48 hours. Live 1-on-1 walkthroughs can be scheduled directly with our engineering team.

4. Business Operating Hours & Office Location:
• Office Location: Peers Global Pvt Ltd, Gujarat, India.
• Working Hours: Monday to Saturday, 9:00 AM – 7:00 PM IST. Support tickets outside hours are addressed on the next business morning.`;

interface FlowNode {
  id: string;
  type: 'TRIGGER' | 'CONDITION' | 'DELAY' | 'SEND_MESSAGE' | 'SEND_TEMPLATE' | 'ASSIGN_LEAD' | 'ADD_TAG';
  label: string;
  config?: any;
  next?: string;
  branches?: { label: string; condition: string; next: string }[];
}

interface AutomationFlow {
  id: string;
  name: string;
  triggerType: string;
  triggerConfig: any;
  steps: FlowNode[];
  isActive: boolean;
  executionCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface BotTemplate {
  key: string;
  name: string;
  triggerType: string;
  description: string;
  stepsCount: number;
  steps: FlowNode[];
  companySummary?: string;
}

export const AutomationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedFlow, setSelectedFlow] = useState<AutomationFlow | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState<'KNOWLEDGE' | 'CONDITIONS'>('KNOWLEDGE');
  
  // Interactive Chatbot Simulator Messages State
  const [simulationInput, setSimulationInput] = useState('');
  const [chatHistory, setChatHistory] = useState<
    { sender: 'user' | 'bot'; text: string; timestamp: string; stepDetails?: any }[]
  >([]);
  const [latestTrace, setLatestTrace] = useState<any | null>(null);

  // Flow Architect State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [flowDraft, setFlowDraft] = useState<{
    name: string;
    triggerType: 'MESSAGE_RECEIVED' | 'KEYWORD_MATCH' | 'NEW_LEAD';
    triggerKeywords: string;
    companySummary: string;
    aiKnowledgeBaseEnabled: boolean;
    humanHandoffMessage: string;
    autoKeepAliveEnabled: boolean;
    keepAliveMessage: string;
    branches: { id: string; label: string; condition: string; replyText: string; isFallback?: boolean }[];
  }>({
    name: 'Smart Welcome & Condition Bot',
    triggerType: 'MESSAGE_RECEIVED',
    triggerKeywords: 'hello, hi, hey, start',
    companySummary: DEFAULT_COMPANY_SUMMARY,
    aiKnowledgeBaseEnabled: true,
    humanHandoffMessage:
      'Thank you for reaching out, {{name}}! 🤝 Our team has received your inquiry: "{{last_message}}". A member of our executive team will review your question and reply directly in this chat shortly. Please stay connected!',
    autoKeepAliveEnabled: true,
    keepAliveMessage:
      'Hello {{name}}! 👋 Please stay connected with us. Our team member is reviewing your inquiry and will shortly connect with you. If you need any assistance right now, please reply here! 💬',
    branches: [
      {
        id: 'branch-1',
        label: 'Greeting (Hello/Hi)',
        condition: 'hello, hi, hey, hiii, namaste, start, menu',
        replyText:
          '👋 Hello {{name}}! Welcome to *{{company}}*.\n\nHow can we help you today? Please reply with an option:\n1️⃣ *Services* — What we do\n2️⃣ *Pricing* — Commercial plans\n3️⃣ *Demo* — Book a live tour\n4️⃣ *Support* — Speak with our team',
      },
      {
        id: 'branch-2',
        label: 'Services & Capabilities',
        condition: 'service, services, features, solution, solutions, 1, what do you do',
        replyText:
          '🚀 *{{company}} Solutions & Capabilities:*\n\n• 🤖 *Automated 24/7 Chatbots:* Smart keyword flows & AI knowledge answering\n• 📢 *Meta Broadcast Campaigns:* Reach thousands of verified contacts with rich media\n• 💬 *Unified Multi-Agent Inbox:* Team inbox with live handoff\n• 🔗 *API & Outbound Webhooks:* Connect with CRM and internal systems\n\nReply *Pricing* to view our plans, or *Demo* to book a tour!',
      },
      {
        id: 'branch-3',
        label: 'Pricing & Commercial Plans',
        condition: 'price, pricing, cost, plan, plans, package, 2, quotation, rate, fees',
        replyText:
          '💼 *{{company}} Commercial Plans:*\n\n• 🟢 *Starter Plan:* $29/mo — Up to 5,000 messages, 2 team seats, standard bot flows.\n• 🔵 *Growth Plan:* $79/mo — Unlimited messages, custom DAG bot flows, priority queue.\n• 🟣 *Enterprise:* Custom — Dedicated infrastructure, SLA guarantee, custom webhook integration.\n\nReply *Demo* to schedule a live demo with our team!',
      },
      {
        id: 'branch-4',
        label: 'Schedule Demo & Walkthrough',
        condition: 'demo, meeting, schedule, appointment, call, book, 3',
        replyText:
          '📅 *Schedule a Live Product Demo:*\n\nWe would love to show you how Peers Automate can transform your customer communication!\n\n🔗 *Visit:* https://peersglobal.com\n📞 *Direct Contact:* +91 70411 51714\n\nOur solutions specialist will connect with you within 15 minutes!',
      },
      {
        id: 'branch-5',
        label: 'Default Fallback & Knowledge QA',
        condition: '*',
        isFallback: true,
        replyText:
          'Thank you for contacting *{{company}}*, {{name}}! 🤝\n\nWe received your message: "{{last_message}}".\n\nTo see quick options, reply with:\n• *Hello* — Main Menu\n• *Pricing* — Subscription Plans\n• *Demo* — Schedule a Walkthrough\n• *Support* — Speak with our Team',
      },
    ],
  });

  // Query flows
  const { data: flows, isLoading } = useQuery<AutomationFlow[]>({
    queryKey: ['automation-flows'],
    queryFn: () => api.get<AutomationFlow[]>('/automations'),
  });

  // Query templates
  const { data: templates } = useQuery<BotTemplate[]>({
    queryKey: ['automation-templates'],
    queryFn: () => api.get<BotTemplate[]>('/automations/templates'),
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/automations/${id}/toggle`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
    },
  });

  // Install template mutation
  const installTemplateMutation = useMutation({
    mutationFn: (templateKey: string) =>
      api.post('/automations/templates/install', { templateKey }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
      setIsTemplatesOpen(false);
      alert('Pre-trained Bot Flow installed and activated successfully!');
    },
  });

  // Delete flow mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/automations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
    },
  });

  // Save flow mutation
  const saveFlowMutation = useMutation({
    mutationFn: async (draft: typeof flowDraft) => {
      // Compile UI branches into backend FlowNode DAG
      const conditionNodeId = 'node-cond-main';
      const rootTriggerNode: FlowNode = {
        id: 'node-trig-root',
        type: 'TRIGGER',
        label:
          draft.triggerType === 'MESSAGE_RECEIVED'
            ? 'Any Inbound Message'
            : draft.triggerType === 'KEYWORD_MATCH'
            ? 'Inbound Keywords Trigger'
            : 'New CRM Lead Trigger',
        config: {
          triggerEvent: draft.triggerType,
          keywords: draft.triggerKeywords
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean),
        },
        next: conditionNodeId,
      };

      const branchesList: { label: string; condition: string; next: string }[] = [];
      const replyNodes: FlowNode[] = [];

      // Sort branches so non-fallback keyword branches come first, and fallback is always last
      const nonFallbackBranches = draft.branches.filter((b) => !b.isFallback);
      const fallbackBranches = draft.branches.filter((b) => b.isFallback);
      const organizedBranches = [...nonFallbackBranches, ...fallbackBranches];

      organizedBranches.forEach((b, idx) => {
        const replyNodeId = b.isFallback ? 'node-msg-fallback' : `node-reply-${idx + 1}`;
        branchesList.push({
          label: b.label,
          condition: b.isFallback ? '*' : b.condition,
          next: replyNodeId,
        });

        replyNodes.push({
          id: replyNodeId,
          type: 'SEND_MESSAGE',
          label: b.isFallback ? 'Fallback & Knowledge QA Reply' : `Reply: ${b.label}`,
          config: {
            text: b.replyText,
          },
        });
      });

      const conditionNode: FlowNode = {
        id: conditionNodeId,
        type: 'CONDITION',
        label: 'Evaluate Intent & Knowledge Summary',
        config: { field: 'messageText' },
        branches: branchesList,
      };

      const compiledSteps: FlowNode[] = [rootTriggerNode, conditionNode, ...replyNodes];

      const payload = {
        name: draft.name,
        triggerType: draft.triggerType,
        isActive: true,
        triggerConfig: {
          keywords: draft.triggerKeywords
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean),
          companySummary: draft.companySummary,
          aiKnowledgeBaseEnabled: draft.aiKnowledgeBaseEnabled,
          humanHandoffMessage: draft.humanHandoffMessage,
          autoKeepAliveEnabled: draft.autoKeepAliveEnabled,
          keepAliveMessage: draft.keepAliveMessage,
        },
        steps: compiledSteps,
      };

      if (editingId) {
        return api.put(`/automations/${editingId}`, payload);
      } else {
        return api.post('/automations', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
      setIsEditorOpen(false);
      setEditingId(null);
    },
    onError: (err: any) => {
      alert(`Error saving bot flow: ${err.response?.data?.message || err.message}`);
    },
  });

  // Highlighted newly created branch for instant visual recognition
  const [highlightedBranchId, setHighlightedBranchId] = useState<string | null>(null);

  // Add condition branch with smooth auto-scroll & autofocus
  const addConditionBranch = () => {
    const newId = `branch-${Date.now()}`;
    const nonFallbackCount = flowDraft.branches.filter((b) => !b.isFallback).length;
    const newBranch = {
      id: newId,
      label: `Condition Branch #${nonFallbackCount + 1}`,
      condition: '',
      replyText: '',
      isFallback: false,
    };

    // Insert before fallback branch if fallback exists, otherwise append
    const fallbackIdx = flowDraft.branches.findIndex((b) => b.isFallback);
    let updatedBranches: typeof flowDraft.branches;
    if (fallbackIdx !== -1) {
      updatedBranches = [
        ...flowDraft.branches.slice(0, fallbackIdx),
        newBranch,
        ...flowDraft.branches.slice(fallbackIdx),
      ];
    } else {
      updatedBranches = [...flowDraft.branches, newBranch];
    }

    setFlowDraft((prev) => ({
      ...prev,
      branches: updatedBranches,
    }));

    setHighlightedBranchId(newId);
    setTimeout(() => {
      setHighlightedBranchId(null);
    }, 2500);

    // Smoothly scroll the modal directly to the new branch card and focus its keywords input
    setTimeout(() => {
      const el = document.getElementById(newId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const condInput = el.querySelector<HTMLInputElement>('input[data-field="condition"]');
        if (condInput) {
          condInput.focus();
        }
      }
    }, 100);
  };

  const removeBranch = (branchId: string) => {
    setFlowDraft((prev) => ({
      ...prev,
      branches: prev.branches.filter((b) => b.id !== branchId),
    }));
  };

  const updateBranchField = (branchId: string, field: 'label' | 'condition' | 'replyText', value: string) => {
    setFlowDraft((prev) => ({
      ...prev,
      branches: prev.branches.map((b) => (b.id === branchId ? { ...b, [field]: value } : b)),
    }));
  };

  const clearEmptyBranches = () => {
    setFlowDraft((prev) => ({
      ...prev,
      branches: prev.branches.filter(
        (b) => b.isFallback || b.condition.trim() !== '' || b.replyText.trim() !== ''
      ),
    }));
  };

  // Simulation mutation
  const simulateMutation = useMutation({
    mutationFn: async ({ flowId, messageText }: { flowId: string; messageText: string }) => {
      return api.post<{
        flowName: string;
        totalStepsExecuted: number;
        replyText: string;
        trace: any[];
      }>(`/automations/${flowId}/simulate`, {
        messageText,
        contactName: 'Vishal Parmar',
        contactPhone: '+91 70411 51714',
      });
    },
    onSuccess: (data, variables) => {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setChatHistory((prev) => [
        ...prev,
        { sender: 'user', text: variables.messageText, timestamp: now },
        {
          sender: 'bot',
          text: data.replyText || '*(Bot executed flow but no message text was configured)*',
          timestamp: now,
          stepDetails: data,
        },
      ]);
      setLatestTrace(data);
      setSimulationInput('');
    },
  });

  const openEditorForFlow = (flow?: AutomationFlow) => {
    if (!flow) {
      setEditingId(null);
      setFlowDraft({
        name: 'New Custom Knowledge Bot',
        triggerType: 'MESSAGE_RECEIVED',
        triggerKeywords: 'hello, hi, help',
        companySummary: DEFAULT_COMPANY_SUMMARY,
        aiKnowledgeBaseEnabled: true,
        humanHandoffMessage:
          'Thank you for reaching out, {{name}}! 🤝 Our team has received your inquiry: "{{last_message}}". A member of our executive team will review your question and reply directly in this chat shortly. Please stay connected!',
        autoKeepAliveEnabled: true,
        keepAliveMessage:
          'Hello {{name}}! 👋 Please stay connected with us. Our team member is reviewing your inquiry and will shortly connect with you. If you need any assistance right now, please reply here! 💬',
        branches: [
          {
            id: 'b-1',
            label: 'Greeting',
            condition: 'hello, hi, hey, start',
            replyText: '👋 Hello {{name}}! Welcome to {{company}}. How can we help you today?',
          },
          {
            id: 'b-2',
            label: 'Default Fallback & Knowledge QA',
            condition: '*',
            isFallback: true,
            replyText: 'Thanks for reaching out! We received your message: "{{last_message}}". Type *help* for options.',
          },
        ],
      });
    } else {
      setEditingId(flow.id);
      const triggerCfg = (flow.triggerConfig as any) || {};
      const nodes = (flow.steps || []) as FlowNode[];
      const condNode = nodes.find((n) => n.type === 'CONDITION');
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));

      const rawBranches = (condNode?.branches || []).map((b, i) => {
        const replyNode = nodeMap.get(b.next);
        const isFallback = b.condition === '*' || b.condition.toLowerCase() === 'default';
        return {
          id: `branch-edit-${i}`,
          label: b.label,
          condition: b.condition,
          isFallback,
          replyText: replyNode?.config?.text || '',
        };
      });

      const nonFallback = rawBranches.filter((b) => !b.isFallback);
      const fallbacks = rawBranches.filter((b) => b.isFallback);
      const branches = [...nonFallback, ...fallbacks];

      setFlowDraft({
        name: flow.name,
        triggerType: flow.triggerType as any,
        triggerKeywords: ((flow.triggerConfig as any)?.keywords || []).join(', ') || '',
        companySummary: triggerCfg.companySummary || DEFAULT_COMPANY_SUMMARY,
        aiKnowledgeBaseEnabled: triggerCfg.aiKnowledgeBaseEnabled !== false,
        humanHandoffMessage:
          triggerCfg.humanHandoffMessage ||
          'Thank you for reaching out, {{name}}! 🤝 Our team has received your inquiry: "{{last_message}}". A member of our executive team will review your question and reply directly in this chat shortly. Please stay connected!',
        autoKeepAliveEnabled: triggerCfg.autoKeepAliveEnabled !== false,
        keepAliveMessage:
          triggerCfg.keepAliveMessage ||
          'Hello {{name}}! 👋 Please stay connected with us. Our team member is reviewing your inquiry and will shortly connect with you. If you need any assistance right now, please reply here! 💬',
        branches:
          branches.length > 0
            ? branches
            : [
                {
                  id: 'b-default',
                  label: 'Default Reply',
                  condition: '*',
                  isFallback: true,
                  replyText: 'Hello {{name}}! Thanks for contacting {{company}}.',
                },
              ],
      });
    }
    setActiveEditorTab('KNOWLEDGE');
    setIsEditorOpen(true);
  };

  const openSimulatorForFlow = (flow: AutomationFlow) => {
    setSelectedFlow(flow);
    setChatHistory([
      {
        sender: 'bot',
        text: `🤖 *${flow.name}* initialized with Knowledge Base QA.\n\nType any question below or click a quick test chip to see knowledge grounding and human handoff in action!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setLatestTrace(null);
    setIsSimulationOpen(true);
  };

  const handleSendSimulatedMessage = (text: string) => {
    if (!text.trim() || !selectedFlow) return;
    simulateMutation.mutate({
      flowId: selectedFlow.id,
      messageText: text.trim(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
                WhatsApp Bot Studio & Knowledge QA
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Summary Grounded
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 max-w-2xl">
              Train bots with your company & project summary. The bot studies the knowledge base to answer questions, or seamlessly hands off unknown queries to your live team before the 24h window expires.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-nowrap">
          <button
            onClick={() => setIsTemplatesOpen(true)}
            className="h-9 px-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold text-xs border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Bot Templates</span>
          </button>

          <button
            onClick={() => openEditorForFlow()}
            className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Bot Flow</span>
          </button>
        </div>
      </div>

      {/* Safety, Live WhatsApp Number & Knowledge Grounding Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-900 border border-emerald-200 dark:border-slate-800 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Knowledge Base Grounding</h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              Bot answers questions strictly from your company brief. If it does not have the answer, it triggers a courteous human handoff!
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-900 border border-amber-200 dark:border-slate-800 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">24h Window Keep-Alive</h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              Before Meta's 24-hour service window closes, the bot or agent sends a stay-connected message to keep freeform chat open.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-slate-900 dark:to-slate-900 border border-indigo-200 dark:border-slate-800 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
            <Headphones className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Live Human Takeover</h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 font-mono">
              All questions appear in Live Inbox with full history so physical agents seamlessly continue.
            </p>
          </div>
        </div>
      </div>

      {/* Bot Flows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-3 text-center py-16 text-slate-400 text-xs font-mono flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
            Loading active bot flows...
          </div>
        ) : (flows || []).length === 0 ? (
          <div className="col-span-3 p-12 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 flex items-center justify-center mx-auto">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No WhatsApp Bot Flows Configured</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Set up an automated welcome sequence, condition keyword router, or company summary bot to respond to customers around the clock.
              </p>
            </div>
            <button
              onClick={() => setIsTemplatesOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>Install Pre-Trained Welcome Bot</span>
            </button>
          </div>
        ) : (
          (flows || []).map((flow) => {
            const steps = (flow.steps || []) as FlowNode[];
            const condNode = steps.find((n) => n.type === 'CONDITION');
            const branchesCount = condNode?.branches?.length || 0;
            const hasSummary = !!(flow.triggerConfig as any)?.companySummary;

            return (
              <div
                key={flow.id}
                className={`p-6 rounded-2xl bg-white dark:bg-slate-900 border transition flex flex-col justify-between shadow-xs hover:shadow-lg ${
                  flow.isActive
                    ? 'border-emerald-300 dark:border-emerald-800/80 ring-1 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  {/* Top Bar: Trigger pill & Active switch */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/60">
                      {flow.triggerType}
                    </span>

                    <button
                      onClick={() => toggleMutation.mutate({ id: flow.id, isActive: !flow.isActive })}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition border"
                      style={{
                        backgroundColor: flow.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                        borderColor: flow.isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(148, 163, 184, 0.3)',
                        color: flow.isActive ? '#10b981' : '#94a3b8',
                      }}
                      title={flow.isActive ? 'Click to deactivate bot' : 'Click to activate bot'}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          flow.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                        }`}
                      ></span>
                      <span>{flow.isActive ? 'LIVE & ACTIVE' : 'INACTIVE'}</span>
                    </button>
                  </div>

                  <h3 className="text-base font-black text-slate-900 dark:text-white mt-3 flex items-center gap-2">
                    {flow.name}
                  </h3>

                  {/* Flow Badges */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {hasSummary && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
                        <BookOpen className="w-3 h-3" />
                        Summary Trained
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">
                      <Clock className="w-3 h-3" />
                      24h Keep-Alive
                    </span>
                  </div>

                  {/* Flow Stats */}
                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      <Layers className="w-3.5 h-3.5 text-indigo-500" />
                      {steps.length} Nodes
                    </span>
                    {branchesCount > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        <Activity className="w-3.5 h-3.5 text-teal-500" />
                        {branchesCount} Conditions
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      {flow.executionCount || 0} Triggers
                    </span>
                  </div>

                  {/* Visual Node Sequence */}
                  <div className="mt-4 space-y-2">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Flow Sequence:</div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {steps.slice(0, 4).map((node, i) => (
                        <React.Fragment key={node.id}>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {node.label || node.type}
                          </span>
                          {i < Math.min(steps.length - 1, 3) && (
                            <ArrowRight className="w-3 h-3 text-slate-400 dark:text-slate-600" />
                          )}
                        </React.Fragment>
                      ))}
                      {steps.length > 4 && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          +{steps.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Toolbar */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditorForFlow(flow)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
                      title="Edit knowledge base summary and conditions"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Train & Edit</span>
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete flow "${flow.name}"?`)) {
                          deleteMutation.mutate(flow.id);
                        }
                      }}
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition"
                      title="Delete flow"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => openSimulatorForFlow(flow)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Test in Simulator</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* PRE-TRAINED BOT TEMPLATES MODAL */}
      {isTemplatesOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Pre-Trained WhatsApp Bot Templates</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Production-ready bot workflows with pre-configured Company Summary Knowledge Base and human handoff.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTemplatesOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(templates || []).map((tpl) => (
                <div
                  key={tpl.key}
                  className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition"
                >
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-100/50 dark:bg-indigo-950/60 px-2 py-0.5 rounded font-mono">
                      {tpl.triggerType}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{tpl.name}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{tpl.description}</p>
                    <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                      Summary Trained
                    </div>
                  </div>

                  <button
                    onClick={() => installTemplateMutation.mutate(tpl.key)}
                    disabled={installTemplateMutation.isPending}
                    className="mt-5 w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition disabled:opacity-50"
                  >
                    {installTemplateMutation.isPending ? 'Installing...' : '1-Click Install & Activate'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VISUAL FLOW ARCHITECT & BOT TRAINER MODAL */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Workflow className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {editingId ? 'Edit & Train Bot Flow' : 'Create Visual Bot Flow'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure your Company Knowledge Summary, custom keyword conditions, and 24h keep-alive messaging.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveEditorTab('KNOWLEDGE')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeEditorTab === 'KNOWLEDGE'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>1. Company / Project Knowledge Summary</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveEditorTab('CONDITIONS')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeEditorTab === 'CONDITIONS'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>2. Keyword Conditions & Menu Branches</span>
              </button>
            </div>

            {/* TAB 1: KNOWLEDGE SUMMARY & GROUNDING */}
            {activeEditorTab === 'KNOWLEDGE' && (
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-300">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <span>How the Company Summary Bot Works</span>
                  </div>
                  <p className="text-xs text-indigo-800/90 dark:text-indigo-300/80 leading-relaxed">
                    Enter your company or project summary below (services, pricing, business rules, working hours, FAQs).
                    When customers ask questions on WhatsApp, the bot studies this summary and answers accurately. If a question is not in this summary, the bot sends the courteous hold message and notifies your live support team so an agent can jump in!
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Company / Project Knowledge Summary (Train your Bot) *
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {flowDraft.companySummary.length} characters
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    value={flowDraft.companySummary}
                    onChange={(e) => setFlowDraft({ ...flowDraft, companySummary: e.target.value })}
                    placeholder="Enter project/company description, capabilities, packages, pricing, contact details, FAQs..."
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
                  />
                </div>

                {/* Human Handoff Message */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Human Handoff Message (When question has no answer in summary)
                  </label>
                  <input
                    type="text"
                    value={flowDraft.humanHandoffMessage}
                    onChange={(e) => setFlowDraft({ ...flowDraft, humanHandoffMessage: e.target.value })}
                    placeholder="Message sent when question is unknown..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Sent automatically when the bot cannot answer from the summary. The conversation will be flagged in Live Inbox for an executive to take over.
                  </p>
                </div>

                {/* 24h Keep-Alive Message */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    24-Hour Keep-Alive Message (Sent before Meta session window closes)
                  </label>
                  <input
                    type="text"
                    value={flowDraft.keepAliveMessage}
                    onChange={(e) => setFlowDraft({ ...flowDraft, keepAliveMessage: e.target.value })}
                    placeholder="Message sent to keep WhatsApp window open..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Politely invites the customer to stay connected before the 24-hour service window expires, resetting the window when they reply!
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: KEYWORD CONDITIONS & REPLIES */}
            {activeEditorTab === 'CONDITIONS' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Bot Flow Name *
                    </label>
                    <input
                      type="text"
                      value={flowDraft.name}
                      onChange={(e) => setFlowDraft({ ...flowDraft, name: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Trigger Event *
                    </label>
                    <select
                      value={flowDraft.triggerType}
                      onChange={(e) => setFlowDraft({ ...flowDraft, triggerType: e.target.value as any })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="MESSAGE_RECEIVED">When any WhatsApp message is received (Recommended)</option>
                      <option value="KEYWORD_MATCH">When inbound text matches specific keywords</option>
                      <option value="NEW_LEAD">When a new first-time contact messages</option>
                    </select>
                  </div>
                </div>

                {/* Branches List */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-500" />
                        <span>Condition Branches & Replies ({flowDraft.branches.length})</span>
                      </label>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        The bot tests keyword branches in order. If none match, it triggers the Fallback & Knowledge QA.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {flowDraft.branches.filter((b) => !b.isFallback && !b.condition.trim() && !b.replyText.trim()).length > 1 && (
                        <button
                          type="button"
                          onClick={clearEmptyBranches}
                          className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline px-2 py-1 transition cursor-pointer"
                          title="Remove empty duplicate condition branches"
                        >
                          Clear Empty Branches
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={addConditionBranch}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                        title="Add a new keyword condition branch"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Condition Branch</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {flowDraft.branches.map((branch, index) => {
                      const isHighlighted = highlightedBranchId === branch.id;
                      return (
                        <div
                          key={branch.id}
                          id={branch.id}
                          className={`p-4 rounded-xl border space-y-3 transition-all duration-300 ${
                            isHighlighted
                              ? 'ring-2 ring-indigo-500 border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-md scale-[1.01]'
                              : branch.isFallback
                              ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                              : 'bg-slate-50/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                  branch.isFallback
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                                    : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                                }`}
                              >
                                {branch.isFallback ? '★' : index + 1}
                              </span>
                              <input
                                type="text"
                                data-field="label"
                                value={branch.label}
                                onChange={(e) => updateBranchField(branch.id, 'label', e.target.value)}
                                className="text-xs font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:border-indigo-500 px-1 py-0.5 flex-1 min-w-0"
                                placeholder="Branch Name (e.g. Services, Pricing, Demo)"
                              />
                              {branch.isFallback && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded shrink-0">
                                  Fallback & Knowledge QA
                                </span>
                              )}
                            </div>

                            {!branch.isFallback && flowDraft.branches.filter((b) => !b.isFallback).length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeBranch(branch.id)}
                                className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-1 rounded-lg transition cursor-pointer shrink-0"
                                title="Delete this condition branch"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>

                          {!branch.isFallback ? (
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Keywords to match (comma separated) *
                              </label>
                              <input
                                type="text"
                                data-field="condition"
                                value={branch.condition}
                                onChange={(e) => updateBranchField(branch.id, 'condition', e.target.value)}
                                placeholder="e.g. pricing, quote, plans, rates, 2"
                                className="w-full p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-2xs"
                              />
                            </div>
                          ) : (
                            <p className="text-[11px] text-amber-800 dark:text-amber-300 italic">
                              This branch automatically triggers when incoming customer text does not match any keyword branches above. It studies your Company Knowledge Summary to generate accurate answers, or hands off to a live agent before the 24-hour window expires!
                            </p>
                          )}

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                              Automated WhatsApp Reply Message *
                            </label>
                            <textarea
                              rows={3}
                              data-field="replyText"
                              value={branch.replyText}
                              onChange={(e) => updateBranchField(branch.id, 'replyText', e.target.value)}
                              placeholder="Enter message text to reply. Use {{name}} for customer name and {{company}} for company name."
                              className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-sans leading-relaxed shadow-2xs"
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Secondary Add Branch Button at bottom of list */}
                    <button
                      type="button"
                      onClick={addConditionBranch}
                      className="w-full py-2.5 rounded-xl border-2 border-dashed border-indigo-200 dark:border-indigo-800/80 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Add Another Condition Branch</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>DAG Acyclic Safe & Summary Grounded</span>
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => saveFlowMutation.mutate(flowDraft)}
                  disabled={saveFlowMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50 shadow-md"
                >
                  {saveFlowMutation.isPending ? 'Deploying...' : 'Save & Deploy to Live WhatsApp'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE CHATBOT SIMULATOR MODAL */}
      {isSimulationOpen && selectedFlow && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col justify-between">
            {/* Simulator Header */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-md">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {selectedFlow.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Knowledge Summary QA Active</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsSimulationOpen(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Test Prompt Chips */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">Quick Test:</span>
                {[
                  { label: '💬 "Hello"', text: 'hello' },
                  { label: '🚀 "1. Services"', text: '1' },
                  { label: '💼 "2. Pricing"', text: '2' },
                  { label: '📅 "3. Demo"', text: '3' },
                  { label: '🛒 "Shopify Support?"', text: 'Can you integrate with Shopify?' },
                  { label: '❓ "Out of Scope"', text: 'Can you fix my car engine?' },
                ].map((chip) => (
                  <button
                    key={chip.text}
                    onClick={() => handleSendSimulatedMessage(chip.text)}
                    disabled={simulateMutation.isPending}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-300 text-xs font-semibold transition border border-slate-200 dark:border-slate-700"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Messages Display Area */}
            <div className="flex-1 min-h-[300px] max-h-[380px] overflow-y-auto p-4 rounded-2xl bg-slate-100/70 dark:bg-[#070b13] border border-slate-200 dark:border-slate-800/80 space-y-3 font-sans">
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap shadow-xs ${
                      msg.sender === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-bl-xs border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
                </div>
              ))}

              {simulateMutation.isPending && (
                <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                  Bot is consulting Knowledge Summary...
                </div>
              )}
            </div>

            {/* Step Trace Telemetry Pill */}
            {latestTrace && (
              <div className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-300">
                <span className="flex items-center gap-1.5 font-bold">
                  <Activity className="w-3.5 h-3.5 text-indigo-500" />
                  {latestTrace.totalStepsExecuted} DAG Nodes Executed
                </span>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-sm">
                  {latestTrace.trace?.[latestTrace.trace.length - 1]?.outcome || 'Completed'}
                </span>
              </div>
            )}

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendSimulatedMessage(simulationInput);
              }}
              className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800"
            >
              <input
                type="text"
                value={simulationInput}
                onChange={(e) => setSimulationInput(e.target.value)}
                placeholder="Ask any question about company, services, pricing, or custom queries..."
                className="flex-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!simulationInput.trim() || simulateMutation.isPending}
                className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
