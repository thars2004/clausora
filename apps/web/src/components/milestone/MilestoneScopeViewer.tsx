import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, Tag, ListFilter } from 'lucide-react';

interface MilestoneScopeViewerProps {
  description?: string;
  milestoneTitle?: string;
}

export const MilestoneScopeViewer: React.FC<MilestoneScopeViewerProps> = ({
  description,
  milestoneTitle,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const parsed = useMemo(() => {
    if (!description || !description.trim()) {
      return { isLong: false, summary: 'No specific scope description provided.', bullets: [], tags: [] };
    }

    // Clean repeated dots/commas and trailing incomplete ellipsis
    const clean = description
      .replace(/\.{2,}/g, '.')
      .replace(/,{2,}/g, ',')
      .replace(/…/g, '')
      .trim();

    // If short, return directly
    if (clean.length <= 130) {
      return { isLong: false, summary: clean, bullets: [], tags: [] };
    }

    // Split on dots with whitespace, newlines, bullets, or headers
    const rawParts = clean
      .split(/(?:\.\s+|\n+|•|\b\d+\.\s*|\bTeachers should\b|\bStudents should\b|\bAdministrator\b|\bTechnical Requirements\b|\bMain Features\b|\bAI Integration\b|\bUser Roles\b|\bVideo and File Management\b)/i)
      .flatMap((s) => s.split(/,\s+(?=[A-Z])/)) // Split on comma when followed by capital letter
      .map((s) => s.trim().replace(/^[,.\s]+|[,.\s]+$/g, ''))
      .filter((s) => s.length > 8 && !s.match(/^(and|the|with|for|should|also|etc|user roles|technical requirements|main features|i want to develop.*)$/i));

    const seen = new Set<string>();
    const bullets: string[] = [];
    for (let p of rawParts) {
      p = p.replace(/\s+(pla|up|ma|co|suf|ho|m)\b/gi, '').trim();
      const lower = p.toLowerCase();
      if (!seen.has(lower) && bullets.length < 28 && p.length > 8) {
        seen.add(lower);
        bullets.push(p.charAt(0).toUpperCase() + p.slice(1));
      }
    }

    const lowerDesc = clean.toLowerCase();
    const tags: string[] = [];
    if (lowerDesc.includes('auth') || lowerDesc.includes('login') || lowerDesc.includes('role') || lowerDesc.includes('jwt')) {
      tags.push('User Roles & Auth');
    }
    if (lowerDesc.includes('course') || lowerDesc.includes('lesson') || lowerDesc.includes('teach')) {
      tags.push('Course Management');
    }
    if (lowerDesc.includes('ai') || lowerDesc.includes('assistant') || lowerDesc.includes('tamil') || lowerDesc.includes('hugging')) {
      tags.push('AI Learning Assistant');
    }
    if (lowerDesc.includes('quiz') || lowerDesc.includes('assignment') || lowerDesc.includes('grad')) {
      tags.push('Quizzes & Grading');
    }
    if (lowerDesc.includes('video') || lowerDesc.includes('media') || lowerDesc.includes('file')) {
      tags.push('Video & Media Files');
    }
    if (lowerDesc.includes('paypal') || lowerDesc.includes('payment') || lowerDesc.includes('escrow') || lowerDesc.includes('purchas')) {
      tags.push('PayPal Escrow');
    }
    if (lowerDesc.includes('admin') || lowerDesc.includes('analytic') || lowerDesc.includes('report') || lowerDesc.includes('dashboard')) {
      tags.push('Admin & Analytics');
    }

    // High level clean summary (one clear sentence)
    const titleClean = milestoneTitle ? milestoneTitle.replace(/^Milestone \d+:\s*/i, '').trim() : '';
    let summary = titleClean
      ? `${titleClean} — Comprehensive scope specification (${bullets.length} deliverable items)`
      : `${bullets[0] || 'Deliverable implementation specifications'}.`;

    return {
      isLong: true,
      summary,
      bullets,
      tags: tags.slice(0, 5),
    };
  }, [description, milestoneTitle]);

  // If short, render clean single/double line
  if (!parsed.isLong) {
    return <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{parsed.summary}</p>;
  }

  return (
    <div className="space-y-2.5 mt-1">
      {/* Clean 1-Line Overview Summary */}
      <p className="text-xs text-slate-300 leading-relaxed font-medium line-clamp-2">
        {parsed.summary}
      </p>

      {/* Feature Category Tag Chips */}
      {parsed.tags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {parsed.tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-indigo-300"
            >
              <Tag className="w-2.5 h-2.5 text-indigo-400" />
              <span>{tag}</span>
            </span>
          ))}
        </div>
      )}

      {/* Accordion Toggle for Detailed Deliverable Bullets */}
      {parsed.bullets.length > 0 && (
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition py-0.5 px-2 rounded-lg bg-indigo-950/40 border border-indigo-800/40 hover:bg-indigo-950/70 cursor-pointer"
          >
            <span>{isExpanded ? 'Hide Scope Details' : `View Scope Details (${parsed.bullets.length} items)`}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Formatted Scrollable Bulleted Scope Container */}
          {isExpanded && (
            <div className="mt-2 p-3 bg-slate-950/90 border border-slate-800/90 rounded-xl max-h-48 overflow-y-auto space-y-1.5 animate-fade-in custom-scrollbar text-xs text-slate-300 shadow-inner">
              <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 pb-1.5 border-b border-slate-900">
                <ListFilter className="w-3 h-3 text-indigo-400" />
                <span>Verified Deliverable Specifications:</span>
              </div>
              <ul className="space-y-1.5 pt-1">
                {parsed.bullets.map((b, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[11.5px] leading-snug text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
