import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  FileCode,
  RefreshCw,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  X,
  ChevronRight,
  ChevronLeft,
  Smartphone,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link as LinkIcon,
  PhoneCall,
  MessageSquare,
  Sparkles,
  Info,
  Check,
  Copy,
} from 'lucide-react';

interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO';
  text?: string;
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

interface Template {
  id: string;
  metaTemplateId?: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components: TemplateComponent[];
  variableCount: number;
  updatedAt?: string;
  lastSyncedAt?: string;
}

export const TemplatesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // --- Multi-Step Wizard State (Matches Reshobrand 5-Step Architecture) ---
  const [currentStep, setCurrentStep] = useState<number>(1);
  
  // Step 1: Basic Info
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('MARKETING');
  const [language, setLanguage] = useState('en_US');

  // Step 2: Header
  const [includeHeader, setIncludeHeader] = useState(false);
  const [headerType, setHeaderType] = useState<'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO'>('TEXT');
  const [headerText, setHeaderText] = useState('');

  // Step 3: Message Body
  const [bodyText, setBodyText] = useState('Hello {{1}}, thank you for choosing our services! Your request code is {{2}}.');

  // Step 4: Footer
  const [includeFooter, setIncludeFooter] = useState(true);
  const [footerText, setFooterText] = useState('Reply STOP to unsubscribe');

  // Step 5: Buttons
  const [includeButtons, setIncludeButtons] = useState(false);
  const [buttonType, setButtonType] = useState<'QUICK_REPLY' | 'CTA'>('QUICK_REPLY');
  const [quickReplies, setQuickReplies] = useState<string[]>(['Yes, interested', 'Talk to human']);
  const [ctaButtons, setCtaButtons] = useState<Array<{ type: 'URL' | 'PHONE_NUMBER'; text: string; value: string }>>([
    { type: 'URL', text: 'Visit Website', value: 'https://example.com/promo' },
  ]);

  // Fetch templates from backend
  const { data: templates = [], isLoading, refetch, isFetching } = useQuery<Template[]>({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates'),
  });

  // Sync templates from Meta
  const syncMutation = useMutation({
    mutationFn: () => api.post('/templates/sync'),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      alert(data?.message || `Successfully synchronized ${data?.count ?? 0} templates from Meta Cloud API!`);
    },
    onError: (err: any) => {
      const msg = Array.isArray(err.message) ? err.message.join(', ') : err.message || 'Failed to sync templates with Meta';
      alert(`Meta Sync Error: ${msg}`);
    },
  });

  // Submit template for Meta review
  const submitTemplateMutation = useMutation({
    mutationFn: (payload: any) => api.post('/templates', payload),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      alert(
        `Template "${name}" submitted to Meta for review successfully!\nStatus: ${data?.status || 'PENDING'}\nMeta Review usually completes within 24 hours.`
      );
      resetWizard();
    },
    onError: (err: any) => {
      const msg = Array.isArray(err.message) ? err.message.join(', ') : err.message || 'Failed to submit template to Meta';
      alert(`Submission Error: ${msg}`);
    },
  });

  const resetWizard = () => {
    setIsCreateWizardOpen(false);
    setCurrentStep(1);
    setName('');
    setCategory('MARKETING');
    setLanguage('en_US');
    setIncludeHeader(false);
    setHeaderType('TEXT');
    setHeaderText('');
    setBodyText('Hello {{1}}, thank you for choosing our services! Your request code is {{2}}.');
    setIncludeFooter(true);
    setFooterText('Reply STOP to unsubscribe');
    setIncludeButtons(false);
    setButtonType('QUICK_REPLY');
    setQuickReplies(['Yes, interested', 'Talk to human']);
    setCtaButtons([{ type: 'URL', text: 'Visit Website', value: 'https://example.com/promo' }]);
  };

  // Helper to append variable {{1}}, {{2}} to body or header
  const handleAddBodyVariable = () => {
    const matches = bodyText.match(/{{\d+}}/g) || [];
    const nextVar = matches.length + 1;
    setBodyText((prev) => `${prev} {{${nextVar}}}`);
  };

  const handleAddHeaderVariable = () => {
    if (!headerText.includes('{{1}}')) {
      setHeaderText((prev) => `${prev} {{1}}`);
    }
  };

  // Formatting helpers for text selection or append
  const applyFormatting = (prefix: string, suffix: string) => {
    setBodyText((prev) => `${prev} ${prefix}sample${suffix}`);
  };

  // Construct Meta Components Payload
  const handleFinalSubmit = () => {
    if (!name.trim()) {
      alert('Please enter a valid template name.');
      setCurrentStep(1);
      return;
    }
    if (!bodyText.trim()) {
      alert('Message body content cannot be empty.');
      setCurrentStep(3);
      return;
    }

    const components: any[] = [];

    // Header component
    if (includeHeader) {
      if (headerType === 'TEXT' && headerText.trim()) {
        components.push({
          type: 'HEADER',
          format: 'TEXT',
          text: headerText.trim(),
        });
      } else if (headerType !== 'TEXT') {
        components.push({
          type: 'HEADER',
          format: headerType,
        });
      }
    }

    // Body component (Required)
    components.push({
      type: 'BODY',
      text: bodyText.trim(),
    });

    // Footer component
    if (includeFooter && footerText.trim()) {
      components.push({
        type: 'FOOTER',
        text: footerText.trim(),
      });
    }

    // Buttons component
    if (includeButtons) {
      if (buttonType === 'QUICK_REPLY') {
        const validButtons = quickReplies.filter((b) => b.trim());
        if (validButtons.length > 0) {
          components.push({
            type: 'BUTTONS',
            buttons: validButtons.map((b) => ({
              type: 'QUICK_REPLY',
              text: b.trim().substring(0, 25),
            })),
          });
        }
      } else {
        const validCtas = ctaButtons.filter((b) => b.text.trim() && b.value.trim());
        if (validCtas.length > 0) {
          components.push({
            type: 'BUTTONS',
            buttons: validCtas.map((b) => ({
              type: b.type,
              text: b.text.trim().substring(0, 25),
              ...(b.type === 'URL' ? { url: b.value.trim() } : { phone_number: b.value.trim() }),
            })),
          });
        }
      }
    }

    submitTemplateMutation.mutate({
      name: name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      category,
      language,
      components,
    });
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter ? t.category === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved
          </span>
        );
      case 'PENDING':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-yellow-500/10 text-amber-600 dark:text-yellow-400 border border-amber-200 dark:border-yellow-500/30">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            In Review (Pending)
          </span>
        );
      case 'REJECTED':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {status}
          </span>
        );
    }
  };

  const extractBody = (components: any[]) => {
    if (!Array.isArray(components)) return '';
    const body = components.find((c) => c.type === 'BODY');
    return body?.text || '';
  };

  const extractHeader = (components: any[]) => {
    if (!Array.isArray(components)) return null;
    return components.find((c) => c.type === 'HEADER');
  };

  const extractFooter = (components: any[]) => {
    if (!Array.isArray(components)) return null;
    const footer = components.find((c) => c.type === 'FOOTER');
    return footer?.text || null;
  };

  const extractButtons = (components: any[]) => {
    if (!Array.isArray(components)) return [];
    const btnComp = components.find((c) => c.type === 'BUTTONS');
    return btnComp?.buttons || [];
  };

  const copyTemplateId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <FileCode className="w-6 h-6 text-emerald-500" />
            WhatsApp Message Templates
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Meta-approved high-throughput message templates for customer care, broadcast campaigns, and automated bot notifications.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || isFetching}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition shadow-xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${syncMutation.isPending || isFetching ? 'animate-spin text-emerald-500' : ''}`}
            />
            Sync from Meta
          </button>
          <button
            onClick={() => setIsCreateWizardOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {['', 'MARKETING', 'UTILITY', 'AUTHENTICATION'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                categoryFilter === cat
                  ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/40 shadow-xs'
                  : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {cat || 'All Categories'}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500">
          <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
          Loading message templates...
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 shadow-xs">
          <FileCode className="w-12 h-12 mx-auto mb-3 text-slate-400 dark:text-slate-600" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">No Templates Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
            Click "Sync from Meta" to fetch templates registered under your WABA or create a new template and submit it for Meta review.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => syncMutation.mutate()}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition"
            >
              Sync from Meta
            </button>
            <button
              onClick={() => setIsCreateWizardOpen(true)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
            >
              Create New Template
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTemplates.map((template) => {
            const headerComp = extractHeader(template.components);
            const footer = extractFooter(template.components);
            const buttons = extractButtons(template.components);

            return (
              <div
                key={template.id}
                className="flex flex-col justify-between bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-5 transition shadow-xs hover:shadow-md space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm break-all">
                        {template.name}
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-1 uppercase font-mono">
                        <span>{template.language}</span>
                        <span>•</span>
                        <span>{template.category}</span>
                      </div>
                    </div>
                    {getStatusBadge(template.status)}
                  </div>

                  {/* WhatsApp Chat Bubble Mock Preview */}
                  <div className="bg-[#efeae2] dark:bg-[#0b141a] rounded-xl p-3 border border-slate-200 dark:border-slate-800/80 space-y-2 mt-3 text-xs shadow-inner">
                    {/* Header preview */}
                    {headerComp && headerComp.format === 'TEXT' && headerComp.text && (
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-[12px] border-b border-black/5 dark:border-white/5 pb-1">
                        {headerComp.text}
                      </div>
                    )}
                    {headerComp && headerComp.format !== 'TEXT' && (
                      <div className="p-2 rounded bg-black/5 dark:bg-white/5 text-[10px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <Smartphone className="w-3 h-3 text-emerald-500" />
                        Header Media [{headerComp.format}]
                      </div>
                    )}

                    {/* Body preview */}
                    <div className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap text-[12px]">
                      {extractBody(template.components) || 'No body content'}
                    </div>

                    {/* Footer preview */}
                    {footer && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                        {footer}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-black/5 dark:border-white/5">
                      <span>Variables: {template.variableCount}</span>
                      <span>13:35</span>
                    </div>

                    {/* Buttons preview */}
                    {buttons.length > 0 && (
                      <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-1">
                        {buttons.map((btn: any, idx: number) => (
                          <div
                            key={idx}
                            className="w-full py-1 rounded bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
                          >
                            {btn.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>
                    Updated: {template.updatedAt ? new Date(template.updatedAt).toLocaleDateString() : template.lastSyncedAt ? new Date(template.lastSyncedAt).toLocaleDateString() : 'Recent'}
                  </span>
                  <button
                    onClick={() => setSelectedTemplate(template)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 font-semibold transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESHOBRAND-STYLE 5-STEP TEMPLATE CREATION WIZARD (MODAL)                  */}
      {/* ========================================================================= */}
      {isCreateWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
            {/* Wizard Header Bar */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Create WhatsApp Message Template
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Follow the Meta WhatsApp Cloud API specifications to author and submit your template for approval.
                  </p>
                </div>
              </div>
              <button
                onClick={resetWizard}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Reshobrand 5-Step Stepper Indicator Bar */}
            <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between max-w-3xl mx-auto">
                {[
                  { step: 1, label: 'Basic Info' },
                  { step: 2, label: 'Header' },
                  { step: 3, label: 'Message Body' },
                  { step: 4, label: 'Footer' },
                  { step: 5, label: 'Buttons' },
                ].map((s, index, arr) => (
                  <React.Fragment key={s.step}>
                    <button
                      onClick={() => setCurrentStep(s.step)}
                      className="flex flex-col sm:flex-row items-center gap-2 group cursor-pointer"
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                          currentStep === s.step
                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30'
                            : currentStep > s.step
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}
                      >
                        {currentStep > s.step ? <Check className="w-4 h-4" /> : s.step}
                      </div>
                      <span
                        className={`text-xs font-semibold ${
                          currentStep === s.step
                            ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                            : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                        }`}
                      >
                        {s.label}
                      </span>
                    </button>
                    {index < arr.length - 1 && (
                      <div className="flex-1 h-0.5 mx-2 bg-slate-200 dark:bg-slate-800 hidden sm:block" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Wizard Body: 2 Columns (Form on Left, Sticky WhatsApp Preview on Right) */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Form Controls (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                {/* STEP 1: BASIC INFO */}
                {currentStep === 1 && (
                  <div className="space-y-5 animate-fade-in">
                    <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-start gap-3">
                      <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                          Basic Information
                        </h4>
                        <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
                          Enter the essential details such as template name, language, and category to identify your message in Meta WhatsApp Manager.
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Template Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. order_status_update or promo_diwali_2026"
                        value={name}
                        onChange={(e) =>
                          setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                        }
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Use only lowercase letters, numbers, and underscores (_). Spaces and special characters are not permitted by Meta.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Languages *
                        </label>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="en_US">English (US) - en_US</option>
                          <option value="en_GB">English (UK) - en_GB</option>
                          <option value="hi_IN">Hindi (India) - hi_IN</option>
                          <option value="es_ES">Spanish (Spain) - es_ES</option>
                          <option value="pt_BR">Portuguese (Brazil) - pt_BR</option>
                          <option value="ar">Arabic - ar</option>
                          <option value="fr_FR">French - fr_FR</option>
                          <option value="de_DE">German - de_DE</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Category *
                        </label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value as any)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="MARKETING">Marketing (Offers, updates, sales)</option>
                          <option value="UTILITY">Utility (Account alerts, order updates)</option>
                          <option value="AUTHENTICATION">Authentication (OTPs, logins)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: HEADER CONFIGURATION */}
                {currentStep === 2 && (
                  <div className="space-y-5 animate-fade-in">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-emerald-500" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">
                            Header Configuration
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Add an optional header — text, image, document, or video — to make your message stand out.
                          </p>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={includeHeader}
                          onChange={(e) => setIncludeHeader(e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        Include Header
                      </label>
                    </div>

                    {includeHeader && (
                      <div className="space-y-4 pt-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Header Type
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                            {(['TEXT', 'IMAGE', 'DOCUMENT', 'VIDEO'] as const).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setHeaderType(t)}
                                className={`py-2 text-xs font-semibold rounded-xl border transition ${
                                  headerType === t
                                    ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>

                        {headerType === 'TEXT' ? (
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Header Text (max 60 characters)
                              </label>
                              <button
                                type="button"
                                onClick={handleAddHeaderVariable}
                                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                              >
                                + Add Variable &#123;&#123;1&#125;&#125;
                              </button>
                            </div>
                            <input
                              type="text"
                              maxLength={60}
                              placeholder="e.g. Special Announcement for {{1}}"
                              value={headerText}
                              onChange={(e) => setHeaderText(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                            />
                            <div className="text-right text-[10px] text-slate-400 mt-1">
                              {headerText.length}/60 Characters
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                            Meta requires media headers ([{headerType}]) to be provided as dynamic URLs or Media IDs during campaign dispatch.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3: MESSAGE BODY */}
                {currentStep === 3 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                      <MessageSquare className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">
                          Message Body Content *
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Write the main message text. You can add variables like &#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125; to personalize values like customer name, order number, or tracking code.
                        </p>
                      </div>
                    </div>

                    {/* Reshobrand Formatting Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => applyFormatting('*', '*')}
                          title="Bold (*text*)"
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-bold"
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => applyFormatting('_', '_')}
                          title="Italic (_text_)"
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs"
                        >
                          <Italic className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => applyFormatting('~', '~')}
                          title="Strikethrough (~text~)"
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs"
                        >
                          <Strikethrough className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => applyFormatting('```', '```')}
                          title="Monospace (```text```)"
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs"
                        >
                          <Code className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddBodyVariable}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Variable
                      </button>
                    </div>

                    <div>
                      <textarea
                        rows={6}
                        required
                        maxLength={1024}
                        value={bodyText}
                        onChange={(e) => setBodyText(e.target.value)}
                        placeholder="Type message content here. Use {{1}}, {{2}} for dynamic tags..."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-xs text-slate-900 dark:text-slate-100 font-mono leading-relaxed focus:outline-none focus:border-emerald-500"
                      />
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-mono">
                        <span>Variables: 1, 2, etc. | Formatting: *bold*, _italic_, ~strike~, ```code```</span>
                        <span>{bodyText.length}/1024 Characters</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: FOOTER */}
                {currentStep === 4 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">
                          Footer Configuration
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Add an optional footer message (e.g., unsubscribe notice or disclaimer).
                        </p>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={includeFooter}
                          onChange={(e) => setIncludeFooter(e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        Include Footer
                      </label>
                    </div>

                    {includeFooter && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Footer Text (max 60 characters)
                        </label>
                        <input
                          type="text"
                          maxLength={60}
                          placeholder="e.g. Reply STOP to opt out"
                          value={footerText}
                          onChange={(e) => setFooterText(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                        />
                        <div className="text-right text-[10px] text-slate-400 mt-1">
                          {footerText.length}/60 Characters
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 5: BUTTONS */}
                {currentStep === 5 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">
                          Interactive Buttons
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Add quick replies or call-to-action buttons (Website URL or Phone Call) to maximize customer engagement.
                        </p>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={includeButtons}
                          onChange={(e) => setIncludeButtons(e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        Include Buttons
                      </label>
                    </div>

                    {includeButtons && (
                      <div className="space-y-4 pt-2">
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="radio"
                              name="btnType"
                              checked={buttonType === 'QUICK_REPLY'}
                              onChange={() => setButtonType('QUICK_REPLY')}
                              className="text-emerald-600"
                            />
                            Quick Reply (up to 3)
                          </label>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="radio"
                              name="btnType"
                              checked={buttonType === 'CTA'}
                              onChange={() => setButtonType('CTA')}
                              className="text-emerald-600"
                            />
                            Call to Action (Website / Phone)
                          </label>
                        </div>

                        {buttonType === 'QUICK_REPLY' ? (
                          <div className="space-y-2">
                            {quickReplies.map((qr, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  maxLength={25}
                                  placeholder={`Quick reply ${idx + 1}`}
                                  value={qr}
                                  onChange={(e) => {
                                    const next = [...quickReplies];
                                    next[idx] = e.target.value;
                                    setQuickReplies(next);
                                  }}
                                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                                />
                                {quickReplies.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setQuickReplies(quickReplies.filter((_, i) => i !== idx))}
                                    className="p-2 text-slate-400 hover:text-rose-500"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                            {quickReplies.length < 3 && (
                              <button
                                type="button"
                                onClick={() => setQuickReplies([...quickReplies, ''])}
                                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 mt-1"
                              >
                                + Add Quick Reply
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {ctaButtons.map((cta, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    CTA Button #{idx + 1}
                                  </span>
                                  {ctaButtons.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => setCtaButtons(ctaButtons.filter((_, i) => i !== idx))}
                                      className="text-slate-400 hover:text-rose-500"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <select
                                    value={cta.type}
                                    onChange={(e) => {
                                      const next = [...ctaButtons];
                                      next[idx].type = e.target.value as any;
                                      setCtaButtons(next);
                                    }}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                                  >
                                    <option value="URL">Visit Website</option>
                                    <option value="PHONE_NUMBER">Call Phone</option>
                                  </select>
                                  <input
                                    type="text"
                                    maxLength={25}
                                    placeholder="Button label"
                                    value={cta.text}
                                    onChange={(e) => {
                                      const next = [...ctaButtons];
                                      next[idx].text = e.target.value;
                                      setCtaButtons(next);
                                    }}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                                  />
                                  <input
                                    type="text"
                                    placeholder={cta.type === 'URL' ? 'https://...' : '+1234567890'}
                                    value={cta.value}
                                    onChange={(e) => {
                                      const next = [...ctaButtons];
                                      next[idx].value = e.target.value;
                                      setCtaButtons(next);
                                    }}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono"
                                  />
                                </div>
                              </div>
                            ))}
                            {ctaButtons.length < 2 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setCtaButtons([
                                    ...ctaButtons,
                                    { type: 'PHONE_NUMBER', text: 'Call Us', value: '+15551234567' },
                                  ])
                                }
                                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                              >
                                + Add CTA Button
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Sticky Realistic WhatsApp Preview (5 cols) */}
              <div className="lg:col-span-5">
                <div className="sticky top-2 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Eye className="w-4 h-4 text-emerald-500" />
                    <span>Live WhatsApp Template Preview</span>
                  </div>

                  {/* Phone Screen Mockup */}
                  <div className="bg-[#efeae2] dark:bg-[#0b141a] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-inner">
                    {/* Chat Bubble with WhatsApp tail */}
                    <div className="bg-white dark:bg-[#1f2c34] rounded-2xl rounded-tl-none p-3.5 shadow-sm space-y-2 border border-black/5 dark:border-white/5 max-w-sm">
                      {/* Header */}
                      {includeHeader && (
                        <div>
                          {headerType === 'TEXT' && headerText && (
                            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs border-b border-black/5 dark:border-white/5 pb-1.5">
                              {headerText}
                            </h4>
                          )}
                          {headerType !== 'TEXT' && (
                            <div className="h-28 rounded-xl bg-slate-200 dark:bg-slate-800/80 flex flex-col items-center justify-center text-slate-500 text-[11px] gap-1 border border-dashed border-slate-300 dark:border-slate-700">
                              <Smartphone className="w-5 h-5 text-emerald-500" />
                              <span>Attached {headerType} Header</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Body Content */}
                      <p className="text-slate-800 dark:text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">
                        {bodyText || 'Enter your message body...'}
                      </p>

                      {/* Footer */}
                      {includeFooter && footerText && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                          {footerText}
                        </p>
                      )}

                      {/* Timestamp */}
                      <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400 pt-1">
                        <span>13:35</span>
                        <Check className="w-3 h-3 text-emerald-500" />
                      </div>
                    </div>

                    {/* Action Buttons Attached to Bubble */}
                    {includeButtons && (
                      <div className="mt-1.5 space-y-1 max-w-sm">
                        {buttonType === 'QUICK_REPLY' &&
                          quickReplies.filter(Boolean).map((btn, idx) => (
                            <div
                              key={idx}
                              className="w-full py-2 bg-white dark:bg-[#1f2c34] rounded-xl text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 shadow-xs border border-black/5 dark:border-white/5"
                            >
                              {btn}
                            </div>
                          ))}
                        {buttonType === 'CTA' &&
                          ctaButtons.filter((b) => b.text.trim()).map((btn, idx) => (
                            <div
                              key={idx}
                              className="w-full py-2 bg-white dark:bg-[#1f2c34] rounded-xl text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 shadow-xs border border-black/5 dark:border-white/5 flex items-center justify-center gap-1.5"
                            >
                              {btn.type === 'URL' ? (
                                <LinkIcon className="w-3.5 h-3.5" />
                              ) : (
                                <PhoneCall className="w-3.5 h-3.5" />
                              )}
                              <span>{btn.text}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Wizard Bottom Actions */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                disabled={currentStep === 1}
                className={`px-4 py-2 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5 ${
                  currentStep === 1
                    ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Step {currentStep} of 5
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetWizard}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Cancel
                </button>
                {currentStep < 5 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep((prev) => Math.min(5, prev + 1))}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 shadow-sm"
                  >
                    Next Step
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={submitTemplateMutation.isPending}
                    className="px-6 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm flex items-center gap-2"
                  >
                    {submitTemplateMutation.isPending ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        Submitting to Meta...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Submit for Meta Approval
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TEMPLATE DETAILS INSPECTION MODAL (FIXED & FUNCTIONAL VIEW BUTTON)         */}
      {/* ========================================================================= */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {selectedTemplate.name}
                    {getStatusBadge(selectedTemplate.status)}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Category: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedTemplate.category}</span> • Language: <span className="font-mono text-slate-700 dark:text-slate-300">{selectedTemplate.language}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Meta Template ID with Copy Action */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                    Meta Template ID
                  </span>
                  <code className="text-slate-800 dark:text-slate-200 font-mono font-semibold">
                    {selectedTemplate.metaTemplateId || selectedTemplate.id}
                  </code>
                </div>
                <button
                  onClick={() => copyTemplateId(selectedTemplate.metaTemplateId || selectedTemplate.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-semibold transition"
                >
                  {copiedId ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy ID</span>
                    </>
                  )}
                </button>
              </div>

              {/* Visual Chat Bubble Mockup */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Full Template Appearance
                </h4>
                <div className="bg-[#efeae2] dark:bg-[#0b141a] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-inner">
                  <div className="bg-white dark:bg-[#1f2c34] rounded-2xl rounded-tl-none p-4 shadow-sm space-y-2 border border-black/5 dark:border-white/5">
                    {extractHeader(selectedTemplate.components) && (
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs border-b border-black/5 dark:border-white/5 pb-1.5">
                        {extractHeader(selectedTemplate.components)?.text || `[${extractHeader(selectedTemplate.components)?.format} Header]`}
                      </h4>
                    )}
                    <p className="text-slate-800 dark:text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">
                      {extractBody(selectedTemplate.components)}
                    </p>
                    {extractFooter(selectedTemplate.components) && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                        {extractFooter(selectedTemplate.components)}
                      </p>
                    )}
                    <div className="flex items-center justify-end text-[9px] text-slate-400 pt-1">
                      <span>13:35</span>
                    </div>
                  </div>

                  {extractButtons(selectedTemplate.components).length > 0 && (
                    <div className="mt-1.5 space-y-1">
                      {extractButtons(selectedTemplate.components).map((btn: any, idx: number) => (
                        <div
                          key={idx}
                          className="w-full py-2 bg-white dark:bg-[#1f2c34] rounded-xl text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 shadow-xs border border-black/5 dark:border-white/5"
                        >
                          {btn.text} {btn.url ? `(🔗 ${btn.url})` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Component JSON Specification */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Raw Component Specification
                </h4>
                <pre className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto max-h-48">
                  {JSON.stringify(selectedTemplate.components, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Created: {new Date(selectedTemplate.updatedAt || Date.now()).toLocaleDateString()}
              </span>
              <button
                type="button"
                onClick={() => setSelectedTemplate(null)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
