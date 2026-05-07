/**
 * Webhook Handler
 * Handles incoming webhooks from Payaza and Paystack
 * Vaamoose Payment Integration
 */

const crypto = require('crypto');

// ─── Signature Verification ───────────────────────────────────────────────────
function verifyPayazaWebhook(req) {
  const secret = process.env.PAYAZA_WEBHOOK_SECRET;
  if (!secret) return true; // skip if not configured in dev
  const signature = req.headers['x-payaza-signature'];
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');
  return signature === expected;
}

function verifyPaystackWebhook(req) {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
  if (!secret) return true;
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');
  return hash === req.headers['x-paystack-signature'];
}

// ─── Event Normalizer ─────────────────────────────────────────────────────────
// Normalize both providers into a single consistent event shape
function normalizePayazaEvent(body) {
  const event = body.event || body.notification_type || '';
  const data = body.data || body.payload || {};

  const statusMap = {
    'transaction.successful': 'success',
    'transaction.failed': 'failed',
    'virtual_account.funded': 'success',
    'chargeback.raised': 'chargeback',
    'refund.processed': 'refunded',
  };

  return {
    provider: 'payaza',
    event,
    status: statusMap[event] || data.status || 'unknown',
    reference: data.transaction_reference || data.reference,
    amount: data.amount,
    currency: data.currency || data.currency_code,
    customer: {
      email: data.email_address || data.customer_email,
      name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
      phone: data.phone_number,
    },
    raw: body,
  };
}

function normalizePaystackEvent(body) {
  const event = body.event || '';
  const data = body.data || {};

  const statusMap = {
    'charge.success': 'success',
    'transfer.success': 'success',
    'transfer.failed': 'failed',
    'transfer.reversed': 'reversed',
    'charge.dispute.create': 'chargeback',
    'refund.processed': 'refunded',
  };

  return {
    provider: 'paystack',
    event,
    status: statusMap[event] || data.status || 'unknown',
    reference: data.reference,
    amount: data.amount ? data.amount / 100 : null, // convert from kobo
    currency: data.currency,
    customer: {
      email: data.customer?.email,
      name: data.customer?.name || `${data.metadata?.first_name || ''} ${data.metadata?.last_name || ''}`.trim(),
      phone: data.metadata?.phone,
    },
    raw: body,
  };
}

// ─── Core Event Handler ───────────────────────────────────────────────────────
// Replace the DB calls below with your actual Vaamoose DB logic
async function handlePaymentEvent(normalizedEvent) {
  const { provider, event, status, reference, amount, currency, customer } = normalizedEvent;

  console.log(`[Webhook] ${provider} | ${event} | ref:${reference} | status:${status}`);

  switch (status) {
    case 'success':
      await onPaymentSuccess({ reference, amount, currency, customer, provider });
      break;

    case 'failed':
      await onPaymentFailed({ reference, provider });
      break;

    case 'chargeback':
      await onChargeback({ reference, amount, customer, provider });
      break;

    case 'refunded':
      await onRefundProcessed({ reference, amount, provider });
      break;

    default:
      console.log(`[Webhook] Unhandled event: ${event}`);
  }
}

// ─── Business Logic Handlers ──────────────────────────────────────────────────
async function onPaymentSuccess({ reference, amount, currency, customer, provider }) {
  // TODO: replace with your actual DB + business logic
  // Example:
  // await db.orders.updateOne({ reference }, { $set: { status: 'paid', paidAt: new Date(), provider } });
  // await emailService.sendConfirmation(customer.email, { reference, amount, currency });
  // await bookingService.confirmBooking(reference);
  console.log(`✅ Payment successful: ${reference} | ${currency} ${amount} | via ${provider}`);
}

async function onPaymentFailed({ reference, provider }) {
  // TODO:
  // await db.orders.updateOne({ reference }, { $set: { status: 'failed', provider } });
  // await emailService.sendPaymentFailed(customer.email);
  console.log(`❌ Payment failed: ${reference} | via ${provider}`);
}

async function onChargeback({ reference, amount, customer, provider }) {
  // TODO:
  // await db.chargebacks.insertOne({ reference, amount, customer, provider, raisedAt: new Date() });
  // await alertService.notifyTeam('chargeback', { reference, amount });
  console.log(`⚠️ Chargeback raised: ${reference} | ${amount} | via ${provider}`);
}

async function onRefundProcessed({ reference, amount, provider }) {
  // TODO:
  // await db.refunds.updateOne({ reference }, { $set: { status: 'processed', processedAt: new Date() } });
  console.log(`↩️ Refund processed: ${reference} | ${amount} | via ${provider}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  EXPRESS ROUTE HANDLERS  (mount these in your app)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /webhooks/payaza
 * Mount with raw body parser BEFORE json parser for this route
 */
async function payazaWebhookHandler(req, res) {
  if (!verifyPayazaWebhook(req)) {
    console.warn('[Webhook] Invalid Payaza signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Acknowledge immediately — Payaza expects a fast 200
  res.status(200).json({ received: true });

  try {
    const normalized = normalizePayazaEvent(req.body);
    await handlePaymentEvent(normalized);
  } catch (err) {
    console.error('[Webhook] Payaza handler error:', err);
  }
}

/**
 * POST /webhooks/paystack
 */
async function paystackWebhookHandler(req, res) {
  if (!verifyPaystackWebhook(req)) {
    console.warn('[Webhook] Invalid Paystack signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  res.status(200).json({ received: true });

  try {
    const normalized = normalizePaystackEvent(req.body);
    await handlePaymentEvent(normalized);
  } catch (err) {
    console.error('[Webhook] Paystack handler error:', err);
  }
}

module.exports = {
  payazaWebhookHandler,
  paystackWebhookHandler,
  normalizePayazaEvent,
  normalizePaystackEvent,
  handlePaymentEvent,
};