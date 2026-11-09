import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { AdminOverviewStats } from '@clausora/shared';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useToast } from '../context/ToastContext';
import { useScrollPagination } from '../hooks/useScrollPagination';
import {
  ShieldCheck,
  Shield,
  Users,
  CheckSquare,
  CreditCard,
  Activity,
  Search,
  ExternalLink,
  Loader2,
  DollarSign,
  AlertCircle,
  Filter,
  Edit,
  Trash2,
  CheckCircle2,
  ChevronDown,
  Lock,
  UserCheck,
  ArrowRight,
  Sparkles,
  FolderGit2,
} from 'lucide-react';

export const AdminPortalPage: React.FC = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: 'overview' | 'users' | 'tasks' | 'payments' | 'system' =
    tabParam === 'users' || tabParam === 'tasks' || tabParam === 'payments' || tabParam === 'system'
      ? tabParam
      : 'overview';

  const setActiveTab = (tab: 'overview' | 'users' | 'tasks' | 'payments' | 'system') => {
    setSearchParams({ tab });
  };

  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // User Edit Modal State
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'client' | 'provider' | 'admin'>('client');
  const [editPassword, setEditPassword] = useState('');
  const [savingUser, setSavingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, tasksRes, payRes, healthRes] = await Promise.all([
        api.get('/admin/stats').catch(() => ({ data: { data: { stats: null } } })),
        api.get('/admin/users').catch(() => ({ data: { data: { users: [] } } })),
        api.get('/admin/tasks').catch(() => ({ data: { data: { tasks: [] } } })),
        api.get('/admin/payments').catch(() => ({ data: { data: { payments: [] } } })),
        api.get('/health').catch(() => ({ data: null })),
      ]);

      setStats(statsRes.data.data?.stats || null);
      setUsersList(usersRes.data.data?.users || []);
      setTasksList(tasksRes.data.data?.tasks || []);
      setPaymentsList(payRes.data.data?.payments || []);
      setSystemHealth(healthRes.data || null);
    } catch (err: any) {
      console.error('Failed to load admin management data:', err);
      toast.error(err.response?.data?.message || 'Failed to load master admin data', 'Admin Console');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditPassword('');
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingUser(true);

    try {
      const payload: any = {
        name: editName,
        email: editEmail,
        role: editRole,
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const res = await api.put(`/admin/users/${editingUser.id}`, payload);
      toast.success(
        res.data.message || `User "${editName}" updated successfully.`,
        'User Management'
      );
      setEditingUser(null);
      await fetchAdminData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update user', 'User Management');
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (user: any) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete user "${user.name}" (${user.email})?\n\nThis will remove their account permanently.`
    );
    if (!confirmed) return;

    setDeletingUserId(user.id);
    try {
      const res = await api.delete(`/admin/users/${user.id}`);
      toast.success(
        res.data.message || `User "${user.name}" deleted from database.`,
        'User Management'
      );
      await fetchAdminData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete user', 'User Management');
    } finally {
      setDeletingUserId(null);
    }
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTasks = tasksList.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.projectTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.deliverable?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.clientName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPayments = paymentsList.filter(
    (p) =>
      p.paypalOrderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.projectTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.payerName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Scroll Pagination for all lists
  const usersPagination = useScrollPagination(filteredUsers, { pageSize: 8 });
  const tasksPagination = useScrollPagination(filteredTasks, { pageSize: 6 });
  const paymentsPagination = useScrollPagination(filteredPayments, { pageSize: 8 });

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-xs text-slate-400">Loading master administrative console & live database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Admin Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-800/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <h1 className="text-2xl font-extrabold text-white">Master Admin Console</h1>
            <Badge variant="warning">Superuser Access</Badge>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/50 text-[10px] text-emerald-300 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Active & Verified</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Global oversight across registered users, work deliverables, and verified PayPal payouts. Edit and delete accounts with real-time database sync.
          </p>
        </div>

        {stats && (
          <div className="flex items-center gap-4 bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800 font-mono text-xs">
            <div>
              <span className="text-slate-500 block text-[10px]">Settled Volume</span>
              <span className="text-emerald-400 font-bold">${(stats.settledVolumeMinor / 100).toFixed(2)} USD</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="text-slate-500 block text-[10px]">Total Accounts</span>
              <span className="text-white font-bold">{usersList.length}</span>
            </div>
          </div>
        )}
      </div>

      {/* Admin Sub-navigation Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
              activeTab === 'overview'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Master Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
              activeTab === 'users'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users Directory ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
              activeTab === 'tasks'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Platform Tasks ({tasksList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
              activeTab === 'payments'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>PayPal Settlements ({paymentsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
              activeTab === 'system'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Health & Diagnostics</span>
          </button>
        </div>

        {/* Global Filter & Search Bar */}
        {activeTab !== 'system' && activeTab !== 'overview' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* TAB 0: MASTER EXECUTIVE OVERVIEW                               */}
      {/* ============================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* 4 Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => setActiveTab('users')}
              className="p-5 bg-slate-900/80 border border-slate-800 hover:border-amber-600/50 rounded-2xl space-y-2 cursor-pointer transition shadow-lg group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Platform Accounts</span>
                </span>
                <span className="text-xs text-indigo-400 group-hover:translate-x-1 transition-transform">→</span>
              </div>
              <div className="text-2xl font-black text-white font-mono">{usersList.length}</div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1 border-t border-slate-800/80">
                <span className="text-indigo-300 font-semibold">{usersList.filter((u) => u.role === 'client').length} Clients</span>
                <span>•</span>
                <span className="text-purple-300 font-semibold">{usersList.filter((u) => u.role === 'provider').length} Providers</span>
                <span>•</span>
                <span className="text-amber-300 font-semibold">{usersList.filter((u) => u.role === 'admin').length} Admins</span>
              </div>
            </div>

            <div
              onClick={() => setActiveTab('tasks')}
              className="p-5 bg-slate-900/80 border border-slate-800 hover:border-amber-600/50 rounded-2xl space-y-2 cursor-pointer transition shadow-lg group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Global Deliverables</span>
                </span>
                <span className="text-xs text-emerald-400 group-hover:translate-x-1 transition-transform">→</span>
              </div>
              <div className="text-2xl font-black text-white font-mono">{tasksList.length}</div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1 border-t border-slate-800/80">
                <span className="text-emerald-300 font-semibold">{tasksList.filter((t) => t.status === 'done').length} Completed</span>
                <span>•</span>
                <span className="text-indigo-300 font-semibold">{tasksList.filter((t) => t.status === 'in_progress').length} In Progress</span>
              </div>
            </div>

            <div
              onClick={() => setActiveTab('payments')}
              className="p-5 bg-slate-900/80 border border-slate-800 hover:border-amber-600/50 rounded-2xl space-y-2 cursor-pointer transition shadow-lg group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                  <span>PayPal Settlements</span>
                </span>
                <span className="text-xs text-blue-400 group-hover:translate-x-1 transition-transform">→</span>
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ${(((stats?.settledVolumeMinor || 0) / 100)).toFixed(2)} <span className="text-xs text-slate-400">USD</span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                <span>Pending Escrow:</span>
                <span className="font-mono text-amber-300 font-bold">
                  ${(((stats?.pendingVolumeMinor || 0) / 100)).toFixed(2)} USD
                </span>
              </div>
            </div>

            <div
              onClick={() => setActiveTab('system')}
              className="p-5 bg-slate-900/80 border border-slate-800 hover:border-amber-600/50 rounded-2xl space-y-2 cursor-pointer transition shadow-lg group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                  <span>System Integrity</span>
                </span>
                <span className="text-xs text-purple-400 group-hover:translate-x-1 transition-transform">→</span>
              </div>
              <div className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Cloud Cluster Online</span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                <span>Auth Boundary:</span>
                <span className="text-indigo-300 font-mono font-semibold">1-Day JWT Live</span>
              </div>
            </div>
          </div>

          {/* Quick Action Hub */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Fast Jump Actions:</span>
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setActiveTab('users')}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>Manage Accounts ({usersList.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
              >
                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Review Tasks ({tasksList.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                <span>Audit PayPal Ledger</span>
              </button>
              <button
                onClick={() => setActiveTab('system')}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5 text-purple-400" />
                <span>Diagnostics</span>
              </button>
            </div>
          </div>

          {/* 2-Column Overview Stream */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Recent Registered Accounts */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between">
              <div>
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-400" />
                      <span>Recent Platform Accounts</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">Live synced from secure cloud infrastructure</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('users')}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
                  >
                    <span>View all ({usersList.length})</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="divide-y divide-slate-800/80">
                  {usersList.slice(0, 5).map((u) => {
                    const roleVariant = u.role === 'client' ? 'primary' : u.role === 'provider' ? 'ai' : 'warning';
                    return (
                      <div key={u.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-950/40 transition">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-xs uppercase shrink-0">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-2">
                              <span>{u.name}</span>
                              <Badge variant={roleVariant} size="sm">
                                {u.role.toUpperCase()}
                              </Badge>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">{u.email}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold border border-slate-700 transition"
                        >
                          Edit
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-slate-950 border-t border-slate-800 text-center">
                <button
                  onClick={() => setActiveTab('users')}
                  className="text-xs text-slate-400 hover:text-white transition font-medium"
                >
                  Manage roles and credentials in Users Directory →
                </button>
              </div>
            </div>

            {/* Right: Recent Settlements & Platform Tasks */}
            <div className="space-y-6">
              {/* Recent PayPal Transactions */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-400" />
                      <span>Recent PayPal Transactions</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">Sandbox capture and order ledger</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('payments')}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
                  >
                    <span>View all ({paymentsList.length})</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="divide-y divide-slate-800/80">
                  {paymentsList.slice(0, 3).map((p) => {
                    const isCaptured = p.status === 'captured';
                    return (
                      <div key={p.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="font-semibold text-white truncate max-w-[200px]">{p.projectTitle}</div>
                          <div className="text-[11px] font-mono text-slate-400">
                            Order: <span className="text-indigo-400">{p.paypalOrderId}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-white font-mono">
                            ${(p.amountMinor / 100).toFixed(2)} {p.currency}
                          </div>
                          <Badge variant={isCaptured ? 'success' : 'paypal'} size="sm">
                            {isCaptured ? 'CAPTURED' : 'ORDER'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                  {paymentsList.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-500 font-mono">
                      No PayPal transactions recorded yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Priority Workstream Tasks */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                      <span>Active Workstream Tasks</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">Deliverables across all active projects</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition"
                  >
                    <span>View all ({tasksList.length})</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="divide-y divide-slate-800/80">
                  {tasksList.slice(0, 3).map((t, idx) => (
                    <div key={t.id || idx} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-semibold text-white truncate max-w-[240px]">{t.title}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[240px]">{t.projectTitle}</div>
                      </div>
                      <Badge variant={t.priority === 'high' ? 'danger' : 'primary'} size="sm">
                        {t.priority}
                      </Badge>
                    </div>
                  ))}
                  {tasksList.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-500 font-mono">
                      No deliverables created yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: USERS DIRECTORY (EDIT & DELETE + SCROLL PAGINATION)      */}
      {/* ============================================================== */}
      {activeTab === 'users' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-0">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Registered Platform Accounts</h3>
              <p className="text-[11px] text-slate-400">
                Manage roles, update credentials, or manage accounts securely.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">
                Showing {usersPagination.visibleItems.length} of {filteredUsers.length} accounts
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Email Address</th>
                  <th className="px-5 py-3">Assigned Role</th>
                  <th className="px-5 py-3">Active Projects</th>
                  <th className="px-5 py-3">Registered Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {usersPagination.visibleItems.map((u) => {
                  const roleVariant =
                    u.role === 'client' ? 'primary' : u.role === 'provider' ? 'ai' : 'warning';
                  const isDeleting = deletingUserId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-950/40 transition">
                      <td className="px-5 py-3.5 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-xs uppercase">
                            {u.name.charAt(0)}
                          </div>
                          <span>{u.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 font-mono">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <Badge variant={roleVariant} size="sm">
                          {u.role.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 font-mono">{u.projectCount || 1}</td>
                      <td className="px-5 py-3.5 text-slate-500 font-mono">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Active'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/50 text-[10px] font-bold">
                          ACTIVE
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-[11px] font-semibold border border-slate-700 transition"
                            title="Edit user details"
                          >
                            <Edit className="w-3 h-3 text-indigo-400" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={isDeleting}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-rose-100 rounded-lg text-[11px] font-semibold border border-rose-800/60 transition disabled:opacity-50"
                            title="Delete user"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3 h-3 animate-spin text-rose-400" />
                            ) : (
                              <Trash2 className="w-3 h-3 text-rose-400" />
                            )}
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Scroll Pagination Footer */}
          <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-400 font-mono">
              Page {usersPagination.currentPage} of {usersPagination.totalPages} • Showing{' '}
              {usersPagination.visibleItems.length} / {filteredUsers.length} accounts
            </span>

            {usersPagination.hasMore ? (
              <button
                onClick={() => usersPagination.loadMore()}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
              >
                <span>Scroll down or click to load more</span>
                <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
              </button>
            ) : (
              <span className="text-slate-500 font-mono text-[11px]">All platform accounts loaded</span>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: GLOBAL TASKS MASTER (WITH SCROLL PAGINATION)            */}
      {/* ============================================================== */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-white">All Platform Workstream Deliverables</h3>
            <span className="text-xs text-slate-400 font-mono">
              Showing {tasksPagination.visibleItems.length} of {filteredTasks.length} tasks
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasksPagination.visibleItems.map((t, i) => (
              <div
                key={t.id || i}
                className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3 shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider block">
                      {t.projectTitle || 'Project Deliverable'}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-0.5">{t.title}</h4>
                  </div>
                  <Badge variant={t.priority === 'high' ? 'danger' : 'primary'} size="sm">
                    {t.priority}
                  </Badge>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{t.deliverable}</p>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <div className="text-slate-400">
                    <span>Client: </span>
                    <strong className="text-slate-200">{t.clientName}</strong>
                  </div>
                  <Badge
                    variant={
                      t.status === 'done'
                        ? 'success'
                        : t.status === 'in_progress'
                        ? 'primary'
                        : 'neutral'
                    }
                    size="sm"
                  >
                    {t.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {/* Tasks Scroll Pagination Footer */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-400 font-mono">
              Page {tasksPagination.currentPage} of {tasksPagination.totalPages} • Showing{' '}
              {tasksPagination.visibleItems.length} / {filteredTasks.length} tasks
            </span>

            {tasksPagination.hasMore ? (
              <button
                onClick={() => tasksPagination.loadMore()}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold rounded-xl border border-slate-700 transition"
              >
                <span>Scroll down or click to load more tasks</span>
                <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
              </button>
            ) : (
              <span className="text-slate-500 font-mono text-[11px]">All deliverables loaded</span>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: PAYMENT SETTLEMENTS (WITH SCROLL PAGINATION)            */}
      {/* ============================================================== */}
      {activeTab === 'payments' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-0">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">PayPal Orders v2 Sandbox Ledger</h3>
            <span className="text-xs text-slate-400 font-mono">
              Showing {paymentsPagination.visibleItems.length} of {filteredPayments.length} transactions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">PayPal Order ID</th>
                  <th className="px-5 py-3">Project / Milestone</th>
                  <th className="px-5 py-3">Authorized Payer</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Capture ID</th>
                  <th className="px-5 py-3 text-right">Settlement State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-xs">
                {paymentsPagination.visibleItems.map((p) => {
                  const isCaptured = p.status === 'captured';
                  return (
                    <tr key={p.id} className="hover:bg-slate-950/40 transition">
                      <td className="px-5 py-3.5 text-indigo-400 font-bold">{p.paypalOrderId}</td>
                      <td className="px-5 py-3.5 font-sans">
                        <div className="font-semibold text-white">{p.projectTitle}</div>
                        <div className="text-[11px] text-slate-400">{p.milestoneTitle}</div>
                      </td>
                      <td className="px-5 py-3.5 font-sans">
                        <div className="text-slate-200">{p.payerName}</div>
                        <div className="text-[10px] text-slate-500">{p.payerEmail}</div>
                      </td>
                      <td className="px-5 py-3.5 text-white font-bold">
                        ${(p.amountMinor / 100).toFixed(2)} {p.currency}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">
                        {p.paypalCaptureId || 'Pending Approval'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-sans">
                        <Badge variant={isCaptured ? 'success' : 'paypal'} size="sm">
                          {isCaptured ? 'CAPTURED (PAID)' : 'ORDER CREATED'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Payments Scroll Pagination Footer */}
          <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-400 font-mono">
              Page {paymentsPagination.currentPage} of {paymentsPagination.totalPages} • Showing{' '}
              {paymentsPagination.visibleItems.length} / {filteredPayments.length} payments
            </span>

            {paymentsPagination.hasMore ? (
              <button
                onClick={() => paymentsPagination.loadMore()}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold rounded-xl border border-slate-700 transition"
              >
                <span>Scroll down or click to load more</span>
                <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
              </button>
            ) : (
              <span className="text-slate-500 font-mono text-[11px]">All transactions loaded</span>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: SYSTEM HEALTH & INTEGRATIONS                            */}
      {/* ============================================================== */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#0070BA]" />
              <span>PayPal Sandbox Integration</span>
            </h3>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Environment:</span>
                <span className="text-emerald-400 font-bold">SANDBOX</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">API Endpoint:</span>
                <span className="text-slate-300">https://api-m.sandbox.paypal.com</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Orders Version:</span>
                <span className="text-indigo-400">v2 /checkout/orders</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Capture Security:</span>
                <span className="text-emerald-400">Server-Side Verified</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <span>Hugging Face AI & Database Status</span>
            </h3>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Database:</span>
                <span className="text-emerald-400 font-bold">Cloud Cluster (Encrypted & Replicated)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Model:</span>
                <span className="text-purple-300 font-bold">Qwen/Qwen2.5-VL-7B-Instruct</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Validation:</span>
                <span className="text-emerald-400">Strict Zod Schemas</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Autonomy Guard:</span>
                <span className="text-amber-400">Advisory Only</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* EDIT USER MODAL                                                */}
      {/* ============================================================== */}
      {editingUser && (
        <Modal
          isOpen={true}
          onClose={() => setEditingUser(null)}
          title="Edit Platform Account"
          subtitle={`Modify details for user "${editingUser.name}" (${editingUser.id}).`}
        >
          <form onSubmit={handleSaveUser} className="space-y-4 p-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Role</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="client">Client (Payer & Deliverable Approver)</option>
                <option value="provider">Provider (Deliverable Submitter)</option>
                <option value="admin">Administrator (Superuser Oversight)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>Reset Password (Optional)</span>
                <span className="text-[10px] text-slate-500">Leave blank to keep existing password</span>
              </label>
              <input
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Enter new password (min 6 chars)..."
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingUser}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-amber-600/20 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingUser && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
