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
import { LogoIcon } from '../components/common/Logo';
import { EvidenceGraph } from '../components/evidence/EvidenceGraph';
import { MultiAgentCouncilView } from '../components/evidence/MultiAgentCouncilView';
import { ProjectCopilotDrawer } from '../components/copilot/ProjectCopilotDrawer';
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
  Lock,
  AlertCircle,
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
  const [projectEvidence, setProjectEvidence] = useState<EvidenceItem[]>([]);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isSubmitProofModalOpen, setIsSubmitProofModalOpen] = useState(false);
  const [proofTargetMilestone, setProofTargetMilestone] = useState<Milestone | null>(null);
  const [proofTitle, setProofTitle] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [proofDesc, setProofDesc] = useState('');
  const [submittingProof, setSubmittingProof] = useState(false);

  // New Task Modal state
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskHours, setNewTaskHours] = useState('16');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [newTaskDeliverable, setNewTaskDeliverable] = useState('');
  const [newTaskMilestoneMode, setNewTaskMilestoneMode] = useState<'dedicated' | 'existing'>('dedicated');
  const [selectedTargetMilestoneId, setSelectedTargetMilestoneId] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);
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

  // Close project state
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closingProject, setClosingProject] = useState(false);

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
      toast.success(res.data.message || 'Payment and escrow details saved successfully.', 'Payment Details');
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
          res.data.message || `Project Workspace synchronized: "${pData.title}"`,
          'Workspace Synced'
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

      // Fetch all evidence items across the project (Newest First)
      try {
        const allEviRes = await api.get(`/projects/${pId}/evidence`);
        const evList = allEviRes.data.data?.evidence || [];
        evList.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setProjectEvidence(evList);
      } catch {
        // ignore
      }

      // Fetch scope drift requests (Newest First)
      try {
        const scRes = await api.get(`/projects/${pId}/change-requests`);
        const scList = scRes.data.data?.changeRequests || [];
        scList.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setScopeRequests(scList);
      } catch {
        // ignore
      }

      // Fetch audit events (Newest First)
      try {
        const actRes = await api.get(`/projects/${pId}/activity`);
        const evEvents = actRes.data.data?.events || [];
        evEvents.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setAuditEvents(evEvents);
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

  // Provider submits deliverable work proof via dedicated modal
  const openSubmitProofModal = (ms: Milestone) => {
    setProofTargetMilestone(ms);
    setProofTitle(`${ms.title} - Work Proof`);
    setProofUrl('');
    setProofDesc('');
    setIsSubmitProofModalOpen(true);
  };

  const handleSubmitProofModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofTargetMilestone || !proofTitle.trim() || !proofUrl.trim()) return;
    setSubmittingProof(true);
    try {
      const res = await api.post(`/milestones/${proofTargetMilestone.id}/evidence`, {
        title: proofTitle.trim(),
        description: proofDesc.trim(),
        urlOrContent: proofUrl.trim(),
        type: proofUrl.includes('github') ? 'repository' : 'url',
      });
      toast.success(
        res.data?.message || 'Work proof submitted successfully! Client payment is now unlocked.',
        'Work Proof Submitted'
      );
      setIsSubmitProofModalOpen(false);
      setProofTitle('');
      setProofUrl('');
      setProofDesc('');
      await fetchProjectData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit work proof.', 'Proof Error');
    } finally {
      setSubmittingProof(false);
    }
  };

  // Create new task and correctly place/calculate milestone based on task progress
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !projectId) return;
    setCreatingTask(true);
    try {
      const res = await api.post(`/projects/${projectId}/tasks`, {
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim() || newTaskTitle.trim(),
        estimatedEffortHours: Number(newTaskHours) || 16,
        priority: newTaskPriority,
        deliverable: newTaskDeliverable.trim() || newTaskTitle.trim(),
        createDedicatedMilestone: newTaskMilestoneMode === 'dedicated',
        targetMilestoneId: newTaskMilestoneMode === 'existing' ? selectedTargetMilestoneId : undefined,
      });
      toast.success(
        res.data?.message || 'Task and milestone created successfully based on task effort!',
        'Task & Milestone Created'
      );
      setIsAddTaskModalOpen(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskHours('16');
      setNewTaskDeliverable('');
      await fetchProjectData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create task.', 'Task Creation Error');
    } finally {
      setCreatingTask(false);
    }
  };

  // Update task status and synchronize milestone progress
  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    if (!projectId) return;
    try {
      const res = await api.patch(`/projects/${projectId}/tasks/${taskId}`, {
        status: newStatus,
      });
      toast.success(
        res.data?.message || `Task progress updated to ${newStatus}. Milestone synced!`,
        'Task Progress Updated'
      );
      await fetchProjectData();
    } catch (err: any) {
      const reason = err.response?.data?.reason || err.response?.data?.message || 'Failed to update task progress.';
      toast.error(reason, 'Status Change Blocked');
    }
  };

  // Provider submits milestone for AI review
  const handleSubmitMilestone = async (milestoneId: string) => {
    try {
      const res = await api.post(`/milestones/${milestoneId}/submit`);
      toast.info(res.data.message || 'Milestone submitted for Work DNA review and client decision.', 'Milestone Submitted');
      await fetchProjectData();
    } catch (err: any) {
      const reason = err.response?.data?.reason || err.response?.data?.message || 'Failed to submit milestone for review.';
      toast.error(reason, 'Submission Blocked');
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
      const reason = err.response?.data?.reason || err.response?.data?.message || 'Failed to approve milestone.';
      toast.error(reason, 'Approval Blocked');
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

  // Close project handler after full payment settlement
  const handleCloseProject = async () => {
    if (!project) return;
    setClosingProject(true);
    try {
      const res = await api.post(`/projects/${project.id}/close`);
      toast.success(res.data.message || 'Project successfully closed and finalized!', 'Project Closed');
      await fetchProjectData(false, false);
      setIsCloseModalOpen(false);
      window.dispatchEvent(new Event('clausora:project-updated'));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to close project.', 'Closure Error');
    } finally {
      setClosingProject(false);
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
        <p className="text-xs text-slate-400">Loading project workspace & verified state...</p>
      </div>
    );
  }

  const latestAgreement = agreements[agreements.length - 1];

  const isPendingAcceptance = project.status === 'awaiting_approval' || project.status === 'draft';
  const isOwner = project.ownerId === user?.id;
  const isCreator = project.createdBy === user?.id || (!project.createdBy && isOwner);
  const isClientCreator = project.creatorRole === 'client' || (!project.creatorRole && project.ownerId === project.createdBy);
  const isProviderCreator = project.creatorRole === 'provider' || (!isClientCreator && project.createdBy !== project.ownerId);

  // Strictly enforce bilateral counterpart rule:
  // The creator CANNOT approve their own proposal!
  // Opponent must review and activate:
  // - If client-created: assigned provider must accept
  // - If provider-created: client owner must accept
  const isOpponentProvider = isClientCreator && !isCreator && (user?.role === 'provider' || project.providerIds?.includes(user?.id || '') || project.assignedProviderId === user?.id);
  const isOpponentClient = isProviderCreator && !isCreator && (isOwner || user?.role === 'client');
  const canAcceptProject = isPendingAcceptance && !isCreator && (user?.role === 'admin' || isOpponentProvider || isOpponentClient);

  const canEditOrDelete = isCreator || user?.role === 'admin';

  // Live calculated payment metrics from actual project milestones (including split payouts)
  const settledMinorFromMilestones = milestones
    .reduce((sum, m) => sum + (m.paidMinor || (m.status === 'PAID' ? m.amountMinor : 0)), 0);
  const settledMinor = Math.max(settledMinorFromMilestones, project?.settledAmountMinor || 0);
  const settledDollars = (settledMinor / 100).toFixed(2);
  const agreedBudgetMinor = project.totalAmountMinor || blueprint?.totalBudgetMinor || 0;
  const agreedBudgetDollars = (agreedBudgetMinor / 100).toFixed(2);
  const paidMilestonesCount = milestones.filter(
    (m) => m.status === 'PAID' || (m.paidMinor && m.paidMinor >= m.amountMinor)
  ).length;

  const isProjectClosed = project?.status === 'completed' || (project?.status as string) === 'closed';
  const isFullyPaid =
    (agreedBudgetMinor > 0 && settledMinor >= agreedBudgetMinor) ||
    (milestones.length > 0 && milestones.every((m) => m.status === 'PAID' || (m.paidMinor && m.paidMinor >= m.amountMinor)));

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
              : isOwner
              ? `👑 ${user?.name || 'Client Owner'}`
              : isCreator
              ? `👑 ${user?.name || 'Project Creator'}`
              : '🤝 Assigned Counterpart'}
          </span>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-700/40 text-[11px] text-emerald-300 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active & Verified</span>
          </div>
        </div>
      </div>

      {/* Project Hero Banner */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-4 shadow-2xl relative overflow-hidden">
        {/* Title & Status Badge Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            {project.title}
          </h1>
          <Badge
            variant={
              project.status === 'active'
                ? 'success'
                : project.status === 'awaiting_approval'
                ? 'warning'
                : project.status === 'completed'
                ? 'success'
                : 'primary'
            }
          >
            {project.status === 'awaiting_approval' ? 'Awaiting Acceptance' : project.status}
          </Badge>
        </div>

        {/* Action Buttons Row (Placed directly below title) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Ask Clausora AI Agent Button (Directly near project title with Clausora Logo) */}
          <button
            onClick={() => setIsCopilotOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition shadow-lg shadow-cyan-950/60 border border-cyan-400/50 hover:scale-[1.02] active:scale-95 cursor-pointer tracking-wide"
            title="Ask Clausora AI Agent: Take actions, check deadlines, tech stack, milestones, or payments"
          >
            <LogoIcon className="w-4 h-4 shrink-0 drop-shadow" />
            <span>Ask Clausora AI</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
          </button>

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

          {isFullyPaid && !isProjectClosed && (
            <button
              onClick={() => setIsCloseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-900/40 border border-emerald-400/40 hover:scale-[1.02]"
              title="All milestone payments settled. Close and finalize this project."
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Close Project</span>
            </button>
          )}

          {isProjectClosed && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 text-xs font-bold font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Project Completed & Closed</span>
            </div>
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

          {(user?.role === 'client' || user?.role === 'admin' || isOwner) && !isProjectClosed && !isFullyPaid && (
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
            title="Synchronize project workspace data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Data'}</span>
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

        {/* Stakeholder Identity Badges & Scope Description */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center gap-1.5">
              <span className="text-slate-400 font-normal">Owner:</span>
              <strong className="text-white font-semibold">
                {project.ownerName || project.clientName || project.paymentDetails?.billingName || (isOwner ? user?.name : 'Client')}
              </strong>
              <span className="text-[10px] text-slate-400 font-normal">
                ({isClientCreator ? 'Client' : isProviderCreator ? 'Provider' : 'Client'})
              </span>
            </span>

            <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-800/50 text-purple-200 flex items-center gap-1.5">
              <span className="text-purple-400 font-normal">Assigned Provider:</span>
              <strong className="text-white font-semibold">
                {project.assignedProviderName || 'Alex Rivera (Rivera Tech)'}
              </strong>
              <span className="text-[10px] text-purple-400 font-normal">(Provider)</span>
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 max-w-4xl leading-relaxed">
            {project.description || 'No detailed scope description provided.'}
          </p>
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
                    {isOpponentClient
                      ? 'The Provider submitted this project proposal. Review the deliverables and blueprint below, then click to approve and activate the project.'
                      : 'The Client created this project and proposed the deliverables. Review the scope and click below to accept and activate the project as the assigned Provider.'}
                  </p>
                </div>
                <button
                  onClick={handleAcceptProject}
                  disabled={acceptingProject}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition shrink-0 disabled:opacity-50 hover:scale-[1.02]"
                >
                  {acceptingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                  <span>Accept & Activate Project</span>
                </button>
              </div>
            ) : (
              <div className="p-4 bg-slate-900/90 border border-amber-700/50 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0">
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-amber-300">Proposal Pending Counterpart Review & Acceptance</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      You created this project proposal. To preserve bilateral integrity, the opponent {isClientCreator ? 'assigned Provider' : 'Client owner'} must review and accept the scope to activate the project.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-3 py-1.5 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-700/60 uppercase font-bold tracking-wider shrink-0 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Awaiting Opponent Acceptance
                </span>
              </div>
            )}
          </div>
        )}

        {/* Full Settlement Ready-to-Close Banner */}
        {isFullyPaid && !isProjectClosed && (
          <div className="pt-2">
            <div className="p-5 bg-gradient-to-r from-emerald-950/60 via-teal-950/50 to-slate-900 border border-emerald-500/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <h4 className="text-sm font-bold text-white">Full Escrow Payment Settled (100%)</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold uppercase">
                    Ready to Close
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                  All project milestones have been fully paid (${settledDollars} USD). Every deliverable proof has been inspected and settled. You can now officially close and finalize this project.
                </p>
              </div>
              <button
                onClick={() => setIsCloseModalOpen(true)}
                disabled={closingProject}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition shrink-0 hover:scale-[1.02]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Close Project</span>
              </button>
            </div>
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
                              {(user?.role === 'client' || user?.role === 'admin' || isOwner) && !isProjectClosed && !isFullyPaid && (
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
                    Escrow Verified
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

              {/* Multi-Agent Deliverable Review Council (The AI Jury) */}
              <MultiAgentCouncilView
                milestone={activeSelectedMilestone}
                evidenceItems={evidenceItems}
                onReviewUpdated={(newReview) => {
                  (activeSelectedMilestone as any).councilReview = newReview;
                }}
              />

              {/* Evidence Graph Component */}
              <EvidenceGraph
                milestone={activeSelectedMilestone}
                evidenceItems={evidenceItems}
                aiReview={aiReview}
                onApprove={handleApproveMilestone}
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
          {/* Pending Acceptance Notice */}
          {isPendingAcceptance && (
            <div className="p-4 bg-amber-950/40 border border-amber-600/50 rounded-2xl flex items-center gap-3 text-amber-300 text-xs shadow-md">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold block text-amber-200">Escrow Payouts Locked: Proposal Pending Counterpart Acceptance</span>
                <span className="text-[11px] text-amber-300/80 mt-0.5 block">
                  This project proposal must be reviewed and accepted by the opponent {isClientCreator ? 'assigned Provider' : 'Client owner'} before escrow funds and PayPal checkout can be authorized.
                </span>
              </div>
            </div>
          )}

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

          {/* Project Escrow & Direct Settlement Card */}
          <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>Project Escrow Settlement</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Direct escrow payouts with verified PayPal Sandbox integration and audit logging.
                </p>
              </div>

              {(user?.role === 'client' || user?.role === 'admin' || isOwner) && !isProjectClosed && !isFullyPaid && (
                <button
                  onClick={handleOpenDirectPaymentModal}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-purple-900/40 border border-purple-400/30 self-start sm:self-auto hover:scale-[1.02]"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Make a Payment</span>
                </button>
              )}
            </div>

            {/* Escrow Release Progress Bar */}
            <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Escrow Release Progress</span>
                <span className="font-mono font-bold text-emerald-400">
                  ${settledDollars} of ${agreedBudgetDollars} {project.currency || 'USD'} Released ({agreedBudgetMinor > 0 ? Math.min(100, Math.round((settledMinor / agreedBudgetMinor) * 100)) : 0}%)
                </span>
              </div>
              <div className="w-full bg-slate-800/90 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${agreedBudgetMinor > 0 ? Math.min(100, Math.round((settledMinor / agreedBudgetMinor) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* 3 Value Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-950/50 border border-slate-800/60 rounded-xl space-y-1">
                <div className="text-[10px] uppercase font-mono font-bold text-slate-500">Escrow Security</div>
                <div className="text-slate-300 font-medium">Deterministic Payouts</div>
                <p className="text-[11px] text-slate-500">Funds released strictly upon human authorization.</p>
              </div>

              <div className="p-3 bg-slate-950/50 border border-slate-800/60 rounded-xl space-y-1">
                <div className="text-[10px] uppercase font-mono font-bold text-slate-500">Gateway</div>
                <div className="text-slate-300 font-medium">PayPal Orders v2</div>
                <p className="text-[11px] text-slate-500">Direct sandbox settlement with instant verification.</p>
              </div>

              <div className="p-3 bg-slate-950/50 border border-slate-800/60 rounded-xl space-y-1">
                <div className="text-[10px] uppercase font-mono font-bold text-slate-500">Audit Proofs</div>
                <div className="text-slate-300 font-medium">Immutable Hash</div>
                <p className="text-[11px] text-slate-500">Every release produces a SHA-256 compliance record.</p>
              </div>
            </div>
          </div>

          {/* Milestone Deliverables Calculated from Task Content */}
          <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Milestone Releases (Calculated from Task Content)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Milestone allocations are calculated directly from blueprint task effort. Work proof must be submitted by the assigned provider before payment can be authorized.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-800/50 text-purple-200 flex items-center gap-1.5">
                  <span className="text-purple-400">Assigned Provider:</span>
                  <strong className="text-white font-semibold">{project.assignedProviderName || 'Alex Rivera (Rivera Tech)'}</strong>
                </span>

                <button
                  onClick={() => setIsAddTaskModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition shadow-md shadow-indigo-900/30 hover:scale-[1.02]"
                  title="Create new project task with proportional milestone calculation"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Task</span>
                </button>
              </div>
            </div>

            {/* List of Milestones */}
            <div className="space-y-3">
              {milestones.map((ms, idx) => {
                const msEvidence = projectEvidence.filter((e) => e.milestoneId === ms.id);
                const hasProof =
                  msEvidence.length > 0 ||
                  ms.status === 'SUBMITTED' ||
                  ms.status === 'APPROVED_FOR_PAYMENT' ||
                  ms.status === 'PAID';
                const isPaid = ms.status === 'PAID' || (ms.paidMinor && ms.paidMinor >= ms.amountMinor);
                const msDollars = (ms.amountMinor / 100).toFixed(2);
                const msPaidDollars = ((ms.paidMinor || (isPaid ? ms.amountMinor : 0)) / 100).toFixed(2);

                // Find matching workstream tasks if available
                const matchingWs = blueprint?.workstreams?.[idx];
                const wsTasks = matchingWs?.tasks || [];

                // Calculate progress based on tasks
                const taskProgress = ms.progressPercent !== undefined
                  ? ms.progressPercent
                  : (isPaid ? 100 : hasProof ? 80 : wsTasks.length > 0 ? Math.round(wsTasks.reduce((acc, t) => acc + (t.status === 'done' ? 100 : t.status === 'submitted' ? 80 : t.status === 'in_progress' ? 50 : 0), 0) / wsTasks.length) : 35);

                return (
                  <div
                    key={ms.id}
                    className={`p-4 rounded-xl border transition ${
                      isPaid
                        ? 'bg-slate-950/50 border-emerald-900/40'
                        : hasProof
                        ? 'bg-slate-950/80 border-slate-700/80'
                        : 'bg-slate-950/60 border-amber-900/30'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-indigo-400">
                            Phase {idx + 1}
                          </span>
                          <h4 className="text-sm font-semibold text-white truncate max-w-lg">
                            {ms.title}
                          </h4>

                          {/* Status Badge */}
                          {isPaid ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700/50 text-emerald-300 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              Paid & Released (${msPaidDollars})
                            </span>
                          ) : hasProof ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-950 border border-teal-700/50 text-teal-300 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-teal-400" />
                              Proof Submitted ({msEvidence.length} artifact{msEvidence.length !== 1 ? 's' : ''})
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-700/60 text-amber-300 font-semibold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-amber-400" />
                              Proof Required Before Payment
                            </span>
                          )}
                        </div>

                        {/* Task Progress Bar & Progress Indicator */}
                        <div className="space-y-1 pt-0.5 max-w-md">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3 text-indigo-400" />
                              <span>Task Progress</span>
                            </span>
                            <span className="font-mono font-bold text-indigo-300">
                              {taskProgress}% {taskProgress === 100 ? '• Done' : taskProgress >= 80 ? '• Submitted' : taskProgress >= 50 ? '• In Progress' : '• Pending'}
                            </span>
                          </div>
                          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800/80">
                            <div
                              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                              style={{ width: `${taskProgress}%` }}
                            />
                          </div>
                        </div>

                        {/* Task Content Breakdown with Interactive Status Dropdown */}
                        <div className="text-xs text-slate-300 space-y-1.5 pt-1">
                          {wsTasks.length > 0 ? (
                            <div className="flex flex-wrap gap-2 items-center">
                              <span className="text-[11px] text-slate-400 font-medium">Included Tasks:</span>
                              {wsTasks.map((t) => (
                                <div
                                  key={t.id}
                                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200"
                                >
                                  <span className="font-mono text-[10px] text-indigo-400 font-bold">{t.id}</span>
                                  <span className="text-[11px] text-slate-300 truncate max-w-[140px]" title={t.title}>
                                    {t.title}
                                  </span>
                                  <span className="text-[9px] text-slate-500 font-mono">
                                    {t.estimatedEffortHours ? `${t.estimatedEffortHours}h` : ''}
                                  </span>
                                  <select
                                    value={t.status || 'todo'}
                                    disabled={isProjectClosed || ms.status === 'PAID' || isPendingAcceptance}
                                    onChange={(e) => handleUpdateTaskStatus(t.id, e.target.value)}
                                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-teal-300 font-semibold focus:outline-none transition ${
                                      isProjectClosed || ms.status === 'PAID' || isPendingAcceptance
                                        ? 'opacity-60 cursor-not-allowed text-slate-500'
                                        : 'cursor-pointer hover:border-slate-500'
                                    }`}
                                    title={
                                      isProjectClosed
                                        ? 'Status locked: Project is completed and closed.'
                                        : ms.status === 'PAID'
                                        ? 'Status locked: Associated deliverable milestone is already paid and settled.'
                                        : isPendingAcceptance
                                        ? 'Status locked: Project proposal must be accepted and activated first.'
                                        : 'Update task progress (synchronizes milestone)'
                                    }
                                  >
                                    <option value="todo">Todo (0%)</option>
                                    <option value="in_progress">In Progress (50%)</option>
                                    <option value="submitted">Submitted (80%)</option>
                                    <option value="done">Done (100%)</option>
                                  </select>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 truncate max-w-2xl">
                              {ms.description}
                            </p>
                          )}
                        </div>

                        {/* Submitted Proof Display if any */}
                        {msEvidence.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px]">
                            <span className="text-slate-400 font-medium">Verified Proof:</span>
                            {msEvidence.map((evi) => (
                              <a
                                key={evi.id}
                                href={evi.urlOrContent}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-950/70 border border-indigo-800/40 text-indigo-300 hover:text-white transition font-mono"
                              >
                                <span>{evi.title}</span>
                                <ExternalLink className="w-3 h-3 text-indigo-400" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: Allocation Amount & Action Buttons */}
                      <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
                        <div className="text-right">
                          <span className="text-[9px] uppercase font-mono text-slate-400 block font-semibold">
                            Deliverable Value
                          </span>
                          <span className="text-base font-bold font-mono text-white">
                            ${msDollars} <span className="text-[10px] text-slate-400 font-normal">{ms.currency || 'USD'}</span>
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          {/* Provider Action: Submit Work Proof */}
                          {!isPaid && (
                            <button
                              onClick={() => openSubmitProofModal(ms)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
                              title="Provider: Submit or update proof artifact for this deliverable"
                            >
                              <FileText className="w-3.5 h-3.5 text-purple-400" />
                              <span>{hasProof ? 'Add More Proof' : 'Submit Work Proof'}</span>
                            </button>
                          )}

                          {/* Client Action: Make Payment / Release Escrow */}
                          {!isPaid && (
                            (user?.role === 'client' || user?.role === 'admin' || isOwner) ? (
                              hasProof ? (
                                <button
                                  onClick={() => {
                                    setSelectedMilestone(ms);
                                    setIsPayPalModalOpen(true);
                                  }}
                                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-900/40 transition hover:scale-[1.02]"
                                  title="Release escrow payment for this verified deliverable"
                                >
                                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                                  <span>Pay Deliverable (${msDollars})</span>
                                </button>
                              ) : (
                                <button
                                  disabled
                                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 text-slate-500 text-xs font-semibold rounded-xl border border-slate-800 cursor-not-allowed opacity-60"
                                  title="Payment locked: Assigned provider must submit work proof before payment can be made"
                                >
                                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Proof Required</span>
                                </button>
                              )
                            ) : null
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
          fullProjectAmountDollars={agreedBudgetDollars}
          projectRemainingDollars={((Math.max(0, agreedBudgetMinor - settledMinor)) / 100).toFixed(2)}
          hasProof={
            projectEvidence.some((e) => e.milestoneId === selectedMilestone.id) ||
            selectedMilestone.status === 'SUBMITTED' ||
            selectedMilestone.status === 'APPROVED_FOR_PAYMENT' ||
            selectedMilestone.status === 'PAID'
          }
          assignedProviderName={project?.assignedProviderName}
          projectStatus={project?.status}
          onPaymentSuccess={fetchProjectData}
        />
      )}

      {/* Provider Submit Work Proof Modal */}
      {proofTargetMilestone && (
        <Modal
          isOpen={isSubmitProofModalOpen}
          onClose={() => setIsSubmitProofModalOpen(false)}
          title="Submit Work Proof Artifact"
          subtitle={`Deliverable: ${proofTargetMilestone.title} • Value: $${(proofTargetMilestone.amountMinor / 100).toFixed(2)} USD`}
          maxWidth="md"
        >
          <form onSubmit={handleSubmitProofModal} className="space-y-4">
            <div className="p-3 bg-purple-950/40 border border-purple-800/40 rounded-xl flex items-center justify-between text-xs">
              <span className="text-purple-300 font-medium">Assigned Provider</span>
              <span className="font-mono font-bold text-white">{project?.assignedProviderName || 'Alex Rivera (Rivera Tech)'}</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Deliverable / Artifact Title</label>
              <input
                type="text"
                required
                value={proofTitle}
                onChange={(e) => setProofTitle(e.target.value)}
                placeholder="e.g. Completed OAuth2 Authentication & Test Suite"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Proof URL / Repository Ref / Demo Link</label>
              <input
                type="text"
                required
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="e.g. https://github.com/rivera/email-engine/pull/1 or https://demo.clausora.dev"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Completion Notes / Description</label>
              <textarea
                rows={3}
                value={proofDesc}
                onChange={(e) => setProofDesc(e.target.value)}
                placeholder="Describe key deliverable outcomes, test results, and verified specifications..."
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsSubmitProofModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingProof || !proofTitle.trim() || !proofUrl.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-900/40 transition disabled:opacity-50"
              >
                {submittingProof ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Submit Work Proof & Unlock Payment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create New Task & Calculate Milestone Modal */}
      <Modal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        title="Create New Project Task"
        subtitle="New tasks are added to the Work DNA blueprint with milestone allocation and progress calculated from task effort."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Task Title</label>
            <input
              type="text"
              required
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="e.g. Automated Stripe Fallback & Webhook Reconciliation"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Description & Deliverable Scope</label>
            <textarea
              rows={3}
              value={newTaskDesc}
              onChange={(e) => setNewTaskDesc(e.target.value)}
              placeholder="Describe technical requirements, expected inputs/outputs, and integration endpoints..."
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Estimated Effort (Hours)</label>
              <input
                type="number"
                min="1"
                max="500"
                value={newTaskHours}
                onChange={(e) => setNewTaskHours(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
              <span className="text-[10px] text-slate-500">Milestone budget allocation is calculated from effort hours.</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Priority Level</label>
              <select
                value={newTaskPriority}
                onChange={(e: any) => setNewTaskPriority(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="critical">Critical / Blocking</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Deliverable Artifact / Output</label>
            <input
              type="text"
              value={newTaskDeliverable}
              onChange={(e) => setNewTaskDeliverable(e.target.value)}
              placeholder="e.g. Tested webhook handler module and unit test logs"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-2 p-3 bg-slate-950 border border-slate-800/80 rounded-xl">
            <label className="text-xs font-semibold text-slate-300 block">Milestone Placement & Calculation</label>
            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="milestoneMode"
                  checked={newTaskMilestoneMode === 'dedicated'}
                  onChange={() => setNewTaskMilestoneMode('dedicated')}
                  className="accent-indigo-500"
                />
                <span className="text-slate-200 font-medium">Create a New Dedicated Milestone Phase for this task</span>
              </label>

              {milestones.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="milestoneMode"
                    checked={newTaskMilestoneMode === 'existing'}
                    onChange={() => {
                      setNewTaskMilestoneMode('existing');
                      if (!selectedTargetMilestoneId && milestones.length > 0) {
                        setSelectedTargetMilestoneId(milestones[0].id);
                      }
                    }}
                    className="accent-indigo-500"
                  />
                  <span className="text-slate-200 font-medium">Attach to an Existing Milestone</span>
                </label>
              )}

              {newTaskMilestoneMode === 'existing' && milestones.length > 0 && (
                <div className="pl-6 pt-1">
                  <select
                    value={selectedTargetMilestoneId}
                    onChange={(e) => setSelectedTargetMilestoneId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                  >
                    {milestones.map((m, idx) => (
                      <option key={m.id} value={m.id}>
                        Phase {idx + 1}: {m.title} (${(m.amountMinor / 100).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsAddTaskModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingTask || !newTaskTitle.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-900/40 transition disabled:opacity-50"
            >
              {creatingTask ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Task & Calculate Milestone</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

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
          subtitle="Configure PayPal sandbox billing and milestone escrow policies."
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

      {/* Close Project Confirmation Modal */}
      {isCloseModalOpen && (
        <Modal
          isOpen={isCloseModalOpen}
          onClose={() => setIsCloseModalOpen(false)}
          title="Close & Finalize Project"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-4 bg-emerald-950/40 border border-emerald-700/50 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Escrow Settlement Complete</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                This project has achieved 100% payment release (${settledDollars} USD). Closing the project will transition its status to <strong className="text-white">COMPLETED</strong>, record a tamper-evident audit event, and archive active workstreams.
              </p>
            </div>

            <div className="text-xs text-slate-400 space-y-1.5 p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
              <p className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Milestone proof artifacts remain permanently available for audit.</span>
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>PayPal transaction captures and settlement split logs will be preserved.</span>
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Project will be moved from active sidebar navigation into historical records.</span>
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCloseModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCloseProject}
                disabled={closingProject}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 disabled:opacity-50"
              >
                {closingProject ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Confirm & Close Project</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Clausora AI Agent Slide-Over Drawer with Action Execution */}
      {project && (
        <ProjectCopilotDrawer
          isOpen={isCopilotOpen}
          onClose={() => setIsCopilotOpen(false)}
          projectId={project.id}
          projectTitle={project.title}
          projectStatus={project.status}
          onActivateProject={handleAcceptProject}
          onMakePayment={(msId) => {
            const target = msId ? milestones.find((m) => m.id === msId) : null;
            if (target) {
              setSelectedMilestone(target);
              setIsPayPalModalOpen(true);
            } else {
              handleOpenDirectPaymentModal();
            }
          }}
          onSubmitProof={(msId) => {
            const target = msId
              ? milestones.find((m) => m.id === msId)
              : milestones.find((m) => m.status !== 'PAID') || milestones[0];
            if (target) openSubmitProofModal(target);
          }}
          onRunCouncilReview={() => {
            setTab('evidence');
          }}
        />
      )}
    </div>
  );
};

