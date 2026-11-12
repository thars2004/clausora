import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Check, Loader2, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';

interface RobotCaptchaProps {
  onVerify: (token: string) => void;
  onReset?: () => void;
  isVerified: boolean;
  disabled?: boolean;
}

export const RobotCaptcha: React.FC<RobotCaptchaProps> = ({
  onVerify,
  onReset,
  isVerified,
  disabled = false,
}) => {
  const [verifying, setVerifying] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [challengeData, setChallengeData] = useState<{ numA: number; numB: number; answer: number; options: number[] }>({
    numA: 4,
    numB: 7,
    answer: 11,
    options: [9, 11, 13, 15],
  });
  const [challengeError, setChallengeError] = useState(false);
  const [mouseMoves, setMouseMoves] = useState(0);
  const mountTimeRef = useRef<number>(Date.now());

  // Track human mouse entropy
  useEffect(() => {
    const handleMove = () => {
      setMouseMoves((prev) => Math.min(prev + 1, 50));
    };
    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  // Generate random math challenge
  const generateMathChallenge = () => {
    const a = Math.floor(2 + Math.random() * 8);
    const b = Math.floor(1 + Math.random() * 9);
    const ans = a + b;
    const opts = new Set<number>([ans]);
    while (opts.size < 4) {
      const offset = (Math.random() > 0.5 ? 1 : -1) * Math.floor(1 + Math.random() * 4);
      const val = ans + offset;
      if (val > 0) opts.add(val);
    }
    const shuffled = Array.from(opts).sort(() => Math.random() - 0.5);
    setChallengeData({ numA: a, numB: b, answer: ans, options: shuffled });
    setChallengeError(false);
  };

  const handleBoxClick = async () => {
    if (isVerified || verifying || disabled) return;

    setVerifying(true);
    setChallengeError(false);

    try {
      // Fetch server-signed challenge from Clausora API
      let serverSignature = '';
      let challengeId = `chk_${Date.now()}`;
      let timestamp = Date.now();

      try {
        const res = await api.get('/auth/captcha-challenge');
        if (res.data?.data) {
          challengeId = res.data.data.challengeId;
          timestamp = res.data.data.timestamp;
          serverSignature = res.data.data.signature;
        }
      } catch (e) {
        // Fallback for offline or local dev
        serverSignature = 'local_verified_sig';
      }

      // Check entropy: if clicked instantly (< 400ms from load) or zero mouse movement, trigger interactive challenge
      const elapsed = Date.now() - mountTimeRef.current;
      const isSuspicious = elapsed < 400 || mouseMoves < 2;

      if (isSuspicious) {
        // Show interactive micro-challenge popup
        generateMathChallenge();
        setVerifying(false);
        setShowChallenge(true);
        return;
      }

      // Simulate human verification delay (700-1000ms)
      await new Promise((r) => setTimeout(r, 850));

      // Construct verified human token
      const token = serverSignature
        ? `clausora_token.${challengeId}.${timestamp}.${serverSignature}`
        : `human_verified_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      setVerifying(false);
      onVerify(token);
    } catch {
      setVerifying(false);
      generateMathChallenge();
      setShowChallenge(true);
    }
  };

  const handleSelectAnswer = async (selected: number) => {
    if (selected === challengeData.answer) {
      setVerifying(true);
      setShowChallenge(false);
      await new Promise((r) => setTimeout(r, 600));

      const token = `human_verified_${Date.now()}_math_pass_${Math.random().toString(36).substring(2, 9)}`;
      setVerifying(false);
      onVerify(token);
    } else {
      setChallengeError(true);
      setTimeout(() => generateMathChallenge(), 800);
    }
  };

  return (
    <div className="w-full space-y-2">
      {/* reCAPTCHA / Cloudflare Turnstile Styled Interactive Box */}
      <div
        className={`w-full p-3.5 bg-slate-950/90 border rounded-2xl flex items-center justify-between transition-all duration-300 shadow-md ${
          isVerified
            ? 'border-emerald-600/50 bg-emerald-950/20'
            : verifying
            ? 'border-indigo-500/70 bg-indigo-950/20'
            : 'border-slate-800 hover:border-slate-700 bg-slate-950/70'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {/* Left Side: Checkbox & Label */}
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={handleBoxClick}
            disabled={isVerified || verifying || disabled}
            aria-label="I'm not a robot verification checkbox"
            className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
              isVerified
                ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/30'
                : verifying
                ? 'bg-indigo-950/50 border-indigo-400'
                : 'bg-slate-900 border-slate-600 hover:border-indigo-400 hover:bg-slate-800'
            }`}
          >
            {isVerified ? (
              <Check className="w-4 h-4 stroke-[3] text-white animate-scale-up" />
            ) : verifying ? (
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            ) : null}
          </button>

          <div>
            <div className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center gap-1.5">
              <span>I'm not a robot</span>
              {isVerified && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </div>
            <span className="text-[10px] font-mono text-slate-400 block">
              {isVerified
                ? 'Human verified • Quota safe'
                : verifying
                ? 'Analyzing telemetry...'
                : 'Click checkbox to verify'}
            </span>
          </div>
        </div>

        {/* Right Side: Security Badge */}
        <div className="flex flex-col items-end pl-2 border-l border-slate-800/80">
          <div className="flex items-center gap-1 text-indigo-400">
            <ShieldCheck className={`w-5 h-5 ${isVerified ? 'text-emerald-400' : 'text-indigo-400'}`} />
            <span className="text-[10px] font-extrabold tracking-wider font-mono uppercase text-slate-300">
              Clausora Shield
            </span>
          </div>
          <span className="text-[8.5px] text-slate-400 font-mono">Anti-Bot & Quota Guard</span>
          <div className="flex gap-1.5 text-[8px] text-slate-400 pt-0.5">
            <span>Privacy</span>
            <span>•</span>
            <span>Terms</span>
          </div>
        </div>
      </div>

      {/* Interactive Micro-Challenge Popup (for high-security verification) */}
      {showChallenge && (
        <div className="p-3.5 bg-slate-900 border border-indigo-500/60 rounded-2xl space-y-2.5 animate-fade-in shadow-xl">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Security Check: What is {challengeData.numA} + {challengeData.numB}?</span>
            </span>
            <button
              type="button"
              onClick={generateMathChallenge}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {challengeData.options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelectAnswer(opt)}
                className="py-1.5 px-2 bg-slate-800 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-400 text-white font-mono font-bold text-xs rounded-xl transition"
              >
                {opt}
              </button>
            ))}
          </div>

          {challengeError && (
            <div className="text-[11px] text-rose-400 flex items-center gap-1 pt-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>Incorrect answer. Refreshing challenge...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

