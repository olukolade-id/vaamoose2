import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaymentVerifyProps {
  onSuccess: () => void;
  onBack: () => void;
}

export function PaymentVerify({ onSuccess, onBack }: PaymentVerifyProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const reference = urlParams.get('reference') || localStorage.getItem('paymentReference');

        if (!reference) {
          setStatus('failed');
          setMessage('No payment reference found.');
          // Clear URL just in case
          window.history.replaceState({}, document.title, '/');
          return;
        }

        const res = await fetch(`https://blissful-exploration-production.up.railway.app/api/payment/verify/${reference}`);
        const data = await res.json();

        if (data.success) {
          setStatus('success');
          setMessage('Your booking has been confirmed!');
          localStorage.removeItem('paymentReference');
          // Clear the ?reference= from URL so refresh goes to home
          window.history.replaceState({}, document.title, '/');
        } else {
          setStatus('failed');
          setMessage('Payment was not successful. Please try again.');
          window.history.replaceState({}, document.title, '/');
        }
      } catch (error) {
        setStatus('failed');
        setMessage('Something went wrong. Please contact support.');
        window.history.replaceState({}, document.title, '/');
      }
    };

    verifyPayment();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center"
      >
        {status === 'loading' && (
          <div className="space-y-4">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Loader className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Verifying Payment...</h2>
            <p className="text-slate-500">Please wait while we confirm your payment.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Booking Confirmed!</h2>
            <p className="text-slate-500">{message}</p>
            <div className="p-4 bg-emerald-50 rounded-xl text-emerald-700 text-sm">
              Check your email for your booking details and tracking information.
            </div>
            <Button
              onClick={onSuccess}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6"
            >
              View My Bookings
            </Button>
          </div>
        )}

        {status === 'failed' && (
          <div className="space-y-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Payment Failed</h2>
            <p className="text-slate-500">{message}</p>
            <Button
              onClick={onBack}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6"
            >
              Try Again
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}