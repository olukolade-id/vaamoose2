const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { createServer } = require('http');
const { Server } = require('socket.io');
const bookingRoutes = require("./routes/bookingRoutes");
const authRoutes = require('./routes/authRoutes');
const partnerRoutes = require('./routes/partnerRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const adminRoutes = require('./routes/adminRoutes');
const deliveryAgentRoutes = require('./routes/deliveryAgentRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const aiRoutes = require('./routes/aiRoutes');
const { initGameServer } = require('./routes/gameServer');

const app = express();
const server = createServer(app);
const http = require('http');


// Middleware
app.use(express.json());
app.use(cors({
  origin: '*' // Allow all origins for now
}));

// Routes
app.use("/api/bookings", bookingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/delivery-agents', deliveryAgentRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/ai', aiRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// Initialize game server
initGameServer(server);

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
