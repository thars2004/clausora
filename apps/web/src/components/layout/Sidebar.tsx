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

            {/* Dynamic Project Cockpit */}
            <NavLink
              to={getProjectRoute()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  isActive && location.pathname.startsWith('/projects/')
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`
              }
            >
              <FolderGit2 className="w-4 h-4 shrink-0" />
              <span>Project Cockpit</span>
            </NavLink>

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
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition ${
                    isActive
                      ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`
                }
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
                to="/admin"
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 rounded-xl transition"
              >
                <Users className="w-4 h-4 text-indigo-400" />
                <span>All Users</span>
              </NavLink>

              <NavLink
                to="/admin"
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 rounded-xl transition"
              >
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <span>Global Tasks</span>
              </NavLink>

              <NavLink
                to="/admin"
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 rounded-xl transition"
              >
                <CreditCard className="w-4 h-4 text-blue-400" />
                <span>All Payments</span>
              </NavLink>
            </div>
          </div>
        )}

        {/* 3. Role-Based Feature Modules for Active Workspace */}
        <div>
          <div className="flex items-center justify-between px-3">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              {role === 'provider' ? 'Provider Tools' : role === 'admin' ? 'Project Modules' : 'Client Controls'}
            </span>
            {activeProject && (
              <span className="text-[9px] font-mono text-indigo-400 truncate max-w-[80px]" title={activeProject.title}>
                {activeProject.title}
              </span>
            )}
          </div>
          <div className="mt-2 space-y-1">
            <NavLink
              to={getProjectRoute('evidence')}
              className="flex items-center justify-between px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 rounded-xl transition"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>{role === 'provider' ? 'Submit Proof' : 'Evidence Graph'}</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                Proof
              </span>
            </NavLink>

            <NavLink
              to={getProjectRoute('drift')}
              className="flex items-center justify-between px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 rounded-xl transition"
            >
              <div className="flex items-center gap-2.5">
                <Radio className="w-4 h-4 text-amber-400" />
                <span>Scope Drift Radar</span>
              </div>
              <span className="text-[9px] font-mono text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
                Diff
              </span>
            </NavLink>

            <NavLink
              to={getProjectRoute('rea')}
              className="flex items-center justify-between px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 rounded-xl transition"
            >
              <div className="flex items-center gap-2.5">
                <GitPullRequest className="w-4 h-4 text-blue-400" />
                <span>REA Inspector</span>
              </div>
              <span className="text-[9px] font-mono text-blue-300 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/40">
                Tool
              </span>
            </NavLink>

            <NavLink
              to={getProjectRoute('audit')}
              className="flex items-center justify-between px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 rounded-xl transition"
            >
              <div className="flex items-center gap-2.5">
                <History className="w-4 h-4 text-slate-400" />
                <span>Audit Timeline</span>
              </div>
              <span className="text-[9px] font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">
                SHA
              </span>
            </NavLink>
          </div>
        </div>
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
