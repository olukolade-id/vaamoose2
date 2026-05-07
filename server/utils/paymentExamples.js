// Quick Reference: Using Vaamoose Payment System

// ═══════════════════════════════════════════════════════════════════════════════
// 1. CARD PAYMENT (Most Common)
// ═══════════════════════════════════════════════════════════════════════════════

const chargeCard = async () => {
  const response = await fetch('/api/payment/charge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 50000,              // Amount in kobo/cents
      currency: 'NGN',
      customer: {
        firstName: 'Olukola',
        lastName: 'Deidowu',
        email: 'olukoladeidowu@gmail.com',
        phone: '08012345678',
      },
      card: {
        cardNumber: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '26',
        cvv: '123',
        cardHolderName: 'Olukola Deidowu',
      },
      method: 'card',
      bookingData: {
        companyId: 'partner_id_here',
        schoolId: 'school_id_here',
        schoolName: 'Legon SHS',
        companyName: 'Vaamoose Express',
        vehicleId: 'vehicle_id_here',
        vehicleName: 'Toyota Hiace',
        routeTo: 'Accra',
        departureDate: '2026-05-15',
        departureTime: '08:00 AM',
        seats: [
          { row: 1, column: 'A' },
          { row: 1, column: 'B' },
        ],
        pickupLocation: 'Front Gate',
        luggagePhotos: [],
      },
    }),
  });

  const result = await response.json();
  if (result.success) {
    console.log('✅ Payment success:', result.booking);
    // Redirect to confirmation page
    window.location.href = `/booking-confirmed?ref=${result.reference}`;
  } else {
    console.error('❌ Payment failed:', result.error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. REACT CHECKOUT COMPONENT (Recommended for Frontend)
// ═══════════════════════════════════════════════════════════════════════════════

import PayazaCheckout from '@/components/PayazaCheckout';
import { useState } from 'react';

function BookingCheckout() {
  const [showCheckout, setShowCheckout] = useState(false);
  const [bookingAmount] = useState(50000);

  return (
    <>
      <button
        onClick={() => setShowCheckout(true)}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg"
      >
        Proceed to Checkout
      </button>

      {showCheckout && (
        <PayazaCheckout
          amount={bookingAmount}
          currency="NGN"
          customer={{
            firstName: 'Olukola',
            lastName: 'Deidowu',
            email: 'olukoladeidowu@gmail.com',
            phone: '08012345678',
          }}
          onSuccess={(result) => {
            console.log('✅ Payment successful:', result);
            setShowCheckout(false);
            // Show success message
            alert('Booking confirmed! Reference: ' + result.reference);
            // Redirect
            window.location.href = `/booking-confirmed?ref=${result.reference}`;
          }}
          onClose={() => {
            console.log('Checkout closed');
            setShowCheckout(false);
          }}
          onError={(err) => {
            console.error('❌ Payment error:', err);
            alert('Payment failed: ' + err.message);
          }}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. VIRTUAL ACCOUNT (Bank Transfer)
// ═══════════════════════════════════════════════════════════════════════════════

const createBankTransferOption = async () => {
  const response = await fetch('/api/payment/virtual-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 50000,
      currency: 'NGN',
      customer: {
        firstName: 'Olukola',
        lastName: 'Deidowu',
        email: 'olukoladeidowu@gmail.com',
        phone: '08012345678',
      },
      bookingData: {
        /* ... */
      },
    }),
  });

  const result = await response.json();
  // result.accountNumber, result.bankName, result.expiresAt
  console.log('Transfer to:', result.accountNumber, result.bankName);
};

// ═══════════════════════════════════════════════════════════════════════════════
// 4. MOBILE MONEY (Ghana, Kenya, Tanzania, Uganda)
// ═══════════════════════════════════════════════════════════════════════════════

const chargeMobileMoneyGhana = async () => {
  const response = await fetch('/api/payment/momo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 100,                    // GHS 100
      currency: 'GHS',
      customer: {
        firstName: 'Ama',
        email: 'ama@example.com',
      },
      mobileNumber: '0500000000',     // Without +233
      bankCode: 'MTN',                // Or Airtel, Vodafone, Telecel
      countryCode: 'GH',              // GH, KE, TZ, UG
      bookingData: {
        /* ... */
      },
    }),
  });

  const result = await response.json();
  console.log('MoMo charge initiated:', result.reference);

  // Check status after 30 seconds
  setTimeout(async () => {
    const statusResponse = await fetch(
      `/api/payment/momo/status?reference=${result.reference}&countryCode=GH`
    );
    const status = await statusResponse.json();
    console.log('MoMo status:', status.status);
  }, 30000);
};

// ═══════════════════════════════════════════════════════════════════════════════
// 5. CARD AUTHORIZATION (Two-Step Payment)
// ═══════════════════════════════════════════════════════════════════════════════

// Step 1: Authorize (hold funds)
const authorizeCard = async () => {
  const response = await fetch('/api/payment/card/authorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 50000,
      currency: 'NGN',
      customer: {
        firstName: 'Olukola',
        email: 'olukoladeidowu@gmail.com',
        phone: '08012345678',
      },
      card: {
        cardNumber: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '26',
        cvv: '123',
      },
    }),
  });

  const result = await response.json();
  return result.reference; // Save this for later capture
};

