import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Layers,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface ModuleInfo {
  title: string;
  badge: string;
  phase: string;
  description: string;
  capabilities: string[];
}

const MODULES_MAP: Record<string, ModuleInfo> = {
  '/whatsapp': {
    title: 'WhatsApp Connection & Assets',
    badge: 'Phase 2 Milestone',
    phase: 'Target: Phase 2',
    description:
      'Official Meta Embedded Signup OAuth flow, WABA phone number management, quality tier status, and real-time connectivity testing.',
    capabilities: [
      'Meta OAuth 2.0 Embedded Signup handshake',
      'Display verified business name & phone number ID',
      'Quality rating (GREEN / YELLOW / RED) monitoring',
      'One-click WhatsApp test-message diagnostic utility',
      'Encrypted token storage with AES-256-GCM',
    ],
  },
  '/inbox': {
    title: 'Omnichannel Customer Inbox',
    badge: 'Phase 5 Milestone',
    phase: 'Target: Phase 5',
    description:
      'Real-time WhatsApp customer conversation stream, 24-hour service window tracking, agent assignment, and template outbound messages.',
    capabilities: [
      'Multi-agent conversation queue with status filters (Open / Pending / Resolved)',
      'Live message stream with sent/delivered/read status ticks',
      '24-hour customer care window countdown timer',
      'Template-based outbound message dispatch for expired windows',
      'Contact lead card drawer and internal team notes',
    ],
  },
  '/automations': {
    title: 'Bot Flow & Chatbot Engine',
    badge: 'Phase 6 Milestone',
    phase: 'Target: Phase 6',
    description:
      'Interactive visual automation flow builder, trigger routing (keyword match, fallback, external webhook), and conditional logic.',
    capabilities: [
      'Visual node flow composition editor',
      'Trigger on inbound message keyword, regex, or new contact',
      'Interactive reply buttons and list message actions',
      'Automated conversation routing and agent assignment',
      'Flow execution audit log with error diagnostics',
    ],
  },
  '/contacts': {
    title: 'Contacts & CSV Import Pipeline',
    badge: 'Phase 3 Milestone',
    phase: 'Target: Phase 3',
    description:
      'Normalized customer directory (E.164), dynamic tags, custom attributes, and chunked background CSV import queue via BullMQ.',
    capabilities: [
      'Searchable contact directory with pagination and custom fields',
      'E.164 phone normalization and country code auto-detection',
      'Chunked asynchronous CSV file upload pipeline',
      'Duplicate resolution rules (skip, overwrite, merge tags)',
      'Downloadable CSV error reports for invalid records',
    ],
  },
  '/templates': {
    title: 'WhatsApp Message Templates',
    badge: 'Phase 4 Milestone',
    phase: 'Target: Phase 4',
    description:
      'Bi-directional synchronization of Meta approved templates, interactive preview with variable parameters, and submission API.',
    capabilities: [
      'Live synchronization with Meta Cloud API templates',
      'Categories: Marketing, Utility, and Authentication',
      'Header, Body variables ({{1}}, {{2}}), Footer, and Buttons preview',
      'In-app template creation & Meta approval status tracking',
      'Strict validation preventing broadcast with unapproved templates',
    ],
  },
  '/campaigns': {
    title: 'Broadcast Campaigns & Bulk Dispatch',
    badge: 'Phase 4 Milestone',
    phase: 'Target: Phase 4',
    description:
      'Scheduled and immediate WhatsApp broadcast campaigns with audience segmentation, rate limit throttling, and live recipient logs.',
    capabilities: [
      'Multi-step broadcast campaign composition wizard',
      'Audience filtering by tags, static groups, or custom query',
      'Meta tier-specific rate-limited worker dispatch via BullMQ',
      'Real-time delivery funnel metrics (Sent, Delivered, Read, Failed)',
      'Recipient-level delivery error codes and telemetry export',
    ],
  },
  '/webhooks': {
    title: 'Webhooks & Outbound Dispatcher',
    badge: 'Phase 6 Milestone',
    phase: 'Target: Phase 6',
    description:
      'Configure outbound webhook subscriber endpoints with HMAC SHA-256 signatures, comprehensive SSRF protection, and delivery logs.',
    capabilities: [
      'Event subscriptions: message.received, delivery, contact.created',
      'SSRF validation blocking RFC1918 private IPs and cloud metadata',
      'HMAC SHA-256 signing for all outgoing webhook notifications',
      'Exponential backoff delivery retries with deduplication keys',
      'Inspect HTTP response codes, latency ms, and replay events',
    ],
  },
  '/settings': {
    title: 'Organization Settings & Team Roles',
    badge: 'Active & Foundation',
    phase: 'Phase 1 Active',
    description:
      'Manage active organization profile, invite team members, assign granular roles (Owner, Admin, Manager, Agent, Analyst), and review audit logs.',
    capabilities: [
      'Tenant workspace profile and timezone configuration',
      'Role-based permissions matrix (RBAC) enforcement',
      'AES-256-GCM encrypted credential rotation',
      'Immutable security audit trail of administrative actions',
      'Plan tier quotas and platform health indicators',
    ],
  },
};

export const PlaceholderModulePage: React.FC = () => {
  const location = useLocation();
  const { activeOrg } = useAuth();

  const moduleInfo =
    MODULES_MAP[location.pathname] || {
      title: 'Module Workspace',
      badge: 'Roadmap Milestone',
      phase: 'Upcoming Phase',
      description: 'Enterprise WhatsApp feature module.',
      capabilities: [],
    };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {moduleInfo.badge}
              </span>
              <span className="text-xs text-slate-400 font-mono">{moduleInfo.phase}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{moduleInfo.title}</h1>
            <p className="text-slate-400 text-sm mt-2 max-w-2xl leading-relaxed">
              {moduleInfo.description}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-right shrink-0">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Active Tenant</div>
            <div className="font-bold text-slate-200 mt-0.5">{activeOrg?.name}</div>
            <div className="text-[11px] text-emerald-400 font-mono mt-0.5">Role: {activeOrg?.role}</div>
          </div>
        </div>

        {/* Planned Capabilities Checklist */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Architectural Capabilities & Implementation Scope</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {moduleInfo.capabilities.map((cap, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/70 text-xs text-slate-300"
              >
                <div className="w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <span>{cap}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Foundation Guarantee */}
        <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/20 via-slate-900 to-indigo-950/20 border border-emerald-500/20 text-xs">
          <div className="flex items-center gap-2.5 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Database models, migrations, and tenant isolation for this module are verified and active in PostgreSQL DOOT.
            </span>
          </div>

          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 font-bold text-emerald-400 hover:text-emerald-300 shrink-0"
          >
            <span>Return to Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
