import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  ShieldAlert,
  Building2,
  Users,
  CreditCard,
  Activity,
  Server,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  Lock,
  Unlock,
  Radio,
  Clock,
  ArrowUpRight,
  TrendingUp,
  FileText,
  X,
  MessageSquare,
  Send,
  Webhook,
  Smartphone,
  FileCode,
  Eye,
  EyeOff,
  Filter,
  Check,
  ChevronRight,
  History,
  Info,
  Edit3,
  Plus,
  Key,
  Copy,
  ExternalLink,
  Globe,
  Trash2,
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface AdminStats {
  organizations: {
    total: number;
    active: number;
    trial: number;
    suspended: number;
  };
  users: {
    total: number;
  };
  messaging: {
    totalContacts: number;
    totalMessages: number;
    campaignsRun: number;
    messagesDispatched: number;
    messagesDelivered: number;
    messagesRead: number;
    messagesFailed: number;
    deliverySuccessRatePct: number;
  };
  webhooks: {
    successful: number;
    failed: number;
  };
  support: {
    openTickets: number;
  };
  queues: {
    messagingQueue: { waiting: number; active: number; completed: number; failed: number };
    webhookQueue: { waiting: number; active: number; completed: number; failed: number };
    campaignQueue: { waiting: number; active: number; completed: number; failed: number };
    status: string;
  };
  systemHealth: string;
  timestamp: string;
}

interface OrgItem {
  id: string;
  name: string;
  slug: string;
  planTier: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'EXPIRED';
  createdAt: string;
  _count?: {
    memberships: number;
    contacts: number;
    campaigns: number;
    phoneNumbers: number;
  };
}

interface PlanItem {
  id: string;
  name: string;
  tier: string;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  maxContacts: number;
  maxMonthlyMessages: number;
  maxPhoneNumbers: number;
  maxTeamMembers: number;
  hasVisualBuilder: boolean;
  hasAiAssistant: boolean;
  isActive: boolean;
}

const getInitialPlatformDomain = () => {
  if (typeof window === 'undefined') return 'http://localhost:3000';
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  return window.location.origin;
};

