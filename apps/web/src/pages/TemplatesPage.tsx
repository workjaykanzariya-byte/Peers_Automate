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
  Sliders,
  Sparkles,
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components: any;
  variableCount: number;
  updatedAt?: string;
  lastSyncedAt?: string;
}

export const TemplatesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Template Draft State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('MARKETING');
  const [language, setLanguage] = useState('en_US');
  const [bodyText, setBodyText] = useState('Hello {{1}}, welcome to {{2}}! Your order is confirmed.');
  const [footerText, setFooterText] = useState('Reply STOP to unsubscribe');

  const { data: templates = [], isLoading, refetch, isFetching } = useQuery<Template[]>({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates'),
  });

  const syncMutation = useMutation({
    mutationFn: () => api.post('/templates/sync'),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      alert(data?.message || `Synchronized ${data?.count ?? 0} templates successfully from Meta!`);
    },
    onError: (err: any) => {
      const msg = Array.isArray(err.message) ? err.message.join(', ') : err.message || 'Failed to sync templates with Meta';
      alert(`Sync error: ${msg}`);
    },
  });

  const createDraftMutation = useMutation({
    mutationFn: (data: any) => api.post('/templates', data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      alert(`Template "${name}" created successfully! Status: ${data?.status || 'APPROVED'}`);
      setIsCreateModalOpen(false);
      setName('');
      setBodyText('Hello {{1}}, welcome to {{2}}! Your order is confirmed.');
      setFooterText('Reply STOP to unsubscribe');
    },
    onError: (err: any) => {
      const msg = Array.isArray(err.message) ? err.message.join(', ') : err.message || 'Failed to save template';
      alert(`Error saving template: ${msg}`);
    },
  });

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter ? t.category === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </span>
        );
      case 'PENDING':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            <Clock className="w-3 h-3" />
            Pending Review
          </span>
        );
      case 'REJECTED':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" />
            Rejected
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

  const extractBody = (components: any[]) => {
    if (!Array.isArray(components)) return '';
    const body = components.find((c) => c.type === 'BODY');
    return body?.text || '';
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FileCode className="w-6 h-6 text-emerald-400" />
            WhatsApp Message Templates
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Meta-approved high-throughput templates required for initiating conversations and sending broadcasts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || isFetching}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${syncMutation.isPending || isFetching ? 'animate-spin text-emerald-400' : ''}`}
            />
            Sync from Meta
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            New Template Draft
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search templates by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex items-center gap-2">
          {['', 'MARKETING', 'UTILITY', 'AUTHENTICATION'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                categoryFilter === cat
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
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
          <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin mx-auto mb-3" />
          Loading message templates...
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
          <FileCode className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <h3 className="text-base font-bold text-white mb-1">No Templates Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            Click "Sync from Meta" to fetch templates registered in your Meta WhatsApp Manager or create a new template draft.
          </p>
          <button
            onClick={() => syncMutation.mutate()}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition"
          >
            Sync from Meta Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="flex flex-col justify-between bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-5 transition shadow-lg space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-sm text-white">{template.name}</h3>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      {template.language} • {template.category}
                    </span>
                  </div>
                  {getStatusBadge(template.status)}
                </div>

                {/* WhatsApp Chat Bubble Mock Preview */}
                <div className="bg-[#0b141a] rounded-xl p-3.5 border border-slate-800/80 space-y-2 mt-3 text-xs">
                  <div className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {extractBody(template.components) || 'No body content'}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span>Variables: {template.variableCount}</span>
                    <span>12:00 PM</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                <span>Updated: {template.updatedAt || template.lastSyncedAt ? new Date(template.updatedAt || template.lastSyncedAt).toLocaleDateString() : 'Recent'}</span>
                <button
                  onClick={() => setSelectedTemplate(template)}
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Draft Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileCode className="w-5 h-5 text-emerald-400" />
                Draft WhatsApp Message Template
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Draft template format with dynamic placeholders like <code className="text-emerald-400 font-mono">&#123;&#123;1&#125;&#125;</code>.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createDraftMutation.mutate({
                  name,
                  category,
                  language,
                  components: [
                    { type: 'BODY', text: bodyText },
                    ...(footerText ? [{ type: 'FOOTER', text: footerText }] : []),
                  ],
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Template Name (lowercase with underscores) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="order_confirmation_v1"
                  value={name}
                  onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                  >
                    <option value="MARKETING">MARKETING</option>
                    <option value="UTILITY">UTILITY</option>
                    <option value="AUTHENTICATION">AUTHENTICATION</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                  >
                    <option value="en_US">English (en_US)</option>
                    <option value="es_ES">Spanish (es_ES)</option>
                    <option value="hi_IN">Hindi (hi_IN)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Body Text (Use &#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125; for parameters) *
                </label>
                <textarea
                  rows={4}
                  required
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 resize-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Footer Text</label>
                <input
                  type="text"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDraftMutation.isPending}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
                >
                  {createDraftMutation.isPending ? 'Saving...' : 'Save Template Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
