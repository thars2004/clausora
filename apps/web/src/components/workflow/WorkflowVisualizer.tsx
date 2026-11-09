import React, { useState } from 'react';
import {
  WorkBlueprint,
  Project,
  RequirementItem,
  RequirementCategory,
  AcceptanceCriterionItem,
  RiskItem,
  SubtaskItem,
  ClarificationQuestionItem,
} from '@clausora/shared';
import {
  GitMerge,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Copy,
  Check,
  Code2,
  Sparkles,
  Globe,
  ShieldAlert,
  ListChecks,
  Cpu,
  BarChart2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Search,
  Filter,
  Layers,
  Lock,
  Zap,
} from 'lucide-react';
import { Badge } from '../common/Badge';

interface WorkflowVisualizerProps {
  blueprint?: WorkBlueprint | null;
  project?: Project | null;
}

type VisualizerTab = 'flow' | 'requirements' | 'analysis' | 'risks' | 'tasks' | 'quality';

export const WorkflowVisualizer: React.FC<WorkflowVisualizerProps> = ({ blueprint, project }) => {
  const [activeTab, setActiveTab] = useState<VisualizerTab>('flow');
  const [showMermaidCode, setShowMermaidCode] = useState(false);
  const [copied, setCopied] = useState(false);

  // Requirements filter & search
  const [reqFilter, setReqFilter] = useState<string>('all');
  const [reqSearch, setReqSearch] = useState<string>('');

  // Task expand/collapse
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  const toggleTask = (taskId: string) => {
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  if (!blueprint) {
    return (
      <div className="p-8 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
        No workflow blueprint available yet.
      </div>
    );
  }

  const milestones = blueprint.suggestedMilestones || [];
  const workstreams = blueprint.workstreams || [];
  const diagramCode = blueprint.workflowDiagram || '';
  const totalBudget = blueprint.totalBudgetMinor ?? project?.totalAmountMinor;
  const isBudgetConfirmed = blueprint.budgetConfirmedByHuman !== false && totalBudget !== undefined && totalBudget > 0;
  const targetDeadline = blueprint.targetDeadline || project?.deadline || '';
  const isDeadlineConfirmed = blueprint.deadlineConfirmedByHuman !== false && Boolean(targetDeadline);

  const langMeta = blueprint.languageMetadata;
  const requirements: RequirementItem[] = blueprint.requirements || [];
  const businessAnalysis = blueprint.businessAnalysis;
  const technicalAnalysis = blueprint.technicalAnalysis;
  const functionalAnalysis = blueprint.functionalAnalysis;
  const deliveryAnalysis = blueprint.deliveryAnalysis;
  const riskRegister: RiskItem[] = blueprint.riskRegister || [];
  const quality = blueprint.qualityAssessment;
  const clarifications: ClarificationQuestionItem[] = blueprint.categorizedClarifications || [];

  const handleCopyMermaid = () => {
    if (!diagramCode) return;
    navigator.clipboard.writeText(diagramCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filtered requirements
  const filteredRequirements = requirements.filter((req) => {
    const matchesCategory = reqFilter === 'all' || req.category === reqFilter;
    const matchesSearch =
      reqSearch === '' ||
      req.id.toLowerCase().includes(reqSearch.toLowerCase()) ||
      req.description.toLowerCase().includes(reqSearch.toLowerCase()) ||
      req.category.toLowerCase().includes(reqSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Intelligence & Governance Header */}
      <div className="p-5 bg-gradient-to-r from-indigo-950/50 via-purple-950/30 to-slate-900 border border-indigo-900/40 rounded-2xl space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1 rounded-lg bg-indigo-600/20 text-indigo-400">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-white tracking-wide">
                CLAUSORA Work DNA Intelligence Engine
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-700/50 text-[10px] font-mono text-purple-300">
                v2.0 Synthesis
              </span>

              {/* Language Pill */}
              {langMeta?.detectedLanguage && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-950/70 border border-blue-700/50 text-[10px] text-blue-300 font-mono">
                  <Globe className="w-3 h-3 text-blue-400" />
                  <span>
                    Lang: {langMeta.detectedLanguageName || langMeta.detectedLanguage.toUpperCase()}
                    {langMeta.confidence ? ` (${Math.round(langMeta.confidence * 100)}%)` : ''}
                  </span>
                </div>
              )}

              {/* Overall Quality Pill */}
              {quality?.overallScore !== undefined && (
                <div
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                    quality.overallScore >= 80
                      ? 'bg-emerald-950/80 border-emerald-700/50 text-emerald-300'
                      : quality.overallScore >= 60
                      ? 'bg-amber-950/80 border-amber-700/50 text-amber-300'
                      : 'bg-rose-950/80 border-rose-700/50 text-rose-300'
                  }`}
                >
                  <BarChart2 className="w-3 h-3" />
                  <span>Quality: {quality.overallScore}/100</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Deterministic blueprint mapping client briefs, multilingual technical requirements, and acceptance
              criteria directly into verified milestones and PayPal checkout releases.
            </p>
          </div>

          {/* Financial & Timeline Safety Status Pills */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Financial Safety Indicator */}
            {isBudgetConfirmed ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 text-xs font-semibold font-mono">
                <DollarSign className="w-3.5 h-3.5" />
                <span>${(totalBudget / 100).toFixed(2)} USD (Confirmed)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/60 border border-amber-800/50 text-amber-300 text-xs font-semibold font-mono">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Budget Pending Human Confirmation ($0 Auto)</span>
              </div>
            )}

            {/* Timeline Indicator */}
            {isDeadlineConfirmed ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 text-xs font-semibold font-mono">
                <Calendar className="w-3.5 h-3.5" />
                <span>Target: {targetDeadline}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Estimated Schedule (Non-Binding)</span>
              </div>
            )}
          </div>
        </div>

        {/* Multilingual Translation Excerpt if present */}
        {langMeta?.isMultilingual && langMeta.translatedSummary && (
          <div className="p-3 bg-blue-950/30 border border-blue-900/40 rounded-xl text-xs text-blue-300 flex items-center gap-2">
            <Globe className="w-4 h-4 shrink-0 text-blue-400" />
            <span>
              <strong>Multilingual Ingestion ({langMeta.detectedLanguageName}):</strong> {langMeta.translatedSummary}
            </span>
          </div>
        )}
      </div>

      {/* Visualizer Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('flow')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition ${
            activeTab === 'flow'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <GitMerge className="w-4 h-4" />
          <span>Execution Flow</span>
        </button>

        <button
          onClick={() => setActiveTab('requirements')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition ${
            activeTab === 'requirements'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ListChecks className="w-4 h-4" />
          <span>Requirements Ledger</span>
          {requirements.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300 font-mono">
              {requirements.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('analysis')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition ${
            activeTab === 'analysis'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Multi-Dimensional Analysis</span>
        </button>

        <button
          onClick={() => setActiveTab('risks')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition ${
            activeTab === 'risks'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Risk Register</span>
          {riskRegister.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-mono">
              {riskRegister.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition ${
            activeTab === 'tasks'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Tasks & Acceptance Criteria</span>
        </button>

        <button
          onClick={() => setActiveTab('quality')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition ${
            activeTab === 'quality'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Quality Radar & Clarifications</span>
          {clarifications.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-mono">
              {clarifications.length}
            </span>
          )}
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: EXECUTION FLOW & PHASE PIPELINE                          */}
      {/* ============================================================== */}
      {activeTab === 'flow' && (
        <div className="space-y-6 animate-fade-in">
          {/* Controls Bar */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Deterministic sequential phase progression with verifiable milestone deliverables:</span>
            {diagramCode && (
              <button
                onClick={() => setShowMermaidCode(!showMermaidCode)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{showMermaidCode ? 'Switch to Phase Cards' : 'View Mermaid Flowchart Source'}</span>
              </button>
            )}
          </div>

          {showMermaidCode ? (
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 font-mono text-xs text-slate-300">
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/80 pb-2">
                <span className="text-[11px] font-semibold">Mermaid.js Flowchart Source:</span>
                <button
                  onClick={handleCopyMermaid}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="overflow-x-auto p-3 bg-slate-900/60 rounded-xl text-slate-300 text-[11px] leading-relaxed">
                {diagramCode}
              </pre>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {workstreams.map((ws, index) => {
                const matchedMilestone = milestones[index] || milestones[0];
                const phaseNumber = index + 1;
                const phaseColors = [
                  { border: 'border-indigo-800/50', badge: 'bg-indigo-950/80 text-indigo-300', glow: 'from-indigo-600/10' },
                  { border: 'border-purple-800/50', badge: 'bg-purple-950/80 text-purple-300', glow: 'from-purple-600/10' },
                  { border: 'border-emerald-800/50', badge: 'bg-emerald-950/80 text-emerald-300', glow: 'from-emerald-600/10' },
                ][index % 3];

                const amountText =
                  matchedMilestone?.suggestedAmountMinor !== undefined && matchedMilestone?.suggestedAmountMinor !== null
                    ? `$${(matchedMilestone.suggestedAmountMinor / 100).toFixed(0)} USD`
                    : 'Pending Confirmation';

                return (
                  <div
                    key={ws.id || index}
                    className={`relative p-5 bg-gradient-to-b ${phaseColors.glow} to-slate-900/80 border ${phaseColors.border} rounded-2xl flex flex-col justify-between space-y-4 shadow-xl`}
                  >
                    {/* Step Connector Indicator for lg screens */}
                    {index < workstreams.length - 1 && (
                      <div className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-slate-800 border border-slate-700 items-center justify-center text-slate-400 shadow-md">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${phaseColors.badge}`}>
                          Phase {phaseNumber}
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-400">{amountText}</span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-white">{ws.name}</h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ws.description}</p>
                      </div>

                      {/* Workstream Tasks Preview */}
                      <div className="space-y-2 pt-2 border-t border-slate-800/80">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Workstream Tasks ({ws.tasks.length})
                        </span>
                        <div className="space-y-1.5">
                          {ws.tasks.slice(0, 3).map((task) => (
                            <div
                              key={task.id}
                              className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-slate-200 line-clamp-1">{task.title}</span>
                                <Badge size="sm" variant={task.priority === 'high' ? 'danger' : 'neutral'}>
                                  {task.priority}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-slate-400 line-clamp-1">{task.deliverable}</p>
                            </div>
                          ))}
                          {ws.tasks.length > 3 && (
                            <div className="text-[10px] text-slate-500 text-center font-mono">
                              +{ws.tasks.length - 3} more tasks (view in Tasks tab)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Milestone Target & Due Date Footer */}
                    {matchedMilestone && (
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-400" />
                          <span>
                            Due:{' '}
                            <strong className="text-slate-300 font-mono">
                              {matchedMilestone.dueDate || 'TBD'}
                            </strong>
                          </span>
                        </div>
                        <span className="text-indigo-400 font-medium">{matchedMilestone.name.split(':')[0]}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Verification & PayPal Payout Gate Banner */}
          <div className="p-4 bg-slate-900/90 border border-emerald-900/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700/50 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h5 className="text-xs sm:text-sm font-bold text-white">Human Verification & PayPal Settlement Checkpoint</h5>
                <p className="text-[11px] text-slate-400">
                  Every deliverable criterion requires explicit human client sign-off. The AI engine never authorizes or
                  triggers payouts autonomously.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#002D62] border border-[#0070BA]/50 text-[#00A6E8] text-xs font-semibold">
                <CreditCard className="w-3.5 h-3.5" />
                <span>PayPal Orders v2 Capture</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: REQUIREMENTS LEDGER (10 CLASSIFICATIONS)                */}
      {/* ============================================================== */}
      {activeTab === 'requirements' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search requirements by ID or keyword..."
                value={reqSearch}
                onChange={(e) => setReqSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={reqFilter}
                onChange={(e) => setReqFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Categories ({requirements.length})</option>
                <option value="functional">Functional</option>
                <option value="technical">Technical</option>
                <option value="security">Security</option>
                <option value="ui_ux">UI / UX</option>
                <option value="performance">Performance</option>
                <option value="integration">Integration</option>
                <option value="compliance">Compliance</option>
                <option value="operational">Operational</option>
              </select>
            </div>
          </div>

          {filteredRequirements.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800 text-xs">
              No requirements found matching your filter criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredRequirements.map((req) => {
                const categoryColor: Record<string, string> = {
                  functional: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60',
                  technical: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60',
                  security: 'bg-rose-950/80 text-rose-300 border-rose-800/60',
                  ui_ux: 'bg-purple-950/80 text-purple-300 border-purple-800/60',
                  performance: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
                  integration: 'bg-blue-950/80 text-blue-300 border-blue-800/60',
                  compliance: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
                  operational: 'bg-slate-800/80 text-slate-300 border-slate-700',
                };

                const catStyle = categoryColor[req.category] || 'bg-slate-800 text-slate-300 border-slate-700';

                return (
                  <div
                    key={req.id}
                    className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2 hover:border-slate-700 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-indigo-400 px-2 py-0.5 rounded-lg bg-indigo-950/80 border border-indigo-800/50">
                          {req.id}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase tracking-wider ${catStyle}`}
                        >
                          {req.category.replace(/_/g, ' ')}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            req.isUserExplicit
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {req.isUserExplicit ? 'User Explicit' : 'AI Inferred'}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            req.priority === 'critical'
                              ? 'bg-rose-950 text-rose-300 border-rose-800'
                              : req.priority === 'high'
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {req.priority.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                          [{req.status}]
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-500 font-mono">
                        Source: {req.sourceReference || 'Brief text'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed">{req.description}</p>

                    {((req.relatedDeliverables && req.relatedDeliverables.length > 0) ||
                      (req.relatedCriteriaIds && req.relatedCriteriaIds.length > 0)) && (
                      <div className="pt-2 border-t border-slate-800/60 flex items-center gap-4 text-[11px] text-slate-400 flex-wrap">
                        {req.relatedDeliverables && req.relatedDeliverables.length > 0 && (
                          <span>
                            Deliverables:{' '}
                            <strong className="text-slate-300">{req.relatedDeliverables.join(', ')}</strong>
                          </span>
                        )}
                        {req.relatedCriteriaIds && req.relatedCriteriaIds.length > 0 && (
                          <span>
                            Criteria IDs:{' '}
                            <strong className="text-indigo-300 font-mono">
                              {req.relatedCriteriaIds.join(', ')}
                            </strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: MULTI-DIMENSIONAL ANALYSIS (4 CARD GRID)                 */}
      {/* ============================================================== */}
      {activeTab === 'analysis' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in">
          {/* Card 1: Business Analysis */}
          <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 border-b border-slate-800 pb-2">
              <Sparkles className="w-4 h-4" />
              <h4 className="text-sm font-bold text-white">Business Analysis</h4>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">Objective:</span>
                <p className="text-slate-200">{businessAnalysis?.businessObjective || 'Direct business execution brief.'}</p>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">Target Audience:</span>
                <p className="text-slate-200">
                  {businessAnalysis?.targetAudience?.join(', ') || 'Clients, Providers, and Stakeholders.'}
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-1">User Problems Solved:</span>
                <ul className="space-y-1 list-disc list-inside text-slate-300">
                  {businessAnalysis?.userProblemsSolved?.map((prob: string, i: number) => (
                    <li key={i}>{prob}</li>
                  )) || <li>Uncertain project delivery and payment dispute mitigation.</li>}
                </ul>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-1">Expected Business Value & Success Metrics:</span>
                <p className="text-slate-200 mb-1">{businessAnalysis?.expectedBusinessValue || 'Measurable milestone completion.'}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {businessAnalysis?.successMetrics?.map((met: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-[10px] text-indigo-300 font-mono"
                    >
                      {met}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Technical Architecture & Stack */}
          <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-purple-400 border-b border-slate-800 pb-2">
              <Cpu className="w-4 h-4" />
              <h4 className="text-sm font-bold text-white">Technical Architecture & Stack</h4>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">Recommended Architecture:</span>
                <p className="text-slate-200">{technicalAnalysis?.recommendedArchitecture || 'Fullstack modular architecture.'}</p>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-1">Frontend & Backend:</span>
                <div className="flex flex-wrap gap-1.5">
                  {technicalAnalysis?.technologyStack?.frontend?.map((tech: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded-lg bg-blue-950/60 border border-blue-800/40 text-[10px] text-blue-300">
                      {tech}
                    </span>
                  ))}
                  {technicalAnalysis?.technologyStack?.backend?.map((tech: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded-lg bg-purple-950/60 border border-purple-800/40 text-[10px] text-purple-300">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-1">Database & APIs:</span>
                <div className="flex flex-wrap gap-1.5">
                  {technicalAnalysis?.technologyStack?.database?.map((db: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-[10px] text-emerald-300 font-mono">
                      {db}
                    </span>
                  ))}
                  {technicalAnalysis?.technologyStack?.apis?.map((api: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-[10px] text-cyan-300 font-mono">
                      {api}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-1">Security & Scalability:</span>
                <ul className="space-y-1 list-disc list-inside text-slate-300 text-[11px]">
                  {technicalAnalysis?.securityRequirements?.map((sec: string, i: number) => (
                    <li key={i}>{sec}</li>
                  )) || <li>Role-based isolation & sanitized input validation.</li>}
                </ul>
              </div>
            </div>
          </div>

          {/* Card 3: Functional Workflows & User Journeys */}
          <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 border-b border-slate-800 pb-2">
              <Layers className="w-4 h-4" />
              <h4 className="text-sm font-bold text-white">Functional Workflows & Journeys</h4>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block mb-1">Core Features:</span>
                <ul className="space-y-1 list-disc list-inside text-slate-200">
                  {functionalAnalysis?.coreFeatures?.map((feat: string, i: number) => (
                    <li key={i}>{feat}</li>
                  )) || <li>Core execution features defined in project scope.</li>}
                </ul>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-1">User & Admin Journeys:</span>
                <ul className="space-y-1 list-disc list-inside text-slate-300">
                  {functionalAnalysis?.primaryUserJourneys?.map((uj: string, i: number) => (
                    <li key={i}>{uj}</li>
                  )) || <li>Sign in, submit work artifacts, review evidence, release milestone payments.</li>}
                </ul>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-1">Edge Cases & Exceptions:</span>
                <ul className="space-y-1 list-disc list-inside text-slate-400 text-[11px]">
                  {functionalAnalysis?.keyEdgeCases?.map((ec: string, i: number) => (
                    <li key={i}>{ec}</li>
                  )) || <li>Network timeouts, partial evidence submissions, dispute escalations.</li>}
                </ul>
              </div>
            </div>
          </div>

          {/* Card 4: Delivery, Dependencies & Critical Path */}
          <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 border-b border-slate-800 pb-2">
              <Zap className="w-4 h-4" />
              <h4 className="text-sm font-bold text-white">Delivery Analysis & Critical Path</h4>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">Development Complexity:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono text-indigo-300 font-semibold">
                  {deliveryAnalysis?.developmentComplexity?.toUpperCase() || 'MODERATE'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-1">Critical Path Sequence:</span>
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {deliveryAnalysis?.criticalPath?.map((cp: string, i: number) => (
                    <React.Fragment key={i}>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-950/80 border border-indigo-700/50 text-[11px] font-mono text-indigo-300">
                        {cp}
                      </span>
                      {i < (deliveryAnalysis.criticalPath?.length || 0) - 1 && (
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                      )}
                    </React.Fragment>
                  )) || <span className="text-slate-400">Foundation → Implementation → QA & Verification</span>}
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-1">Testing Requirements:</span>
                <ul className="space-y-1 list-disc list-inside text-slate-300 text-[11px]">
                  {deliveryAnalysis?.testingRequirements?.map((test: string, i: number) => (
                    <li key={i}>{test}</li>
                  )) || <li>Automated unit testing, end-to-end user flows, payment capture verification.</li>}
                </ul>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-1">Deployment Checklist:</span>
                <ul className="space-y-1 list-disc list-inside text-slate-300 text-[11px]">
                  {deliveryAnalysis?.deploymentReadinessChecklist?.map((dep: string, i: number) => (
                    <li key={i}>{dep}</li>
                  )) || <li>Vercel frontend deployment, Render/Atlas backend, complete audit logs.</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: RISK REGISTER (RSK-xxx)                                 */}
      {/* ============================================================== */}
      {activeTab === 'risks' && (
        <div className="space-y-3 animate-fade-in">
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-between text-xs text-slate-400">
            <span>
              Identified project delivery, technical, and scope risks with mitigations and human decision gates:
            </span>
            <span className="font-mono text-slate-300">{riskRegister.length} active risks recorded</span>
          </div>

          {riskRegister.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800 text-xs">
              No critical risks identified in this specification.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {riskRegister.map((risk) => {
                const severityStyle =
                  {
                    critical: 'bg-rose-950 text-rose-300 border-rose-800',
                    high: 'bg-red-950 text-red-300 border-red-800',
                    medium: 'bg-amber-950 text-amber-300 border-amber-800',
                    low: 'bg-slate-800 text-slate-300 border-slate-700',
                  }[risk.severity] || 'bg-slate-800 text-slate-300 border-slate-700';

                return (
                  <div
                    key={risk.riskId}
                    className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2 hover:border-slate-700 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-rose-400 px-2 py-0.5 rounded-lg bg-rose-950/80 border border-rose-800/50">
                          {risk.riskId}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase ${severityStyle}`}>
                          Severity: {risk.severity}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          Prob: {risk.probability} • Impact: {risk.impact}
                        </span>
                        {risk.humanDecisionRequired && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60">
                            Human Decision Required
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                        {risk.category}
                      </span>
                    </div>

                    <p className="text-xs text-slate-200">{risk.description}</p>

                    <div className="pt-2 border-t border-slate-800/60 text-xs">
                      <span className="text-slate-400 font-semibold">Mitigation Strategy: </span>
                      <span className="text-slate-300">{risk.mitigationStrategy}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: TASKS & ACCEPTANCE CRITERIA                             */}
      {/* ============================================================== */}
      {activeTab === 'tasks' && (
        <div className="space-y-4 animate-fade-in">
          {workstreams.map((ws, wsIndex) => (
            <div key={ws.id || wsIndex} className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-indigo-400 font-bold">Phase {wsIndex + 1}</span>
                    <h4 className="text-sm font-bold text-white">{ws.name}</h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{ws.description}</p>
                </div>
                <span className="text-xs font-mono text-slate-400">{ws.tasks.length} tasks</span>
              </div>

              <div className="space-y-3">
                {ws.tasks.map((task) => {
                  const isExpanded = expandedTasks[task.id] ?? false;
                  return (
                    <div
                      key={task.id}
                      className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-indigo-400">{task.id}</span>
                            <span className="text-xs font-bold text-white">{task.title}</span>
                            <Badge size="sm" variant={task.priority === 'high' ? 'danger' : 'neutral'}>
                              {task.priority}
                            </Badge>
                            {task.complexity && (
                              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700">
                                {task.complexity}
                              </span>
                            )}
                            {task.estimatedEffortHours && (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-950/60 text-[10px] font-mono text-indigo-300 border border-indigo-800/40">
                                {task.estimatedEffortHours} hrs
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">{task.description}</p>
                        </div>

                        <button
                          onClick={() => toggleTask(task.id)}
                          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 shrink-0 font-medium"
                        >
                          <span>{isExpanded ? 'Hide Details' : 'View Criteria'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Required Skills & Deliverable */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                        <span>
                          Deliverable: <strong className="text-slate-300">{task.deliverable}</strong>
                        </span>
                        {task.requiredSkills && task.requiredSkills.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span>Skills:</span>
                            {task.requiredSkills.map((sk: string, i: number) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300 font-mono"
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Expanded View: Subtasks & Acceptance Criteria */}
                      {isExpanded && (
                        <div className="pt-3 border-t border-slate-800/80 space-y-3">
                          {/* Subtasks */}
                          {task.subtasks && task.subtasks.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                Subtasks:
                              </span>
                              <div className="space-y-1">
                                {task.subtasks.map((sub: SubtaskItem) => (
                                  <div
                                    key={sub.id}
                                    className="flex items-center gap-2 text-xs text-slate-300 pl-2 border-l-2 border-indigo-500/40"
                                  >
                                    <span className="font-mono text-[10px] text-indigo-400">{sub.id}</span>
                                    <span>{sub.title}</span>
                                    <span className="text-[10px] text-slate-500">
                                      — {sub.deliverable}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Testable Structured Acceptance Criteria */}
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                              Verifiable Acceptance Criteria:
                            </span>
                            <div className="space-y-2">
                              {task.structuredCriteria && task.structuredCriteria.length > 0 ? (
                                task.structuredCriteria.map((ac: AcceptanceCriterionItem) => (
                                  <div
                                    key={ac.id}
                                    className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-xs space-y-1"
                                  >
                                    <div className="flex items-start gap-2">
                                      <CheckSquare className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono text-[10px] text-emerald-400 font-bold">
                                            {ac.id}
                                          </span>
                                          <span className="text-slate-200 font-semibold">{ac.criterion}</span>
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                          <strong>Verification Method:</strong> {ac.verificationMethod}
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                          <strong>Expected Result:</strong> {ac.expectedResult}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                task.acceptanceCriteria.map((acText: string, acIdx: number) => (
                                  <div
                                    key={acIdx}
                                    className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-xs flex items-center gap-2"
                                  >
                                    <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    <span className="text-slate-200">{acText}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Definition of Done */}
                          {task.definitionOfDone && (
                            <div className="p-2.5 bg-indigo-950/30 border border-indigo-900/40 rounded-lg text-xs text-indigo-300">
                              <strong>Definition of Done:</strong> {task.definitionOfDone}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 6: QUALITY RADAR & CLARIFICATION QUESTIONS                 */}
      {/* ============================================================== */}
      {activeTab === 'quality' && (
        <div className="space-y-6 animate-fade-in">
          {/* Quality Scores Radar */}
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-indigo-400" />
                  <span>AI Work DNA Quality Assessment (0–100)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Multi-dimensional objective scoring validating requirement coverage, technical feasibility, and financial safety.
                </p>
              </div>

              {quality?.overallScore !== undefined && (
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-mono">Overall Synthesis Score:</span>
                  <span
                    className={`text-2xl font-extrabold font-mono ${
                      quality.overallScore >= 80
                        ? 'text-emerald-400'
                        : quality.overallScore >= 60
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {quality.overallScore} / 100
                  </span>
                </div>
              )}
            </div>

            {/* 9 Quality Dimensions Grid */}
            {quality && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Requirement Coverage', score: quality.requirementCoverage },
                  { label: 'Technical Completeness', score: quality.technicalCompleteness },
                  { label: 'Task Clarity', score: quality.taskClarity },
                  { label: 'Acceptance Criteria Quality', score: quality.acceptanceCriteriaQuality },
                  { label: 'Dependency Consistency', score: quality.dependencyConsistency },
                  { label: 'Timeline Realism', score: quality.timelineConsistency },
                  { label: 'Risk Identification', score: quality.riskIdentification },
                  { label: 'Evidence Readiness', score: quality.evidenceReadiness },
                  { label: 'Language Accuracy', score: quality.languageAccuracy },
                ].map((item) => {
                  const scoreVal = typeof item.score === 'number' ? item.score : 85;
                  const scoreColor =
                    scoreVal >= 80 ? 'bg-emerald-500' : scoreVal >= 60 ? 'bg-amber-500' : 'bg-rose-500';

                  return (
                    <div key={item.label} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-semibold">{item.label}</span>
                        <span className="font-mono text-slate-400 font-bold">{scoreVal}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${scoreColor} transition-all duration-500`}
                          style={{ width: `${scoreVal}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Transparent Explanation & Unresolved Issues */}
            {quality?.explanations && (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
                <span className="font-semibold text-indigo-400 block">Assessment Rationale:</span>
                <div className="space-y-1 text-slate-300 leading-relaxed">
                  {Object.entries(quality.explanations).map(([k, v]) => (
                    <p key={k}>
                      <strong className="text-slate-200 capitalize">{k.replace(/([A-Z])/g, ' $1')}:</strong> {v}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {quality?.unresolvedIssues && quality.unresolvedIssues.length > 0 && (
              <div className="p-4 bg-rose-950/40 border border-rose-900/50 rounded-xl text-xs space-y-1">
                <span className="font-semibold text-rose-300 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Open Engineering Flags / Unresolved Points:</span>
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-rose-200">
                  {quality.unresolvedIssues.map((issue: string, i: number) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Categorized Clarification Questions */}
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <h4 className="text-base font-bold text-white">Project Clarifications Needed</h4>
              </div>
              <span className="text-xs font-mono text-slate-400">{clarifications.length} questions queued</span>
            </div>

            {clarifications.length === 0 ? (
              <div className="p-6 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                No blocking clarification questions. Specification is complete and actionable.
              </div>
            ) : (
              <div className="space-y-3">
                {clarifications.map((q) => {
                  const categoryStyle =
                    {
                      business: 'bg-indigo-950 text-indigo-300 border-indigo-800',
                      technical: 'bg-purple-950 text-purple-300 border-purple-800',
                      timeline: 'bg-cyan-950 text-cyan-300 border-cyan-800',
                      budget: 'bg-emerald-950 text-emerald-300 border-emerald-800',
                      delivery: 'bg-amber-950 text-amber-300 border-amber-800',
                    }[q.category] || 'bg-slate-800 text-slate-300 border-slate-700';

                  return (
                    <div
                      key={q.id}
                      className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400 px-2 py-0.5 rounded-lg bg-amber-950/80 border border-amber-800/50">
                            {q.id}
                          </span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase ${categoryStyle}`}>
                            {q.category}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                              q.importance === 'critical'
                                ? 'bg-rose-950 text-rose-300 border-rose-800'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {q.importance.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs font-semibold text-slate-200">{q.question}</p>

                      <div className="text-[11px] text-slate-400">
                        <strong>Context & Rationale:</strong> {q.context}
                      </div>

                      {q.answer && (
                        <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-xs text-slate-300">
                          <strong>Response:</strong> {q.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
