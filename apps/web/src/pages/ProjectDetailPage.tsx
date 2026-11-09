import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useScrollPagination } from '../hooks/useScrollPagination';
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
import { Modal } from '../components/common/Modal';
import {
  FileText,
  CheckCircle2,
  Radio,
  History,
  GitPullRequest,
  Shield,
  ShieldAlert,
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
  RefreshCw,
  ChevronDown,
  ArrowUpRight,
  FolderGit2,
  Pencil,
  Trash2,
  ArrowLeft,
  ThumbsUp,
  Clock,
  UserCheck,
  CheckSquare,
  Zap,
} from 'lucide-react';

export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Unified Tab Resolution with backwards-compatibility aliases
  const rawTab = searchParams.get('tab') || 'milestones';
  const currentTab =
    rawTab === 'workflow' || rawTab === 'blueprint' ? 'dna' :
    rawTab === 'evidence' ? 'milestones' :
    rawTab === 'escrow' || rawTab === 'payments' ? 'payment' :
    rawTab === 'rea' ? 'audit' :
    rawTab;

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const { user } = useAuth();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [blueprint, setBlueprint] = useState<WorkBlueprint | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [aiReview, setAiReview] = useState<AiReview | null>(null);
  const [scopeRequests, setScopeRequests] = useState<ScopeChangeRequest[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [allUserProjects, setAllUserProjects] = useState<Project[]>([]);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState('');
  const [accessibleProjects, setAccessibleProjects] = useState<any[]>([]);

  // Active milestone for evidence review / checkout
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const activeSelectedMilestone = selectedMilestone || (milestones.length > 0 ? milestones[0] : null);

  // Dedicated effect to load evidence and review whenever selectedMilestone changes
  useEffect(() => {
    if (!activeSelectedMilestone) return;
    let isMounted = true;
    const loadMilestoneEvidence = async () => {
      try {
        const eviRes = await api.get(`/milestones/${activeSelectedMilestone.id}/evidence`);
        if (isMounted) setEvidenceItems(eviRes.data.data?.evidence || []);
        const revRes = await api.get(`/milestones/${activeSelectedMilestone.id}/review`);
        if (isMounted) setAiReview(revRes.data.data?.review || null);
      } catch {
        // ignore
      }
    };
    loadMilestoneEvidence();
    return () => {
      isMounted = false;
    };
  }, [activeSelectedMilestone?.id]);

  const [isPayPalModalOpen, setIsPayPalModalOpen] = useState(false);

  // Scope Drift form state
  const [newRequestText, setNewRequestText] = useState('');
  const [driftLoading, setDriftLoading] = useState(false);

  // New Evidence upload state
  const [newEvidenceTitle, setNewEvidenceTitle] = useState('');
  const [newEvidenceUrl, setNewEvidenceUrl] = useState('');
  const [newEvidenceDesc, setNewEvidenceDesc] = useState('');
  const [submittingEvidence, setSubmittingEvidence] = useState(false);

  // Edit & Delete Project State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [updatingProject, setUpdatingProject] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);

  // Accept Project State
  const [acceptingProject, setAcceptingProject] = useState(false);

  // Payment Details Modal State
  const [isPaymentDetailsModalOpen, setIsPaymentDetailsModalOpen] = useState(false);
  const [payerEmail, setPayerEmail] = useState('');
  const [paypalMerchantId, setPaypalMerchantId] = useState('');
  const [billingName, setBillingName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'paypal_sandbox' | 'credit_card' | 'bank_wire'>('paypal_sandbox');
  const [escrowTerms, setEscrowTerms] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [savingPaymentDetails, setSavingPaymentDetails] = useState(false);

  const openPaymentDetailsModal = () => {
    if (!project) return;
    const details = project.paymentDetails || {};
    setPayerEmail(details.payerEmail || user?.email || '');
    setPaypalMerchantId(details.paypalMerchantId || 'SANDBOX_MERCHANT_CLAU_2026');
    setBillingName(details.billingName || user?.name || '');
    setTaxId(details.taxId || '');
    setBillingAddress(details.billingAddress || '');
    setPaymentMethod(details.paymentMethod || 'paypal_sandbox');
    setEscrowTerms(details.escrowTerms || 'Funds released upon client verification of milestone acceptance criteria.');
    setPayoutNotes(details.payoutNotes || '');
    setIsPaymentDetailsModalOpen(true);
  };

  const handleSavePaymentDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    setSavingPaymentDetails(true);
    try {
      const payload = {
        paymentDetails: {
          payerEmail: payerEmail.trim(),
          paypalMerchantId: paypalMerchantId.trim(),
          billingName: billingName.trim(),
          taxId: taxId.trim(),
          billingAddress: billingAddress.trim(),
          paymentMethod,
          escrowTerms: escrowTerms.trim(),
          payoutNotes: payoutNotes.trim(),
          updatedAt: new Date().toISOString(),
        },
      };
      const res = await api.put(`/projects/${project.id}`, payload);
      toast.success(res.data.message || 'Payment and escrow details saved to live MongoDB Atlas.', 'Payment Details');
      setIsPaymentDetailsModalOpen(false);
      await fetchProjectData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save payment details.', 'Payment Error');
    } finally {
      setSavingPaymentDetails(false);
    }
  };

  const handleDirectMilestoneApprove = async (milestoneId: string) => {
    try {
      const res = await api.post(`/milestones/${milestoneId}/approve`);
      toast.success(res.data.message || 'Milestone approved! Authorized for PayPal release.', 'Milestone Approved');
      await fetchProjectData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve milestone.', 'Approval Error');
    }
  };

  const handleOpenDirectPaymentModal = () => {
    // 1. Pick first unpaid or partially paid milestone
    const unpaidMs = milestones.find(
      (m) => m.status !== 'PAID' && (!m.paidMinor || m.paidMinor < m.amountMinor)
    );
    if (unpaidMs) {
      setSelectedMilestone(unpaidMs);
      setIsPayPalModalOpen(true);
      return;
    }
    if (milestones.length > 0) {
      setSelectedMilestone(milestones[0]);
      setIsPayPalModalOpen(true);
      return;
    }

    // 2. Fallback milestone for project escrow allocation
    if (project) {
      const defaultMs: Milestone = {
        id: `ms_${project.id}_1`,
        projectId: project.id,
        agreementId: project.currentAgreementId || `agr_${project.id}`,
        title: `${project.title} — Escrow Allocation`,
        description: 'Project escrow allocation and milestone payment release',
        amountMinor: project.totalAmountMinor || 50000,
        paidMinor: 0,
        currency: project.currency || 'USD',
        dueDate: new Date().toISOString().split('T')[0],
        taskIds: [],
        acceptanceCriteria: [],
        status: 'IN_PROGRESS',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setSelectedMilestone(defaultMs);
      setIsPayPalModalOpen(true);
    }
  };

  // Scroll pagination for Audit timeline events
  const auditPagination = useScrollPagination(auditEvents, { pageSize: 6 });

  const fetchProjectData = async (isBackground = false, isUserInitiated = false) => {
    try {
      let pId = projectId;
      if (!pId) {
        const listRes = await api.get('/projects');
        const list = listRes.data.data?.projects || [];
        if (list.length > 0) {
          pId = list[0].id;
          navigate(`/projects/${pId}`, { replace: true });
        } else {
          navigate('/projects', { replace: true });
          return;
        }
      }

      const res = await api.get(`/projects/${pId}`);
      const { project: pData, blueprint: bData, milestones: mData, agreements: aData } = res.data.data;
      setProject(pData);
      setBlueprint(bData);
      setMilestones(mData || []);
      setAgreements(aData || []);
      setAccessDenied(false);

      // Fetch all projects accessible to current user for the cockpit switcher
      try {
        const listRes = await api.get('/projects');
        const list = listRes.data.data?.projects || [];
        setAllUserProjects(list);
      } catch {
        // ignore
      }

      if (isUserInitiated) {
        toast.success(
          res.data.message || `Project Cockpit synchronized with Live Atlas DB: "${pData.title}"`,
          'Cockpit Synced'
        );
      }

      // Select or refresh active milestone
      let activeMs: Milestone | null = null;
      setSelectedMilestone((prev) => {
        if (prev) {
          const match = (mData || []).find((m: Milestone) => m.id === prev.id);
          if (match) {
            activeMs = match;
            return match;
          }
        }
        const target = (mData || []).find((m: Milestone) => m.status === 'AWAITING_CLIENT_DECISION') || (mData || [])[0] || null;
        activeMs = target;
        return target;
      });

      const msToInspect = activeMs || (mData || [])[0];
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
    } catch (err: any) {
      console.error('Failed to load project details:', err);
      if (err.response?.status === 403) {
        setAccessDenied(true);
        setAccessDeniedMessage(err.response?.data?.message || 'Access Forbidden: You do not have permission to access this project.');
        try {
          const listRes = await api.get('/projects');
          setAccessibleProjects(listRes.data.data?.projects || []);
        } catch {
          // ignore
        }
      } else {
        const errMsg = err.response?.data?.message || err.message || 'Failed to load project details from server';
        if (!isBackground) {
          toast.error(errMsg, 'Cockpit Sync Error');
        }
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await fetchProjectData(false, true);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchProjectData(false);
    const interval = setInterval(() => {
      fetchProjectData(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [projectId]);

  // Submit new evidence
  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMilestone || !newEvidenceTitle) return;
    setSubmittingEvidence(true);
    try {
      const res = await api.post(`/milestones/${selectedMilestone.id}/evidence`, {
        title: newEvidenceTitle,
        description: newEvidenceDesc,
        urlOrContent: newEvidenceUrl,
        type: newEvidenceUrl.includes('github') ? 'repository' : 'url',
      });
      toast.success(res.data.message || 'Evidence artifact submitted successfully to Evidence Graph.', 'Evidence Submitted');
      setNewEvidenceTitle('');
      setNewEvidenceUrl('');
      setNewEvidenceDesc('');
      await fetchProjectData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit evidence artifact.', 'Evidence Error');
    } finally {
      setSubmittingEvidence(false);
    }
  };

  // Provider submits milestone for AI review
  const handleSubmitMilestone = async (milestoneId: string) => {
    try {
      const res = await api.post(`/milestones/${milestoneId}/submit`);
      toast.info(res.data.message || 'Milestone submitted for Work DNA review and client decision.', 'Milestone Submitted');
      await fetchProjectData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit milestone for review.', 'Submission Error');
    }
  };

  // Client approves milestone
  const handleApproveMilestone = async () => {
    if (!selectedMilestone) return;
    try {
      const res = await api.post(`/milestones/${selectedMilestone.id}/approve`);
      toast.success(res.data.message || 'Milestone approved! PayPal checkout authorized.', 'Milestone Approved');
      await fetchProjectData();
      setIsPayPalModalOpen(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve milestone.', 'Approval Error');
    }
  };

  // Client requests revision
  const handleRequestRevision = async () => {
    if (!selectedMilestone) return;
    const notes = prompt('Enter revision feedback for provider:');
    if (!notes) return;
    try {
      const res = await api.post(`/milestones/${selectedMilestone.id}/request-revision`, { revisionNotes: notes });
      toast.warning(res.data.message || 'Milestone revision requested. Provider notified.', 'Revision Requested');
      await fetchProjectData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to request revision.', 'Revision Error');
    }
  };

  // Scope Drift test simulation
  const handleTestScopeDrift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequestText.trim() || !project) return;
    setDriftLoading(true);
    try {
      const res = await api.post(`/projects/${project.id}/change-requests`, {
        newRequestText,
      });
      toast.info(res.data.message || `Scope radar classified request: ${res.data.data?.changeRequest?.classification || 'Analyzed'}`, 'Scope Drift Radar');
      setNewRequestText('');
      await fetchProjectData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to evaluate scope change request.', 'Radar Error');
    } finally {
      setDriftLoading(false);
    }
  };

  // Accept project proposal handler
  const handleAcceptProject = async () => {
    if (!project) return;
    setAcceptingProject(true);
    try {
      const res = await api.post(`/projects/${project.id}/accept`);
      toast.success(res.data.message || 'Project proposal accepted! Status is now ACTIVE.', 'Project Activated');
      await fetchProjectData(false, false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to accept project proposal.', 'Acceptance Error');
    } finally {
      setAcceptingProject(false);
    }
  };

  // Open Edit Modal
  const openEditModal = () => {
    if (!project) return;
    setEditTitle(project.title);
    setEditDescription(project.description || '');
    setEditDeadline(project.deadline || '');
    setEditAmount(project.totalAmountMinor ? (project.totalAmountMinor / 100).toString() : '');
    setIsEditModalOpen(true);
  };

  // Submit Edit Project
  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    setUpdatingProject(true);
    try {
      const payload: any = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        deadline: editDeadline || undefined,
        totalAmountMinor: editAmount ? Math.round(Number(editAmount) * 100) : undefined,
      };
      const res = await api.put(`/projects/${project.id}`, payload);
      toast.success(res.data.message || 'Project updated successfully.', 'Project Updated');
      setIsEditModalOpen(false);
      await fetchProjectData(false, false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update project.', 'Update Error');
    } finally {
      setUpdatingProject(false);
    }
  };

  // Submit Delete Project
  const handleDeleteProject = async () => {
    if (!project) return;
    setDeletingProject(true);
    try {
      const res = await api.delete(`/projects/${project.id}`);
      toast.success(res.data.message || `Project "${project.title}" deleted successfully.`, 'Project Deleted');
      setIsDeleteModalOpen(false);
      navigate('/projects');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete project.', 'Delete Error');
    } finally {
      setDeletingProject(false);
    }
  };

  if (accessDenied) {
    return (
      <div className="py-12 max-w-2xl mx-auto space-y-6 text-center animate-fade-in">
        <div className="p-8 bg-slate-900/90 border border-rose-900/50 rounded-3xl space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-800/40 flex items-center justify-center mx-auto text-rose-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-white">Project Access Restricted (403 Forbidden)</h2>
            <p className="text-xs text-rose-300 font-mono">
              {accessDeniedMessage}
            </p>
            <p className="text-xs text-slate-400 pt-1">
              Logged in as <strong className="text-slate-200">{user?.name}</strong> ({user?.role} role). You are only authorized to view projects where you are the designated Client owner, an assigned Provider, or Platform Admin.
            </p>
          </div>

          {accessibleProjects.length > 0 ? (
            <div className="pt-4 border-t border-slate-800 space-y-3 text-left">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Your Accessible Workspaces ({accessibleProjects.length}):
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {accessibleProjects.map((p) => (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}`}
                    onClick={() => {
                      setAccessDenied(false);
                      setLoading(true);
                    }}
                    className="p-3 bg-slate-950 border border-slate-800 hover:border-indigo-600/50 rounded-xl flex items-center justify-between transition group"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition">
                        {p.title}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ID: {p.id} • Status: {p.status}
                      </div>
                    </div>
                    <div className="text-xs text-indigo-400 font-medium flex items-center gap-1">
                      <span>Open Cockpit</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="pt-2 text-xs text-slate-500">
              You currently have no project workspaces assigned.
            </div>
          )}

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/projects"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow transition"
            >
              Browse All Projects
            </Link>
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !project) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-xs text-slate-400">Loading project cockpit & cryptographic state from MongoDB Atlas...</p>
      </div>
    );
  }

  const latestAgreement = agreements[agreements.length - 1];

  const isPendingAcceptance = project.status === 'awaiting_approval' || project.status === 'draft';
  const isClientCreator = project.creatorRole === 'client' || (!project.creatorRole && project.ownerId === project.createdBy);
  const isProviderCreator = project.creatorRole === 'provider';
  const isOwner = project.ownerId === user?.id;
  const isCreator = project.createdBy === user?.id || isOwner;
  const isAssignedProvider = project.providerIds?.includes(user?.id || '') || (user?.role === 'provider');
  const canAcceptProject = isPendingAcceptance && (user?.role === 'admin' || isOwner || isCreator || isAssignedProvider || user?.role === 'client');

  const canEditOrDelete = isCreator || user?.role === 'admin';

  // Live calculated payment metrics from actual project milestones (including split payouts)
  const settledMinor = milestones
    .reduce((sum, m) => sum + (m.paidMinor || (m.status === 'PAID' ? m.amountMinor : 0)), 0);
  const settledDollars = (settledMinor / 100).toFixed(2);
  const agreedBudgetMinor = project.totalAmountMinor || blueprint?.totalBudgetMinor || 0;
  const agreedBudgetDollars = (agreedBudgetMinor / 100).toFixed(2);
  const paidMilestonesCount = milestones.filter(
    (m) => m.status === 'PAID' || (m.paidMinor && m.paidMinor >= m.amountMinor)
  ).length;

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Top Breadcrumbs & Identity Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <Link
            to="/projects"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-indigo-400" />
            <span>All Projects Directory</span>
          </Link>
          <span className="font-mono text-[11px] text-slate-500">ID: {project.id}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            {user?.role === 'admin'
              ? '🛡️ Platform Admin'
              : isCreator
              ? '👑 You Created This Project'
              : '🤝 Assigned Counterpart'}
          </span>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-700/40 text-[11px] text-emerald-300 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Atlas DB</span>
          </div>
        </div>
      </div>

      {/* Workspace Switcher Strip */}
      {allUserProjects.length > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0 pl-1">
              <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Switch Workspace:</span>
            </span>

            {allUserProjects.map((p) => {
              const isCurrent = p.id === project.id;
              return (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-500'
                      : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-200" />}
                  <span className="truncate max-w-[160px] sm:max-w-[200px]">{p.title}</span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase ${
                      isCurrent ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {p.status}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <Link
              to="/projects"
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-800/40 hover:bg-indigo-900/60 transition"
            >
              <span>All Projects ({allUserProjects.length})</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Project Hero Banner */}
      <div className="bg-[#111827] border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{project.title}</h1>
              <Badge
                variant={
                  project.status === 'active'
                    ? 'success'
                    : project.status === 'awaiting_approval'
                    ? 'warning'
                    : 'primary'
                }
              >
                {project.status === 'awaiting_approval' ? 'Awaiting Acceptance' : project.status}
              </Badge>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                Created by {isClientCreator ? 'Client' : isProviderCreator ? 'Provider' : 'Admin'}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              {project.description || 'No detailed scope description provided.'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {isPendingAcceptance && canAcceptProject && (
              <button
                onClick={handleAcceptProject}
                disabled={acceptingProject}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                title="Approve and activate this project"
              >
                {acceptingProject ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />}
                <span>Approve & Activate</span>
              </button>
            )}

            <button
              onClick={() => setTab('payment')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition border ${
                currentTab === 'payment'
                  ? 'bg-[#0070BA] text-white border-blue-400 shadow-md shadow-blue-900/30'
                  : 'bg-blue-600/20 hover:bg-blue-600/30 border-blue-500/40 text-blue-300'
              }`}
              title="Open Payment Profile & Escrow releases tab"
            >
              <CreditCard className="w-3.5 h-3.5 text-blue-400" />
              <span>Payment Profile</span>
            </button>

            {(user?.role === 'client' || user?.role === 'admin' || isOwner) && (
              <button
                onClick={handleOpenDirectPaymentModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold transition shadow-lg shadow-purple-900/40 border border-purple-400/30 hover:scale-[1.02]"
                title="Open payment modal to enter amount or full payout"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Make a Payment</span>
              </button>
            )}

            <button
              onClick={handleManualSync}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition shadow disabled:opacity-60"
              title="Synchronize cockpit data from MongoDB Atlas"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-indigo-400' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync Atlas'}</span>
            </button>

            {canEditOrDelete && (
              <>
                <button
                  onClick={openEditModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition"
                  title="Edit project details"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-xs font-semibold text-rose-300 transition"
                  title="Delete project"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Dynamic Acceptance Banner */}
        {isPendingAcceptance && (
          <div className="pt-2">
            {canAcceptProject ? (
              <div className="p-5 bg-gradient-to-r from-amber-950/50 via-indigo-950/40 to-emerald-950/50 border border-amber-500/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl animate-pulse">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                    <h4 className="text-sm font-bold text-white">Project Proposal Awaiting Your Acceptance</h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                    {isOwner
                      ? 'You are the project owner. Review the proposed deliverables and blueprint below. Click to approve and activate the project.'
                      : isClientCreator
                      ? 'The Client created this project and proposed the deliverables. Review the scope and click below to accept and activate the project.'
                      : 'The Provider submitted this project proposal. Accept the proposal to authorize deliverables and enable PayPal milestone releases.'}
                  </p>
                </div>
                <button
                  onClick={handleAcceptProject}
                  disabled={acceptingProject}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition shrink-0 disabled:opacity-50"
                >
                  {acceptingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                  <span>Accept & Activate Project</span>
                </button>
              </div>
            ) : (
              <div className="p-4 bg-slate-900/90 border border-amber-700/50 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-amber-300">Proposal Pending Counterpart Review</h5>
                    <p className="text-[11px] text-slate-400">
                      You created this project proposal. Waiting for the {isClientCreator ? 'assigned Provider' : 'Client owner'} to accept the terms before work begins.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-amber-950/80 text-amber-400 border border-amber-800/50 uppercase font-semibold shrink-0">
                  Pending Acceptance
                </span>
              </div>
            )}
          </div>
        )}

        {/* 4 KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5 uppercase tracking-wider font-medium">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Agreed Budget</span>
            </span>
            <div className="text-xl font-bold text-white font-mono">
              ${(((project.totalAmountMinor || blueprint?.totalBudgetMinor || 0) / 100)).toFixed(2)}{' '}
              <span className="text-xs text-slate-400 font-normal">{project.currency || 'USD'}</span>
            </div>
            <p className="text-[10px] text-slate-500">Human-confirmed amount</p>
          </div>

          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5 uppercase tracking-wider font-medium">
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                <span>PayPal Settled</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40 font-semibold">
                {paidMilestonesCount} of {milestones.length} Paid
              </span>
            </div>
            <div className="text-xl font-bold text-emerald-400 font-mono">
              ${settledDollars} <span className="text-xs text-slate-400 font-normal">{project.currency || 'USD'}</span>
            </div>
            <p className="text-[10px] text-emerald-400/80">
              {agreedBudgetMinor > 0
                ? `${Math.round((settledMinor / agreedBudgetMinor) * 100)}% of total budget released`
                : 'Sandbox capture verified'}
            </p>
          </div>

          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5 uppercase tracking-wider font-medium">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Target Delivery</span>
            </span>
            <div className="text-sm font-bold text-slate-200 font-mono truncate">
              {project.deadline || blueprint?.targetDeadline || 'Open Schedule'}
            </div>
            <p className="text-[10px] text-slate-500">Milestone timeline</p>
          </div>

          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5 uppercase tracking-wider font-medium">
              <Fingerprint className="w-3.5 h-3.5 text-purple-400" />
              <span>Contract Hash</span>
            </span>
            <div className="text-xs font-mono text-purple-300 truncate">
              {latestAgreement ? `${latestAgreement.snapshotHash.substring(0, 16)}...` : 'Pending Generation'}
            </div>
            <p className="text-[10px] text-slate-500">SHA-256 canonical fingerprint</p>
          </div>
        </div>

        {/* Quick PayPal Release Banner */}
        {selectedMilestone && selectedMilestone.status === 'APPROVED_FOR_PAYMENT' && (
          (user?.role === 'client' || user?.role === 'admin') ? (
            <div className="p-4 bg-[#0070BA]/15 border border-[#0070BA]/50 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-5 h-5 text-[#0070BA] shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-white">
                    Milestone "{selectedMilestone.title}" Approved for Payment (${(selectedMilestone.amountMinor / 100).toFixed(2)})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Deliverables verified. Ready to capture and release funds via PayPal Sandbox Orders v2.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPayPalModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0070BA] hover:bg-[#005ea6] text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-900/30 transition animate-bounce shrink-0"
              >
                <CreditCard className="w-4 h-4" />
                <span>Release PayPal Payout</span>
              </button>
            </div>
          ) : (
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-amber-300 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Approved by Client • Awaiting PayPal Release by Client</span>
            </div>
          )
        )}
      </div>

      {/* Primary Navigation Bar & Module Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold w-full sm:w-auto">
          <button
            onClick={() => setTab('milestones')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition shrink-0 ${
              currentTab === 'milestones'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Milestones Roadmap ({milestones.length})</span>
          </button>

          <button
            onClick={() => setTab('payment')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition shrink-0 ${
              currentTab === 'payment'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>Payment Profile & Escrow</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">
              ${settledDollars} Paid
            </span>
          </button>

          <button
            onClick={() => setTab('dna')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition shrink-0 ${
              currentTab === 'dna'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <GitMerge className="w-4 h-4" />
            <span>Work DNA Pipeline</span>
          </button>

          <button
            onClick={() => setTab('drift')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition shrink-0 ${
              currentTab === 'drift'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
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
            onClick={() => setTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition shrink-0 ${
              currentTab === 'audit'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Trust & Security Audit ({auditEvents.length})</span>
          </button>
        </div>

        {/* Quick Dropdown Module Switcher */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <span className="text-[11px] text-slate-500 font-mono hidden md:inline">Module:</span>
          <select
            value={currentTab}
            onChange={(e) => setTab(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="milestones">📋 Milestones Roadmap ({milestones.length})</option>
            <option value="payment">💳 Payment Profile & Escrow (${settledDollars} / ${agreedBudgetDollars})</option>
            <option value="dna">🧬 Work DNA Pipeline</option>
            <option value="drift">📡 Scope Drift Radar ({scopeRequests.length})</option>
            <option value="audit">🛡️ Trust & Security Audit ({auditEvents.length})</option>
          </select>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODULE 1: MILESTONES ROADMAP & INTEGRATED EVIDENCE HUB          */}
      {/* ============================================================== */}
      {currentTab === 'milestones' && (
        <div className="space-y-8 animate-fade-in">
          {/* Milestones Roadmap Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  <span>Project Deliverables & Milestones Roadmap</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Track progress, review submitted proof artifacts, and release authorized PayPal payments upon milestone approval.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl">
                {milestones.filter((m) => m.status === 'PAID').length} of {milestones.length} Settled
              </span>
            </div>

            {milestones.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {milestones.map((ms, idx) => {
                  const isPaid = ms.status === 'PAID' || (ms.paidMinor && ms.paidMinor >= ms.amountMinor);
                  const isPartiallyPaid = (ms.paidMinor && ms.paidMinor > 0 && ms.paidMinor < ms.amountMinor);
                  const isAwaiting = ms.status === 'AWAITING_CLIENT_DECISION';
                  const isApproved = ms.status === 'APPROVED_FOR_PAYMENT';
                  const isSelected = activeSelectedMilestone?.id === ms.id;
                  const totalDollars = (ms.amountMinor / 100).toFixed(2);
                  const paidMinor = ms.paidMinor || (ms.status === 'PAID' ? ms.amountMinor : 0);
                  const paidDollars = (paidMinor / 100).toFixed(2);
                  const remainingMinor = Math.max(0, ms.amountMinor - paidMinor);
                  const remainingDollars = (remainingMinor / 100).toFixed(2);
                  const percentPaid = ms.amountMinor > 0 ? Math.min(100, Math.round((paidMinor / ms.amountMinor) * 100)) : 0;

                  return (
                    <div
                      key={ms.id}
                      className={`p-6 rounded-2xl border transition text-left flex flex-col justify-between space-y-4 ${
                        isPaid
                          ? 'bg-emerald-950/20 border-emerald-800/60'
                          : isPartiallyPaid
                          ? 'bg-amber-950/20 border-amber-700/60'
                          : isAwaiting
                          ? 'bg-slate-900 border-indigo-500/80 shadow-lg shadow-indigo-500/10'
                          : isSelected
                          ? 'bg-slate-900 border-indigo-500/50'
                          : 'bg-slate-900/70 border-slate-800'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono text-slate-500">MILESTONE 0{idx + 1}</span>
                          <Badge
                            variant={
                              isPaid
                                ? 'success'
                                : isPartiallyPaid
                                ? 'warning'
                                : isAwaiting
                                ? 'ai'
                                : isApproved
                                ? 'paypal'
                                : 'neutral'
                            }
                          >
                            {isPartiallyPaid
                              ? `PARTIALLY PAID (${percentPaid}%)`
                              : ms.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <h3 className="text-base font-bold text-white">{ms.title}</h3>
                        <p className="text-xs text-slate-400">{ms.description}</p>

                        {/* Split Progress Bar */}
                        {ms.amountMinor > 0 && (
                          <div className="space-y-1 pt-1">
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                                style={{ width: `${percentPaid}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] font-mono text-slate-400">
                              <span>Paid: <strong className="text-emerald-400">${paidDollars}</strong></span>
                              <span>Remaining: <strong className="text-white">${remainingDollars}</strong></span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Payment reference if paid */}
                      {isPaid && (
                        <div className="p-3 bg-emerald-950/40 border border-emerald-700/50 rounded-xl font-mono text-xs text-emerald-300 space-y-1">
                          <div className="flex justify-between">
                            <span>PayPal Capture:</span>
                            <span className="font-bold">{ms.paypalCaptureId || 'VERIFIED'}</span>
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
                            ${totalDollars} <span className="text-xs text-slate-400 font-normal">{ms.currency}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => setSelectedMilestone(ms)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                              isSelected
                                ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/50'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            }`}
                          >
                            {isSelected ? '✓ Selected' : 'View Proof'}
                          </button>

                          {/* Pay / Split Payment Button for All Created Tasks */}
                          {!isPaid && (user?.role === 'client' || user?.role === 'admin' || isOwner) && (
                            <button
                              onClick={() => {
                                setSelectedMilestone(ms);
                                setIsPayPalModalOpen(true);
                              }}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
                              title="Enter custom or split payout amount"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Pay / Split</span>
                            </button>
                          )}

                          {ms.status === 'IN_PROGRESS' && user?.role === 'provider' && (
                            <button
                              onClick={() => {
                                setSelectedMilestone(ms);
                                handleSubmitMilestone(ms.id);
                              }}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
                            >
                              Submit Proof
                            </button>
                          )}

                          {isAwaiting && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {(user?.role === 'client' || user?.role === 'admin' || isOwner) && (
                                <button
                                  onClick={() => handleDirectMilestoneApprove(ms.id)}
                                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition shadow-md shadow-emerald-600/30 flex items-center gap-1"
                                  title="Approve deliverable and authorize PayPal release"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                              )}
                            </div>
                          )}

                          {isApproved && (
                            (user?.role === 'client' || user?.role === 'admin') ? (
                              <button
                                onClick={() => {
                                  setSelectedMilestone(ms);
                                  setIsPayPalModalOpen(true);
                                }}
                                className="px-4 py-2 bg-[#0070BA] hover:bg-[#005ea6] text-white text-xs font-bold rounded-lg transition shadow-lg shadow-blue-900/30"
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
            ) : (
              <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-2xl text-center space-y-3">
                <CreditCard className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-300">No Milestones Initialized Yet</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Milestones are established from the agreed Work DNA Blueprint. Inspect the Work DNA Pipeline to review proposed deliverables.
                </p>
                <button
                  onClick={() => setTab('dna')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
                >
                  View Work DNA Pipeline →
                </button>
              </div>
            )}
          </div>

          {/* Payment & Escrow Specifications Hub Card */}
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-bold text-white">Payment & Escrow Specifications</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                    Live Atlas Synced
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Escrow terms, PayPal Sandbox payer configuration, and billing credentials registered for this project.
                </p>
              </div>

              <button
                onClick={openPaymentDetailsModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>{project.paymentDetails?.payerEmail ? 'Edit Payment Details' : 'Configure Payment Details'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Authorized Payer</span>
                <p className="text-xs font-mono font-medium text-slate-200 truncate" title={project.paymentDetails?.payerEmail || 'Not configured'}>
                  {project.paymentDetails?.payerEmail || 'Not configured'}
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">PayPal Merchant ID</span>
                <p className="text-xs font-mono font-medium text-slate-200 truncate">
                  {project.paymentDetails?.paypalMerchantId || 'SANDBOX_MERCHANT_CLAU_2026'}
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Legal Billing Entity</span>
                <p className="text-xs font-medium text-slate-200 truncate">
                  {project.paymentDetails?.billingName || 'Not specified'}
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Payment Channel</span>
                <p className="text-xs font-medium text-emerald-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="capitalize">{project.paymentDetails?.paymentMethod?.replace('_', ' ') || 'PayPal Sandbox'}</span>
                </p>
              </div>
            </div>

            {project.paymentDetails?.escrowTerms && (
              <div className="p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl space-y-1 text-xs">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Escrow Release Policy:</span>
                <p className="text-slate-300 leading-relaxed">{project.paymentDetails.escrowTerms}</p>
              </div>
            )}
          </div>

          {/* Integrated Milestone Evidence & Verification Hub */}
          {activeSelectedMilestone && (
            <div className="pt-6 border-t border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                      Selected Milestone Verification Hub
                    </span>
                    <Badge variant="primary" size="sm">
                      {activeSelectedMilestone.title}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select any milestone below to inspect evidence artifacts, AI verification scorecards, and submit proof.
                  </p>
                </div>

                {/* Milestone Switcher Pills */}
                {milestones.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                    {milestones.map((m, i) => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMilestone(m)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                          activeSelectedMilestone.id === m.id
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                        }`}
                      >
                        <span>M0{i + 1}: {m.title.length > 16 ? m.title.substring(0, 16) + '...' : m.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Evidence Graph Component */}
              <EvidenceGraph
                milestone={activeSelectedMilestone}
                evidenceItems={evidenceItems}
                aiReview={aiReview}
                onApprove={handleApproveMilestone}
                onRequestRevision={handleRequestRevision}
                canApprove={user?.role === 'client' || user?.role === 'admin' || isOwner}
              />

              {/* Attach new proof form (for provider) */}
              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-200">
                    Submit Additional Proof Artifact for "{activeSelectedMilestone.title}"
                  </h4>
                  <span className="text-[11px] font-mono text-slate-500">Milestone ID: {activeSelectedMilestone.id}</span>
                </div>
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
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition disabled:opacity-50"
                    >
                      {submittingEvidence ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODULE: PAYMENT & ESCROW SETTLEMENTS                           */}
      {/* ============================================================== */}
      {currentTab === 'payment' && (
        <div className="space-y-4 animate-fade-in">
          {/* Minimal 3-Metric Financial Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-[10px] text-slate-500 uppercase font-mono font-bold block">
                Total Budget
              </span>
              <div className="text-xl font-bold font-mono text-white mt-1">
                ${agreedBudgetDollars} <span className="text-xs text-slate-400 font-normal">{project.currency || 'USD'}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-emerald-900/40 rounded-2xl bg-emerald-950/10">
              <span className="text-[10px] text-emerald-400 uppercase font-mono font-bold block">
                Released / Paid
              </span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                ${settledDollars} <span className="text-xs text-slate-400 font-normal">{project.currency || 'USD'}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-[10px] text-indigo-400 uppercase font-mono font-bold block">
                Remaining Due
              </span>
              <div className="text-xl font-bold font-mono text-white mt-1">
                ${((Math.max(0, agreedBudgetMinor - settledMinor)) / 100).toFixed(2)}{' '}
                <span className="text-xs text-slate-400 font-normal">{project.currency || 'USD'}</span>
              </div>
            </div>
          </div>

          {/* Minimal Payer Info Strip */}
          <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <CreditCard className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400">Payer:</span>
                <span className="font-mono font-semibold text-white">
                  {project.paymentDetails?.payerEmail || user?.email || 'Default Sandbox Payer'}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">Gateway:</span>
                <span className="text-emerald-400 font-semibold">PayPal Sandbox</span>
              </div>
            </div>

            <button
              onClick={openPaymentDetailsModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition self-start sm:self-auto"
            >
              <Pencil className="w-3 h-3" />
              <span>Edit Details</span>
            </button>
          </div>

          {/* Minimal Tasks Payments List */}
          <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3.5 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-400" />
                <span>Task Payments</span>
              </h3>
              {(user?.role === 'client' || user?.role === 'admin' || isOwner) && (
                <button
                  onClick={handleOpenDirectPaymentModal}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-purple-900/40 border border-purple-400/30"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Make a Payment</span>
                </button>
              )}
            </div>

            {milestones.length > 0 ? (
              <div className="divide-y divide-slate-800/80">
                {milestones.map((ms, idx) => {
                  const isPaid = ms.status === 'PAID' || (ms.paidMinor && ms.paidMinor >= ms.amountMinor);
                  const isPartiallyPaid = (ms.paidMinor && ms.paidMinor > 0 && ms.paidMinor < ms.amountMinor);
                  const totalMsDollars = (ms.amountMinor / 100).toFixed(2);
                  const paidMsMinor = ms.paidMinor || (ms.status === 'PAID' ? ms.amountMinor : 0);
                  const paidMsDollars = (paidMsMinor / 100).toFixed(2);
                  const remainingMsMinor = Math.max(0, ms.amountMinor - paidMsMinor);
                  const remainingMsDollars = (remainingMsMinor / 100).toFixed(2);

                  return (
                    <div
                      key={ms.id}
                      className="py-3.5 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">
                            0{idx + 1}
                          </span>
                          <h4 className="text-xs font-semibold text-white truncate">{ms.title}</h4>
                          <Badge
                            variant={
                              isPaid
                                ? 'success'
                                : isPartiallyPaid
                                ? 'warning'
                                : ms.status === 'APPROVED_FOR_PAYMENT'
                                ? 'paypal'
                                : 'neutral'
                            }
                            size="sm"
                          >
                            {isPaid ? 'PAID' : isPartiallyPaid ? 'PARTIAL' : ms.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                          <span>Budget: <strong className="text-slate-300">${totalMsDollars}</strong></span>
                          <span>Paid: <strong className="text-emerald-400">${paidMsDollars}</strong></span>
                          <span>Due: <strong className="text-white">${remainingMsDollars}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-800/60">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Paid</span>
                          </span>
                        ) : (
                          (user?.role === 'client' || user?.role === 'admin' || isOwner) && (
                            <button
                              onClick={() => {
                                setSelectedMilestone(ms);
                                setIsPayPalModalOpen(true);
                              }}
                              className="px-3.5 py-1.5 bg-gradient-to-r from-[#0070BA] to-blue-600 hover:from-[#005ea6] hover:to-blue-500 text-white text-xs font-semibold rounded-lg transition shadow-sm shadow-blue-900/30"
                            >
                              Pay
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                <p>No tasks initialized yet.</p>
                {(user?.role === 'client' || user?.role === 'admin' || isOwner) && (
                  <button
                    onClick={handleOpenDirectPaymentModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-purple-900/40 border border-purple-400/30"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Pay Escrow (${agreedBudgetDollars} USD)</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODULE 2: WORK DNA ENGINE & EXECUTION PIPELINE                 */}
      {/* ============================================================== */}
      {currentTab === 'dna' && (
        <div className="space-y-6 animate-fade-in">
          {/* Cryptographic Agreement Snapshot Banner if exists */}
          {latestAgreement && (
            <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="success">Agreement v{latestAgreement.version} Frozen</Badge>
                  <h3 className="text-sm font-bold text-white">Tamper-Evident Contract Baseline</h3>
                </div>
                <div className="font-mono text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                  <span className="text-slate-400">SHA-256 Fingerprint:</span>
                  <span className="text-indigo-300 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {latestAgreement.snapshotHash}
                  </span>
                </div>
              </div>
              <div className="text-right font-mono text-xs shrink-0">
                <span className="text-slate-400 block text-[10px]">Agreed Total Budget:</span>
                <span className="text-base font-bold text-emerald-400">
                  ${(latestAgreement.totalAmountMinor / 100).toFixed(2)} {latestAgreement.currency}
                </span>
              </div>
            </div>
          )}

          {/* Interactive Work DNA Pipeline & Deep Analysis Visualizer */}
          <WorkflowVisualizer blueprint={blueprint} project={project} />
        </div>
      )}

      {/* ============================================================== */}
      {/* MODULE 3: SCOPE DRIFT RADAR                                    */}
      {/* ============================================================== */}
      {currentTab === 'drift' && (
        <div className="space-y-6 animate-fade-in">
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
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
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
            {scopeRequests.length === 0 && (
              <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-2xl text-center space-y-2">
                <Radio className="w-6 h-6 text-slate-600 mx-auto" />
                <h5 className="text-xs font-bold text-slate-300">No Scope Drift Detected</h5>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  All work activities remain aligned with the frozen baseline. Use the scanner above to evaluate any proposed additions.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODULE 4: TRUST, SECURITY & CRYPTOGRAPHIC AUDIT               */}
      {/* ============================================================== */}
      {currentTab === 'audit' && (
        <div className="space-y-6 animate-fade-in">
          {/* Cryptographic Contract Verification */}
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Cryptographic Trust & Contract Verification</h3>
              </div>
              <Badge variant="success">SHA-256 Verified</Badge>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every milestone submission, review outcome, scope amendment, and PayPal sandbox release produces an immutable cryptographic hash. The SHA-256 agreement baseline guarantees tamper-evident compliance.
            </p>
            {latestAgreement && (
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs space-y-1 text-slate-400">
                <div className="flex justify-between">
                  <span>Canonical Fingerprint:</span>
                  <span className="text-indigo-400 font-bold">{latestAgreement.snapshotHash}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dual Approval Status:</span>
                  <span className="text-emerald-400 font-bold">MUTUALLY SIGNED</span>
                </div>
              </div>
            )}
          </div>

          {/* Automated System Verification & Artifact Inspector */}
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <GitPullRequest className="w-5 h-5 text-blue-400" />
              <h3 className="text-base font-bold text-white">System Verification & Artifact Inspector</h3>
              <Badge variant="primary">Automated Auditor</Badge>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automated runtime inspections and cryptographic validation reports are captured as verifiable work artifacts for contract compliance.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-slate-200">Observed Runtime Behaviors</h4>
                <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                  <li>Client JWT Bearer tokens validated on each authenticated endpoint.</li>
                  <li>PayPal sandbox order creation triggered on milestone approval.</li>
                  <li>Server-side capture verification confirms HTTP 200 COMPLETED.</li>
                  <li>Audit timeline events logged with immutable SHA-256 hash proofs.</li>
                </ul>
              </div>

              <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-slate-200">Discovered API Endpoints & Functions</h4>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="p-1.5 bg-slate-900 rounded border border-slate-800 text-indigo-300">
                    POST /api/payments/milestones/:id/create-order
                  </div>
                  <div className="p-1.5 bg-slate-900 rounded border border-slate-800 text-emerald-300">
                    POST /api/payments/:id/capture
                  </div>
                  <div className="p-1.5 bg-slate-900 rounded border border-slate-800 text-purple-300">
                    POST /api/ai/analyse-evidence
                  </div>
                  <div className="p-1.5 bg-slate-900 rounded border border-slate-800 text-amber-300">
                    POST /api/projects/:id/change-requests
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cryptographic Append-Only Audit Trail */}
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-400" />
                  <span>Append-Only Cryptographic Audit Trail</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Chronological recording of all agreement snapshots, evidence submissions, reviews, and PayPal capture events.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                {auditEvents.length} Events Logged
              </span>
            </div>

            <div className="space-y-4">
              {auditPagination.visibleItems.map((ev) => (
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
              {auditEvents.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-500 font-mono">
                  No cryptographic audit events recorded yet for this project.
                </div>
              )}
            </div>

            {/* Audit Events Scroll Pagination Footer */}
            {auditEvents.length > 0 && (
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-slate-400 font-mono">
                  Page {auditPagination.currentPage} of {auditPagination.totalPages} • Showing{' '}
                  {auditPagination.visibleItems.length} / {auditEvents.length} events
                </span>

                {auditPagination.hasMore ? (
                  <button
                    onClick={() => auditPagination.loadMore()}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold rounded-xl border border-slate-700 transition"
                  >
                    <span>Scroll down or click to load more audit events</span>
                    <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
                  </button>
                ) : (
                  <span className="text-slate-500 font-mono text-[11px]">All audit events loaded</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PayPal Sandbox Checkout Modal */}
      {selectedMilestone && (
        <PayPalModal
          isOpen={isPayPalModalOpen}
          onClose={() => setIsPayPalModalOpen(false)}
          milestone={selectedMilestone}
          milestonesList={milestones}
          fullProjectAmountDollars={agreedBudgetDollars}
          onSelectMilestone={(ms) => setSelectedMilestone(ms)}
          onPaymentSuccess={fetchProjectData}
        />
      )}

      {/* Edit Project Modal */}
      {project && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Project Blueprint & Details"
          subtitle={`Modifying project ${project.id}. Only authorized creators can apply changes.`}
          maxWidth="lg"
        >
          <form onSubmit={handleUpdateProject} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Project Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Scope & Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Deadline</label>
                <input
                  type="date"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Total Agreed Budget ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="e.g. 2500.00"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updatingProject}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {updatingProject && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Project Confirmation Modal */}
      {project && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Project Workspace"
          subtitle="Are you sure you want to delete this project?"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 space-y-2">
              <p className="font-semibold">⚠️ Deleting Project "{project.title}"</p>
              <p className="text-slate-400">
                This project will be removed from your active workspaces. Historical cryptographic audit trails and agreement proofs are securely preserved in the live database for compliance.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={deletingProject}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {deletingProject && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Deletion</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Payment Details Modal */}
      {project && (
        <Modal
          isOpen={isPaymentDetailsModalOpen}
          onClose={() => setIsPaymentDetailsModalOpen(false)}
          title="Payment & Escrow Specifications"
          subtitle="Configure PayPal sandbox billing and milestone escrow policies stored directly in MongoDB Atlas."
          maxWidth="lg"
        >
          <form onSubmit={handleSavePaymentDetails} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Authorized Payer Email (PayPal Sandbox) *
                </label>
                <input
                  type="email"
                  value={payerEmail}
                  onChange={(e) => setPayerEmail(e.target.value)}
                  placeholder="payer-sandbox@clausora.dev"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  PayPal Merchant ID / Facilitator Account
                </label>
                <input
                  type="text"
                  value={paypalMerchantId}
                  onChange={(e) => setPaypalMerchantId(e.target.value)}
                  placeholder="SANDBOX_MERCHANT_CLAU_2026"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Legal Billing Name / Entity
                </label>
                <input
                  type="text"
                  value={billingName}
                  onChange={(e) => setBillingName(e.target.value)}
                  placeholder="Acme Technologies Inc."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tax Identification / VAT Number
                </label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="e.g. US-82-4910284"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="paypal_sandbox">PayPal Sandbox Orders v2 (Escrow Verified)</option>
                  <option value="credit_card">Credit / Debit Card (via PayPal Gateway)</option>
                  <option value="bank_wire">Direct Wire Transfer (Manual Reconciliation)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Registered Billing Address
                </label>
                <input
                  type="text"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="100 Innovation Way, Suite 500, Austin, TX"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Escrow Release Terms & Criteria
              </label>
              <textarea
                rows={3}
                value={escrowTerms}
                onChange={(e) => setEscrowTerms(e.target.value)}
                placeholder="e.g. Funds are securely captured into escrow and only released when the Client verifies and approves deliverable test runs."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Payout Notes / Special Instructions
              </label>
              <input
                type="text"
                value={payoutNotes}
                onChange={(e) => setPayoutNotes(e.target.value)}
                placeholder="e.g. Include invoice number in payment memo."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsPaymentDetailsModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingPaymentDetails}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 shadow-lg shadow-emerald-600/30"
              >
                {savingPaymentDetails && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Payment Specifications</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

