import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  LogOut,
  User as UserIcon,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Extract initials from user name
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

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

      {/* Right Controls: Only Profile & Logout Button */}
      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-3">
            {/* User Profile Info Card */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-xl">
              {/* User Avatar Initials Bubble */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold border shadow-inner ${
                  user.role === 'admin'
                    ? 'bg-amber-950/80 text-amber-300 border-amber-600/50'
                    : user.role === 'provider'
                    ? 'bg-purple-950/80 text-purple-300 border-purple-600/50'
                    : 'bg-indigo-950/80 text-indigo-300 border-indigo-600/50'
                }`}
                title={user.email}
              >
                {getInitials(user.name)}
              </div>

              {/* User Name & Role Badge */}
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-white leading-tight truncate max-w-[140px]">
                  {user.name}
                </div>
                <div className="text-[10px] font-mono text-slate-400 capitalize">
                  {user.role}
                </div>
              </div>

              <Badge
                variant={
                  user.role === 'admin'
                    ? 'warning'
                    : user.role === 'provider'
                    ? 'ai'
                    : 'primary'
                }
                size="sm"
              >
                {user.role}
              </Badge>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              title="Logout from Clausora"
              className="flex items-center gap-1.5 px-3 py-2 text-slate-400 hover:text-rose-400 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-800/60 transition text-xs font-semibold group shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-400 transition" />
              <span>Logout</span>
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
