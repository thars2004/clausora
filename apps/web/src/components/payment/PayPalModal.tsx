import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../api/client';
import { Milestone } from '@clausora/shared';
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  CreditCard,
  Zap,
  AlertCircle,
} from 'lucide-react';

interface PayPalModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestone: Milestone;
  milestonesList?: Milestone[];
  fullProjectAmountDollars?: string;
  projectRemainingDollars?: string;
  hasProof?: boolean;
  assignedProviderName?: string;
  onSelectMilestone?: (ms: Milestone) => void;
  onPaymentSuccess: () => void;
}

export const PayPalModal: React.FC<PayPalModalProps> = ({
  isOpen,
  onClose,
  milestone,
  fullProjectAmountDollars,
  projectRemainingDollars,
  hasProof = true,
  assignedProviderName,
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
  const fullAmountToDisplay = fullProjectAmountDollars || totalDollars;

  const alreadyPaidMinor = milestone.paidMinor || (milestone.status === 'PAID' ? totalMinor : 0);
  const remainingMinor = Math.max(0, totalMinor - alreadyPaidMinor);
  const remainingDollars = projectRemainingDollars !== undefined
    ? projectRemainingDollars
    : (remainingMinor / 100).toFixed(2);

  // Manually editable amount input (defaults to remaining due or full amount)
  const [enteredAmount, setEnteredAmount] = useState<string>(remainingDollars);
  const [lastPaidDollars, setLastPaidDollars] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const initialAmount =
        parseFloat(remainingDollars) > 0 ? remainingDollars : fullAmountToDisplay;
      setEnteredAmount(initialAmount);
      setStep('input');
      setError('');
      setLoading(false);
      setOrderId('');
      setPaymentId('');
      setApproveUrl('');
      setCaptureId('');
    }
  }, [isOpen, milestone.id, remainingDollars, fullAmountToDisplay]);

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
        projectId: milestone.projectId,
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
      subtitle="Escrow Settlement & PayPal Checkout"
      maxWidth="md"
    >
      <div className="space-y-3">
        {/* TOP: Full Authorized Amount Display - Small & Compact */}
        <div className="p-3 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-xl flex items-center justify-between shadow-inner">
          <div>
            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-semibold block">
              Full Authorized Amount
            </span>
            <div className="text-base font-bold font-mono text-white mt-0.5">
              ${fullAmountToDisplay} <span className="text-[10px] text-slate-400 font-normal">{milestone.currency || 'USD'}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider font-semibold block">
              Remaining Due
            </span>
            <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
              ${remainingDollars}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-2 bg-rose-950/60 border border-rose-800 text-rose-300 text-[11px] rounded-lg flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {!hasProof && (
          <div className="p-2.5 bg-amber-950/60 border border-amber-800/80 text-amber-200 text-xs rounded-xl flex items-start gap-2 shadow-sm">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="block font-semibold text-amber-300">Work Proof Required Before Payment</strong>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                The assigned provider <span className="font-semibold text-white">({assignedProviderName || 'Alex Rivera'})</span> must submit verifiable work proof for this deliverable before escrow funds can be authorized for release.
              </p>
            </div>
          </div>
        )}

        {/* STEP 1: Manually Editable Amount Input & Action Buttons */}
        {step === 'input' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <label className="font-medium text-slate-300">Payment Amount</label>
                <div className="flex items-center gap-1.5">
                  {remainingDollars !== fullAmountToDisplay && parseFloat(remainingDollars) > 0 && (
                    <button
                      type="button"
                      onClick={() => setEnteredAmount(remainingDollars)}
                      className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium transition"
                    >
                      Pay Remaining (${remainingDollars})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEnteredAmount(fullAmountToDisplay)}
                    className="text-[9px] font-mono px-2 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold transition"
                  >
                    Pay Full (${fullAmountToDisplay})
                  </button>
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-xs">
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
                  className="w-full pl-6 pr-12 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-500 transition"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-semibold text-slate-400">
                  {milestone.currency || 'USD'}
                </span>
              </div>
            </div>

            {/* Action Buttons: Instant Pay (Emerald) & PayPal Sandbox (PayPal Blue) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
              <button
                type="button"
                onClick={handleDemoPay}
                disabled={loading || !isInputValid || !hasProof}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow disabled:opacity-40 disabled:cursor-not-allowed"
                title={!hasProof ? 'Work proof required from provider before payment' : undefined}
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>{!hasProof ? 'Proof Required' : `Instant Pay ($${enteredAmount || '0.00'})`}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePayPalCheckout}
                disabled={loading || !isInputValid || !hasProof}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#0070BA] hover:bg-[#005ea6] text-white text-xs font-bold rounded-xl transition shadow disabled:opacity-40 disabled:cursor-not-allowed"
                title={!hasProof ? 'Work proof required from provider before payment' : undefined}
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-3.5 h-3.5 text-white" />
                    <span>{!hasProof ? 'Proof Required' : `PayPal Sandbox ($${enteredAmount || '0.00'})`}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PayPal Approve & Capture - Compact */}
        {step === 'approve' && (
          <div className="space-y-2.5 pt-0.5">
            <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[11px] flex justify-between">
              <span className="text-slate-400">PayPal Order ID:</span>
              <span className="text-indigo-400 font-bold">{orderId}</span>
            </div>

            <div className="flex gap-2">
              <a
                href={approveUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
              >
                <span>Authorize</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                onClick={handleCapturePayPal}
                disabled={loading}
                className="flex-[2] flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm & Capture'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Capturing - Compact */}
        {step === 'capturing' && (
          <div className="py-4 flex flex-col items-center justify-center space-y-1.5">
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
            <p className="text-[11px] text-slate-300">Capturing payment...</p>
          </div>
        )}

        {/* STEP 4: Success - Compact */}
        {step === 'success' && (
          <div className="py-1 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <div>
              <h4 className="text-xs font-bold text-white">Payment Confirmed</h4>
              <p className="text-[11px] text-emerald-400 font-mono mt-0.5">
                ${lastPaidDollars} {milestone.currency || 'USD'} settled
              </p>
              {captureId && (
                <span className="text-[9px] font-mono text-slate-400 block mt-0.5">
                  Ref: {captureId}
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
