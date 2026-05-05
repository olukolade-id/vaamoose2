const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
    tls: {
    rejectUnauthorized: false  // ← add this line
  }
});

const sendBookingConfirmation = async (email, booking) => {
  const mailOptions = {
    from: `"Vaamoose" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🎉 Booking Confirmed - Vaamoose',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Booking Confirmed! 🎉</h1>
          <p style="color: #bfdbfe; margin-top: 8px;">Your ride has been successfully booked</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px;">
          <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="color: #1e293b; margin-top: 0;">Booking Details</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px 0; color: #64748b; font-size: 14px;">Transport Company</td>
                <td style="padding: 12px 0; color: #1e293b; font-weight: 600; text-align: right;">${booking.companyName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px 0; color: #64748b; font-size: 14px;">From</td>
                <td style="padding: 12px 0; color: #1e293b; font-weight: 600; text-align: right;">${booking.schoolName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px 0; color: #64748b; font-size: 14px;">To</td>
                <td style="padding: 12px 0; color: #1e293b; font-weight: 600; text-align: right;">${booking.route}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px 0; color: #64748b; font-size: 14px;">Date</td>
                <td style="padding: 12px 0; color: #1e293b; font-weight: 600; text-align: right;">${new Date(booking.departureDate).toLocaleDateString()}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px 0; color: #64748b; font-size: 14px;">Time</td>
                <td style="padding: 12px 0; color: #1e293b; font-weight: 600; text-align: right;">${booking.departureTime}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px 0; color: #64748b; font-size: 14px;">Vehicle</td>
                <td style="padding: 12px 0; color: #1e293b; font-weight: 600; text-align: right;">${booking.vehicleName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px 0; color: #64748b; font-size: 14px;">Seats</td>
                <td style="padding: 12px 0; color: #1e293b; font-weight: 600; text-align: right;">
                  ${booking.seats?.map(s => `Row ${s.row} Seat ${s.column}`).join(', ')}
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #64748b; font-size: 14px;">Amount Paid</td>
                <td style="padding: 12px 0; color: #2563eb; font-weight: 700; font-size: 18px; text-align: right;">₦${booking.price?.toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <div style="background: #eff6ff; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #1d4ed8; margin-top: 0;">What's Next?</h3>
            <ul style="color: #1e293b; padding-left: 20px; line-height: 1.8;">
              <li>Arrive at the pickup point 15 minutes early</li>
              <li>Bring a valid ID and this booking confirmation</li>
              <li>Your luggage will be handled by the driver</li>
            </ul>
          </div>

          <div style="text-align: center; color: #64748b; font-size: 12px;">
            <p>Need help? Contact us at support@vaamoose.ng</p>
            <p>© 2025 Vaamoose. All rights reserved.</p>
          </div>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendBookingConfirmation };