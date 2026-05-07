/**
 * PayazaCheckout.tsx
 * Drop-in payment modal for Vaamoose
 * Supports: Payaza + Paystack provider selection
 * Usage: <PayazaCheckout amount={50000} currency="NGN" customer={{...}} onSuccess={...} onClose={...} />
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Customer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface Card {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardHolderName?: string;
}

interface BookingData {
  companyId: string;
  schoolId: string;
  schoolName?: string;
  companyName?: string;
  vehicleId?: string;
  vehicleName?: string;
  routeTo?: string;
  departureDate?: string;
  departureTime?: string;
  seats?: Array<{ row: number; column: string }>;
  pickupLocation?: string;
  totalPrice?: number;
  luggagePhotos?: string[];
}

interface PayazaCheckoutProps {
  amount: number;
  currency?: string;
  customer: Customer;
  bookingData?: BookingData;
  onSuccess?: (result: any) => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
  showModal?: boolean;
}

export default function PayazaCheckout({
  amount,
  currency = 'NGN',
  customer,
  bookingData,
  onSuccess,
  onClose,
  onError,
  showModal = true,
}: PayazaCheckoutProps) {
  const [isOpen, setIsOpen] = useState(showModal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [provider, setProvider] = useState<'payaza' | 'paystack'>('payaza'); // ✅ PROVIDER SELECTION
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'momo' | 'transfer'>('card');

  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    momoNumber: '',
    momoProvider: 'MTN',
    bankCode: '',
    accountNumber: '',
  });

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateCardData = () => {
    const { cardNumber, expiryMonth, expiryYear, cvv } = formData;
    if (!cardNumber || cardNumber.replace(/\s/g, '').length !== 16) {
      setError('Card number must be 16 digits');
      return false;
    }
    if (!expiryMonth || !expiryYear || !cvv) {
      setError('Please fill in all card details');
      return false;
    }
    return true;
  };

  const validateMomoData = () => {
    const { momoNumber } = formData;
    if (!momoNumber || momoNumber.length < 9) {
      setError('Please enter a valid phone number');
      return false;
    }
    return true;
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate based on payment method
      if (paymentMethod === 'card') {
        if (!validateCardData()) {
          setLoading(false);
          return;
        }

        // Charge card with provider selection
        const response = await fetch(`${API_BASE}/api/payment/card/charge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount,
            currency,
            customer: {
              firstName: customer.firstName,
              lastName: customer.lastName,
              email: customer.email,
              phone: customer.phone,
            },
            card: {
              number: formData.cardNumber.replace(/\s/g, ''),
              expiryMonth: formData.expiryMonth,
              expiryYear: formData.expiryYear,
              cvv: formData.cvv,
            },
            bookingData,
            provider, // ✅ PASS PROVIDER SELECTION
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Payment failed');
        }

        setSuccess(true);
        setTimeout(() => {
          onSuccess?.(result);
          handleClose();
        }, 2000);
      } else if (paymentMethod === 'momo') {
        if (!validateMomoData()) {
          setLoading(false);
          return;
        }

        // Charge mobile money with provider selection
        const response = await fetch(`${API_BASE}/api/payment/momo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount,
            currency,
            customer: {
              firstName: customer.firstName,
              email: customer.email,
            },
            mobileNumber: formData.momoNumber,
            network: formData.momoProvider,
            countryCode: 'GH', // TODO: Make dynamic
            provider, // ✅ PASS PROVIDER SELECTION
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Payment failed');
        }

        setSuccess(true);
        setTimeout(() => {
          onSuccess?.(result);
          handleClose();
        }, 2000);
      } else if (paymentMethod === 'transfer') {
        // Virtual account with provider selection
        const response = await fetch(`${API_BASE}/api/payment/virtual-account`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount,
            currency,
            customer: {
              firstName: customer.firstName,
              lastName: customer.lastName,
              email: customer.email,
              phone: customer.phone,
            },
            provider, // ✅ PASS PROVIDER SELECTION
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Account generation failed');
        }

        onSuccess?.(result);
        handleClose();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Payment processing failed';
      setError(errorMsg);
      onError?.(err instanceof Error ? err : new Error(errorMsg));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <h2 className="text-xl font-semibold">Payment Successful!</h2>
            <p className="text-gray-600">
              ₦{amount.toLocaleString()} charged successfully via {provider === 'payaza' ? 'Payaza' : 'Paystack'}.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete Your Payment</DialogTitle>
          <DialogDescription>
            Pay ₦{amount.toLocaleString()} {currency} securely
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handlePaymentSubmit} className="space-y-6">
          {/* Provider Selection ✅ */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Select Payment Provider</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'payaza' as const, label: 'Payaza' },
                { id: 'paystack' as const, label: 'Paystack' },
              ].map((prov) => (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => {
                    setProvider(prov.id);
                    setError(null);
                  }}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition ${
                    provider === prov.id
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {prov.label}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Contact Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="First Name"
                name="firstName"
                value={customer.firstName}
                disabled
              />
              <Input
                placeholder="Last Name"
                name="lastName"
                value={customer.lastName}
                disabled
              />
              <Input
                placeholder="Email"
                type="email"
                name="email"
                value={customer.email}
                disabled
              />
              <Input
                placeholder="Phone"
                name="phone"
                value={customer.phone}
                disabled
              />
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Payment Method</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'card' as const, label: '💳 Card' },
                { id: 'momo' as const, label: '📱 Mobile Money' },
                { id: 'transfer' as const, label: '🏦 Transfer' },
              ].map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id)}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition ${
                    paymentMethod === method.id
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          {/* Card Payment */}
          {paymentMethod === 'card' && (
            <Card className="p-4 space-y-3">
              <Input
                placeholder="Card Number (16 digits)"
                name="cardNumber"
                value={formData.cardNumber}
                onChange={handleInputChange}
                maxLength="19"
                required
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="MM"
                  name="expiryMonth"
                  value={formData.expiryMonth}
                  onChange={handleInputChange}
                  maxLength="2"
                  required
                />
                <Input
                  placeholder="YY"
                  name="expiryYear"
                  value={formData.expiryYear}
                  onChange={handleInputChange}
                  maxLength="2"
                  required
                />
                <Input
                  placeholder="CVV"
                  name="cvv"
                  value={formData.cvv}
                  onChange={handleInputChange}
                  maxLength="4"
                  required
                />
              </div>
            </Card>
          )}

          {/* Mobile Money Payment */}
          {paymentMethod === 'momo' && (
            <Card className="p-4 space-y-3">
              <select
                name="momoProvider"
                value={formData.momoProvider}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="MTN">MTN</option>
                <option value="Airtel">Airtel</option>
                <option value="Vodafone">Vodafone</option>
              </select>
              <Input
                placeholder="Mobile Number"
                name="momoNumber"
                value={formData.momoNumber}
                onChange={handleInputChange}
                required
              />
            </Card>
          )}

          {/* Bank Transfer - Shows account details */}
          {paymentMethod === 'transfer' && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <p className="text-sm text-gray-600">
                Transfer details will be shown after you click "Continue"
              </p>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay ₦${amount.toLocaleString()} via ${provider === 'payaza' ? 'Payaza' : 'Paystack'}`
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
