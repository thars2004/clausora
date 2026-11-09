import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  FolderGit2,
  GitPullRequest,
  CheckCircle,
  Radio,
  FileSearch,
  History,
  Shield,
  HelpCircle,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'New Work DNA', icon: PlusCircle, path: '/new-project' },
    { label: 'Demo Project', icon: FolderGit2, path: '/projects/proj_hackathon_demo' },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-[#0B0F19] p-4 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div>
          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase px-3">
            Core Workspace
          </span>
          <nav className="mt-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive
                        ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Feature quick jumps */}
        <div>
          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase px-3">
            Engine Modules
          </span>
          <div className="mt-2 space-y-1">
            <NavLink
              to="/projects/proj_hackathon_demo?tab=blueprint"
              className="flex items-center justify-between px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 rounded-xl transition"
            >
              <div className="flex items-center gap-2.5">
                <FileSearch className="w-4 h-4 text-purple-400" />
                <span>Work Blueprint</span>
              </div>
              <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/40">DNA</span>
            </NavLink>

            <NavLink
              to="/projects/proj_hackathon_demo?tab=evidence"
              className="flex items-center justify-between px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 rounded-xl transition"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Evidence Graph</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">Proof</span>
            </NavLink>

            <NavLink
              to="/projects/proj_hackathon_demo?tab=drift"
              className="flex items-center justify-between px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 rounded-xl transition"
            >
              <div className="flex items-center gap-2.5">
                <Radio className="w-4 h-4 text-amber-400" />
                <span>Scope Drift Radar</span>
              </div>
              <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">Diff</span>
            </NavLink>

            <NavLink
              to="/projects/proj_hackathon_demo?tab=rea"
              className="flex items-center justify-between px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 rounded-xl transition"
            >
              <div className="flex items-center gap-2.5">
                <GitPullRequest className="w-4 h-4 text-blue-400" />
                <span>REA Inspector</span>
              </div>
              <span className="text-[10px] font-mono text-blue-300 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/40">Tool</span>
            </NavLink>

            <NavLink
              to="/projects/proj_hackathon_demo?tab=audit"
              className="flex items-center justify-between px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 rounded-xl transition"
            >
              <div className="flex items-center gap-2.5">
                <History className="w-4 h-4 text-slate-400" />
                <span>Audit Timeline</span>
              </div>
              <span className="text-[10px] font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">SHA</span>
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
        <p className="text-[11px] text-slate-400 leading-normal">
          PayPal Sandbox Orders v2 & Hugging Face Qwen2.5-VL integrated.
        </p>
      </div>
    </aside>
  );
};
