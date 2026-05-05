import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle2, XCircle, Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VerifyReceiptProps {
  onBack: () => void;
}

const API = 'https://blissful-exploration-production.up.railway.app';

export function VerifyReceipt({ onBack }: VerifyReceiptProps) {
  const [reference, setReference] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [result, setResult] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle');
  const [booking, setBooking] = useState<any>(null);

  const generateCode = (ref: string, amount: number, company: string) => {
    const raw = `${ref}|${amount}|${company}|VAAMOOSE2025`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const hex = Math.abs(hash).toString(16).toUpperCase().padStart(12, '0');
    return `VAM-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
  };

  const handleVerify = async () => {
    if (!reference.trim() || !verificationCode.trim()) return;
    setResult('loading');
    setBooking(null);

    try {
      const res = await fetch(`${API}/api/payment/verify-receipt/${reference.trim().toLowerCase()}`);
      const data = await res.json();

      if (!res.ok || !data.booking) {
        setResult('invalid');
        return;
      }

      const b = data.booking;
      const expectedCode = generateCode(
        reference.trim().toLowerCase(),
        b.amountPaid || b.totalPrice,
        b.companyName
      );

      if (verificationCode.trim().toUpperCase() === expectedCode) {
        setBooking(b);
        setResult('valid');
      } else {
        setResult('invalid');
      }
    } catch {
      setResult('invalid');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-lg mx-auto">

        <Button variant="outline" onClick={onBack} className="flex items-center gap-2 mb-8">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Verify Receipt</h1>
          <p className="text-slate-500 text-sm mt-2">Enter the details from your receipt to confirm it is genuine</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Transaction Reference</label>
            <input
              type="text"
              placeholder="e.g. mtp607x6ae"
              value={reference}
              onChange={(e) => { setReference(e.target.value); setResult('idle'); }}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Verification Code</label>
            <input
              type="text"
              placeholder="e.g. VAM-XXXX-XXXX-XXXX"
              value={verificationCode}
              onChange={(e) => { setVerificationCode(e.target.value); setResult('idle'); }}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
            />
          </div>
          <Button
            onClick={handleVerify}
            disabled={result === 'loading' || !reference || !verificationCode}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 flex items-center justify-center gap-2"
          >
            {result === 'loading' ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Verifying...</>
            ) : (
              <><Search className="w-4 h-4" /> Verify Receipt</>
            )}
          </Button>
        </div>

        {/* Result */}
        {result === 'valid' && booking && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              <div>
                <h3 className="font-bold text-emerald-800 text-lg">Receipt is Genuine ✓</h3>
                <p className="text-emerald-600 text-sm">This receipt is verified and untampered</p>
              </div>
            </div>
            <div className="space-y-2 bg-white rounded-xl p-4 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Company</span><span className="font-semibold">{booking.companyName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Route</span><span className="font-semibold">{booking.schoolName} → {booking.routeTo}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Amount Paid</span><span className="font-bold text-emerald-600">₦{(booking.amountPaid || booking.totalPrice)?.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Departure</span><span className="font-semibold">{booking.departureDate ? new Date(booking.departureDate).toLocaleDateString() : 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status</span><span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">PAID</span></div>
            </div>
          </motion.div>
        )}

        {result === 'invalid' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-red-50 border border-red-200 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-600 shrink-0" />
              <div>
                <h3 className="font-bold text-red-800 text-lg">Receipt Could Not Be Verified</h3>
                <p className="text-red-600 text-sm mt-1">
                  This receipt is either invalid, forged, or the details don't match. Do not accept it as proof of payment.
                </p>
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}