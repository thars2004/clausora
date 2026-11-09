import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Badge } from '../components/common/Badge';
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
} from 'lucide-react';

export const NewProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceType, setSourceType] = useState<'text' | 'file' | 'url' | 'rea'>('text');
  const [sourceContent, setSourceContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clients, setClients] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [blueprint, setBlueprint] = useState<WorkBlueprint | null>(null);
  const [projectId, setProjectId] = useState<string>('');
  const [error, setError] = useState<string>('');

  React.useEffect(() => {
    async function fetchClients() {
      try {
        const res = await api.get('/auth/clients');
        const list = res.data.data?.clients || [];
        setClients(list);
        if (list.length > 0) setSelectedClientId(list[0].id);
      } catch {
        // ignore
      }
    }
    fetchClients();
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
  };

  const handleLoadSampleReaReport = async () => {
    try {
      const res = await api.get('/rea/sample');
      const sample = res.data.data?.report;
      setTitle(`${sample.targetName} (REA Reconstructed)`);
      setDescription(sample.overview);
      setSourceContent(JSON.stringify(sample, null, 2));
      setSourceType('rea');
    } catch {
      setError('Failed to fetch REA sample report.');
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
      if (sourceType === 'rea') {
        let parsedReport;
        try {
          parsedReport = JSON.parse(sourceContent);
        } catch {
          throw new Error('Invalid JSON format in REA report input.');
        }

        const res = await api.post('/rea/import-report', parsedReport);
        setProjectId(res.data.data.project.id);
        setBlueprint(res.data.data.blueprint);
      } else {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('sourceType', sourceType);
        formData.append('sourceContent', sourceContent);
        if (selectedClientId) {
          formData.append('clientId', selectedClientId);
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
      await api.post(`/projects/${projectId}/agreements`, {
        totalAmountMinor: 100000, // $1,000 USD
        currency: 'USD',
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
          Ingest unstructured briefs, documents, screenshots, or REA reverse-engineered reports.
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
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assign Project / Workstream Tasks to Client
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
                <span>Import REA Report</span>
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
                <span>REA Inspector JSON</span>
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
                      ? 'Paste REA inspection report JSON here...'
                      : sourceType === 'url'
                      ? 'https://github.com/organization/repository-name'
                      : 'Paste client emails, Slack messages, task lists, or statement of work text...'
                  }
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
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
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
            <div>
              <Badge variant="ai">Work DNA Blueprint Synthesized</Badge>
              <h2 className="text-xl font-bold text-white mt-1">{blueprint.projectTitle}</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">{blueprint.projectSummary}</p>
            </div>
            <button
              onClick={handleCreateAgreement}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-900/30 transition"
            >
              <span>Baseline Formal Agreement (SHA-256)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

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

