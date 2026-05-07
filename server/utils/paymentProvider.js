/**
 * Payment Provider Abstraction Layer
 * Primary: Payaza | Fallback: Paystack
 * Vaamoose Payment Integration
 */

const axios = require('axios');

// ─── Config ───────────────────────────────────────────────────────────────────
const PAYAZA_BASE = 'https://api.payaza.africa/live';
const PAYSTACK_BASE = 'https://api.paystack.co';

const config = {
  payaza: {
    apiKey: process.env.PAYAZA_API_KEY || process.env.PAYAZA_API_SECRET_KEY,
    tenantId: process.env.PAYAZA_TENANT_ID || 'vaamoose',
    productId: process.env.PAYAZA_PRODUCT_ID || 'app',
    webhookSecret: process.env.PAYAZA_WEBHOOK_SECRET,
  },
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY,
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET,
  },
};

// ─── HTTP Clients ─────────────────────────────────────────────────────────────
const payazaClient = axios.create({
  baseURL: PAYAZA_BASE,
  headers: {
    'Authorization': config.payaza.apiKey ? `Payaza ${config.payaza.apiKey}` : '',
    'X-TenantID': config.payaza.tenantId,
    'X-ProductID': config.payaza.productId,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

const paystackClient = axios.create({
  baseURL: PAYSTACK_BASE,
  headers: {
    'Authorization': `Bearer ${config.paystack.secretKey}`,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// ─── Retry / Fallback Helper ──────────────────────────────────────────────────
async function withFallback(payazaFn, paystackFn, context = '', forceProvider = null) {
  // If user explicitly chose a provider, use it (no fallback)
  if (forceProvider === 'paystack') {
    try {
      if (!config.paystack.secretKey) throw new Error('Paystack secret key not configured');
      const result = await paystackFn();
      return { ...result, provider: 'paystack', fallback: false };
    } catch (err) {
      console.error(`[PaymentProvider] Paystack failed for ${context}:`, err?.response?.data || err.message);
      throw new PaymentError('Paystack payment failed', { paystack: err });
    }
  }

  // Default: try Payaza first, then fallback to Paystack
  try {
    if (!config.payaza.apiKey) throw new Error('Payaza API key not configured');
    const result = await payazaFn();
    return { ...result, provider: 'payaza', fallback: false };
  } catch (err) {
    console.error(`[PaymentProvider] Payaza failed for ${context}:`, err?.response?.data || err.message);
    console.log(`[PaymentProvider] Falling back to Paystack for ${context}`);
    try {
      if (!config.paystack.secretKey) throw new Error('Paystack secret key not configured');
      const result = await paystackFn();
      return { ...result, provider: 'paystack', fallback: true };
    } catch (fallbackErr) {
      console.error(`[PaymentProvider] Paystack fallback also failed for ${context}:`, fallbackErr?.response?.data || fallbackErr.message);
      throw new PaymentError('Both payment providers failed', { payaza: err, paystack: fallbackErr });
    }
  }
}

// ─── Custom Error ─────────────────────────────────────────────────────────────
class PaymentError extends Error {
  constructor(message, errors = {}) {
    super(message);
    this.name = 'PaymentError';
    this.errors = errors;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VIRTUAL ACCOUNT (Transfer)
// ═══════════════════════════════════════════════════════════════════════════════
async function createVirtualAccount({ amount, currency = 'NGN', customer, reference, type = 'Dynamic', expiresInMinutes = 30, provider = null }) {
  return withFallback(
    async () => {
      const { data } = await payazaClient.post(
        '/merchant-collection/merchant/virtual_account/generate_virtual_account/',
        {
          account_name: `${customer.firstName} ${customer.lastName}`,
          account_type: type,           // "Dynamic" (one-time) | "Static" (reserved)
          bank_code: '1067',            // Payaza-Titan
          account_reference: reference,
          customer_first_name: customer.firstName,
          customer_last_name: customer.lastName,
          customer_email: customer.email,
          customer_phone_number: customer.phone,
          transaction_description: 'Vaamoose payment',
          transaction_amount: amount,
          expires_in_minutes: String(expiresInMinutes),
          currency_code: currency,
        }
      );
      return {
        success: true,
        accountNumber: data.data?.account_number,
        bankName: data.data?.bank_name || 'Payaza-Titan',
        amount,
        currency,
        expiresAt: new Date(Date.now() + expiresInMinutes * 60000).toISOString(),
        reference,
        raw: data,
      };
    },
    async () => {
      // Paystack: initialize transaction → use bank transfer checkout
      const { data } = await paystackClient.post('/transaction/initialize', {
        amount: amount * 100,           // Paystack uses kobo
        email: customer.email,
        reference,
        currency,
        channels: ['bank_transfer'],
        metadata: {
          first_name: customer.firstName,
          last_name: customer.lastName,
          phone: customer.phone,
        },
      });
      return {
        success: true,
        checkoutUrl: data.data.authorization_url,
        accessCode: data.data.access_code,
        reference: data.data.reference,
        amount,
        currency,
        raw: data,
      };
    },
    'createVirtualAccount',
    provider
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CARD CHARGE
// ═══════════════════════════════════════════════════════════════════════════════
async function chargeCard({ amount, currency = 'NGN', customer, card, reference, description = 'Vaamoose payment', callbackUrl, provider = null }) {
  return withFallback(
    async () => {
      const { data } = await payazaClient.post('/card/card_charge/', {
        service_payload: {
          first_name: customer.firstName,
          last_name: customer.lastName,
          email_address: customer.email,
          phone_number: customer.phone,
          amount,
          transaction_reference: reference,
          currency,
          description,
          card: {
            cardNumber: card.number.replace(/\s/g, ''),
            expiryMonth: card.expiryMonth,
            expiryYear: card.expiryYear,
            securityCode: card.cvv,
          },
          callback_url: callbackUrl || process.env.PAYMENT_CALLBACK_URL,
        },
      });
      return {
        success: true,
        transactionId: data.data?.transaction_id,
        status: data.data?.status,
        reference,
        requiresOtp: data.data?.requires_otp || false,
        raw: data,
      };
    },
    async () => {
      // Paystack: direct charge
      const { data } = await paystackClient.post('/charge', {
        email: customer.email,
        amount: amount * 100,
        reference,
        card: {
          number: card.number.replace(/\s/g, ''),
          cvv: card.cvv,
          expiry_month: card.expiryMonth,
          expiry_year: card.expiryYear,
        },
      });
      return {
        success: true,
        transactionId: data.data?.id,
        status: data.data?.status,
        reference,
        requiresOtp: data.data?.status === 'send_otp',
        raw: data,
      };
    },
    'chargeCard',
    provider
  );
}

// ─── Card Auth/Capture (two-step) ─────────────────────────────────────────────
async function authorizeCard({ amount, currency = 'NGN', customer, card, reference, provider = 'payaza' }) {
  try {
    if (!config.payaza.apiKey) throw new Error('Payaza API key not configured');
    const { data } = await payazaClient.post('/card/card_charge/', {
      service_payload: {
        first_name: customer.firstName,
        last_name: customer.lastName,
        email_address: customer.email,
        phone_number: customer.phone,
        amount,
        transaction_reference: reference,
        currency,
        description: 'Vaamoose auth',
        card: {
          cardNumber: card.number.replace(/\s/g, ''),
          expiryMonth: card.expiryMonth,
          expiryYear: card.expiryYear,
          securityCode: card.cvv,
        },
        transaction_type: 'auth',       // auth-only, do not capture yet
      },
    });
    return { success: true, authCode: data.data?.auth_code, reference, provider: 'payaza', raw: data };
  } catch (err) {
    throw new PaymentError('Card authorization failed', { payaza: err });
  }
}

async function captureCard({ reference, amount }) {
  try {
    if (!config.payaza.apiKey) throw new Error('Payaza API key not configured');
    const { data } = await payazaClient.post('/card/capture/', {
      service_payload: { transaction_reference: reference, amount },
    });
    return { success: true, reference, provider: 'payaza', raw: data };
  } catch (err) {
    throw new PaymentError('Card capture failed', { payaza: err });
  }
}

async function voidCard({ reference }) {
  try {
    if (!config.payaza.apiKey) throw new Error('Payaza API key not configured');
    const { data } = await payazaClient.post('/card/void/', {
      service_payload: { transaction_reference: reference },
    });
    return { success: true, reference, provider: 'payaza', raw: data };
  } catch (err) {
    throw new PaymentError('Card void failed', { payaza: err });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MOBILE MONEY
// ═══════════════════════════════════════════════════════════════════════════════
async function chargeMobileMoney({ amount, currency, customer, mobileNumber, bankCode, countryCode, reference, provider = null }) {
  return withFallback(
    async () => {
      const { data } = await payazaClient.post(
        '/subsidiary/collections/v1/process-collection',
        {
          amount,
          customer_number: mobileNumber,
          transaction_reference: reference,
          transaction_description: 'Vaamoose payment',
          customer_bank_code: bankCode,   // e.g. "AIR" for Airtel, "MTN" for MTN
          currency_code: currency,        // GHS, KES, TZS etc.
          customer_email: customer.email,
          customer_first_name: customer.firstName,
          customer_last_name: customer.lastName,
          customer_phone_number: mobileNumber,
          country_code: countryCode,      // GH, KE, TZ, UG
        }
      );
      return { success: true, reference, status: data.status, provider: 'payaza', raw: data };
    },
    async () => {
      // Paystack: mobile_money channel
      const { data } = await paystackClient.post('/charge', {
        email: customer.email,
        amount: amount * 100,
        currency,
        mobile_money: { phone: mobileNumber, provider: bankCode.toLowerCase() },
        reference,
      });
      return { success: true, reference, status: data.data?.status, provider: 'paystack', raw: data };
    },
    'chargeMobileMoney',
    provider
  );
}

// ─── Account funding status (MoMo) ───────────────────────────────────────────
async function getMomoStatus({ reference, countryCode }) {
  try {
    if (!config.payaza.apiKey) throw new Error('Payaza API key not configured');
    const { data } = await payazaClient.get(
      `/subsidiary/collections/v1/check-status?transaction_reference=${reference}&country_code=${countryCode}`
    );
    return { status: data.status, reference, raw: data };
  } catch (err) {
    throw new PaymentError('MoMo status check failed', { payaza: err });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BANK TRANSFER / PAYOUT
// ═══════════════════════════════════════════════════════════════════════════════
async function bankEnquiry({ accountNumber, bankCode, currency = 'NGN', provider = null }) {
  return withFallback(
    async () => {
      const { data } = await payazaClient.post(
        '/payaza-account/api/v1/mainaccounts/merchant/provider/enquiry',
        { service_payload: { currency, bank_code: bankCode, account_number: accountNumber } }
      );
      return { success: true, accountName: data.data?.account_name, raw: data };
    },
    async () => {
      const { data } = await paystackClient.get(
        `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`
      );
      return { success: true, accountName: data.data?.account_name, raw: data };
    },
    'bankEnquiry',
    provider
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TRANSACTION STATUS
// ═══════════════════════════════════════════════════════════════════════════════
async function getTransactionStatus({ reference, provider = 'payaza' }) {
  if (provider === 'paystack') {
    const { data } = await paystackClient.get(`/transaction/verify/${reference}`);
    return {
      status: data.data?.status,
      amount: data.data?.amount / 100,
      reference,
      provider: 'paystack',
      raw: data,
    };
  }

  // Try Payaza card status first, then VA query
  try {
    if (!config.payaza.apiKey) throw new Error('Payaza API key not configured');
    const { data } = await payazaClient.post('/card/card_charge/transaction_status', {
      service_payload: { transaction_reference: reference },
    });
    return { status: data.data?.status, reference, provider: 'payaza', raw: data };
  } catch {
    const { data } = await payazaClient.get(
      `/merchant-collection/transfer_notification_controller/transaction-query?transaction_reference=${reference}`
    );
    return { status: data.data?.status, reference, provider: 'payaza', raw: data };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  REFUNDS
// ═══════════════════════════════════════════════════════════════════════════════
async function refundTransaction({ reference, amount, reason = 'Customer request', provider = 'payaza' }) {
  if (provider === 'paystack') {
    const { data } = await paystackClient.post('/refund', {
      transaction: reference,
      amount: amount * 100,
      merchant_note: reason,
    });
    return { success: true, reference, provider: 'paystack', raw: data };
  }

  try {
    if (!config.payaza.apiKey) throw new Error('Payaza API key not configured');
    const { data } = await payazaClient.post('/card/refund/', {
      service_payload: { transaction_reference: reference, amount, reason },
    });
    return { success: true, reference, provider: 'payaza', raw: data };
  } catch (err) {
    throw new PaymentError('Refund failed', { payaza: err });
  }
}

module.exports = {
  createVirtualAccount,
  chargeCard,
  authorizeCard,
  captureCard,
  voidCard,
  chargeMobileMoney,
  getMomoStatus,
  bankEnquiry,
  getTransactionStatus,
  refundTransaction,
  PaymentError,
  config,
};
