# Vaamoose Payment Integration — Payaza + Paystack

Complete payment integration supporting **Payaza (primary) → Paystack (fallback)** with support for multiple payment methods.

## ✅ Implemented Features

### Payment Methods
- ✅ **Card Payments** (Direct charge with OTP support)
- ✅ **Virtual Accounts** (Dynamic bank transfer)
- ✅ **Mobile Money** (Ghana, Kenya, Tanzania, Uganda)
- ✅ **Card Authorization** (Auth/Capture/Void)
- ✅ **Bank Enquiry** (Account name resolution)
- ✅ **Refunds & Chargebacks**
- ✅ **Transaction Status** (Query any transaction)

### Architecture
- **Primary Provider**: Payaza (supports all methods)
- **Fallback Provider**: Paystack (automatic failover)
- **Webhook Handling**: Both providers with signature verification
- **Booking Integration**: Auto-creates bookings on successful payment
- **Email Notifications**: Sends to student, admin, and partner

---

## 📁 Project Structure

```
vaamoose-payments/
├── server/
│   ├── utils/
│   │   └── paymentProvider.js       # Payment provider abstraction layer
│   ├── routes/
│   │   ├── paymentRoutes.js         # All API endpoints
│   │   └── webhookHandler.js        # Webhook processing
│   └── server.js                     # Express app with webhook routes
├── src/
│   └── components/
│       └── PayazaCheckout.tsx       # React checkout modal
├── .env.example                      # Environment variables template
└── README.md
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install axios resend
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```

Fill in your Payaza and Paystack credentials in `.env`:
```env
PAYAZA_API_KEY=Payaza_YOUR_KEY_HERE
PAYAZA_TENANT_ID=vaamoose
PAYSTACK_SECRET_KEY=sk_live_YOUR_KEY
PAYAZA_WEBHOOK_SECRET=your_secret
PAYSTACK_WEBHOOK_SECRET=your_secret
```

### 3. Start Server
```bash
npm run dev
```

---

## 🔌 API Endpoints

### Virtual Account (Bank Transfer)
```http
POST /api/payment/virtual-account
Content-Type: application/json

{
  "amount": 50000,
  "currency": "NGN",
  "customer": {
    "firstName": "Olukola",
    "lastName": "Deidowu",
    "email": "customer@example.com",
    "phone": "08012345678"
  }
}
```

**Response**:
```json
{
  "success": true,
  "accountNumber": "1234567890",
  "bankName": "Payaza-Titan",
  "amount": 50000,
  "expiresAt": "2026-05-07T12:30:00Z",
  "provider": "payaza"
}
```

---

### Card Charge
```http
POST /api/payment/charge
Content-Type: application/json

{
  "amount": 50000,
  "currency": "NGN",
  "customer": {
    "firstName": "Olukola",
    "lastName": "Deidowu",
    "email": "customer@example.com",
    "phone": "08012345678"
  },
  "card": {
    "cardNumber": "4111111111111111",
    "expiryMonth": "12",
    "expiryYear": "26",
    "cvv": "123",
    "cardHolderName": "Olukola Deidowu"
  },
  "method": "card",
  "bookingData": {
    "companyId": "...",
    "schoolId": "...",
    "seats": [{"row": 1, "column": "A"}],
    "routeTo": "Accra"
  }
}
```

**Response**:
```json
{
  "success": true,
  "booking": { ... },
  "reference": "VAAMO-1715070000000-abc123",
  "provider": "payaza"
}
```

---

### Card Auth/Capture (Two-Step)
```http
POST /api/payment/card/authorize

{
  "amount": 50000,
  "customer": { ... },
  "card": { ... }
}
```

Later, capture the authorized funds:
```http
POST /api/payment/card/capture

{
  "reference": "AUTH-1715070000000",
  "amount": 50000
}
```

---

### Mobile Money
```http
POST /api/payment/momo

{
  "amount": 50000,
  "currency": "GHS",
  "customer": {
    "firstName": "Ama",
    "email": "ama@example.com"
  },
  "mobileNumber": "0500000000",
  "bankCode": "MTN",
  "countryCode": "GH"
}
```

Check status:
```http
GET /api/payment/momo/status?reference=MOMO-1715070000000&countryCode=GH
```

---

### Bank Enquiry (Resolve Account Name)
```http
POST /api/payment/bank/enquiry

{
  "accountNumber": "0123456789",
  "bankCode": "029",
  "currency": "NGN"
}
```

---

### Transaction Status
```http
GET /api/payment/status/VAAMO-1715070000000?provider=payaza
```

---

### Refund
```http
POST /api/payment/refund

{
  "reference": "VAAMO-1715070000000",
  "amount": 50000,
  "reason": "Customer request",
  "provider": "payaza"
}
```

---

## 💻 Frontend Usage

### React Checkout Component

```jsx
import PayazaCheckout from '@/components/PayazaCheckout';
import { useState } from 'react';

export default function BookingPage() {
  const [showCheckout, setShowCheckout] = useState(false);

  return (
    <>
      <button onClick={() => setShowCheckout(true)}>
        Pay ₦50,000
      </button>

      {showCheckout && (
        <PayazaCheckout
          amount={50000}
          currency="NGN"
          customer={{
            firstName: 'Olukola',
            lastName: 'Deidowu',
            email: 'olukoladeidowu@gmail.com',
            phone: '08012345678',
          }}
          onSuccess={(result) => {
            console.log('Payment success:', result);
            setShowCheckout(false);
            // Redirect to booking confirmation
          }}
          onClose={() => setShowCheckout(false)}
          onError={(err) => console.error('Payment error:', err)}
        />
      )}
    </>
  );
}
```

