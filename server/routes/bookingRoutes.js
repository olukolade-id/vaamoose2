const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");

router.post("/", async (req, res) => {
  try {
    console.log("Incoming booking body:", req.body);

    const { 
      schoolName,
      companyName,
      vehicleName,
      seats,
      routeTo,
      departureDate,
      departureTime,
      totalPrice,
      luggagePhotos,
      schoolId,
      companyId,
      vehicleId,
    } = req.body;

    if (!schoolName || !routeTo || !departureDate || !departureTime || !totalPrice) {
      return res.status(400).json({ error: "Missing required booking fields" });
    }

    const newBooking = new Booking({
      schoolId,
      schoolName,
      companyId,
      companyName,
      vehicleId,
      vehicleName,
      route: routeTo,
      departureDate: new Date(departureDate),
      departureTime,
      seats,
      price: Number(totalPrice),
      luggagePhotos,
    });

    await newBooking.save();

    res.status(201).json({
      message: "Booking saved successfully",
      booking: newBooking
    });

  } catch (error) {
    console.error("Booking error:", error);
    res.status(400).json({ error: error.message });
  }
});

// GET bookings for a specific user
router.get('/my-bookings', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await require('../models/User').findById(decoded.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const bookings = await Booking.find({ 
      $or: [
        { userEmail: user.email },
        { schoolName: user.university }
      ]
    }).sort({ createdAt: -1 });

    res.json({ bookings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;