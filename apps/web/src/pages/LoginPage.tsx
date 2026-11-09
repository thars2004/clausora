import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Loader2, AlertCircle, Shield } from 'lucide-react';
import { DEMO_USERS } from '@clausora/shared';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, switchPersona } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (persona: 'client' | 'provider' | 'judge') => {
    setLoading(true);
    try {
      await switchPersona(persona);
      navigate('/dashboard');
    } catch (err: any) {
      setError('Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md p-8 bg-[#111827] border border-slate-800 rounded-3xl shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-white">Sign In to Clausora</h2>
          <p className="text-xs text-slate-400">
            Access your AI work blueprints, evidence graph, and PayPal milestones.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
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
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
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
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
          </button>
        </form>

        {/* 1-Click Fast Pass for Evaluators */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 justify-center">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Hackathon Judge Fast-Pass:</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleDemoLogin('client')}
              type="button"
              className="py-2 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-700/50 text-indigo-300 text-xs font-medium rounded-xl transition"
            >
              Client Demo
            </button>
            <button
              onClick={() => handleDemoLogin('provider')}
              type="button"
              className="py-2 bg-purple-950/60 hover:bg-purple-900 border border-purple-700/50 text-purple-300 text-xs font-medium rounded-xl transition"
            >
              Provider Demo
            </button>
            <button
              onClick={() => handleDemoLogin('judge')}
              type="button"
              className="py-2 bg-amber-950/60 hover:bg-amber-900 border border-amber-700/50 text-amber-300 text-xs font-medium rounded-xl transition"
            >
              Judge Demo
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
