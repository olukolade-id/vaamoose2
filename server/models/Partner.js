const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  lat:  Number,
  lng:  Number,
  time: Date,
}, { _id: false });

const journeySchema = new mongoose.Schema({
  bookingId:    { type: String },
  routeFrom:    { type: String },
  routeTo:      { type: String },
  startTime:    { type: Date },
  endTime:      { type: Date },
  isActive:     { type: Boolean, default: false },
  currentLat:   { type: Number },
  currentLng:   { type: Number },
  distanceKm:   { type: Number, default: 0 },
  durationMins: { type: Number },
  locations:    [locationSchema],
}, { _id: false });

const vehicleSchema = new mongoose.Schema({
  name:            { type: String },
  type:            { type: String },
  capacity:        { type: Number },
  priceMultiplier: { type: Number, default: 1 },
  features:        [{ type: String }],
}, { _id: true });

const routeSchema = new mongoose.Schema({
  from:              { type: String },
  to:                { type: String },
  basePrice:         { type: Number },
  distance:          { type: Number },
  estimatedDuration: { type: Number },
}, { _id: true });

const departureDateSchema = new mongoose.Schema({
  date:           { type: Date },
  time:           { type: String },
  routeFrom:      { type: String },
  routeTo:        { type: String },
  vehicleName:    { type: String },
  availableSeats: { type: Number },
}, { _id: true });

const partnerSchema = new mongoose.Schema({
  companyName:            { type: String, required: true },
  email:                  { type: String, required: true, unique: true },
  password:               { type: String, required: true },
  phone:                  { type: String },
  address:                { type: String },
  isApproved:             { type: Boolean, default: false },

  bankAccountNumber:      { type: String },
  bankCode:               { type: String },
  bankName:               { type: String },
  accountName:            { type: String },
  paystackSubaccountCode: { type: String },

  vehicles:       [vehicleSchema],
  routes:         [routeSchema],
  availableRoutes:[routeSchema],
  departureDates: [departureDateSchema],

  amenities:    [String],
  rating:       { type: Number, default: 5.0 },
  reviewCount:  { type: Number, default: 0 },
  description:  { type: String, default: '' },

  // Live tracking
  activeJourney:  { type: journeySchema, default: () => ({ isActive: false }) },
  journeyHistory: [journeySchema],

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Partner', partnerSchema);