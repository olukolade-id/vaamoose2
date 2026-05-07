/**
 * Payment Routes
 * All Vaamoose payment endpoints
 * Mount at: app.use('/api/payment', paymentRoutes)
 * Supports: Payaza (primary) + Paystack (fallback or explicit selection)
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
} = require('../utils/paymentProvider');
const Booking = require('../models/Booking');
const { Resend } = require('resend');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://vaamoose.online';
const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const genRef = (prefix = 'VMO') => `${prefix}-${uuidv4().split('-')[0].toUpperCase()}-${Date.now()}`;

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const sendEmail = async (to, subject, html) => {
  try {
    await resend.emails.send({ from: 'Vaamoose <onboarding@resend.dev>', to, subject, html });
  } catch (e) {
    console.error(`Email error to ${to}:`, e.message);
  }
};

// ─── Error middleware ─────────────────────────────────────────────────────────
router.use((err, req, res, next) => {
  if (err instanceof PaymentError) {
    return res.status(502).json({ success: false, message: err.message, errors: err.errors });
  }
  console.error('[PaymentRoute Error]', err);
  res.status(500).json({ success: false, message: 'Internal payment error' });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/payment/virtual-account
//  Creates a dynamic virtual account for bank transfer checkout
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/virtual-account', asyncHandler(async (req, res) => {
  const { amount, currency = 'NGN', customer, type = 'Dynamic', expiresInMinutes = 30, provider } = req.body;

  if (!amount || !customer?.email || !customer?.firstName) {
    return res.status(400).json({ success: false, message: 'Missing: amount, customer.email, customer.firstName' });
  }

  const reference = genRef('VA');
  const result = await createVirtualAccount({ amount, currency, customer, reference, type, expiresInMinutes, provider });

  res.json({ success: true, data: result });
}));

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/payment/card/charge
//  Direct card charge (with or without booking creation)
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/card/charge', asyncHandler(async (req, res) => {
  const { amount, currency = 'NGN', customer, card, description, bookingData, provider } = req.body;

  if (!amount || !customer?.email || !card?.number || !card?.cvv) {
    return res.status(400).json({ success: false, message: 'Missing required card fields' });
  }

  const reference = genRef('CRD');
  const result = await chargeCard({
    amount, currency, customer, card, reference, description,
    callbackUrl: `${FRONTEND_URL}/api/payment/callback`,
    provider,
  });

  // If payment successful and bookingData provided, create booking
  if ((result.status === 'success' || result.raw?.status === 'success') && bookingData) {
    try {
      const booking = new Booking({
        schoolId: bookingData.schoolId,
        schoolName: bookingData.schoolName,
        companyId: bookingData.companyId,
        companyName: bookingData.companyName,
        userEmail: customer.email,
        vehicleId: bookingData.vehicleId,
        vehicleName: bookingData.vehicleName,
        route: bookingData.routeTo || bookingData.route || 'N/A',
        pickupLocation: bookingData.pickupLocation || '',
        departureDate: bookingData.departureDate || new Date(),
        departureTime: bookingData.departureTime || 'N/A',
        seats: bookingData.seats || [],
        price: bookingData.totalPrice || amount,
        luggagePhotos: bookingData.luggagePhotos || [],
        paymentStatus: 'paid',
        paymentReference: reference,
        paymentProvider: result.provider,
        paidAt: new Date(),
        amountPaid: amount,
      });

      await booking.save();

      // Send confirmation emails asynchronously
      const seatList = (bookingData.seats || []).map(s => `Row ${s.row} Seat ${s.column}`).join(', ') || 'N/A';
      const formattedAmount = `₦${amount.toLocaleString('en-NG')}`;
      const refUpper = reference.toUpperCase();

      sendEmail(
        customer.email,
        `Booking Confirmed ✅ — ${bookingData.companyName} to ${bookingData.routeTo}`,
        `<div style="font-family:sans-serif"><h2>Booking Confirmed!</h2><p>Reference: ${refUpper}</p><p>Amount: ${formattedAmount}</p></div>`
      );
    } catch (dbErr) {
      console.error('Booking save error:', dbErr.message);
    }
  }

  res.json({ success: true, data: result });
}));

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/payment/card/authorize
//  Auth only — don't capture yet
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/card/authorize', asyncHandler(async (req, res) => {
  const { amount, currency = 'NGN', customer, card, provider = 'payaza' } = req.body;
  const reference = genRef('AUTH');
  const result = await authorizeCard({ amount, currency, customer, card, reference, provider });
  res.json({ success: true, data: result });
}));

// ─── POST /api/payment/card/capture ──────────────────────────────────────────
router.post('/card/capture', asyncHandler(async (req, res) => {
  const { reference, amount } = req.body;
  if (!reference) return res.status(400).json({ success: false, message: 'reference required' });
  const result = await captureCard({ reference, amount });
  res.json({ success: true, data: result });
}));

// ─── POST /api/payment/card/void ─────────────────────────────────────────────
router.post('/card/void', asyncHandler(async (req, res) => {
  const { reference } = req.body;
  if (!reference) return res.status(400).json({ success: false, message: 'reference required' });
  const result = await voidCard({ reference });
  res.json({ success: true, data: result });
}));

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/payment/momo
//  Mobile Money charge (Ghana, Kenya, Tanzania, Uganda)
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/momo', asyncHandler(async (req, res) => {
  const { amount, currency, customer, mobileNumber, network, countryCode, provider } = req.body;

  const networkBankCodeMap = {
    MTN: 'MTN', Airtel: 'AIR', Vodafone: 'VOD', Tigo: 'TGO',
  };
  const bankCode = networkBankCodeMap[network] || network;

  if (!amount || !mobileNumber || !countryCode) {
    return res.status(400).json({ success: false, message: 'amount, mobileNumber, countryCode required' });
  }

  const reference = genRef('MOMO');
  const result = await chargeMobileMoney({ amount, currency, customer, mobileNumber, bankCode, countryCode, reference, provider });
  res.json({ success: true, data: result });
}));

// ─── GET /api/payment/momo/status ────────────────────────────────────────────
router.get('/momo/status', asyncHandler(async (req, res) => {
  const { reference, countryCode } = req.query;
  if (!reference || !countryCode) {
    return res.status(400).json({ success: false, message: 'reference and countryCode required' });
  }
  const result = await getMomoStatus({ reference, countryCode });
  res.json({ success: true, data: result });
}));

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/payment/status/:reference
//  Check any transaction status
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/status/:reference', asyncHandler(async (req, res) => {
  const { reference } = req.params;
  const { provider = 'payaza' } = req.query;
  const result = await getTransactionStatus({ reference, provider });
  res.json({ success: true, data: result });
}));

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/payment/bank/enquiry
//  Resolve account name before transfer
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/bank/enquiry', asyncHandler(async (req, res) => {
  const { accountNumber, bankCode, currency = 'NGN', provider } = req.body;
  if (!accountNumber || !bankCode) {
    return res.status(400).json({ success: false, message: 'accountNumber and bankCode required' });
  }
  const result = await bankEnquiry({ accountNumber, bankCode, currency, provider });
  res.json({ success: true, data: result });
}));

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/payment/refund
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/refund', asyncHandler(async (req, res) => {
  const { reference, amount, reason, provider } = req.body;
  if (!reference) return res.status(400).json({ success: false, message: 'reference required' });
  const result = await refundTransaction({ reference, amount, reason, provider });
  res.json({ success: true, data: result });
}));

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/payment/callback
//  Redirect URL after card/checkout completes
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/callback', asyncHandler(async (req, res) => {
  const { reference, status, trxref } = req.query;
  const ref = reference || trxref;

  if (!ref) return res.redirect(`${FRONTEND_URL}/payment/error?msg=no_reference`);

  try {
    const result = await getTransactionStatus({ reference: ref });
    if (result.status === 'success' || result.status === 'successful') {
      return res.redirect(`${FRONTEND_URL}/payment/success?reference=${ref}`);
    }
    return res.redirect(`${FRONTEND_URL}/payment/failed?reference=${ref}`);
  } catch {
    return res.redirect(`${FRONTEND_URL}/payment/error?reference=${ref}`);
  }
}));

module.exports = router;

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://vaamoose.online';
const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, html) => {
  try {
    const result = await resend.emails.send({
      from: 'Vaamoose <onboarding@resend.dev>',
      to,
      subject,
      html,
    });
    console.log(`✓ Email sent to ${to}`, { subject, id: result.id });
    return result;
  } catch (e) {
    console.error(`✗ Email error for ${to}:`, {
      subject,
      error: e.message
    });
    throw e;
  }
};

// INITIALIZE payment (Payaza only)
router.post('/initialize', async (req, res) => {
  try {
    const { email, amount, bookingData, paymentMethod = 'card' } = req.body;
    const companyId = req.body.companyId || bookingData?.companyId;

    if (!email || !amount || !bookingData || !companyId) {
      const missing = [];
      if (!email) missing.push('email');
      if (!amount) missing.push('amount');
      if (!bookingData) missing.push('bookingData');
      if (!companyId) missing.push('companyId');
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }

    const partner = await Partner.findById(companyId);
    if (!partner) return res.status(404).json({ error: 'Company not found' });

    // Always use Payaza for Vaamoose payments
    const reference = `VAAMO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const payazaCheckoutUrl = `${FRONTEND_URL}/checkout?reference=${reference}&amount=${amount}&email=${email}&provider=payaza`;

    console.log(`Payaza payment setup - Reference: ${reference}, Amount: ₦${amount}, Email: ${email}`);

    return res.json({
      authorization_url: payazaCheckoutUrl,
      reference,
      amount,
      email,
      provider: 'payaza',
      paymentMethod
    });
  } catch (error) {
    const errData = error?.response?.data;
    console.error('Payment init error:', errData || error.message);
    return res.status(500).json({ error: errData?.message || error.message });
  }
});

// VERIFY payment — saves booking and sends all emails
router.get('/verify/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    
    if (!reference) {
      return res.status(400).json({ error: 'Payment reference is required' });
    }

    // CHECK LOCAL DATABASE FIRST
    const existing = await Booking.findOne({ paymentReference: reference });
    if (existing && existing.paymentStatus === 'paid') {
      console.log(`✓ Booking already exists and paid for reference: ${reference}`);
      return res.json({ success: true, booking: existing, message: 'Payment already verified' });
    }
    if (existing && existing.paymentStatus !== 'paid') {
      console.log(`⚠ Booking exists but payment not completed for reference: ${reference}`);
      return res.status(400).json({ error: 'Payment not completed for this reference' });
    }

    // If NO BOOKING EXISTS, the payment was likely NOT processed through card-charge endpoint
    // This means the user either:
    // 1. Didn't complete the payment
    // 2. The reference is invalid
    // 3. They're trying to manually verify without payment
    console.warn(`No booking found for reference: ${reference}. Payment may not have been processed.`);
    
    let transaction;
    const provider = 'payaza';

    // Try to verify with Payaza as a fallback
    try {
      console.log(`Attempting Payaza verification for reference: ${reference}`);
      const payazaResponse = await paymentService.getTransactionStatus(reference);

      if (payazaResponse && (payazaResponse.status === 'success' || payazaResponse.success)) {
        transaction = {
          status: 'success',
          reference,
          amount: payazaResponse.amount || 0,
          customer: { email: payazaResponse.email || payazaResponse.customer?.email || '' },
          metadata: payazaResponse.metadata || payazaResponse.service_payload || {}
        };
        console.log(`✓ Payaza transaction verified successfully`);
      } else {
        console.warn(`Payaza transaction status not success: ${payazaResponse?.status}`);
        return res.status(400).json({ error: `Payment not successful. Status: ${payazaResponse?.status || 'unknown'}` });
      }
    } catch (payazaError) {
      const errorMsg = payazaError.response?.data?.message || payazaError.message || '';
      const errorStatus = payazaError.response?.status;
      
      // Handle "transaction not found" errors
      if (errorMsg.includes('not found') || errorMsg.includes('Transaction not found') || errorStatus === 404) {
        console.error('Transaction not found in Payaza:', {
          reference,
          message: errorMsg,
          status: errorStatus
        });
        return res.status(404).json({
          error: 'Payment reference not found. Please ensure you have completed the payment and try again.',
          details: 'If you completed the payment, the booking should have been created automatically. Contact support with this reference.'
        });
      }
      
      console.error('Payaza verification error:', {
        message: errorMsg,
        status: errorStatus,
        data: payazaError.response?.data
      });
      return res.status(400).json({
        error: errorMsg || 'Payment verification failed. Please ensure payment was completed and try again.'
      });
    }

    if (transaction.status !== 'success') {
      return res.status(400).json({ error: `Payment status: ${transaction.status}` });
    }

    let bookingData = {};
    try {
      bookingData = JSON.parse(transaction.metadata?.bookingData || '{}');
    } catch (parseError) {
      console.warn('Failed to parse booking data:', parseError.message);
      bookingData = transaction.metadata?.bookingData || {};
    }

    // Validate required booking data
    if (!bookingData.companyId || !bookingData.schoolId) {
      console.error('Missing required booking data:', { companyId: bookingData.companyId, schoolId: bookingData.schoolId });
      return res.status(400).json({ 
        error: 'Invalid payment metadata. Please contact support.' 
      });
    }

    const studentEmail = transaction.customer?.email;
    if (!studentEmail) {
      console.error('No student email found in transaction');
      return res.status(400).json({ 
        error: 'Payment verification incomplete. Missing customer email.' 
      });
    }

    // Handle amount conversion based on provider
    let amountPaid;
    if (provider === 'paystack') {
      amountPaid = transaction.amount / 100; // Paystack amounts are in kobo
    } else {
      amountPaid = transaction.amount || 0; // Payaza amounts may be in the correct unit already
    }

    const formattedAmount = `₦${amountPaid.toLocaleString('en-NG')}`;
    const refUpper = reference.toUpperCase();
    const seatList = (bookingData.seats || []).map(s => `Row ${s.row} Seat ${s.column}`).join(', ') || 'N/A';

    let booking;
    try {
      booking = new Booking({
        schoolId:         bookingData.schoolId,
        schoolName:       bookingData.schoolName,
        companyId:        bookingData.companyId,
        companyName:      bookingData.companyName,
        userEmail:        studentEmail,
        vehicleId:        bookingData.vehicleId,
        vehicleName:      bookingData.vehicleName,
        route:            bookingData.routeTo || bookingData.route || 'N/A',
        pickupLocation:   bookingData.pickupLocation || '',
        departureDate:    bookingData.departureDate || new Date(),
        departureTime:    bookingData.departureTime || 'N/A',
        seats:            bookingData.seats || [],
        price:            bookingData.totalPrice || amountPaid,
        luggagePhotos:    bookingData.luggagePhotos || [],
        paymentStatus:    'paid',
        paymentReference: reference,
        paymentProvider:  provider,
        paidAt:           new Date(),
        amountPaid,
      });

      await booking.save();
      console.log(`✓ Booking saved successfully for reference: ${reference}`);
    } catch (dbError) {
      console.error('Database error saving booking:', {
        message: dbError.message,
        reference,
        errors: dbError.errors
      });
      return res.status(500).json({ 
        error: 'Failed to save booking. Please contact support with reference: ' + reference 
      });
    }

    // Send emails asynchronously (non-blocking)
    // EMAIL 1: Student confirmation
    sendEmail(
      studentEmail,
      `Booking Confirmed ✅ — ${bookingData.companyName} to ${bookingData.routeTo}`,
      `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#2563eb,#4f46e5);padding:32px;border-radius:16px 16px 0 0;text-align:center">
          <h1 style="color:white;margin:0;font-size:24px">Booking Confirmed! 🎉</h1>
          <p style="color:#bfdbfe;margin:8px 0 0">Your ride is booked and payment received</p>
        </div>
        <div style="background:white;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px">
          <table style="width:100%;border-collapse:collapse">
            <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 0;color:#64748b;font-size:14px">Company</td><td style="padding:10px 0;font-weight:600;color:#1e293b;font-size:14px">${bookingData.companyName || 'N/A'}</td></tr>
            <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 0;color:#64748b;font-size:14px">From</td><td style="padding:10px 0;font-weight:600;color:#1e293b;font-size:14px">${bookingData.schoolName || 'N/A'}</td></tr>
            <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 0;color:#64748b;font-size:14px">To</td><td style="padding:10px 0;font-weight:600;color:#1e293b;font-size:14px">${bookingData.routeTo || 'N/A'}</td></tr>
            <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 0;color:#64748b;font-size:14px">Date</td><td style="padding:10px 0;font-weight:600;color:#1e293b;font-size:14px">${bookingData.departureDate || 'N/A'}</td></tr>
            <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 0;color:#64748b;font-size:14px">Time</td><td style="padding:10px 0;font-weight:600;color:#1e293b;font-size:14px">${bookingData.departureTime || 'N/A'}</td></tr>
            <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 0;color:#64748b;font-size:14px">Vehicle</td><td style="padding:10px 0;font-weight:600;color:#1e293b;font-size:14px">${bookingData.vehicleName || 'N/A'}</td></tr>
            <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 0;color:#64748b;font-size:14px">Seat(s)</td><td style="padding:10px 0;font-weight:600;color:#1e293b;font-size:14px">${seatList}</td></tr>
            ${bookingData.pickupLocation ? `<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 0;color:#64748b;font-size:14px">Pickup Point</td><td style="padding:10px 0;font-weight:700;color:#2563eb;font-size:14px">📍 ${bookingData.pickupLocation}</td></tr>` : ''}
            <tr><td style="padding:10px 0;color:#64748b;font-size:14px">Amount Paid</td><td style="padding:10px 0;font-weight:700;color:#2563eb;font-size:16px">${formattedAmount}</td></tr>
          </table>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:24px 0;text-align:center">
            <p style="margin:0;font-size:13px;color:#166534">Your booking reference:</p>
            <p style="margin:8px 0;font-family:monospace;font-size:22px;font-weight:bold;color:#15803d;letter-spacing:3px">${refUpper}</p>
            <p style="margin:0;font-size:12px;color:#166534">Show this at boarding if needed</p>
          </div>
          <p style="color:#64748b;font-size:13px">Need help? Contact us at <a href="mailto:olukoladeidowu@gmail.com" style="color:#2563eb">olukoladeidowu@gmail.com</a> or <a href="tel:+2348123342817" style="color:#2563eb">+234 812 334 2817</a>.</p>
          <p style="color:#94a3b8;font-size:12px;margin-bottom:0">— The Vaamoose Team 🚌</p>
        </div>
      </div>`
    ).catch(e => console.error('Failed to send student email:', e.message));

    // EMAIL 2: Admin notification
    sendEmail(
      process.env.ADMIN_EMAIL || 'olukoladeidowu@gmail.com',
      `💰 New Booking — ${bookingData.companyName} | ${formattedAmount}`,
      `<div style="font-family:sans-serif;max-width:520px">
        <h2 style="color:#2563eb;margin-top:0">New Booking Completed 🎉</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 4px;color:#64748b;font-size:14px;width:140px">Student Email</td><td style="padding:8px 4px;font-weight:600;font-size:14px">${studentEmail}</td></tr>
          <tr style="background:#f8fafc"><td style="padding:8px 4px;color:#64748b;font-size:14px">Company</td><td style="padding:8px 4px;font-weight:600;font-size:14px">${bookingData.companyName}</td></tr>
          <tr><td style="padding:8px 4px;color:#64748b;font-size:14px">Route</td><td style="padding:8px 4px;font-size:14px">${bookingData.schoolName} → ${bookingData.routeTo}</td></tr>
          <tr style="background:#f8fafc"><td style="padding:8px 4px;color:#64748b;font-size:14px">Date & Time</td><td style="padding:8px 4px;font-size:14px">${bookingData.departureDate} at ${bookingData.departureTime}</td></tr>
          <tr><td style="padding:8px 4px;color:#64748b;font-size:14px">Amount Paid</td><td style="padding:8px 4px;font-weight:700;color:#2563eb;font-size:16px">${formattedAmount}</td></tr>
          <tr style="background:#f8fafc"><td style="padding:8px 4px;color:#64748b;font-size:14px">Your 15% cut</td><td style="padding:8px 4px;font-weight:700;color:#16a34a;font-size:16px">₦${Math.round(amountPaid * 0.15).toLocaleString('en-NG')}</td></tr>
          <tr><td style="padding:8px 4px;color:#64748b;font-size:14px">Reference</td><td style="padding:8px 4px;font-family:monospace;font-size:14px">${refUpper}</td></tr>
        </table>
      </div>`
    ).catch(e => console.error('Failed to send admin email:', e.message));

    // EMAIL 3: Partner notification
    try {
      const partner = await Partner.findById(bookingData.companyId).select('email companyName');
      if (partner?.email) {
        sendEmail(
          partner.email,
          `📋 New Booking — ${bookingData.schoolName} → ${bookingData.routeTo}`,
          `<div style="font-family:sans-serif;max-width:520px">
            <h2 style="color:#2563eb;margin-top:0">New Booking on Vaamoose</h2>
            <p style="color:#475569">Hi <b>${partner.companyName}</b>, you have a new confirmed booking!</p>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 4px;color:#64748b;font-size:14px;width:140px">Route</td><td style="padding:8px 4px;font-weight:600;font-size:14px">${bookingData.schoolName} → ${bookingData.routeTo}</td></tr>
              <tr style="background:#f8fafc"><td style="padding:8px 4px;color:#64748b;font-size:14px">Date & Time</td><td style="padding:8px 4px;font-size:14px">${bookingData.departureDate} at ${bookingData.departureTime}</td></tr>
              <tr><td style="padding:8px 4px;color:#64748b;font-size:14px">Seat(s)</td><td style="padding:8px 4px;font-size:14px">${seatList}</td></tr>
              ${bookingData.pickupLocation ? `<tr style="background:#f8fafc"><td style="padding:8px 4px;color:#64748b;font-size:14px">Pickup Point</td><td style="padding:8px 4px;font-weight:600;color:#2563eb;font-size:14px">📍 ${bookingData.pickupLocation}</td></tr>` : ''}
              <tr><td style="padding:8px 4px;color:#64748b;font-size:14px">Your Earnings (85%)</td><td style="padding:8px 4px;font-weight:700;color:#16a34a;font-size:16px">₦${Math.round(amountPaid * 0.85).toLocaleString('en-NG')}</td></tr>
              <tr style="background:#f8fafc"><td style="padding:8px 4px;color:#64748b;font-size:14px">Reference</td><td style="padding:8px 4px;font-family:monospace;font-size:14px">${refUpper}</td></tr>
            </table>
            <p style="color:#64748b;font-size:13px;margin-top:16px">View all bookings in your <a href="https://vaamoose.online" style="color:#2563eb;font-weight:600">partner dashboard →</a></p>
          </div>`
        ).catch(e => console.error('Failed to send partner email:', e.message));
      }
    } catch (partnerError) {
      console.warn('Failed to fetch or notify partner:', partnerError.message);
    }

    console.log(`✓ Payment verification completed successfully for reference: ${reference}`);
    res.json({ success: true, booking, message: 'Payment verified and booking confirmed!' });
  } catch (error) {
    console.error('Payment verify error:', {
      message: error.message,
      stack: error.stack,
      response: error?.response?.data
    });
    res.status(500).json({ 
      error: error?.response?.data?.message || error.message || 'Payment verification failed. Please contact support.',
      reference: req.params.reference
    });
  }
});

// VERIFY RECEIPT
router.get('/verify-receipt/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    const booking = await Booking.findOne({ paymentReference: reference });
    if (!booking) return res.status(404).json({ error: 'No booking found for this reference.' });
    if (booking.paymentStatus !== 'paid') return res.status(400).json({ error: 'This booking has not been paid.' });
    res.json({ success: true, booking });
  } catch (error) {
    console.error('Verify receipt error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// PAYAZA SPECIFIC ROUTES

// Card Charge
router.post('/payaza/card-charge', async (req, res) => {
  try {
    const { reference, amount, email, card, bookingData } = req.body;
    
    if (!reference || !amount || !email || !card) {
      return res.status(400).json({ 
        error: 'Missing required fields: reference, amount, email, card',
        success: false
      });
    }

    // Charge the card via Payaza
    const cardData = {
      first_name: card.cardHolderName?.split(' ')[0] || 'Customer',
      last_name: card.cardHolderName?.split(' ')[1] || '',
      email,
      phone_number: card.phoneNumber || '+234',
      amount,
      reference,
      currency: 'NGN',
      description: 'Vaamoose Booking Payment',
      card: {
        cardNumber: card.cardNumber,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        securityCode: card.cvv
      }
    };

    const chargeResult = await paymentService.chargeCard(cardData);
    
    if (chargeResult.status === 'success' || chargeResult.success) {
      // Create booking
      const booking = new Booking({
        schoolId: bookingData?.schoolId,
        schoolName: bookingData?.schoolName,
        companyId: bookingData?.companyId,
        companyName: bookingData?.companyName,
        userEmail: email,
        vehicleId: bookingData?.vehicleId,
        vehicleName: bookingData?.vehicleName,
        route: bookingData?.routeTo || bookingData?.route || 'N/A',
        pickupLocation: bookingData?.pickupLocation || '',
        departureDate: bookingData?.departureDate || new Date(),
        departureTime: bookingData?.departureTime || 'N/A',
        seats: bookingData?.seats || [],
        price: bookingData?.totalPrice || amount,
        luggagePhotos: bookingData?.luggagePhotos || [],
        paymentStatus: 'paid',
        paymentReference: reference,
        paymentProvider: 'payaza',
        paidAt: new Date(),
        amountPaid: amount,
      });

      await booking.save();

      // Send confirmation emails
      const seatList = (bookingData?.seats || []).map(s => `Row ${s.row} Seat ${s.column}`).join(', ') || 'N/A';
      const formattedAmount = `₦${amount.toLocaleString('en-NG')}`;
      const refUpper = reference.toUpperCase();

      sendEmail(
        email,
        `Booking Confirmed ✅ — ${bookingData?.companyName} to ${bookingData?.routeTo}`,
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#2563eb,#4f46e5);padding:32px;border-radius:16px 16px 0 0;text-align:center">
            <h1 style="color:white;margin:0;font-size:24px">Booking Confirmed! 🎉</h1>
            <p style="color:#bfdbfe;margin:8px 0 0">Your ride is booked and payment received</p>
          </div>
          <div style="background:white;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:24px 0;text-align:center">
              <p style="margin:0;font-size:13px;color:#166534">Your booking reference:</p>
              <p style="margin:8px 0;font-family:monospace;font-size:22px;font-weight:bold;color:#15803d;letter-spacing:3px">${refUpper}</p>
              <p style="margin:0;font-size:12px;color:#166534">Show this at boarding if needed</p>
            </div>
            <p style="color:#64748b;font-size:13px">Amount Paid: <strong>${formattedAmount}</strong></p>
          </div>
        </div>`
      );

      console.log(`✓ Booking created successfully for reference: ${reference}`);
      
      // Send admin notification email
      sendEmail(
        process.env.ADMIN_EMAIL || 'olukoladeidowu@gmail.com',
        `💰 New Booking — ${bookingData?.companyName} | ₦${amount.toLocaleString('en-NG')}`,
        `<div style="font-family:sans-serif;max-width:520px"><h2 style="color:#2563eb">New Booking via Payaza</h2><p>Reference: ${refUpper}</p><p>Email: ${email}</p><p>Amount: ₦${amount.toLocaleString('en-NG')}</p></div>`
      ).catch(e => console.error('Failed to send admin email:', e.message));

      return res.json({
        success: true,
        booking,
        reference,
        message: 'Payment successful and booking created!'
      });
    } else {
      console.warn(`Card charge failed for reference ${reference}:`, chargeResult);
      return res.status(400).json({
        success: false,
        error: chargeResult.message || 'Card charge failed. Please try again or contact support.'
      });
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    const errorStatus = error.response?.status;
    
    console.error('Card charge error:', {
      message: errorMessage,
      status: errorStatus,
      reference: req.body.reference,
      email: req.body.email
    });
    
    // Return more informative error messages
    if (errorStatus === 400 || errorStatus === 401) {
      return res.status(400).json({
        success: false,
        error: 'Card declined or invalid. Please check your card details and try again.'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: errorMessage || 'Payment processing failed. Please try again or contact support.'
    });
  }
});

// Transaction Status
router.post('/payaza/transaction-status', async (req, res) => {
  try {
    const { transaction_reference } = req.body;
    const result = await paymentService.getTransactionStatus(transaction_reference);
    res.json(result);
  } catch (error) {
    console.error('Transaction status error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Mobile Money Collection
router.post('/payaza/mobile-money-collection', async (req, res) => {
  try {
    const collectionData = req.body;
    const result = await paymentService.processMobileMoneyCollection(collectionData);
    res.json(result);
  } catch (error) {
    console.error('Mobile money collection error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Account Funding
router.post('/payaza/account-funding', async (req, res) => {
  try {
    const fundingData = req.body;
    const result = await paymentService.processAccountFunding(fundingData);
    res.json(result);
  } catch (error) {
    console.error('Account funding error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Check Collection Status
router.get('/payaza/collection-status', async (req, res) => {
  try {
    const { transaction_reference, country_code } = req.query;
    const result = await paymentService.checkCollectionStatus(transaction_reference, country_code);
    res.json(result);
  } catch (error) {
    console.error('Collection status check error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Transfer/Payout
router.post('/payaza/transfer', async (req, res) => {
  try {
    const transferData = req.body;
    const result = await paymentService.initiateTransfer(transferData);
    res.json(result);
  } catch (error) {
    console.error('Transfer error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Account Enquiry
router.post('/payaza/account-enquiry', async (req, res) => {
  try {
    const enquiryData = req.body;
    const result = await paymentService.accountEnquiry(enquiryData);
    res.json(result);
  } catch (error) {
    console.error('Account enquiry error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Create Virtual Account
router.post('/payaza/virtual-account', async (req, res) => {
  try {
    const accountData = req.body;
    const result = await paymentService.createVirtualAccount(accountData);
    res.json(result);
  } catch (error) {
    console.error('Virtual account creation error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get Virtual Account Details
router.get('/payaza/virtual-account/:accountNumber', async (req, res) => {
  try {
    const { accountNumber } = req.params;
    const result = await paymentService.getVirtualAccountDetails(accountNumber);
    res.json(result);
  } catch (error) {
    console.error('Virtual account details error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Transfer Notification Query
router.get('/payaza/transfer-query', async (req, res) => {
  try {
    const { transaction_reference } = req.query;
    const result = await paymentService.queryTransferNotification(transaction_reference);
    res.json(result);
  } catch (error) {
    console.error('Transfer notification query error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Switch Payment Provider
router.post('/switch-provider', async (req, res) => {
  try {
    const { provider } = req.body;
    paymentService.switchProvider(provider);
    res.json({ success: true, currentProvider: paymentService.getCurrentProvider() });
  } catch (error) {
    console.error('Provider switch error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Get Current Provider
router.get('/current-provider', (req, res) => {
  res.json({ provider: paymentProvider.config.payaza.apiKey ? 'payaza' : 'paystack' });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  NEW: Unified Payment Endpoints (Payaza + Paystack)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/payment/virtual-account
 * Create a dynamic virtual account for bank transfer
 */
