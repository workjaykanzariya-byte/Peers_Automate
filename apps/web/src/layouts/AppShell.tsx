import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
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
  LogOut,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Menu,
  X,
} from 'lucide-react';

export const AppShell: React.FC = () => {
  const { user, organizations, activeOrg, switchOrganization, logout } = useAuth();
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'WhatsApp Connection', icon: Smartphone, path: '/whatsapp' },
    { label: 'Inbox & Chat', icon: MessageSquare, path: '/inbox' },
    { label: 'Bot Flow', icon: Workflow, path: '/automations' },
    { label: 'Contacts & Imports', icon: Users, path: '/contacts' },
    { label: 'Leads Pipeline', icon: Trophy, path: '/leads' },
    { label: 'WhatsApp Templates', icon: FileCode, path: '/templates' },
    { label: 'Campaigns & Bulk', icon: Send, path: '/campaigns' },
    { label: 'Webhooks & Logs', icon: Webhook, path: '/webhooks' },
    { label: 'Settings & Team', icon: Settings, path: '/settings' },
  ];

  return (
    <div className="flex h-screen w-full bg-[#090d16] text-slate-100 overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800/80 bg-[#0d1322]/95 backdrop-blur-xl shrink-0 z-30">
        {/* DOOT Brand Header */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800/80">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-emerald-500/20">
            D
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              DOOT
            </span>
            <span className="ml-2 text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              SaaS v1.0
            </span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500/15 to-indigo-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Meta Platform Trust Badge */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Meta Cloud API Ready</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Official WhatsApp Business Platform architecture.
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar */}
        <header className="h-16 border-b border-slate-800/80 bg-[#0d1322]/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 shrink-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-slate-400 hover:text-white p-1"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Tenant Workspace Selector */}
            <div className="relative">
              <button
                onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition text-sm"
              >
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-slate-200 max-w-[140px] sm:max-w-[200px] truncate">
                  {activeOrg ? activeOrg.name : 'Select Organization'}
                </span>
                {activeOrg && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 uppercase">
                    {activeOrg.role}
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
              </button>

              {/* Organization Dropdown Menu */}
              {isOrgDropdownOpen && (
                <div className="absolute left-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">
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
                            ? 'bg-emerald-500/15 text-emerald-400 font-semibold'
                            : 'text-slate-300 hover:bg-slate-800'
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
          <div className="flex items-center gap-4">
            {/* Live WhatsApp Status Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>WhatsApp Active</span>
            </div>

            {/* User Profile & Sign Out */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow">
                {user?.firstName ? user.firstName[0].toUpperCase() : 'U'}
              </div>
              <div className="hidden lg:block text-left text-xs">
                <div className="font-semibold text-slate-200">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-slate-400 truncate max-w-[150px]">{user?.email}</div>
              </div>
              <button
                onClick={logout}
                title="Sign out of DOOT"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
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
