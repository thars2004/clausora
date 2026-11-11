import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { Logo } from '../common/Logo';
import {
  LayoutDashboard,
  PlusCircle,
  FolderGit2,
  GitPullRequest,
  CheckCircle,
  Radio,
  History,
  Shield,
  BarChart3,
  Users,
  CheckSquare,
  CreditCard,
  Briefcase,
  ChevronRight,
  ChevronDown,
  GitMerge,
  Sparkles,
  X,
  FileText,
} from 'lucide-react';

interface ProjectSummary {
  id: string;
  title: string;
  status: string;
  isDeleted?: boolean;
}

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const role = user?.role || 'client';

  const [userProjects, setUserProjects] = useState<ProjectSummary[]>([]);

  // Detect if user is currently inside a specific project cockpit
  const match = location.pathname.match(/\/projects\/([^/?#]+)/);
  const currentProjectIdFromUrl = match ? match[1] : null;

  useEffect(() => {
    let isMounted = true;
    if (!user) return;

    const loadProjects = () => {
      api
        .get('/projects')
        .then((res) => {
          if (!isMounted) return;
          const list = res.data.data?.projects || [];
          setUserProjects(list);
        })
        .catch(() => {});
    };

    loadProjects();
    window.addEventListener('clausora:project-updated', loadProjects);

    return () => {
      isMounted = false;
      window.removeEventListener('clausora:project-updated', loadProjects);
    };
  }, [user?.id, location.pathname]);

  const activeProjectId =
    currentProjectIdFromUrl ||
    (userProjects.length > 0 ? userProjects[0].id : null);

  const activeProject = userProjects.find((p) => p.id === activeProjectId);

  // All projects currently active and not closed (completed/closed)
  const activeUnclosedProjects = userProjects.filter((p) => {
    if (p.isDeleted) return false;
    const s = (p.status || '').toLowerCase();
    return s !== 'completed' && s !== 'closed';
  });

  // Active Tab Detection Helpers
  const searchParams = new URLSearchParams(location.search);
  const currentTabParam = searchParams.get('tab');
  const adminTab = currentTabParam || 'overview';

  const isAdminActive = (tab: string) => {
    return location.pathname === '/admin' && (adminTab === tab || (tab === 'overview' && !currentTabParam));
  };

  const handleLinkClick = () => {
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  // Reusable Sidebar Body Content
  const renderSidebarContent = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {/* Role Identity Tag */}
      <div className="px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Portal Mode</span>
        <span
          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
            role === 'admin'
              ? 'bg-amber-950/80 text-amber-300 border-amber-600/50'
              : role === 'provider'
              ? 'bg-purple-950/80 text-purple-300 border-purple-600/50'
              : 'bg-indigo-950/80 text-indigo-300 border-indigo-600/50'
          }`}
        >
          {role}
        </span>
      </div>

      {/* 1. Core Navigation */}
      <div>
        <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase px-3">
          Navigation
        </span>
        <nav className="mt-2 space-y-1">
          <NavLink
            to="/dashboard"
            onClick={handleLinkClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`
            }
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Dashboard</span>
          </NavLink>

          {/* Dedicated Projects Directory */}
          <NavLink
            to="/projects"
            onClick={handleLinkClick}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <Briefcase className="w-4 h-4 shrink-0 text-indigo-400" />
              <span>Projects</span>
            </div>
            {userProjects.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                {userProjects.length}
              </span>
            )}
          </NavLink>

          {/* Client / Admin: Create Project */}
          {(role === 'client' || role === 'admin') && (
            <NavLink
              to="/new-project"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`
              }
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>New Work DNA</span>
            </NavLink>
          )}

          <NavLink
            to="/analytics"
            onClick={handleLinkClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`
            }
          >
            <BarChart3 className="w-4 h-4 shrink-0 text-indigo-400" />
            <span>Analytics</span>
          </NavLink>

          <a
            href="/Clausora_Documentation.pdf"
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleLinkClick}
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition group"
            title="Open official system documentation (Human-typeset PDF)"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Documentation</span>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">
              PDF
            </span>
          </a>
        </nav>
      </div>

      {/* 2. ADMIN ONLY MODULES */}
      {role === 'admin' && (
        <div>
          <span className="text-[10px] font-bold tracking-wider text-amber-500 uppercase px-3 flex items-center gap-1.5">
            <Shield className="w-3 h-3" />
            <span>Admin Management</span>
          </span>
          <div className="mt-2 space-y-1">
            <NavLink
              to="/admin?tab=overview"
              onClick={handleLinkClick}
              className={`flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition ${
                isAdminActive('overview')
                  ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Master Console</span>
              </div>
              <span className="text-[9px] font-mono text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
                ROOT
              </span>
            </NavLink>

            <NavLink
              to="/admin?tab=users"
              onClick={handleLinkClick}
              className={`flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition ${
                isAdminActive('users')
                  ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>All Users</span>
              </div>
              <span className="text-[9px] font-mono text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">
                USERS
              </span>
            </NavLink>

            <NavLink
              to="/admin?tab=tasks"
              onClick={handleLinkClick}
              className={`flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition ${
                isAdminActive('tasks')
                  ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <span>Global Tasks</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                TASKS
              </span>
            </NavLink>

            <NavLink
              to="/admin?tab=payments"
              onClick={handleLinkClick}
              className={`flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition ${
                isAdminActive('payments')
                  ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-blue-400" />
                <span>All Payments</span>
              </div>
              <span className="text-[9px] font-mono text-blue-300 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/40">
                PAYPAL
              </span>
            </NavLink>
          </div>
        </div>
      )}

      {/* 3. Current Active Projects Reference */}
      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
            <FolderGit2 className="w-3 h-3 text-indigo-400" />
            <span>Current Projects</span>
          </span>
          {activeUnclosedProjects.length > 0 && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
              {activeUnclosedProjects.length} active
            </span>
          )}
        </div>

        {activeUnclosedProjects.length === 0 ? (
          <div className="text-[11px] text-slate-500 italic py-1">
            No active projects open
          </div>
        ) : (
          <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
            {activeUnclosedProjects.map((proj) => {
              const isSelected = currentProjectIdFromUrl === proj.id;
              const isAwaiting = proj.status === 'awaiting_approval';
              return (
                <NavLink
                  key={proj.id}
                  to={`/projects/${proj.id}`}
                  onClick={handleLinkClick}
                  className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold transition group ${
                    isSelected
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                  title={proj.title}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isAwaiting
                          ? 'bg-amber-400 animate-pulse'
                          : 'bg-emerald-400'
                      }`}
                    />
                    <span className="truncate">{proj.title}</span>
                  </div>
                  {isAwaiting ? (
                    <span className="text-[9px] font-mono text-amber-400 shrink-0 font-normal">
                      pending
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono text-emerald-400 shrink-0 font-normal">
                      active
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-slate-800 bg-[#0B0F19] sticky top-16 h-[calc(100vh-4rem)] shrink-0 flex-col z-30">
        {renderSidebarContent()}

        {/* Fixed bottom footer notice */}
        <div className="p-3 border-t border-slate-800/80 bg-[#0B0F19] shrink-0">
          <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>Clausora Escrow Engine</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              Deterministic escrow releases & milestone verification active.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Slide-Over Drawer Navigation */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-fade-in">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#0B0F19] border-r border-slate-800 shadow-2xl flex flex-col z-50 animate-slide-right">
            {/* Drawer Header with Close Button */}
            <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950">
              <Logo size="sm" showTagline={false} />
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Scrollable Body */}
            {renderSidebarContent()}

            {/* Drawer Bottom Footer */}
            <div className="p-3 border-t border-slate-800/80 bg-slate-950 shrink-0">
              <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Clausora Escrow Engine</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Deterministic escrow releases & milestone verification active.
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
