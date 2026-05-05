const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const jwt = require('jsonwebtoken');

// Auth middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Luggage storage
const luggageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'vaamoose/luggage',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, quality: 'auto' }],
  },
});

// Profile photo storage
const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'vaamoose/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', quality: 'auto' }],
  },
});

const uploadLuggage = multer({ storage: luggageStorage });
const uploadProfile = multer({ storage: profileStorage });

// POST /api/upload/luggage
router.post('/luggage', authMiddleware, uploadLuggage.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: req.file.path });
  } catch (error) {
    console.error('Luggage upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/upload/profile-photo
router.post('/profile-photo', authMiddleware, uploadProfile.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: req.file.path });
  } catch (error) {
    console.error('Profile photo upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;