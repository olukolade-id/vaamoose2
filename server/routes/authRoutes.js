const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// REGISTER
router.post('/register', async (req, res) => {
  console.log('Register body:', req.body);
  try {
    const { fullName, email, password, phoneNumber, university } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      phoneNumber,
      university,
    });

    await newUser.save();

    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        university: newUser.university,
        profilePhoto: newUser.profilePhoto || '',
      },
    });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        university: user.university,
        profilePhoto: user.profilePhoto || '',  // ← included on login
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE PROFILE
router.put('/update-profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { fullName, phoneNumber, university, profilePhoto } = req.body;

    // Only update fields that were actually sent
    const updates = {};
    if (fullName !== undefined)    updates.fullName    = fullName;
    if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
    if (university !== undefined)  updates.university  = university;
    if (profilePhoto !== undefined && profilePhoto !== '') {
      updates.profilePhoto = profilePhoto;  // ← saves photo URL
    }

    const updatedUser = await User.findByIdAndUpdate(
      decoded.userId,
      updates,
      { new: true }
    );

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        university: updatedUser.university,
        profilePhoto: updatedUser.profilePhoto || '',  // ← returned to frontend
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ message: 'If an account exists, a reset link has been sent.' });
    }

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: { rejectUnauthorized: false }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Reset your Vaamoose password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Reset your password</h2>
          <p>Hi ${user.fullName},</p>
          <p>You requested a password reset for your Vaamoose account.</p>
          <p>Please contact support at <a href="mailto:${process.env.EMAIL_USER}">${process.env.EMAIL_USER}</a> to complete your password reset.</p>
          <p>If you didn't request this, you can ignore this email.</p>
        </div>
      `
    });

    res.json({ message: 'Reset email sent.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;