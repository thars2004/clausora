import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Shield,
  User as UserIcon,
  LogOut,
  Layers,
  ChevronDown,
  Activity,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, switchPersona } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="h-16 border-b border-slate-800 bg-[#0B0F19]/90 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between">
      {/* Brand logo & tagline */}
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-105 transition">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-white tracking-tight">CLAUSORA</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 font-semibold">
                AI + PayPal
              </span>
            </div>
            <p className="hidden md:block text-[10px] text-slate-400 font-medium">
              Understand the work. Verify the outcome. Release the payment.
            </p>
          </div>
        </Link>
      </div>

      {/* Right Controls: Persona Switcher & Account */}
      <div className="flex items-center gap-3">
        {/* Judge / Persona Switcher */}
        <div className="hidden sm:flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1 text-xs">
          <span className="text-slate-400 text-[11px] px-2 font-medium">Persona:</span>
          <button
            onClick={() => switchPersona('client')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              user?.role === 'client' && user.email.includes('client')
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Client
          </button>
          <button
            onClick={() => switchPersona('provider')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              user?.role === 'provider'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Provider
          </button>
          <button
            onClick={() => switchPersona('judge')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              user?.email.includes('judge')
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Judge
          </button>
        </div>

        {/* Current User Badge */}
        {user ? (
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
            <div className="text-right hidden md:block">
              <div className="text-xs font-semibold text-white leading-tight">{user.name}</div>
              <div className="text-[10px] font-mono text-slate-400 capitalize">{user.role} role</div>
            </div>
            <button
              onClick={() => logout().then(() => navigate('/'))}
              title="Logout"
              className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="text-xs text-slate-300 hover:text-white font-medium px-3 py-1.5"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg transition"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
