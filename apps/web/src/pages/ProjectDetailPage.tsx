import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Project,
  WorkBlueprint,
  Milestone,
  Agreement,
  EvidenceItem,
  AiReview,
  ScopeChangeRequest,
  AuditEvent,
} from '@clausora/shared';
import { Badge } from '../components/common/Badge';
import { EvidenceGraph } from '../components/evidence/EvidenceGraph';
import { PayPalModal } from '../components/payment/PayPalModal';
import { WorkflowVisualizer } from '../components/workflow/WorkflowVisualizer';
import {
  FileText,
  CheckCircle2,
  Radio,
  History,
  GitPullRequest,
  Shield,
  CreditCard,
  Sparkles,
  ExternalLink,
  Plus,
  Loader2,
  AlertTriangle,
  Send,
  Fingerprint,
  GitMerge,
  DollarSign,
  Calendar,
} from 'lucide-react';

export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'milestones';
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [blueprint, setBlueprint] = useState<WorkBlueprint | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [aiReview, setAiReview] = useState<AiReview | null>(null);
  const [scopeRequests, setScopeRequests] = useState<ScopeChangeRequest[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Active milestone for evidence review / checkout
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [isPayPalModalOpen, setIsPayPalModalOpen] = useState(false);

  // Scope Drift form state
  const [newRequestText, setNewRequestText] = useState('');
  const [driftLoading, setDriftLoading] = useState(false);

  // New Evidence upload state
  const [newEvidenceTitle, setNewEvidenceTitle] = useState('');
  const [newEvidenceUrl, setNewEvidenceUrl] = useState('');
  const [newEvidenceDesc, setNewEvidenceDesc] = useState('');
  const [submittingEvidence, setSubmittingEvidence] = useState(false);

  const fetchProjectData = async (isBackground = false) => {
    try {
      const pId = projectId || 'proj_hackathon_demo';
      const res = await api.get(`/projects/${pId}`);
      const { project: pData, blueprint: bData, milestones: mData, agreements: aData } = res.data.data;
      setProject(pData);
      setBlueprint(bData);
      setMilestones(mData);
      setAgreements(aData);

      // Select or refresh active milestone
      let activeMs: Milestone | null = null;
      setSelectedMilestone((prev) => {
        if (prev) {
          const match = mData.find((m: Milestone) => m.id === prev.id);
          if (match) {
            activeMs = match;
            return match;
          }
        }
        const target = mData.find((m: Milestone) => m.status === 'AWAITING_CLIENT_DECISION') || mData[0] || null;
        activeMs = target;
        return target;
      });

      const msToInspect = activeMs || mData[0];
      if (msToInspect) {
        try {
          const eviRes = await api.get(`/milestones/${msToInspect.id}/evidence`);
          setEvidenceItems(eviRes.data.data?.evidence || []);
          const revRes = await api.get(`/milestones/${msToInspect.id}/review`);
          setAiReview(revRes.data.data?.review || null);
        } catch {
          // ignore
        }
      }

      // Fetch scope drift requests
      try {
        const scRes = await api.get(`/projects/${pId}/change-requests`);
        setScopeRequests(scRes.data.data?.changeRequests || []);
      } catch {
        // ignore
      }

      // Fetch audit events
      try {
        const actRes = await api.get(`/projects/${pId}/activity`);
        setAuditEvents(actRes.data.data?.events || []);
      } catch {
        // ignore
      }
    } catch (err) {
      console.error('Failed to load project details:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData(false);
    const interval = setInterval(() => {
      fetchProjectData(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [projectId]);

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  // Submit new evidence
  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMilestone || !newEvidenceTitle) return;
    setSubmittingEvidence(true);
    try {
      await api.post(`/milestones/${selectedMilestone.id}/evidence`, {
        title: newEvidenceTitle,
        description: newEvidenceDesc,
        urlOrContent: newEvidenceUrl,
        type: newEvidenceUrl.includes('github') ? 'repository' : 'url',
      });
      setNewEvidenceTitle('');
      setNewEvidenceUrl('');
      setNewEvidenceDesc('');
      await fetchProjectData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingEvidence(false);
    }
  };

  // Provider submits milestone for AI review
  const handleSubmitMilestone = async (milestoneId: string) => {
    try {
      await api.post(`/milestones/${milestoneId}/submit`);
      await fetchProjectData();
    } catch (err) {
      console.error(err);
    }
  };

  // Client approves milestone
  const handleApproveMilestone = async () => {
    if (!selectedMilestone) return;
    try {
      await api.post(`/milestones/${selectedMilestone.id}/approve`);
      await fetchProjectData();
      setIsPayPalModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  // Client requests revision
  const handleRequestRevision = async () => {
    if (!selectedMilestone) return;
    const notes = prompt('Enter revision feedback for provider:');
    if (!notes) return;
    try {
      await api.post(`/milestones/${selectedMilestone.id}/request-revision`, { revisionNotes: notes });
      await fetchProjectData();
    } catch (err) {
      console.error(err);
    }
  };

  // Scope Drift test simulation
  const handleTestScopeDrift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequestText.trim() || !project) return;
    setDriftLoading(true);
    try {
      await api.post(`/projects/${project.id}/change-requests`, {
        newRequestText,
      });
      setNewRequestText('');
      await fetchProjectData();
    } catch (err) {
      console.error(err);
    } finally {
      setDriftLoading(false);
    }
  };

  if (loading || !project) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-xs text-slate-400">Loading project cockpit & cryptographic state...</p>
      </div>
    );
  }

  const latestAgreement = agreements[agreements.length - 1];

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Project Header Banner */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-extrabold text-white">{project.title}</h1>
            <Badge variant="primary">{project.status}</Badge>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-700/40 text-[10px] text-emerald-300 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Atlas DB</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            {project.description}
          </p>

          {/* Fingerprint & Project Target Badges */}
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            {latestAgreement && (
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                <Fingerprint className="w-3.5 h-3.5 text-indigo-400" />
                <span>Agreement v{latestAgreement.version}:</span>
                <span className="text-indigo-300 font-semibold bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                  {latestAgreement.snapshotHash.substring(0, 16)}...
                </span>
              </div>
            )}

            {(project.totalAmountMinor || blueprint?.totalBudgetMinor) && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 font-mono text-[11px] font-bold">
                <DollarSign className="w-3 h-3 text-emerald-400" />
                <span>Budget: ${(((project.totalAmountMinor || blueprint?.totalBudgetMinor || 0) / 100)).toFixed(2)} {project.currency || 'USD'}</span>
              </div>
            )}

            {(project.deadline || blueprint?.targetDeadline) && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 font-mono text-[11px]">
                <Calendar className="w-3 h-3 text-indigo-400" />
                <span>Target: {project.deadline || blueprint?.targetDeadline}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick action button */}
        {selectedMilestone && selectedMilestone.status === 'APPROVED_FOR_PAYMENT' && (
          (user?.role === 'client' || user?.role === 'admin') ? (
            <button
              onClick={() => setIsPayPalModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 bg-[#0070BA] hover:bg-[#005ea6] text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-900/30 transition animate-bounce"
            >
              <CreditCard className="w-4 h-4" />
              <span>Release PayPal Sandbox Payout (${(selectedMilestone.amountMinor / 100).toFixed(2)})</span>
            </button>
          ) : (
            <div className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-amber-300 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Approved by Client • Awaiting PayPal Release by Client</span>
            </div>
          )
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setTab('milestones')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
            currentTab === 'milestones'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Milestones Roadmap</span>
        </button>

        <button
          onClick={() => setTab('workflow')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
            currentTab === 'workflow'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <GitMerge className="w-4 h-4" />
          <span>Execution Flow & Pipeline</span>
        </button>

        <button
          onClick={() => setTab('evidence')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
            currentTab === 'evidence'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Evidence Graph</span>
        </button>

        <button
          onClick={() => setTab('drift')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
            currentTab === 'drift'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Scope Drift Radar</span>
          {scopeRequests.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setTab('blueprint')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
            currentTab === 'blueprint'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Work Blueprint & Agreement</span>
        </button>

        <button
          onClick={() => setTab('rea')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
            currentTab === 'rea'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <GitPullRequest className="w-4 h-4" />
          <span>REA Inspector</span>
        </button>

        <button
          onClick={() => setTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
            currentTab === 'audit'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Timeline</span>
        </button>
      </div>

      {/* TAB: WORKFLOW & EXECUTION PIPELINE */}
      {currentTab === 'workflow' && (
        <div className="space-y-6 animate-fade-in">
          <WorkflowVisualizer blueprint={blueprint} project={project} />
        </div>
      )}

      {/* TAB 1: MILESTONES ROADMAP */}
      {currentTab === 'milestones' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {milestones.map((ms, idx) => {
              const isPaid = ms.status === 'PAID';
              const isAwaiting = ms.status === 'AWAITING_CLIENT_DECISION';
              const isApproved = ms.status === 'APPROVED_FOR_PAYMENT';
              const amountDollars = (ms.amountMinor / 100).toFixed(2);

              return (
                <div
                  key={ms.id}
                  className={`p-6 rounded-2xl border transition text-left flex flex-col justify-between space-y-4 ${
                    isPaid
                      ? 'bg-emerald-950/20 border-emerald-800/60'
                      : isAwaiting
                      ? 'bg-slate-900 border-indigo-500/80 shadow-lg shadow-indigo-500/10'
                      : 'bg-slate-900/70 border-slate-800'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-slate-500">MILESTONE 0{idx + 1}</span>
                      <Badge
                        variant={isPaid ? 'success' : isAwaiting ? 'ai' : isApproved ? 'paypal' : 'neutral'}
                      >
                        {ms.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <h3 className="text-base font-bold text-white">{ms.title}</h3>
                    <p className="text-xs text-slate-400">{ms.description}</p>
                  </div>

                  {/* Payment reference if paid */}
                  {isPaid && (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-700/50 rounded-xl font-mono text-xs text-emerald-300 space-y-1">
                      <div className="flex justify-between">
                        <span>PayPal Capture:</span>
                        <span className="font-bold">{ms.paypalCaptureId}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Status:</span>
                        <span>Server Verified</span>
                      </div>
                    </div>
                  )}

                  {/* Amount and Actions */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Authorized Value</span>
                      <span className="text-xl font-bold font-mono text-white">
                        ${amountDollars} <span className="text-xs text-slate-400 font-normal">{ms.currency}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {ms.status === 'IN_PROGRESS' && user?.role === 'provider' && (
                        <button
                          onClick={() => handleSubmitMilestone(ms.id)}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
                        >
                          Submit Proof
                        </button>
                      )}

                      {isAwaiting && (
                        <button
                          onClick={() => {
                            setSelectedMilestone(ms);
                            setTab('evidence');
                          }}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
                        >
                          Review Evidence
                        </button>
                      )}

                      {isApproved && (
                        (user?.role === 'client' || user?.role === 'admin') ? (
                          <button
                            onClick={() => {
                              setSelectedMilestone(ms);
                              setIsPayPalModalOpen(true);
                            }}
                            className="px-4 py-2 bg-[#0070BA] hover:bg-[#005ea6] text-white text-xs font-bold rounded-lg transition"
                          >
                            PayPal Sandbox
                          </button>
                        ) : (
                          <span className="text-[11px] font-mono text-amber-300 bg-amber-950/60 px-2.5 py-1 rounded border border-amber-800/40">
                            Awaiting Client Release
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: EVIDENCE GRAPH */}
      {currentTab === 'evidence' && selectedMilestone && (
        <div className="space-y-8">
          <EvidenceGraph
            milestone={selectedMilestone}
            evidenceItems={evidenceItems}
            aiReview={aiReview}
            onApprove={handleApproveMilestone}
            onRequestRevision={handleRequestRevision}
            canApprove={user?.role === 'client' || user?.role === 'admin'}
          />

          {/* Attach new proof form (for provider) */}
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
            <h4 className="text-sm font-bold text-slate-200">Submit Additional Proof Artifact</h4>
            <form onSubmit={handleAddEvidence} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Title (e.g. Unit Test Run Log or UI Screenshot)"
                value={newEvidenceTitle}
                onChange={(e) => setNewEvidenceTitle(e.target.value)}
                className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                required
              />
              <input
                type="text"
                placeholder="URL or Storage Ref (e.g. https://github.com/...)"
                value={newEvidenceUrl}
                onChange={(e) => setNewEvidenceUrl(e.target.value)}
                className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                required
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Notes / description"
                  value={newEvidenceDesc}
                  onChange={(e) => setNewEvidenceDesc(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={submittingEvidence}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
                >
                  {submittingEvidence ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: SCOPE DRIFT RADAR */}
      {currentTab === 'drift' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-bold text-white">Scope Drift Radar</h3>
              <Badge variant="warning">Automated Scope Protection</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              When clients or team members enter new requests, Clausora scans against the frozen agreement snapshot. Scope additions require mutual human sign-off rather than silently creeping budget or timelines.
            </p>

            {/* Test Input Simulator */}
            <form onSubmit={handleTestScopeDrift} className="mt-5 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newRequestText}
                  onChange={(e) => setNewRequestText(e.target.value)}
                  placeholder="Simulate a new client request: e.g. 'Can you also add an AI customer support chatbot and multi-currency billing?'"
                  className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  required
                />
                <button
                  type="submit"
                  disabled={driftLoading}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                >
                  {driftLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Scan Scope</span>
                </button>
              </div>
            </form>
          </div>

          {/* List of Scope Change Requests */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-200">Detected Changes & Amendment Proposals</h4>
            {scopeRequests.map((req) => (
              <div
                key={req.id}
                className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={req.classification === 'in_scope' ? 'success' : 'warning'}>
                        {req.classification.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs font-mono text-slate-500">{new Date(req.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-100 mt-2">
                      "{req.incomingText}"
                    </p>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      <strong>AI Radar Analysis:</strong> {req.reason}
                    </p>
                  </div>
                </div>

                {req.suggestedChangeRequest && (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 text-xs">
                    <span className="font-semibold text-indigo-400">Formal Amendment Proposal:</span>
                    <p className="text-slate-300">{req.suggestedChangeRequest.description}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: WORK BLUEPRINT & AGREEMENT */}
      {currentTab === 'blueprint' && (
        <div className="space-y-6">
          {latestAgreement && (
            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant="success">Agreement v{latestAgreement.version}</Badge>
                  <h3 className="text-lg font-bold text-white mt-1">Tamper-Evident Contract Snapshot</h3>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="text-slate-400 block">Total Budget:</span>
                  <span className="text-lg font-bold text-emerald-400">
                    ${(latestAgreement.totalAmountMinor / 100).toFixed(2)} {latestAgreement.currency}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs space-y-1 text-slate-400">
                <div className="flex justify-between">
                  <span>SHA-256 Canonical Fingerprint:</span>
                  <span className="text-indigo-400 font-bold">{latestAgreement.snapshotHash}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dual Approval Status:</span>
                  <span className="text-emerald-400 font-bold">MUTUALLY SIGNED</span>
                </div>
              </div>

              {/* Workstreams breakdown */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Agreed Workstreams & Deliverables</h4>
                {latestAgreement.canonicalSnapshot.workstreams.map((ws, i) => (
                  <div key={ws.id} className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
                    <h5 className="text-xs font-bold text-indigo-300">{i + 1}. {ws.name}</h5>
                    <p className="text-xs text-slate-400">{ws.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: REA WORKFLOW INSPECTOR */}
      {currentTab === 'rea' && (
        <div className="space-y-6">
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <GitPullRequest className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-bold text-white">REA Reverse-Engineering Workflow Inspector</h3>
              <Badge variant="primary">morluto/rea</Badge>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              In accordance with Section 15 of the Clausora Technical Specification, local reverse engineering reports generated with the REA toolkit can be imported as verifiable work artifacts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
              <h4 className="text-sm font-bold text-slate-200">Observed Runtime Behaviors</h4>
              <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
                <li>Client JWT Bearer tokens validated on each authenticated endpoint.</li>
                <li>PayPal sandbox order creation triggered on milestone approval.</li>
                <li>Server-side capture verification confirms HTTP 200 COMPLETED from Orders v2 API.</li>
                <li>Audit timeline events logged with immutable SHA-256 hash proofs.</li>
              </ul>
            </div>

            <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
              <h4 className="text-sm font-bold text-slate-200">Discovered API Endpoints & Functions</h4>
              <div className="space-y-1.5 font-mono text-xs">
                <div className="p-2 bg-slate-950 rounded border border-slate-800 text-indigo-300">
                  POST /api/payments/milestones/:id/create-order
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800 text-emerald-300">
                  POST /api/payments/:id/capture
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800 text-purple-300">
                  POST /api/ai/analyse-evidence
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800 text-amber-300">
                  POST /api/projects/:id/change-requests
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT TIMELINE */}
      {currentTab === 'audit' && (
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white">Cryptographic Audit Trail</h3>
            <p className="text-xs text-slate-400 mt-1">
              Append-only timeline recording all agreement hashes, evidence submissions, reviews, and PayPal capture events.
            </p>
          </div>

          <div className="space-y-4">
            {auditEvents.map((ev) => (
              <div key={ev.id} className="relative pl-6 pb-4 border-l border-slate-800 text-left">
                <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-indigo-500 border-2 border-slate-950" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{ev.actorName}</span>
                    <Badge variant={ev.actorRole === 'ai' ? 'ai' : 'primary'} size="sm">
                      {ev.actorRole}
                    </Badge>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {new Date(ev.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">{ev.summary}</p>
                <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                  Event ID: {ev.id} • Type: {ev.eventType}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PayPal Sandbox Checkout Modal */}
      {selectedMilestone && (
        <PayPalModal
          isOpen={isPayPalModalOpen}
          onClose={() => setIsPayPalModalOpen(false)}
          milestone={selectedMilestone}
          onPaymentSuccess={fetchProjectData}
        />
      )}
    </div>
  );
};

