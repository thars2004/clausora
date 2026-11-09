import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/common/Badge';
import { WorkflowVisualizer } from '../components/workflow/WorkflowVisualizer';
import { WorkBlueprint } from '@clausora/shared';
import {
  Sparkles,
  UploadCloud,
  FileText,
  Link as LinkIcon,
  GitPullRequest,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Users,
  Calendar,
  DollarSign,
  Clock,
  Layers,
} from 'lucide-react';

export const NewProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceType, setSourceType] = useState<'text' | 'file' | 'url' | 'rea'>('text');
  const [sourceContent, setSourceContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [clients, setClients] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [providers, setProviders] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');

  // Budget & Deadline States
  const [totalAmount, setTotalAmount] = useState<string>('1500');
  const [currency, setCurrency] = useState<string>('USD');
  const [deadline, setDeadline] = useState<string>(() => {
    const d = new Date(Date.now() + 21 * 86400000);
    return d.toISOString().split('T')[0];
  });

  const [loading, setLoading] = useState(false);
  const [blueprint, setBlueprint] = useState<WorkBlueprint | null>(null);
  const [projectId, setProjectId] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function fetchUsers() {
      try {
        const [cRes, pRes] = await Promise.all([
          api.get('/auth/clients').catch(() => ({ data: { data: { clients: [] } } })),
          api.get('/auth/providers').catch(() => ({ data: { data: { providers: [] } } })),
        ]);
        const clientList = cRes.data.data?.clients || [];
        const providerList = pRes.data.data?.providers || [];
        setClients(clientList);
        setProviders(providerList);
        if (clientList.length > 0) setSelectedClientId(clientList[0].id);
        if (providerList.length > 0) setSelectedProviderId(providerList[0].id);
      } catch {
        // ignore
      }
    }
    fetchUsers();
  }, []);

  const handleLoadSampleBrief = () => {
    setTitle('Fullstack AI Booking & Milestone Escrow Portal');
    setDescription('Build a responsive web application allowing users to register, browse digital services, book scheduled slots, and release milestone funds via PayPal Sandbox upon verified deliverable proof.');
    setSourceContent(`Scope Details:
1. Client and Provider role authentication using secure JWT tokens.
2. Service booking calendar with reservation confirmation emails.
3. Deliverable proof review screen displaying screenshots, repository links, and AI limitation notes.
4. Human client approval action triggering PayPal Orders v2 sandbox checkout and server-side capture verification.
5. Scope drift detector to flag unbudgeted client change requests.`);
    setTotalAmount('1500');
    setDeadline(new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0]);
  };

  const handleLoadSampleReaReport = async () => {
    try {
      const res = await api.get('/rea/sample');
      const sample = res.data.data?.report;
      setTitle(`${sample.targetName} (System Specification)`);
      setDescription(sample.overview);
      setSourceContent(JSON.stringify(sample, null, 2));
      setSourceType('rea');
    } catch {
      setError('Failed to fetch sample specification.');
    }
  };

  const handleSynthesizeWorkDna = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Project title is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const resolvedClientId = user?.role === 'client' ? user.id : (selectedClientId || 'usr_client_demo');
      const resolvedProviderId = user?.role === 'provider' ? user.id : (selectedProviderId || 'usr_provider_demo');
      const parsedFloat = parseFloat(totalAmount || '0');
      const amountMinor = !isNaN(parsedFloat) && parsedFloat > 0 ? Math.round(parsedFloat * 100) : undefined;

      if (sourceType === 'rea') {
        let parsedReport;
        try {
          parsedReport = JSON.parse(sourceContent);
        } catch {
          throw new Error('Invalid JSON format in specification input.');
        }

        const res = await api.post('/rea/import-report', {
          ...parsedReport,
          clientId: resolvedClientId,
          providerId: resolvedProviderId,
          totalAmountMinor: amountMinor,
          currency,
          deadline: deadline || undefined,
        });
        setProjectId(res.data.data.project.id);
        setBlueprint(res.data.data.blueprint);
      } else {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('sourceType', sourceType);
        formData.append('sourceContent', sourceContent);
        if (amountMinor) {
          formData.append('totalAmountMinor', String(amountMinor));
        }
        formData.append('currency', currency);
        if (deadline) {
          formData.append('deadline', deadline);
        }
        if (resolvedClientId) {
          formData.append('clientId', resolvedClientId);
        }
        if (resolvedProviderId) {
          formData.append('providerId', resolvedProviderId);
        }
        if (selectedFile) {
          formData.append('file', selectedFile);
        }

        const res = await api.post('/projects', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        setProjectId(res.data.data.project.id);
        setBlueprint(res.data.data.blueprint);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to synthesize Work Blueprint.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgreement = async () => {
    if (!projectId || !blueprint) return;
    setLoading(true);
    try {
      const budgetToSend = blueprint.totalBudgetMinor || (parseFloat(totalAmount || '0') > 0 ? Math.round(parseFloat(totalAmount) * 100) : 0);
      if (!budgetToSend || budgetToSend <= 0) {
        setError('Financial Safety: Human confirmation is required. Please enter a valid agreed budget before generating a legally binding agreement.');
        setLoading(false);
        return;
      }

      await api.post(`/projects/${projectId}/agreements`, {
        totalAmountMinor: budgetToSend,
        currency: currency || 'USD',
        milestones: blueprint.suggestedMilestones,
      });
      navigate(`/projects/${projectId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initialize formal agreement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Title */}
      <div>
        <div className="inline-flex items-center gap-1.5 text-xs text-indigo-400 font-semibold mb-1">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Work DNA Engine</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">Create New Project Blueprint</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Ingest unstructured briefs, technical documents, screenshots, or system architecture specifications.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Input Form if not yet synthesized */}
      {!blueprint ? (
        <form onSubmit={handleSynthesizeWorkDna} className="space-y-6">
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200">1. Project Title & Overview</h3>
              <button
                type="button"
                onClick={handleLoadSampleBrief}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline"
              >
                Auto-fill Sample Brief
              </button>
            </div>

            <div className="space-y-4">
              {/* Dynamic Role Assignments: Client creates -> selects Provider; Provider creates -> selects Client; Admin -> selects both */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(user?.role === 'provider' || user?.role === 'admin' || !user?.role) && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Select Client / Payer</span>
                    </label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                    >
                      {clients.length === 0 ? (
                        <option value="usr_client_demo">Sarah Chen (Acme Ventures) — client@clausora.dev</option>
                      ) : (
                        clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.email})
                          </option>
                        ))
                      )}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">This client will hold exclusive approval & PayPal release rights.</p>
                  </div>
                )}

                {(user?.role === 'client' || user?.role === 'admin' || !user?.role) && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-purple-400" />
                      <span>Select Assigned Provider / Developer</span>
                    </label>
                    <select
                      value={selectedProviderId}
                      onChange={(e) => setSelectedProviderId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-purple-500"
                    >
                      {providers.length === 0 ? (
                        <option value="usr_provider_demo">Alex Rivera (Nexus Labs) — provider@clausora.dev</option>
                      ) : (
                        providers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.email})
                          </option>
                        ))
                      )}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">This provider will have access to submit deliverable proofs.</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Project Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Responsive Booking Engine & Customer Dashboard"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Summary / Intent</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description of what the project aims to solve..."
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Source Input Mode Selector */}
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200">2. Input Material & Artifacts</h3>
              <button
                type="button"
                onClick={handleLoadSampleReaReport}
                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                <GitPullRequest className="w-3.5 h-3.5" />
                <span>Import Architecture Spec</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setSourceType('text')}
                className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition ${
                  sourceType === 'text'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Plain Brief / Notes</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceType('file')}
                className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition ${
                  sourceType === 'file'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload PDF / Screenshot</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceType('url')}
                className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition ${
                  sourceType === 'url'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <LinkIcon className="w-4 h-4" />
                <span>GitHub / Public URL</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceType('rea')}
                className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition ${
                  sourceType === 'rea'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <GitPullRequest className="w-4 h-4" />
                <span>Architecture Spec JSON</span>
              </button>
            </div>

            {sourceType === 'file' ? (
              <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-8 text-center space-y-2">
                <UploadCloud className="w-8 h-8 text-indigo-400 mx-auto" />
                <div className="text-xs text-slate-300">
                  <label className="text-indigo-400 font-semibold cursor-pointer hover:underline">
                    Click to browse
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>{' '}
                  or drag and drop document or UI screenshot.
                </div>
                {selectedFile && (
                  <p className="text-xs text-emerald-400 font-mono font-medium">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            ) : (
              <div>
                <textarea
                  rows={6}
                  value={sourceContent}
                  onChange={(e) => setSourceContent(e.target.value)}
                  placeholder={
                    sourceType === 'rea'
                      ? 'Paste system architecture specification JSON here...'
                      : sourceType === 'url'
                      ? 'https://github.com/organization/repository-name'
                      : 'Paste client emails, Slack messages, task lists, or statement of work text...'
                  }
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Section 3: Target Budget & Completion Deadline */}
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200">3. Target Budget & Completion Deadline</h3>
              <span className="text-xs text-indigo-400 font-mono">PayPal Orders v2 Compatible</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Total Budget */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Total Project Budget (Optional)</span>
                  </span>
                  <span className="text-[10px] text-emerald-400/80 font-mono">Financial Safety Guarded</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      placeholder="e.g. 1500 (or leave empty)"
                      className="w-full pl-7 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs font-mono focus:outline-none focus:border-indigo-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <p className="text-[11px] text-slate-500">
                  If omitted, Clausora will strictly mark amounts as pending human input and never invent budget figures.
                </p>
                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setTotalAmount('')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition ${
                      totalAmount === ''
                        ? 'bg-amber-600 text-white font-bold'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Unset (TBD)
                  </button>
                  {['500', '1000', '1500', '2500', '5000'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTotalAmount(amt)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition ${
                        totalAmount === amt
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Deadline */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Target Project Completion Deadline</span>
                  </span>
                  <span className="text-[10px] text-indigo-400/80 font-mono">Timeline Guarded</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={deadline}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  {deadline && (
                    <button
                      type="button"
                      onClick={() => setDeadline('')}
                      className="px-2.5 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-mono transition"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  {deadline
                    ? 'AI will align phases chronologically toward this target.'
                    : 'No confirmed date selected. Estimated durations will be non-binding pending start date confirmation.'}
                </p>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Analyzing Work DNA (Qwen2.5-VL Multimodal)...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Synthesize Structured Work Blueprint</span>
              </>
            )}
          </button>
        </form>
      ) : (
        /* Work Blueprint Review Screen */
        <div className="space-y-6 animate-fade-in">
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="ai">Work DNA Blueprint Synthesized</Badge>
                {blueprint.targetDeadline && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-[10px] text-indigo-300 font-mono">
                    Deadline: {blueprint.targetDeadline}
                  </span>
                )}
                {blueprint.totalBudgetMinor && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/50 text-[10px] text-emerald-300 font-mono font-bold">
                    ${(blueprint.totalBudgetMinor / 100).toFixed(2)} USD
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-white mt-2">{blueprint.projectTitle}</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">{blueprint.projectSummary}</p>
            </div>
            <button
              onClick={handleCreateAgreement}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-900/30 transition shrink-0"
            >
              <span>Baseline Formal Agreement (SHA-256)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive Visual Workflow Diagram */}
          <WorkflowVisualizer blueprint={blueprint} />

          {/* Workstreams and Tasks */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200">Workstreams & Verifiable Tasks</h3>
            {blueprint.workstreams.map((ws, i) => (
              <div key={ws.id} className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-indigo-300">
                    {i + 1}. {ws.name}
                  </h4>
                  <span className="text-xs text-slate-400 font-mono">{ws.tasks.length} tasks</span>
                </div>
                <p className="text-xs text-slate-400">{ws.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {ws.tasks.map((t) => (
                    <div key={t.id} className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">{t.title}</span>
                        <Badge variant="primary" size="sm">{t.priority}</Badge>
                      </div>
                      <p className="text-[11px] text-slate-400">{t.deliverable}</p>
                      <div className="pt-2 border-t border-slate-800/60">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Criteria:</span>
                        <ul className="text-[11px] text-slate-300 list-disc list-inside mt-0.5 space-y-0.5">
                          {t.acceptanceCriteria.map((ac, idx) => (
                            <li key={idx}>{ac}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Assumptions & Clarifying Questions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Assumptions & Exclusions</span>
              <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                {blueprint.assumptions.map((as, i) => (
                  <li key={i}>{as}</li>
                ))}
              </ul>
            </div>

            <div className="p-5 bg-slate-900/80 border border-purple-900/40 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Clarifying Questions for Client</span>
              <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                {blueprint.clarifyingQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

