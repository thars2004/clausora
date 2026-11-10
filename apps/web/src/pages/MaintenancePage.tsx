import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Logo } from '../components/common/Logo';
import {
  Sparkles,
  Wrench,
  RefreshCw,
  Home,
  LayoutDashboard,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  CreditCard,
  Database,
  ArrowRight,
} from 'lucide-react';

export const MaintenancePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [checking, setChecking] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{
    checked: boolean;
    online: boolean;
    message?: string;
  }>({ checked: false, online: false });

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const res = await api.get('/health');
      if (res.data?.status === 'healthy') {
        setHealthStatus({
          checked: true,
          online: true,
          message: 'All core Clausora services, AI inference, and PayPal Sandbox gateways are operating normally.',
        });
      } else {
        setHealthStatus({
          checked: true,
          online: false,
          message: 'Maintenance window is still ongoing. Please retry in a few moments.',
        });
      }
    } catch (err: any) {
      setHealthStatus({
        checked: true,
        online: false,
        message: 'System upgrade in progress. Services will resume shortly.',
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col items-center justify-between p-4 sm:p-8 selection:bg-indigo-600 selection:text-white relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[380px] bg-gradient-to-tr from-amber-600/15 via-purple-600/10 to-indigo-600/15 blur-3xl -z-10 rounded-full" />
      <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-amber-500/10 blur-3xl -z-10 rounded-full" />

      {/* Top Brand Bar */}
      <header className="w-full max-w-5xl flex items-center justify-between py-4">
        <Link to="/" className="flex items-center">
          <Logo showTagline={false} />
        </Link>

        <div className="flex items-center gap-2 text-xs">
          {user ? (
            <Link
              to="/dashboard"
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition flex items-center gap-1.5"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dashboard</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-sm"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Maintenance Main Content */}
      <main className="w-full max-w-2xl my-auto py-10 flex flex-col items-center text-center">
        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-950/70 border border-amber-700/50 text-xs text-amber-300 mb-6 shadow-inner">
          <Wrench className="w-4 h-4 text-amber-400 animate-spin" />
          <span className="font-mono font-bold tracking-wider">SCHEDULED MAINTENANCE</span>
          <span className="text-amber-600">•</span>
          <span className="text-amber-200">SYSTEM OPTIMIZATION</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          System Upgrades in Progress
        </h1>
        <p className="text-sm text-slate-400 max-w-lg mx-auto mt-3 leading-relaxed">
          We are conducting planned upgrades across Clausora's neural inference cluster, SHA-256 agreement consensus engine, and PayPal Orders v2 Sandbox gateways.
        </p>

        {/* Subsystems Breakdown Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl mt-8 text-left">
          <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                <span>PayPal Gateway</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Orders v2 Safe Mode
            </p>
          </div>

          <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span>Qwen2.5-VL Engine</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Model Cache Refresh
            </p>
          </div>

          <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Audit Ledger</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Data Protected & Synced
            </p>
          </div>
        </div>

        {/* Live Health Check Result Display */}
        {healthStatus.checked && (
          <div
            className={`w-full max-w-xl mt-6 p-4 rounded-2xl border text-xs text-left flex items-start gap-3 transition-all ${
              healthStatus.online
                ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-200'
                : 'bg-amber-950/60 border-amber-700/60 text-amber-200'
            }`}
          >
            {healthStatus.online ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-1">
              <div className="font-bold">
                {healthStatus.online ? 'Core Services Operational' : 'Maintenance in Progress'}
              </div>
              <p className="text-[11px] opacity-90">{healthStatus.message}</p>
              {healthStatus.online && (
                <div className="pt-2">
                  <button
                    onClick={() => navigate(user ? '/dashboard' : '/login')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition"
                  >
                    <span>Proceed to {user ? 'Dashboard' : 'Sign In'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
          <button
            onClick={handleCheckStatus}
            disabled={checking}
            className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-amber-600/20 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking Status...' : 'Check System Status'}</span>
          </button>

          <Link
            to="/"
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl border border-slate-800 transition"
          >
            <Home className="w-4 h-4 text-indigo-400" />
            <span>Return to Home</span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl text-center py-4 border-t border-slate-800/60 text-xs text-slate-500">
        <p>Clausora — AI Work Intelligence & PayPal Milestone Escrow Layer</p>
      </footer>
    </div>
  );
};

