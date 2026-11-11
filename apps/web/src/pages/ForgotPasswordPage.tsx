import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { LogoIcon } from '../components/common/Logo';
import {
  ArrowLeft,
  Mail,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  // Wizard step: 1 = Email, 2 = Verify OTP & Reset Password, 3 = Success
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form fields
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Dev helpers
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Status & feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Step 1: Submit email to request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');
    setInfoMessage('');

    try {
      const res = await api.post('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });

      if (res.data?.data?.devOtp) {
        setDevOtp(res.data.data.devOtp);
      }
      setInfoMessage(res.data?.message || 'Verification code sent to your email.');
      setStep(2);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Failed to send recovery code. Please check that your email is registered.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Resend OTP
  const handleResendOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });
      if (res.data?.data?.devOtp) {
        setDevOtp(res.data.data.devOtp);
      }
      setInfoMessage('A new recovery code has been sent to your email.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit OTP & Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanOtp = otp.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setError('Please enter a valid 6-digit numeric recovery code.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        otp: cleanOtp,
        newPassword,
      });

      setStep(3);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Failed to reset password. The recovery code may be invalid or expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Calculate password strength
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-700' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2 || score === 3) return { score: 2, label: 'Good', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[320px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/20 to-blue-600/20 blur-3xl -z-10 rounded-full" />

      {/* Top Navigation */}
      <div className="w-full max-w-md mb-4 flex justify-between items-center text-xs">
        <Link
          to="/login"
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition" />
          <span>Back to Sign In</span>
        </Link>
        <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider font-semibold">
          Clausora Security
        </span>
      </div>

      {/* Main Recovery Card */}
      <div className="w-full max-w-md p-7 sm:p-8 bg-[#111827]/90 border border-slate-800 rounded-3xl shadow-2xl space-y-6 backdrop-blur-sm">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block group">
            <LogoIcon className="w-14 h-14 mx-auto group-hover:scale-105 transition duration-200 drop-shadow-xl" />
          </Link>
          <h2 className="text-2xl font-extrabold text-white">
            {step === 1 && 'Recover Your Password'}
            {step === 2 && 'Verify Code & Set Password'}
            {step === 3 && 'Password Reset Complete'}
          </h2>
          <p className="text-xs text-slate-400">
            {step === 1 && 'Enter your registered email address to receive a 6-digit OTP verification code.'}
            {step === 2 && `Enter the 6-digit code sent to ${email} and choose a secure new password.`}
            {step === 3 && 'Your Clausora account credentials have been updated securely.'}
          </p>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="flex items-center justify-center gap-2 pt-1 pb-2">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step >= 1 ? 'w-10 bg-indigo-500' : 'w-4 bg-slate-800'
            }`}
          />
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step >= 2 ? 'w-10 bg-indigo-500' : 'w-4 bg-slate-800'
            }`}
          />
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step === 3 ? 'w-10 bg-emerald-500' : 'w-4 bg-slate-800'
            }`}
          />
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3.5 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && step === 2 && (
          <div className="p-3.5 bg-indigo-950/50 border border-indigo-800/60 text-indigo-300 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
            <Mail className="w-4 h-4 shrink-0 text-indigo-400" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Dev OTP Helper Badge */}
        {devOtp && step === 2 && (
          <div className="p-3 bg-amber-950/40 border border-amber-700/50 rounded-xl space-y-1.5 animate-fade-in">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-amber-300 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Dev / Testing Mode OTP:</span>
              </span>
              <button
                type="button"
                onClick={() => setOtp(devOtp)}
                className="text-[10px] text-amber-300 underline hover:text-amber-200 font-mono"
              >
                Autofill
              </button>
            </div>
            <div className="font-mono text-center tracking-widest text-lg font-bold text-amber-200 bg-amber-900/30 py-1 rounded-lg border border-amber-800/40">
              {devOtp}
            </div>
          </div>
        )}

        {/* STEP 1: Enter Email Form */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Quick Demo Fill Buttons */}
            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>Try with demo account:</span>
              <div className="flex gap-1.5 font-mono">
                <button
                  type="button"
                  onClick={() => setEmail('client@clausora.dev')}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded transition text-[10px]"
                >
                  Client
                </button>
                <button
                  type="button"
                  onClick={() => setEmail('provider@clausora.dev')}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded transition text-[10px]"
                >
                  Provider
                </button>
                <button
                  type="button"
                  onClick={() => setEmail('admin@clausora.dev')}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded transition text-[10px]"
                >
                  Admin
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.01]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Recovery Code...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Send Recovery Code</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Enter OTP & New Password Form */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {/* 6-Digit OTP Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  6-Digit Recovery Code
                </label>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Resend code</span>
                </button>
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-center text-lg font-mono font-bold tracking-[0.4em] text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                required
                autoFocus
              />
              <span className="block text-[10px] text-slate-500 mt-1 text-center">
                Code expires in 10 minutes (single-use)
              </span>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                New Password (minimum 8 characters)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength meter */}
              {newPassword && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Strength:</span>
                    <span className="font-semibold text-slate-300">{strength.label}</span>
                  </div>
                  <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strength.color} transition-all duration-300`}
                      style={{ width: `${(strength.score / 3) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <span className="text-[10px] text-rose-400 mt-1 block">
                  Passwords do not match
                </span>
              )}
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || otp.length !== 6 || newPassword.length < 8}
                className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.01]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Success Confirmation Card */}
        {step === 3 && (
          <div className="text-center space-y-5 animate-fade-in py-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-950/70 border border-emerald-700/50 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-950/50">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white">Password Updated Successfully!</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your account password has been updated and hashed with bcrypt. A confirmation notification has also been dispatched to your email address.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
              >
                <span>Proceed to Sign In</span>
                <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-800/80">
          Remember your password?{' '}
          <Link to="/login" className="text-indigo-400 hover:underline font-semibold">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
