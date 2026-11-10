import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, AlertCircle, Shield, ArrowLeft } from 'lucide-react';
import { LogoIcon } from '../components/common/Logo';
import { DEMO_USERS } from '@clausora/shared';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, login, switchPersona } = useAuth();

  const redirectTarget =
    (location.state as any)?.from?.pathname || searchParams.get('redirect') || null;
  const demoParam = searchParams.get('demo') || searchParams.get('role');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already logged in, navigate immediately to destination
  useEffect(() => {
    if (user) {
      const destination = redirectTarget || (user.role === 'admin' ? '/admin' : '/dashboard');
      navigate(destination, { replace: true });
    }
  }, [user, redirectTarget, navigate]);

  // Autofill if demo param present
  useEffect(() => {
    if (demoParam === 'client') {
      setEmail(DEMO_USERS.CLIENT.email);
      setPassword(DEMO_USERS.CLIENT.password);
    } else if (demoParam === 'provider') {
      setEmail(DEMO_USERS.PROVIDER.email);
      setPassword(DEMO_USERS.PROVIDER.password);
    } else if (demoParam === 'admin') {
      setEmail(DEMO_USERS.ADMIN.email);
      setPassword(DEMO_USERS.ADMIN.password);
    }
  }, [demoParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      const destination = redirectTarget || '/dashboard';
      navigate(destination, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (persona: 'client' | 'provider' | 'admin') => {
    setLoading(true);
    setError('');
    try {
      await switchPersona(persona);
      const destination = redirectTarget || (persona === 'admin' ? '/admin' : '/dashboard');
      navigate(destination, { replace: true });
    } catch (err: any) {
      setError('Demo fast-pass failed. Please try manual sign in.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (role: 'client' | 'provider' | 'admin') => {
    if (role === 'client') {
      setEmail(DEMO_USERS.CLIENT.email);
      setPassword(DEMO_USERS.CLIENT.password);
    } else if (role === 'provider') {
      setEmail(DEMO_USERS.PROVIDER.email);
      setPassword(DEMO_USERS.PROVIDER.password);
    } else {
      setEmail(DEMO_USERS.ADMIN.email);
      setPassword(DEMO_USERS.ADMIN.password);
    }
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Glow backdrop */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 blur-3xl -z-10 rounded-full" />

      {/* Back to Home Link */}
      <div className="w-full max-w-md mb-4 flex justify-between items-center text-xs">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition" />
          <span>Back to Home</span>
        </Link>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
          Authentication Required
        </span>
      </div>

      <div className="w-full max-w-md p-8 bg-[#111827]/90 border border-slate-800 rounded-3xl shadow-2xl space-y-6 backdrop-blur-sm">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block group">
            <LogoIcon className="w-14 h-14 mx-auto group-hover:scale-105 transition duration-200 drop-shadow-xl" />
          </Link>
          <h2 className="text-2xl font-extrabold text-white">Sign In to Clausora</h2>
          <p className="text-xs text-slate-400">
            {redirectTarget
              ? 'Please sign in to access your requested project workspace.'
              : 'Access your AI work blueprints, evidence graph, and PayPal milestones.'}
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              required
            />
          </div>

          {/* Quick autofill pills */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>Fill demo account:</span>
            <div className="flex gap-1.5 font-mono">
              <button
                type="button"
                onClick={() => fillCredentials('client')}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded transition text-[10px]"
              >
                Client
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('provider')}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded transition text-[10px]"
              >
                Provider
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('admin')}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded transition text-[10px]"
              >
                Admin
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
          </button>
        </form>

        {/* 1-Click Fast Pass for Roles */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 justify-center">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>1-Click Role Fast-Pass:</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleDemoLogin('client')}
              type="button"
              disabled={loading}
              className="py-2.5 px-2 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-700/50 text-indigo-300 text-xs font-medium rounded-xl transition text-center shadow-sm disabled:opacity-50"
            >
              Client (Sarah)
            </button>
            <button
              onClick={() => handleDemoLogin('provider')}
              type="button"
              disabled={loading}
              className="py-2.5 px-2 bg-purple-950/60 hover:bg-purple-900 border border-purple-700/50 text-purple-300 text-xs font-medium rounded-xl transition text-center shadow-sm disabled:opacity-50"
            >
              Provider (Alex)
            </button>
            <button
              onClick={() => handleDemoLogin('admin')}
              type="button"
              disabled={loading}
              className="py-2.5 px-2 bg-amber-950/60 hover:bg-amber-900 border border-amber-700/50 text-amber-300 text-xs font-medium rounded-xl transition text-center shadow-sm disabled:opacity-50"
            >
              Admin (Marcus)
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-indigo-400 hover:underline font-semibold">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};
