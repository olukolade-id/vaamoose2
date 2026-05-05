const mongoose = require('mongoose');

const deliveryAgentSchema = new mongoose.Schema({
  fullName:               { type: String, required: true },
  email:                  { type: String, required: true, unique: true },
  password:               { type: String, required: true },
  phone:                  { type: String, required: true },
  coverageAreas:          [{ type: String }], // e.g. ["Lagos Island", "Redeemer's University"]
  pricePerDelivery:       { type: Number, default: 500 },
  isApproved:             { type: Boolean, default: false },
  isAvailable:            { type: Boolean, default: true },
  bankAccountNumber:      { type: String },
  bankCode:               { type: String },
  bankName:               { type: String },
  accountName:            { type: String },
  paystackSubaccountCode: { type: String },
  rating:                 { type: Number, default: 5.0 },
  totalDeliveries:        { type: Number, default: 0 },
  profilePhoto:           { type: String, default: '' },
  createdAt:              { type: Date, default: Date.now },
});

module.exports = mongoose.model('DeliveryAgent', deliveryAgentSchema);