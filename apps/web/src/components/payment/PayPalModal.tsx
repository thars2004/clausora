import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { api } from '../../api/client';
import { Milestone } from '@clausora/shared';
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  CreditCard,
  Zap,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';

interface PayPalModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestone: Milestone;
  milestonesList?: Milestone[];
  fullProjectAmountDollars?: string;
  onSelectMilestone?: (ms: Milestone) => void;
  onPaymentSuccess: () => void;
}

export const PayPalModal: React.FC<PayPalModalProps> = ({
  isOpen,
  onClose,
  milestone,
  milestonesList = [],
  fullProjectAmountDollars,
  onSelectMilestone,
  onPaymentSuccess,
}) => {
  const [step, setStep] = useState<'input' | 'approve' | 'capturing' | 'success'>('input');
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string>('');
  const [paymentId, setPaymentId] = useState<string>('');
  const [approveUrl, setApproveUrl] = useState<string>('');
  const [captureId, setCaptureId] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Calculations
  const totalMinor = milestone.amountMinor || 0;
  const totalDollars = (totalMinor / 100).toFixed(2);
  const alreadyPaidMinor = milestone.paidMinor || (milestone.status === 'PAID' ? totalMinor : 0);
  const alreadyPaidDollars = (alreadyPaidMinor / 100).toFixed(2);
  const remainingMinor = Math.max(0, totalMinor - alreadyPaidMinor);
  const remainingDollars = (remainingMinor / 100).toFixed(2);

  // Full amount to display (defaults to full project amount or milestone total)
  const fullAmountToDisplay = fullProjectAmountDollars || totalDollars;

  // Manually editable amount input (defaults to full remaining / full amount)
  const [enteredAmount, setEnteredAmount] = useState<string>(remainingDollars);
  const [lastPaidDollars, setLastPaidDollars] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const rem = Math.max(0, totalMinor - (milestone.paidMinor || (milestone.status === 'PAID' ? totalMinor : 0)));
      const initialAmount = rem > 0 ? (rem / 100).toFixed(2) : (fullProjectAmountDollars || (totalMinor / 100).toFixed(2));
      setEnteredAmount(initialAmount);
      setStep('input');
      setError('');
      setLoading(false);
      setOrderId('');
      setPaymentId('');
      setApproveUrl('');
      setCaptureId('');
    }
  }, [isOpen, milestone.id, milestone.paidMinor, milestone.status, totalMinor, fullProjectAmountDollars]);

  const parsedMinor = Math.round((parseFloat(enteredAmount) || 0) * 100);
  const isInputValid = !isNaN(parsedMinor) && parsedMinor > 0;

  // 1. Instant Demo Payment
  const handleDemoPay = async () => {
    if (!isInputValid) {
      setError(`Please enter a valid payment amount greater than $0.00.`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/payments/milestones/${milestone.id}/demo-pay`, {
        amountMinor: parsedMinor,
        projectId: milestone.projectId,
      });
      setCaptureId(res.data.data?.captureId || 'VERIFIED');
      setLastPaidDollars((parsedMinor / 100).toFixed(2));
      setStep('success');
      onPaymentSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Payment failed.');
    } finally {
      setLoading(false);
    }
  };

  // 2. PayPal Sandbox Checkout
  const handlePayPalCheckout = async () => {
    if (!isInputValid) {
      setError(`Please enter a valid payment amount greater than $0.00.`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/payments/milestones/${milestone.id}/create-order`, {
        amountMinor: parsedMinor,
      });
      const { payment, orderId: oid, approveUrl: aUrl } = res.data.data;
      setOrderId(oid);
      setPaymentId(payment.id);
      setApproveUrl(aUrl || `https://www.sandbox.paypal.com/checkoutnow?token=${oid}`);
      setLastPaidDollars((parsedMinor / 100).toFixed(2));
      setStep('approve');
    } catch (err: any) {
      setError(err.response?.data?.message || 'PayPal checkout failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCapturePayPal = async () => {
    setLoading(true);
    setStep('capturing');
    setError('');
    try {
      const res = await api.post(`/payments/${paymentId}/capture`);
      setCaptureId(res.data.data?.captureId || 'VERIFIED');
      setStep('success');
      onPaymentSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'PayPal capture failed.');
      setStep('approve');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Make a Payment"
      subtitle="Escrow Payout & Sandbox Checkout"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* TOP: Full Authorized Amount Display */}
        <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between shadow-inner">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold block">
              Full Authorized Amount
            </span>
            <div className="text-2xl font-black font-mono text-white mt-0.5">
              ${fullAmountToDisplay} <span className="text-xs text-slate-400 font-normal">{milestone.currency || 'USD'}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider font-semibold block">
              Remaining Due
            </span>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
              ${remainingDollars}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Manually Editable Amount Input & Action Buttons */}
        {step === 'input' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-slate-200">Payment Amount</label>
                <div className="flex items-center gap-1.5">
                  {remainingDollars !== fullAmountToDisplay && parseFloat(remainingDollars) > 0 && (
                    <button
                      type="button"
                      onClick={() => setEnteredAmount(remainingDollars)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold transition"
                    >
                      Milestone Due (${remainingDollars})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEnteredAmount(fullAmountToDisplay)}
                    className="text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold transition"
                  >
                    Pay Full (${fullAmountToDisplay})
                  </button>
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-lg">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={enteredAmount}
                  onChange={(e) => {
                    setEnteredAmount(e.target.value);
                    setError('');
                  }}
                  placeholder="0.00"
                  className="w-full pl-8 pr-16 py-3 bg-slate-950 border border-slate-700 rounded-xl text-lg font-mono font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold text-slate-400">
                  {milestone.currency || 'USD'}
                </span>
              </div>
            </div>

            {/* Changed Button Colors: Instant Pay (Indigo/Violet/Purple) & PayPal Sandbox (PayPal Yellow/Gold) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleDemoPay}
                disabled={loading || !isInputValid}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition hover:scale-[1.01] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>Instant Pay (${enteredAmount || '0.00'})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePayPalCheckout}
                disabled={loading || !isInputValid}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-[#FFC439] hover:bg-[#F2BA36] text-[#003087] text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 border border-[#e5a822] transition hover:scale-[1.01] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 text-[#003087]" />
                    <span>PayPal Sandbox (${enteredAmount || '0.00'})</span>
                  </>
                )}
              </button>
            </div>

            {/* BOTTOM: Target Milestone / Deliverable Information */}
            <div className="pt-3 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-500 tracking-wider">
                  Target Milestone
                </span>
                <Badge
                  variant={
                    milestone.status === 'PAID'
                      ? 'success'
                      : milestone.status === 'PARTIALLY_PAID'
                      ? 'warning'
                      : 'primary'
                  }
                  size="sm"
                >
                  {milestone.status.replace(/_/g, ' ')}
                </Badge>
              </div>

              {milestonesList.length > 1 ? (
                <div className="relative">
                  <select
                    value={milestone.id}
                    onChange={(e) => {
                      const selected = milestonesList.find((m) => m.id === e.target.value);
                      if (selected && onSelectMilestone) {
                        onSelectMilestone(selected);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {milestonesList.map((m, i) => (
                      <option key={m.id} value={m.id}>
                        Phase 0{i + 1}: {m.title} (${(m.amountMinor / 100).toFixed(2)}) — {m.status}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-xs font-semibold text-slate-200">{milestone.title}</div>
                  {milestone.description && (
                    <p className="text-[11px] text-slate-400 line-clamp-1">{milestone.description}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: PayPal Approve & Capture */}
        {step === 'approve' && (
          <div className="space-y-3 pt-1">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs flex justify-between">
              <span className="text-slate-400">PayPal Order ID:</span>
              <span className="text-indigo-400 font-bold">{orderId}</span>
            </div>

            <div className="flex gap-2.5">
              <a
                href={approveUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition"
              >
                <span>Authorize</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={handleCapturePayPal}
                disabled={loading}
                className="flex-[2] flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm & Capture'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Capturing */}
        {step === 'capturing' && (
          <div className="py-6 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            <p className="text-xs text-slate-300">Capturing payment...</p>
          </div>
        )}

        {/* STEP 4: Success */}
        {step === 'success' && (
          <div className="py-2 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <div>
              <h4 className="text-sm font-bold text-white">Payment Confirmed</h4>
              <p className="text-xs text-emerald-400 font-mono mt-0.5">
                ${lastPaidDollars} {milestone.currency || 'USD'} settled
              </p>
              {captureId && (
                <span className="text-[10px] font-mono text-slate-400 block mt-1">
                  Ref: {captureId}
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
