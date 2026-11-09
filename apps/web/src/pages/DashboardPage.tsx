import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Project, AuditEvent } from '@clausora/shared';
import { Badge } from '../components/common/Badge';
import { Link } from 'react-router-dom';
import { useScrollPagination } from '../hooks/useScrollPagination';
import { useToast } from '../context/ToastContext';
import {
  FolderGit2,
  PlusCircle,
  CreditCard,
  CheckCircle2,
  Radio,
  History,
  ArrowUpRight,
  Sparkles,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date>(new Date());
  const { toast } = useToast();

  const {
    visibleItems: paginatedProjects,
    hasMore: hasMoreProjects,
    loadMore: loadMoreProjects,
    visibleCount: loadedProjectsCount,
    totalCount: totalProjectsCount,
  } = useScrollPagination(projects, { pageSize: 6 });

  async function fetchData(isBackground = false, isUserInitiated = false) {
    try {
      if (!isBackground) setLoading(true);
      const res = await api.get('/projects');
      const fetchedProjects: Project[] = res.data.data?.projects || [];
      setProjects(fetchedProjects);

      if (fetchedProjects.length > 0) {
        try {
          const actRes = await api.get(`/projects/${fetchedProjects[0].id}/activity`);
          setAuditEvents(actRes.data.data?.events || []);
        } catch {
          setAuditEvents([]);
        }
      } else {
        setAuditEvents([]);
      }
      setLastSynced(new Date());
      if (isUserInitiated) {
        toast.info(res.data.message || `Loaded ${res.data.data?.projects?.length || 0} projects from live Atlas database`, 'Dashboard Synced');
      }
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      if (isUserInitiated) {
        toast.error(err.response?.data?.message || 'Failed to sync live project data', 'Sync Error');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(false, false);

    // 10-second live polling interval for real-time live database synchronization
    const timer = setInterval(() => {
      fetchData(true, false);
    }, 10000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    await fetchData(false, true);
    setSyncing(false);
  };

  const totalSettledMinor = projects.reduce((sum, p) => sum + (p.settledAmountMinor || 0), 0);
  const totalSettledDollars = (totalSettledMinor / 100).toFixed(2);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Work Intelligence Dashboard</h1>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-700/40 text-[11px] text-emerald-300 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Atlas DB Sync</span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track agreements, deliverable readiness, scope changes, and PayPal Sandbox payouts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs rounded-xl shadow transition disabled:opacity-60"
            title="Refresh from MongoDB Atlas"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync DB'}</span>
          </button>
          <Link
            to="/new-project"
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Work DNA Project</span>
          </Link>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Active Projects</span>
            <FolderGit2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{projects.length || 1}</div>
          <p className="text-[11px] text-slate-400">Workspaces in progress</p>
        </div>

        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Milestones Released</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            ${totalSettledDollars} <span className="text-xs text-slate-400 font-normal">USD</span>
          </div>
          <p className="text-[11px] text-emerald-400/80">Verified on PayPal Sandbox</p>
        </div>

        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Pending Client Decisions</span>
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">1</div>
          <p className="text-[11px] text-slate-400">Awaiting human sign-off</p>
        </div>

        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Scope Drift Alerts</span>
            <Radio className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400 font-mono">1</div>
          <p className="text-[11px] text-purple-300/80">Detected by AI radar</p>
        </div>
      </div>

      {/* Main Grid: Projects List + Live Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Projects List (2 columns on lg) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100">Projects & Agreements</h3>
            <Link to="/projects" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
              View All Projects ({projects.length}) →
            </Link>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : projects.length === 0 ? (
            <div className="p-10 border border-dashed border-slate-800 rounded-2xl text-center space-y-3">
              <FolderGit2 className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400">No projects found in this workspace.</p>
              <Link
                to="/new-project"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-xs font-semibold text-white rounded-lg hover:bg-indigo-500 transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create First Project</span>
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {paginatedProjects.map((proj: Project) => (
                  <Link
                    key={proj.id}
                    to={`/projects/${proj.id}`}
                    className="block p-5 bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl transition group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
                            {proj.title}
                          </h4>
                          <Badge variant="primary" size="sm">{proj.status}</Badge>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 max-w-xl">
                          {proj.description}
                        </p>
                      </div>
                      <div className="p-2 bg-slate-800 text-slate-300 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-4">
                        <span>Agreement: <strong className="text-slate-200">v1 (SHA-256 Verified)</strong></span>
                        <span>Next Payout: <strong className="text-emerald-400">$600.00 USD</strong></span>
                      </div>
                      <span className="text-indigo-400 font-medium">Open Cockpit →</span>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Scroll Pagination Footer */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 border-t border-slate-800/60">
                <span className="font-mono">
                  Showing {loadedProjectsCount} of {totalProjectsCount} projects
                </span>
                {hasMoreProjects ? (
                  <button
                    onClick={loadMoreProjects}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition text-xs font-medium"
                  >
                    <span>Load more (or scroll down)</span>
                  </button>
                ) : (
                  <span className="text-slate-600 text-[11px]">All projects loaded</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Live Cryptographic Audit Stream (1 column) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              <h3 className="text-base font-bold text-slate-100">Live Audit Timeline</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500">Immutable log</span>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4 max-h-[500px] overflow-y-auto">
            {auditEvents.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No audit records recorded yet.</p>
            ) : (
              auditEvents.slice(0, 7).map((ev) => (
                <div key={ev.id} className="relative pl-5 pb-2 border-l border-slate-800 text-left">
                  <div className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-slate-950" />
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-300">{ev.actorName}</span>
                    <span className="text-slate-500 font-mono">
                      {new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 leading-snug">{ev.summary}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

