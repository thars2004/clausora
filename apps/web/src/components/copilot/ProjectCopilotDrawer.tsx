import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../api/client';
import { CopilotMessage } from '@clausora/shared';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  User,
  ShieldCheck,
  DollarSign,
  CheckCircle2,
  HelpCircle,
  ArrowUpRight,
  RotateCcw,
} from 'lucide-react';

interface ProjectCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
  projectStatus: string;
}

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
      content: `Hello! I am your **Clausora Project Copilot** for **"${projectTitle}"**.\n\nI have complete contextual access to your Work DNA blueprint, milestone acceptance criteria, submitted evidence, and PayPal escrow records.\n\nHow can I assist you with this workspace today?`,
      timestamp: new Date().toISOString(),
      suggestedActions: [
        { label: '💰 Financial & Escrow Breakdown', action: 'What is our financial and escrow status?' },
        { label: '📊 Milestone Progress Summary', action: 'Summarize our active milestones and progress' },
        { label: '🔍 Check Deliverable Readiness', action: 'Are deliverables ready for payment release?' },
        { label: '🛡️ Plain-English Translation', action: 'Explain what was built in simple words' },
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
      scrollToBottom();
    }
  }, [messages, isOpen]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-[#0F172A] border-l border-slate-800 h-full flex flex-col shadow-2xl animate-slide-left relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-[#111827] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-900/40">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Project Vault Copilot</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-700/50 text-indigo-300">
                  AI Context Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[280px]">
                {projectTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            title="Close Copilot"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role !== 'user' && (
                <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-800/60 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`p-3.5 rounded-2xl max-w-[85%] space-y-2 leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans text-xs">
                  {msg.content}
                </div>

                {/* Suggested Action Chips */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                    {msg.suggestedActions.map((chip, chipIdx) => (
                      <button
                        key={chipIdx}
                        onClick={() => handleSendMessage(chip.action)}
                        disabled={loading}
                        className="text-[10px] px-2.5 py-1 bg-slate-950 hover:bg-indigo-950 border border-slate-700/70 hover:border-indigo-600/50 text-indigo-300 rounded-lg transition text-left flex items-center gap-1 disabled:opacity-50"
                      >
                        <span>{chip.label}</span>
                        <ArrowUpRight className="w-2.5 h-2.5 opacity-60" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start animate-fade-in">
              <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-800/60 flex items-center justify-center text-indigo-400 shrink-0">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none text-slate-400 text-xs flex items-center gap-2">
                <span>Analyzing project vault & synthesizing answer...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-800 bg-[#111827]">
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
              placeholder="Ask anything about milestones, code, or payments..."
              className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !inputQuestion.trim()}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl transition flex items-center justify-center disabled:opacity-50 shadow-md shadow-indigo-900/30"
              title="Send to Copilot"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 px-1 font-mono">
            <span>Powered by Qwen-2.5 & Gemini Flash</span>
            <span>Deterministic Escrow Grounded</span>
          </div>
        </div>
      </div>
    </div>
  );
};