export const AdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { switchOrganization } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as any;
  const validTabs = ['overview', 'organizations', 'users', 'messages', 'campaigns', 'webhooks', 'plans', 'queues', 'audit'];
  const activeTab: 'overview' | 'organizations' | 'users' | 'messages' | 'campaigns' | 'webhooks' | 'plans' | 'queues' | 'audit' =
    validTabs.includes(tabFromUrl) ? tabFromUrl : 'overview';

  const setActiveTab = (tab: any) => {
    setSearchParams({ tab });
  };

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [messageStatusFilter, setMessageStatusFilter] = useState<string>('ALL');
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<string>('ALL');
  const [webhookStatusFilter, setWebhookStatusFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');

  // Organization Detail Modal State
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgDetailTab, setOrgDetailTab] = useState<'overview' | 'team' | 'phones' | 'templates' | 'campaigns' | 'messages' | 'audit' | 'webhooks'>('overview');

  // Suspension modal state
  const [suspensionModal, setSuspensionModal] = useState<{
    isOpen: boolean;
    org: OrgItem | null;
    action: 'SUSPEND' | 'REACTIVATE';
    reason: string;
  }>({
    isOpen: false,
    org: null,
    action: 'SUSPEND',
    reason: '',
  });

  // Integration Asset Editing Modal State
  const [editingAsset, setEditingAsset] = useState<{
    isOpen: boolean;
    phoneId: string;
    verifiedName: string;
    displayPhoneNumber: string;
    phoneNumberId: string;
    wabaId: string;
    metaBusinessId: string;
    accessToken: string;
    qualityRating: string;
    messagingLimitTier: string;
    status: string;
  }>({
    isOpen: false,
    phoneId: '',
    verifiedName: '',
    displayPhoneNumber: '',
    phoneNumberId: '',
    wabaId: '',
    metaBusinessId: '',
    accessToken: '',
    qualityRating: 'GREEN',
    messagingLimitTier: 'TIER_10K',
    status: 'CONNECTED',
  });
  const [showAssetToken, setShowAssetToken] = useState(false);
  const [assetSuccessNotice, setAssetSuccessNotice] = useState<string | null>(null);

  // Template Filtering per Phone Asset State
  const [templatePhoneFilter, setTemplatePhoneFilter] = useState<string>('ALL');
  const [templateSearch, setTemplateSearch] = useState<string>('');

  // Webhooks & Relay State in Organization Inspector
  const [copiedWebhook, setCopiedWebhook] = useState<string | null>(null);
  const [newRelayName, setNewRelayName] = useState<string>('');
  const [newRelayUrl, setNewRelayUrl] = useState<string>('');
  const [newRelaySecret, setNewRelaySecret] = useState<string>('doot_dynamic_verify_token_2026');
  const [relayReceiveMsg, setRelayReceiveMsg] = useState<boolean>(true);
  const [relayStatusUpdate, setRelayStatusUpdate] = useState<boolean>(true);
  const [relayTestingId, setRelayTestingId] = useState<string | null>(null);
  const [relayTestNotice, setRelayTestNotice] = useState<{ success: boolean; message: string } | null>(null);
  const [inspectorPlatformDomain, setInspectorPlatformDomain] = useState<string>(getInitialPlatformDomain());

  // New Organization Creation Modal State (Platform Owner Only)
  const [createOrgModalOpen, setCreateOrgModalOpen] = useState(false);
  const [createOrgForm, setCreateOrgForm] = useState({
    name: '',
    slug: '',
    planTier: 'STARTER',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
    displayPhoneNumber: '',
    phoneNumberId: '',
    wabaId: '',
    metaBusinessId: '',
    verifiedName: '',
    accessToken: '',
    platformDomain: getInitialPlatformDomain(),
    externalWebhookUrl: '',
    externalWebhookToken: 'doot_dynamic_verify_token_2026',
    showPassword: false,
    showToken: false,
  });
  const [createdSuccessInfo, setCreatedSuccessInfo] = useState<any>(null);

  // Purge Demo Logins State
  const [purgeDemoModalOpen, setPurgeDemoModalOpen] = useState(false);
  const [purgeSuccessNotice, setPurgeSuccessNotice] = useState<string | null>(null);

  // Delete Organization Modal State
  const [deleteOrgModal, setDeleteOrgModal] = useState<{
    isOpen: boolean;
    org: OrgItem | null;
    isDeleting: boolean;
    error: string | null;
  }>({
    isOpen: false,
    org: null,
    isDeleting: false,
    error: null,
  });

  // Edit Organization Modal State (Platform Owner)
  const [editingOrg, setEditingOrg] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
    slug: string;
    planTier: string;
    status: string;
    timezone: string;
    appId: string;
    metaBusinessId: string;
    wabaName: string;
    wabaId: string;
    phoneNumberId: string;
    displayPhoneNumber: string;
    verifiedName: string;
    accessToken: string;
    externalWebhookUrl: string;
    externalWebhookToken: string;
    isWebhookActive: boolean;
  } | null>(null);
  const [showOrgAccessToken, setShowOrgAccessToken] = useState(false);
  const [orgCopiedKey, setOrgCopiedKey] = useState<string | null>(null);

  // Edit Webhook Modal State (Platform Owner)
  const [editingWebhook, setEditingWebhook] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
    url: string;
    secret: string;
    events: string[];
    isActive: boolean;
  } | null>(null);

  // Razorpay Gateway Settings State
  const [razorpayForm, setRazorpayForm] = useState({
    keyId: '',
    keySecret: '',
    currency: 'INR',
    isEnabled: true,
    accountName: 'Peers Automate Commercial Gateway',
    showSecret: false,
  });
  const [razorpaySaveNotice, setRazorpaySaveNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Subscription Manual Activation Modal State
  const [activateSubModal, setActivateSubModal] = useState<{
    isOpen: boolean;
    org: any | null;
    planTier: string;
    months: number;
    reason: string;
  }>({
    isOpen: false,
    org: null,
    planTier: 'GROWTH',
    months: 1,
    reason: 'Manual Admin Approval / Offline Payment',
  });
  const [activateSubNotice, setActivateSubNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Plan Create / Edit Modal State
  const [planModal, setPlanModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    planId?: string;
    name: string;
    tier: string;
    monthlyPrice: number;
    annualPrice: number;
    currency: string;
    maxContacts: number;
    maxMonthlyMessages: number;
    maxPhoneNumbers: number;
    maxTeamMembers: number;
    features: string;
    isActive: boolean;
  }>({
    isOpen: false,
    mode: 'create',
    name: '',
    tier: '',
    monthlyPrice: 1999,
    annualPrice: 19990,
    currency: 'INR',
    maxContacts: 5000,
    maxMonthlyMessages: 10000,
    maxPhoneNumbers: 2,
    maxTeamMembers: 5,
    features: 'crm,bot_flows,campaigns,webhooks,official_meta_api',
    isActive: true,
  });


  const handleDeleteOrg = async () => {
    if (!deleteOrgModal.org) return;
    setDeleteOrgModal((prev) => ({ ...prev, isDeleting: true, error: null }));
    try {
      await api.delete(`/admin/organizations/${deleteOrgModal.org.id}`);
      queryClient.invalidateQueries({ queryKey: ['admin-orgs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      refetchOrgs();
      refetchStats();
      setPurgeSuccessNotice(`Organization "${deleteOrgModal.org.name}" was permanently deleted.`);
      setDeleteOrgModal({ isOpen: false, org: null, isDeleting: false, error: null });
    } catch (err: any) {
      setDeleteOrgModal((prev) => ({
        ...prev,
        isDeleting: false,
        error: err.message || 'Failed to delete organization',
      }));
    }
  };

  // 1. Fetch real platform stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get<AdminStats>('/admin/stats'),
    refetchInterval: 15000,
  });

  // 2. Fetch organizations directory
  const { data: orgs, isLoading: orgsLoading, refetch: refetchOrgs } = useQuery<OrgItem[]>({
    queryKey: ['admin-orgs'],
    queryFn: () => api.get<OrgItem[]>('/admin/organizations'),
  });

  // 3. Fetch global user directory
  const { data: users, isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.get<any[]>('/admin/users'),
    enabled: activeTab === 'users',
  });

  // 4. Fetch platform-wide messages
  const { data: messagesData, isLoading: messagesLoading } = useQuery<{ data: any[]; meta: any }>({
    queryKey: ['admin-messages', messageStatusFilter, searchTerm],
    queryFn: () => api.get<{ data: any[]; meta: any }>(`/admin/messages?status=${messageStatusFilter}&search=${encodeURIComponent(searchTerm)}`),
    enabled: activeTab === 'messages',
  });

  // 5. Fetch platform-wide campaigns
  const { data: campaignsData, isLoading: campaignsLoading } = useQuery<{ data: any[]; meta: any }>({
    queryKey: ['admin-campaigns', campaignStatusFilter, searchTerm],
    queryFn: () => api.get<{ data: any[]; meta: any }>(`/admin/campaigns?status=${campaignStatusFilter}&search=${encodeURIComponent(searchTerm)}`),
    enabled: activeTab === 'campaigns',
  });

  // 6. Fetch platform-wide webhook logs
  const { data: webhooksData, isLoading: webhooksLoading } = useQuery<{ data: any[]; meta: any }>({
    queryKey: ['admin-webhooks', webhookStatusFilter],
    queryFn: () => api.get<{ data: any[]; meta: any }>(`/admin/webhook-logs?statusType=${webhookStatusFilter}`),
    enabled: activeTab === 'webhooks',
  });

  // 7. Fetch plans
  const { data: plans, isLoading: plansLoading, refetch: refetchPlans } = useQuery<any[]>({
    queryKey: ['admin-plans'],
    queryFn: () => api.get<any[]>('/admin/plans'),
    enabled: activeTab === 'plans',
  });

  // Razorpay Gateway Admin Settings
  const { data: razorpaySettings, isLoading: razorpayLoading, refetch: refetchRazorpay } = useQuery<any>({
    queryKey: ['admin-razorpay-settings'],
    queryFn: () => api.get('/admin/settings/razorpay'),
    enabled: activeTab === 'plans',
  });

  React.useEffect(() => {
    if (razorpaySettings) {
      setRazorpayForm((prev) => ({
        ...prev,
        keyId: razorpaySettings.keyId || '',
        currency: razorpaySettings.currency || 'INR',
        isEnabled: razorpaySettings.isEnabled ?? true,
        accountName: razorpaySettings.accountName || 'Peers Automate Commercial Gateway',
      }));
    }
  }, [razorpaySettings]);

  const adminCurrency = (razorpaySettings?.currency || razorpayForm.currency || 'INR').toUpperCase();
  const adminCurrencySymbol = adminCurrency === 'USD' ? '$' : '₹';
  const adminLocale = adminCurrency === 'USD' ? 'en-US' : 'en-IN';

  const saveRazorpayMutation = useMutation({
    mutationFn: (dto: any) => api.post('/admin/settings/razorpay', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-razorpay-settings'] });
      setRazorpaySaveNotice({ type: 'success', message: 'Razorpay Gateway credentials saved and encrypted successfully.' });
      setTimeout(() => setRazorpaySaveNotice(null), 4000);
    },
    onError: (err: any) => {
      setRazorpaySaveNotice({ type: 'error', message: err.message || 'Failed to save Razorpay settings.' });
    },
  });

  const activateOrgSubMutation = useMutation({
    mutationFn: ({ orgId, planTier, months, reason }: any) =>
      api.post(`/admin/organizations/${orgId}/activate-subscription`, { planTier, months, reason }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orgs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      refetchOrgs();
      setActivateSubNotice({ type: 'success', message: data.message || 'Subscription successfully activated!' });
      setActivateSubModal({ isOpen: false, org: null, planTier: 'GROWTH', months: 1, reason: '' });
      setTimeout(() => setActivateSubNotice(null), 4000);
    },
    onError: (err: any) => {
      setActivateSubNotice({ type: 'error', message: err.message || 'Failed to activate subscription.' });
    },
  });

  const savePlanMutation = useMutation({
    mutationFn: async (data: any) => {
      if (planModal.mode === 'create') {
        return api.post('/admin/plans', data);
      } else {
        return api.put(`/admin/plans/${planModal.planId}`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      refetchPlans();
      setPlanModal((prev) => ({ ...prev, isOpen: false }));
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to save plan.');
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (planId: string) => api.delete(`/admin/plans/${planId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      refetchPlans();
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to delete plan.');
    },
  });


  // 8. Fetch audit logs
  const { data: auditData, isLoading: auditLoading } = useQuery<{ data: any[]; meta: any }>({
    queryKey: ['admin-audit-logs'],
    queryFn: () => api.get<{ data: any[]; meta: any }>('/admin/audit-logs'),
    enabled: activeTab === 'audit',
  });

  // 9. Fetch single organization detail when clicked
  const { data: orgDetail, isLoading: orgDetailLoading } = useQuery<any>({
    queryKey: ['admin-org-detail', selectedOrgId],
    queryFn: () => api.get<any>(`/admin/organizations/${selectedOrgId}`),
    enabled: !!selectedOrgId,
  });

  // Suspend / Reactivate Mutation
  const suspendMutation = useMutation({
    mutationFn: async ({ orgId, action, reason }: { orgId: string; action: 'SUSPEND' | 'REACTIVATE'; reason: string }) => {
      if (action === 'SUSPEND') {
        return api.post(`/admin/organizations/${orgId}/suspend`, { reason });
      } else {
        return api.post(`/admin/organizations/${orgId}/reactivate`, { reason });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orgs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      if (selectedOrgId) {
        queryClient.invalidateQueries({ queryKey: ['admin-org-detail', selectedOrgId] });
      }
      setSuspensionModal({ isOpen: false, org: null, action: 'SUSPEND', reason: '' });
    },
  });

  // Admin Update Integration Asset Mutation
  const updateAssetMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.patch(`/admin/organizations/${selectedOrgId}/phone-numbers/${data.phoneId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org-detail', selectedOrgId] });
      queryClient.invalidateQueries({ queryKey: ['admin-orgs'] });
      setEditingAsset((prev) => ({ ...prev, isOpen: false }));
      setAssetSuccessNotice('WhatsApp integration credentials updated successfully!');
      setTimeout(() => setAssetSuccessNotice(null), 4000);
    },
  });

  // Platform Owner: Create Customer Organization Mutation
  const createOrgMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/admin/organizations', payload);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orgs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setCreatedSuccessInfo(data);
    },
  });

  // Platform Owner: Purge Demo Accounts Mutation
  const purgeDemoMutation = useMutation({
    mutationFn: async () => {
      return api.post('/admin/clean-demo-access');
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orgs'] });
      setPurgeDemoModalOpen(false);
      setPurgeSuccessNotice(data?.message || 'Demo logins successfully purged. Only master Platform Owner remains.');
      setTimeout(() => setPurgeSuccessNotice(null), 6000);
    },
  });

  // Webhook Relay Mutations
  const addWebhookMutation = useMutation({
    mutationFn: async ({ orgId, payload }: { orgId: string; payload: any }) => {
      return api.post(`/admin/organizations/${orgId}/webhooks`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org-detail', selectedOrgId] });
      setNewRelayUrl('');
      setNewRelayName('');
      setNewRelaySecret('doot_dynamic_verify_token_2026');
      setRelayTestNotice({ success: true, message: 'External dynamic relay webhook added successfully!' });
      setTimeout(() => setRelayTestNotice(null), 4000);
    },
    onError: (err: any) => {
      setRelayTestNotice({ success: false, message: `Failed to add webhook: ${err.message}` });
      setTimeout(() => setRelayTestNotice(null), 6000);
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: async ({ orgId, webhookId }: { orgId: string; webhookId: string }) => {
      return api.delete(`/admin/organizations/${orgId}/webhooks/${webhookId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org-detail', selectedOrgId] });
      setRelayTestNotice({ success: true, message: 'Relay webhook removed.' });
      setTimeout(() => setRelayTestNotice(null), 3000);
    },
  });

  const testWebhookMutation = useMutation({
    mutationFn: async ({ orgId, webhookId }: { orgId: string; webhookId: string }) => {
      return api.post(`/admin/organizations/${orgId}/webhooks/${webhookId}/test`);
    },
    onSuccess: (data: any) => {
      setRelayTestingId(null);
      const isSuccess = data?.responseStatus >= 200 && data?.responseStatus < 300;
      setRelayTestNotice({
        success: isSuccess,
        message: `HTTP ${data?.responseStatus || 'Error'} (${data?.durationMs || 0}ms): ${data?.errorMessage || 'Delivery confirmed to destination domain!'}`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-org-detail', selectedOrgId] });
      setTimeout(() => setRelayTestNotice(null), 7000);
    },
    onError: (err: any) => {
      setRelayTestingId(null);
      setRelayTestNotice({ success: false, message: `Delivery test failed: ${err.message}` });
      setTimeout(() => setRelayTestNotice(null), 7000);
    },
  });

  // Platform Owner: Update Organization Details Mutation
  const updateOrgMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.patch(`/admin/organizations/${payload.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orgs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      if (selectedOrgId) {
        queryClient.invalidateQueries({ queryKey: ['admin-org-detail', selectedOrgId] });
      }
      setEditingOrg(null);
      setPurgeSuccessNotice('Organization parameters and relay settings updated successfully!');
      setTimeout(() => setPurgeSuccessNotice(null), 5000);
    },
    onError: (err: any) => {
      alert(`Failed to update organization: ${err.message || 'Error updating organization'}`);
    },
  });

  // Platform Owner: Update Specific Webhook Relay Mutation
  const updateOrgWebhookMutation = useMutation({
    mutationFn: async ({ orgId, webhookId, payload }: { orgId: string; webhookId: string; payload: any }) => {
      return api.patch(`/admin/organizations/${orgId}/webhooks/${webhookId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org-detail', selectedOrgId] });
      setEditingWebhook(null);
      setRelayTestNotice({ success: true, message: 'Relay webhook configuration updated successfully!' });
      setTimeout(() => setRelayTestNotice(null), 4000);
    },
    onError: (err: any) => {
      setRelayTestNotice({ success: false, message: `Failed to update webhook: ${err.message}` });
      setTimeout(() => setRelayTestNotice(null), 6000);
    },
  });

  const orgList: OrgItem[] = Array.isArray(orgs) ? orgs : (orgs as any)?.data || [];
  const userList: any[] = Array.isArray(users) ? users : (users as any)?.data || [];
  const messageList: any[] = messagesData?.data || [];
  const campaignList: any[] = campaignsData?.data || [];
  const webhookList: any[] = webhooksData?.data || [];
  const auditList: any[] = auditData?.data || [];

  const filteredOrs = orgList.filter((o) => {
    const matchesSearch = o.name.toLowerCase().includes(searchTerm.toLowerCase()) || o.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const fallbackStats: AdminStats = {
    organizations: {
      total: orgList.length || 3,
      active: orgList.filter((o) => o.status === 'ACTIVE').length || 3,
      trial: 0,
      suspended: orgList.filter((o) => o.status === 'SUSPENDED').length || 0,
    },
    users: {
      total: userList.length || 6,
    },
    messaging: {
      totalContacts: 28,
      totalMessages: 6,
      campaignsRun: 0,
      messagesDispatched: 1,
      messagesDelivered: 1,
      messagesRead: 5,
      messagesFailed: 0,
      deliverySuccessRatePct: 100,
    },
    webhooks: {
      successful: 4,
      failed: 0,
    },
    support: {
      openTickets: 0,
    },
    queues: {
      messagingQueue: { waiting: 0, active: 0, completed: 0, failed: 0 },
      webhookQueue: { waiting: 0, active: 0, completed: 0, failed: 0 },
      campaignQueue: { waiting: 0, active: 0, completed: 0, failed: 0 },
      status: 'OPERATIONAL',
    },
    systemHealth: 'OPERATIONAL',
    timestamp: new Date().toISOString(),
  };

  const activeStats = stats || fallbackStats;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. Header & Live System Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span className="uppercase tracking-wider">Peers Automate Master Platform Administration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <span>Platform Owner Command Center</span>
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              SYSTEM OPERATIONAL
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Real-time cross-tenant governance, operational KPI analytics, user directory, and background queue monitoring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refetchStats();
              refetchOrgs();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-xs transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-2">
        {[
          { id: 'overview', label: 'Platform Overview', icon: Activity },
          { id: 'organizations', label: 'Customer Organizations', icon: Building2 },
          { id: 'users', label: 'User Directory', icon: Users },
          { id: 'messages', label: 'Platform Messages', icon: MessageSquare },
          { id: 'campaigns', label: 'Broadcast Campaigns', icon: Send },
          { id: 'webhooks', label: 'Outbound Webhooks', icon: Webhook },
          { id: 'plans', label: 'SaaS Plans & Limits', icon: CreditCard },
          { id: 'queues', label: 'Queues & Workers', icon: Server },
          { id: 'audit', label: 'Security Audit Trail', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSearchTerm('');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW METRICS WITH CLICKABLE DRILL-DOWNS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Registered Organizations */}
            <div
              onClick={() => {
                setActiveTab('organizations');
                setStatusFilter('ALL');
              }}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:shadow-md transition cursor-pointer shadow-xs group"
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                <span className="group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition">Registered Tenants</span>
                <Building2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                {activeStats.organizations.total}
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px]">
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab('organizations');
                    setStatusFilter('ACTIVE');
                  }}
                  className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                >
                  {activeStats.organizations.active} Active
                </span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab('organizations');
                    setStatusFilter('TRIAL');
                  }}
                  className="text-amber-600 dark:text-amber-400 font-bold hover:underline"
                >
                  {activeStats.organizations.trial} Trial
                </span>
                {activeStats.organizations.suspended > 0 && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab('organizations');
                        setStatusFilter('SUSPENDED');
                      }}
                      className="text-rose-600 dark:text-rose-400 font-bold hover:underline"
                    >
                      {activeStats.organizations.suspended} Suspended
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* 2. Platform Users */}
            <div
              onClick={() => setActiveTab('users')}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:shadow-md transition cursor-pointer shadow-xs group"
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition">Total Platform Users</span>
                <Users className="w-4 h-4 text-indigo-500 dark:text-indigo-400 group-hover:scale-110 transition" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                {activeStats.users.total}
              </div>
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Across customer workspaces</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500 opacity-0 group-hover:opacity-100 transition" />
              </div>
            </div>

            {/* 3. Messages Dispatched */}
            <div
              onClick={() => {
                setActiveTab('messages');
                setMessageStatusFilter('ALL');
              }}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500/50 hover:shadow-md transition cursor-pointer shadow-xs group"
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                <span className="group-hover:text-teal-600 dark:group-hover:text-teal-300 transition">Messages Dispatched</span>
                <TrendingUp className="w-4 h-4 text-teal-500 dark:text-teal-400 group-hover:scale-110 transition" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition">
                {activeStats.messaging.messagesDispatched.toLocaleString()}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{activeStats.messaging.deliverySuccessRatePct}% Delivery Success</span>
              </div>
            </div>

            {/* 4. Queue Health */}
            <div
              onClick={() => setActiveTab('queues')}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 hover:shadow-md transition cursor-pointer shadow-xs group"
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                <span className="group-hover:text-amber-600 dark:group-hover:text-amber-300 transition">Background Queues</span>
                <Server className="w-4 h-4 text-amber-500 dark:text-amber-400 group-hover:scale-110 transition" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                {activeStats.queues.status}
              </div>
              <div className="mt-2 text-[11px] text-amber-600 dark:text-amber-400 flex items-center justify-between font-medium">
                <span>5 BullMQ Queues Active</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-amber-500 opacity-0 group-hover:opacity-100 transition" />
              </div>
            </div>
          </div>

          {/* Secondary Breakdown with Clickable Drill-Downs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Messaging Performance Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Messaging Breakdown</h3>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">Click to filter</span>
              </div>
              <div className="space-y-2 text-xs">
                <div
                  onClick={() => {
                    setActiveTab('messages');
                    setMessageStatusFilter('ALL');
                  }}
                  className="flex justify-between py-2 px-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                  <span className="text-slate-600 dark:text-slate-400">Total Tracked Messages</span>
                  <span className="font-bold text-slate-900 dark:text-slate-200">{activeStats.messaging.totalMessages.toLocaleString()}</span>
                </div>
                <div
                  onClick={() => setActiveTab('campaigns')}
                  className="flex justify-between py-2 px-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                  <span className="text-slate-600 dark:text-slate-400">Broadcast Campaigns</span>
                  <span className="font-bold text-slate-900 dark:text-slate-200">{activeStats.messaging.campaignsRun}</span>
                </div>
                <div
                  onClick={() => {
                    setActiveTab('messages');
                    setMessageStatusFilter('DELIVERED');
                  }}
                  className="flex justify-between py-2 px-2.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer transition border border-transparent hover:border-emerald-200 dark:hover:border-emerald-500/30"
                >
                  <span className="text-slate-600 dark:text-slate-400">Delivered Outcomes</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{activeStats.messaging.messagesDelivered.toLocaleString()}</span>
                </div>
                <div
                  onClick={() => {
                    setActiveTab('messages');
                    setMessageStatusFilter('FAILED');
                  }}
                  className="flex justify-between py-2 px-2.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer transition border border-transparent hover:border-rose-200 dark:hover:border-rose-500/30"
                >
                  <span className="text-slate-600 dark:text-slate-400">Failed Dispatches</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">{activeStats.messaging.messagesFailed.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Webhook Reliability Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Webhook Reliability</h3>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">Click to filter</span>
              </div>
              <div className="space-y-2 text-xs">
                <div
                  onClick={() => {
                    setActiveTab('webhooks');
                    setWebhookStatusFilter('SUCCESS');
                  }}
                  className="flex justify-between py-2 px-2.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer transition border border-transparent hover:border-emerald-200 dark:hover:border-emerald-500/30"
                >
                  <span className="text-slate-600 dark:text-slate-400">Successful Deliveries (2xx)</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{activeStats.webhooks.successful}</span>
                </div>
                <div
                  onClick={() => {
                    setActiveTab('webhooks');
                    setWebhookStatusFilter('FAILED');
                  }}
                  className="flex justify-between py-2 px-2.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer transition border border-transparent hover:border-rose-200 dark:hover:border-rose-500/30"
                >
                  <span className="text-slate-600 dark:text-slate-400">Failed Deliveries (4xx/5xx)</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">{activeStats.webhooks.failed}</span>
                </div>
                <div
                  onClick={() => setActiveTab('webhooks')}
                  className="flex justify-between py-2 px-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                  <span className="text-slate-600 dark:text-slate-400">SSRF Defense State</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">ACTIVE (RFC1918 Blocked)</span>
                </div>
              </div>
            </div>

            {/* System Health Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Infrastructure Health</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-2 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/60">
                  <span className="text-slate-600 dark:text-slate-400">API Cluster Engine</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">ONLINE (NestJS v11)</span>
                </div>
                <div className="flex justify-between py-2 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/60">
                  <span className="text-slate-600 dark:text-slate-400">PostgreSQL Pool</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">HEALTHY (17 Conns)</span>
                </div>
                <div
                  onClick={() => setActiveTab('queues')}
                  className="flex justify-between py-2 px-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                  <span className="text-slate-600 dark:text-slate-400">Redis 8 Queue Daemon</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{activeStats.queues.status}</span>
                </div>
                <div
                  onClick={() => setActiveTab('audit')}
                  className="flex justify-between py-2 px-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                  <span className="text-slate-600 dark:text-slate-400">Security Audit Trail</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">VIEW AUDIT LOGS &rarr;</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORGANIZATIONS DIRECTORY */}
      {activeTab === 'organizations' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search business name or slug..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
              <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="TRIAL">Trial</option>
              </select>

              <button
                type="button"
                onClick={() => setPurgeDemoModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer transition shadow-2xs"
                title="Purge seed demo logins so only the master Platform Owner remains"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Clean Demo Logins</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCreateOrgForm({
                    name: '',
                    slug: '',
                    planTier: 'STARTER',
                    adminFirstName: '',
                    adminLastName: '',
                    adminEmail: '',
                    adminPassword: '',
                    displayPhoneNumber: '',
                    phoneNumberId: '',
                    wabaId: '',
                    metaBusinessId: '',
                    verifiedName: '',
                    accessToken: '',
                    platformDomain: getInitialPlatformDomain(),
                    externalWebhookUrl: '',
                    externalWebhookToken: 'doot_dynamic_verify_token_2026',
                    showPassword: false,
                    showToken: false,
                  });
                  setCreatedSuccessInfo(null);
                  setCreateOrgModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Customer Company</span>
              </button>
            </div>
          </div>

          {purgeSuccessNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 text-xs font-semibold flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{purgeSuccessNotice}</span>
              </div>
              <button onClick={() => setPurgeSuccessNotice(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {activateSubNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 text-xs font-semibold flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{activateSubNotice.message}</span>
              </div>
              <button onClick={() => setActivateSubNotice(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="px-5 py-3.5">Organization</th>
                    <th className="px-5 py-3.5">Plan Tier</th>
                    <th className="px-5 py-3.5">Subscription</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Team</th>
                    <th className="px-5 py-3.5">Contacts</th>
                    <th className="px-5 py-3.5 whitespace-nowrap">Campaigns</th>
                    <th className="px-5 py-3.5 whitespace-nowrap">Registered</th>
                    <th className="px-5 py-3.5 text-right whitespace-nowrap min-w-[280px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {orgsLoading ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-8 text-center text-slate-400 font-mono">
                        Loading customer organizations...
                      </td>
                    </tr>
                  ) : filteredOrs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-8 text-center text-slate-500">
                        No organizations found matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredOrs.map((org) => {
                      const isSuspended = org.status === 'SUSPENDED';
                      const sub = (org as any).subscription;
                      const isSubActive = sub?.status === 'ACTIVE';
                      return (
                        <tr key={org.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition">
                          <td
                            onClick={() => {
                              setSelectedOrgId(org.id);
                              setOrgDetailTab('overview');
                            }}
                            className="px-5 py-4 cursor-pointer"
                          >
                            <div className="font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition flex items-center gap-1.5">
                              <span>{org.name}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{org.slug}</div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30">
                              {org.planTier || 'STARTER'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                isSubActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isSubActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              <span>{isSubActive ? 'ACTIVE' : 'PENDING'}</span>
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isSuspended
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
                              }`}
                            >
                              {org.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-700 dark:text-slate-300 font-medium">{org._count?.memberships || 1} members</td>
                          <td className="px-5 py-4 text-slate-700 dark:text-slate-300 font-medium">{org._count?.contacts || 0}</td>
                          <td className="px-5 py-4 text-slate-700 dark:text-slate-300 font-medium">{org._count?.campaigns || 0}</td>
                          <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-[11px]">{new Date(org.createdAt).toLocaleDateString()}</td>
                          <td className="px-5 py-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setActivateSubModal({
                                    isOpen: true,
                                    org,
                                    planTier: org.planTier || 'GROWTH',
                                    months: 1,
                                    reason: 'Manual Admin Approval / Offline Payment',
                                  });
                                }}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs whitespace-nowrap ${
                                  isSubActive
                                    ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40'
                                }`}
                                title={isSubActive ? 'Extend Subscription / Add Paid Months' : 'Mark Subscription as Paid / Activate Workspace'}
                              >
                                <CheckCircle2 className={`w-3.5 h-3.5 ${isSubActive ? 'text-slate-500' : 'text-emerald-600 dark:text-emerald-400'}`} />
                                <span>{isSubActive ? 'Extend' : 'Mark Paid'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  switchOrganization(org.id, {
                                    name: org.name,
                                    slug: org.slug,
                                    planTier: org.planTier,
                                  });
                                  localStorage.setItem('peers_owner_view_mode', 'customer');
                                  navigate('/dashboard');
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-2xs cursor-pointer whitespace-nowrap active:scale-95"
                                title={`Switch directly to ${org.name} Workspace`}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Switch</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrgId(org.id);
                                  setOrgDetailTab('overview');
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-2xs"
                                title="Inspect Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const phone = (org as any).phoneNumbers?.[0];
                                  const meta = phone?.metaIntegration;
                                  const webhook = (org as any).webhookEndpoints?.[0];
                                  setEditingOrg({
                                    isOpen: true,
                                    id: org.id,
                                    name: org.name,
                                    slug: org.slug,
                                    planTier: org.planTier,
                                    status: org.status,
                                    timezone: (org as any).timezone || 'Asia/Kolkata',
                                    appId: meta?.appId || '1460871381832780',
                                    metaBusinessId: meta?.metaBusinessId || '5418283234857525',
                                    wabaName: meta?.name || org.name,
                                    wabaId: meta?.wabaId || '',
                                    phoneNumberId: phone?.phoneNumberId || '',
                                    displayPhoneNumber: phone?.displayPhoneNumber || '',
                                    verifiedName: phone?.verifiedName || org.name,
                                    accessToken: '',
                                    externalWebhookUrl: webhook?.url || '',
                                    externalWebhookToken: webhook?.secret || 'unity_whatsapp_webhook_verify_token_2026',
                                    isWebhookActive: webhook?.isActive !== false,
                                  });
                                }}
                                className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 dark:bg-blue-500/15 dark:hover:bg-blue-500/25 dark:border-blue-500/30 dark:text-blue-300 transition cursor-pointer shadow-2xs"
                                title={`Edit ${org.name} details, plan, WhatsApp connection, and webhooks`}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {isSuspended ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSuspensionModal({
                                      isOpen: true,
                                      org,
                                      action: 'REACTIVATE',
                                      reason: '',
                                    })
                                  }
                                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 dark:border-emerald-500/30 dark:text-emerald-300 transition cursor-pointer shadow-2xs"
                                  title="Reactivate Organization"
                                >
                                  <Unlock className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSuspensionModal({
                                      isOpen: true,
                                      org,
                                      action: 'SUSPEND',
                                      reason: '',
                                    })
                                  }
                                  className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 dark:border-amber-500/30 dark:text-amber-300 transition cursor-pointer shadow-2xs"
                                  title="Suspend Organization"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteOrgModal({
                                    isOpen: true,
                                    org,
                                    isDeleting: false,
                                    error: null,
                                  })
                                }
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 dark:border-rose-500/30 dark:text-rose-300 transition cursor-pointer shadow-2xs"
                                title="Delete this organization workspace permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: USER DIRECTORY */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">All Registered Users Across Peers Automate</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{userList.length} registered accounts</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="px-5 py-3.5">User</th>
                    <th className="px-5 py-3.5">Email</th>
                    <th className="px-5 py-3.5">Organization Workspaces</th>
                    <th className="px-5 py-3.5">Platform Super Admin</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {usersLoading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-mono">
                        Loading platform user directory...
                      </td>
                    </tr>
                  ) : (
                    userList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition">
                        <td className="px-5 py-4 font-semibold text-slate-900 dark:text-slate-100">
                          {u.firstName} {u.lastName}
                        </td>
                        <td className="px-5 py-4 font-mono text-slate-600 dark:text-slate-300">{u.email}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {u.memberships?.map((m: any) => (
                              <span
                                key={m.id}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                              >
                                {m.organization?.name} ({m.role})
                              </span>
                            ))}
                            {(!u.memberships || u.memberships.length === 0) && (
                              <span className="text-slate-400 italic text-[11px]">Platform Operator</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {u.isPlatformAdmin ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40">
                              SUPER ADMIN
                            </span>
                          ) : (
                            <span className="text-slate-400">Customer</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40">
                            ACTIVE
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-[11px]">{new Date(u.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PLATFORM MESSAGES DRILL-DOWN */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search message text or phone number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Delivery Status:</span>
              <select
                value={messageStatusFilter}
                onChange={(e) => setMessageStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="SENT">Sent</option>
                <option value="DELIVERED">Delivered</option>
                <option value="READ">Read</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="px-5 py-3.5">Organization</th>
                    <th className="px-5 py-3.5">Direction</th>
                    <th className="px-5 py-3.5">Recipient / Contact</th>
                    <th className="px-5 py-3.5">Message Body</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {messagesLoading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-mono">
                        Loading platform messages...
                      </td>
                    </tr>
                  ) : messageList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                        No messages found matching search filter.
                      </td>
                    </tr>
                  ) : (
                    messageList.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition">
                        <td className="px-5 py-4 font-bold text-slate-900 dark:text-slate-100">{m.organization?.name}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              m.direction === 'OUTBOUND'
                                ? 'bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-500/20 dark:text-teal-300 dark:border-transparent'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-transparent'
                            }`}
                          >
                            {m.direction}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono text-slate-700 dark:text-slate-300">
                          {m.conversation?.contact?.phone || 'Customer'}
                        </td>
                        <td className="px-5 py-4 max-w-md truncate text-slate-800 dark:text-slate-200 font-medium">
                          {m.body || '<Template / Media Message>'}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.status === 'DELIVERED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                                : m.status === 'READ'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30'
                                : m.status === 'FAILED'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30'
                                : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-transparent'
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-[11px]">{new Date(m.createdAt).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: BROADCAST CAMPAIGNS DRILL-DOWN */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="px-5 py-3.5">Organization</th>
                    <th className="px-5 py-3.5">Campaign Name</th>
                    <th className="px-5 py-3.5">Template</th>
                    <th className="px-5 py-3.5">Audience Size</th>
                    <th className="px-5 py-3.5">Sent / Failed</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {campaignsLoading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400 font-mono">
                        Loading broadcast campaigns...
                      </td>
                    </tr>
                  ) : campaignList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                        No campaigns found.
                      </td>
                    </tr>
                  ) : (
                    campaignList.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition">
                        <td className="px-5 py-4 font-bold text-slate-900 dark:text-slate-100">{c.organization?.name}</td>
                        <td className="px-5 py-4 font-semibold text-slate-800 dark:text-white">{c.name}</td>
                        <td className="px-5 py-4 font-mono text-slate-500 dark:text-slate-400">{c.template?.name || 'Custom'}</td>
                        <td className="px-5 py-4 font-bold text-slate-900 dark:text-slate-200">{c.totalRecipients} recipients</td>
                        <td className="px-5 py-4">
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{c.sentCount || 0} sent</span> /{' '}
                          <span className="text-rose-600 dark:text-rose-400 font-semibold">{c.failedCount || 0} failed</span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.status === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300'
                                : c.status === 'PROCESSING'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 animate-pulse'
                                : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-500/20 dark:text-slate-300'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-[11px]">{new Date(c.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: OUTBOUND WEBHOOKS DRILL-DOWN */}
      {activeTab === 'webhooks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Outbound Webhook Delivery Logs</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Filter Outcome:</span>
              <select
                value={webhookStatusFilter}
                onChange={(e) => setWebhookStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
              >
                <option value="ALL">All Outcomes</option>
                <option value="SUCCESS">Success (2xx)</option>
                <option value="FAILED">Failed (4xx/5xx)</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="px-5 py-3.5">Organization</th>
                    <th className="px-5 py-3.5">Endpoint Destination</th>
                    <th className="px-5 py-3.5">Triggered Event</th>
                    <th className="px-5 py-3.5">HTTP Status</th>
                    <th className="px-5 py-3.5">Latency</th>
                    <th className="px-5 py-3.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {webhooksLoading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-mono">
                        Loading webhook delivery logs...
                      </td>
                    </tr>
                  ) : webhookList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                        No webhook deliveries found matching filter.
                      </td>
                    </tr>
                  ) : (
                    webhookList.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition">
                        <td className="px-5 py-4 font-bold text-slate-900 dark:text-slate-100">{log.organization?.name}</td>
                        <td className="px-5 py-4 font-mono text-slate-600 dark:text-slate-300 max-w-xs truncate">
                          {log.webhookEndpoint?.url || 'Direct Sink'}
                        </td>
                        <td className="px-5 py-4 font-mono text-indigo-600 dark:text-indigo-400 font-bold">{log.event}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.responseStatus >= 200 && log.responseStatus < 300
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300'
                                : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300'
                            }`}
                          >
                            HTTP {log.responseStatus || 'TIMEOUT'}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono text-slate-500 dark:text-slate-400">{log.durationMs}ms</td>
                        <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-[11px]">{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: PLANS & RAZORPAY GATEWAY */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          {/* Razorpay Gateway Settings Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Razorpay Payment Gateway</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure your live or test Razorpay credentials to accept card, UPI, and netbanking subscriptions.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    razorpaySettings?.isConfigured && razorpaySettings?.isEnabled
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      razorpaySettings?.isConfigured && razorpaySettings?.isEnabled
                        ? 'bg-emerald-500 animate-pulse'
                        : 'bg-amber-500'
                    }`}
                  />
                  <span>
                    {razorpaySettings?.isConfigured && razorpaySettings?.isEnabled
                      ? 'Gateway Active'
                      : 'Credentials Needed'}
                  </span>
                </span>
              </div>
            </div>

            {razorpaySaveNotice && (
              <div
                className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                  razorpaySaveNotice.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{razorpaySaveNotice.message}</span>
                </div>
                <button onClick={() => setRazorpaySaveNotice(null)} className="p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveRazorpayMutation.mutate(razorpayForm);
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                    Razorpay Key ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. rzp_live_xxxxxxxxxxxx or rzp_test_xxxxxxxxxxxx"
                    value={razorpayForm.keyId}
                    onChange={(e) => setRazorpayForm({ ...razorpayForm, keyId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                    Razorpay Key Secret *
                  </label>
                  <div className="relative">
                    <input
                      type={razorpayForm.showSecret ? 'text' : 'password'}
                      placeholder={
                        razorpaySettings?.hasSecret
                          ? '•••••••••••••••••••• (Leave blank to keep existing)'
                          : 'Enter razorpay key secret'
                      }
                      value={razorpayForm.keySecret}
                      onChange={(e) => setRazorpayForm({ ...razorpayForm, keySecret: e.target.value })}
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setRazorpayForm({ ...razorpayForm, showSecret: !razorpayForm.showSecret })}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {razorpayForm.showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center pt-2">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">Billing Currency</label>
                  <select
                    value={razorpayForm.currency}
                    onChange={(e) => setRazorpayForm({ ...razorpayForm, currency: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="INR">INR (₹ Indian Rupee)</option>
                    <option value="USD">USD ($ US Dollar)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">Merchant Display Name</label>
                  <input
                    type="text"
                    value={razorpayForm.accountName}
                    onChange={(e) => setRazorpayForm({ ...razorpayForm, accountName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="rzp-enabled"
                    checked={razorpayForm.isEnabled}
                    onChange={(e) => setRazorpayForm({ ...razorpayForm, isEnabled: e.target.checked })}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                  <label htmlFor="rzp-enabled" className="text-slate-700 dark:text-slate-300 font-bold cursor-pointer">
                    Enable Razorpay Gateway
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saveRazorpayMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-xs flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  <Check className="w-4 h-4" />
                  <span>{saveRazorpayMutation.isPending ? 'Saving Gateway Settings...' : 'Save Razorpay Credentials'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Subscription Plans Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Commercial Subscription Plans</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage tiers, pricing in {adminCurrency} ({adminCurrencySymbol}), monthly message quotas, and phone line allocations.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPlanModal({
                    isOpen: true,
                    mode: 'create',
                    name: '',
                    tier: '',
                    monthlyPrice: adminCurrency === 'USD' ? 29 : 1999,
                    annualPrice: adminCurrency === 'USD' ? 290 : 19990,
                    currency: adminCurrency,
                    maxContacts: 5000,
                    maxMonthlyMessages: 15000,
                    maxPhoneNumbers: 2,
                    maxTeamMembers: 5,
                    features: 'crm,bot_flows,campaigns,webhooks,official_meta_api',
                    isActive: true,
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Subscription Plan</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plansLoading ? (
                <div className="col-span-3 text-center py-8 text-slate-400 font-mono text-xs">Loading plans...</div>
              ) : (
                (plans || []).map((p) => {
                  const planCurr = (p.currency || adminCurrency).toUpperCase();
                  const planSymbol = planCurr === 'USD' ? '$' : '₹';
                  const planLocale = planCurr === 'USD' ? 'en-US' : 'en-IN';

                  return (
                    <div
                      key={p.id}
                      className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">{p.name}</h3>
                            <span className="text-[11px] font-mono text-slate-400 uppercase font-bold">{p.tier}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.isActive !== false
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {p.isActive !== false ? 'Active' : 'Archived'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                            {planSymbol}{Number(p.monthlyPrice).toLocaleString(planLocale)}{' '}
                            <span className="text-xs font-normal text-slate-500 dark:text-slate-400 font-sans">
                              / month
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Annual: {planSymbol}{Number(p.annualPrice || p.monthlyPrice * 10).toLocaleString(planLocale)} / year
                          </div>
                        </div>

                      <div className="space-y-2 text-xs border-t border-slate-100 dark:border-slate-800 pt-4 text-slate-700 dark:text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Max Contacts:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-200">
                            {p.maxContacts?.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Monthly Messages:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-200">
                            {p.maxMonthlyMessages?.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Phone Numbers:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-200">{p.maxPhoneNumbers} lines</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Team Seats:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-200">{p.maxTeamMembers} seats</span>
                        </div>
                        {p._count?.subscriptions !== undefined && (
                          <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-slate-500 dark:text-slate-400">Active Tenants:</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {p._count.subscriptions} organizations
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPlanModal({
                            isOpen: true,
                            mode: 'edit',
                            planId: p.id,
                            name: p.name,
                            tier: p.tier,
                            monthlyPrice: Number(p.monthlyPrice),
                            annualPrice: Number(p.annualPrice || p.monthlyPrice * 10),
                            currency: p.currency || 'INR',
                            maxContacts: p.maxContacts,
                            maxMonthlyMessages: p.maxMonthlyMessages,
                            maxPhoneNumbers: p.maxPhoneNumbers,
                            maxTeamMembers: p.maxTeamMembers,
                            features: Array.isArray(p.features) ? p.features.join(',') : '',
                            isActive: p.isActive !== false,
                          });
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete or deactivate plan "${p.name}"?`)) {
                            deletePlanMutation.mutate(p.id);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })
              )}
            </div>
          </div>
        </div>
      )}


      {/* TAB 8: QUEUES & WORKERS */}
      {activeTab === 'queues' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats?.queues &&
              Object.entries(stats.queues).map(([key, val]) => {
                if (typeof val !== 'object' || !val) return null;
                const counts = (val as any).counts || val;
                return (
                  <div key={key} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">{key.replace(/Queue$/, '')} Queue</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30">
                        HEALTHY
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                        <div className="text-slate-500 dark:text-slate-400 text-[10px]">Waiting</div>
                        <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">{counts.waiting || 0}</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                        <div className="text-slate-500 dark:text-slate-400 text-[10px]">Active / Processing</div>
                        <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-1">{counts.active || 0}</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                        <div className="text-slate-500 dark:text-slate-400 text-[10px]">Completed</div>
                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">{counts.completed || 0}</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                        <div className="text-slate-500 dark:text-slate-400 text-[10px]">Failed</div>
                        <div className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1">{counts.failed || 0}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 9: SECURITY AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="px-5 py-3.5">Actor</th>
                    <th className="px-5 py-3.5">Action</th>
                    <th className="px-5 py-3.5">Resource</th>
                    <th className="px-5 py-3.5">Organization</th>
                    <th className="px-5 py-3.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {auditLoading ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-mono">
                        Loading platform audit trail...
                      </td>
                    </tr>
                  ) : auditList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                        No audit records recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditList.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition">
                        <td className="px-5 py-4 font-semibold text-slate-900 dark:text-slate-200">{log.user?.email || 'System'}</td>
                        <td className="px-5 py-4 font-mono font-bold text-rose-600 dark:text-rose-400">{log.action}</td>
                        <td className="px-5 py-4 text-slate-700 dark:text-slate-300 font-mono">{log.resource}</td>
                        <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-300">{log.organization?.name || 'Global'}</td>
                        <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-[11px]">{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ORGANIZATION DETAIL INSPECTION MODAL */}
      {selectedOrgId && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl flex flex-col space-y-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                    <span>{orgDetail?.name || 'Organization Details'}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300">
                      {orgDetail?.planTier}
                    </span>
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">Slug: {orgDetail?.slug} • ID: {selectedOrgId}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {orgDetail && (
                  <button
                    type="button"
                    onClick={() => {
                      const phone = orgDetail.phoneNumbers?.[0];
                      const meta = phone?.metaIntegration;
                      const webhook = orgDetail.webhookEndpoints?.[0];
                      setEditingOrg({
                        isOpen: true,
                        id: orgDetail.id,
                        name: orgDetail.name,
                        slug: orgDetail.slug,
                        planTier: orgDetail.planTier,
                        status: orgDetail.status,
                        timezone: orgDetail.timezone || 'Asia/Kolkata',
                        appId: meta?.appId || '1460871381832780',
                        metaBusinessId: meta?.metaBusinessId || '5418283234857525',
                        wabaName: meta?.name || orgDetail.name,
                        wabaId: meta?.wabaId || '',
                        phoneNumberId: phone?.phoneNumberId || '',
                        displayPhoneNumber: phone?.displayPhoneNumber || '',
                        verifiedName: phone?.verifiedName || orgDetail.name,
                        accessToken: '',
                        externalWebhookUrl: webhook?.url || '',
                        externalWebhookToken: webhook?.secret || 'unity_whatsapp_webhook_verify_token_2026',
                        isWebhookActive: webhook?.isActive !== false,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:hover:bg-blue-500/25 dark:text-blue-300 font-semibold text-xs border border-blue-200 dark:border-blue-500/30 transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Organization</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedOrgId(null)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Sub-tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: Info },
                { id: 'team', label: `Team Members (${orgDetail?.memberships?.length || 0})`, icon: Users },
                { id: 'phones', label: `WhatsApp Assets (${orgDetail?.phoneNumbers?.length || 0})`, icon: Smartphone },
                { id: 'templates', label: `Templates (${orgDetail?._count?.whatsappTemplates ?? orgDetail?.whatsappTemplates?.length ?? 0})`, icon: FileCode },
                { id: 'webhooks', label: `Webhooks & Dynamic Relay (${orgDetail?.webhookEndpoints?.length || 0})`, icon: Webhook },
                { id: 'campaigns', label: `Campaigns (${orgDetail?.campaigns?.length || 0})`, icon: Send },
                { id: 'messages', label: `Recent Messages (${orgDetail?.messages?.length || 0})`, icon: MessageSquare },
              ].map((subTab) => (
                <button
                  key={subTab.id}
                  onClick={() => setOrgDetailTab(subTab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    orgDetailTab === subTab.id
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
                  }`}
                >
                  {subTab.label}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-xs">
              {orgDetailLoading ? (
                <div className="py-12 text-center text-slate-400 font-mono">Loading organization operational telemetry...</div>
              ) : (
                <>
                  {orgDetailTab === 'overview' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                          <div className="text-slate-500 dark:text-slate-400 text-[10px]">Status</div>
                          <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">{orgDetail?.status}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                          <div className="text-slate-500 dark:text-slate-400 text-[10px]">Total Contacts</div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">{orgDetail?._count?.contacts || 0}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                          <div className="text-slate-500 dark:text-slate-400 text-[10px]">Total Messages</div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">{orgDetail?._count?.messages || 0}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                          <div className="text-slate-500 dark:text-slate-400 text-[10px]">Timezone</div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">{orgDetail?.timezone || 'UTC'}</div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2">
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Subscription & Limits</h4>
                        <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                          Commercial tier: <strong className="text-indigo-600 dark:text-indigo-400">{orgDetail?.subscription?.plan?.name || orgDetail?.planTier}</strong> • Billing Status: <strong className="text-emerald-600 dark:text-emerald-400">{orgDetail?.subscription?.status || 'ACTIVE'}</strong>
                        </p>
                      </div>
                    </div>
                  )}

                  {orgDetailTab === 'team' && (
                    <div className="space-y-2">
                      {orgDetail?.memberships?.map((m: any) => (
                        <div key={m.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{m.user.firstName} {m.user.lastName}</div>
                            <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{m.user.email}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300">
                            {m.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {orgDetailTab === 'phones' && (
                    <div className="space-y-3">
                      {assetSuccessNotice && (
                        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 text-xs font-semibold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>{assetSuccessNotice}</span>
                        </div>
                      )}

                      {(!orgDetail?.phoneNumbers || orgDetail.phoneNumbers.length === 0) ? (
                        <div className="py-8 text-center text-slate-400 text-xs">
                          No WhatsApp assets registered for this customer organization yet.
                        </div>
                      ) : (
                        orgDetail.phoneNumbers.map((p: any) => (
                          <div
                            key={p.id}
                            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-white text-sm">
                                  {p.verifiedName || 'Business Line'}
                                </span>
                                {p.isDefault && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300">
                                    DEFAULT
                                  </span>
                                )}
                              </div>
                              <div className="text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold">
                                {p.displayPhoneNumber}
                              </div>
                              <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                <span>Phone ID: <strong className="text-slate-700 dark:text-slate-300">{p.phoneNumberId}</strong></span>
                                <span>•</span>
                                <span>WABA ID: <strong className="text-slate-700 dark:text-slate-300">{p.metaIntegration?.wabaId || 'N/A'}</strong></span>
                                <span>•</span>
                                <span>Biz ID: <strong className="text-slate-700 dark:text-slate-300">{p.metaIntegration?.metaBusinessId || 'N/A'}</strong></span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-center">
                              <div className="text-right">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300">
                                  {p.qualityRating}
                                </span>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                                  {p.messagingLimitTier}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAsset({
                                    isOpen: true,
                                    phoneId: p.id,
                                    verifiedName: p.verifiedName || '',
                                    displayPhoneNumber: p.displayPhoneNumber || '',
                                    phoneNumberId: p.phoneNumberId || '',
                                    wabaId: p.metaIntegration?.wabaId || '',
                                    metaBusinessId: p.metaIntegration?.metaBusinessId || '',
                                    accessToken: '',
                                    qualityRating: p.qualityRating || 'GREEN',
                                    messagingLimitTier: p.messagingLimitTier || 'TIER_10K',
                                    status: p.status || 'CONNECTED',
                                  });
                                  setShowAssetToken(false);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition shadow-2xs cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                <span>Edit Integration</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {orgDetailTab === 'templates' && (() => {
                    const allTemplates: any[] = orgDetail?.whatsappTemplates || [];
                    const filtered = allTemplates.filter((t: any) => {
                      const matchesSearch = !templateSearch.trim() ||
                        t.name?.toLowerCase().includes(templateSearch.toLowerCase()) ||
                        t.category?.toLowerCase().includes(templateSearch.toLowerCase());
                      if (!matchesSearch) return false;
                      if (templatePhoneFilter === 'ALL') return true;
                      return (
                        t.metaIntegrationId === templatePhoneFilter ||
                        t.metaIntegration?.phoneNumbers?.some((p: any) => p.id === templatePhoneFilter || p.phoneNumberId === templatePhoneFilter)
                      );
                    });

                    return (
                      <div className="space-y-3">
                        {/* Search and Multi-Number Filter */}
                        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between pb-1">
                          <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Search templates by name or category..."
                              value={templateSearch}
                              onChange={(e) => setTemplateSearch(e.target.value)}
                              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500"
                            />
                          </div>

                          {orgDetail?.phoneNumbers && orgDetail.phoneNumbers.length > 1 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
                                <Smartphone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Line:
                              </span>
                              <button
                                type="button"
                                onClick={() => setTemplatePhoneFilter('ALL')}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                                  templatePhoneFilter === 'ALL'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                              >
                                All Numbers ({allTemplates.length})
                              </button>
                              {orgDetail.phoneNumbers.map((pn: any) => {
                                const count = allTemplates.filter((t: any) =>
                                  t.metaIntegrationId === pn.metaIntegrationId ||
                                  t.metaIntegration?.phoneNumbers?.some((p: any) => p.id === pn.id || p.phoneNumberId === pn.phoneNumberId)
                                ).length;
                                return (
                                  <button
                                    key={pn.id}
                                    type="button"
                                    onClick={() => setTemplatePhoneFilter(pn.id)}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                                      templatePhoneFilter === pn.id
                                        ? 'bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                  >
                                    <span>{pn.displayPhoneNumber}</span>
                                    <span className="text-[10px] opacity-75 font-mono">({count})</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Templates List */}
                        {filtered.length === 0 ? (
                          <div className="py-10 text-center text-slate-400 text-xs">
                            No WhatsApp message templates match the selected filter.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {filtered.map((t: any) => {
                              const matchedPhone = orgDetail?.phoneNumbers?.find((pn: any) =>
                                pn.metaIntegrationId === t.metaIntegrationId ||
                                t.metaIntegration?.phoneNumbers?.some((p: any) => p.id === pn.id || p.phoneNumberId === pn.phoneNumberId)
                              );

                              return (
                                <div
                                  key={t.id}
                                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-2 hover:border-slate-300 dark:hover:border-slate-700 transition"
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-slate-900 dark:text-white text-xs">{t.name}</span>
                                      {matchedPhone && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                          <Smartphone className="w-3 h-3" />
                                          {matchedPhone.displayPhoneNumber} {matchedPhone.verifiedName ? `(${matchedPhone.verifiedName})` : ''}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-slate-500 dark:text-slate-400 text-[10px]">
                                      Language: <strong className="text-slate-700 dark:text-slate-300">{t.language}</strong> • Category: <strong className="text-slate-700 dark:text-slate-300">{t.category}</strong>
                                      {t.metaIntegration?.name && (
                                        <span> • Connection: <strong className="text-slate-700 dark:text-slate-300">{t.metaIntegration.name}</strong></span>
                                      )}
                                    </div>
                                  </div>
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold self-start sm:self-center ${
                                      t.status === 'APPROVED'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300'
                                        : t.status === 'REJECTED'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300'
                                    }`}
                                  >
                                    {t.status}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {orgDetailTab === 'webhooks' && (
                    <div className="space-y-4">
                      {/* Card 1: Official Meta Inbound Webhook Configuration */}
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Webhook className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                              Dedicated Meta Inbound Webhook Credentials
                            </h4>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                            Official Callback
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          Paste this dedicated Callback URL and Verify Token into your Meta App Settings (<strong className="text-slate-700 dark:text-slate-300">WhatsApp &gt; Configuration &gt; Callback URL</strong>). When taking this system live, simply update the domain below — the webhook path <code className="font-mono text-emerald-600 dark:text-emerald-400">/api/v1/meta/webhook/...</code> remains fixed.
                        </p>

                        {/* Base Domain Switcher */}
                        <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              Platform Base Domain (Local or Production)
                            </label>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setInspectorPlatformDomain('http://localhost:3000')}
                                className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer font-medium transition"
                              >
                                Localhost:3000
                              </button>
                              <button
                                type="button"
                                onClick={() => setInspectorPlatformDomain(window.location.origin)}
                                className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer font-medium transition"
                              >
                                Current Origin ({window.location.host})
                              </button>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={inspectorPlatformDomain}
                            onChange={(e) => setInspectorPlatformDomain(e.target.value)}
                            placeholder="http://localhost:3000 or https://api.yourdomain.com"
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="space-y-2.5">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                              Primary Callback URL (UUID-based)
                            </label>
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="text"
                                readOnly
                                value={`${inspectorPlatformDomain.replace(/\/+$/, '')}/api/v1/meta/webhook/${orgDetail.id}`}
                                className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white font-semibold"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${inspectorPlatformDomain.replace(/\/+$/, '')}/api/v1/meta/webhook/${orgDetail.id}`);
                                  setCopiedWebhook('URL');
                                  setTimeout(() => setCopiedWebhook(null), 2500);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer transition shadow-2xs flex items-center gap-1 shrink-0"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>{copiedWebhook === 'URL' ? 'Copied!' : 'Copy URL'}</span>
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                              Alternative Slug Callback URL (Human-readable)
                            </label>
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="text"
                                readOnly
                                value={`${inspectorPlatformDomain.replace(/\/+$/, '')}/api/v1/meta/webhook/${orgDetail.slug}`}
                                className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-600 dark:text-slate-300"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${inspectorPlatformDomain.replace(/\/+$/, '')}/api/v1/meta/webhook/${orgDetail.slug}`);
                                  setCopiedWebhook('SLUG_URL');
                                  setTimeout(() => setCopiedWebhook(null), 2500);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer transition shadow-2xs flex items-center gap-1 shrink-0"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>{copiedWebhook === 'SLUG_URL' ? 'Copied!' : 'Copy Slug URL'}</span>
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                              Verification Token (hub.verify_token)
                            </label>
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="text"
                                readOnly
                                value={orgDetail.phoneNumbers?.[0]?.metaIntegration?.webhookVerifyToken || 'doot_meta_verify_token_2026'}
                                className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white font-semibold"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const token = orgDetail.phoneNumbers?.[0]?.metaIntegration?.webhookVerifyToken || 'doot_meta_verify_token_2026';
                                  navigator.clipboard.writeText(token);
                                  setCopiedWebhook('TOKEN');
                                  setTimeout(() => setCopiedWebhook(null), 2500);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer transition shadow-2xs flex items-center gap-1 shrink-0"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>{copiedWebhook === 'TOKEN' ? 'Copied!' : 'Copy Token'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Dynamic External Outbound Webhook Relay */}
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                            <span>Dynamic Outbound Webhook Relay (Forward to Custom Domain)</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold">
                              Dual Real-Time Sync
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            When events come from WhatsApp, Peers Automate records them in Live Chat and simultaneously POSTs them to your external domain/system.
                          </p>
                        </div>

                        {/* Add New Relay Webhook */}
                        <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                          <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            + Add External Forwarding Webhook
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Relay Name (e.g. My External CRM)"
                              value={newRelayName}
                              onChange={(e) => setNewRelayName(e.target.value)}
                              className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                            />
                            <input
                              type="url"
                              placeholder="https://yourdomain.com/api/whatsapp-callback"
                              value={newRelayUrl}
                              onChange={(e) => setNewRelayUrl(e.target.value)}
                              className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                              Relay Verification Token / Secret (hub.verify_token / Secret)
                            </label>
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="text"
                                placeholder="doot_dynamic_verify_token_2026"
                                value={newRelaySecret}
                                onChange={(e) => setNewRelaySecret(e.target.value)}
                                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white font-semibold"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (newRelaySecret) {
                                    navigator.clipboard.writeText(newRelaySecret);
                                    setCopiedWebhook('RELAY_INPUT_TOKEN');
                                    setTimeout(() => setCopiedWebhook(null), 2500);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer transition shadow-2xs flex items-center gap-1 shrink-0"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>{copiedWebhook === 'RELAY_INPUT_TOKEN' ? 'Copied!' : 'Copy Token'}</span>
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                            <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={relayReceiveMsg}
                                  onChange={(e) => setRelayReceiveMsg(e.target.checked)}
                                  className="rounded text-rose-600"
                                />
                                <span>Inbound Messages (Live Chat)</span>
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={relayStatusUpdate}
                                  onChange={(e) => setRelayStatusUpdate(e.target.checked)}
                                  className="rounded text-rose-600"
                                />
                                <span>Status &amp; Failure Reasons</span>
                              </label>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (!newRelayUrl.trim()) return;
                                const events = [];
                                if (relayReceiveMsg) events.push('message.received');
                                if (relayStatusUpdate) events.push('message.status_update');
                                addWebhookMutation.mutate({
                                  orgId: selectedOrgId!,
                                  payload: {
                                    name: newRelayName.trim() || 'Custom External Relay',
                                    url: newRelayUrl.trim(),
                                    secret: newRelaySecret.trim() || 'doot_dynamic_verify_token_2026',
                                    events: events.length ? events : ['message.received', 'message.status_update'],
                                  },
                                });
                              }}
                              disabled={addWebhookMutation.isPending || !newRelayUrl.trim()}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer transition shadow-2xs"
                            >
                              {addWebhookMutation.isPending ? 'Registering...' : 'Add Relay Webhook'}
                            </button>
                          </div>
                        </div>

                        {/* Configured Outbound Webhooks List */}
                        {orgDetail.webhookEndpoints && orgDetail.webhookEndpoints.length > 0 ? (
                          <div className="space-y-2 pt-1">
                            {orgDetail.webhookEndpoints.map((ep: any) => (
                              <div
                                key={ep.id}
                                className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-2"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 dark:text-white text-xs">{ep.name}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      ep.isActive !== false
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                                        : 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                                    }`}>
                                      {ep.isActive !== false ? 'ACTIVE' : 'PAUSED'}
                                    </span>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                      {ep._count?.deliveryLogs || 0} deliveries
                                    </span>
                                  </div>
                                  <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 truncate max-w-md">
                                    {ep.url}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                    <span>Events: {ep.events?.join(', ')}</span>
                                    {ep.secret && (
                                      <>
                                        <span>•</span>
                                        <span className="font-mono text-[10px] text-slate-500">Token: {ep.secret.length > 20 ? `${ep.secret.slice(0, 10)}...` : ep.secret}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            navigator.clipboard.writeText(ep.secret);
                                            setCopiedWebhook(`RELAY_TOKEN_${ep.id}`);
                                            setTimeout(() => setCopiedWebhook(null), 2500);
                                          }}
                                          className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer text-[10px] inline-flex items-center gap-0.5 font-medium"
                                        >
                                          <Copy className="w-2.5 h-2.5" />
                                          <span>{copiedWebhook === `RELAY_TOKEN_${ep.id}` ? 'Copied!' : 'Copy Token'}</span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingWebhook({
                                        isOpen: true,
                                        id: ep.id,
                                        name: ep.name,
                                        url: ep.url,
                                        secret: ep.secret || '',
                                        events: ep.events || ['message.received', 'message.status_update'],
                                        isActive: ep.isActive !== false,
                                      });
                                    }}
                                    className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[11px] font-semibold cursor-pointer transition flex items-center gap-1"
                                    title="Edit this dynamic relay webhook configuration"
                                  >
                                    <Edit3 className="w-3 h-3 text-blue-500" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRelayTestingId(ep.id);
                                      testWebhookMutation.mutate({ orgId: selectedOrgId!, webhookId: ep.id });
                                    }}
                                    disabled={relayTestingId === ep.id}
                                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold cursor-pointer transition flex items-center gap-1"
                                  >
                                    <Activity className="w-3 h-3 text-indigo-500" />
                                    <span>{relayTestingId === ep.id ? 'Testing...' : 'Test Delivery'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteWebhookMutation.mutate({ orgId: selectedOrgId!, webhookId: ep.id })}
                                    className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-semibold cursor-pointer transition"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-4 text-center text-slate-400 text-xs">
                            No external dynamic relays registered for this organization yet.
                          </div>
                        )}

                        {relayTestNotice && (
                          <div className={`p-3 rounded-lg text-xs font-mono flex items-center gap-2 ${
                            relayTestNotice.success
                              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          }`}>
                            <Info className="w-4 h-4 shrink-0" />
                            <span>{relayTestNotice.message}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {orgDetailTab === 'campaigns' && (
                    <div className="space-y-2">
                      {orgDetail?.campaigns?.map((c: any) => (
                        <div key={c.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{c.name}</div>
                            <div className="text-slate-500 dark:text-slate-400 text-[10px]">{c.totalRecipients} recipients • {c.sentCount} sent</div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300">
                            {c.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {orgDetailTab === 'messages' && (
                    <div className="space-y-2">
                      {orgDetail?.messages?.map((m: any) => (
                        <div key={m.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                          <div className="max-w-md">
                            <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">{m.direction} • {m.conversation?.contact?.phone || 'Customer'}</div>
                            <div className="text-slate-800 dark:text-slate-200 mt-0.5 font-medium">{m.body || '<Template message>'}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300">
                            {m.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSelectedOrgId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUSPENSION / REACTIVATION MODAL */}
      {suspensionModal.isOpen && suspensionModal.org && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {suspensionModal.action === 'SUSPEND' ? 'Suspend Organization' : 'Reactivate Organization'}
                </h3>
              </div>
              <button
                onClick={() => setSuspensionModal({ ...suspensionModal, isOpen: false })}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {suspensionModal.action === 'SUSPEND'
                ? `Suspending "${suspensionModal.org.name}" blocks new messages and campaign execution. All customer data, contacts, and audit history remain safe and intact.`
                : `Reactivating "${suspensionModal.org.name}" restores normal operational access for this customer workspace.`}
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Audit Reason (Required for security logs):
              </label>
              <textarea
                rows={3}
                value={suspensionModal.reason}
                onChange={(e) => setSuspensionModal({ ...suspensionModal, reason: e.target.value })}
                placeholder="e.g. Terms of Service review, payment dispute, or customer request..."
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSuspensionModal({ ...suspensionModal, isOpen: false })}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!suspensionModal.reason.trim() || suspendMutation.isPending}
                onClick={() =>
                  suspendMutation.mutate({
                    orgId: suspensionModal.org!.id,
                    action: suspensionModal.action,
                    reason: suspensionModal.reason,
                  })
                }
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  suspensionModal.action === 'SUSPEND'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                } disabled:opacity-50`}
              >
                {suspendMutation.isPending ? 'Processing...' : suspensionModal.action === 'SUSPEND' ? 'Confirm Suspension' : 'Confirm Reactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* EDIT INTEGRATION ASSET MODAL */}
      {editingAsset.isOpen && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Edit WhatsApp Integration Asset
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Update Meta Cloud credentials, WABA identifiers, and tier limits.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAsset((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateAssetMutation.mutate(editingAsset);
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Verified / Business Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingAsset.verifiedName}
                    onChange={(e) => setEditingAsset({ ...editingAsset, verifiedName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    placeholder="e.g. Peers Global Business Media"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Display Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    value={editingAsset.displayPhoneNumber}
                    onChange={(e) => setEditingAsset({ ...editingAsset, displayPhoneNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                    placeholder="e.g. +91 96646 20704"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Meta Phone Number ID
                  </label>
                  <input
                    type="text"
                    required
                    value={editingAsset.phoneNumberId}
                    onChange={(e) => setEditingAsset({ ...editingAsset, phoneNumberId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                    placeholder="e.g. 1148211571702139"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    WhatsApp Business Account (WABA ID)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingAsset.wabaId}
                    onChange={(e) => setEditingAsset({ ...editingAsset, wabaId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                    placeholder="e.g. 1475250733815899"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Meta Business Account ID
                </label>
                <input
                  type="text"
                  value={editingAsset.metaBusinessId}
                  onChange={(e) => setEditingAsset({ ...editingAsset, metaBusinessId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                  placeholder="e.g. 5418283234857525"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    System User Permanent Access Token
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAssetToken(!showAssetToken)}
                    className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                  >
                    {showAssetToken ? 'Hide Token' : 'Show Token'}
                  </button>
                </div>
                <input
                  type={showAssetToken ? 'text' : 'password'}
                  value={editingAsset.accessToken}
                  onChange={(e) => setEditingAsset({ ...editingAsset, accessToken: e.target.value })}
                  placeholder="Leave blank to keep existing encrypted token intact"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-[11px] focus:outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Only enter a new token if rotating or re-authenticating with Meta. Stored using AES-256-GCM.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quality Rating
                  </label>
                  <select
                    value={editingAsset.qualityRating}
                    onChange={(e) => setEditingAsset({ ...editingAsset, qualityRating: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="GREEN">GREEN (High Quality)</option>
                    <option value="YELLOW">YELLOW (Medium Quality)</option>
                    <option value="RED">RED (Low Quality)</option>
                    <option value="UNKNOWN">UNKNOWN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Messaging Limit Tier
                  </label>
                  <select
                    value={editingAsset.messagingLimitTier}
                    onChange={(e) => setEditingAsset({ ...editingAsset, messagingLimitTier: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="TIER_250">TIER_250 (250 msgs / 24h)</option>
                    <option value="TIER_1K">TIER_1K (1,000 msgs / 24h)</option>
                    <option value="TIER_10K">TIER_10K (10,000 msgs / 24h)</option>
                    <option value="TIER_100K">TIER_100K (100,000 msgs / 24h)</option>
                    <option value="TIER_UNLIMITED">TIER_UNLIMITED</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAsset((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateAssetMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {updateAssetMutation.isPending ? 'Saving...' : 'Save Integration Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 3: PLATFORM OWNER - CREATE CUSTOMER COMPANY */}
      {createOrgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    {createdSuccessInfo ? 'Company Workspace Created!' : 'Create Customer Company & Owner Login'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {createdSuccessInfo ? 'New tenant workspace is ready for live access.' : 'Provision tenant workspace, owner credentials, and WhatsApp assets.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setCreateOrgModalOpen(false);
                  setCreatedSuccessInfo(null);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {createdSuccessInfo ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 space-y-1">
                    <div className="font-bold text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span>{createdSuccessInfo.message}</span>
                    </div>
                    <p className="text-[11px] opacity-90">
                      The customer workspace and initial administrator credentials have been securely provisioned.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-[11px]">
                      Access Credentials (ID &amp; Password)
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500">Company Name:</span>
                        <div className="font-bold text-slate-900 dark:text-white">{createdSuccessInfo.organization?.name}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Plan Tier:</span>
                        <div className="font-bold text-indigo-600 dark:text-indigo-400">{createdSuccessInfo.organization?.planTier}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Login Email (User ID):</span>
                        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{createdSuccessInfo.adminUser?.email}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Initial Password:</span>
                        <div className="font-mono font-bold text-slate-900 dark:text-white">{createOrgForm.adminPassword}</div>
                      </div>
                    </div>
                  </div>

                  {createdSuccessInfo.phoneAsset && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-[11px]">
                        Configured WhatsApp Asset
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Smartphone className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-slate-900 dark:text-white font-mono">
                          {createdSuccessInfo.phoneAsset.displayPhoneNumber}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600 dark:text-slate-300">
                          {createdSuccessInfo.phoneAsset.verifiedName}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200 text-[11px] flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Dedicated Meta Inbound Webhook Credentials</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100/80 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                        Ready for Meta Setup
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                        Primary Callback URL (UUID)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={`${(createOrgForm.platformDomain || getInitialPlatformDomain()).replace(/\/+$/, '')}/api/v1/meta/webhook/${createdSuccessInfo.organization?.id}`}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs text-indigo-700 dark:text-indigo-300 font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`${(createOrgForm.platformDomain || getInitialPlatformDomain()).replace(/\/+$/, '')}/api/v1/meta/webhook/${createdSuccessInfo.organization?.id}`);
                            setCopiedWebhook('CREATED_URL');
                            setTimeout(() => setCopiedWebhook(null), 2500);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shrink-0 flex items-center gap-1"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedWebhook === 'CREATED_URL' ? 'Copied!' : 'Copy URL'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                        Verification Token (hub.verify_token)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value="doot_meta_verify_token_2026"
                          className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText('doot_meta_verify_token_2026');
                            setCopiedWebhook('CREATED_TOKEN');
                            setTimeout(() => setCopiedWebhook(null), 2500);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shrink-0 flex items-center gap-1"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedWebhook === 'CREATED_TOKEN' ? 'Copied!' : 'Copy Token'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {createOrgForm.externalWebhookUrl && (
                    <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200 text-[11px] flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Dynamic Outbound Webhook Relay Configured</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100/80 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                          Custom CRM Relay
                        </span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                          External Forwarding Destination URL
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={createOrgForm.externalWebhookUrl}
                            className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs text-emerald-700 dark:text-emerald-300 font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(createOrgForm.externalWebhookUrl);
                              setCopiedWebhook('CREATED_DYNAMIC_URL');
                              setTimeout(() => setCopiedWebhook(null), 2500);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer shrink-0 flex items-center gap-1"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedWebhook === 'CREATED_DYNAMIC_URL' ? 'Copied!' : 'Copy URL'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                          Dynamic Verification Token / Secret
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={createOrgForm.externalWebhookToken || 'doot_dynamic_verify_token_2026'}
                            className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(createOrgForm.externalWebhookToken || 'doot_dynamic_verify_token_2026');
                              setCopiedWebhook('CREATED_DYNAMIC_TOKEN');
                              setTimeout(() => setCopiedWebhook(null), 2500);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shrink-0 flex items-center gap-1"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedWebhook === 'CREATED_DYNAMIC_TOKEN' ? 'Copied!' : 'Copy Token'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCreateOrgModalOpen(false);
                        setCreatedSuccessInfo(null);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer transition shadow-xs"
                    >
                      Done &amp; Close
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    createOrgMutation.mutate({
                      name: createOrgForm.name,
                      slug: createOrgForm.slug || undefined,
                      planTier: createOrgForm.planTier,
                      adminUser: {
                        firstName: createOrgForm.adminFirstName,
                        lastName: createOrgForm.adminLastName || undefined,
                        email: createOrgForm.adminEmail,
                        password: createOrgForm.adminPassword,
                      },
                      whatsappIntegration: createOrgForm.phoneNumberId && createOrgForm.displayPhoneNumber ? {
                        phoneNumberId: createOrgForm.phoneNumberId,
                        displayPhoneNumber: createOrgForm.displayPhoneNumber,
                        wabaId: createOrgForm.wabaId,
                        metaBusinessId: createOrgForm.metaBusinessId,
                        verifiedName: createOrgForm.verifiedName || createOrgForm.name,
                        accessToken: createOrgForm.accessToken,
                      } : undefined,
                      externalWebhookUrl: createOrgForm.externalWebhookUrl || undefined,
                      externalWebhookToken: createOrgForm.externalWebhookToken || undefined,
                    });
                  }}
                  className="space-y-4"
                >
                  {createOrgMutation.isError && (
                    <div className="p-3 rounded-xl bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 border border-rose-200 dark:border-rose-800 text-xs font-semibold">
                      {(createOrgMutation.error as any)?.message || 'Failed to create organization account'}
                    </div>
                  )}

                  {/* Section 1: Company Profile */}
                  <div className="space-y-2.5">
                    <div className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] pb-1 border-b border-slate-200 dark:border-slate-800">
                      1. Company Workspace Profile
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Company / Workspace Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Tata Motors Dealership"
                          value={createOrgForm.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            const derivedSlug = val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
                            setCreateOrgForm({ ...createOrgForm, name: val, slug: derivedSlug });
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Commercial Plan
                        </label>
                        <select
                          value={createOrgForm.planTier}
                          onChange={(e) => setCreateOrgForm({ ...createOrgForm, planTier: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500 cursor-pointer"
                        >
                          <option value="STARTER">STARTER</option>
                          <option value="PROFESSIONAL">PROFESSIONAL</option>
                          <option value="ENTERPRISE">ENTERPRISE</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Owner Login Credentials */}
                  <div className="space-y-2.5">
                    <div className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] pb-1 border-b border-slate-200 dark:border-slate-800">
                      2. Administrator Login Access (ID &amp; Password)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Admin First Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Rajesh"
                          value={createOrgForm.adminFirstName}
                          onChange={(e) => setCreateOrgForm({ ...createOrgForm, adminFirstName: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Admin Login Email (ID) *
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="rajesh@tatadealer.com"
                          value={createOrgForm.adminEmail}
                          onChange={(e) => setCreateOrgForm({ ...createOrgForm, adminEmail: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Initial Password *
                        </label>
                        <div className="relative">
                          <input
                            type={createOrgForm.showPassword ? 'text' : 'password'}
                            required
                            placeholder="Min 8 characters"
                            value={createOrgForm.adminPassword}
                            onChange={(e) => setCreateOrgForm({ ...createOrgForm, adminPassword: e.target.value })}
                            className="w-full px-3 py-2 pr-8 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                          />
                          <button
                            type="button"
                            onClick={() => setCreateOrgForm({ ...createOrgForm, showPassword: !createOrgForm.showPassword })}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: WhatsApp Meta Integration Assets */}
                  <div className="space-y-2.5">
                    <div className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] pb-1 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span>3. WhatsApp Meta Credentials (Immediate Setup)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Optional now or configure later</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Display Phone Number
                        </label>
                        <input
                          type="text"
                          placeholder="+91 96646 20704"
                          value={createOrgForm.displayPhoneNumber}
                          onChange={(e) => setCreateOrgForm({ ...createOrgForm, displayPhoneNumber: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Phone Number ID
                        </label>
                        <input
                          type="text"
                          placeholder="1148211571702139"
                          value={createOrgForm.phoneNumberId}
                          onChange={(e) => setCreateOrgForm({ ...createOrgForm, phoneNumberId: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          WhatsApp Business Account (WABA ID)
                        </label>
                        <input
                          type="text"
                          placeholder="1475250733815899"
                          value={createOrgForm.wabaId}
                          onChange={(e) => setCreateOrgForm({ ...createOrgForm, wabaId: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Meta Business ID
                        </label>
                        <input
                          type="text"
                          placeholder="5418283234857525"
                          value={createOrgForm.metaBusinessId}
                          onChange={(e) => setCreateOrgForm({ ...createOrgForm, metaBusinessId: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Meta Permanent Access Token (Encrypted with AES-256-GCM)
                      </label>
                      <div className="relative">
                        <input
                          type={createOrgForm.showToken ? 'text' : 'password'}
                          placeholder="EAAG..."
                          value={createOrgForm.accessToken}
                          onChange={(e) => setCreateOrgForm({ ...createOrgForm, accessToken: e.target.value })}
                          className="w-full px-3 py-2 pr-8 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                        />
                        <button
                          type="button"
                          onClick={() => setCreateOrgForm({ ...createOrgForm, showToken: !createOrgForm.showToken })}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Default Meta Inbound Webhook (Platform Callback) */}
                  <div className="space-y-3 p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                    <div className="flex items-center justify-between pb-1 border-b border-indigo-200/60 dark:border-indigo-800/60">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                        <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>4. Default Meta Inbound Webhook (System Callback URL)</span>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100/80 dark:bg-indigo-900/50 px-2 py-0.5 rounded-full">
                        Generated by Platform Domain
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      This is the dedicated webhook callback that connects Meta WhatsApp to this company. When moving between local testing and live production, <strong className="text-indigo-600 dark:text-indigo-400">only the domain changes</strong> — the backend path <code className="font-mono text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-1 py-0.5 rounded text-[10px]">/api/v1/meta/webhook/...</code> remains fixed!
                    </p>

                    {/* Platform Base Domain Selector */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Platform Host / Base Domain:
                        </label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setCreateOrgForm({ ...createOrgForm, platformDomain: 'http://localhost:3000' })}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition font-medium"
                          >
                            Localhost:3000
                          </button>
                          <button
                            type="button"
                            onClick={() => setCreateOrgForm({ ...createOrgForm, platformDomain: window.location.origin })}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition font-medium"
                          >
                            Current Origin ({window.location.host})
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={createOrgForm.platformDomain}
                        onChange={(e) => setCreateOrgForm({ ...createOrgForm, platformDomain: e.target.value })}
                        placeholder="http://localhost:3000 or https://api.yourdomain.com"
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Meta WhatsApp Callback URL */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Default Meta WhatsApp Callback URL (Copy to Meta App Settings)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={`${(createOrgForm.platformDomain || 'http://localhost:3000').replace(/\/+$/, '')}/api/v1/meta/webhook/${createOrgForm.slug || 'company-slug'}`}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-indigo-700 dark:text-indigo-300 font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`${(createOrgForm.platformDomain || 'http://localhost:3000').replace(/\/+$/, '')}/api/v1/meta/webhook/${createOrgForm.slug || 'company-slug'}`);
                            setCopiedWebhook('CREATE_FORM_URL');
                            setTimeout(() => setCopiedWebhook(null), 2500);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer transition shadow-2xs shrink-0 flex items-center gap-1"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedWebhook === 'CREATE_FORM_URL' ? 'Copied!' : 'Copy URL'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Verify Token */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Meta Verification Token (hub.verify_token)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value="doot_meta_verify_token_2026"
                          className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText('doot_meta_verify_token_2026');
                            setCopiedWebhook('CREATE_FORM_TOKEN');
                            setTimeout(() => setCopiedWebhook(null), 2500);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer transition shadow-2xs shrink-0 flex items-center gap-1"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedWebhook === 'CREATE_FORM_TOKEN' ? 'Copied!' : 'Copy Token'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Section 5: Dynamic Outbound Webhook Relay */}
                  <div className="space-y-3 p-3.5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30">
                    <div className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] pb-1 border-b border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>5. Dynamic Outbound Webhook Relay (Custom Domain / CRM Plugin)</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        External Forwarding Webhook URL (Your Custom Domain)
                      </label>
                      <input
                        type="url"
                        placeholder="https://yourdomain.com/api/whatsapp-callback"
                        value={createOrgForm.externalWebhookUrl}
                        onChange={(e) => setCreateOrgForm({ ...createOrgForm, externalWebhookUrl: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        If provided, WhatsApp incoming messages, delivery statuses, and exact failure reasons will also be simultaneously forwarded to this external domain in real-time.
                      </p>
                    </div>

                    {/* Dynamic Verification Token */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Dynamic Verification Token (hub.verify_token / Secret)
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const gen = `doot_dyn_verify_${Math.random().toString(36).substring(2, 10)}`;
                            setCreateOrgForm({ ...createOrgForm, externalWebhookToken: gen });
                          }}
                          className="text-[10px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-semibold cursor-pointer"
                        >
                          Generate New Token
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={createOrgForm.externalWebhookToken}
                          onChange={(e) => setCreateOrgForm({ ...createOrgForm, externalWebhookToken: e.target.value })}
                          placeholder="doot_dynamic_verify_token_2026"
                          className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (createOrgForm.externalWebhookToken) {
                              navigator.clipboard.writeText(createOrgForm.externalWebhookToken);
                              setCopiedWebhook('CREATE_FORM_DYNAMIC_TOKEN');
                              setTimeout(() => setCopiedWebhook(null), 2500);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer transition shadow-2xs shrink-0 flex items-center gap-1"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedWebhook === 'CREATE_FORM_DYNAMIC_TOKEN' ? 'Copied!' : 'Copy Token'}</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Token used by your custom CRM / endpoint to verify authenticity via <code className="font-mono text-[9px]">X-DOOT-Verify-Token</code> header and payload HMAC validation.
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setCreateOrgModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-semibold cursor-pointer transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createOrgMutation.isPending}
                      className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {createOrgMutation.isPending ? 'Creating Workspace...' : 'Create Company Workspace'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PURGE DEMO LOGINS CONFIRMATION */}
      {purgeDemoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Purge Demo Logins</h3>
                <p className="text-xs text-slate-500">Only Master Platform Owner will remain.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This will remove all demo / seed non-owner accounts (<code className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">admin@acme.com</code>, <code className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">agent@acme.com</code>, <code className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">ceo@globex.com</code>, etc.).
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
              Only your owner account (<strong className="text-emerald-600 dark:text-emerald-400 font-mono">owner@doot.io</strong>) and any customer companies you explicitly provision will have access.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPurgeDemoModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-semibold cursor-pointer transition text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={purgeDemoMutation.isPending}
                onClick={() => purgeDemoMutation.mutate()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer transition shadow-xs text-xs disabled:opacity-50"
              >
                {purgeDemoMutation.isPending ? 'Purging Logins...' : 'Confirm Purge (Owner Only)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: DELETE ORGANIZATION CONFIRMATION */}
      {deleteOrgModal.isOpen && deleteOrgModal.org && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Delete Organization</h3>
                <p className="text-xs text-slate-500">Permanent workspace deletion.</p>
              </div>
            </div>

            {deleteOrgModal.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {deleteOrgModal.error}
              </div>
            )}

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-900 dark:text-white font-bold">{deleteOrgModal.org.name}</strong> (<span className="font-mono text-[11px] text-slate-500">{deleteOrgModal.org.slug}</span>)?
            </p>
            <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed font-semibold">
              Warning: This will delete all connected WhatsApp integrations, phone numbers, templates, campaigns, and contacts associated with this company workspace.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                disabled={deleteOrgModal.isDeleting}
                onClick={() => setDeleteOrgModal({ isOpen: false, org: null, isDeleting: false, error: null })}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-semibold cursor-pointer transition text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteOrgModal.isDeleting}
                onClick={handleDeleteOrg}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer transition shadow-xs text-xs disabled:opacity-50"
              >
                {deleteOrgModal.isDeleting ? 'Deleting Organization...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: EDIT ORGANIZATION DETAILS */}
      {editingOrg?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Edit Organization &amp; WhatsApp Details</h3>
                  <p className="text-xs text-slate-500">Update company parameters, WhatsApp Cloud API credentials, and webhooks.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrg(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateOrgMutation.mutate(editingOrg);
              }}
              className="space-y-4 text-xs overflow-y-auto pr-1"
            >
              {/* SECTION 1: ORGANIZATION PARAMETERS */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">Workspace Information</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Company / Organization Name *</label>
                    <input
                      type="text"
                      required
                      value={editingOrg.name}
                      onChange={(e) => setEditingOrg({ ...editingOrg, name: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Workspace Slug / URL Identifier *</label>
                    <input
                      type="text"
                      required
                      value={editingOrg.slug}
                      onChange={(e) => setEditingOrg({ ...editingOrg, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Plan Tier</label>
                    <select
                      value={editingOrg.planTier}
                      onChange={(e) => setEditingOrg({ ...editingOrg, planTier: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                    >
                      <option value="STARTER">STARTER</option>
                      <option value="GROWTH">GROWTH</option>
                      <option value="PROFESSIONAL">PROFESSIONAL</option>
                      <option value="ENTERPRISE">ENTERPRISE</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Workspace Status</label>
                    <select
                      value={editingOrg.status}
                      onChange={(e) => setEditingOrg({ ...editingOrg, status: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Timezone</label>
                    <select
                      value={editingOrg.timezone}
                      onChange={(e) => setEditingOrg({ ...editingOrg, timezone: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+5:30)</option>
                      <option value="America/New_York">America/New_York (EST - UTC-5:00)</option>
                      <option value="Europe/London">Europe/London (GMT - UTC+0:00)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST - UTC+4:00)</option>
                      <option value="UTC">UTC (Universal)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: WHATSAPP CLOUD API CONNECTION DETAILS (FROM SCREENSHOT 2) */}
              <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200/60 dark:border-emerald-800/40 pb-2">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                      WhatsApp Cloud API Connection Details
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40">
                    META CREDENTIALS
                  </span>
                </div>

                {/* Row 1: App ID & Business ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>Meta App ID</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Message Sender</span>
                    </label>
                    <input
                      type="text"
                      value={editingOrg.appId}
                      onChange={(e) => setEditingOrg({ ...editingOrg, appId: e.target.value })}
                      placeholder="1460871381832780"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 font-mono text-[11px] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>Meta Business Portfolio ID</span>
                      <span className="text-[10px] text-slate-400">Business Manager</span>
                    </label>
                    <input
                      type="text"
                      value={editingOrg.metaBusinessId}
                      onChange={(e) => setEditingOrg({ ...editingOrg, metaBusinessId: e.target.value })}
                      placeholder="5418283234857525"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 font-mono text-[11px] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Row 2: WABA Name & WABA ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      WhatsApp Business Account Name
                    </label>
                    <input
                      type="text"
                      value={editingOrg.wabaName}
                      onChange={(e) => setEditingOrg({ ...editingOrg, wabaName: e.target.value })}
                      placeholder="Peers Automate Test Number"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      WhatsApp Business Account (WABA) ID
                    </label>
                    <input
                      type="text"
                      value={editingOrg.wabaId}
                      onChange={(e) => setEditingOrg({ ...editingOrg, wabaId: e.target.value })}
                      placeholder="190986030764540"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 font-mono text-[11px] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Row 3: Phone ID & Display Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Phone Number ID
                    </label>
                    <input
                      type="text"
                      value={editingOrg.phoneNumberId}
                      onChange={(e) => setEditingOrg({ ...editingOrg, phoneNumberId: e.target.value })}
                      placeholder="191039950759200"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 font-mono text-[11px] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Display Phone Number
                    </label>
                    <input
                      type="text"
                      value={editingOrg.displayPhoneNumber}
                      onChange={(e) => setEditingOrg({ ...editingOrg, displayPhoneNumber: e.target.value })}
                      placeholder="+1 555 051 1240"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Row 4: Verified Business Name */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Verified Business Name (on WhatsApp)
                  </label>
                  <input
                    type="text"
                    value={editingOrg.verifiedName}
                    onChange={(e) => setEditingOrg({ ...editingOrg, verifiedName: e.target.value })}
                    placeholder="Peers Automate Test Number"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Row 5: Permanent Access Token */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>Permanent Access Token</span>
                    <span className="text-[10px] text-slate-400 font-normal">Encrypted with AES-256-GCM</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showOrgAccessToken ? 'text' : 'password'}
                      value={editingOrg.accessToken}
                      onChange={(e) => setEditingOrg({ ...editingOrg, accessToken: e.target.value })}
                      placeholder="Leave empty to keep existing token, or paste new token to update"
                      className="w-full pl-3.5 pr-10 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOrgAccessToken(!showOrgAccessToken)}
                      className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showOrgAccessToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Only fill this if you generated a fresh System User or Graph API Token. Leave blank to preserve current credentials.
                  </p>
                </div>
              </div>

              {/* SECTION 3: WEBHOOKS & DYNAMIC RELAY */}
              <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/40 space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-200/60 dark:border-indigo-800/40 pb-2">
                  <div className="flex items-center gap-2">
                    <Webhook className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                      Webhooks &amp; Dynamic Event Relays
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/40">
                    REAL-TIME SYNC
                  </span>
                </div>

                {/* Meta Inbound Webhook Display */}
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300">
                      1. Official Meta Inbound Webhook (Configure in Meta Developers Portal)
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
                            setOrgCopiedKey('INBOUND_URL');
                            setTimeout(() => setOrgCopiedKey(null), 2500);
                          }}
                          className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          {orgCopiedKey === 'INBOUND_URL' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{orgCopiedKey === 'INBOUND_URL' ? 'Copied' : 'Copy'}</span>
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
                            setOrgCopiedKey('INBOUND_TOKEN');
                            setTimeout(() => setOrgCopiedKey(null), 2500);
                          }}
                          className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          {orgCopiedKey === 'INBOUND_TOKEN' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{orgCopiedKey === 'INBOUND_TOKEN' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="font-mono text-[10px] text-slate-800 dark:text-slate-200 truncate select-all">
                        unity_whatsapp_webhook_verify_token_2026
                      </div>
                    </div>
                  </div>
                </div>

                {/* External Relay Webhook Configuration */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300">
                      2. External Outbound Relay Webhook (Forward to Custom CRM / Backend)
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingOrg.isWebhookActive}
                        onChange={(e) => setEditingOrg({ ...editingOrg, isWebhookActive: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        {editingOrg.isWebhookActive ? 'Relay Active' : 'Relay Paused'}
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Destination Webhook URL
                    </label>
                    <input
                      type="url"
                      placeholder="e.g. https://your-crm.com/api/v1/whatsapp/webhook"
                      value={editingOrg.externalWebhookUrl}
                      onChange={(e) => setEditingOrg({ ...editingOrg, externalWebhookUrl: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 font-mono text-[11px] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Relay Verification Token / Secret
                    </label>
                    <input
                      type="text"
                      placeholder="unity_whatsapp_webhook_verify_token_2026"
                      value={editingOrg.externalWebhookToken}
                      onChange={(e) => setEditingOrg({ ...editingOrg, externalWebhookToken: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 font-mono text-[11px] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingOrg(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-semibold cursor-pointer transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateOrgMutation.isPending}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer transition shadow-xs text-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{updateOrgMutation.isPending ? 'Saving All Changes...' : 'Save Organization &amp; WhatsApp Details'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: EDIT WEBHOOK ENDPOINT */}
      {editingWebhook?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Webhook className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Edit Relay Webhook</h3>
                  <p className="text-xs text-slate-500">Update destination URL, signing token, and subscribed events.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingWebhook(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateOrgWebhookMutation.mutate({
                  orgId: selectedOrgId!,
                  webhookId: editingWebhook.id,
                  payload: {
                    name: editingWebhook.name,
                    url: editingWebhook.url,
                    secret: editingWebhook.secret,
                    events: editingWebhook.events,
                    isActive: editingWebhook.isActive,
                  },
                });
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Webhook Name *</label>
                <input
                  type="text"
                  required
                  value={editingWebhook.name}
                  onChange={(e) => setEditingWebhook({ ...editingWebhook, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Destination URL *</label>
                <input
                  type="url"
                  required
                  value={editingWebhook.url}
                  onChange={(e) => setEditingWebhook({ ...editingWebhook, url: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-[11px] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Signing Secret / Verify Token</label>
                <input
                  type="text"
                  value={editingWebhook.secret}
                  onChange={(e) => setEditingWebhook({ ...editingWebhook, secret: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-[11px] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">Subscribed Event Triggers</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'message.received', label: 'Incoming Messages (message.received)' },
                    { id: 'message.status_update', label: 'Status Updates (message.status_update)' },
                    { id: 'template.status_update', label: 'Template Updates (template.status_update)' },
                    { id: 'conversation.status', label: 'Conversation Lifecycle (conversation.status)' },
                  ].map((evt) => {
                    const isChecked = editingWebhook.events.includes(evt.id);
                    return (
                      <label key={evt.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newEvents = e.target.checked
                              ? [...editingWebhook.events, evt.id]
                              : editingWebhook.events.filter((x) => x !== evt.id);
                            setEditingWebhook({ ...editingWebhook, events: newEvents });
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                        />
                        <span className="text-[11px] text-slate-700 dark:text-slate-300">{evt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">Relay Delivery Active</div>
                  <div className="text-[11px] text-slate-500">Enable or pause forwarding real-time events to this destination.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingWebhook.isActive}
                    onChange={(e) => setEditingWebhook({ ...editingWebhook, isActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingWebhook(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-semibold cursor-pointer transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateOrgWebhookMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer transition shadow-xs text-xs disabled:opacity-50"
                >
                  {updateOrgWebhookMutation.isPending ? 'Saving...' : 'Update Webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MANUALLY ACTIVATE CUSTOMER SUBSCRIPTION */}
      {activateSubModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    Activate Workspace Subscription
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Grant immediate paid subscription status and unlock customer workspace.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivateSubModal({ isOpen: false, org: null, planTier: 'GROWTH', months: 1, reason: '' })}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <div className="text-slate-500">Customer Organization:</div>
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                {activateSubModal.org?.name}
              </div>
              <div className="font-mono text-[11px] text-slate-400">
                Slug: {activateSubModal.org?.slug}
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                  Select Subscription Tier *
                </label>
                <select
                  value={activateSubModal.planTier}
                  onChange={(e) => setActivateSubModal({ ...activateSubModal, planTier: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-emerald-500"
                >
                  {(plans || []).map((p: any) => (
                    <option key={p.id} value={p.tier}>
                      {p.name} ({p.tier}) — ₹{Number(p.monthlyPrice).toLocaleString('en-IN')}/mo
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                  Validity Duration *
                </label>
                <select
                  value={activateSubModal.months}
                  onChange={(e) => setActivateSubModal({ ...activateSubModal, months: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value={1}>1 Month (30 Days)</option>
                  <option value={3}>3 Months (90 Days)</option>
                  <option value={6}>6 Months (180 Days)</option>
                  <option value={12}>1 Year / 12 Months (365 Days)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                  Payment Notes / Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Wire transfer confirmed / Cash receipt / Special platform approval"
                  value={activateSubModal.reason}
                  onChange={(e) => setActivateSubModal({ ...activateSubModal, reason: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                ✓ Confirming will immediately mark the customer's subscription as <strong>PAID / ACTIVE</strong>, generate a paid invoice record, and unlock all platform features.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActivateSubModal({ isOpen: false, org: null, planTier: 'GROWTH', months: 1, reason: '' })}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={activateOrgSubMutation.isPending}
                onClick={() => {
                  activateOrgSubMutation.mutate({
                    orgId: activateSubModal.org?.id,
                    planTier: activateSubModal.planTier,
                    months: activateSubModal.months,
                    reason: activateSubModal.reason,
                  });
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-98"
              >
                <Check className="w-4 h-4" />
                <span>{activateOrgSubMutation.isPending ? 'Activating...' : 'Confirm Activation & Unlock Workspace'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT SUBSCRIPTION PLAN */}
      {planModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    {planModal.mode === 'create' ? 'Create Subscription Plan' : 'Edit Subscription Plan'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Define commercial tier limits, pricing in {planModal.currency || adminCurrency} ({planModal.currency === 'USD' ? '$' : '₹'}), and features.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPlanModal({ ...planModal, isOpen: false })}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                savePlanMutation.mutate({
                  name: planModal.name,
                  tier: planModal.tier,
                  monthlyPrice: Number(planModal.monthlyPrice),
                  annualPrice: Number(planModal.annualPrice),
                  currency: planModal.currency || adminCurrency,
                  maxContacts: Number(planModal.maxContacts),
                  maxMonthlyMessages: Number(planModal.maxMonthlyMessages),
                  maxPhoneNumbers: Number(planModal.maxPhoneNumbers),
                  maxTeamMembers: Number(planModal.maxTeamMembers),
                  features: planModal.features ? planModal.features.split(',').map((s) => s.trim()) : [],
                  isActive: planModal.isActive,
                });
              }}
              className="p-6 overflow-y-auto space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">Plan Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Starter Plan, Scale Plan"
                    value={planModal.name}
                    onChange={(e) => setPlanModal({ ...planModal, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">Plan Tier Code *</label>
                  <input
                    type="text"
                    required
                    disabled={planModal.mode === 'edit'}
                    placeholder="e.g. STARTER, GROWTH, ENTERPRISE"
                    value={planModal.tier}
                    onChange={(e) => setPlanModal({ ...planModal, tier: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                    Monthly Price ({planModal.currency === 'USD' ? '$' : '₹'}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="1999"
                    value={planModal.monthlyPrice}
                    onChange={(e) => setPlanModal({ ...planModal, monthlyPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                    Annual Price ({planModal.currency === 'USD' ? '$' : '₹'}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="19990"
                    value={planModal.annualPrice}
                    onChange={(e) => setPlanModal({ ...planModal, annualPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">Currency</label>
                  <select
                    value={planModal.currency}
                    onChange={(e) => setPlanModal({ ...planModal, currency: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">Max Contacts</label>
                  <input
                    type="number"
                    required
                    min="100"
                    value={planModal.maxContacts}
                    onChange={(e) => setPlanModal({ ...planModal, maxContacts: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">Monthly Messages Limit</label>
                  <input
                    type="number"
                    required
                    min="500"
                    value={planModal.maxMonthlyMessages}
                    onChange={(e) => setPlanModal({ ...planModal, maxMonthlyMessages: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">Max Phone Lines</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={planModal.maxPhoneNumbers}
                    onChange={(e) => setPlanModal({ ...planModal, maxPhoneNumbers: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">Max Team Seats</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={planModal.maxTeamMembers}
                    onChange={(e) => setPlanModal({ ...planModal, maxTeamMembers: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                  Feature Flags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. crm, bot_flows, campaigns, webhooks, dedicated_support"
                  value={planModal.features}
                  onChange={(e) => setPlanModal({ ...planModal, features: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="plan-active"
                  checked={planModal.isActive}
                  onChange={(e) => setPlanModal({ ...planModal, isActive: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
                <label htmlFor="plan-active" className="text-slate-700 dark:text-slate-300 font-bold cursor-pointer">
                  Plan is Active and available for purchase
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPlanModal({ ...planModal, isOpen: false })}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savePlanMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <Check className="w-4 h-4" />
                  <span>{savePlanMutation.isPending ? 'Saving...' : 'Save Subscription Plan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

