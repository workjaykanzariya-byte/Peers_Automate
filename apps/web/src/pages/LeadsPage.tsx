import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Trophy,
  Plus,
  RefreshCw,
  Calendar,
  Building2,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Filter,
  Search,
  DollarSign,
  MessageSquare,
  Sparkles,
  PhoneCall,
  FileText,
  XCircle,
  Copy,
  Check,
  Clock,
  ArrowRight,
  UserCheck,
  Tag,
  Flame,
  X,
} from 'lucide-react';

interface ContactTag {
  tag: {
    id: string;
    name: string;
    color: string;
  };
}

interface LeadItem {
  id: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  companyName?: string;
  leadStatus: string;
  leadSource?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  notes?: string;
  followUpDate?: string;
  customFields?: {
    dealValue?: number;
    [key: string]: any;
  };
  tags?: ContactTag[];
  assignedToUser?: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
  updatedAt: string;
}

const STAGES = [
  {
    key: 'NEW',
    label: 'New Inquiries',
    icon: Sparkles,
    accent: 'sky',
    colorHeader: 'from-sky-500/10 to-transparent border-sky-500/20 text-sky-600 dark:text-sky-400',
    dotBg: 'bg-sky-500',
    badgeBg: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  },
  {
    key: 'CONTACTED',
    label: 'Contacted',
    icon: PhoneCall,
    accent: 'amber',
    colorHeader: 'from-amber-500/10 to-transparent border-amber-500/20 text-amber-600 dark:text-amber-400',
    dotBg: 'bg-amber-500',
    badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  },
  {
    key: 'QUALIFIED',
    label: 'Qualified Leads',
    icon: CheckCircle2,
    accent: 'indigo',
    colorHeader: 'from-indigo-500/10 to-transparent border-indigo-500/20 text-indigo-600 dark:text-indigo-400',
    dotBg: 'bg-indigo-500',
    badgeBg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
  },
  {
    key: 'PROPOSAL',
    label: 'In Proposal',
    icon: FileText,
    accent: 'purple',
    colorHeader: 'from-purple-500/10 to-transparent border-purple-500/20 text-purple-600 dark:text-purple-400',
    dotBg: 'bg-purple-500',
    badgeBg: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
  },
  {
    key: 'WON',
    label: 'Deals Won',
    icon: Trophy,
    accent: 'emerald',
    colorHeader: 'from-emerald-500/10 to-transparent border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    dotBg: 'bg-emerald-500',
    badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
  {
    key: 'LOST',
    label: 'Lost / Disqualified',
    icon: XCircle,
    accent: 'rose',
    colorHeader: 'from-rose-500/10 to-transparent border-rose-500/20 text-rose-600 dark:text-rose-400',
    dotBg: 'bg-rose-500',
    badgeBg: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  },
];

export const LeadsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals state
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [defaultAddStage, setDefaultAddStage] = useState('NEW');

  // Edit lead form state
  const [targetStage, setTargetStage] = useState('');
  const [leadNotes, setLeadNotes] = useState('');
  const [leadPriority, setLeadPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [leadFollowUp, setLeadFollowUp] = useState('');
  const [leadDealValue, setLeadDealValue] = useState<string>('');

  // Add lead form state
  const [newPhone, setNewPhone] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newStage, setNewStage] = useState('NEW');
  const [newPriority, setNewPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [newDealValue, setNewDealValue] = useState('');
  const [newLeadSource, setNewLeadSource] = useState('WhatsApp Direct');
  const [newFollowUp, setNewFollowUp] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Fetch pipeline data
  const { data: rawPipeline = {}, isLoading, refetch, isFetching } = useQuery<Record<string, LeadItem[]>>({
    queryKey: ['leads-pipeline'],
    queryFn: () => api.get('/leads/pipeline'),
  });

  // Filtered pipeline data
  const pipeline = useMemo(() => {
    const result: Record<string, LeadItem[]> = {};
    const query = searchTerm.toLowerCase().trim();

    STAGES.forEach((stage) => {
      const items = rawPipeline[stage.key] || [];
      result[stage.key] = items.filter((lead) => {
        // Priority filter
        if (priorityFilter !== 'ALL' && lead.priority !== priorityFilter) {
          return false;
        }

        // Search term filter
        if (!query) return true;
        const name = `${lead.firstName || ''} ${lead.lastName || ''}`.toLowerCase();
        const phone = (lead.phone || '').toLowerCase();
        const company = (lead.companyName || '').toLowerCase();
        const notes = (lead.notes || '').toLowerCase();
        const source = (lead.leadSource || '').toLowerCase();

        return (
          name.includes(query) ||
          phone.includes(query) ||
          company.includes(query) ||
          notes.includes(query) ||
          source.includes(query)
        );
      });
    });

    return result;
  }, [rawPipeline, searchTerm, priorityFilter]);

  // Executive Metrics
  const metrics = useMemo(() => {
    let totalLeads = 0;
    let totalValue = 0;
    let highPriorityCount = 0;
    let wonCount = 0;
    let wonValue = 0;

    Object.entries(rawPipeline).forEach(([stageKey, leads]) => {
      totalLeads += leads.length;
      leads.forEach((l) => {
        const val = Number(l.customFields?.dealValue) || 0;
        totalValue += val;
        if (l.priority === 'HIGH') highPriorityCount++;
        if (stageKey === 'WON') {
          wonCount++;
          wonValue += val;
        }
      });
    });

    const winRate = totalLeads > 0 ? Math.round((wonCount / totalLeads) * 100) : 0;

    return {
      totalLeads,
      totalValue,
      highPriorityCount,
      wonCount,
      wonValue,
      winRate,
    };
  }, [rawPipeline]);

  // Stage update mutation
  const updateStageMutation = useMutation({
    mutationFn: (data: {
      id: string;
      stage: string;
      notes?: string;
      priority?: string;
      followUpDate?: string;
      dealValue?: number;
    }) =>
      api.patch(`/leads/${data.id}/stage`, {
        stage: data.stage,
        notes: data.notes,
        priority: data.priority,
        followUpDate: data.followUpDate || undefined,
        dealValue: data.dealValue,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-pipeline'] });
      setSelectedLead(null);
    },
    onError: (err: any) => alert(err.message || 'Failed to update lead status'),
  });

  // Quick move card stage mutation
  const quickMoveMutation = useMutation({
    mutationFn: (data: { id: string; stage: string }) =>
      api.patch(`/leads/${data.id}/stage`, { stage: data.stage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-pipeline'] });
    },
    onError: (err: any) => alert(err.message || 'Failed to move lead stage'),
  });

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: (data: any) => api.post('/contacts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-pipeline'] });
      setIsAddModalOpen(false);
      resetNewLeadForm();
    },
    onError: (err: any) => alert(err.message || 'Failed to create lead'),
  });

  const resetNewLeadForm = () => {
    setNewPhone('');
    setNewFirstName('');
    setNewLastName('');
    setNewEmail('');
    setNewCompanyName('');
    setNewStage('NEW');
    setNewPriority('MEDIUM');
    setNewDealValue('');
    setNewLeadSource('WhatsApp Direct');
    setNewFollowUp('');
    setNewNotes('');
  };

  const handleCopyPhone = (phone: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleOpenChat = (lead: LeadItem, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/inbox?search=${encodeURIComponent(lead.phone)}`);
  };

  const handleQuickMove = (lead: LeadItem, direction: 'next' | 'prev', e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = STAGES.findIndex((s) => s.key === lead.leadStatus);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (targetIndex >= 0 && targetIndex < STAGES.length) {
      quickMoveMutation.mutate({
        id: lead.id,
        stage: STAGES[targetIndex].key,
      });
    }
  };

  const openAddModal = (stageKey: string = 'NEW') => {
    setDefaultAddStage(stageKey);
    setNewStage(stageKey);
    setIsAddModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Leads Pipeline & Kanban CRM
                </h1>
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                  Live Deals
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Track customer sales journeys from first WhatsApp inquiry to closed-won deals.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 transition shadow-2xs"
            title="Refresh pipeline data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-emerald-500' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Add Lead Primary Button */}
          <button
            onClick={() => openAddModal('NEW')}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-sm shadow-emerald-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Lead</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Active Leads */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Pipeline</span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{metrics.totalLeads}</span>
            <span className="text-xs text-slate-400 font-medium">prospects</span>
          </div>
        </div>

        {/* Pipeline Value */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Est. Pipeline Value</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              ${metrics.totalValue.toLocaleString()}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">in deal pipeline</span>
          </div>
        </div>

        {/* High Priority */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">High Priority Deals</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{metrics.highPriorityCount}</span>
            <span className="text-xs text-slate-400 font-medium">urgent attention</span>
          </div>
        </div>

        {/* Won Rate */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Closed-Won Deals</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{metrics.wonCount}</span>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
              {metrics.winRate}% win rate
            </span>
          </div>
        </div>
      </div>

      {/* 3. Search and Priority Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/80 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search leads by name, phone, company, or note..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Priority Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Priority:
          </span>
          {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setPriorityFilter(lvl)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                priorityFilter === lvl
                  ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {lvl === 'ALL' ? 'All' : lvl.charAt(0) + lvl.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Kanban Horizontal Lanes */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-500">
          <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium">Loading sales pipeline...</p>
        </div>
      ) : (
        <div className="relative">
          {/* Scrollable container with fixed min-width columns to prevent squeezing */}
          <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start min-h-[calc(100vh-320px)] scrollbar-thin">
            {STAGES.map((col) => {
              const items = pipeline[col.key] || [];
              const IconComponent = col.icon;

              // Calculate total value for this stage
              const stageValue = items.reduce(
                (sum, it) => sum + (Number(it.customFields?.dealValue) || 0),
                0
              );

              return (
                <div
                  key={col.key}
                  className="w-[320px] min-w-[320px] shrink-0 flex flex-col rounded-2xl bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200/90 dark:border-slate-800/80 shadow-2xs transition-colors max-h-[calc(100vh-270px)]"
                >
                  {/* Column Header */}
                  <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xs rounded-t-2xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${col.dotBg} ring-4 ring-slate-100 dark:ring-slate-800`} />
                        <IconComponent className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <h2 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          {col.label}
                        </h2>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${col.badgeBg}`}>
                          {items.length}
                        </span>
                        <button
                          onClick={() => openAddModal(col.key)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition"
                          title={`Add new lead to ${col.label}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Stage Value Subtext */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-0.5">
                      <span>Total Value:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        ${stageValue.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Cards Container */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
                    {items.length === 0 ? (
                      <div className="text-center py-10 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-950/20">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-2">
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">No leads in this stage</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          Move cards here or add a new prospect.
                        </p>
                        <button
                          onClick={() => openAddModal(col.key)}
                          className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          <Plus className="w-3 h-3" /> Add Lead
                        </button>
                      </div>
                    ) : (
                      items.map((lead) => {
                        const fullName = lead.firstName || lead.lastName
                          ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim()
                          : 'Unnamed Prospect';
                        const initials = fullName
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase() || 'LP';
                        const dealVal = Number(lead.customFields?.dealValue) || 0;
                        const isOverdue = lead.followUpDate && new Date(lead.followUpDate) < new Date();

                        return (
                          <div
                            key={lead.id}
                            onClick={() => {
                              setSelectedLead(lead);
                              setTargetStage(lead.leadStatus);
                              setLeadNotes(lead.notes || '');
                              setLeadPriority(lead.priority || 'MEDIUM');
                              setLeadFollowUp(lead.followUpDate ? lead.followUpDate.split('T')[0] : '');
                              setLeadDealValue(lead.customFields?.dealValue ? String(lead.customFields.dealValue) : '');
                            }}
                            className="p-3.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800/90 hover:border-emerald-500/50 dark:hover:border-emerald-500/40 hover:shadow-md transition-all duration-200 cursor-pointer group space-y-2.5 relative"
                          >
                            {/* Card Top: Avatar + Name + Priority */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 shadow-2xs">
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <h3 className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                                    {fullName}
                                  </h3>
                                  {lead.companyName && (
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                      <Building2 className="w-2.5 h-2.5 shrink-0" />
                                      <span className="truncate">{lead.companyName}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Priority Badge */}
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1 ${
                                  lead.priority === 'HIGH'
                                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30'
                                    : lead.priority === 'LOW'
                                    ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                                }`}
                              >
                                {lead.priority === 'HIGH' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                                {lead.priority || 'MEDIUM'}
                              </span>
                            </div>

                            {/* WhatsApp Phone Pill & Copy Button */}
                            <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800/60">
                              <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] truncate">
                                {lead.phone}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyPhone(lead.phone, lead.id, e)}
                                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                                  title="Copy phone number"
                                >
                                  {copiedId === lead.id ? (
                                    <Check className="w-3 h-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenChat(lead, e)}
                                  className="p-1 rounded text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 transition"
                                  title="Open WhatsApp chat in Inbox"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Badges: Deal Value & Lead Source */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {dealVal > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                  <DollarSign className="w-2.5 h-2.5" />
                                  ${dealVal.toLocaleString()}
                                </span>
                              )}
                              {lead.leadSource && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                  {lead.leadSource}
                                </span>
                              )}
                              {lead.tags?.slice(0, 2).map((t) => (
                                <span
                                  key={t.tag.id}
                                  className="text-[9px] font-semibold px-1.5 py-0.2 rounded"
                                  style={{ backgroundColor: `${t.tag.color}20`, color: t.tag.color }}
                                >
                                  {t.tag.name}
                                </span>
                              ))}
                            </div>

                            {/* Notes Snippet */}
                            {lead.notes && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 bg-slate-50/80 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800/60 italic">
                                "{lead.notes}"
                              </p>
                            )}

                            {/* Card Footer: Follow-up + Quick Stage Controls */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                              {/* Follow Up Date */}
                              <div className="flex items-center gap-1">
                                {lead.followUpDate ? (
                                  <span
                                    className={`flex items-center gap-1 font-medium ${
                                      isOverdue
                                        ? 'text-rose-600 dark:text-rose-400'
                                        : 'text-amber-600 dark:text-amber-400'
                                    }`}
                                  >
                                    <Calendar className="w-3 h-3" />
                                    <span>
                                      {isOverdue ? 'Overdue: ' : 'Due: '}
                                      {new Date(lead.followUpDate).toLocaleDateString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                      })}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[10px] flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" /> No follow-up
                                  </span>
                                )}
                              </div>

                              {/* Quick Move Buttons */}
                              <div className="flex items-center gap-0.5">
                                {col.key !== 'NEW' && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleQuickMove(lead, 'prev', e)}
                                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    title="Move to previous stage"
                                  >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {col.key !== 'LOST' && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleQuickMove(lead, 'next', e)}
                                    className="p-1 rounded-md text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    title="Move to next stage"
                                  >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Edit Stage / Lead Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Update Lead: {selectedLead.firstName || selectedLead.phone}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Move across pipeline stages, update estimated deal value, and log customer notes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
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
                  dealValue: leadDealValue ? Number(leadDealValue) : undefined,
                });
              }}
              className="space-y-3.5"
            >
              {/* Stage & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pipeline Stage *
                  </label>
                  <select
                    value={targetStage}
                    onChange={(e) => setTargetStage(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    {STAGES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <select
                    value={leadPriority}
                    onChange={(e) => setLeadPriority(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High Priority</option>
                  </select>
                </div>
              </div>

              {/* Deal Value & Follow Up */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Estimated Deal Value ($)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={leadDealValue}
                      onChange={(e) => setLeadDealValue(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Next Follow-Up Date
                  </label>
                  <input
                    type="date"
                    value={leadFollowUp}
                    onChange={(e) => setLeadFollowUp(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Activity / Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Activity & Lead Notes
                </label>
                <textarea
                  rows={3}
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  placeholder="Record customer interest, pricing discussions, or next call agenda..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 resize-none focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/inbox?search=${encodeURIComponent(selectedLead.phone)}`);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Open WhatsApp Conversation
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedLead(null)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateStageMutation.isPending}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
                  >
                    {updateStageMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Add New Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Add New Lead Prospect
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Add a new contact to your WhatsApp sales pipeline.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createLeadMutation.mutate({
                  phone: newPhone.trim(),
                  firstName: newFirstName.trim() || undefined,
                  lastName: newLastName.trim() || undefined,
                  email: newEmail.trim() || undefined,
                  companyName: newCompanyName.trim() || undefined,
                  leadStatus: newStage,
                  priority: newPriority,
                  leadSource: newLeadSource,
                  followUpDate: newFollowUp || undefined,
                  notes: newNotes.trim() || undefined,
                  customFields: newDealValue ? { dealValue: Number(newDealValue) } : undefined,
                });
              }}
              className="space-y-3.5"
            >
              {/* Phone * */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  WhatsApp Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567 or +91 9876543210"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Names */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">First Name</label>
                  <input
                    type="text"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="e.g. Sarah"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="e.g. Connor"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Email & Company */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="sarah@example.com"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Company</label>
                  <input
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="Cyberdyne Systems"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Stage & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Pipeline Stage *</label>
                  <select
                    value={newStage}
                    onChange={(e) => setNewStage(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    {STAGES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High Priority</option>
                  </select>
                </div>
              </div>

              {/* Deal Value & Lead Source */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Estimated Deal Value ($)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={newDealValue}
                      onChange={(e) => setNewDealValue(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Lead Source</label>
                  <select
                    value={newLeadSource}
                    onChange={(e) => setNewLeadSource(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="WhatsApp Direct">WhatsApp Direct</option>
                    <option value="Website Form">Website Form</option>
                    <option value="Campaign Referral">Campaign Referral</option>
                    <option value="Outbound Call">Outbound Call</option>
                    <option value="Partner">Partner</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Follow Up Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Next Follow-Up Date
                </label>
                <input
                  type="date"
                  value={newFollowUp}
                  onChange={(e) => setNewFollowUp(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Initial Notes</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Record customer interest, requirements, or next steps..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 resize-none focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLeadMutation.isPending}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
                >
                  {createLeadMutation.isPending ? 'Creating...' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsPage;
