const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const Partner = require('../models/Partner');
const Booking = require('../models/Booking');

const resend = new Resend(process.env.RESEND_API_KEY);

const verifyPartner = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.partnerId = decoded.partnerId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const sendEmail = async (to, subject, html) => {
  try {
    await resend.emails.send({
      from: 'Vaamoose <onboarding@resend.dev>',
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}`);
  } catch (e) {
    console.error('Email error:', e.message);
  }
};

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { companyName, email, password, phone, address, bankAccountNumber, bankCode, bankName, accountName } = req.body;
    const existing = await Partner.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const partner = new Partner({
      companyName, email, password: hashedPassword, phone, address,
      bankAccountNumber, bankCode, bankName, accountName,
    });
    await partner.save();

    sendEmail(
      process.env.ADMIN_EMAIL || 'olukoladeidowu@gmail.com',
      `🚌 New Partner Registration — ${companyName}`,
      `<div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#1e40af">New Transport Company Registered</h2>
        <p><b>Company:</b> ${companyName}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Bank:</b> ${bankName} — ${bankAccountNumber} (${accountName})</p>
        <p style="color:#64748b;font-size:13px">Log in to the admin dashboard to approve this partner.</p>
      </div>`
    );

    const token = jwt.sign({ partnerId: partner._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, partner: { id: partner._id, companyName: partner.companyName, email: partner.email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const partner = await Partner.findOne({ email });
    if (!partner) return res.status(400).json({ error: 'Invalid email or password' });
    const isMatch = await bcrypt.compare(password, partner.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ partnerId: partner._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, partner: { id: partner._id, companyName: partner.companyName, email: partner.email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET dashboard
router.get('/dashboard', verifyPartner, async (req, res) => {
  try {
    const partner = await Partner.findById(req.partnerId);
    const bookings = await Booking.find({ companyId: req.partnerId });
    const earnings = bookings.reduce((sum, b) => sum + (b.price || 0), 0);
    res.json({ partner, bookings, earnings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADD vehicle
router.post('/vehicles', verifyPartner, async (req, res) => {
  try {
    const { name, type, capacity, priceMultiplier, features } = req.body;
    const partner = await Partner.findById(req.partnerId);
    partner.vehicles.push({
      name: String(name),
      type: String(type),
      capacity: Number(capacity),
      priceMultiplier: Number(priceMultiplier) || 1,
      features: Array.isArray(features) ? features.map(String) : [],
    });
    await partner.save();
    res.json({ message: 'Vehicle added', vehicles: partner.vehicles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADD route
router.post('/routes', verifyPartner, async (req, res) => {
  try {
    const { from, to, basePrice, distance, estimatedDuration } = req.body;
    const partner = await Partner.findById(req.partnerId);
    partner.routes.push({
      from: String(from),
      to: String(to),
      basePrice: Number(basePrice),
      distance: Number(distance),
      estimatedDuration: Number(estimatedDuration),
    });
    await partner.save();
    res.json({ message: 'Route added', routes: partner.routes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADD departure
router.post('/departures', verifyPartner, async (req, res) => {
  try {
    const partner = await Partner.findById(req.partnerId);
    partner.departureDates.push(req.body);
    await partner.save();
    res.json({ message: 'Departure added', departureDates: partner.departureDates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET bookings
router.get('/bookings', verifyPartner, async (req, res) => {
  try {
    const bookings = await Booking.find({ companyId: req.partnerId });
    res.json({ bookings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SUBMIT complaint
router.post('/complaint', async (req, res) => {
  try {
    const { studentName, studentEmail, companyId, companyName, subject, message, bookingReference } = req.body;

    if (!studentEmail || !subject || !message) {
      return res.status(400).json({ error: 'Please fill in all required fields' });
    }

    sendEmail(
      process.env.ADMIN_EMAIL || 'olukoladeidowu@gmail.com',
      `🚨 Student Complaint — ${subject}`,
      `<div style="font-family:sans-serif;max-width:600px;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
        <h2 style="color:#dc2626">Student Complaint Received</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;color:#64748b">Student</td><td style="padding:8px;font-weight:bold">${studentName || 'Unknown'}</td></tr>
          <tr style="background:#f8fafc"><td style="padding:8px;color:#64748b">Email</td><td style="padding:8px">${studentEmail}</td></tr>
          <tr><td style="padding:8px;color:#64748b">Company</td><td style="padding:8px">${companyName || 'N/A'}</td></tr>
          <tr style="background:#f8fafc"><td style="padding:8px;color:#64748b">Booking Ref</td><td style="padding:8px">${bookingReference || 'N/A'}</td></tr>
          <tr><td style="padding:8px;color:#64748b">Subject</td><td style="padding:8px;font-weight:bold">${subject}</td></tr>
        </table>
        <div style="margin-top:16px;padding:16px;background:#fef2f2;border-radius:8px;border-left:4px solid #dc2626">
          <p style="margin:0;color:#7f1d1d">${message}</p>
        </div>
      </div>`
    );

    sendEmail(
      studentEmail,
      'Your complaint has been received — Vaamoose',
      `<div style="font-family:sans-serif;max-width:500px;padding:24px">
        <h2 style="color:#2563eb">Complaint Received ✓</h2>
        <p>Hi ${studentName || 'Student'},</p>
        <p>We've received your complaint and will investigate within 24-48 hours.</p>
        <p><b>Subject:</b> ${subject}</p>
        <p>If you need urgent help, reply to this email.</p>
        <p style="color:#64748b;font-size:12px">— Vaamoose Support Team</p>
      </div>`
    );

    res.json({ message: 'Complaint submitted successfully. We will respond within 24-48 hours.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── JOURNEY TRACKING ──

router.post('/journey/start', verifyPartner, async (req, res) => {
  try {
    const { bookingId, routeFrom, routeTo } = req.body;
    const partner = await Partner.findById(req.partnerId);
    partner.activeJourney = {
      bookingId, routeFrom, routeTo,
      startTime: new Date(),
      endTime: null,
      isActive: true,
      currentLat: null, currentLng: null,
      distanceKm: 0, locations: [],
    };
    await partner.save();
    res.json({ message: 'Journey started', journey: partner.activeJourney });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/journey/location', verifyPartner, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const partner = await Partner.findById(req.partnerId);
    if (!partner.activeJourney?.isActive) return res.status(400).json({ error: 'No active journey' });

    const locations = partner.activeJourney.locations || [];
    let distanceKm = partner.activeJourney.distanceKm || 0;

    if (locations.length > 0) {
      const last = locations[locations.length - 1];
      distanceKm += haversineDistance(last.lat, last.lng, lat, lng);
    }

    locations.push({ lat, lng, time: new Date() });
    if (locations.length > 100) locations.shift();

    partner.activeJourney.currentLat = lat;
    partner.activeJourney.currentLng = lng;
    partner.activeJourney.distanceKm = distanceKm;
    partner.activeJourney.locations = locations;
    partner.markModified('activeJourney');
    await partner.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/journey/end', verifyPartner, async (req, res) => {
  try {
    const partner = await Partner.findById(req.partnerId);
    if (!partner.activeJourney?.isActive) return res.status(400).json({ error: 'No active journey' });

    const startTime = new Date(partner.activeJourney.startTime);
    const endTime = new Date();
    const durationMins = Math.round((endTime - startTime) / 60000);

    partner.activeJourney.isActive = false;
    partner.activeJourney.endTime = endTime;

    if (!partner.journeyHistory) partner.journeyHistory = [];
    partner.journeyHistory.push({ ...partner.activeJourney.toObject(), endTime, durationMins });

    partner.markModified('activeJourney');
    partner.markModified('journeyHistory');
    await partner.save();

    res.json({
      message: 'Journey ended',
      summary: {
        distanceKm: (partner.activeJourney.distanceKm || 0).toFixed(2),
        durationMins,
        startTime,
        endTime,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/journey/:partnerId', async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.partnerId).select('companyName activeJourney');
    if (!partner) return res.status(404).json({ error: 'Partner not found' });
    if (!partner.activeJourney?.isActive) return res.json({ isActive: false });
    res.json({
      isActive: true,
      companyName: partner.companyName,
      routeFrom: partner.activeJourney.routeFrom,
      routeTo: partner.activeJourney.routeTo,
      currentLat: partner.activeJourney.currentLat,
      currentLng: partner.activeJourney.currentLng,
      distanceKm: (partner.activeJourney.distanceKm || 0).toFixed(2),
      startTime: partner.activeJourney.startTime,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/journey/status/me', verifyPartner, async (req, res) => {
  try {
    const partner = await Partner.findById(req.partnerId).select('activeJourney companyName');
    res.json({ isActive: partner.activeJourney?.isActive || false, journey: partner.activeJourney || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUBLIC routes
router.get('/public', async (req, res) => {
  try {
    const partners = await Partner.find({ isApproved: true }).select('-password');
    res.json({ partners });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/departures', async (req, res) => {
  try {
    const { from, to, date } = req.query;
    const partners = await Partner.find({ isApproved: true }).select('-password');
    let allDepartures = [];
    partners.forEach(partner => {
      partner.departureDates.forEach(dep => {
        allDepartures.push({ partnerId: partner._id, partnerName: partner.companyName, partnerPhone: partner.phone, ...dep.toObject() });
      });
    });
    if (from) allDepartures = allDepartures.filter(d => d.routeFrom?.toLowerCase().includes(from.toLowerCase()));
    if (to) allDepartures = allDepartures.filter(d => d.routeTo?.toLowerCase().includes(to.toLowerCase()));
    if (date) {
      allDepartures = allDepartures.filter(d => {
        return new Date(d.date).toLocaleDateString() === new Date(date).toLocaleDateString();
      });
    }
    res.json({ departures: allDepartures });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function toRad(deg) { return deg * (Math.PI / 180); }

module.exports = router;