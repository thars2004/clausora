import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
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
} from 'lucide-react';

interface ProjectSummary {
  id: string;
  title: string;
}

export const Sidebar: React.FC = () => {
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

    api
      .get('/projects')
      .then((res) => {
        if (!isMounted) return;
        const list = res.data.data?.projects || [];
        setUserProjects(list);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [user?.id, location.pathname]);

  // Determine active project ID safely
  // If user is currently viewing a project, use that.
  // Otherwise, use user's first accessible project.
  // If user is demo account or admin and has proj_hackathon_demo, fallback gracefully.
  const activeProjectId =
    currentProjectIdFromUrl ||
    (userProjects.length > 0 ? userProjects[0].id : null);

  const activeProject = userProjects.find((p) => p.id === activeProjectId);

  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(true);

  // Active Tab Detection Helpers
  const searchParams = new URLSearchParams(location.search);
  const currentTabParam = searchParams.get('tab');
  const adminTab = currentTabParam || 'overview';

  const isAdminActive = (tab: string) => {
    return location.pathname === '/admin' && (adminTab === tab || (tab === 'overview' && !currentTabParam));
  };

  const isProjectTabActive = (tab: string) => {
    if (!location.pathname.startsWith('/projects/')) return false;
    const projectTab = currentTabParam || 'milestones';
    if (tab === 'dna' && (projectTab === 'dna' || projectTab === 'workflow' || projectTab === 'blueprint')) return true;
    if (tab === 'milestones' && (projectTab === 'milestones' || projectTab === 'evidence')) return true;
    if (tab === 'audit' && (projectTab === 'audit' || projectTab === 'rea')) return true;
    return projectTab === tab;
  };

  // Fallback target for feature links when no project is accessible
  const getProjectRoute = (tab?: string) => {
    if (activeProjectId) {
      return tab ? `/projects/${activeProjectId}?tab=${tab}` : `/projects/${activeProjectId}`;
    }
    return '/projects';
  };

  return (
    <aside className="w-64 border-r border-slate-800 bg-[#0B0F19] p-4 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
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
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`
              }
            >
              <BarChart3 className="w-4 h-4 shrink-0 text-indigo-400" />
              <span>Full Analytics</span>
            </NavLink>
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

        {/* 3. Role-Based Feature Modules / Active Workspace Dropdown */}
        {activeProjectId && (
          <div className="border border-slate-800/90 rounded-2xl bg-slate-900/40 p-2.5 space-y-2">
            <div
              onClick={() => setIsProjectDropdownOpen((prev) => !prev)}
              className="flex items-center justify-between px-1 cursor-pointer select-none group"
              title="Toggle project navigation menu"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <FolderGit2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span
                  className="text-[11px] font-bold text-slate-300 truncate"
                  title={activeProject?.title || 'Active Project Workspace'}
                >
                  {activeProject?.title || 'Active Workspace'}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform duration-200 shrink-0 ${
                  isProjectDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </div>

            {isProjectDropdownOpen && (
              <div className="space-y-1 pt-1 border-t border-slate-800/60 pl-1">
                <NavLink
                  to={`/projects/${activeProjectId}?tab=milestones`}
                  className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded-xl transition ${
                    isProjectTabActive('milestones')
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>Milestones & Escrow</span>
                  </div>
                  <span className="text-[9px] font-mono text-blue-300 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/40">
                    Roadmap
                  </span>
                </NavLink>

                <NavLink
                  to={`/projects/${activeProjectId}?tab=dna`}
                  className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded-xl transition ${
                    isProjectTabActive('dna')
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GitMerge className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Work DNA Pipeline</span>
                  </div>
                  <span className="text-[9px] font-mono text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/40">
                    Flow
                  </span>
                </NavLink>

                <NavLink
                  to={`/projects/${activeProjectId}?tab=drift`}
                  className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded-xl transition ${
                    isProjectTabActive('drift')
                      ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Scope Drift Radar</span>
                  </div>
                  <span className="text-[9px] font-mono text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
                    Radar
                  </span>
                </NavLink>

                <NavLink
                  to={`/projects/${activeProjectId}?tab=audit`}
                  className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded-xl transition ${
                    isProjectTabActive('audit')
                      ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Trust & REA Audit</span>
                  </div>
                  <span className="text-[9px] font-mono text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                    SHA
                  </span>
                </NavLink>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Notice */}
      <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <Shield className="w-3.5 h-3.5 text-indigo-400" />
          <span>PayPal Hackathon 2026</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-normal">
          PayPal Sandbox Orders v2 & Hugging Face Qwen2.5-VL active.
        </p>
      </div>
    </aside>
  );
};
