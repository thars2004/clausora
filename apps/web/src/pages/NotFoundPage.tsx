import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Compass,
  ArrowLeft,
  Home,
  LayoutDashboard,
  FolderGit2,
  ShieldAlert,
  Terminal,
} from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col items-center justify-between p-4 sm:p-8 selection:bg-indigo-600 selection:text-white relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/15 via-purple-600/10 to-rose-600/10 blur-3xl -z-10 rounded-full" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-indigo-500/10 blur-3xl -z-10 rounded-full" />

      {/* Top Brand Bar */}
      <header className="w-full max-w-5xl flex items-center justify-between py-4">
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

        <div className="flex items-center gap-2 text-xs">
          {user ? (
            <Link
              to="/dashboard"
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition flex items-center gap-1.5"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dashboard</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-sm"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* 404 Main Card */}
      <main className="w-full max-w-2xl my-auto py-12 flex flex-col items-center text-center">
        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-rose-300 mb-6 shadow-inner">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span className="font-mono font-bold">STATUS 404</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">UNRESOLVED ROUTE</span>
        </div>

        {/* 404 Numbers with Gradient */}
        <div className="relative select-none">
          <span className="text-8xl sm:text-9xl font-black font-mono tracking-tighter bg-gradient-to-b from-white via-slate-300 to-slate-700 bg-clip-text text-transparent opacity-90 drop-shadow-2xl">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <Compass className="w-16 h-16 sm:w-20 sm:h-20 text-indigo-400/40 animate-pulse" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-4 tracking-tight">
          Page Not Found
        </h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
          The destination route or cryptographic milestone you are seeking does not exist or has been relocated within the Clausora network.
        </p>

        {/* Diagnostics Terminal Snippet */}
        <div className="w-full max-w-md mt-6 p-3.5 bg-slate-950/80 border border-slate-800/90 rounded-2xl text-left font-mono text-[11px] space-y-1 shadow-xl">
          <div className="flex items-center justify-between text-slate-500 border-b border-slate-800/60 pb-1.5 mb-1.5">
            <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <Terminal className="w-3 h-3 text-indigo-400" />
              <span>ROUTING TRACE</span>
            </span>
            <span className="text-[9px] text-slate-500">HTTP_ERR_NOT_FOUND</span>
          </div>
          <div className="text-slate-400 flex items-center gap-2 truncate">
            <span className="text-indigo-400">Target:</span>
            <span className="text-slate-200 truncate">{location.pathname}</span>
          </div>
          <div className="text-slate-500 text-[10px]">
            Timestamp: {new Date().toISOString()}
          </div>
        </div>

        {/* Navigation Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
          {user ? (
            <Link
              to="/dashboard"
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/25"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Go to Dashboard</span>
            </Link>
          ) : (
            <Link
              to="/"
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/25"
            >
              <Home className="w-4 h-4" />
              <span>Go to Home</span>
            </Link>
          )}

          {user && (
            <Link
              to="/projects"
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl border border-slate-800 transition"
            >
              <FolderGit2 className="w-4 h-4 text-indigo-400" />
              <span>View Projects</span>
            </Link>
          )}

          <button
            onClick={() => navigate(-1)}
            type="button"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium rounded-xl border border-slate-800 transition"
            title="Go back to previous page"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl text-center py-4 border-t border-slate-800/60 text-xs text-slate-500">
        <p>Clausora — AI Work Intelligence & PayPal Milestone Escrow Layer</p>
      </footer>
    </div>
  );
};

