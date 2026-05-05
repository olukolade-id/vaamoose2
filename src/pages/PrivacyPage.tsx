import { motion } from 'framer-motion';
import { ArrowLeft, Lock } from 'lucide-react';

interface PrivacyPageProps {
  onBack: () => void;
}

const LAST_UPDATED = 'March 2026';

export function PrivacyPage({ onBack }: PrivacyPageProps) {
  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-8 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Lock className="w-5 h-5 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
          </div>
          <p className="text-slate-400 text-sm mb-10">Last updated: {LAST_UPDATED}</p>

          <div className="space-y-8 text-slate-600 leading-relaxed">

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">1. Introduction</h2>
              <p>Vaamoose ("we", "us", "our") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and protect your data when you use the Vaamoose platform at vaamoose.online.</p>
              <p className="mt-3">By using Vaamoose, you consent to the data practices described in this policy.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">2. Information We Collect</h2>
              <p className="font-semibold text-slate-800 mb-2">Information you provide directly:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Full name, email address, and phone number when you create an account</li>
                <li>University name and student details</li>
                <li>Profile photo (if you choose to upload one)</li>
                <li>Bank account details (for transport partners and delivery agents only)</li>
                <li>Delivery pickup and drop-off addresses</li>
                <li>Photos of luggage or packages you upload</li>
                <li>Complaint submissions and support messages</li>
              </ul>
              <p className="font-semibold text-slate-800 mb-2 mt-4">Information collected automatically:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>GPS location data (only when you actively use journey tracking or delivery tracking features)</li>
                <li>Booking history and payment records</li>
                <li>Device type and browser information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>To provide the service:</strong> Processing bookings, facilitating payments, connecting students with transport partners and delivery agents</li>
                <li><strong>To communicate with you:</strong> Sending booking confirmations, delivery updates, OTP codes, and complaint responses</li>
                <li><strong>To ensure safety:</strong> Verifying partner identities, processing complaints, and investigating misconduct</li>
                <li><strong>To improve the platform:</strong> Analysing usage patterns to improve features and user experience</li>
                <li><strong>To comply with the law:</strong> Maintaining records as required by Nigerian law</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">4. How We Share Your Information</h2>
              <p>We do not sell your personal data. We share your information only in the following circumstances:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li><strong>With transport partners:</strong> Your name, booking details, and pickup location are shared with the transport company you book with so they can fulfil your journey</li>
                <li><strong>With delivery agents:</strong> Your name, phone number, pickup address, and delivery address are shared with your selected delivery agent to complete your delivery</li>
                <li><strong>With Paystack:</strong> Your email and payment information are shared with Paystack to process transactions securely</li>
                <li><strong>With Cloudinary:</strong> Photos you upload are stored on Cloudinary's secure servers</li>
                <li><strong>With law enforcement:</strong> We may disclose information if required by Nigerian law or in response to valid legal requests</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">5. Location Data</h2>
              <p>Vaamoose only collects GPS location data in two specific scenarios:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Journey tracking:</strong> When a transport partner starts a journey, their location is broadcast to booked students for safety tracking. This stops automatically when the journey ends.</li>
                <li><strong>Delivery tracking:</strong> When a delivery agent marks a package as in transit, their location is shared with the sender. This stops when delivery is confirmed.</li>
              </ul>
              <p className="mt-3">Location data is never collected in the background without your knowledge or consent.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">6. Data Storage and Security</h2>
              <p>Your data is stored on secure servers provided by MongoDB Atlas (database), Cloudinary (photos), and Railway (backend infrastructure). We implement reasonable technical and organisational measures to protect your data from unauthorised access, loss, or misuse.</p>
              <p className="mt-3">However, no internet transmission or electronic storage is 100% secure. We cannot guarantee absolute security of your data.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">7. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your account and associated data</li>
                <li>Withdraw consent for data processing (note: this may prevent you from using the platform)</li>
              </ul>
              <p className="mt-3">To exercise these rights, email us at olukoladeidowu@gmail.com.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">8. Cookies</h2>
              <p>Vaamoose uses local storage and session storage in your browser to keep you logged in and to remember your preferences. We do not use third-party advertising cookies.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">9. Children's Privacy</h2>
              <p>Vaamoose is intended for university students aged 16 and above. We do not knowingly collect personal data from children under 16. If you believe a child has provided us with personal data, please contact us immediately.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">10. Changes to This Policy</h2>
              <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via email or a notice on the platform. Continued use of Vaamoose after changes constitutes acceptance of the updated policy.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">11. Contact</h2>
              <p>For questions about this Privacy Policy or your personal data:</p>
              <div className="mt-2 bg-slate-100 rounded-xl p-4 text-sm">
                <p className="font-semibold text-slate-800">Vaamoose Privacy Team</p>
                <p>Email: olukoladeidowu@gmail.com</p>
                <p>Phone: +234 812 334 2817</p>
                <p>Website: vaamoose.online</p>
              </div>
            </section>

          </div>
        </motion.div>
      </div>
    </div>
  );
}