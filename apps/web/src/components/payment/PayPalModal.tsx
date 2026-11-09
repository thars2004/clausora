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

  // Manually editable amount
  const [enteredAmount, setEnteredAmount] = useState<string>(remainingDollars);
  const [lastPaidDollars, setLastPaidDollars] = useState<string>('');

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
    }
  }, [isOpen, milestone.id, milestone.paidMinor, milestone.status, totalMinor]);

  const parsedMinor = Math.round((parseFloat(enteredAmount) || 0) * 100);
  const isInputValid = !isNaN(parsedMinor) && parsedMinor > 0 && parsedMinor <= remainingMinor;

  // 1. Instant Demo Payment
  const handleDemoPay = async () => {
    if (!isInputValid) {
      setError(`Enter an amount between $0.01 and $${remainingDollars}.`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/payments/milestones/${milestone.id}/demo-pay`, {
        amountMinor: parsedMinor,
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
      setError(`Enter an amount between $0.01 and $${remainingDollars}.`);
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
      title="Payment"
      subtitle={milestone.title}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Compact Balance Summary */}
        <div className="flex items-center justify-between p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Total</span>
            <span className="font-bold text-slate-300">${totalDollars}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Paid</span>
            <span className="font-bold text-emerald-400">${alreadyPaidDollars}</span>
          </div>
          <div className="text-right">
            <span className="text-indigo-400 block text-[10px] uppercase font-bold">Remaining Due</span>
            <span className="font-bold text-white text-sm">${remainingDollars}</span>
          </div>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Manually Editable Amount Input & Pay Actions */}
        {step === 'input' && (
          remainingMinor <= 0 ? (
            <div className="p-4 text-center bg-emerald-950/30 border border-emerald-800/60 rounded-xl space-y-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
              <p className="text-xs font-bold text-white">Fully Paid</p>
              <p className="text-[11px] text-slate-400">${totalDollars} settled.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-semibold text-slate-200">Payment Amount</label>
                  <button
                    type="button"
                    onClick={() => setEnteredAmount(remainingDollars)}
                    className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300"
                  >
                    Set Max (${remainingDollars})
                  </button>
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
                    className="w-full pl-8 pr-16 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-base font-mono font-bold text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                    {milestone.currency || 'USD'}
                  </span>
                </div>
              </div>

              {/* Direct Payment Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleDemoPay}
                  disabled={loading || !isInputValid}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Instant Pay (${enteredAmount || '0.00'})</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePayPalCheckout}
                  disabled={loading || !isInputValid}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#0070BA] hover:bg-[#005ea6] text-white text-xs font-bold rounded-xl transition shadow disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>PayPal Sandbox (${enteredAmount || '0.00'})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )
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
