import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../api/client';
import { CopilotMessage } from '@clausora/shared';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  User,
  ArrowUpRight,
} from 'lucide-react';

interface ProjectCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
  projectStatus: string;
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
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      role: 'assistant',
      content: `### 🤖 Welcome to Project Copilot\n\nI am your dedicated AI assistant for **"${projectTitle}"**.\n\n* **Active Status:** \`${projectStatus.toUpperCase()}\`\n* **Vault Access:** Work DNA blueprint, technical architecture, deadline schedules, and PayPal escrow records.\n\nAsk any question below about deadlines, tech stack, milestones, or payments.`,
      timestamp: new Date().toISOString(),
      suggestedActions: [
        { label: '🌐 Multi-Perspective Summary', action: 'Give me a multi-perspective summary of this project' },
        { label: '🛠️ Inspect Tech Stack', action: 'What is the tech stack and architecture of this project?' },
        { label: '⏱️ Deadlines & Timeline', action: 'What is the project deadline and milestone schedule?' },
        { label: '💰 Financial & Escrow Status', action: 'What is our financial and escrow status?' },
        { label: '🔍 Check Deliverables', action: 'Are deliverables ready for payment release?' },
      ],
    },
  ]);

  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
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
  }, [isOpen, messages, onClose]);

  const handleSendMessage = async (textToSend?: string) => {
    const question = textToSend || inputQuestion.trim();
    if (!question || loading) return;

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
        {/* Sticky Fixed Header (Always visible at top of window) */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-800 bg-[#111827] flex items-center justify-between sticky top-0 z-20 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-indigo-900/40 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                  Project Vault Copilot
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-bold">
                  ● Live Context
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
            title="Close Copilot"
            aria-label="Close Copilot Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Message History (Scrolls cleanly inside window) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs min-h-0 overscroll-contain">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role !== 'user' && (
                <div className="w-8 h-8 rounded-xl bg-indigo-950 border border-indigo-700/60 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`p-4 rounded-2xl max-w-[88%] space-y-2 shadow-lg leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-none font-semibold'
                    : 'bg-slate-900/90 border border-slate-800 text-slate-100 rounded-tl-none'
                }`}
              >
                {/* Clean bold markdown rendered content */}
                <div className="text-xs leading-relaxed space-y-1">
                  {msg.role === 'user' ? (
                    <span className="font-semibold text-white">{msg.content}</span>
                  ) : (
                    renderFormattedContent(msg.content)
                  )}
                </div>

                {/* Suggested Action Quick Chips */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="pt-2.5 mt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                    {msg.suggestedActions.map((chip, chipIdx) => (
                      <button
                        key={chipIdx}
                        onClick={() => handleSendMessage(chip.action)}
                        disabled={loading}
                        className="text-[10px] px-2.5 py-1 bg-slate-950 hover:bg-indigo-950 border border-slate-700/80 hover:border-indigo-500/60 text-indigo-300 font-bold rounded-lg transition text-left flex items-center gap-1 disabled:opacity-50 hover:scale-[1.02]"
                      >
                        <span>{chip.label}</span>
                        <ArrowUpRight className="w-2.5 h-2.5 text-indigo-400" />
                      </button>
                    ))}
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
              <div className="w-8 h-8 rounded-xl bg-indigo-950 border border-indigo-700/60 flex items-center justify-center text-indigo-400 shrink-0">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none text-slate-300 text-xs font-semibold flex items-center gap-2 shadow-md">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Analyzing project vault and synthesizing response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Sticky Fixed Bottom Input Bar (Always visible at bottom of window) */}
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
              placeholder="Ask anything about milestones, deliverables, code, or payments..."
              className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-medium placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !inputQuestion.trim()}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold rounded-xl transition flex items-center justify-center disabled:opacity-50 shadow-md shadow-indigo-900/40 shrink-0 hover:scale-105 active:scale-95"
              title="Send to Copilot"
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
            <span className="text-emerald-400">Deterministic Escrow Active</span>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(drawerElement, document.body);
};
