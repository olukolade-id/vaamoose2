const express = require('express');
const router = express.Router();
const axios = require('axios');
const { Resend } = require('resend');
const Booking = require('../models/Booking');
const Partner = require('../models/Partner');
const paymentService = require('../utils/paymentService');

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

    // Check if booking already exists
    const existing = await Booking.findOne({ paymentReference: reference });
    if (existing) {
      console.log(`Booking already exists for reference: ${reference}`);
      return res.json({ success: true, booking: existing });
    }

    let transaction;
    const provider = 'payaza';

    // Payaza-only verification
    try {
      console.log(`Verifying Payaza transaction: ${reference}`);
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
      console.error('Payaza verification error:', {
        message: payazaError.message,
        status: payazaError.response?.status,
        data: payazaError.response?.data
      });
      return res.status(400).json({
        error: payazaError.response?.data?.message || 'Payment verification failed. Please complete payment and try again.'
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

      return res.json({
        success: true,
        booking,
        reference,
        message: 'Payment successful and booking created!'
      });
    } else {
      return res.status(400).json({
        success: false,
        error: chargeResult.message || 'Card charge failed'
      });
    }
  } catch (error) {
    console.error('Card charge error:', error.message);
    res.status(500).json({ success: false, error: error.message });
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
  res.json({ provider: paymentService.getCurrentProvider() });
});

module.exports = router;
