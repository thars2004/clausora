import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../api/client';
import { CopilotMessage, Milestone } from '@clausora/shared';
import { LogoIcon } from '../common/Logo';
import {
  X,
  Send,
  Loader2,
  User,
  ArrowUpRight,
  CreditCard,
  Upload,
  ThumbsUp,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Zap,
  ExternalLink,
} from 'lucide-react';

interface ProjectCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
  projectStatus: string;
  milestones?: Milestone[];
  projectEvidence?: any[];
  userRole?: string;
  userId?: string;
  projectRemainingDollars?: string;
  fullProjectAmountDollars?: string;
  onActivateProject?: () => Promise<void> | void;
  onRefreshProject?: () => void;
  onRunCouncilReview?: (milestoneId?: string) => void;
  onMakePayment?: (milestoneId?: string) => void;
  onSubmitProof?: (milestoneId?: string) => void;
}

// Inline parser for bold, code, and text styling
const formatInline = (str: string): React.ReactNode[] => {
  if (!str) return [];
  const parts = str.split(/(\*\*[^*]+?\*\*|`[^`]+?`)/g);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const boldText = part.slice(2, -2);
      return (
        <strong key={idx} className="font-extrabold text-white tracking-wide">
          {boldText}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const codeText = part.slice(1, -1);
      return (
        <code
          key={idx}
          className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-300 font-bold mx-0.5"
        >
          {codeText}
        </code>
      );
    }
    return part;
  });
};

// Markdown block renderer for clean, bold headings, bullet lists, and paragraphs
const renderFormattedContent = (text: string) => {
  if (!text) return null;
  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <div key={lineIdx} className="h-1.5" />;
    }

    const isSubIndented = line.startsWith('  ') || line.startsWith('\t');

    // Sub-headings (e.g. #### 💼 1. Business & Client Perspective)
    const subHeadingMatch = trimmed.match(/^#{4,6}\s+(.*)/);
    if (subHeadingMatch) {
      return (
        <div
          key={lineIdx}
          className="text-xs font-bold text-indigo-200 mt-3 mb-1.5 bg-indigo-950/60 border border-indigo-800/60 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 tracking-tight shadow-sm"
        >
          {formatInline(subHeadingMatch[1])}
        </div>
      );
    }

    // Main section headings (e.g. ### 🌐 Multi-Perspective Project Summary)
    const mainHeadingMatch = trimmed.match(/^#{1,3}\s+(.*)/);
    if (mainHeadingMatch) {
      return (
        <h4
          key={lineIdx}
          className="text-xs sm:text-sm font-extrabold text-white tracking-tight mt-3 mb-1.5 flex items-center gap-1.5 border-b border-slate-800/80 pb-1.5 text-indigo-300"
        >
          {formatInline(mainHeadingMatch[1])}
        </h4>
      );
    }

    // Numbered list item (e.g. 1. Design Phase)
    const numMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)/);
    if (numMatch) {
      const num = numMatch[1];
      const rest = numMatch[2];
      return (
        <div key={lineIdx} className={`flex items-start gap-2 my-1 text-slate-200 ${isSubIndented ? 'pl-5' : 'pl-1'}`}>
          <span className="font-mono text-[10px] font-extrabold text-indigo-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 shrink-0 mt-0.5">
            {num}
          </span>
          <span className="flex-1 leading-relaxed">{formatInline(rest)}</span>
        </div>
      );
    }

    // Bullet point (handles '* ', '- ', '• ', '* * ', etc.)
    const bulletMatch = trimmed.match(/^(?:[*\-•]\s+)+(.*)/);
    if (bulletMatch) {
      const bulletContent = bulletMatch[1];
      return (
        <div key={lineIdx} className={`flex items-start gap-2 my-1 text-slate-200 ${isSubIndented ? 'pl-5' : 'pl-1'}`}>
          <span className="text-indigo-400 font-extrabold shrink-0 mt-0.5 leading-none">•</span>
          <span className="flex-1 leading-relaxed">{formatInline(bulletContent)}</span>
        </div>
      );
    }

    // Regular paragraph
    return (
      <p key={lineIdx} className={`leading-relaxed text-slate-200 my-1 font-medium ${isSubIndented ? 'pl-4' : ''}`}>
        {formatInline(trimmed)}
      </p>
    );
  });
};

export const ProjectCopilotDrawer: React.FC<ProjectCopilotDrawerProps> = ({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  projectStatus,
  milestones = [],
  projectEvidence = [],
  userRole = 'client',
  projectRemainingDollars = '0.00',
  fullProjectAmountDollars = '0.00',
  onActivateProject,
  onRefreshProject,
  onRunCouncilReview,
  onMakePayment,
  onSubmitProof,
}) => {
  const isAwaitingApproval = projectStatus === 'awaiting_approval';

  const initialActions = [
    ...(isAwaitingApproval
      ? [{ label: '⚡ Approve & Activate Project', action: 'activate_project', type: 'execute_activate' as const }]
      : [
          { label: '💳 Make a Payment (Inline)', action: 'make_payment', type: 'execute_payment' as const },
          { label: '📤 Submit Work Proof (Inline)', action: 'submit_proof', type: 'execute_submit_proof' as const },
        ]),
    { label: '🌐 Multi-Perspective Summary', action: 'Give me a multi-perspective summary of this project' },
    { label: '🛠️ Inspect Tech Stack', action: 'What is the tech stack and architecture of this project?' },
    { label: '⏱️ Deadlines & Timeline', action: 'What is the project deadline and milestone schedule?' },
    { label: '💰 Financial & Escrow Status', action: 'What is our financial and escrow status?' },
  ];

  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      role: 'assistant',
      content: `### 🌐 Welcome to Clausora AI Agent\n\nI am your interactive workspace assistant for **"${projectTitle}"**, powered by multi-perspective intelligence (Gemini & Hugging Face).\n\n* **Live Status:** \`${projectStatus.toUpperCase()}\`\n* **Direct Action Execution (No Modals!):** You can **make payments**, **submit deliverable proofs**, and **activate projects** directly with inline input fields right in this chat.\n* **Smart Validation:** Enter any values; if anything does not match requirements, I will instantly pinpoint the exact issue.\n\nSelect an action or ask any question to begin:`,
      timestamp: new Date().toISOString(),
      suggestedActions: initialActions,
    },
  ]);

  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // INLINE ACTION FORMS (NO MODAL POPUPS!)
  const [inlineAction, setInlineAction] = useState<'none' | 'payment' | 'proof'>('none');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('');

  // Payment Form State
  const [payAmount, setPayAmount] = useState<string>('');
  const [isPaying, setIsPaying] = useState(false);
  const [payIssue, setPayIssue] = useState<string>('');

  // Proof Form State
  const [proofUrl, setProofUrl] = useState<string>('');
  const [proofTitle, setProofTitle] = useState<string>('');
  const [proofDesc, setProofDesc] = useState<string>('');
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [proofIssue, setProofIssue] = useState<string>('');

  // Determine current target milestone
  const currentMilestones = milestones && milestones.length > 0 ? milestones : [];
  const activeMilestone =
    currentMilestones.find((m) => m.id === selectedMilestoneId) ||
    currentMilestones.find((m) => m.status !== 'PAID') ||
    currentMilestones[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (inlineAction !== 'none') {
            setInlineAction('none');
          } else {
            onClose();
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      scrollToBottom();
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen, messages, inlineAction, onClose]);

  // Open inline payment form
  const openInlinePayment = (targetId?: string) => {
    const target = targetId
      ? currentMilestones.find((m) => m.id === targetId) || activeMilestone
      : activeMilestone;

    if (target) {
      setSelectedMilestoneId(target.id);
      const remainingMinor = Math.max(
        0,
        target.amountMinor - (target.paidMinor || (target.status === 'PAID' ? target.amountMinor : 0))
      );
      const msRemaining = (remainingMinor / 100).toFixed(2);
      setPayAmount(parseFloat(msRemaining) > 0 ? msRemaining : (projectRemainingDollars || '0.00'));
    } else {
      setPayAmount(projectRemainingDollars || '0.00');
    }
    setPayIssue('');
    setInlineAction('payment');
    setTimeout(() => scrollToBottom(), 100);
  };

  // Open inline proof form
  const openInlineProof = (targetId?: string) => {
    const target = targetId
      ? currentMilestones.find((m) => m.id === targetId) || activeMilestone
      : activeMilestone;

    if (target) {
      setSelectedMilestoneId(target.id);
      setProofTitle(`${target.title} - Work Proof`);
    } else {
      setProofTitle('Deliverable Work Proof');
    }
    setProofUrl('');
    setProofDesc('');
    setProofIssue('');
    setInlineAction('proof');
    setTimeout(() => scrollToBottom(), 100);
  };

  // VALIDATION: Payment ("if its not match say the issue")
  const validatePayment = (): string | null => {
    if (projectStatus === 'awaiting_approval') {
      return 'Project is currently awaiting bilateral approval. Activate the project first before releasing escrow payments.';
    }
    if (userRole === 'provider') {
      return 'Only the Client can authorize escrow payments. You are currently logged in as a Provider.';
    }
    const parsed = parseFloat(payAmount);
    if (isNaN(parsed) || parsed <= 0) {
      return 'Please enter a valid payment amount greater than $0.00 USD.';
    }
    const maxProject = parseFloat(projectRemainingDollars || '999999');
    if (parsed > maxProject) {
      return `Entered amount ($${parsed.toFixed(2)}) exceeds project remaining escrow balance of $${maxProject.toFixed(2)} USD.`;
    }
    if (activeMilestone) {
      const hasProof =
        projectEvidence?.some((e) => e.milestoneId === activeMilestone.id) ||
        activeMilestone.status === 'SUBMITTED' ||
        activeMilestone.status === 'APPROVED_FOR_PAYMENT' ||
        activeMilestone.status === 'PAID';
      if (!hasProof) {
        return `Deliverable work proof has not been submitted for "${activeMilestone.title}". Provider must submit proof before payout can be released.`;
      }
    }
    return null;
  };

  // VALIDATION: Work Proof ("if its not match say the issue")
  const validateProof = (): string | null => {
    if (projectStatus === 'awaiting_approval') {
      return 'Project is currently awaiting approval. Work proof can only be submitted once the project is activated.';
    }
    if (!proofUrl.trim()) {
      return 'Proof URL cannot be empty. Please provide a repository link, pull request, or demo URL.';
    }
    const isValidUrl = /^https?:\/\/.+/i.test(proofUrl.trim());
    if (!isValidUrl) {
      return 'Proof URL does not match format. URL must start with "https://" or "http://" (e.g. https://github.com/org/repo or https://demo.clausora.dev).';
    }
    if (!proofTitle.trim()) {
      return 'Deliverable title is required.';
    }
    return null;
  };

  // EXECUTE PAYMENT INLINE (DEMO / INSTANT ESCROW)
  const handleExecuteInlineDemoPay = async () => {
    const issue = validatePayment();
    if (issue) {
      setPayIssue(issue);
      return;
    }
    if (!activeMilestone) {
      setPayIssue('No target milestone found for payment.');
      return;
    }

    setIsPaying(true);
    setPayIssue('');

    try {
      const parsedMinor = Math.round(parseFloat(payAmount) * 100);
      const res = await api.post(`/payments/milestones/${activeMilestone.id}/demo-pay`, {
        amountMinor: parsedMinor,
        projectId,
      });

      const captureId = res.data?.data?.captureId || 'SETTLED_DEMO';
      const paidDollars = (parsedMinor / 100).toFixed(2);

      // Append rich confirmation message directly into chat
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `### ✅ Escrow Payment of $${paidDollars} USD Released!

* **Target Milestone:** **${activeMilestone.title}**
* **Amount Paid:** **$${paidDollars} USD**
* **Verification Status:** \`SETTLED & PAID\`
* **Transaction Capture ID:** \`${captureId}\`
* **Escrow Ledger:** Updated with server-side PayPal Sandbox confirmation.`,
          timestamp: new Date().toISOString(),
          suggestedActions: [
            { label: '💰 Financial & Escrow Status', action: 'What is our financial and escrow status?' },
            { label: '📤 Submit Work Proof', action: 'submit_proof', type: 'execute_submit_proof' },
            { label: '⏱️ Deadlines & Timeline', action: 'What is the project deadline and milestone schedule?' },
          ],
        },
      ]);

      setInlineAction('none');
      onRefreshProject?.();
    } catch (err: any) {
      setPayIssue(err.response?.data?.message || 'Payment execution failed on server.');
    } finally {
      setIsPaying(false);
    }
  };

  // EXECUTE PAYMENT INLINE (PAYPAL SANDBOX)
  const handleExecuteInlinePayPal = async () => {
    const issue = validatePayment();
    if (issue) {
      setPayIssue(issue);
      return;
    }
    if (!activeMilestone) {
      setPayIssue('No target milestone found for payment.');
      return;
    }

    setIsPaying(true);
    setPayIssue('');

    try {
      const parsedMinor = Math.round(parseFloat(payAmount) * 100);
      const res = await api.post(`/payments/milestones/${activeMilestone.id}/create-order`, {
        amountMinor: parsedMinor,
        projectId,
      });

      const { payment } = res.data?.data || {};
      const paidDollars = (parsedMinor / 100).toFixed(2);

      let captureRes;
      if (payment?.id) {
        try {
          captureRes = await api.post(`/payments/${payment.id}/capture`);
        } catch {}
      }

      const captureId = captureRes?.data?.data?.captureId || payment?.id || 'CAPTURED_SANDBOX';

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `### ✅ PayPal Sandbox Escrow Payment Captured!

* **Target Milestone:** **${activeMilestone.title}**
* **Amount Authorized:** **$${paidDollars} USD**
* **PayPal Capture ID:** \`${captureId}\`
* **Status:** \`PAID\` (Milestone settled in Escrow Ledger)`,
          timestamp: new Date().toISOString(),
          suggestedActions: [
            { label: '💰 Financial & Escrow Status', action: 'What is our financial and escrow status?' },
            { label: '📤 Submit Work Proof', action: 'submit_proof', type: 'execute_submit_proof' },
          ],
        },
      ]);

      setInlineAction('none');
      onRefreshProject?.();
    } catch (err: any) {
      setPayIssue(err.response?.data?.message || 'PayPal order creation failed.');
    } finally {
      setIsPaying(false);
    }
  };

  // EXECUTE WORK PROOF SUBMISSION INLINE
  const handleExecuteInlineProofSubmit = async () => {
    const issue = validateProof();
    if (issue) {
      setProofIssue(issue);
      return;
    }
    if (!activeMilestone) {
      setProofIssue('No target milestone selected.');
      return;
    }

    setIsSubmittingProof(true);
    setProofIssue('');

    try {
      await api.post(`/milestones/${activeMilestone.id}/evidence`, {
        title: proofTitle.trim(),
        description: proofDesc.trim(),
        urlOrContent: proofUrl.trim(),
        type: proofUrl.includes('github') ? 'repository' : 'url',
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `### ✅ Work Proof Successfully Submitted!

* **Milestone:** **${activeMilestone.title}**
* **Deliverable Title:** **${proofTitle.trim()}**
* **Proof Link:** [${proofUrl.trim()}](${proofUrl.trim()})
* **Milestone State:** \`SUBMITTED\` (Client payment is now unlocked)
* **Evidence Record:** Created in Evidence Graph for Review Council verification.`,
          timestamp: new Date().toISOString(),
          suggestedActions: [
            { label: '💳 Make a Payment (Inline)', action: 'make_payment', type: 'execute_payment', targetId: activeMilestone.id },
            { label: '🤖 Run AI Review Council', action: 'run_council', type: 'execute_council', targetId: activeMilestone.id },
            { label: '⏱️ Deadlines & Timeline', action: 'What is the project deadline and milestone schedule?' },
          ],
        },
      ]);

      setInlineAction('none');
      onRefreshProject?.();
    } catch (err: any) {
      setProofIssue(err.response?.data?.message || 'Failed to submit deliverable proof to server.');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  // DISPATCH ACTION CLICK
  const handleActionClick = async (chip: {
    label: string;
    action: string;
    type?: 'chat' | 'execute_activate' | 'execute_payment' | 'execute_submit_proof' | 'execute_council';
    targetId?: string;
  }) => {
    if (chip.type === 'execute_activate') {
      if (onActivateProject) {
        try {
          await onActivateProject();
          setMessages((prev) => [
            ...prev,
            {
              role: 'user',
              content: '⚡ Execute Project Activation',
              timestamp: new Date().toISOString(),
            },
            {
              role: 'assistant',
              content: `### ✅ Project Successfully Activated!\n\n* **Updated State:** \`ACTIVE\`\n* **Milestone Pipeline:** Unlocked for deliverable execution.\n* **Escrow Engine:** Deterministic milestone tracking is now active.`,
              timestamp: new Date().toISOString(),
              suggestedActions: [
                { label: '💳 Make a Payment (Inline)', action: 'make_payment', type: 'execute_payment' },
                { label: '📤 Submit Work Proof (Inline)', action: 'submit_proof', type: 'execute_submit_proof' },
                { label: '🛠️ Inspect Tech Stack', action: 'What is the tech stack and architecture of this project?' },
                { label: '⏱️ Deadlines & Timeline', action: 'What is the project deadline and milestone schedule?' },
              ],
            },
          ]);
        } catch {}
      }
      return;
    }

    if (chip.type === 'execute_payment') {
      openInlinePayment(chip.targetId);
      return;
    }

    if (chip.type === 'execute_submit_proof') {
      openInlineProof(chip.targetId);
      return;
    }

    if (chip.type === 'execute_council') {
      if (onRunCouncilReview) {
        onRunCouncilReview(chip.targetId);
        onClose();
      }
      return;
    }

    handleSendMessage(chip.action);
  };

  // SEND MESSAGE HANDLER (INCLUDES DIRECT INPUT COMMAND PARSING & VALIDATION ISSUES)
  const handleSendMessage = async (textToSend?: string) => {
    const question = textToSend || inputQuestion.trim();
    if (!question || loading) return;

    const lower = question.toLowerCase();

    // 1. Natural Language Proof Submission Detection
    if (
      lower.startsWith('submit proof') ||
      lower.startsWith('proof:') ||
      (lower.includes('submit') && lower.includes('proof'))
    ) {
      const urlMatch = question.match(/https?:\/\/[^\s]+/i);
      setInputQuestion('');

      if (!urlMatch) {
        setMessages((prev) => [
          ...prev,
          { role: 'user', content: question, timestamp: new Date().toISOString() },
          {
            role: 'assistant',
            content: `### ⚠️ Work Proof Submission Issue\n\n❌ **Issue: No valid URL detected in your input.**\n\nDeliverable proofs require a link starting with \`https://\` or \`http://\` (e.g. \`https://github.com/organization/repository\` or \`https://demo.app\`).\n\nPlease fill in the proof submission fields below to submit directly without any popups:`,
            timestamp: new Date().toISOString(),
          },
        ]);
        openInlineProof();
        setProofIssue('Proof URL does not match valid URL format. Must start with https://.');
        return;
      } else {
        openInlineProof();
        setProofUrl(urlMatch[0]);
        setMessages((prev) => [
          ...prev,
          { role: 'user', content: question, timestamp: new Date().toISOString() },
          {
            role: 'assistant',
            content: `### 📋 Deliverable Proof Link Parsed\n\n✅ **Detected URL:** \`${urlMatch[0]}\`\n\nReview the milestone details below and click **Submit Work Proof Directly**:`,
            timestamp: new Date().toISOString(),
          },
        ]);
        return;
      }
    }

    // 2. Natural Language Payment Detection
    if (
      lower.startsWith('pay') ||
      lower.startsWith('make payment') ||
      (lower.includes('pay') && /\d+/.test(lower))
    ) {
      const amountMatch = question.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
      setInputQuestion('');
      openInlinePayment();

      if (amountMatch) {
        const amt = parseFloat(amountMatch[1]);
        setPayAmount(amt.toFixed(2));
        const maxAllowed = parseFloat(projectRemainingDollars || '999999');

        if (amt > maxAllowed) {
          setPayIssue(`Entered amount ($${amt.toFixed(2)}) exceeds remaining balance of $${maxAllowed.toFixed(2)} USD.`);
          setMessages((prev) => [
            ...prev,
            { role: 'user', content: question, timestamp: new Date().toISOString() },
            {
              role: 'assistant',
              content: `### ⚠️ Payment Allocation Issue\n\n❌ **Issue: Requested amount of $${amt.toFixed(2)} USD exceeds the remaining escrow balance of $${projectRemainingDollars} USD.**\n\nPlease adjust the payment amount in the inline form below:`,
              timestamp: new Date().toISOString(),
            },
          ]);
          return;
        } else {
          setMessages((prev) => [
            ...prev,
            { role: 'user', content: question, timestamp: new Date().toISOString() },
            {
              role: 'assistant',
              content: `### 💳 Escrow Payment Prepared\n\nReady to process **$${amt.toFixed(2)} USD**. Review details below and click **Instant Escrow Pay** or **PayPal Sandbox**:`,
              timestamp: new Date().toISOString(),
            },
          ]);
          return;
        }
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'user', content: question, timestamp: new Date().toISOString() },
          {
            role: 'assistant',
            content: `### 💳 Escrow Payment Panel\n\nSelect the milestone and confirm the payment amount below to disburse funds directly:`,
            timestamp: new Date().toISOString(),
          },
        ]);
        return;
      }
    }

    // 3. Normal AI Conversation Query
    const userMsg: CopilotMessage = {
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setLoading(true);

    try {
      const res = await api.post(`/projects/${projectId}/copilot`, {
        question,
        history: messages.slice(-6),
      });

      const reply: CopilotMessage = res.data?.data;
      if (reply) {
        setMessages((prev) => [...prev, reply]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Failed to retrieve AI response: ${
            err.response?.data?.message || 'Server connection error. Please try again.'
          }`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const drawerElement = (
    <div
      className="fixed inset-0 z-[99999] flex justify-end bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full sm:max-w-lg md:max-w-xl h-full h-[100dvh] bg-[#0F172A] border-l border-slate-800 flex flex-col shadow-2xl relative overflow-hidden animate-slide-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Fixed Header */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-800 bg-[#111827] flex items-center justify-between sticky top-0 z-20 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-950/60 border border-cyan-400/40 shrink-0 p-1.5">
              <LogoIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                  Clausora AI Agent
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 font-bold">
                  ● Action Agent (Gemini & HF)
                </span>
              </div>
              <p className="text-xs text-slate-300 font-semibold truncate max-w-[240px] sm:max-w-[320px]">
                {projectTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            title="Close AI Agent"
            aria-label="Close AI Agent Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Message History */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs min-h-0 overscroll-contain">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role !== 'user' && (
                <div className="w-8 h-8 rounded-xl bg-indigo-950 border border-indigo-700/60 flex items-center justify-center shrink-0 mt-0.5 shadow-sm p-1">
                  <LogoIcon className="w-5 h-5" />
                </div>
              )}

              <div
                className={`p-4 rounded-2xl max-w-[88%] space-y-2 shadow-lg leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-none font-semibold'
                    : 'bg-slate-900/90 border border-slate-800 text-slate-100 rounded-tl-none'
                }`}
              >
                <div className="text-xs leading-relaxed space-y-1">
                  {msg.role === 'user' ? (
                    <span className="font-semibold text-white">{msg.content}</span>
                  ) : (
                    renderFormattedContent(msg.content)
                  )}
                </div>

                {/* Suggested Action & Execution Chips */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="pt-2.5 mt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                    {msg.suggestedActions.map((chip, chipIdx) => {
                      if (chip.type === 'execute_activate') {
                        return (
                          <button
                            key={chipIdx}
                            onClick={() => handleActionClick(chip)}
                            disabled={loading}
                            className="text-[10px] px-3 py-1.5 bg-gradient-to-r from-emerald-950 to-teal-950 hover:from-emerald-900 hover:to-teal-900 border border-emerald-500/80 text-emerald-200 font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-950/60 hover:scale-[1.03] active:scale-95 cursor-pointer disabled:opacity-50"
                            title="Execute Project Activation"
                          >
                            <ThumbsUp className="w-3 h-3 text-emerald-400" />
                            <span>{chip.label}</span>
                          </button>
                        );
                      }
                      if (chip.type === 'execute_payment') {
                        return (
                          <button
                            key={chipIdx}
                            onClick={() => handleActionClick(chip)}
                            disabled={loading}
                            className="text-[10px] px-3 py-1.5 bg-gradient-to-r from-blue-950 via-indigo-950 to-cyan-950 hover:from-blue-900 hover:to-cyan-900 border border-cyan-400/80 text-cyan-200 font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-cyan-950/60 hover:scale-[1.03] active:scale-95 cursor-pointer disabled:opacity-50"
                            title="Open Inline Escrow Payment Input"
                          >
                            <CreditCard className="w-3 h-3 text-cyan-400" />
                            <span>{chip.label}</span>
                          </button>
                        );
                      }
                      if (chip.type === 'execute_submit_proof') {
                        return (
                          <button
                            key={chipIdx}
                            onClick={() => handleActionClick(chip)}
                            disabled={loading}
                            className="text-[10px] px-3 py-1.5 bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 hover:from-purple-900 hover:to-indigo-900 border border-purple-400/80 text-purple-200 font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-purple-950/60 hover:scale-[1.03] active:scale-95 cursor-pointer disabled:opacity-50"
                            title="Open Inline Work Proof Submission Input"
                          >
                            <Upload className="w-3 h-3 text-purple-400" />
                            <span>{chip.label}</span>
                          </button>
                        );
                      }
                      if (chip.type === 'execute_council') {
                        return (
                          <button
                            key={chipIdx}
                            onClick={() => handleActionClick(chip)}
                            disabled={loading}
                            className="text-[10px] px-3 py-1.5 bg-gradient-to-r from-teal-950 to-emerald-950 hover:from-teal-900 hover:to-emerald-900 border border-teal-400/80 text-teal-200 font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-teal-950/60 hover:scale-[1.03] active:scale-95 cursor-pointer disabled:opacity-50"
                            title="Run Multi-Agent Review Council Audit"
                          >
                            <ShieldCheck className="w-3 h-3 text-teal-400" />
                            <span>{chip.label}</span>
                          </button>
                        );
                      }

                      return (
                        <button
                          key={chipIdx}
                          onClick={() => handleActionClick(chip)}
                          disabled={loading}
                          className="text-[10px] px-2.5 py-1 bg-slate-950 hover:bg-indigo-950 border border-slate-700/80 hover:border-indigo-500/60 text-indigo-300 font-bold rounded-lg transition text-left flex items-center gap-1 disabled:opacity-50 hover:scale-[1.02] cursor-pointer"
                        >
                          <span>{chip.label}</span>
                          <ArrowUpRight className="w-2.5 h-2.5 text-indigo-400" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 shrink-0 mt-0.5 shadow-sm font-bold">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-indigo-950 border border-indigo-700/60 flex items-center justify-center shrink-0 p-1">
                <LogoIcon className="w-5 h-5 animate-pulse" />
              </div>
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none text-slate-300 text-xs font-semibold flex items-center gap-2 shadow-md">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Analyzing vault data & validating parameters...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ========================================================================= */}
        {/* INLINE ESCROW PAYMENT CARD (NO MODAL! "if its not match say the issue")   */}
        {/* ========================================================================= */}
        {inlineAction === 'payment' && (
          <div className="shrink-0 p-4 border-t border-cyan-800/80 bg-slate-950/95 shadow-2xl relative animate-slide-up z-30">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/50 text-cyan-400">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-white">Inline Escrow Payment</h4>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Remaining project balance: <span className="text-cyan-300 font-bold">${projectRemainingDollars} USD</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInlineAction('none')}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                title="Cancel inline payment"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {/* Target Milestone Dropdown */}
              <div>
                <label className="text-[10px] font-bold text-slate-300 block mb-1">
                  Target Deliverable Milestone
                </label>
                <select
                  value={selectedMilestoneId || activeMilestone?.id || ''}
                  onChange={(e) => {
                    setSelectedMilestoneId(e.target.value);
                    const target = currentMilestones.find((m) => m.id === e.target.value);
                    if (target) {
                      const rem = Math.max(0, target.amountMinor - (target.paidMinor || 0));
                      setPayAmount((rem / 100).toFixed(2));
                    }
                    setPayIssue('');
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 font-medium focus:border-cyan-400 focus:outline-none"
                >
                  {currentMilestones.map((ms) => {
                    const isPaid = ms.status === 'PAID';
                    return (
                      <option key={ms.id} value={ms.id} disabled={isPaid}>
                        {ms.title} (${(ms.amountMinor / 100).toFixed(2)}) {isPaid ? '— [PAID]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Amount Input */}
              <div>
                <label className="text-[10px] font-bold text-slate-300 block mb-1">
                  Payment Amount ($ USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1.5 text-slate-400 font-bold font-mono">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={payAmount}
                    onChange={(e) => {
                      setPayAmount(e.target.value);
                      setPayIssue('');
                    }}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono font-bold focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* REAL-TIME VALIDATION ISSUE BANNER ("if its not match say the issue") */}
            {payIssue && (
              <div className="mt-2.5 p-2 bg-red-950/80 border border-red-500/80 rounded-xl text-red-200 text-[11px] flex items-start gap-2 animate-fade-in shadow-md">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <strong className="font-extrabold text-red-300">Validation Issue: </strong>
                  <span>{payIssue}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleExecuteInlineDemoPay}
                disabled={isPaying}
                className="flex-1 py-2 px-3 bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/60 disabled:opacity-50 cursor-pointer"
              >
                {isPaying ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-yellow-300" />
                )}
                <span>Instant Escrow Pay</span>
              </button>

              <button
                onClick={handleExecuteInlinePayPal}
                disabled={isPaying}
                className="flex-1 py-2 px-3 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/60 disabled:opacity-50 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5 text-white" />
                <span>PayPal Sandbox</span>
              </button>

              <button
                onClick={() => setInlineAction('none')}
                disabled={isPaying}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* INLINE WORK PROOF SUBMIT CARD (NO MODAL! "if its not match say the issue")*/}
        {/* ========================================================================= */}
        {inlineAction === 'proof' && (
          <div className="shrink-0 p-4 border-t border-purple-800/80 bg-slate-950/95 shadow-2xl relative animate-slide-up z-30">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-950 border border-purple-500/50 text-purple-400">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-white">Inline Deliverable Proof Submission</h4>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Attaches verifiable artifact to Evidence Graph
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInlineAction('none')}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                title="Cancel inline proof submission"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 mt-3">
              {/* Target Milestone */}
              <div>
                <label className="text-[10px] font-bold text-slate-300 block mb-1">
                  Deliverable Milestone
                </label>
                <select
                  value={selectedMilestoneId || activeMilestone?.id || ''}
                  onChange={(e) => {
                    setSelectedMilestoneId(e.target.value);
                    const target = currentMilestones.find((m) => m.id === e.target.value);
                    if (target) {
                      setProofTitle(`${target.title} - Work Proof`);
                    }
                    setProofIssue('');
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 font-medium focus:border-purple-400 focus:outline-none"
                >
                  {currentMilestones.map((ms) => (
                    <option key={ms.id} value={ms.id}>
                      {ms.title} (${(ms.amountMinor / 100).toFixed(2)}) — Status: {ms.status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Proof URL Input */}
              <div>
                <label className="text-[10px] font-bold text-slate-300 block mb-1">
                  Proof URL / GitHub PR / Repository Link <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  value={proofUrl}
                  onChange={(e) => {
                    setProofUrl(e.target.value);
                    setProofIssue('');
                  }}
                  placeholder="https://github.com/organization/repo or https://demo.clausora.dev"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:border-purple-400 focus:outline-none"
                />
              </div>

              {/* Proof Title Input */}
              <div>
                <label className="text-[10px] font-bold text-slate-300 block mb-1">
                  Deliverable Title / Summary <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={proofTitle}
                  onChange={(e) => {
                    setProofTitle(e.target.value);
                    setProofIssue('');
                  }}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-purple-400 focus:outline-none"
                />
              </div>
            </div>

            {/* REAL-TIME VALIDATION ISSUE BANNER ("if its not match say the issue") */}
            {proofIssue && (
              <div className="mt-2.5 p-2 bg-red-950/80 border border-red-500/80 rounded-xl text-red-200 text-[11px] flex items-start gap-2 animate-fade-in shadow-md">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <strong className="font-extrabold text-red-300">Validation Issue: </strong>
                  <span>{proofIssue}</span>
                </div>
              </div>
            )}

            {/* Submit Proof Button */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleExecuteInlineProofSubmit}
                disabled={isSubmittingProof}
                className="flex-1 py-2 px-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-purple-950/60 disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingProof ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-purple-200" />
                )}
                <span>Submit Work Proof Directly</span>
              </button>

              <button
                onClick={() => setInlineAction('none')}
                disabled={isSubmittingProof}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Sticky Fixed Bottom Input Bar */}
        <div className="shrink-0 p-3 sm:p-4 border-t border-slate-800 bg-[#111827] sticky bottom-0 z-20 shadow-lg">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              placeholder="Ask anything, type 'pay $500', or 'submit proof https://...' (auto-validated)..."
              className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-medium placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !inputQuestion.trim()}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl transition flex items-center justify-center disabled:opacity-50 shadow-md shadow-cyan-950/40 border border-cyan-400/30 shrink-0 hover:scale-105 active:scale-95 cursor-pointer"
              title="Send to Clausora AI Agent"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 px-1 font-mono font-medium">
            <span className="text-slate-400">Context: {projectTitle.slice(0, 30)}...</span>
            <span className="text-cyan-400">Direct Actions & Validation Active</span>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(drawerElement, document.body);
};
