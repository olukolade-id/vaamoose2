/**
 * Vaamoose Payment Server
 * Express app entry point
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const paymentRoutes = require('./routes/paymentRoutes');
const { payazaWebhookHandler, paystackWebhookHandler } = require('./webhooks/webhookHandler');

const app = express();

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));

// ─── Webhook routes need raw body — mount BEFORE json parser ──────────────────
app.post('/webhooks/payaza', express.raw({ type: 'application/json' }), (req, res, next) => {
  try { req.body = JSON.parse(req.body); } catch { req.body = {}; }
  payazaWebhookHandler(req, res, next);
});

app.post('/webhooks/paystack', express.raw({ type: 'application/json' }), (req, res, next) => {
  try { req.body = JSON.parse(req.body); } catch { req.body = {}; }
  paystackWebhookHandler(req, res, next);
});

// ─── JSON parser for all other routes ────────────────────────────────────────
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/payments', paymentRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── Global error handler ────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ success: false, message: 'Server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Vaamoose payment server running on port ${PORT}`));

module.exports = app;