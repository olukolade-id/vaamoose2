/**
 * Payment Routes
 * All Vaamoose payment endpoints
 * Mount at: app.use('/api/payments', paymentRoutes)
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const {
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
} = require('../providers/paymentProvider');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const genRef = (prefix = 'VMO') => `${prefix}-${uuidv4().split('-')[0].toUpperCase()}-${Date.now()}`;

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ─── Error middleware ─────────────────────────────────────────────────────────
router.use((err, req, res, next) => {
  if (err instanceof PaymentError) {
    return res.status(502).json({ success: false, message: err.message, errors: err.errors });
  }
  console.error('[PaymentRoute Error]', err);
  res.status(500).json({ success: false, message: 'Internal payment error' });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/payments/virtual-account
//  Creates a dynamic virtual account for bank transfer checkout
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/virtual-account', asyncHandler(async (req, res) => {
  const { amount, currency = 'NGN', customer, type = 'Dynamic', expiresInMinutes = 30 } = req.body;

  if (!amount || !customer?.email || !customer?.firstName) {
    return res.status(400).json({ success: false, message: 'Missing required fields: amount, customer.email, customer.firstName' });
  }

  const reference = genRef('VA');
  const result = await createVirtualAccount({ amount, currency, customer, reference, type, expiresInMinutes });

  res.json({ success: true, data: result });
}));

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/payments/card/charge
//  Direct card charge
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/card/charge', asyncHandler(async (req, res) => {
  const { amount, currency = 'NGN', customer, card, description } = req.body;

  if (!amount || !customer?.email || !card?.number || !card?.cvv) {
    return res.status(400).json({ success: false, message: 'Missing required card fields' });
  }

  const reference = genRef('CRD');
  const result = await chargeCard({
    amount, currency, customer, card, reference, description,
    callbackUrl: `${process.env.APP_URL}/payments/callback`,
  });

  res.json({ success: true, data: result });
}));

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/payments/card/authorize
//  Auth only — don't capture yet (e.g. hold funds before booking confirmation)
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/card/authorize', asyncHandler(async (req, res) => {
  const { amount, currency = 'NGN', customer, card } = req.body;
  const reference = genRef('AUTH');
  const result = await authorizeCard({ amount, currency, customer, card, reference });
  res.json({ success: true, data: result });
}));

// ─── POST /api/payments/card/capture ─────────────────────────────────────────
router.post('/card/capture', asyncHandler(async (req, res) => {
  const { reference, amount } = req.body;
  if (!reference) return res.status(400).json({ success: false, message: 'reference required' });
  const result = await captureCard({ reference, amount });
  res.json({ success: true, data: result });
}));

// ─── POST /api/payments/card/void ────────────────────────────────────────────
router.post('/card/void', asyncHandler(async (req, res) => {
  const { reference } = req.body;
  if (!reference) return res.status(400).json({ success: false, message: 'reference required' });
  const result = await voidCard({ reference });
  res.json({ success: true, data: result });
}));

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/payments/momo
//  Mobile Money charge (Ghana, Kenya, Tanzania, Uganda)
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/momo', asyncHandler(async (req, res) => {
  const { amount, currency, customer, mobileNumber, network, countryCode } = req.body;

  const networkBankCodeMap = {
    MTN: 'MTN', Airtel: 'AIR', Vodafone: 'VOD', Tigo: 'TGO',
  };
  const bankCode = networkBankCodeMap[network] || network;

  if (!amount || !mobileNumber || !countryCode) {
    return res.status(400).json({ success: false, message: 'amount, mobileNumber, countryCode required' });
  }

  const reference = genRef('MOMO');
  const result = await chargeMobileMoney({ amount, currency, customer, mobileNumber, bankCode, countryCode, reference });
  res.json({ success: true, data: result });
}));

// ─── GET /api/payments/momo/status ───────────────────────────────────────────
router.get('/momo/status', asyncHandler(async (req, res) => {
  const { reference, countryCode } = req.query;
  if (!reference || !countryCode) {
    return res.status(400).json({ success: false, message: 'reference and countryCode required' });
  }
  const result = await getMomoStatus({ reference, countryCode });
  res.json({ success: true, data: result });
}));

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/payments/status/:reference
//  Check any transaction status
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/status/:reference', asyncHandler(async (req, res) => {
  const { reference } = req.params;
  const { provider = 'payaza' } = req.query;
  const result = await getTransactionStatus({ reference, provider });
  res.json({ success: true, data: result });
}));

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/payments/bank/enquiry
//  Resolve account name before transfer
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/bank/enquiry', asyncHandler(async (req, res) => {
  const { accountNumber, bankCode, currency = 'NGN' } = req.query;
  if (!accountNumber || !bankCode) {
    return res.status(400).json({ success: false, message: 'accountNumber and bankCode required' });
  }
  const result = await bankEnquiry({ accountNumber, bankCode, currency });
  res.json({ success: true, data: result });
}));

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/payments/refund
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/refund', asyncHandler(async (req, res) => {
  const { reference, amount, reason, provider } = req.body;
  if (!reference) return res.status(400).json({ success: false, message: 'reference required' });
  const result = await refundTransaction({ reference, amount, reason, provider });
  res.json({ success: true, data: result });
}));

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/payments/callback
//  Redirect URL after card/checkout completes
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/callback', asyncHandler(async (req, res) => {
  const { reference, status, trxref } = req.query;
  const ref = reference || trxref;

  if (!ref) return res.redirect(`${process.env.FRONTEND_URL}/payment/error?msg=no_reference`);

  try {
    const result = await getTransactionStatus({ reference: ref });
    if (result.status === 'success' || result.status === 'successful') {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/success?reference=${ref}`);
    }
    return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?reference=${ref}`);
  } catch {
    return res.redirect(`${process.env.FRONTEND_URL}/payment/error?reference=${ref}`);
  }
}));

module.exports = router;