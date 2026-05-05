const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName:       { type: String, required: true },
  email:          { type: String, required: true, unique: true },
  password:       { type: String },
  phoneNumber:    { type: String },
  university:     { type: String },
  profilePhoto:   { type: String, default: '' }, // Cloudinary URL
  googleId:       { type: String },
  bookingHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
  createdAt:      { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);