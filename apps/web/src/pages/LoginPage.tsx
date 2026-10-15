import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Lock, Mail, ArrowRight, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@acme.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { setUserSession } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await api.post<{
        user: any;
        organizations: any[];
        token: any;
      }>('/auth/login', { email, password });

      setUserSession(response.user, response.organizations);
      if (response.user?.isPlatformAdmin) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const msg = Array.isArray(err.message) ? err.message.join(', ') : err.message || 'Login failed';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoTenant = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-600/10 via-indigo-600/10 to-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* DOOT Brand */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 text-white font-black text-2xl shadow-xl shadow-emerald-500/25 mb-4">
            D
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Sign in to DOOT</h2>
          <p className="mt-2 text-sm text-slate-400">
            Enterprise WhatsApp Communication & Campaign Platform
          </p>
        </div>

        {/* Form Container */}
        <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:via-teal-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition disabled:opacity-50"
            >
              <span>{isLoading ? 'Verifying Credentials...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Tenant Switcher for Testing */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Quick Test Tenant Credentials</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoTenant('user@doot-test.com')}
                className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 text-left transition"
              >
                <div className="font-bold text-white">DOOT QA Tenant</div>
                <div className="text-[10px] text-emerald-400">user@doot-test.com</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoTenant('owner@doot.io')}
                className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 text-left transition"
              >
                <div className="font-bold text-white">Platform Owner Admin</div>
                <div className="text-[10px] text-purple-400">owner@doot.io</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoTenant('admin@acme.com')}
                className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-blue-500/50 text-left transition"
              >
                <div className="font-bold text-white">Acme Enterprises</div>
                <div className="text-[10px] text-blue-400">admin@acme.com</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoTenant('ceo@globex.com')}
                className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 text-left transition"
              >
                <div className="font-bold text-white">Globex Corp</div>
                <div className="text-[10px] text-indigo-400">ceo@globex.com</div>
              </button>
            </div>
          </div>
        </div>

        {/* Link to Register */}
        <p className="text-center text-sm text-slate-400">
          Need a new organization workspace?{' '}
          <Link to="/register" className="font-semibold text-emerald-400 hover:text-emerald-300">
            Register your business
          </Link>
        </p>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Multi-Tenant Cryptographic Isolation Active</span>
        </div>
      </div>
    </div>
  );
};
