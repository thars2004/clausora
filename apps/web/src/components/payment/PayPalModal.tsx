import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { api } from '../../api/client';
import { Milestone, PaymentRecord } from '@clausora/shared';
import { CheckCircle2, ShieldCheck, ExternalLink, Loader2, CreditCard, Sparkles } from 'lucide-react';

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
  const [step, setStep] = useState<'create' | 'approve' | 'capturing' | 'success'>('create');
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string>('');
  const [paymentId, setPaymentId] = useState<string>('');
  const [approveUrl, setApproveUrl] = useState<string>('');
  const [captureId, setCaptureId] = useState<string>('');
  const [error, setError] = useState<string>('');

  const amountDollars = (milestone.amountMinor / 100).toFixed(2);

  const handleCreateOrder = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/payments/milestones/${milestone.id}/create-order`);
      const { payment, orderId: oid, approveUrl: aUrl } = res.data.data;
      setOrderId(oid);
      setPaymentId(payment.id);
      setApproveUrl(aUrl || `https://www.sandbox.paypal.com/checkoutnow?token=${oid}`);
      setStep('approve');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create PayPal sandbox order.');
    } finally {
      setLoading(false);
    }
  };

  const handleCaptureOrder = async () => {
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
      title="PayPal Milestone Payment Release"
      subtitle="Orders v2 Sandbox Integration"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Banner Notice */}
        <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3.5 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200/90 leading-relaxed">
            <span className="font-semibold text-amber-300">Sandbox Environment Guardrail:</span> All payments run via PayPal Sandbox Orders v2. No real money or card numbers are processed. Server verifies capture before marking milestone as PAID.
          </div>
        </div>

        {/* Milestone Summary Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Milestone</span>
            <Badge variant="primary">{milestone.currency}</Badge>
          </div>
          <h4 className="text-base font-semibold text-slate-100">{milestone.title}</h4>
          <div className="flex items-baseline justify-between pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-400">Total Authorized Amount:</span>
            <span className="text-2xl font-bold text-white font-mono">
              ${amountDollars} <span className="text-xs text-slate-400 font-normal">{milestone.currency}</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Step 1: Create Order */}
        {step === 'create' && (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-300 leading-relaxed">
              Upon your click, Clausora backend requests an OAuth2 token and initializes an order on PayPal Sandbox with exact minor units ({milestone.amountMinor} {milestone.currency}).
            </p>
            <button
              onClick={handleCreateOrder}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#0070BA] hover:bg-[#005ea6] text-white font-semibold rounded-xl transition shadow-lg shadow-blue-900/20 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Sandbox Order...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Initialize PayPal Sandbox Order
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 2: Approve & Capture */}
        {step === 'approve' && (
          <div className="space-y-4 pt-1">
            <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5 font-mono text-xs">
              <div className="text-slate-400 flex justify-between">
                <span>PayPal Order ID:</span>
                <span className="text-indigo-400 font-bold">{orderId}</span>
              </div>
              <div className="text-slate-400 flex justify-between">
                <span>Internal Ref:</span>
                <span className="text-slate-300">{paymentId}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Order created. In a production checkout, client reviews on PayPal. Click below to verify and capture the payment on the Clausora backend server.
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
                onClick={handleCaptureOrder}
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
                    Verify & Capture Payment (${amountDollars})
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Capturing */}
        {step === 'capturing' && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            <h4 className="text-sm font-semibold text-slate-200">Verifying Sandbox Order with PayPal API...</h4>
            <p className="text-xs text-slate-400 max-w-xs">
              Direct server-to-server call to /v2/checkout/orders/{orderId}/capture.
            </p>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="py-4 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40 verified-glow">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">Payment Captured & Verified!</h4>
              <p className="text-xs text-slate-300 mt-1">
                Milestone released successfully. Cryptographic audit event appended to timeline.
              </p>
            </div>

            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl font-mono text-xs space-y-1 text-left">
              <div className="text-slate-400 flex justify-between">
                <span>Capture ID:</span>
                <span className="text-emerald-400 font-bold">{captureId}</span>
              </div>
              <div className="text-slate-400 flex justify-between">
                <span>Amount:</span>
                <span className="text-white">${amountDollars} {milestone.currency}</span>
              </div>
              <div className="text-slate-400 flex justify-between">
                <span>Status:</span>
                <span className="text-emerald-400 font-bold">PAID (Server Verified)</span>
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
