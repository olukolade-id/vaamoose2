import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Printer, Share2, Bus, MapPin, Calendar, Users, Shield, ArrowLeft, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PaymentReceiptProps {
  reference: string;
  onBack: () => void;
}

const API = 'https://blissful-exploration-production.up.railway.app';

export function PaymentReceipt({ reference, onBack }: PaymentReceiptProps) {
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const receiptRef = useRef<HTMLDivElement>(null);

  const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
  const studentUser = savedUser ? JSON.parse(savedUser) : {};

  useEffect(() => {
    // Scroll to top when receipt loads
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (reference) verifyAndLoad();
  }, [reference]);

  const verifyAndLoad = async () => {
    try {
      const res = await fetch(`${API}/api/payment/verify/${reference}`);
      const data = await res.json();
      if (res.ok && data.booking) {
        setBooking(data.booking);
      } else {
        setError(data.error || 'Could not load receipt.');
      }
    } catch {
      setError('Failed to load receipt. Please check your booking history.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateVerificationCode = (ref: string, amount: number, company: string) => {
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

  const handlePrint = () => window.print();

  const handleShare = async () => {
    const verificationCode = generateVerificationCode(
      reference,
      booking?.amountPaid || booking?.price,
      booking?.companyName
    );
    const text = `My Vaamoose booking receipt\nPassenger: ${studentUser.fullName || 'Student'}\nReference: ${reference}\nVerification: ${verificationCode}\nVerify at: https://vaamoose.online/?ref=${reference}`;
    if (navigator.share) {
      await navigator.share({ title: 'Vaamoose Receipt', text });
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Receipt info copied to clipboard!');
    }
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
    `https://vaamoose.online/?ref=${reference}`
  )}`;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-600">Generating your receipt...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-red-600">{error}</p>
          <Button onClick={onBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  const verificationCode = generateVerificationCode(
    reference,
    booking.amountPaid || booking.price,
    booking.companyName
  );

  const amount = booking.amountPaid || booking.price;
  const receiptDate = booking.paidAt ? new Date(booking.paidAt) : new Date();
  const studentName = booking.userFullName || studentUser.fullName || studentUser.name || 'Student';
  const studentEmail = booking.userEmail || studentUser.email || '';
  const studentPhoto = (studentUser as any).profilePhoto || '';

  return (
    <div className="min-h-screen bg-slate-100">

      {/* ── Sticky action bar — always visible, never covered ── */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm print:hidden">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={onBack}
            size="sm"
            className="flex items-center gap-2 font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <p className="text-sm font-semibold text-slate-700 hidden sm:block">Payment Receipt</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleShare}
              size="sm"
              className="flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            <Button
              onClick={handlePrint}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print / Save</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Receipt body */}
      <div className="py-6 px-4">
        <motion.div
          ref={receiptRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden"
          id="receipt"
        >

          {/* Header gradient */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-8 text-white relative overflow-hidden">
            {/* Watermark */}
            <div className="absolute inset-0 opacity-10 pointer-events-none select-none overflow-hidden">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute text-white font-bold"
                  style={{
                    top: `${(i * 37) % 100}%`,
                    left: `${(i * 53) % 100}%`,
                    transform: 'rotate(-30deg)',
                    fontSize: '10px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  VAAMOOSE VERIFIED
                </div>
              ))}
            </div>

            <div className="relative z-10 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Bus className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">Vaamoose</h1>
                    <p className="text-blue-200 text-sm">Student Transport Platform</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2 w-fit">
                  <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                  <span className="font-semibold text-emerald-100">Payment Confirmed</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-blue-200 text-sm">Receipt Date</p>
                <p className="font-semibold text-sm">
                  {receiptDate.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-blue-200 text-sm mt-1">
                  {receiptDate.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>

          {/* Amount banner */}
          <div className="bg-emerald-50 border-b border-emerald-100 px-8 py-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Amount Paid</p>
              <p className="text-3xl font-bold text-emerald-600">₦{amount?.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Reference</p>
              <p className="font-mono font-bold text-slate-800 text-lg">{reference.toUpperCase()}</p>
            </div>
          </div>

          <div className="p-8 space-y-6">

            {/* Passenger */}
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-blue-200 flex items-center justify-center shrink-0 ring-2 ring-blue-300">
                {studentPhoto ? (
                  <img src={studentPhoto} alt={studentName} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-7 h-7 text-blue-600" />
                )}
              </div>
              <div>
                <p className="text-xs text-blue-400 uppercase tracking-wide font-medium">Passenger</p>
                <p className="font-bold text-slate-900 text-lg">{studentName}</p>
                {studentEmail && <p className="text-sm text-slate-500">{studentEmail}</p>}
              </div>
            </div>

            {/* Journey details */}
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                  <Bus className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Transport Company</p>
                  <p className="font-semibold text-slate-900">{booking.companyName}</p>
                  <p className="text-sm text-slate-500">{booking.vehicleName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Route</p>
                  <p className="font-semibold text-slate-900">{booking.schoolName}</p>
                  <p className="text-sm text-slate-500">→ {booking.route || booking.routeTo}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Departure</p>
                  <p className="font-semibold text-slate-900">
                    {booking.departureDate
                      ? new Date(booking.departureDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
                      : 'N/A'}
                  </p>
                  <p className="text-sm text-slate-500">{booking.departureTime || ''}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Seats</p>
                  {booking.seats?.length > 0
                    ? booking.seats.map((s: any, i: number) => (
                        <p key={i} className="font-semibold text-slate-900 text-sm">Row {s.row}, Seat {s.column}</p>
                      ))
                    : <p className="font-semibold text-slate-900">—</p>
                  }
                </div>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-200" />

            {/* QR + Verification */}
            <div className="flex items-start gap-6 bg-slate-50 rounded-2xl p-5">
              <img src={qrUrl} alt="QR" className="w-24 h-24 rounded-xl border border-slate-200 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-semibold text-slate-900">Anti-Forgery Verification</p>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  This code is uniquely tied to your payment. Scan the QR or visit the link below to verify this receipt is genuine.
                </p>
                <div className="bg-white border-2 border-blue-200 rounded-xl px-4 py-2 w-fit">
                  <p className="font-mono font-bold text-blue-700 text-lg tracking-widest">{verificationCode}</p>
                </div>
                <p className="text-xs text-slate-400 mt-2">vaamoose.online</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <Shield className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700">
                This receipt is valid only with matching reference, verification code, and payment amount. Any alteration makes it invalid.
              </p>
            </div>

          </div>

          {/* Footer */}
          <div className="bg-slate-800 px-8 py-5 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs">Powered by Vaamoose × Paystack</p>
              <p className="text-slate-500 text-xs mt-0.5">Keep this receipt for your records</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-xs">Transaction ID</p>
              <p className="font-mono text-white text-xs font-bold">{reference.toUpperCase()}</p>
            </div>
          </div>

        </motion.div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt, #receipt * { visibility: visible; }
          #receipt {
            position: fixed;
            top: 0; left: 0;
            width: 100%;
            box-shadow: none;
            border-radius: 0;
          }
        }
      `}</style>

    </div>
  );
}