import React, { useState } from 'react';
import { WorkBlueprint, Project } from '@clausora/shared';
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
  Layers,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../common/Badge';

interface WorkflowVisualizerProps {
  blueprint?: WorkBlueprint | null;
  project?: Project | null;
}

export const WorkflowVisualizer: React.FC<WorkflowVisualizerProps> = ({ blueprint, project }) => {
  const [showMermaidCode, setShowMermaidCode] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!blueprint) {
    return (
      <div className="p-8 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
        No workflow blueprint available yet.
      </div>
    );
  }

  const milestones = blueprint.suggestedMilestones || [];
  const workstreams = blueprint.workstreams || [];
  const workflowSteps = blueprint.workflowSteps || [];
  const diagramCode = blueprint.workflowDiagram || '';
  const totalBudget = blueprint.totalBudgetMinor || project?.totalAmountMinor || 150000;
  const targetDeadline = blueprint.targetDeadline || project?.deadline || '';

  const handleCopyMermaid = () => {
    if (!diagramCode) return;
    navigator.clipboard.writeText(diagramCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Workflow Header with Metrics */}
      <div className="p-5 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900 border border-indigo-900/40 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Project Execution Flow & Work DNA</h3>
          </div>
          <p className="text-xs text-slate-400">
            Synthesized deterministic workflow mapping client briefs directly to verified milestones and PayPal payouts.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {totalBudget > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 text-xs font-semibold font-mono">
              <DollarSign className="w-3.5 h-3.5" />
              <span>${(totalBudget / 100).toFixed(2)} USD</span>
            </div>
          )}

          {targetDeadline && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 text-xs font-semibold font-mono">
              <Calendar className="w-3.5 h-3.5" />
              <span>Target: {targetDeadline}</span>
            </div>
          )}

          {diagramCode && (
            <button
              onClick={() => setShowMermaidCode(!showMermaidCode)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{showMermaidCode ? 'Visual View' : 'Mermaid Code'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Mermaid Code Mode */}
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
        /* Visual Interactive Pipeline */
        <div className="space-y-6">
          {/* Phase Cards Container */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {workstreams.map((ws, index) => {
              const matchedMilestone = milestones[index] || milestones[0];
              const phaseNumber = index + 1;
              const phaseColors = [
                { border: 'border-indigo-800/50', badge: 'bg-indigo-950/80 text-indigo-300', glow: 'from-indigo-600/10' },
                { border: 'border-purple-800/50', badge: 'bg-purple-950/80 text-purple-300', glow: 'from-purple-600/10' },
                { border: 'border-emerald-800/50', badge: 'bg-emerald-950/80 text-emerald-300', glow: 'from-emerald-600/10' },
              ][index % 3];

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
                      {matchedMilestone && (
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          ${((matchedMilestone.suggestedAmountMinor || 0) / 100).toFixed(0)} USD
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">{ws.name}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ws.description}</p>
                    </div>

                    {/* Tasks in this phase */}
                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Workstream Tasks ({ws.tasks.length})
                      </span>
                      <div className="space-y-1.5">
                        {ws.tasks.map((task) => (
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
                      </div>
                    </div>
                  </div>

                  {/* Milestone Target & Due Date Footer */}
                  {matchedMilestone && (
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Due: <strong className="text-slate-300 font-mono">{matchedMilestone.dueDate || 'TBD'}</strong></span>
                      </div>
                      <span className="text-indigo-400 font-medium">{matchedMilestone.name.split(':')[0]}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Verification & PayPal Payout Gate Banner */}
          <div className="p-4 bg-slate-900/90 border border-emerald-900/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700/50 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h5 className="text-xs sm:text-sm font-bold text-white">Human Verification & PayPal Settlement Checkpoint</h5>
                <p className="text-[11px] text-slate-400">
                  Every deliverable criterion requires explicit client sign-off. AI never triggers payments autonomously.
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
    </div>
  );
};
