import React, { useState } from 'react';
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

export const WhatsAppPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isTestMessageModalOpen, setIsTestMessageModalOpen] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState<PhoneNumber | null>(null);
  const [testRecipient, setTestRecipient] = useState('');
  const [testText, setTestText] = useState('Hello from DOOT! Your WhatsApp Cloud API connection is active and verified.');
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Form state for manual credentials onboarding
  const [wabaId, setWabaId] = useState('');
  const [phoneId, setPhoneId] = useState('');
  const [displayPhone, setDisplayPhone] = useState('');
  const [verifiedName, setVerifiedName] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: accounts = [], isLoading, refetch, isFetching } = useQuery<MetaAccount[]>({
    queryKey: ['meta-accounts'],
    queryFn: () => api.get('/meta/accounts'),
  });

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

  const testMessageMutation = useMutation({
    mutationFn: (data: any) => api.post('/meta/accounts/test-message', data),
    onSuccess: () => {
      alert('Test message submitted successfully via Meta Graph API!');
      setIsTestMessageModalOpen(false);
      setTestRecipient('');
    },
    onError: (err: any) => {
      const msg = Array.isArray(err.message) ? err.message.join(', ') : err.message || 'Meta API returned error';
      alert(`Error sending message: ${msg}`);
    },
  });

  const webhookUrl = `${window.location.origin}/api/v1/meta/webhook`;
  const webhookToken = 'doot_webhook_verify_token_2026';

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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Smartphone className="w-6 h-6 text-emerald-400" />
            WhatsApp Business Accounts
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Connect and manage official Meta WhatsApp Cloud API credentials and sending phone numbers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-emerald-400' : ''}`} />
            Sync Accounts
          </button>
          <button
            onClick={() => setIsConnectModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            Connect WhatsApp
          </button>
        </div>
      </div>

      {/* Meta Webhook Endpoint Configuration Banner */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Shield className="w-4 h-4 text-emerald-400" />
              Meta Inbound Webhook Configuration
            </div>
            <p className="text-xs text-slate-400">
              Configure these in Meta App Dashboard &gt; WhatsApp &gt; Configuration to receive incoming messages & status callbacks.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">URL:</span>
              <code className="text-emerald-400 font-mono select-all">{webhookUrl}</code>
              <button
                onClick={() => copyToClipboard(webhookUrl, 'url')}
                className="text-slate-400 hover:text-white"
                title="Copy URL"
              >
                {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">Verify Token:</span>
              <code className="text-emerald-400 font-mono">{webhookToken}</code>
              <button
                onClick={() => copyToClipboard(webhookToken, 'token')}
                className="text-slate-400 hover:text-white"
                title="Copy Token"
              >
                {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Account List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-slate-900/40 rounded-xl border border-slate-800">
          <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading connected WhatsApp accounts...</p>
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Smartphone className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">No WhatsApp Accounts Connected</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            Connect your Meta WhatsApp Business Account (WABA) to start messaging customers, running marketing campaigns, and receiving live replies.
          </p>
          <button
            onClick={() => setIsConnectModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            Connect Your First Account
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl"
            >
              {/* WABA Header */}
              <div className="px-6 py-4 bg-slate-800/30 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      {account.name}
                      <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {account.status}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      WABA ID: <span className="text-slate-300">{account.wabaId}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Connected: {new Date(account.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Phone Numbers List */}
              <div className="p-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  Authorized Phone Assets ({account.phoneNumbers?.length || 0})
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {account.phoneNumbers?.map((phone) => (
                    <div
                      key={phone.id}
                      className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-100 flex items-center gap-2">
                            {phone.displayPhoneNumber}
                            {phone.verifiedName && (
                              <span className="text-[11px] font-normal text-slate-400">
                                ({phone.verifiedName})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            ID: {phone.phoneNumberId}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {phone.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-900">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase">Quality Rating</span>
                          <span className="font-semibold text-emerald-400">{phone.qualityRating || 'GREEN'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase">Messaging Tier</span>
                          <span className="font-semibold text-slate-300">{phone.messagingLimitTier || 'TIER_1K'}</span>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedPhone(phone);
                            setIsTestMessageModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition"
                        >
                          <Send className="w-3 h-3" />
                          Send Test Message
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connect Modal */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-emerald-400" />
                Connect WhatsApp Business Account
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter your Meta WhatsApp Cloud API credentials. All tokens are encrypted using AES-256-GCM before storage.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  WhatsApp Business Account (WABA) ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 102938475610293"
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Phone Number ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 293847561029384"
                  value={phoneId}
                  onChange={(e) => setPhoneId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Display Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+1 555 123 4567"
                    value={displayPhone}
                    onChange={(e) => setDisplayPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Verified Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="Acme Support"
                    value={verifiedName}
                    onChange={(e) => setVerifiedName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  System User Permanent Access Token *
                </label>
                <input
                  type="password"
                  required
                  placeholder="EAAB..."
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Never shared with third parties. Encrypted with hardware-grade envelope keys.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsConnectModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={connectMutation.isPending}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  {connectMutation.isPending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
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

      {/* Test Message Modal */}
      {isTestMessageModalOpen && selectedPhone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-400" />
                Send Real Test Message
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Dispatch an actual WhatsApp message through Meta Cloud API from{' '}
                <span className="font-semibold text-slate-200">{selectedPhone.displayPhoneNumber}</span>.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                testMessageMutation.mutate({
                  phoneNumberId: selectedPhone.id,
                  recipient: testRecipient,
                  text: testText,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Recipient Phone Number (with Country Code) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+919876543210 or +15551234567"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Message Text
                </label>
                <textarea
                  rows={3}
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTestMessageModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={testMessageMutation.isPending}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  {testMessageMutation.isPending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                      Dispatching...
                    </>
                  ) : (
                    'Send Message'
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