router.post('/virtual-account', async (req, res) => {
  try {
    const { amount, currency = 'NGN', customer, bookingData } = req.body;
    const reference = `VAAMO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (!amount || !customer?.email) {
      return res.status(400).json({ error: 'Missing amount or customer email' });
    }

    const result = await paymentProvider.createVirtualAccount({
      amount,
      currency,
      customer: {
        firstName: customer.firstName || 'Customer',
        lastName: customer.lastName || '',
        email: customer.email,
        phone: customer.phone || '',
      },
      reference,
      expiresInMinutes: 30,
    });

    res.json({ ...result, reference, bookingData });
  } catch (error) {
    console.error('Virtual account creation error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payment/charge
 * Charge card with optional OTP
 */
router.post('/charge', async (req, res) => {
  try {
    const { amount, currency = 'NGN', customer, card, method = 'card', bookingData } = req.body;
    const reference = `VAAMO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (!amount || !customer?.email || !card) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await paymentProvider.chargeCard({
      amount,
      currency,
      customer: {
        firstName: card.cardHolderName?.split(' ')[0] || customer.firstName || 'Customer',
        lastName: card.cardHolderName?.split(' ')[1] || customer.lastName || '',
        email: customer.email,
        phone: customer.phone || '',
      },
      card: {
        number: card.cardNumber,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        cvv: card.cvv,
      },
      reference,
      description: 'Vaamoose Booking',
    });

    // If payment successful, create booking
    if (result.status === 'success' || result.raw?.status === 'success') {
      const booking = new Booking({
        schoolId: bookingData?.schoolId,
        schoolName: bookingData?.schoolName,
        companyId: bookingData?.companyId,
        companyName: bookingData?.companyName,
        userEmail: customer.email,
        vehicleId: bookingData?.vehicleId,
        vehicleName: bookingData?.vehicleName,
        route: bookingData?.routeTo || bookingData?.route || 'N/A',
        pickupLocation: bookingData?.pickupLocation || '',
        departureDate: bookingData?.departureDate || new Date(),
        departureTime: bookingData?.departureTime || 'N/A',
        seats: bookingData?.seats || [],
        price: bookingData?.totalPrice || amount,
        luggagePhotos: bookingData?.luggagePhotos || [],
        paymentStatus: 'paid',
        paymentReference: reference,
        paymentProvider: result.provider,
        paidAt: new Date(),
        amountPaid: amount,
      });

      await booking.save();

      // Send emails asynchronously
      const seatList = (bookingData?.seats || []).map(s => `Row ${s.row} Seat ${s.column}`).join(', ') || 'N/A';
      const formattedAmount = `₦${amount.toLocaleString('en-NG')}`;
      const refUpper = reference.toUpperCase();

      sendEmail(
        customer.email,
        `Booking Confirmed ✅ — ${bookingData?.companyName} to ${bookingData?.routeTo}`,
        generateBookingConfirmationEmail(bookingData, refUpper, formattedAmount, seatList)
      ).catch(e => console.error('Email error:', e.message));

      res.json({ success: true, booking, reference, provider: result.provider });
    } else {
      res.status(400).json({ error: 'Payment declined', result });
    }
  } catch (error) {
    console.error('Charge error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payment/card/authorize
 * Authorize card (hold funds)
 */
router.post('/card/authorize', async (req, res) => {
  try {
    const { amount, currency = 'NGN', customer, card } = req.body;
    const reference = `AUTH-${Date.now()}`;

    const result = await paymentProvider.authorizeCard({
      amount,
      currency,
      customer: {
        firstName: customer.firstName || 'Customer',
        lastName: customer.lastName || '',
        email: customer.email,
        phone: customer.phone || '',
      },
      card: {
        number: card.cardNumber,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        cvv: card.cvv,
      },
      reference,
    });

    res.json({ ...result, reference });
  } catch (error) {
    console.error('Card authorization error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payment/card/capture
 * Capture previously authorized funds
 */
router.post('/card/capture', async (req, res) => {
  try {
    const { reference, amount } = req.body;

    if (!reference || !amount) {
      return res.status(400).json({ error: 'Missing reference or amount' });
    }

    const result = await paymentProvider.captureCard({ reference, amount });
    res.json(result);
  } catch (error) {
    console.error('Card capture error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payment/card/void
 * Void a card authorization
 */
router.post('/card/void', async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ error: 'Missing reference' });
    }

    const result = await paymentProvider.voidCard({ reference });
    res.json(result);
  } catch (error) {
    console.error('Card void error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payment/momo
 * Charge mobile money
 */
router.post('/momo', async (req, res) => {
  try {
    const { amount, currency, customer, mobileNumber, bankCode, countryCode, bookingData } = req.body;
    const reference = `MOMO-${Date.now()}`;

    if (!amount || !mobileNumber || !bankCode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await paymentProvider.chargeMobileMoney({
      amount,
      currency: currency || 'GHS',
      customer: {
        firstName: customer.firstName || 'Customer',
        lastName: customer.lastName || '',
        email: customer.email || '',
      },
      mobileNumber,
      bankCode,
      countryCode: countryCode || 'GH',
      reference,
    });

    res.json({ ...result, reference });
  } catch (error) {
    console.error('MoMo charge error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payment/momo/status
 * Check mobile money transaction status
 */
router.get('/momo/status', async (req, res) => {
  try {
    const { reference, countryCode = 'GH' } = req.query;

    if (!reference) {
      return res.status(400).json({ error: 'Missing reference' });
    }

    const result = await paymentProvider.getMomoStatus({ reference, countryCode });
    res.json(result);
  } catch (error) {
    console.error('MoMo status error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payment/bank/enquiry
 * Resolve bank account name
 */
router.post('/bank/enquiry', async (req, res) => {
  try {
    const { accountNumber, bankCode, currency = 'NGN' } = req.body;

    if (!accountNumber || !bankCode) {
      return res.status(400).json({ error: 'Missing account number or bank code' });
    }

    const result = await paymentProvider.bankEnquiry({
      accountNumber,
      bankCode,
      currency,
    });

    res.json(result);
  } catch (error) {
    console.error('Bank enquiry error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payment/status/:reference
 * Get transaction status
 */
router.get('/status/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    const { provider } = req.query;

    if (!reference) {
      return res.status(400).json({ error: 'Missing reference' });
    }

    const result = await paymentProvider.getTransactionStatus({
      reference,
      provider: provider || 'payaza',
    });

    res.json(result);
  } catch (error) {
    console.error('Status check error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payment/refund
 * Refund a transaction
 */
router.post('/refund', async (req, res) => {
  try {
    const { reference, amount, reason = 'Customer request', provider = 'payaza' } = req.body;

    if (!reference || !amount) {
      return res.status(400).json({ error: 'Missing reference or amount' });
    }

    const result = await paymentProvider.refundTransaction({
      reference,
      amount,
      reason,
      provider,
    });

    res.json(result);
  } catch (error) {
    console.error('Refund error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payment/callback
 * Callback/redirect after checkout
 */
router.get('/callback', async (req, res) => {
  try {
    const { reference, status } = req.query;

    if (!reference) {
      return res.status(400).json({ error: 'Missing reference' });
    }

    const booking = await Booking.findOne({ paymentReference: reference });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({
      success: booking.paymentStatus === 'paid',
      booking,
      status: booking.paymentStatus,
    });
  } catch (error) {
    console.error('Callback error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  WEBHOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/payment/webhooks/payaza
 * Handle Payaza webhooks
 */
router.post('/webhooks/payaza', payazaWebhookHandler);

/**
 * POST /api/payment/webhooks/paystack
 * Handle Paystack webhooks
 */
router.post('/webhooks/paystack', paystackWebhookHandler);

// ─── Helper Functions ─────────────────────────────────────────────────────────

function generateBookingConfirmationEmail(bookingData, refUpper, formattedAmount, seatList) {
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <div style="background:linear-gradient(135deg,#2563eb,#4f46e5);padding:32px;border-radius:16px 16px 0 0;text-align:center">
      <h1 style="color:white;margin:0;font-size:24px">Booking Confirmed! 🎉</h1>
      <p style="color:#bfdbfe;margin:8px 0 0">Your ride is booked and payment received</p>
    </div>
    <div style="background:white;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px">
      <table style="width:100%;border-collapse:collapse">
        <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 0;color:#64748b;font-size:14px">Company</td><td style="padding:10px 0;font-weight:600;color:#1e293b;font-size:14px">${bookingData?.companyName || 'N/A'}</td></tr>
        <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 0;color:#64748b;font-size:14px">From</td><td style="padding:10px 0;font-weight:600;color:#1e293b;font-size:14px">${bookingData?.schoolName || 'N/A'}</td></tr>
        <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 0;color:#64748b;font-size:14px">To</td><td style="padding:10px 0;font-weight:600;color:#1e293b;font-size:14px">${bookingData?.routeTo || 'N/A'}</td></tr>
        <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 0;color:#64748b;font-size:14px">Date</td><td style="padding:10px 0;font-weight:600;color:#1e293b;font-size:14px">${bookingData?.departureDate || 'N/A'}</td></tr>
        <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 0;color:#64748b;font-size:14px">Time</td><td style="padding:10px 0;font-weight:600;color:#1e293b;font-size:14px">${bookingData?.departureTime || 'N/A'}</td></tr>
        <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 0;color:#64748b;font-size:14px">Seats</td><td style="padding:10px 0;font-weight:600;color:#1e293b;font-size:14px">${seatList}</td></tr>
        <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 0;color:#64748b;font-size:14px">Amount Paid</td><td style="padding:10px 0;font-weight:700;color:#2563eb;font-size:16px">${formattedAmount}</td></tr>
      </table>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:24px 0;text-align:center">
        <p style="margin:0;font-size:13px;color:#166534">Your booking reference:</p>
        <p style="margin:8px 0;font-family:monospace;font-size:22px;font-weight:bold;color:#15803d;letter-spacing:3px">${refUpper}</p>
      </div>
    </div>
  </div>`;
}

module.exports = router;
