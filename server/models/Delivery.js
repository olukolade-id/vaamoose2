const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  // Sender info
  senderName:       { type: String },
  senderEmail:      { type: String },
  senderPhone:      { type: String },

  // Receiver info
  receiverName:     { type: String, required: true },
  receiverPhone:    { type: String, required: true },
  receiverAddress:  { type: String, required: true }, // e.g. "Block C Room 12, Female Hostel, Redeemer's University"

  // Pickup info
  pickupAddress:    { type: String, required: true }, // e.g. "Computer Village, Ikeja Lagos"
  pickupDescription:{ type: String }, // extra directions

  // Package info
  itemDescription:  { type: String, required: true },
  itemPhotos:       [{ type: String }], // Cloudinary URLs
  estimatedWeight:  { type: String, default: 'Light' }, // Light / Medium / Heavy

  // Delivery details
  agentId:          { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryAgent' },
  agentName:        { type: String },
  price:            { type: Number, required: true },
  amountPaid:       { type: Number },

  // Status flow: pending → accepted → picked_up → in_transit → delivered
  status:           { type: String, default: 'pending', enum: ['pending', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled'] },

  // OTP for receiver to confirm delivery
  deliveryOTP:      { type: String },
  otpVerified:      { type: Boolean, default: false },

  // Proof of delivery photo
  deliveryPhoto:    { type: String },

  // Live tracking
  currentLat:       { type: Number },
  currentLng:       { type: Number },
  lastLocationUpdate:{ type: Date },

  // Payment
  paymentStatus:    { type: String, default: 'pending' },
  paymentReference: { type: String },
  paidAt:           { type: Date },

  // Timestamps
  acceptedAt:       { type: Date },
  pickedUpAt:       { type: Date },
  deliveredAt:      { type: Date },
  createdAt:        { type: Date, default: Date.now },
});

module.exports = mongoose.model('Delivery', deliverySchema);