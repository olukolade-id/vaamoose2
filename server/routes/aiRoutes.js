const express = require('express');
const router = express.Router();
const axios = require('axios');
const Booking = require('../models/Booking');
const Partner = require('../models/Partner');
const Delivery = require('../models/Delivery');
const DeliveryAgent = require('../models/DeliveryAgent');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const callClaude = async (system, userMessage, maxTokens = 500) => {
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }],
    },
    {
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data.content[0].text;
};

// ── FEATURE 2: Price Prediction ──
// Analyses booking patterns and predicts if prices will rise
router.get('/price-prediction/:route', async (req, res) => {
  try {
    const { route } = req.params;
    const { school } = req.query;

    const recentBookings = await Booking.find({
      route: { $regex: route, $options: 'i' },
      schoolName: { $regex: school || '', $options: 'i' },
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    }).sort({ createdAt: -1 }).limit(50);

    const bookingData = recentBookings.map(b => ({
      date: b.departureDate,
      price: b.price,
      dayOfWeek: new Date(b.departureDate).getDay(),
    }));

    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));

    const prediction = await callClaude(
      `You are a transport pricing analyst for Vaamoose, a Nigerian student transport platform. 
      Analyse booking data and predict if prices will rise in the next 3-7 days.
      Nigerian universities typically have resumption periods in January, May, and September.
      Respond with JSON only: { "willRise": boolean, "confidence": "high|medium|low", "reason": string, "recommendation": string, "urgency": "book_now|book_soon|no_rush" }`,
      `Route: ${school} to ${route}
      Today: ${today.toDateString()} (day ${dayOfYear} of year)
      Recent bookings: ${JSON.stringify(bookingData.slice(0, 20))}
      Total bookings in last 30 days: ${recentBookings.length}`
    );

    let parsed;
    try {
      parsed = JSON.parse(prediction.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { willRise: false, confidence: 'low', reason: 'Insufficient data', recommendation: 'Book when ready', urgency: 'no_rush' };
    }

    res.json({ success: true, prediction: parsed });
  } catch (error) {
    console.error('Price prediction error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── FEATURE 3: Complaint Auto-Classification ──
router.post('/classify-complaint', async (req, res) => {
  try {
    const { subject, message, companyName } = req.body;

    const classification = await callClaude(
      `You are a complaint classifier for Vaamoose, a Nigerian student transport platform.
      Classify complaints and return JSON only with no markdown.
      Categories: reckless_driving, late_departure, driver_misconduct, vehicle_condition, overcharging, seat_issue, luggage_problem, cancelled_trip, sexual_harassment, other
      Priority: urgent (safety/harassment), high (financial/cancellation), medium (comfort/delay), low (minor)
      { "category": string, "priority": "urgent|high|medium|low", "sentiment": "very_negative|negative|neutral", "needsImmediateAction": boolean, "suggestedResponse": string, "tags": string[] }`,
      `Company: ${companyName}
      Subject: ${subject}
      Message: ${message}`
    );

    let parsed;
    try {
      parsed = JSON.parse(classification.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { category: 'other', priority: 'medium', needsImmediateAction: false };
    }

    res.json({ success: true, classification: parsed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── FEATURE 4: Partner Performance Insights ──
router.get('/partner-insights/:partnerId', async (req, res) => {
  try {
    const { partnerId } = req.params;

    const [partner, bookings] = await Promise.all([
      Partner.findById(partnerId).select('companyName rating reviewCount routes vehicles'),
      Booking.find({ companyId: partnerId, paymentStatus: 'paid' }).sort({ createdAt: -1 }).limit(100),
    ]);

    if (!partner) return res.status(404).json({ error: 'Partner not found' });

    const totalEarnings = bookings.reduce((s, b) => s + (b.amountPaid || b.price || 0), 0);
    const routeFrequency = {};
    const dayFrequency = {};
    const timeFrequency = {};

    bookings.forEach(b => {
      routeFrequency[b.route] = (routeFrequency[b.route] || 0) + 1;
      const day = new Date(b.departureDate).toLocaleDateString('en-NG', { weekday: 'long' });
      dayFrequency[day] = (dayFrequency[day] || 0) + 1;
      if (b.departureTime) {
        timeFrequency[b.departureTime] = (timeFrequency[b.departureTime] || 0) + 1;
      }
    });

    const insights = await callClaude(
      `You are a business analytics AI for Vaamoose, a Nigerian student transport platform.
      Generate actionable insights for a transport partner. Be specific, practical, and encouraging.
      Return JSON only: { "topInsights": string[], "bestPerformingRoute": string, "bestDay": string, "bestTime": string, "revenueOpportunity": string, "weeklyTip": string, "performanceScore": number }
      performanceScore is 0-100 based on bookings and revenue.`,
      `Company: ${partner.companyName}
      Total bookings (last 100): ${bookings.length}
      Total earnings: ₦${totalEarnings.toLocaleString()}
      Rating: ${partner.rating}/5 (${partner.reviewCount} reviews)
      Routes: ${JSON.stringify(partner.routes?.map(r => `${r.from} → ${r.to}`))}
      Route frequency: ${JSON.stringify(routeFrequency)}
      Busy days: ${JSON.stringify(dayFrequency)}
      Popular times: ${JSON.stringify(timeFrequency)}`,
      800
    );

    let parsed;
    try {
      parsed = JSON.parse(insights.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { topInsights: ['Keep providing great service!'], performanceScore: 70 };
    }

    res.json({ success: true, insights: parsed, stats: { totalBookings: bookings.length, totalEarnings, routeFrequency, dayFrequency } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── FEATURE 5: Fraud Detection ──
router.post('/check-fraud', async (req, res) => {
  try {
    const { userEmail, bookingData, deviceInfo } = req.body;

    const recentBookings = await Booking.find({
      userEmail,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    const sameRouteBookings = await Booking.find({
      route: bookingData.routeTo,
      departureDate: bookingData.departureDate,
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
    });

    const fraudCheck = await callClaude(
      `You are a fraud detection AI for Vaamoose, a Nigerian student transport platform.
      Analyse booking patterns and flag suspicious activity.
      Return JSON only: { "isSuspicious": boolean, "riskLevel": "low|medium|high|critical", "reasons": string[], "action": "allow|flag|block", "message": string }`,
      `User email: ${userEmail}
      Bookings by this user in last 24h: ${recentBookings.length}
      Same route bookings in last hour: ${sameRouteBookings.length}
      Current booking seats: ${bookingData.seats?.length || 1}
      Total amount: ₦${bookingData.totalPrice}
      Device info: ${JSON.stringify(deviceInfo || {})}
      Booking data: ${JSON.stringify(bookingData)}`
    );

    let parsed;
    try {
      parsed = JSON.parse(fraudCheck.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { isSuspicious: false, riskLevel: 'low', action: 'allow' };
    }

    res.json({ success: true, fraudCheck: parsed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── FEATURE 6: Smart Delivery Agent Matching ──
router.post('/match-delivery-agent', async (req, res) => {
  try {
    const { pickupAddress, deliveryAddress, itemDescription, estimatedWeight, budget } = req.body;

    const agents = await DeliveryAgent.find({ isApproved: true, isAvailable: true })
      .select('fullName coverageAreas pricePerDelivery rating totalDeliveries');

    if (agents.length === 0) return res.json({ success: true, matches: [] });

    const match = await callClaude(
      `You are a delivery matching AI for Vaamoose Nigeria.
      Match the best delivery agents for a package request based on coverage, price, and reliability.
      Return JSON only: { "rankedAgents": [{ "agentId": string, "score": number, "reason": string }], "recommendation": string }
      Score 0-100. Consider: coverage area match, price vs budget, rating, experience (totalDeliveries).`,
      `Pickup: ${pickupAddress}
      Delivery: ${deliveryAddress}
      Item: ${itemDescription} (${estimatedWeight})
      Budget: ₦${budget || 'flexible'}
      Available agents: ${JSON.stringify(agents.map(a => ({
        id: a._id,
        name: a.fullName,
        areas: a.coverageAreas,
        price: a.pricePerDelivery,
        rating: a.rating,
        deliveries: a.totalDeliveries,
      })))}`
    );

    let parsed;
    try {
      parsed = JSON.parse(match.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { rankedAgents: agents.map(a => ({ agentId: a._id, score: 70, reason: 'Available agent' })), recommendation: 'Choose any available agent' };
    }

    // Attach full agent data to ranked results
    const rankedWithData = (parsed.rankedAgents || []).map(r => {
      const agent = agents.find(a => a._id.toString() === r.agentId);
      return { ...r, agent };
    }).filter(r => r.agent);

    res.json({ success: true, matches: rankedWithData, recommendation: parsed.recommendation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── ADMIN: AI Summary Dashboard ──
router.get('/admin-summary', async (req, res) => {
  try {
    const [bookings, partners, deliveries] = await Promise.all([
      Booking.find({ paymentStatus: 'paid', createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
      Partner.find({ isApproved: true }),
      Delivery.find({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
    ]);

    const totalRevenue = bookings.reduce((s, b) => s + (b.amountPaid || 0), 0);
    const vaamooseCut = totalRevenue * 0.15;

    const summary = await callClaude(
      `You are a business intelligence AI for Vaamoose Nigeria. Generate an executive summary.
      Return JSON: { "headline": string, "keyMetrics": string[], "alerts": string[], "opportunities": string[], "weeklyGrade": "A|B|C|D" }`,
      `Last 7 days data:
      Total bookings: ${bookings.length}
      Total revenue: ₦${totalRevenue.toLocaleString()}
      Vaamoose earnings (15%): ₦${vaamooseCut.toLocaleString()}
      Active partners: ${partners.length}
      Deliveries: ${deliveries.length}
      Routes: ${[...new Set(bookings.map(b => b.route))].join(', ')}`,
      600
    );

    let parsed;
    try {
      parsed = JSON.parse(summary.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { headline: 'Platform running normally', keyMetrics: [], alerts: [], opportunities: [], weeklyGrade: 'B' };
    }

    res.json({
      success: true,
      summary: parsed,
      raw: { totalBookings: bookings.length, totalRevenue, vaamooseCut, activePartners: partners.length, deliveries: deliveries.length },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;