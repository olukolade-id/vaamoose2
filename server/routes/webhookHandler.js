/**
 * Webhook Handler
 * Handles incoming webhooks from Payaza and Paystack
 * Vaamoose Payment Integration
 */

const crypto = require('crypto');
const Booking = require('../models/Booking');

// ─── Signature Verification ───────────────────────────────────────────────────
function verifyPayazaWebhook(req) {
  const secret = process.env.PAYAZA_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[Webhook] PAYAZA_WEBHOOK_SECRET not configured, skipping verification');
    return true;
  }
  const signature = req.headers['x-payaza-signature'];
  if (!signature) {
    console.warn('[Webhook] Missing x-payaza-signature header');
    return false;
  }
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');
  const valid = signature === expected;
  if (!valid) {
    console.warn('[Webhook] Invalid Payaza signature');
  }
  return valid;
}

function verifyPaystackWebhook(req) {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[Webhook] PAYSTACK_WEBHOOK_SECRET not configured, skipping verification');
    return true;
  }
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');
  const valid = hash === req.headers['x-paystack-signature'];
  if (!valid) {
    console.warn('[Webhook] Invalid Paystack signature');
  }
  return valid;
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
  try {
    // Update booking with payment confirmation
    const booking = await Booking.findOneAndUpdate(
      { paymentReference: reference },
      {
        $set: {
          paymentStatus: 'paid',
          paymentProvider: provider,
          paidAt: new Date(),
        },
      },
      { new: true }
    );

    if (booking) {
      console.log(`✅ Payment successful: ${reference} | ${currency} ${amount} | via ${provider}`);
      console.log(`✅ Booking updated: ${booking._id}`);
      // TODO: Send confirmation email, trigger notifications
    } else {
      console.warn(`⚠️ Payment succeeded but booking not found for: ${reference}`);
    }
  } catch (err) {
    console.error('[Webhook] onPaymentSuccess error:', err.message);
  }
}

async function onPaymentFailed({ reference, provider }) {
  try {
    await Booking.findOneAndUpdate(
      { paymentReference: reference },
      {
        $set: {
          paymentStatus: 'failed',
          paymentProvider: provider,
          failedAt: new Date(),
        },
      },
      { new: true }
    );
    console.log(`❌ Payment failed: ${reference} | via ${provider}`);
    // TODO: Send failure email
  } catch (err) {
    console.error('[Webhook] onPaymentFailed error:', err.message);
  }
}

async function onChargeback({ reference, amount, customer, provider }) {
  try {
    await Booking.findOneAndUpdate(
      { paymentReference: reference },
      {
        $set: {
          paymentStatus: 'chargeback',
          paymentProvider: provider,
          chargebackAt: new Date(),
        },
      },
      { new: true }
    );
    console.log(`⚠️ Chargeback raised: ${reference} | ${amount} | via ${provider}`);
    // TODO: Alert team, freeze booking
  } catch (err) {
    console.error('[Webhook] onChargeback error:', err.message);
  }
}

async function onRefundProcessed({ reference, amount, provider }) {
  try {
    await Booking.findOneAndUpdate(
      { paymentReference: reference },
      {
        $set: {
          paymentStatus: 'refunded',
          paymentProvider: provider,
          refundedAt: new Date(),
        },
      },
      { new: true }
    );
    console.log(`↩️ Refund processed: ${reference} | ${amount} | via ${provider}`);
  } catch (err) {
    console.error('[Webhook] onRefundProcessed error:', err.message);
  }
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
