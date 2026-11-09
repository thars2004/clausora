import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { api } from '../../api/client';
import { Milestone } from '@clausora/shared';
import {
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  Loader2,
  CreditCard,
  Sparkles,
  DollarSign,
  Zap,
  Check,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface PayPalModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestone: Milestone;
  onPaymentSuccess: () => void;
}

export const PayPalModal: React.FC<PayPalModalProps> = ({
  isOpen,
  onClose,
  milestone,
  onPaymentSuccess,
}) => {
  const [paymentMode, setPaymentMode] = useState<'demo' | 'paypal'>('demo');
  const [step, setStep] = useState<'input' | 'approve' | 'capturing' | 'success'>('input');
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string>('');
  const [paymentId, setPaymentId] = useState<string>('');
  const [approveUrl, setApproveUrl] = useState<string>('');
  const [captureId, setCaptureId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [paymentMemo, setPaymentMemo] = useState<string>('');

  // Calculations
  const totalMinor = milestone.amountMinor || 0;
  const totalDollars = (totalMinor / 100).toFixed(2);
  const alreadyPaidMinor = milestone.paidMinor || (milestone.status === 'PAID' ? totalMinor : 0);
  const alreadyPaidDollars = (alreadyPaidMinor / 100).toFixed(2);
  const remainingMinor = Math.max(0, totalMinor - alreadyPaidMinor);
  const remainingDollars = (remainingMinor / 100).toFixed(2);

  // Input amount state in dollars string
  const [enteredAmount, setEnteredAmount] = useState<string>(remainingDollars);
  const [lastPaidAmountDollars, setLastPaidAmountDollars] = useState<string>('');

  // Reset / sync state when modal opens or milestone changes
  useEffect(() => {
    if (isOpen) {
      const rem = Math.max(0, totalMinor - (milestone.paidMinor || (milestone.status === 'PAID' ? totalMinor : 0)));
      setEnteredAmount((rem / 100).toFixed(2));
      setStep('input');
      setError('');
      setLoading(false);
      setOrderId('');
      setPaymentId('');
      setApproveUrl('');
      setCaptureId('');
      setPaymentMemo('');
    }
  }, [isOpen, milestone.id, milestone.paidMinor, milestone.status, totalMinor]);

  const parsedEnteredMinor = Math.round((parseFloat(enteredAmount) || 0) * 100);
  const isInputValid =
    !isNaN(parsedEnteredMinor) &&
    parsedEnteredMinor > 0 &&
    parsedEnteredMinor <= remainingMinor;

  const percentOfRemaining =
    remainingMinor > 0 ? Math.min(100, Math.round((parsedEnteredMinor / remainingMinor) * 100)) : 0;

  const handleQuickSplit = (fraction: number) => {
    if (remainingMinor <= 0) return;
    const splitMinor = Math.round(remainingMinor * fraction);
    setEnteredAmount((splitMinor / 100).toFixed(2));
    setError('');
  };

  // Instant Demo Task Settlement
  const handleExecuteDemoPayment = async () => {
    if (!isInputValid) {
      setError(`Please enter a valid amount between $0.01 and $${remainingDollars}.`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/payments/milestones/${milestone.id}/demo-pay`, {
        amountMinor: parsedEnteredMinor,
        note: paymentMemo || 'Demo task split payout',
      });
      const { captureId: cId } = res.data.data;
      setCaptureId(cId);
      setLastPaidAmountDollars((parsedEnteredMinor / 100).toFixed(2));
      setStep('success');
      onPaymentSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to capture demo task payment.');
    } finally {
      setLoading(false);
    }
  };

  // PayPal Sandbox Orders v2 Checkout Flow
  const handleCreatePayPalOrder = async () => {
    if (!isInputValid) {
      setError(`Please enter a valid amount between $0.01 and $${remainingDollars}.`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/payments/milestones/${milestone.id}/create-order`, {
        amountMinor: parsedEnteredMinor,
      });
      const { payment, orderId: oid, approveUrl: aUrl } = res.data.data;
      setOrderId(oid);
      setPaymentId(payment.id);
      setApproveUrl(aUrl || `https://www.sandbox.paypal.com/checkoutnow?token=${oid}`);
      setLastPaidAmountDollars((parsedEnteredMinor / 100).toFixed(2));
      setStep('approve');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initialize PayPal sandbox order.');
    } finally {
      setLoading(false);
    }
  };

  const handleCapturePayPalOrder = async () => {
    setLoading(true);
    setStep('capturing');
    setError('');
    try {
      const res = await api.post(`/payments/${paymentId}/capture`);
      const { captureId: cId } = res.data.data;
      setCaptureId(cId);
      setStep('success');
      onPaymentSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to capture PayPal sandbox payment.');
      setStep('approve');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Task & Milestone Payment Hub"
      subtitle="Demo Sandbox Settlement & PayPal Orders v2 Split Payouts"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Guardrail Banner */}
        <div className="bg-indigo-950/40 border border-indigo-800/60 rounded-2xl p-3.5 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-200/90 leading-relaxed">
            <span className="font-semibold text-white">Escrow Settlement Hub:</span> Authorized payer can pay custom split amounts for any created task. Choose between instant demo sandbox capture or official PayPal Orders v2 checkout.
          </div>
        </div>

        {/* Task Overview & Financial Breakdown Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
              Selected Task Deliverable
            </span>
            <Badge
              variant={
                milestone.status === 'PAID'
                  ? 'success'
                  : milestone.status === 'PARTIALLY_PAID'
                  ? 'warning'
                  : 'primary'
              }
            >
              {milestone.status.replace(/_/g, ' ')}
            </Badge>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white">{milestone.title}</h4>
            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{milestone.description}</p>
          </div>

          {/* 3-Column Financial Metric Bar */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-center font-mono">
            <div className="p-2.5 bg-slate-950/70 border border-slate-800/60 rounded-xl">
              <span className="text-[10px] text-slate-500 block uppercase">Total Budget</span>
              <span className="text-xs font-bold text-slate-200">${totalDollars}</span>
            </div>
            <div className="p-2.5 bg-slate-950/70 border border-slate-800/60 rounded-xl">
              <span className="text-[10px] text-emerald-400/80 block uppercase">Already Paid</span>
              <span className="text-xs font-bold text-emerald-400">${alreadyPaidDollars}</span>
            </div>
            <div className="p-2.5 bg-slate-950/70 border border-indigo-500/40 rounded-xl bg-indigo-950/20">
              <span className="text-[10px] text-indigo-300 block uppercase">Remaining</span>
              <span className="text-xs font-bold text-white">${remainingDollars}</span>
            </div>
          </div>

          {/* Progress Bar */}
          {totalMinor > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>Settlement Progress</span>
                <span>{Math.min(100, Math.round((alreadyPaidMinor / totalMinor) * 100))}% Paid</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((alreadyPaidMinor / totalMinor) * 100))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Enter Payment Amount & Select Execution Mode */}
        {step === 'input' && (
          <div className="space-y-4">
            {remainingMinor <= 0 ? (
              <div className="p-5 text-center bg-emerald-950/30 border border-emerald-800/60 rounded-2xl space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">This Task is Fully Paid!</h4>
                <p className="text-xs text-slate-300">
                  100% of the authorized escrow amount (${totalDollars} {milestone.currency}) has already been settled and verified.
                </p>
                {milestone.paypalCaptureId && (
                  <span className="inline-block text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-800/60 mt-1">
                    Capture ID: {milestone.paypalCaptureId}
                  </span>
                )}
              </div>
            ) : (
              <>
                {/* Interactive Amount Entry Field */}
                <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <span>Enter Payment / Split Amount ({milestone.currency || 'USD'}):</span>
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">
                      Max: <span className="text-indigo-400 font-bold">${remainingDollars}</span>
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-base">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={remainingDollars}
                      value={enteredAmount}
                      onChange={(e) => {
                        setEnteredAmount(e.target.value);
                        setError('');
                      }}
                      placeholder="0.00"
                      className="w-full pl-8 pr-16 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-base font-mono font-bold text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold text-slate-400">
                      {milestone.currency || 'USD'}
                    </span>
                  </div>

                  {/* Quick Split Percentage Buttons */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                      Quick Split Options:
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickSplit(0.25)}
                        className="py-1.5 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-[11px] font-mono text-slate-300 hover:text-white transition"
                      >
                        25% (${((remainingMinor * 0.25) / 100).toFixed(2)})
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickSplit(0.5)}
                        className="py-1.5 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-[11px] font-mono text-slate-300 hover:text-white transition"
                      >
                        50% (${((remainingMinor * 0.5) / 100).toFixed(2)})
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickSplit(0.75)}
                        className="py-1.5 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-[11px] font-mono text-slate-300 hover:text-white transition"
                      >
                        75% (${((remainingMinor * 0.75) / 100).toFixed(2)})
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickSplit(1.0)}
                        className="py-1.5 px-2 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700/60 rounded-xl text-[11px] font-mono text-indigo-200 hover:text-white font-bold transition"
                      >
                        Full (${remainingDollars})
                      </button>
                    </div>
                  </div>

                  {/* Payment Note / Memo */}
                  <div className="pt-1">
                    <input
                      type="text"
                      placeholder="Optional payout note or memo (e.g. Sprint 1 deliverable split)"
                      value={paymentMemo}
                      onChange={(e) => setPaymentMemo(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Payment Gateway / Execution Choice */}
                <div className="space-y-2">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block px-1">
                    Select Execution Mode:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMode('demo')}
                      className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 ${
                        paymentMode === 'demo'
                          ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/10'
                          : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>Demo Sandbox Payment</span>
                          <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800/50 px-1.5 py-0.2 rounded font-mono">
                            Instant
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight">
                          Immediate simulated release with server capture ID and real-time settled ledger sync.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMode('paypal')}
                      className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 ${
                        paymentMode === 'paypal'
                          ? 'bg-blue-950/40 border-[#0070BA] shadow-md shadow-blue-500/10'
                          : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-[#0070BA] flex items-center justify-center shrink-0 mt-0.5">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>PayPal Sandbox</span>
                          <span className="text-[9px] bg-blue-950 text-blue-300 border border-blue-800/50 px-1.5 py-0.2 rounded font-mono">
                            Orders v2
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight">
                          Generates PayPal Sandbox order token for OAuth2 approval flow.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="pt-2">
                  {paymentMode === 'demo' ? (
                    <button
                      type="button"
                      onClick={handleExecuteDemoPayment}
                      disabled={loading || !isInputValid}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-900/30 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing Demo Settlement...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          <span>Release Demo Payment (${(parsedEnteredMinor / 100).toFixed(2)} {milestone.currency})</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCreatePayPalOrder}
                      disabled={loading || !isInputValid}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold rounded-xl transition shadow-lg shadow-blue-900/30 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating PayPal Order...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          <span>Initialize PayPal Order (${(parsedEnteredMinor / 100).toFixed(2)} {milestone.currency})</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 2: PayPal Approve & Server Capture */}
        {step === 'approve' && (
          <div className="space-y-4 pt-1">
            <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5 font-mono text-xs">
              <div className="text-slate-400 flex justify-between">
                <span>PayPal Order ID:</span>
                <span className="text-indigo-400 font-bold">{orderId}</span>
              </div>
              <div className="text-slate-400 flex justify-between">
                <span>Split Amount:</span>
                <span className="text-white font-bold">${lastPaidAmountDollars} {milestone.currency}</span>
              </div>
              <div className="text-slate-400 flex justify-between">
                <span>Internal Ref:</span>
                <span className="text-slate-300">{paymentId}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Order initialized. In a live workflow, client signs in on PayPal Sandbox. Click below to verify and capture the payment on the Clausora backend server.
            </p>

            <div className="flex gap-3">
              <a
                href={approveUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition"
              >
                <span>View Sandbox Flow</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={handleCapturePayPalOrder}
                disabled={loading}
                className="flex-[2] flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-emerald-900/30"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Capturing with Server...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verify & Capture (${lastPaidAmountDollars})
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Capturing */}
        {step === 'capturing' && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            <h4 className="text-sm font-semibold text-slate-200">Verifying Sandbox Order with PayPal API...</h4>
            <p className="text-xs text-slate-400 max-w-xs">
              Direct server-to-server call to /v2/checkout/orders/{orderId}/capture.
            </p>
          </div>
        )}

        {/* STEP 4: Success */}
        {step === 'success' && (
          <div className="py-4 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40 verified-glow">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">Payment Captured & Verified!</h4>
              <p className="text-xs text-slate-300 mt-1">
                Payout released successfully. Cryptographic audit event appended to timeline.
              </p>
            </div>

            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl font-mono text-xs space-y-1.5 text-left">
              <div className="text-slate-400 flex justify-between">
                <span>Capture Reference:</span>
                <span className="text-emerald-400 font-bold">{captureId}</span>
              </div>
              <div className="text-slate-400 flex justify-between">
                <span>Amount Paid:</span>
                <span className="text-white font-bold">${lastPaidAmountDollars} {milestone.currency}</span>
              </div>
              <div className="text-slate-400 flex justify-between">
                <span>Settlement Status:</span>
                <span className="text-emerald-400 font-bold">Server Verified (Captured)</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
            >
              Done & Return to Workspace
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
