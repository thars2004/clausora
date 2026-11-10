import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { Logo } from '../common/Logo';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  ChevronDown,
  Shield,
  Briefcase,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface NavbarProps {
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isMobileMenuOpen = false,
  onToggleMobileMenu,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Outside click listener to auto-close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
    <header className="h-16 border-b border-slate-800 bg-[#0B0F19]/90 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-6 md:px-8 flex items-center justify-between">
      {/* Brand logo & tagline & Mobile hamburger */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition shrink-0"
            aria-label={isMobileMenuOpen ? 'Close navigation drawer' : 'Open navigation drawer'}
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-indigo-400" />
            ) : (
              <Menu className="w-5 h-5 text-slate-300" />
            )}
          </button>
        )}

        <Link to="/" className="flex items-center">
          <Logo />
        </Link>
      </div>

      {/* Right Controls: Clickable Profile Dropdown & Direct Logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Clickable Profile Dropdown Trigger */}
            <div ref={profileDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setIsProfileOpen((prev) => !prev)}
                className="flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition shadow-sm cursor-pointer select-none"
                aria-expanded={isProfileOpen}
                aria-label="User profile and account settings"
              >
                {/* User Avatar Initials Bubble */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold border shadow-inner shrink-0 ${
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

                {/* User Name (Desktop) - Role removed from top bar */}
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-white leading-tight truncate max-w-[120px] md:max-w-[180px]">
                    {user.name}
                  </div>
                </div>

                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    isProfileOpen ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>

              {/* Profile Dropdown Menu (Accessible on Mobile & Desktop) */}
              {isProfileOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-[#111827] border border-slate-800 rounded-2xl shadow-2xl z-50 p-4 space-y-3 animate-fade-in divide-y divide-slate-800"
                  role="menu"
                >
                  {/* 1. User Identity Header */}
                  <div className="space-y-2 pb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono text-sm font-bold border shadow-inner shrink-0 ${
                          user.role === 'admin'
                            ? 'bg-amber-950/80 text-amber-300 border-amber-600/50'
                            : user.role === 'provider'
                            ? 'bg-purple-950/80 text-purple-300 border-purple-600/50'
                            : 'bg-indigo-950/80 text-indigo-300 border-indigo-600/50'
                        }`}
                      >
                        {getInitials(user.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-white truncate" title={user.name}>
                          {user.name}
                        </h4>
                        <p className="text-xs text-slate-400 truncate font-mono" title={user.email}>
                          {user.email}
                        </p>
                      </div>
                    </div>

                    {/* Role & ID Tag Strip */}
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        ID: {user.id}
                      </span>
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active Session
                      </span>
                    </div>
                  </div>

                  {/* 2. Account Details & Permissions */}
                  <div className="py-3 space-y-2 text-xs">
                    <div className="p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Account Role & Scope
                      </span>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {user.role === 'admin'
                          ? '🛡️ Platform Admin: Master system governance, user directory management, and full PayPal audit monitoring.'
                          : user.role === 'provider'
                          ? '🛠️ Assigned Provider: Reviews & accepts project proposals, submits deliverable proofs, and receives escrow releases.'
                          : '👑 Client Project Owner: Authorizes project scopes, verifies deliverable proofs, and releases PayPal milestone escrow.'}
                      </p>
                    </div>

                    {/* Quick Nav Links */}
                    <div className="space-y-1 pt-1">
                      <Link
                        to="/dashboard"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center justify-between p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 transition text-xs font-semibold"
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          <span>My Dashboard</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">Go</span>
                      </Link>
                      <Link
                        to="/projects"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center justify-between p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 transition text-xs font-semibold"
                      >
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                          <span>Projects Directory</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">All Work</span>
                      </Link>
                    </div>
                  </div>

                  {/* 3. Logout Option (Accessible on Mobile View & Desktop) */}
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 border border-rose-800/80 rounded-xl transition text-xs font-bold shadow group cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 transition" />
                      <span>Log Out of Account</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Header Logout Button (Desktop) */}
            <button
              onClick={handleLogout}
              title="Logout from Clausora"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-slate-400 hover:text-rose-400 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-800/60 transition text-xs font-semibold group shadow-sm shrink-0"
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
