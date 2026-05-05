import { useEffect, useState } from 'react';
<<<<<<< HEAD
=======
import { useSearchParams } from 'react-router-dom';
>>>>>>> b25a3e30 (feat: Complete Payaza payment integration with checkout page and booking creation)
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CheckoutPage() {
<<<<<<< HEAD
=======
  const [searchParams] = useSearchParams();
>>>>>>> b25a3e30 (feat: Complete Payaza payment integration with checkout page and booking creation)
  const [isLoading, setIsLoading] = useState(false);
  const [cardData, setCardData] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardHolderName: ''
  });

<<<<<<< HEAD
  const searchParams = new URLSearchParams(window.location.search);
=======
>>>>>>> b25a3e30 (feat: Complete Payaza payment integration with checkout page and booking creation)
  const reference = searchParams.get('reference');
  const amount = searchParams.get('amount');
  const email = searchParams.get('email');
  const provider = searchParams.get('provider');
<<<<<<< HEAD
  const bookingData = JSON.parse(localStorage.getItem('bookingData') || '{}');
=======
>>>>>>> b25a3e30 (feat: Complete Payaza payment integration with checkout page and booking creation)

  useEffect(() => {
    if (!reference || !amount || !email) {
      toast.error('Invalid checkout parameters');
    }
  }, [reference, amount, email]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCardData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cardData.cardNumber || !cardData.expiryMonth || !cardData.expiryYear || !cardData.cvv) {
      toast.error('Please fill in all card details');
      return;
    }

    setIsLoading(true);

    try {
      if (provider === 'payaza') {
        // Call Payaza card charge endpoint
        const response = await fetch(
          'https://blissful-exploration-production.up.railway.app/api/payment/payaza/card-charge',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reference,
              amount: parseInt(amount),
              email,
              card: {
                cardNumber: cardData.cardNumber.replace(/\s/g, ''),
                expiryMonth: cardData.expiryMonth,
                expiryYear: cardData.expiryYear,
                securityCode: cardData.cvv,
                cardHolderName: cardData.cardHolderName
              },
              bookingData
            })
          }
        );

        const data = await response.json();

        if (data.success) {
          toast.success('Payment successful!');
<<<<<<< HEAD
          localStorage.removeItem('bookingData');
          window.location.href = `/?reference=${reference}`;
        } else {
          toast.error(data.error || data.message || 'Payment failed');
=======
          // Redirect to verification page
          window.location.href = `/verify-receipt?reference=${reference}`;
        } else {
          toast.error(data.message || 'Payment failed');
>>>>>>> b25a3e30 (feat: Complete Payaza payment integration with checkout page and booking creation)
        }
      }
    } catch (error) {
      toast.error('Payment processing error');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCardNumber = (value: string) => {
    return value
      .replace(/\s/g, '')
      .replace(/(\d{4})/g, '$1 ')
      .trim();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Complete Payment</h1>
          <p className="text-slate-600 mb-6">Secure payment powered by Payaza</p>

          {/* Payment Summary */}
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-slate-600">Amount:</span>
              <span className="font-semibold text-slate-900">₦{parseInt(amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Reference:</span>
              <span className="font-mono text-sm text-slate-700">{reference}</span>
            </div>
          </div>

          {/* Card Form */}
          <form onSubmit={handlePayment} className="space-y-4">
            <div>
              <Label htmlFor="cardHolderName">Cardholder Name</Label>
              <Input
                id="cardHolderName"
                name="cardHolderName"
                placeholder="John Doe"
                value={cardData.cardHolderName}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                name="cardNumber"
                placeholder="4242 4242 4242 4242"
                value={formatCardNumber(cardData.cardNumber)}
                onChange={(e) => setCardData(prev => ({
                  ...prev,
                  cardNumber: e.target.value.replace(/\s/g, '')
                }))}
                className="mt-1 font-mono"
                maxLength={19}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiryMonth">Month</Label>
                <Input
                  id="expiryMonth"
                  name="expiryMonth"
                  placeholder="MM"
                  value={cardData.expiryMonth}
                  onChange={handleInputChange}
                  maxLength={2}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="expiryYear">Year</Label>
                <Input
                  id="expiryYear"
                  name="expiryYear"
                  placeholder="YY"
                  value={cardData.expiryYear}
                  onChange={handleInputChange}
                  maxLength={2}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="cvv">CVV</Label>
              <Input
                id="cvv"
                name="cvv"
                placeholder="123"
                value={cardData.cvv}
                onChange={handleInputChange}
                maxLength={4}
                className="mt-1 font-mono"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2"
            >
              {isLoading ? 'Processing...' : `Pay ₦${parseInt(amount).toLocaleString()}`}
            </Button>
          </form>

          <p className="text-xs text-slate-500 text-center mt-4">
            Your payment information is secure and encrypted
          </p>
        </div>
      </Card>
    </div>
  );
}
