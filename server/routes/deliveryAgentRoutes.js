const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const DeliveryAgent = require('../models/DeliveryAgent');
const Delivery = require('../models/Delivery');
const axios = require('axios');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const resend = new Resend(process.env.RESEND_API_KEY);

const verifyAgent = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.agentId = decoded.agentId;
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
    const { fullName, email, password, phone, coverageAreas, pricePerDelivery, bankAccountNumber, bankCode, bankName, accountName } = req.body;

    const existing = await DeliveryAgent.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const agent = new DeliveryAgent({
      fullName, email, password: hashedPassword, phone,
      coverageAreas: Array.isArray(coverageAreas) ? coverageAreas : [coverageAreas],
      pricePerDelivery: Number(pricePerDelivery) || 500,
      bankAccountNumber, bankCode, bankName, accountName,
    });
    await agent.save();

    sendEmail(
      process.env.ADMIN_EMAIL || 'olukoladeidowu@gmail.com',
      `📦 New Delivery Agent Registration — ${fullName}`,
      `<div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#2563eb">New Delivery Agent Registered</h2>
        <p><b>Name:</b> ${fullName}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Coverage Areas:</b> ${Array.isArray(coverageAreas) ? coverageAreas.join(', ') : coverageAreas}</p>
        <p><b>Price per delivery:</b> ₦${pricePerDelivery}</p>
        <p><b>Bank:</b> ${bankName} — ${bankAccountNumber} (${accountName})</p>
        <p style="color:#64748b;font-size:13px">Log in to the admin dashboard to approve this agent.</p>
      </div>`
    );

    const token = jwt.sign({ agentId: agent._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, agent: { id: agent._id, fullName: agent.fullName, email: agent.email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const agent = await DeliveryAgent.findOne({ email });
    if (!agent) return res.status(400).json({ error: 'Invalid email or password' });
    const isMatch = await bcrypt.compare(password, agent.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ agentId: agent._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, agent: { id: agent._id, fullName: agent.fullName, email: agent.email, isApproved: agent.isApproved } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET dashboard
router.get('/dashboard', verifyAgent, async (req, res) => {
  try {
    const agent = await DeliveryAgent.findById(req.agentId).select('-password');
    const deliveries = await Delivery.find({ agentId: req.agentId });
    const earnings = deliveries.filter(d => d.status === 'delivered').reduce((s, d) => s + (d.amountPaid || d.price || 0), 0);
    res.json({ agent, deliveries, earnings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET pending deliveries
router.get('/available-deliveries', verifyAgent, async (req, res) => {
  try {
    const deliveries = await Delivery.find({ status: 'pending', agentId: null });
    res.json({ deliveries });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ACCEPT delivery
router.post('/accept/:deliveryId', verifyAgent, async (req, res) => {
  try {
    const agent = await DeliveryAgent.findById(req.agentId);
    const delivery = await Delivery.findById(req.params.deliveryId);
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    if (delivery.status !== 'pending') return res.status(400).json({ error: 'Delivery already taken' });

    delivery.agentId = req.agentId;
    delivery.agentName = agent.fullName;
    delivery.status = 'accepted';
    delivery.acceptedAt = new Date();
    await delivery.save();

    sendEmail(
      delivery.senderEmail,
      '📦 Your delivery has been accepted — Vaamoose',
      `<div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#2563eb">Delivery Accepted!</h2>
        <p>Your package delivery has been accepted by <b>${agent.fullName}</b>.</p>
        <p><b>Pickup:</b> ${delivery.pickupAddress}</p>
        <p><b>Delivering to:</b> ${delivery.receiverAddress}</p>
        <p>You can track your delivery on Vaamoose.</p>
      </div>`
    );

    res.json({ message: 'Delivery accepted', delivery });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE delivery status
router.post('/update-status/:deliveryId', verifyAgent, async (req, res) => {
  try {
    const { status } = req.body;
    const delivery = await Delivery.findOne({ _id: req.params.deliveryId, agentId: req.agentId });
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

    const validStatuses = ['picked_up', 'in_transit', 'delivered'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    delivery.status = status;
    if (status === 'picked_up') delivery.pickedUpAt = new Date();
    if (status === 'delivered') {
      delivery.deliveredAt = new Date();
      delivery.deliveryOTP = Math.floor(1000 + Math.random() * 9000).toString();

      sendEmail(
        delivery.senderEmail,
        '📦 Your package has arrived! — Vaamoose',
        `<div style="font-family:sans-serif;max-width:500px">
          <h2 style="color:#10b981">Package Delivered!</h2>
          <p>Your package has been delivered to <b>${delivery.receiverName}</b>.</p>
          <p>Please give the agent this OTP to confirm receipt:</p>
          <div style="font-size:36px;font-weight:bold;color:#2563eb;text-align:center;padding:20px;background:#eff6ff;border-radius:12px;letter-spacing:8px">
            ${delivery.deliveryOTP}
          </div>
          <p style="color:#64748b;font-size:13px;margin-top:16px">This OTP confirms the delivery is complete.</p>
        </div>`
      );
    }

    await delivery.save();
    res.json({ message: `Status updated to ${status}`, delivery });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE agent live location
router.post('/location', verifyAgent, async (req, res) => {
  try {
    const { lat, lng, deliveryId } = req.body;
    const delivery = await Delivery.findOne({ _id: deliveryId, agentId: req.agentId });
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    delivery.currentLat = lat;
    delivery.currentLng = lng;
    delivery.lastLocationUpdate = new Date();
    await delivery.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CONFIRM OTP
router.post('/confirm-otp/:deliveryId', async (req, res) => {
  try {
    const { otp } = req.body;
    const delivery = await Delivery.findById(req.params.deliveryId);
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    if (delivery.deliveryOTP !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    delivery.otpVerified = true;
    await delivery.save();
    res.json({ message: 'Delivery confirmed!', delivery });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN — get all agents
router.get('/all', async (req, res) => {
  try {
    const agents = await DeliveryAgent.find().select('-password').sort({ createdAt: -1 });
    res.json({ agents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN — approve agent
router.put('/approve/:id', async (req, res) => {
  try {
    const agent = await DeliveryAgent.findById(req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    if (agent.bankAccountNumber && agent.bankCode) {
      const response = await axios.post(
        'https://api.paystack.co/subaccount',
        {
          business_name: agent.fullName,
          settlement_bank: agent.bankCode,
          account_number: agent.bankAccountNumber,
          percentage_charge: 15,
        },
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
      );
      if (response.data.status) {
        agent.paystackSubaccountCode = response.data.data.subaccount_code;
      }
    }

    agent.isApproved = true;
    await agent.save();

    sendEmail(
      agent.email,
      '✅ Your Vaamoose delivery agent account has been approved!',
      `<div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#2563eb">You're approved! 🎉</h2>
        <p>Hi <b>${agent.fullName}</b>,</p>
        <p>Your Vaamoose delivery agent account has been approved. You can now log in and start accepting deliveries.</p>
        <a href="https://vaamoose.online" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px">Log In to Dashboard →</a>
        <p style="color:#64748b;font-size:13px;margin-top:16px">— The Vaamoose Team</p>
      </div>`
    );

    res.json({ message: 'Agent approved', agent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUBLIC — get approved agents
router.get('/public', async (req, res) => {
  try {
    const agents = await DeliveryAgent.find({ isApproved: true, isAvailable: true }).select('-password -bankAccountNumber -bankCode');
    res.json({ agents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;