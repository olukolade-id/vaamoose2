import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface ComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking?: {
    companyId?: string;
    companyName?: string;
    paymentReference?: string;
  };
  user?: {
    fullName?: string;
    email?: string;
  };
}

const API = 'https://blissful-exploration-production.up.railway.app';

const SUBJECTS = [
  'Late departure',
  'Reckless driving',
  'Driver misconduct',
  'Vehicle condition',
  'Overcharging',
  'Seat issue',
  'Luggage problem',
  'Cancelled trip',
  'Other',
];

export function ComplaintModal({ isOpen, onClose, booking, user }: ComplaintModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!subject) { toast.error('Please select a subject'); return; }
    if (!message.trim() || message.length < 20) { toast.error('Please describe your complaint (at least 20 characters)'); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/api/partners/complaint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: user?.fullName || '',
          studentEmail: user?.email || '',
          companyId: booking?.companyId || '',
          companyName: booking?.companyName || '',
          subject,
          message,
          bookingReference: booking?.paymentReference || '',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        toast.error(data.error || 'Failed to submit complaint');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSubject('');
    setMessage('');
    setSubmitted(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            {submitted ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Complaint Submitted!</h3>
                <p className="text-slate-500 text-sm mb-2">
                  We've received your complaint and will investigate within 24-48 hours.
                </p>
                <p className="text-slate-400 text-xs mb-6">A confirmation has been sent to {user?.email}</p>
                <button
                  onClick={handleClose}
                  className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Submit a Complaint</h3>
                      {booking?.companyName && (
                        <p className="text-xs text-slate-400">About: {booking.companyName}</p>
                      )}
                    </div>
                  </div>
                  <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-xl">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Subject *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {SUBJECTS.map(s => (
                        <button
                          key={s}
                          onClick={() => setSubject(s)}
                          className={`text-left text-xs px-3 py-2 rounded-xl border-2 transition-all ${
                            subject === s
                              ? 'border-red-400 bg-red-50 text-red-700 font-semibold'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Describe your complaint *
                    </label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Please provide as much detail as possible about what happened..."
                      rows={4}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-red-400 focus:border-transparent outline-none"
                    />
                    <p className="text-xs text-slate-400 mt-1">{message.length} characters (minimum 20)</p>
                  </div>

                  {/* Booking ref */}
                  {booking?.paymentReference && (
                    <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500">
                      Booking reference: <span className="font-mono font-semibold">{booking.paymentReference.toUpperCase()}</span>
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    {isSubmitting ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</>
                    ) : (
                      <><Send className="w-4 h-4" /> Submit Complaint</>
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}