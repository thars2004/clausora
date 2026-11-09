import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AdminOverviewStats } from '@clausora/shared';
import { Badge } from '../components/common/Badge';
import {
  ShieldCheck,
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
} from 'lucide-react';

export const AdminPortalPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'tasks' | 'payments' | 'system'>('users');
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const statsRes = await api.get('/admin/stats');
      setStats(statsRes.data.data?.stats || null);

      const usersRes = await api.get('/admin/users');
      setUsersList(usersRes.data.data?.users || []);

      const tasksRes = await api.get('/admin/tasks');
      setTasksList(tasksRes.data.data?.tasks || []);

      const payRes = await api.get('/admin/payments');
      setPaymentsList(payRes.data.data?.payments || []);

      const healthRes = await api.get('/health');
      setSystemHealth(healthRes.data || null);
    } catch (err) {
      console.error('Failed to load admin management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-xs text-slate-400">Loading master administrative console...</p>
      </div>
    );
  }

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

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Admin Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-800/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <h1 className="text-2xl font-extrabold text-white">Master Admin Console</h1>
            <Badge variant="warning">Superuser Access</Badge>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Global oversight across all registered users, tasks, deliverable milestones, and PayPal Sandbox payments.
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
              <span className="text-slate-500 block text-[10px]">Total Users</span>
              <span className="text-white font-bold">{stats.totalUsers}</span>
            </div>
          </div>
        )}
      </div>

      {/* Admin Sub-navigation Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold">
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
            <span>All Tasks Master ({tasksList.length})</span>
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
            <span>Payment Settlements ({paymentsList.length})</span>
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
            <span>System Health</span>
          </button>
        </div>

        {/* Global Filter & Search Bar */}
        {activeTab !== 'system' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        )}
      </div>

      {/* TAB 1: USERS DIRECTORY */}
      {activeTab === 'users' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Registered Platform Accounts</h3>
            <span className="text-xs text-slate-400">Total: {filteredUsers.length}</span>
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
                  <th className="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredUsers.map((u) => {
                  const roleVariant =
                    u.role === 'client' ? 'primary' : u.role === 'provider' ? 'ai' : 'warning';
                  return (
                    <tr key={u.id} className="hover:bg-slate-950/40 transition">
                      <td className="px-5 py-3.5 font-semibold text-white">{u.name}</td>
                      <td className="px-5 py-3.5 text-slate-300 font-mono">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <Badge variant={roleVariant} size="sm">
                          {u.role.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 font-mono">{u.projectCount || 1}</td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/50 text-[10px] font-bold">
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: GLOBAL TASKS MASTER */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-white">All Platform Workstream Deliverables</h3>
            <span className="text-xs text-slate-400">Total: {filteredTasks.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTasks.map((t, i) => (
              <div
                key={t.id || i}
                className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3"
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
        </div>
      )}

      {/* TAB 3: PAYMENT SETTLEMENTS */}
      {activeTab === 'payments' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">PayPal Sandbox Ledger</h3>
            <span className="text-xs text-slate-400">Total: {filteredPayments.length}</span>
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
                {filteredPayments.map((p) => {
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
        </div>
      )}

      {/* TAB 4: SYSTEM HEALTH & INTEGRATIONS */}
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
              <span>Hugging Face AI Status</span>
            </h3>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Model:</span>
                <span className="text-purple-300 font-bold">Qwen/Qwen2.5-VL-7B-Instruct</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Task:</span>
                <span className="text-slate-300">chat-completion (multimodal)</span>
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
    </div>
  );
};
