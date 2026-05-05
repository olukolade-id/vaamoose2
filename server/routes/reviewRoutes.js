const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Review = require('../models/Review');
const User = require('../models/User');

const verifyUser = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// POST a review
router.post('/', verifyUser, async (req, res) => {
  try {
    const { partnerId, bookingId, rating, comment } = req.body;
    const user = await User.findById(req.userId);

    // Check if already reviewed
    const existing = await Review.findOne({ userId: req.userId, bookingId });
    if (existing) {
      return res.status(400).json({ error: 'You already reviewed this booking' });
    }

    const review = new Review({
      userId: req.userId,
      userName: user.fullName,
      partnerId,
      bookingId,
      rating,
      comment,
    });

    await review.save();
    res.status(201).json({ message: 'Review submitted!', review });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET reviews for a partner
router.get('/partner/:partnerId', async (req, res) => {
  try {
    const reviews = await Review.find({ partnerId: req.params.partnerId })
      .sort({ createdAt: -1 });

    const avgRating = reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    res.json({ reviews, avgRating: avgRating.toFixed(1), total: reviews.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
