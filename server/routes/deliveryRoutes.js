const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const Delivery = require('../models/Delivery');
const DeliveryAgent = require('../models/DeliveryAgent');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://vaamoose.online';

const verifyUser = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// CREATE delivery request + initialize payment
router.post('/create', verifyUser, async (req, res) => {
  try {
    const {
      senderName, senderEmail, senderPhone,
      receiverName, receiverPhone, receiverAddress,
      pickupAddress, pickupDescription,
      itemDescription, itemPhotos, estimatedWeight,
      agentId, price,
    } = req.body;

    if (!receiverName || !receiverPhone || !receiverAddress || !pickupAddress || !itemDescription || !agentId || !price) {
      return res.status(400).json({ error: 'Please fill in all required fields' });
    }

    const agent = await DeliveryAgent.findById(agentId);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    if (!agent.paystackSubaccountCode) return res.status(400).json({ error: 'Agent is not set up for payments yet' });

    const delivery = new Delivery({
      senderName, senderEmail: senderEmail || req.user.email, senderPhone,
      receiverName, receiverPhone, receiverAddress,
      pickupAddress, pickupDescription,
      itemDescription, itemPhotos: itemPhotos || [],
      estimatedWeight: estimatedWeight || 'Light',
      agentId, agentName: agent.fullName,
      price: Number(price),
      status: 'pending',
    });
    await delivery.save();

    // Initialize Paystack payment
    const amountInKobo = Math.round(Number(price) * 100);
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: senderEmail || req.user.email,
        amount: amountInKobo,
        currency: 'NGN',
        callback_url: FRONTEND_URL,
        metadata: { deliveryId: delivery._id.toString(), type: 'delivery' },
        subaccount: agent.paystackSubaccountCode,
        bearer: 'account',
      },
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, 'Content-Type': 'application/json' } }
    );

    if (!response.data.status) {
      return res.status(400).json({ error: response.data.message });
    }

    res.json({
      delivery,
      authorization_url: response.data.data.authorization_url,
      reference: response.data.data.reference,
    });
  } catch (error) {
    console.error('Create delivery error:', error?.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET student's deliveries
router.get('/my-deliveries', verifyUser, async (req, res) => {
  try {
    const deliveries = await Delivery.find({ senderEmail: req.user.email || req.user.userId }).sort({ createdAt: -1 });
    res.json({ deliveries });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single delivery (for tracking)
router.get('/track/:deliveryId', async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.deliveryId).populate('agentId', 'fullName phone');
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    res.json({ delivery });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// VERIFY payment and activate delivery
router.get('/verify/:reference', async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${req.params.reference}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
    );

    const transaction = response.data.data;
    if (transaction.status !== 'success') return res.status(400).json({ error: 'Payment not successful' });

    const deliveryId = transaction.metadata?.deliveryId;
    if (!deliveryId) return res.status(400).json({ error: 'No delivery ID in payment metadata' });

    const delivery = await Delivery.findByIdAndUpdate(
      deliveryId,
      { paymentStatus: 'paid', paymentReference: req.params.reference, amountPaid: transaction.amount / 100, paidAt: new Date() },
      { new: true }
    );

    res.json({ success: true, delivery });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET available agents for a route
router.get('/agents', async (req, res) => {
  try {
    const agents = await DeliveryAgent.find({ isApproved: true, isAvailable: true }).select('-password -bankAccountNumber -bankCode');
    res.json({ agents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;