// Step 2: Capture (charge the customer)
const captureAuthorizedCard = async (authReference) => {
  const response = await fetch('/api/payment/card/capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reference: authReference,
      amount: 50000,
    }),
  });

  const result = await response.json();
  console.log('✅ Capture successful:', result);
};

// Step 3 (Optional): Void authorization (release hold)
const voidAuthorization = async (authReference) => {
  const response = await fetch('/api/payment/card/void', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reference: authReference,
    }),
  });

  const result = await response.json();
  console.log('✅ Authorization voided:', result);
};

// ═══════════════════════════════════════════════════════════════════════════════
// 6. TRANSACTION STATUS
// ═══════════════════════════════════════════════════════════════════════════════

const checkPaymentStatus = async (reference) => {
  const response = await fetch(
    `/api/payment/status/${reference}?provider=payaza`
  );
  const result = await response.json();
  // result.status = 'success', 'failed', 'pending', etc.
  console.log('Transaction status:', result.status);
  return result;
};

// ═══════════════════════════════════════════════════════════════════════════════
// 7. BANK ACCOUNT VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

const verifyBankAccount = async () => {
  const response = await fetch('/api/payment/bank/enquiry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountNumber: '0123456789',
      bankCode: '029', // GTBank code
      currency: 'NGN',
    }),
  });

  const result = await response.json();
  console.log('Account name:', result.accountName);
};

// ═══════════════════════════════════════════════════════════════════════════════
// 8. PROCESS REFUND
// ═══════════════════════════════════════════════════════════════════════════════

const refundPayment = async (reference) => {
  const response = await fetch('/api/payment/refund', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reference,
      amount: 50000,
      reason: 'Customer requested cancellation',
      provider: 'payaza', // or 'paystack'
    }),
  });

  const result = await response.json();
  console.log('✅ Refund processed:', result.reference);
};

// ═══════════════════════════════════════════════════════════════════════════════
// 9. PAYMENT FLOW EXAMPLE
// ═══════════════════════════════════════════════════════════════════════════════

async function completeBookingPayment(bookingData) {
  try {
    // 1. Calculate total
    const totalAmount = bookingData.seats.length * bookingData.pricePerSeat;

    // 2. Show payment options
    const paymentMethod = await showPaymentOptions();

    let paymentResult;
    switch (paymentMethod) {
      case 'card':
        // Use PayazaCheckout component
        paymentResult = await initiateCardPayment(totalAmount, bookingData);
        break;

      case 'bank_transfer':
        paymentResult = await createBankTransferOption(totalAmount, bookingData);
        break;

      case 'momo':
        paymentResult = await chargeMobileMoneyGhana(totalAmount, bookingData);
        break;

      default:
        throw new Error('Unknown payment method');
    }

    // 3. Wait for webhook confirmation (or poll status)
    const confirmed = await waitForPaymentConfirmation(paymentResult.reference);

    if (confirmed) {
      console.log('✅ Booking confirmed!');
      // Redirect to confirmation page
    } else {
      console.error('❌ Payment not confirmed');
    }
  } catch (error) {
    console.error('Payment error:', error);
  }
}

// Helper: Poll for payment confirmation
async function waitForPaymentConfirmation(reference, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await checkPaymentStatus(reference);

    if (result.status === 'success') {
      return true;
    }

    if (result.status === 'failed') {
      return false;
    }

    // Wait 1 second before next check
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════════

async function handlePaymentWithErrorRecovery() {
  try {
    // Try card payment
    const response = await fetch('/api/payment/charge', {
      /* ... */
    });

    if (!response.ok) {
      const error = await response.json();

      // If payment failed due to card issue, suggest alternatives
      if (error.error.includes('declined')) {
        console.log('💡 Card declined. Try:');
        console.log('  • Use a different card');
        console.log('  • Use Mobile Money');
        console.log('  • Use Bank Transfer');
        return;
      }

      // If Payaza failed, system will automatically try Paystack
      if (error.error.includes('Both payment providers failed')) {
        console.error('❌ Both Payaza and Paystack failed. Check internet connection.');
        return;
      }

      throw new Error(error.error);
    }

    const result = await response.json();
    console.log('✅ Payment successful');
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API RESPONSE STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════

/*
SUCCESS RESPONSE (200):
{
  "success": true,
  "booking": {
    "_id": "...",
    "paymentStatus": "paid",
    "paymentReference": "VAAMO-1715070000000-abc123",
    "paymentProvider": "payaza",
    "amountPaid": 50000,
    "paidAt": "2026-05-07T12:00:00Z",
    ...
  },
  "reference": "VAAMO-1715070000000-abc123",
  "provider": "payaza"
}

ERROR RESPONSE (400/500):
{
  "error": "Card declined or invalid card details",
  "details": {
    "payaza": { "message": "Card declined" },
    "paystack": { "message": "Connection timeout" }
  }
}
*/

export {
  chargeCard,
  createBankTransferOption,
  chargeMobileMoneyGhana,
  authorizeCard,
  captureAuthorizedCard,
  voidAuthorization,
  checkPaymentStatus,
  verifyBankAccount,
  refundPayment,
  completeBookingPayment,
  waitForPaymentConfirmation,
  handlePaymentWithErrorRecovery,
};
