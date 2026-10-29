import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  Smartphone,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Send,
  Sliders,
  Copy,
  Check,
  Building,
  Key,
  FileCode,
  Upload,
  Image as ImageIcon,
  Video,
  FileText,
  Eye,
  X,
  PhoneCall,
  Link as LinkIcon,
  Sparkles,
  Edit3,
  EyeOff,
  Trash2,
  Webhook,
} from 'lucide-react';

interface PhoneNumber {
  id: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  verifiedName: string | null;
  qualityRating: string;
  status: string;
  messagingLimitTier: string;
  createdAt: string;
}

interface MetaAccount {
  id: string;
  wabaId: string;
  name: string;
  businessId: string | null;
  status: string;
  phoneNumbers: PhoneNumber[];
  createdAt: string;
}

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
}

export const WhatsAppPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isTestMessageModalOpen, setIsTestMessageModalOpen] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState<PhoneNumber | null>(null);
  const [testRecipient, setTestRecipient] = useState('+916353025164');
  const [testMode, setTestMode] = useState<'TEMPLATE' | 'TEXT'>('TEMPLATE');
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('');
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [mediaUrl, setMediaUrl] = useState<string>('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaBase64, setMediaBase64] = useState<string>('');
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string>('');
  const [testText, setTestText] = useState('Hello from Peers Automate! Your WhatsApp Cloud API connection is active and verified.');
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Form state for manual credentials onboarding
  const [wabaId, setWabaId] = useState('');
  const [phoneId, setPhoneId] = useState('');
  const [displayPhone, setDisplayPhone] = useState('');
  const [verifiedName, setVerifiedName] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch connected accounts
  const { data: accounts = [], isLoading, refetch, isFetching } = useQuery<MetaAccount[]>({
    queryKey: ['meta-accounts'],
    queryFn: () => api.get('/meta/accounts'),
  });

  // Fetch approved message templates for test message sending
  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates'),
  });

  const approvedTemplates = useMemo(() => {
    return templates.filter((t) => t.status === 'APPROVED');
  }, [templates]);

  // Selected template object
  const currentTemplate = useMemo(() => {
    if (!selectedTemplateName && approvedTemplates.length > 0) {
      return approvedTemplates[0];
    }
    return approvedTemplates.find((t) => t.name === selectedTemplateName) || approvedTemplates[0] || null;
  }, [approvedTemplates, selectedTemplateName]);

  // Extract variables from body text
  const detectedVariables = useMemo(() => {
    if (!currentTemplate) return [];
    const bodyComp = currentTemplate.components?.find((c) => c.type === 'BODY');
    if (!bodyComp || !bodyComp.text) return [];
    const matches = Array.from(bodyComp.text.matchAll(/{{\s*(\d+)\s*}}/g));
    const unique = Array.from(new Set(matches.map((m) => m[1]))).sort((a, b) => Number(a) - Number(b));
    return unique;
  }, [currentTemplate]);

  // Extract header component
  const headerComp = useMemo(() => {
    return currentTemplate?.components?.find((c) => c.type === 'HEADER');
  }, [currentTemplate]);

  // Extract footer component
  const footerComp = useMemo(() => {
    return currentTemplate?.components?.find((c) => c.type === 'FOOTER');
  }, [currentTemplate]);

  // Extract buttons
  const buttonsComp = useMemo(() => {
    return currentTemplate?.components?.find((c) => c.type === 'BUTTONS');
  }, [currentTemplate]);

  const connectMutation = useMutation({
    mutationFn: (data: any) => api.post('/meta/accounts/connect', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-accounts'] });
      setIsConnectModalOpen(false);
      setWabaId('');
      setPhoneId('');
      setDisplayPhone('');
      setVerifiedName('');
      setAccessToken('');
      setErrorMessage(null);
    },
    onError: (err: any) => {
      const msg = Array.isArray(err.message) ? err.message.join(', ') : err.message || 'Failed to connect WhatsApp Business Account';
      setErrorMessage(msg);
    },
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<MetaAccount | null>(null);
  const [editName, setEditName] = useState('');
  const [editWabaId, setEditWabaId] = useState('');
  const [editBusinessId, setEditBusinessId] = useState('');
  const [editAppId, setEditAppId] = useState('1460871381832780');
  const [editPhoneId, setEditPhoneId] = useState('');
  const [editDisplayPhone, setEditDisplayPhone] = useState('');
  const [editVerifiedName, setEditVerifiedName] = useState('');
  const [editAccessToken, setEditAccessToken] = useState('');
  const [editWebhookUrl, setEditWebhookUrl] = useState('');
  const [editWebhookToken, setEditWebhookToken] = useState('unity_whatsapp_webhook_verify_token_2026');
  const [editWebhookActive, setEditWebhookActive] = useState(true);
  const [editCopiedKey, setEditCopiedKey] = useState<string | null>(null);
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);
  const [showEditToken, setShowEditToken] = useState(false);

  const handleOpenEditModal = (account: MetaAccount) => {
    const phone = account.phoneNumbers?.[0];
    setEditingAccount(account);
    setEditName(account.name || '');
    setEditWabaId(account.wabaId || '');
    setEditBusinessId(account.businessId || '5418283234857525');
    setEditAppId('1460871381832780');
    setEditPhoneId(phone?.phoneNumberId || '');
    setEditDisplayPhone(phone?.displayPhoneNumber || '');
    setEditVerifiedName(phone?.verifiedName || '');
    setEditAccessToken('');
    setEditWebhookUrl((account as any).webhookEndpoint?.url || '');
    setEditWebhookToken((account as any).webhookEndpoint?.secret || 'unity_whatsapp_webhook_verify_token_2026');
    setEditWebhookActive((account as any).webhookEndpoint?.isActive !== false);
    setEditErrorMessage(null);
    setIsEditModalOpen(true);
  };

  const updateAccountMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/meta/accounts/${editingAccount?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-accounts'] });
      setIsEditModalOpen(false);
      setEditErrorMessage(null);
    },
    onError: (err: any) => {
      const msg = Array.isArray(err.message) ? err.message.join(', ') : err.message || 'Failed to update WhatsApp connection';
      setEditErrorMessage(msg);
    },
  });

  const testMessageMutation = useMutation({
    mutationFn: (data: any) => api.post('/meta/accounts/test-message', data),
    onSuccess: (res: any) => {
      alert(
        `Message successfully dispatched via official Meta Cloud API!\n\nMessage ID: ${res?.messageId || 'wamid.success'}\n\n• You can monitor real-time delivery and read receipts in "Webhooks & Logs" -> "WhatsApp Message Logs".\n• Freeform text messages require that the user messaged your WhatsApp within the last 24 hours. Template messages deliver anytime.`
      );
      setIsTestMessageModalOpen(false);
    },
    onError: (err: any) => {
      const msg = Array.isArray(err.message) ? err.message.join(', ') : err.message || 'Meta API returned error';
      alert(`Error sending message: ${msg}`);
    },
  });

  const webhookUrl = 'https://amiee-daimonic-shantelle.ngrok-free.dev/api/v1/meta/webhook';
  const webhookToken = 'unity_whatsapp_webhook_verify_token_2026';

  const copyToClipboard = (text: string, type: 'url' | 'token') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  // Handle local media file upload for preview and base64 transmission
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const url = URL.createObjectURL(file);
      setMediaPreviewUrl(url);
      setMediaUrl(''); // Clear manual text input so uploaded file takes precedence

      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setMediaBase64(evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Compute live rendered body with replaced variables
  const renderedBodyText = useMemo(() => {
    if (!currentTemplate) return '';
    const bodyComp = currentTemplate.components?.find((c) => c.type === 'BODY');
    if (!bodyComp || !bodyComp.text) return '';
    let text = bodyComp.text;
    detectedVariables.forEach((varKey) => {
      const val = templateVariables[varKey] || `{{${varKey}}}`;
      text = text.replace(new RegExp(`{{\\s*${varKey}\\s*}}`, 'g'), val);
    });
    return text;
  }, [currentTemplate, detectedVariables, templateVariables]);

  // Strictly enforce displaying 1 primary active WhatsApp integration per user/organization
  const displayAccounts = accounts.slice(0, 1);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Smartphone className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            WhatsApp Business Accounts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Connect and manage official Meta WhatsApp Cloud API credentials and sending phone numbers.
          </p>
        </div>
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <Link
            to="/templates"
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 transition shadow-xs"
          >
            <FileCode className="w-3.5 h-3.5" />
            WhatsApp Templates
          </Link>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 transition shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-emerald-500' : ''}`} />
            Sync Accounts
          </button>
          <button
            onClick={() => setIsConnectModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Connect WhatsApp
          </button>
        </div>
      </div>

      {/* Meta Webhook Endpoint Configuration Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Meta Inbound Webhook Configuration
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure these in Meta App Dashboard &gt; WhatsApp &gt; Configuration to receive incoming messages & status callbacks.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">URL:</span>
              <code className="text-emerald-700 dark:text-emerald-400 font-mono select-all text-[11px]">{webhookUrl}</code>
              <button
                onClick={() => copyToClipboard(webhookUrl, 'url')}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                title="Copy URL"
              >
                {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Verify Token:</span>
              <code className="text-emerald-700 dark:text-emerald-400 font-mono text-[11px]">{webhookToken}</code>
              <button
                onClick={() => copyToClipboard(webhookToken, 'token')}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                title="Copy Token"
              >
                {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Account List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-500 dark:text-slate-400">Loading connected WhatsApp accounts...</p>
        </div>
      ) : displayAccounts.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Smartphone className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No WhatsApp Accounts Connected</h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
            Connect your Meta WhatsApp Business Account (WABA) to start messaging customers, running marketing campaigns, and receiving live replies.
          </p>
          <button
            onClick={() => setIsConnectModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Connect Your Account
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {displayAccounts.map((account) => {
            const activePhoneNumbers = account.phoneNumbers?.slice(0, 1) || [];

            return (
              <div
                key={account.id}
                className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs"
              >
                {/* WABA Header */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {account.name}
                        <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                          {account.status}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        WABA ID: <span className="text-slate-800 dark:text-slate-300 font-semibold">{account.wabaId}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      onClick={() => handleOpenEditModal(account)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 transition shadow-2xs cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Edit Connection Details
                    </button>
                    <Link
                      to="/templates"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 transition shadow-2xs"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      Manage & Sync Templates
                    </Link>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Connected: {new Date(account.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Phone Numbers List */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Authorized Primary WhatsApp Phone Asset (1 Account per Organization)
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Standard Multi-Tenant Quota
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activePhoneNumbers.map((phone) => (
                      <div
                        key={phone.id}
                        className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                              {phone.displayPhoneNumber}
                              {phone.verifiedName && (
                                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                                  ({phone.verifiedName})
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                              ID: {phone.phoneNumberId}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                            {phone.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-200 dark:border-slate-900">
                          <div>
                            <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                              Quality Rating
                            </span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {phone.qualityRating || 'GREEN'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                              Messaging Tier
                            </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {phone.messagingLimitTier || 'TIER_10K'}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedPhone(phone);
                              if (approvedTemplates.length > 0 && !selectedTemplateName) {
                                setSelectedTemplateName(approvedTemplates[0].name);
                              }
                              setIsTestMessageModalOpen(true);
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Send Real Test Message
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Connect Modal */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Connect WhatsApp Business Account
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enter your Meta WhatsApp Cloud API credentials. All tokens are encrypted using AES-256-GCM before storage.
                </p>
              </div>
              <button
                onClick={() => setIsConnectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMessage}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                connectMutation.mutate({
                  metaBusinessId: wabaId,
                  wabaId,
                  name: verifiedName || 'WhatsApp Account',
                  phoneNumberId: phoneId,
                  displayPhoneNumber: displayPhone,
                  verifiedName,
                  accessToken,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  WhatsApp Business Account (WABA) ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1475250733815899"
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1148211571702139"
                  value={phoneId}
                  onChange={(e) => setPhoneId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Display Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 96646 20704"
                    value={displayPhone}
                    onChange={(e) => setDisplayPhone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Verified Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="Peers Global"
                    value={verifiedName}
                    onChange={(e) => setVerifiedName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  System User Permanent Access Token *
                </label>
                <input
                  type="password"
                  required
                  placeholder="EAAB..."
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Never shared with third parties. Encrypted with hardware-grade envelope keys.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsConnectModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={connectMutation.isPending}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-2 shadow-sm"
                >
                  {connectMutation.isPending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Verify & Save Connection'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADVANCED SEND REAL TEST MESSAGE MODAL (WITH TEMPLATES, VARIABLES, MEDIA)   */}
      {/* ========================================================================= */}
      {isTestMessageModalOpen && selectedPhone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Send className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Send Real Test Message via Meta Cloud API
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sending from official number:{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedPhone.displayPhoneNumber}</span>
                  {selectedPhone.verifiedName && ` (${selectedPhone.verifiedName})`}
                </p>
              </div>
              <button
                onClick={() => setIsTestMessageModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Grid */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Form Controls (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {/* Message Mode Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Message Type
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setTestMode('TEMPLATE')}
                      className={`py-2 text-xs font-bold rounded-lg transition ${
                        testMode === 'TEMPLATE'
                          ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Approved Template (Recommended)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestMode('TEXT')}
                      className={`py-2 text-xs font-bold rounded-lg transition ${
                        testMode === 'TEXT'
                          ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Freeform Text Message
                    </button>
                  </div>
                  {testMode === 'TEXT' && (
                    <div className="mt-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-xs text-amber-800 dark:text-amber-300">
                      <strong>Meta WhatsApp Policy:</strong> Direct freeform messages can only reach a recipient if they have sent an inbound message to this WhatsApp line in the last 24 hours. Outside of this 24h window, Meta drops or rejects direct messages. To message cold or existing leads anytime, use <strong>Approved Template (Recommended)</strong>.
                    </div>
                  )}
                </div>

                {/* Recipient Phone Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Recipient Phone Number (with Country Code) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+919664620704"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-mono font-semibold"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Format: +[Country Code][Phone Number] e.g. +916353025164 or +919664620704
                  </span>
                </div>

                {/* TEMPLATE MODE CONTROLS */}
                {testMode === 'TEMPLATE' && (
                  <div className="space-y-4 pt-1">
                    {/* Template Picker Dropdown */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Select Meta-Approved Template *
                        </label>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          {approvedTemplates.length} Approved Available
                        </span>
                      </div>
                      {approvedTemplates.length === 0 ? (
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                          No approved templates found. Please create a template or click "Sync from Meta" on the Templates page.
                        </div>
                      ) : (
                        <select
                          value={selectedTemplateName || (currentTemplate ? currentTemplate.name : '')}
                          onChange={(e) => {
                            setSelectedTemplateName(e.target.value);
                            setTemplateVariables({});
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-semibold"
                        >
                          {approvedTemplates.map((t) => (
                            <option key={t.id} value={t.name}>
                              {t.name} ({t.category} • {t.language})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Media Header Upload/Input (if template has IMAGE/VIDEO/DOCUMENT) */}
                    {headerComp && headerComp.format && headerComp.format !== 'TEXT' && (
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            {headerComp.format === 'IMAGE' && <ImageIcon className="w-4 h-4 text-emerald-500" />}
                            {headerComp.format === 'VIDEO' && <Video className="w-4 h-4 text-emerald-500" />}
                            {headerComp.format === 'DOCUMENT' && <FileText className="w-4 h-4 text-emerald-500" />}
                            Header {headerComp.format} Asset *
                          </label>
                          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                            Required by Template
                          </span>
                        </div>

                        {/* File Upload Dropzone */}
                        <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-900 text-center">
                          <input
                            type="file"
                            id="test-media-upload"
                            className="hidden"
                            accept={
                              headerComp.format === 'IMAGE'
                                ? 'image/*'
                                : headerComp.format === 'VIDEO'
                                ? 'video/mp4,video/3gpp'
                                : '.pdf,.doc,.docx'
                            }
                            onChange={handleMediaUpload}
                          />
                          <label
                            htmlFor="test-media-upload"
                            className="cursor-pointer flex flex-col items-center justify-center gap-1"
                          >
                            <Upload className="w-5 h-5 text-emerald-500" />
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline">
                              {mediaFile ? mediaFile.name : `Click to choose ${headerComp.format.toLowerCase()} file`}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {mediaFile ? `${(mediaFile.size / 1024).toFixed(1)} KB` : 'Or paste a direct URL below'}
                            </span>
                          </label>
                        </div>

                        {/* Direct URL Fallback */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              Or Direct Public {headerComp.format} URL (Optional)
                            </label>
                            {mediaFile && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                ✓ Uploaded file ({mediaFile.name}) will be sent to Meta
                              </span>
                            )}
                          </div>
                          <input
                            type="url"
                            value={mediaUrl}
                            onChange={(e) => {
                              setMediaUrl(e.target.value);
                              if (e.target.value.trim()) {
                                setMediaFile(null);
                                setMediaBase64('');
                                setMediaPreviewUrl(e.target.value.trim());
                              }
                            }}
                            placeholder="https://example.com/banner.jpg"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono"
                          />
                        </div>
                      </div>
                    )}

                    {/* Template Dynamic Variables Form */}
                    {detectedVariables.length > 0 && (
                      <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>Dynamic Template Variables</span>
                          <span className="text-[10px] text-slate-400">
                            {detectedVariables.length} Required Field{detectedVariables.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {detectedVariables.map((vKey) => (
                            <div key={vKey}>
                              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                Variable &#123;&#123;{vKey}&#125;&#125;
                              </label>
                              <input
                                type="text"
                                required
                                placeholder={`Value for {{${vKey}}}`}
                                value={templateVariables[vKey] || ''}
                                onChange={(e) => {
                                  setTemplateVariables({
                                    ...templateVariables,
                                    [vKey]: e.target.value,
                                  });
                                }}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* FREEFORM TEXT MODE */}
                {testMode === 'TEXT' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Message Text *
                    </label>
                    <textarea
                      rows={4}
                      value={testText}
                      onChange={(e) => setTestText(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>
                )}
              </div>

              {/* Right Column: Real-Time WhatsApp Phone Mockup Preview (5 cols) */}
              <div className="lg:col-span-5 flex flex-col justify-start">
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
                  <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Eye className="w-4 h-4 text-emerald-500" />
                    <span>Real-Time Recipient View</span>
                  </div>

                  {/* WhatsApp Mobile Chat Container */}
                  <div className="bg-[#efeae2] dark:bg-[#0b141a] rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
                    {/* Chat Bubble */}
                    <div className="bg-white dark:bg-[#1f2c34] rounded-2xl rounded-tl-none p-3 shadow-xs space-y-2 border border-black/5 dark:border-white/5 max-w-sm">
                      {testMode === 'TEMPLATE' ? (
                        <>
                          {/* Header Media / Text */}
                          {headerComp && (
                            <div>
                              {headerComp.format === 'TEXT' && headerComp.text && (
                                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs border-b border-black/5 dark:border-white/5 pb-1">
                                  {headerComp.text}
                                </h4>
                              )}
                              {headerComp.format === 'IMAGE' && (
                                <div className="rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 max-h-40 flex items-center justify-center">
                                  {mediaPreviewUrl || mediaUrl ? (
                                    <img
                                      src={mediaPreviewUrl || mediaUrl}
                                      alt="Header Media"
                                      className="w-full h-36 object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="p-4 text-center text-xs text-slate-400 flex flex-col items-center gap-1">
                                      <ImageIcon className="w-6 h-6 text-emerald-500" />
                                      <span>[Image Header]</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              {headerComp.format === 'VIDEO' && (
                                <div className="h-32 rounded-xl bg-slate-800 flex flex-col items-center justify-center text-slate-300 text-xs gap-1.5">
                                  <Video className="w-6 h-6 text-emerald-400" />
                                  <span>[Video Header Attached]</span>
                                </div>
                              )}
                              {headerComp.format === 'DOCUMENT' && (
                                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  <FileText className="w-5 h-5 text-rose-500" />
                                  <span className="truncate">{mediaFile?.name || 'Document.pdf'}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Message Body with live substituted variables */}
                          <p className="text-slate-800 dark:text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">
                            {renderedBodyText || 'Select a template...'}
                          </p>

                          {/* Footer */}
                          {footerComp && footerComp.text && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                              {footerComp.text}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-slate-800 dark:text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">
                          {testText}
                        </p>
                      )}

                      {/* Timestamp */}
                      <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400 pt-1">
                        <span>13:35</span>
                        <Check className="w-3 h-3 text-emerald-500" />
                      </div>
                    </div>

                    {/* Action Buttons if template has buttons */}
                    {testMode === 'TEMPLATE' && buttonsComp && buttonsComp.buttons && (
                      <div className="mt-1.5 space-y-1 max-w-sm">
                        {buttonsComp.buttons.map((btn, idx) => (
                          <div
                            key={idx}
                            className="w-full py-1.5 bg-white dark:bg-[#1f2c34] rounded-xl text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 shadow-2xs border border-black/5 dark:border-white/5 flex items-center justify-center gap-1.5"
                          >
                            {btn.type === 'URL' && <LinkIcon className="w-3 h-3" />}
                            {btn.type === 'PHONE_NUMBER' && <PhoneCall className="w-3 h-3" />}
                            <span>{btn.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Action Bar */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsTestMessageModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (testMode === 'TEMPLATE') {
                    if (!currentTemplate) {
                      alert('Please select a template');
                      return;
                    }
                    testMessageMutation.mutate({
                      phoneNumberId: selectedPhone.phoneNumberId || selectedPhone.id,
                      recipientPhone: testRecipient,
                      templateName: currentTemplate.name,
                      languageCode: currentTemplate.language || 'en_US',
                      variables: templateVariables,
                      mediaUrl: mediaUrl.trim() && !mediaUrl.startsWith('blob:') ? mediaUrl.trim() : undefined,
                      mediaBase64: mediaBase64 || undefined,
                      headerType: headerComp?.format,
                    });
                  } else {
                    testMessageMutation.mutate({
                      phoneNumberId: selectedPhone.phoneNumberId || selectedPhone.id,
                      recipientPhone: testRecipient,
                      text: testText,
                    });
                  }
                }}
                disabled={testMessageMutation.isPending}
                className="px-6 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-2 shadow-sm"
              >
                {testMessageMutation.isPending ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Dispatching to Meta...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Dispatch Live Message Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Connection Details Modal */}
      {isEditModalOpen && editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 space-y-5 max-h-[92vh] flex flex-col my-4">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4 shrink-0">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Edit WhatsApp Connection Details
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Update Meta Cloud API credentials, App ID, Phone line, Token, and Webhooks.
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner */}
            {editErrorMessage && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-xs flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editErrorMessage}</span>
              </div>
            )}

            {/* Form Fields */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateAccountMutation.mutate({
                  name: editName,
                  wabaId: editWabaId,
                  metaBusinessId: editBusinessId,
                  appId: editAppId,
                  phoneNumberId: editPhoneId,
                  displayPhoneNumber: editDisplayPhone,
                  verifiedName: editVerifiedName,
                  ...(editAccessToken.trim() ? { accessToken: editAccessToken.trim() } : {}),
                  externalWebhookUrl: editWebhookUrl.trim(),
                  externalWebhookToken: editWebhookToken.trim(),
                  isWebhookActive: editWebhookActive,
                });
              }}
              className="space-y-4 overflow-y-auto pr-1"
            >
              {/* Row 1: App ID & Business ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Meta App ID</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Message Sender</span>
                  </label>
                  <input
                    type="text"
                    value={editAppId}
                    onChange={(e) => setEditAppId(e.target.value)}
                    placeholder="1460871381832780"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Your live Meta App ID running Peers Automate.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Meta Business Portfolio ID</span>
                    <span className="text-[10px] text-slate-400">Peers Global Network</span>
                  </label>
                  <input
                    type="text"
                    value={editBusinessId}
                    onChange={(e) => setEditBusinessId(e.target.value)}
                    placeholder="5418283234857525"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Business Manager ID that owns the WABA.</p>
                </div>
              </div>

              {/* Row 2: WABA Name & WABA ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    WhatsApp Business Account Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Peers Global Business Media Pvt Ltd"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    WhatsApp Business Account (WABA) ID
                  </label>
                  <input
                    type="text"
                    value={editWabaId}
                    onChange={(e) => setEditWabaId(e.target.value)}
                    placeholder="1475250733815899"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Row 3: Phone Number ID & Display Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Phone Number ID
                  </label>
                  <input
                    type="text"
                    value={editPhoneId}
                    onChange={(e) => setEditPhoneId(e.target.value)}
                    placeholder="1148211571702139"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Display Phone Number
                  </label>
                  <input
                    type="text"
                    value={editDisplayPhone}
                    onChange={(e) => setEditDisplayPhone(e.target.value)}
                    placeholder="+91 96646 20704"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Row 4: Verified Business Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Verified Business Name (on WhatsApp)
                </label>
                <input
                  type="text"
                  value={editVerifiedName}
                  onChange={(e) => setEditVerifiedName(e.target.value)}
                  placeholder="Peers Global Business Media Pvt Ltd"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              {/* Row 5: Update Access Token */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Permanent Access Token</span>
                  <span className="text-[10px] text-slate-400 font-normal">Encrypted with AES-256-GCM</span>
                </label>
                <div className="relative">
                  <input
                    type={showEditToken ? 'text' : 'password'}
                    value={editAccessToken}
                    onChange={(e) => setEditAccessToken(e.target.value)}
                    placeholder="Leave empty to keep existing token, or paste new token to update"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditToken(!showEditToken)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showEditToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Only fill this if you generated a fresh System User or Graph API Token. Leave blank to preserve current credentials.
                </p>
              </div>

              {/* Webhooks Section */}
              <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/40 space-y-3.5">
                <div className="flex items-center justify-between border-b border-indigo-200/60 dark:border-indigo-800/40 pb-2">
                  <div className="flex items-center gap-2">
                    <Webhook className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                      WhatsApp Webhooks &amp; Dynamic Relays
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/40">
                    REAL-TIME SYNC
                  </span>
                </div>

                {/* Meta Inbound Webhook Info */}
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300">
                      1. Meta WhatsApp Inbound Webhook (Configured in Meta App)
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Live Active
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Callback URL</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText('https://amiee-daimonic-shantelle.ngrok-free.dev/api/v1/meta/webhook');
                            setEditCopiedKey('INBOUND_URL');
                            setTimeout(() => setEditCopiedKey(null), 2500);
                          }}
                          className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          {editCopiedKey === 'INBOUND_URL' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{editCopiedKey === 'INBOUND_URL' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="font-mono text-[10px] text-slate-800 dark:text-slate-200 truncate select-all">
                        https://amiee-daimonic-shantelle.ngrok-free.dev/api/v1/meta/webhook
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Verify Token</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText('unity_whatsapp_webhook_verify_token_2026');
                            setEditCopiedKey('INBOUND_TOKEN');
                            setTimeout(() => setEditCopiedKey(null), 2500);
                          }}
                          className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          {editCopiedKey === 'INBOUND_TOKEN' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{editCopiedKey === 'INBOUND_TOKEN' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="font-mono text-[10px] text-slate-800 dark:text-slate-200 truncate select-all">
                        unity_whatsapp_webhook_verify_token_2026
                      </div>
                    </div>
                  </div>
                </div>

                {/* External Outbound Relay Configuration */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300">
                      2. External Outbound Relay Webhook (Forward to External CRM / Portal)
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editWebhookActive}
                        onChange={(e) => setEditWebhookActive(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        {editWebhookActive ? 'Relay Active' : 'Relay Paused'}
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Destination Webhook URL
                    </label>
                    <input
                      type="url"
                      placeholder="e.g. https://your-crm.com/api/v1/whatsapp/webhook"
                      value={editWebhookUrl}
                      onChange={(e) => setEditWebhookUrl(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 font-mono text-[11px] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Relay Verification Token / Secret
                    </label>
                    <input
                      type="text"
                      placeholder="unity_whatsapp_webhook_verify_token_2026"
                      value={editWebhookToken}
                      onChange={(e) => setEditWebhookToken(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 font-mono text-[11px] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Notice Banner: Stop Messages Going to Resobrand */}
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
                  <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  How to Stop Messages Going to Resobrand
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
                  Meta routes customer WhatsApp messages to <strong>all apps</strong> subscribed to this WABA. Because Resobrand originally connected as a Partner, Meta sends a duplicate copy to their app.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href="https://business.facebook.com/latest/settings/partners?business_id=5418283234857525"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 font-semibold text-xs transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    1. Remove Resobrand in Meta Partners
                  </a>
                  <a
                    href="https://business.facebook.com/latest/settings/connected_apps?business_id=5418283234857525"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 font-semibold text-xs transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    2. Disconnect Resobrand App
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateAccountMutation.isPending}
                  className="px-6 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-2 shadow-sm"
                >
                  {updateAccountMutation.isPending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Save Connection Details
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