The component supports three payment methods:
- 💳 Card
- 📱 Mobile Money
- 🏦 Bank Transfer

---

## 🔐 Webhook Setup

### Payaza Webhooks

1. Go to [Payaza Dashboard](https://dashboard.payaza.africa)
2. Navigate to **Settings → Webhooks**
3. Set webhook URL: `https://api.vaamoose.com/webhooks/payaza`
4. Copy webhook secret to `.env` as `PAYAZA_WEBHOOK_SECRET`

### Paystack Webhooks

1. Go to [Paystack Dashboard](https://dashboard.paystack.com)
2. Navigate to **Settings → Webhooks**
3. Set webhook URL: `https://api.vaamoose.com/webhooks/paystack`
4. Copy webhook secret to `.env` as `PAYSTACK_WEBHOOK_SECRET`

### Handled Events

| Event | Action | Status |
|-------|--------|--------|
| `transaction.successful` / `charge.success` | Mark booking paid, send confirmations | ✅ |
| `transaction.failed` | Mark booking failed | ✅ |
| `chargeback.raised` | Alert team, freeze booking | ✅ |
| `refund.processed` | Update refund status | ✅ |

---

## 🔄 Fallback Logic

Every payment method with a Paystack equivalent automatically falls back:

```javascript
chargeCard(...)
  → tries Payaza first
  → if Payaza throws → tries Paystack
  → if both fail → throws PaymentError with both errors
  → result always includes { provider: 'payaza'|'paystack', fallback?: true }
```

**Methods with fallback**:
- ✅ Virtual Account
- ✅ Card Charge
- ✅ Mobile Money
- ✅ Bank Enquiry

**Payaza-only methods** (no Paystack equivalent):
- Card Auth/Capture/Void

---

## 📊 Database Models

### Booking Schema
```javascript
{
  paymentStatus: 'paid' | 'failed' | 'pending' | 'chargeback' | 'refunded',
  paymentReference: 'VAAMO-...',
  paymentProvider: 'payaza' | 'paystack',
  amountPaid: 50000,
  paidAt: Date,
  // ... other booking fields
}
```

---

## 🛠️ Error Handling

All endpoints return structured error responses:

```json
{
  "error": "Card declined or invalid card details",
  "details": {
    "payaza": { "message": "..." },
    "paystack": { "message": "..." }
  }
}
```

---

## 📝 Logging

All payment operations are logged with context:

```
[PaymentProvider] Payaza failed for chargeCard: Card declined
[PaymentProvider] Falling back to Paystack for chargeCard
[Webhook] payaza | transaction.successful | ref:VAAMO-... | status:success
✅ Payment successful: VAAMO-... | NGN 50000 | via payaza
```

---

## 🧪 Testing

### Manual Testing

1. **Test Card**: 4111111111111111 (Exp: 12/26, CVV: 123)
2. **Test Credentials**: Use sandbox keys from Payaza/Paystack dashboards
3. **Test Webhook**: Use tools like [Webhook.site](https://webhook.site) to test webhook delivery

### Test Server with ngrok
```bash
# Expose local server to public URL
ngrok http 5000

# Set webhook URL to ngrok URL
# Example: https://abc123.ngrok.io/webhooks/payaza
```

---

## 📋 Configuration Checklist

- [ ] Payaza API key obtained and set in `.env`
- [ ] Paystack secret key obtained and set in `.env`
- [ ] Database connected
- [ ] Webhook URLs configured in both dashboards
- [ ] Webhook secrets saved in `.env`
- [ ] Email service (Resend) configured
- [ ] FRONTEND_URL and APP_URL set for redirects
- [ ] Payment routes mounted on `/api/payment`

---

## 🚨 Troubleshooting

### "Both payment providers failed"
- Check if Payaza API key is configured
- Check if Paystack secret key is configured
- Verify network connectivity to both services

### "Invalid webhook signature"
- Verify webhook secret is correct in `.env`
- Check webhook configuration in dashboards
- Ensure raw body parser is used for Payaza webhooks

### "Booking not created after payment"
- Check Payaza/Paystack response structure
- Verify `bookingData` is included in charge request
- Check MongoDB connection

### "Emails not sending"
- Verify Resend API key
- Check email service is running
- Review email templates for syntax errors

---

## 📚 Additional Resources

- [Payaza Documentation](https://docs.payaza.africa)
- [Paystack Documentation](https://paystack.com/docs)
- [Resend Email Service](https://resend.com)

---

## 💡 Next Steps

1. **Add payment analytics** - Track transaction volume, success rates
2. **Implement reconciliation** - Daily payment verification
3. **Add payment retry logic** - Automatic retry for failed transactions
4. **Implement payment scheduling** - Recurring/subscription payments
5. **Add payment history** - Customer payment receipts dashboard

---

**Last Updated**: May 7, 2026  
**Status**: ✅ Production Ready
