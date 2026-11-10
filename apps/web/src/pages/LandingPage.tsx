import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/common/Badge';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Radio,
  Layers,
  LayoutDashboard,
  LogIn,
  PlusCircle,
  Shield,
  Zap,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect to login page instead of directly bypassing to dashboard
  const handleLaunchDemo = (role: 'client' | 'provider' | 'admin') => {
    if (user) {
      if (role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    } else {
      navigate(`/login?demo=${role}`);
    }
  };

  const handleCreateNewProject = () => {
    if (user) {
      navigate('/new-project');
    } else {
      navigate('/login?redirect=/new-project');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col selection:bg-indigo-600 selection:text-white">
      {/* Sleek Landing Header */}
      <header className="h-16 border-b border-slate-800/80 bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-105 transition">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg text-white tracking-tight">CLAUSORA</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 font-semibold">
              AI + PayPal
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-slate-400 hidden sm:inline">
                Signed in as <strong className="text-white">{user.name}</strong>
              </span>
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-indigo-600/20"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-900 rounded-xl transition font-medium"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition shadow-md shadow-indigo-600/20"
              >
                <span>Get Started</span>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 blur-3xl -z-10 rounded-full" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 mb-6 shadow-inner">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Built for the <strong>PayPal AI Hackathon 2026</strong></span>
          <span className="text-slate-500">•</span>
          <span className="text-indigo-400 font-medium font-mono">Orders v2 Sandbox</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
          Understand the work.{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200 bg-clip-text text-transparent">
            Verify the outcome.
          </span>{' '}
          Release the payment.
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Clausora turns unstructured project briefs, documents, and screenshots into verified deliverables, detects scope changes with AI, and releases human-approved PayPal milestone payments.
        </p>

        {/* Quick Launch Buttons: Requires Login */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {user ? (
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition group"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Go to Dashboard ({user.name})</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </Link>
          ) : (
            <button
              onClick={() => handleLaunchDemo('client')}
              type="button"
              className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition group cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Explore Demo (Sign In)</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </button>
          )}

          <button
            onClick={handleCreateNewProject}
            type="button"
            className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold rounded-xl border border-slate-800 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-indigo-400" />
            <span>Create New Project</span>
          </button>
        </div>

        {/* Role Fast-Test Switcher (Shows Login Page) */}
        <div className="mt-8 p-3 max-w-lg mx-auto bg-slate-900/80 border border-slate-800 rounded-xl text-xs flex items-center justify-between gap-3 shadow-sm">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Select Demo Persona:</span>
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleLaunchDemo('client')}
              type="button"
              className="px-2.5 py-1 bg-indigo-950/80 text-indigo-300 rounded-lg border border-indigo-700/50 hover:bg-indigo-900 transition font-medium cursor-pointer"
              title="Sign in as Client (Sarah Chen)"
            >
              Client (Sarah)
            </button>
            <button
              onClick={() => handleLaunchDemo('provider')}
              type="button"
              className="px-2.5 py-1 bg-purple-950/80 text-purple-300 rounded-lg border border-purple-700/50 hover:bg-purple-900 transition font-medium cursor-pointer"
              title="Sign in as Provider (Alex Rivera)"
            >
              Provider (Alex)
            </button>
            <button
              onClick={() => handleLaunchDemo('admin')}
              type="button"
              className="px-2.5 py-1 bg-amber-950/80 text-amber-300 rounded-lg border border-amber-700/50 hover:bg-amber-900 transition font-medium cursor-pointer"
              title="Sign in as Platform Admin (Marcus)"
            >
              Admin Portal
            </button>
          </div>
        </div>
      </section>

      {/* Interactive Workflow Diagram */}
      <section className="py-12 px-4 max-w-7xl mx-auto w-full">
        <div className="text-center mb-8">
          <Badge variant="primary">Deterministic Lifecycle</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold mt-2 text-white">The Clausora Trust Pipeline</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
          {[
            { step: '01', title: 'Work Brief', desc: 'Brief, Doc, or Screenshot', color: 'border-slate-800' },
            { step: '02', title: 'Work DNA', desc: 'Qwen2.5-VL Blueprint', color: 'border-purple-600/50 ai-glow' },
            { step: '03', title: 'Agreement', desc: 'SHA-256 Fingerprint', color: 'border-indigo-600/50' },
            { step: '04', title: 'Evidence Graph', desc: 'Criteria Mapped to Proof', color: 'border-blue-600/50' },
            { step: '05', title: 'Human Review', desc: 'Client Signs Off', color: 'border-amber-600/50' },
            { step: '06', title: 'PayPal Sandbox', desc: 'Orders v2 Capture', color: 'border-[#0070BA]/50 paypal-glow' },
            { step: '07', title: 'Audit Trail', desc: 'Immutable Proof Log', color: 'border-emerald-600/50 verified-glow' },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`p-4 bg-slate-900/70 border ${item.color} rounded-2xl flex flex-col justify-between h-36`}
            >
              <div className="text-[11px] font-mono text-slate-500 font-bold">{item.step}</div>
              <div>
                <h4 className="text-xs font-bold text-slate-100">{item.title}</h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-snug">{item.desc}</p>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-slate-600 mx-auto" />
            </div>
          ))}
        </div>
      </section>

      {/* Key Innovation Pillars */}
      <section className="py-16 px-4 max-w-7xl mx-auto w-full border-t border-slate-800/80">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-800/50 flex items-center justify-center text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Work DNA Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Accepts briefs, technical documents, screenshots, and architecture specifications. Uses Hugging Face Qwen2.5-VL to synthesize structured workstreams, acceptance criteria, and risks.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Evidence Graph</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every deliverable criterion is explicitly linked to proof files, AI advisory observations, and limitation disclosures. Never a black-box percentage score.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-800/50 flex items-center justify-center text-amber-400">
              <Radio className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Scope Drift Radar</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Compares new instructions against the approved SHA-256 agreement. Classifies scope changes, estimates impact, and proposes formal amendments.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#002D62] border border-[#0070BA]/50 flex items-center justify-center text-[#00A6E8]">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">PayPal Orders v2</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Strict payment boundaries: AI never touches money. Only explicit client sign-off triggers PayPal sandbox orders, and server-side capture verification marks milestones paid.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-slate-800/80 px-4 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>Clausora — AI Work Intelligence & Milestone Escrow Orchestration Layer.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <Link to="/maintenance" className="hover:text-white transition">System Status</Link>
            <span>•</span>
            <Link to="/login" className="hover:text-white transition">Sign In</Link>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-slate-600">
          PayPal Developer Sandbox Orders v2 • Hugging Face Inference • Open Source under MIT License
        </p>
      </footer>
    </div>
  );
};
