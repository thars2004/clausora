import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AnalyticsData } from '@clausora/shared';
import { Badge } from '../components/common/Badge';
import {
  TrendingUp,
  CreditCard,
  CheckCircle2,
  Radio,
  Sparkles,
  BarChart3,
  PieChart,
  ShieldAlert,
  ArrowUpRight,
  Loader2,
  DollarSign,
  Activity,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await api.get('/admin/analytics');
        setData(res.data.data?.analytics || null);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading || !data) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-xs text-slate-400">Loading comprehensive analytics data...</p>
      </div>
    );
  }

  const settledDollars = (data.financialSummary.settledCents / 100).toFixed(2);
  const pendingDollars = (data.financialSummary.pendingCents / 100).toFixed(2);
  const totalVolumeDollars = ((data.financialSummary.settledCents + data.financialSummary.pendingCents) / 100).toFixed(2);

  const totalMilestones =
    data.milestoneDistribution.paid +
    data.milestoneDistribution.approvedForPayment +
    data.milestoneDistribution.awaitingDecision +
    data.milestoneDistribution.inProgress +
    data.milestoneDistribution.created;

  const paidPercent = totalMilestones > 0 ? Math.round((data.milestoneDistribution.paid / totalMilestones) * 100) : 50;

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs text-indigo-400 font-semibold mb-1">
            <Activity className="w-4 h-4 text-indigo-400" />
            <span>Platform Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Project & Payment Analytics</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time financial settlement velocity, deliverable readiness, and AI evidence metrics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="paypal">PayPal Orders v2</Badge>
          <Badge variant="ai">Qwen2.5-VL Multimodal</Badge>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Settled Volume</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">${settledDollars}</div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-300">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>PayPal Sandbox Verified</span>
          </div>
        </div>

        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Pipeline</span>
            <CreditCard className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">${pendingDollars}</div>
          <p className="text-[11px] text-slate-400">Authorized in escrow contracts</p>
        </div>

        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Milestone Payout Rate</span>
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400 font-mono">{paidPercent}%</div>
          <p className="text-[11px] text-slate-400">{data.milestoneDistribution.paid} of {totalMilestones} milestones completed</p>
        </div>

        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">AI Avg. Confidence</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {Math.round(data.aiReviewMetrics.avgConfidence * 100)}%
          </div>
          <p className="text-[11px] text-slate-400">{data.aiReviewMetrics.limitationsCount} limitations flagged</p>
        </div>
      </div>

      {/* Analytics Visual Grid: Financial Settlement & Milestone Lifecycle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Milestone Lifecycle Funnel */}
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Milestone Lifecycle Breakdown</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">{totalMilestones} Total</span>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  PAID (Verified with PayPal)
                </span>
                <span className="font-mono font-semibold text-emerald-400">{data.milestoneDistribution.paid}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${(data.milestoneDistribution.paid / Math.max(totalMilestones, 1)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0070BA]" />
                  APPROVED FOR PAYMENT (Ready for Checkout)
                </span>
                <span className="font-mono font-semibold text-blue-400">{data.milestoneDistribution.approvedForPayment}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-[#0070BA] h-2 rounded-full transition-all"
                  style={{ width: `${(data.milestoneDistribution.approvedForPayment / Math.max(totalMilestones, 1)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  AWAITING CLIENT DECISION (AI Evidence Reviewed)
                </span>
                <span className="font-mono font-semibold text-purple-400">{data.milestoneDistribution.awaitingDecision}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${(data.milestoneDistribution.awaitingDecision / Math.max(totalMilestones, 1)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  IN PROGRESS (Work Execution)
                </span>
                <span className="font-mono font-semibold text-indigo-400">{data.milestoneDistribution.inProgress}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all"
                  style={{ width: `${(data.milestoneDistribution.inProgress / Math.max(totalMilestones, 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Financial Escrow & Settlement Ledger */}
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Financial Settlement Ratio</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">${totalVolumeDollars} Total</span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-slate-950/80 border border-emerald-900/50 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Settled Capture</span>
              <div className="text-xl font-bold text-emerald-400 font-mono">${settledDollars}</div>
              <p className="text-[10px] text-emerald-400/80">Completed via Sandbox Orders v2</p>
            </div>

            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Active Escrow</span>
              <div className="text-xl font-bold text-white font-mono">${pendingDollars}</div>
              <p className="text-[10px] text-slate-400">Awaiting client verification</p>
            </div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 leading-relaxed">
            <span className="text-indigo-400 font-semibold">Deterministic Policy:</span> Payments can never be executed automatically by AI. The server requires cryptographic human sign-off before dispatching to PayPal.
          </div>
        </div>
      </div>

      {/* Bottom Grid: Scope Drift & AI Confidence Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scope Drift Radar Metrics */}
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Scope Drift Radar Analysis</h3>
            </div>
            <Badge variant="warning">Diff Scanner</Badge>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Clausora monitors mid-project requests against the frozen agreement SHA-256 fingerprint, shielding budgets from silent scope creep.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 bg-slate-950 border border-amber-900/40 rounded-xl text-center space-y-1">
              <div className="text-xl font-bold text-amber-400 font-mono">
                {data.scopeDriftSummary.likelyScopeChanges}
              </div>
              <div className="text-[11px] text-slate-300 font-medium">Scope Additions</div>
              <div className="text-[10px] text-slate-500">Amendments Drafted</div>
            </div>

            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-1">
              <div className="text-xl font-bold text-indigo-400 font-mono">
                {data.scopeDriftSummary.clarifications}
              </div>
              <div className="text-[11px] text-slate-300 font-medium">Clarifications</div>
              <div className="text-[10px] text-slate-500">In-Scope Refinements</div>
            </div>

            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-1">
              <div className="text-xl font-bold text-emerald-400 font-mono">
                {data.scopeDriftSummary.inScope}
              </div>
              <div className="text-[11px] text-slate-300 font-medium">Standard Tasks</div>
              <div className="text-[10px] text-slate-500">Baseline Criteria</div>
            </div>
          </div>
        </div>

        {/* AI Multimodal Observability */}
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Hugging Face AI Evidence Verification</h3>
            </div>
            <Badge variant="ai">Qwen2.5-VL</Badge>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            All AI outputs are validated using strict Zod schemas. Model limitations are surfaced directly to client reviewers.
          </p>

          <div className="space-y-3 pt-1 text-xs">
            <div className="flex justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-slate-400">Multimodal Inference Engine</span>
              <span className="text-purple-300 font-mono font-semibold">Qwen/Qwen2.5-VL-7B-Instruct</span>
            </div>
            <div className="flex justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-slate-400">Evidence Reviews Synthesized</span>
              <span className="text-white font-mono font-semibold">{data.aiReviewMetrics.reviewsGenerated}</span>
            </div>
            <div className="flex justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-slate-400">Limitation Disclosures Enforced</span>
              <span className="text-amber-400 font-mono font-semibold">{data.aiReviewMetrics.limitationsCount} notices</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
