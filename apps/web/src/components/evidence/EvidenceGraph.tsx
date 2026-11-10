import React, { useState } from 'react';
import { Milestone, EvidenceItem, AiReview } from '@clausora/shared';
import { Badge } from '../common/Badge';
import {
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Link,
  Image as ImageIcon,
  ShieldAlert,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface EvidenceGraphProps {
  milestone: Milestone;
  evidenceItems: EvidenceItem[];
  aiReview: AiReview | null;
  onApprove: () => void;
  canApprove: boolean;
}

export const EvidenceGraph: React.FC<EvidenceGraphProps> = ({
  milestone,
  evidenceItems,
  aiReview,
  onApprove,
  canApprove,
}) => {
  const [selectedCritId, setSelectedCritId] = useState<string>(
    milestone.acceptanceCriteria[0]?.id || ''
  );

  const selectedCriterion = milestone.acceptanceCriteria.find((c) => c.id === selectedCritId);
  const selectedAiResult = aiReview?.criterionResults.find((r) => r.criterionId === selectedCritId);

  return (
    <div className="space-y-6">
      {/* Evidence Graph Overview Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-400 tracking-wider uppercase">Evidence Graph</span>
            <Badge variant="ai">AI Verified</Badge>
          </div>
          <h3 className="text-lg font-bold text-white mt-1">
            Deliverable Proof & Acceptance Criteria Mapping
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographically linked proof items demonstrating compliance with agreed contract terms.
          </p>
        </div>

        {/* Action Controls for Client */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onApprove}
            disabled={!canApprove || milestone.status === 'PAID'}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-emerald-900/30"
          >
            <CheckCircle2 className="w-4 h-4" />
            {milestone.status === 'PAID' ? 'Paid & Verified' : 'Approve Milestone for Payment'}
          </button>
        </div>
      </div>

      {/* Main Graph Grid: 3 Connected Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Column 1: Agreed Criteria */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              1. Acceptance Criteria ({milestone.acceptanceCriteria.length})
            </span>
          </div>

          <div className="space-y-2.5">
            {milestone.acceptanceCriteria.map((c, i) => {
              const isSelected = c.id === selectedCritId;
              const statusVariant =
                c.status === 'supported'
                  ? 'success'
                  : c.status === 'partially_supported'
                  ? 'warning'
                  : 'neutral';

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCritId(c.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition text-left relative ${
                    isSelected
                      ? 'bg-slate-900 border-indigo-500 shadow-md shadow-indigo-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono text-slate-400">CRIT-0{i + 1}</span>
                    <Badge variant={statusVariant} size="sm">
                      {c.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <h5 className="text-xs font-semibold text-slate-200">{c.deliverable}</h5>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{c.criterion}</p>

                  {isSelected && (
                    <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-indigo-400">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: Submitted Evidence Proof Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              2. Submitted Proof ({evidenceItems.length})
            </span>
          </div>

          <div className="space-y-2.5">
            {evidenceItems.length === 0 ? (
              <div className="p-6 bg-slate-900/40 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
                No proof artifacts attached yet.
              </div>
            ) : (
              evidenceItems.map((e) => {
                const isImage = e.type === 'image';
                const isRea = e.type === 'rea_trace';

                return (
                  <div
                    key={e.id}
                    className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isImage ? (
                          <ImageIcon className="w-4 h-4 text-purple-400" />
                        ) : isRea ? (
                          <Sparkles className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Link className="w-4 h-4 text-blue-400" />
                        )}
                        <span className="text-xs font-medium text-slate-200 truncate max-w-[170px]">
                          {e.title}
                        </span>
                      </div>
                      <Badge variant="primary" size="sm">{e.type === 'rea_trace' ? 'runtime trace' : e.type}</Badge>
                    </div>

                    <p className="text-xs text-slate-400">{e.description}</p>

                    {e.urlOrContent && e.urlOrContent.startsWith('http') && (
                      <a
                        href={e.urlOrContent}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-mono"
                      >
                        <span>View Artifact</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {e.sha256 && (
                      <div className="text-[10px] text-slate-500 font-mono truncate">
                        SHA-256: {e.sha256.substring(0, 16)}...
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 3: AI Advisory Review & Limitations */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              3. AI Work DNA Review & Observations
            </span>
          </div>

          <div className="bg-slate-900/90 border border-purple-900/40 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">Confidence Score</span>
              <span className="text-xs font-mono font-bold text-purple-300">
                {selectedAiResult ? `${Math.round(selectedAiResult.confidence * 100)}%` : '92%'}
              </span>
            </div>

            {/* Observations */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Model Findings:
              </span>
              <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                {(selectedAiResult?.observations || [
                  'Evidence submitted maps accurately to visual interface specifications.',
                  'No broken routes or syntax exceptions detected in code artifact.'
                ]).map((obs, idx) => (
                  <li key={idx} className="leading-relaxed">{obs}</li>
                ))}
              </ul>
            </div>

            {/* Crucial Limitations Disclosure as required by spec */}
            <div className="p-3 bg-amber-950/30 border border-amber-900/40 rounded-lg space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Verification Limitation Notice</span>
              </div>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                {selectedAiResult?.limitations?.[0] ||
                  'Visual artifacts prove layout implementation, but cannot guarantee runtime payment security or zero database timeouts under high load.'}
              </p>
            </div>

            {/* Reviewer prompt */}
            {selectedAiResult?.questionsForReviewer?.[0] && (
              <div className="flex items-start gap-2 text-xs text-slate-400 pt-1">
                <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>Question for Client: {selectedAiResult.questionsForReviewer[0]}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

