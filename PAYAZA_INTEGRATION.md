# Payaza Payment Integration

This document outlines the Payaza payment integration for Vaamoose, which provides a comprehensive payment solution with Paystack as fallback.

## Overview

The system now supports both Payaza and Paystack payment providers:

- **Primary**: Payaza (configured in .env as PAYMENT_PROVIDER=payaza)
- **Fallback**: Paystack (automatically used if Payaza fails)

## Configuration

Update your `.env` file with Payaza credentials:

```env
PAYMENT_PROVIDER=payaza
PAYAZA_API_KEY=your_payaza_api_key
PAYAZA_BASE_URL=https://api.payaza.africa/live
PAYAZA_TENANT_ID=your_tenant_id
PAYAZA_PRODUCT_ID=app
```

## API Endpoints

### Existing Endpoints (Updated)
- `POST /api/payment/initialize` - Initialize payment (uses Payaza primary, Paystack fallback)
- `GET /api/payment/verify/:reference` - Verify payment and create booking
- `GET /api/payment/verify-receipt/:reference` - Verify receipt

### New Payaza-Specific Endpoints

#### Card Payments
- `POST /api/payment/payaza/card-charge` - Direct card charge
- `POST /api/payment/payaza/transaction-status` - Check transaction status

#### Mobile Money
- `POST /api/payment/payaza/mobile-money-collection` - Process mobile money collection
- `POST /api/payment/payaza/account-funding` - Process account funding
- `GET /api/payment/payaza/collection-status` - Check collection status

#### Transfers & Payouts
- `POST /api/payment/payaza/transfer` - Initiate transfers/payouts
- `POST /api/payment/payaza/account-enquiry` - Account enquiry
- `GET /api/payment/payaza/transfer-query` - Query transfer notifications

#### Virtual Accounts
- `POST /api/payment/payaza/virtual-account` - Create virtual account
- `GET /api/payment/payaza/virtual-account/:accountNumber` - Get virtual account details

#### Provider Management
- `POST /api/payment/switch-provider` - Switch payment provider
- `GET /api/payment/current-provider` - Get current provider

## Usage Examples

### Card Charge
```javascript
const response = await fetch('/api/payment/payaza/card-charge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    first_name: 'John',
    last_name: 'Doe',
    email_address: 'john@example.com',
    phone_number: '1234567890',
    amount: 100.00,
    transaction_reference: 'TXN123456',
    currency: 'USD',
    description: 'Payment for services',
    card: {
      expiryMonth: '12',
      expiryYear: '25',
      securityCode: '123',
      cardNumber: '4111111111111111'
    },
    callback_url: 'https://yourapp.com/callback'
  })
});
```

### Mobile Money Collection
```javascript
const response = await fetch('/api/payment/payaza/mobile-money-collection', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 50,
    customer_number: '233501234567',
    transaction_reference: 'MM123456',
    transaction_description: 'Mobile money payment',
    customer_bank_code: 'MTN',
    currency_code: 'GHS',
    customer_email: 'customer@example.com',
    customer_first_name: 'John',
    customer_last_name: 'Doe',
    customer_phone_number: '233501234567',
    country_code: 'GH'
  })
});
```

### Create Virtual Account
```javascript
const response = await fetch('/api/payment/payaza/virtual-account', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    account_name: 'Test Account',
    account_type: 'Dynamic', // or 'Static'
    bank_code: '1067',
    account_reference: 'VA123456',
    customer_first_name: 'John',
    customer_last_name: 'Doe',
    customer_email: 'john@example.com',
    customer_phone_number: '08012345678',
    transaction_description: 'Virtual account payment',
    transaction_amount: 1000,
    expires_in_minutes: 30
  })
});
```

## Provider Switching

To manually switch providers:

```javascript
await fetch('/api/payment/switch-provider', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ provider: 'paystack' }) // or 'payaza'
});
```

## Error Handling

The system automatically falls back to Paystack if Payaza operations fail. All errors are logged and appropriate error responses are returned.

## Testing

Use the sandbox/test keys provided in the Payaza documentation for testing. Remember to replace with live keys for production.

## Support

For Payaza API documentation, refer to: https://api.payaza.africa/live

For Paystack fallback: https://paystack.com/docs