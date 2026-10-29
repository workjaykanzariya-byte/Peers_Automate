import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Smartphone,
  MessageSquare,
  Workflow,
  Users,
  Trophy,
  Webhook,
  FileCode,
  Send,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Menu,
  X,
  LifeBuoy,
  ShieldAlert,
  Sun,
  Moon,
  Activity,
  Server,
  CreditCard,
  History,
  Eye,
  ArrowRight,
  Radio,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Logo } from '../components/Logo';

export const AppShell: React.FC = () => {
  const { user, organizations, activeOrg, switchOrganization, logout } = useAuth();
  const { theme, toggleTheme, setTheme, isDark } = useTheme();
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isAdminRoute = location.pathname.startsWith('/admin');

  // Track whether Platform Owner is viewing Admin Menu or Customer Tenant Menu
  const [adminViewMode, setAdminViewMode] = useState<'admin' | 'customer'>(() => {
    if (location.pathname.startsWith('/admin')) return 'admin';
    const saved = localStorage.getItem('peers_owner_view_mode') as 'admin' | 'customer';
    return saved || (user?.isPlatformAdmin ? 'admin' : 'customer');
  });

  // Automatically sync to admin mode when navigating to /admin
  React.useEffect(() => {
    if (location.pathname.startsWith('/admin')) {
      setAdminViewMode('admin');
      localStorage.setItem('peers_owner_view_mode', 'admin');
    }
  }, [location.pathname]);

  const toggleViewMode = (targetMode: 'admin' | 'customer') => {
    setAdminViewMode(targetMode);
    localStorage.setItem('peers_owner_view_mode', targetMode);
    if (targetMode === 'admin') {
      navigate('/admin?tab=overview');
    } else {
      navigate('/dashboard');
    }
  };

  // Real-time polling for pending/unread messages count
  const { data: conversations = [] } = useQuery<any[]>({
    queryKey: ['conversations'],
    queryFn: () => api.get('/conversations'),
    refetchInterval: 3000,
  });

  const totalUnreadCount = React.useMemo(() => {
    if (!Array.isArray(conversations)) return 0;
    return conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }, [conversations]);

  React.useEffect(() => {
    if (totalUnreadCount > 0) {
      document.title = `(${totalUnreadCount}) Peers Automate — WhatsApp Marketing & CRM Platform`;
    } else {
      document.title = 'Peers Automate — WhatsApp Marketing & CRM Platform';
    }
  }, [totalUnreadCount]);

  // Standard Customer / Tenant Navigation Items
  const customerNavItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'WhatsApp Connection', icon: Smartphone, path: '/whatsapp' },
    { label: 'Inbox & Chat', icon: MessageSquare, path: '/inbox' },
    { label: 'Bot Flow', icon: Workflow, path: '/automations' },
    { label: 'Contacts & Imports', icon: Users, path: '/contacts' },
    { label: 'Leads Pipeline', icon: Trophy, path: '/leads' },
    { label: 'WhatsApp Templates', icon: FileCode, path: '/templates' },
    { label: 'Campaigns & Bulk', icon: Send, path: '/campaigns' },
    { label: 'Webhooks & Logs', icon: Webhook, path: '/webhooks' },
    { label: 'Support & Help', icon: LifeBuoy, path: '/support' },
    { label: 'Settings & Team', icon: Settings, path: '/settings' },
  ];

  // Platform Owner Admin Navigation Items
  const currentAdminTab = new URLSearchParams(location.search).get('tab') || 'overview';
  const adminNavItems = [
    { label: 'Platform Overview', icon: Activity, tab: 'overview' },
    { label: 'Customer Organizations', icon: Building2, tab: 'organizations' },
    { label: 'User Directory', icon: Users, tab: 'users' },
    { label: 'Platform Messages', icon: MessageSquare, tab: 'messages' },
    { label: 'Broadcast Campaigns', icon: Send, tab: 'campaigns' },
    { label: 'Outbound Webhooks', icon: Webhook, tab: 'webhooks' },
    { label: 'SaaS Plans & Limits', icon: CreditCard, tab: 'plans' },
    { label: 'Queues & Telemetry', icon: Server, tab: 'queues' },
    { label: 'Security Audit Trail', icon: History, tab: 'audit' },
  ];

  const isShowingAdminMenu = user?.isPlatformAdmin && adminViewMode === 'admin';

  // Render navigation links list
  const renderNavLinks = () => {
    if (isShowingAdminMenu) {
      return (
        <div className="space-y-1">
          <div className="px-3 pt-2 pb-1.5 text-[10px] font-black uppercase tracking-wider text-rose-500 dark:text-rose-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-3 h-3" />
              Owner Admin Navigation
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          </div>

          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isAdminRoute && currentAdminTab === item.tab;
            return (
              <button
                key={item.tab}
                type="button"
                onClick={() => {
                  navigate(`/admin?tab=${item.tab}`);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-rose-500' : ''}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      );
    }

    // Customer Navigation
    return (
      <div className="space-y-1">
        {user?.isPlatformAdmin && (
          <div className="px-3 pt-2 pb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Customer Workspace</span>
            <span className="text-[9px] font-mono text-emerald-500 font-bold">LIVE VIEW</span>
          </div>
        )}

        {customerNavItems.map((item) => {
          const Icon = item.icon;
          const isInbox = item.path === '/inbox';
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {isInbox && totalUnreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-500 text-white shadow-xs animate-pulse">
                  {totalUnreadCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-[#090d16] text-slate-800 dark:text-slate-100 overflow-hidden transition-colors duration-200">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0d1322]/95 backdrop-blur-xl shrink-0 z-30 transition-colors duration-200">
        {/* Peers Automate Brand Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200 dark:border-slate-800/80">
          <Logo size="sm" showText={true} />
          {user?.isPlatformAdmin && (
            <span
              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border tracking-wider ${
                isShowingAdminMenu
                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              {isShowingAdminMenu ? 'Admin' : 'Tenant'}
            </span>
          )}
        </div>

        {/* Mode Switcher Toggle Button (Visible ONLY to Platform Owners) */}
        {user?.isPlatformAdmin && (
          <div className="p-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
            {isShowingAdminMenu ? (
              <button
                type="button"
                onClick={() => toggleViewMode('customer')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition shadow-2xs group cursor-pointer"
                title="Switch to customer perspective (Dashboard, Inbox, Leads, etc.)"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Eye className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold">Customer View</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 group-hover:bg-emerald-500 group-hover:text-white transition">
                  Switch
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => toggleViewMode('admin')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-indigo-500/15 hover:from-rose-500/25 hover:to-indigo-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/30 transition shadow-2xs group cursor-pointer"
                title="Switch back to Platform Owner Admin Command Center"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
                  </div>
                  <span className="text-xs font-bold">Owner Admin Panel</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-0.5 transition" />
              </button>
            )}
          </div>
        )}

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {renderNavLinks()}
        </nav>

        {/* Footer Status Badge */}
        {isShowingAdminMenu ? (
          <div className="p-3.5 mx-3 my-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 text-xs">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-[11px] mb-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>Root Console Active</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] leading-relaxed">
              Full cross-tenant access and master governance control.
            </p>
          </div>
        ) : (
          <div className="p-3.5 mx-3 my-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Meta Cloud API Ready</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              Official WhatsApp Business Platform architecture.
            </p>
          </div>
        )}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative flex flex-col w-72 max-w-xs bg-white dark:bg-[#0d1322] border-r border-slate-200 dark:border-slate-800 h-full p-4 shadow-2xl z-10">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <Logo size="sm" showText={true} />
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile View Mode Switcher */}
            {user?.isPlatformAdmin && (
              <div className="py-3 border-b border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    toggleViewMode(isShowingAdminMenu ? 'customer' : 'admin');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
                >
                  <span>{isShowingAdminMenu ? 'Switch to Customer View' : 'Switch to Admin Panel'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <nav className="flex-1 py-3 overflow-y-auto">
              {renderNavLinks()}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#0d1322]/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 shrink-0 z-20 transition-colors duration-200">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Tenant Workspace Selector */}
            <div className="relative">
              <button
                onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition text-sm shadow-xs"
              >
                <Building2 className="w-4 h-4 text-emerald-500" />
                <span className="font-semibold text-slate-800 dark:text-slate-200 max-w-[140px] sm:max-w-[200px] truncate">
                  {activeOrg ? activeOrg.name : 'Select Organization'}
                </span>
                {activeOrg && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 uppercase border border-indigo-200 dark:border-transparent">
                    {activeOrg.role}
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
              </button>

              {/* Organization Dropdown Menu */}
              {isOrgDropdownOpen && (
                <div className="absolute left-0 mt-2 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-1.5">
                    Your Workspaces
                  </div>
                  <div className="space-y-1">
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => {
                          switchOrganization(org.id);
                          setIsOrgDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition ${
                          activeOrg?.id === org.id
                            ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{org.name}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">{org.role}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Header: Status + User Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Theme Toggle Pill (Explicit Light / Dark Switch) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  !isDark
                    ? 'bg-white text-emerald-700 shadow-xs font-bold border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-200'
                }`}
                title="White Light Mode"
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  isDark
                    ? 'bg-slate-800 text-indigo-400 shadow-xs font-bold border border-slate-700'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Dark Mode"
              >
                <Moon className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline">Dark</span>
              </button>
            </div>

            {/* Live WhatsApp Status Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>WhatsApp Active</span>
            </div>

            {/* Quick Unread Notification Pill (WhatsApp Style) */}
            {totalUnreadCount > 0 && (
              <NavLink
                to="/inbox"
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition animate-pulse"
                title={`${totalUnreadCount} pending WhatsApp message(s)`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{totalUnreadCount} New</span>
              </NavLink>
            )}

            {/* User Profile & Sign Out */}
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                {user?.firstName ? user.firstName[0].toUpperCase() : 'U'}
              </div>
              <div className="hidden lg:block text-left text-xs">
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{user?.email}</div>
              </div>
              <button
                onClick={logout}
                title="Sign out of Peers Automate"
                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppShell;
