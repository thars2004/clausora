import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useScrollPagination } from '../hooks/useScrollPagination';
import { Badge } from '../components/common/Badge';
import {
  FolderGit2,
  PlusCircle,
  Search,
  RefreshCw,
  ArrowUpRight,
  Loader2,
  Calendar,
  DollarSign,
  Shield,
  Fingerprint,
  UserCheck,
  CheckCircle2,
  Clock,
  Filter,
  CreditCard,
} from 'lucide-react';

interface ProjectItem {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  ownerName?: string;
  clientName?: string;
  providerIds: string[];
  status: string;
  totalAmountMinor?: number;
  settledAmountMinor?: number;
  deadline?: string;
  currency?: string;
  currentAgreementId?: string;
  createdAt: string;
  updatedAt: string;
}

export const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchProjects = async (isBackground = false, showToastMsg = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await api.get('/projects');
      const list = res.data.data?.projects || [];
      setProjects(list);

      if (showToastMsg) {
        toast.info(res.data.message || `Loaded ${list.length} projects for ${user?.name || 'account'}`, 'Projects Synced');
      }
    } catch (err: any) {
      console.error('Failed to fetch projects:', err);
      if (!isBackground) {
        toast.error(err.response?.data?.message || 'Failed to load projects list', 'Sync Error');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects(false);
    const interval = setInterval(() => {
      fetchProjects(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleManualSync = async () => {
    setSyncing(true);
    await fetchProjects(false, true);
    setSyncing(false);
  };

  // Filter projects by search query and status
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        p.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  // Screen scroll-based auto-pagination
  const {
    visibleItems: paginatedProjects,
    hasMore,
    loadMore,
    visibleCount,
    totalCount,
  } = useScrollPagination(filteredProjects, { pageSize: 6 });

  const getRoleLabel = (p: ProjectItem) => {
    if (user?.role === 'admin') {
      return {
        label: p.ownerName ? `Client: ${p.ownerName}` : 'Admin Access',
        color: 'bg-amber-950/80 text-amber-300 border-amber-800/50',
      };
    }
    if (p.ownerId === user?.id) {
      return {
        label: `Owner: ${user?.name || 'You'}`,
        color: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/50',
      };
    }
    if (p.providerIds && p.providerIds.includes(user?.id || '')) {
      return {
        label: p.ownerName ? `Client: ${p.ownerName}` : 'Assigned Provider',
        color: 'bg-purple-950/80 text-purple-300 border-purple-800/50',
      };
    }
    return {
      label: p.ownerName ? `Client: ${p.ownerName}` : 'Collaborator',
      color: 'bg-slate-800 text-slate-300 border-slate-700',
    };
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Project Workspaces</h1>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-700/40 text-[11px] text-emerald-300 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Active & Synced</span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Browse and manage all projects where you are involved as Client, Provider, or Platform Admin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs rounded-xl shadow transition disabled:opacity-60"
            title="Refresh projects list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Projects'}</span>
          </button>

          {(user?.role === 'client' || user?.role === 'admin') && (
            <Link
              to="/new-project"
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Work DNA Project</span>
            </Link>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by title or scope..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-500" /> Status:
          </span>
          {['all', 'active', 'draft', 'completed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-xs text-slate-400">Loading your project workspaces...</p>
        </div>
      ) : projects.length === 0 ? (
        /* Empty State when user has no projects */
        <div className="p-12 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center mx-auto text-indigo-400">
            <FolderGit2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No Assigned Projects Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              You are logged in as <strong className="text-slate-200">{user?.name}</strong> ({user?.role} role). You are not currently assigned to any active project workspace.
            </p>
          </div>
          {(user?.role === 'client' || user?.role === 'admin') ? (
            <Link
              to="/new-project"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Your First Work DNA Project</span>
            </Link>
          ) : (
            <p className="text-xs text-purple-300 bg-purple-950/60 border border-purple-800/40 px-4 py-2 rounded-xl inline-block">
              As a Provider, you will see projects here once a Client selects you during project creation.
            </p>
          )}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="p-10 bg-slate-900/40 border border-slate-800 rounded-2xl text-center space-y-2">
          <p className="text-sm text-slate-300">No projects match your search or filter.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
            className="text-xs text-indigo-400 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        /* Projects List with Scroll Auto-Pagination */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedProjects.map((p) => {
              const roleInfo = getRoleLabel(p);
              return (
                <div
                  key={p.id}
                  className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl transition flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2.5">
                    {/* Top Row: Title, Role Badge, Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <Link
                          to={`/projects/${p.id}`}
                          className="text-base font-bold text-white group-hover:text-indigo-300 transition flex items-center gap-2"
                        >
                          <span>{p.title}</span>
                          <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition text-indigo-400" />
                        </Link>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${roleInfo.color}`}
                          >
                            {roleInfo.label}
                          </span>
                          <Badge variant={p.status === 'active' ? 'primary' : 'neutral'} size="sm">
                            {p.status}
                          </Badge>
                          <span className="text-[10px] font-mono text-slate-500">
                            ID: {p.id}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {p.description || 'No project description provided.'}
                    </p>
                  </div>

                  {/* Financial & Delivery Details */}
                  <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px] flex-wrap">
                      {p.totalAmountMinor ? (
                        <span className="text-slate-200 font-semibold flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                          <span>${(p.totalAmountMinor / 100).toFixed(2)} {p.currency || 'USD'}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">Budget: Pending</span>
                      )}

                      {p.settledAmountMinor !== undefined && p.settledAmountMinor > 0 && (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Paid: ${(p.settledAmountMinor / 100).toFixed(2)}</span>
                        </span>
                      )}

                      {p.deadline && (
                        <span className="text-slate-300 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                          {p.deadline}
                        </span>
                      )}
                    </div>

                    <Link
                      to={`/projects/${p.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-semibold transition"
                    >
                      <span>Open Cockpit</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scroll Pagination Indicator & Load More Footer */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 border-t border-slate-800/80">
            <span className="font-mono">
              Showing {visibleCount} of {totalCount} projects {searchQuery && `(filtered from ${projects.length})`}
            </span>

            {hasMore ? (
              <button
                onClick={loadMore}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition text-xs font-medium"
              >
                <span>Load more projects (or scroll down)</span>
              </button>
            ) : (
              <span className="text-slate-600 text-[11px]">All assigned projects loaded</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

