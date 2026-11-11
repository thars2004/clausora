import React, { useState } from 'react';
import { api } from '../../api/client';
import { CouncilReviewResult, Milestone, EvidenceItem } from '@clausora/shared';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Users,
  Code,
  Briefcase,
  Scale,
  Loader2,
  RotateCw,
  FileCheck,
} from 'lucide-react';

interface MultiAgentCouncilViewProps {
  milestone: Milestone;
  evidenceItems: EvidenceItem[];
  onReviewUpdated?: (updatedReview: CouncilReviewResult) => void;
}

export const MultiAgentCouncilView: React.FC<MultiAgentCouncilViewProps> = ({
  milestone,
  evidenceItems,
  onReviewUpdated,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cast existing review if stored on milestone
  const [councilReview, setCouncilReview] = useState<CouncilReviewResult | null>(
    (milestone as any)?.councilReview || null
  );

  const handleRunCouncilReview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`/milestones/${milestone.id}/council-review`);
      const review: CouncilReviewResult = res.data?.data?.councilReview;
      if (review) {
        setCouncilReview(review);
        if (onReviewUpdated) {
          onReviewUpdated(review);
        }
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Failed to execute Multi-Agent Review Council. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 sm:p-6 bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl space-y-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-0" />

      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-900/30">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>Multi-Agent Deliverable Review Council</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-700/60 text-purple-300 font-normal">
                Mixture of Agents
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Three independent AI agents evaluate this deliverable from technical, business, and legal contract perspectives before PayPal escrow disbursement.
          </p>
        </div>

        <button
          onClick={handleRunCouncilReview}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-900/40 border border-indigo-400/30 disabled:opacity-50 self-start sm:self-auto hover:scale-[1.02]"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Deliberating...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{councilReview ? 'Re-Evaluate with AI Council' : 'Consult AI Review Council'}</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State before running */}
      {!councilReview && !loading && (
        <div className="p-8 text-center bg-slate-950/60 border border-slate-800/80 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center mx-auto text-indigo-400">
            <Scale className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">AI Council Deliberation Awaiting Trigger</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Click "Consult AI Review Council" above to dispatch the Technical Architect, Business Advocate, and Contract Compliance Auditor to analyze all {evidenceItems.length} evidence artifact(s).
            </p>
          </div>
        </div>
      )}

      {/* Council Verdict & Executive Overview */}
      {councilReview && (
        <div className="space-y-6 relative z-10 animate-fade-in">
          {/* Executive Verdict Banner */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              councilReview.consensusVerdict === 'VERIFIED_READY_FOR_PAYOUT'
                ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200'
                : councilReview.consensusVerdict === 'CONDITIONAL_REVISION_NEEDED'
                ? 'bg-amber-950/40 border-amber-600/50 text-amber-200'
                : 'bg-rose-950/40 border-rose-600/50 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  councilReview.consensusVerdict === 'VERIFIED_READY_FOR_PAYOUT'
                    ? 'bg-emerald-900/60 text-emerald-300'
                    : councilReview.consensusVerdict === 'CONDITIONAL_REVISION_NEEDED'
                    ? 'bg-amber-900/60 text-amber-300'
                    : 'bg-rose-900/60 text-rose-300'
                }`}
              >
                {councilReview.consensusVerdict === 'VERIFIED_READY_FOR_PAYOUT' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : councilReview.consensusVerdict === 'CONDITIONAL_REVISION_NEEDED' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-mono font-bold">
                    Consensus Verdict:
                  </span>
                  <span className="text-sm font-extrabold">
                    {councilReview.consensusVerdict.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs opacity-90 mt-0.5 max-w-2xl leading-relaxed">
                  {councilReview.executiveSummary}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0 font-mono">
              <div className="text-2xl sm:text-3xl font-extrabold text-white">
                {councilReview.overallScore}
                <span className="text-xs text-slate-400 font-normal">/100</span>
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                Release Confidence
              </span>
            </div>
          </div>

          {/* 3 Specialized Agent Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {councilReview.agents.map((agent, idx) => {
              const isTech = agent.agentRole === 'tech_lead';
              const isBiz = agent.agentRole === 'business_advocate';

              return (
                <div
                  key={idx}
                  className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    {/* Agent Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-white ${
                            isTech
                              ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40'
                              : isBiz
                              ? 'bg-purple-600/30 text-purple-400 border border-purple-500/40'
                              : 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40'
                          }`}
                        >
                          {isTech ? (
                            <Code className="w-3.5 h-3.5" />
                          ) : isBiz ? (
                            <Briefcase className="w-3.5 h-3.5" />
                          ) : (
                            <Scale className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white truncate max-w-[130px]">
                            {agent.agentName}
                          </div>
                          <div className="text-[9px] text-slate-400 truncate max-w-[130px]">
                            {isTech ? 'Tech Lead' : isBiz ? 'Product Lead' : 'Legal Auditor'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-extrabold font-mono text-white">
                          {agent.score}
                          <span className="text-[9px] text-slate-500">/100</span>
                        </div>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                            agent.verdict === 'pass'
                              ? 'text-emerald-400 bg-emerald-950/60'
                              : agent.verdict === 'warning'
                              ? 'text-amber-400 bg-amber-950/60'
                              : 'text-rose-400 bg-rose-950/60'
                          }`}
                        >
                          {agent.verdict}
                        </span>
                      </div>
                    </div>

                    {/* Agent Summary */}
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {agent.summary}
                    </p>

                    {/* Observations */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                        Key Observations:
                      </span>
                      <ul className="space-y-1">
                        {agent.keyObservations.slice(0, 2).map((obs, obsIdx) => (
                          <li
                            key={obsIdx}
                            className="text-[10px] text-slate-400 flex items-start gap-1.5 leading-snug"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{obs}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Concerns */}
                    {agent.concernsOrRisks && agent.concernsOrRisks.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-mono uppercase text-amber-400/80 font-semibold">
                          Considerations:
                        </span>
                        <ul className="space-y-0.5">
                          {agent.concernsOrRisks.slice(0, 1).map((risk, rIdx) => (
                            <li
                              key={rIdx}
                              className="text-[10px] text-slate-400 flex items-start gap-1 leading-snug"
                            >
                              <span className="text-amber-400 shrink-0">•</span>
                              <span>{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-900 text-[9px] text-slate-500 font-mono">
                    Criteria match: {councilReview.verifiedCriteriaCount} / {councilReview.totalCriteriaCount}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
