import { motion } from 'framer-motion';
import { ArrowLeft, Shield } from 'lucide-react';

interface TermsPageProps {
  onBack: () => void;
}

const LAST_UPDATED = 'March 2026';

export function TermsPage({ onBack }: TermsPageProps) {
  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-8 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Terms of Service</h1>
          </div>
          <p className="text-slate-400 text-sm mb-10">Last updated: {LAST_UPDATED}</p>

          <div className="space-y-8 text-slate-600 leading-relaxed">

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">1. About Vaamoose</h2>
              <p>Vaamoose (operated by Vaamoose, a business registered in Nigeria) is a technology platform that connects university students with independent transport companies, delivery agents, and logistics providers. <strong>Vaamoose is a marketplace and intermediary — we are not a transport company, logistics company, or delivery service.</strong></p>
              <p className="mt-3">By creating an account or using Vaamoose, you agree to these Terms of Service in full. If you do not agree, you must not use this platform.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">2. The Vaamoose Platform</h2>
              <p>Vaamoose provides technology that allows:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Students to discover and book seats on transport operated by independent partner companies</li>
                <li>Students to request package delivery services from independent delivery agents</li>
                <li>Transport partners to list their vehicles, routes, and departure schedules</li>
                <li>Delivery agents to offer their services to students</li>
              </ul>
              <p className="mt-3"><strong>Vaamoose does not own, operate, or control any vehicle, driver, or delivery agent.</strong> All transport and delivery services are provided by independent third parties who have agreed to operate on the Vaamoose platform.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">3. Limitation of Liability</h2>
              <p className="font-semibold text-slate-800">Vaamoose shall not be held liable for:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li><strong>Accidents, injuries, or death</strong> that occur during a journey. The transport partner (company or driver) bears full responsibility for the safety of passengers during transit.</li>
                <li><strong>Delays, cancellations, or rescheduling</strong> of any journey by a transport partner.</li>
                <li><strong>Driver or partner misconduct</strong> including reckless driving, harassment, or criminal behaviour. Such incidents must be reported to appropriate authorities and the partner directly.</li>
                <li><strong>Loss, damage, or theft of luggage or packages</strong> during transit or delivery. The transport partner or delivery agent bears responsibility for items in their custody.</li>
                <li><strong>Package not delivered</strong> or delivered to wrong address due to incorrect information provided by the sender or receiver.</li>
                <li><strong>Force majeure events</strong> including but not limited to accidents, natural disasters, road closures, government actions, or any event beyond reasonable control.</li>
                <li><strong>Actions or omissions of delivery agents</strong> who are independent contractors and not employees of Vaamoose.</li>
              </ul>
              <p className="mt-3">To the maximum extent permitted by Nigerian law, Vaamoose's total liability to any user for any claim shall not exceed the amount paid by that user for the specific booking or delivery in question.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">4. Student Responsibilities</h2>
              <p>As a student user, you agree to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Provide accurate and truthful information when creating your account and making bookings</li>
                <li>Arrive at the departure point at the time specified by the transport partner</li>
                <li>Treat transport partners, drivers, delivery agents, and other passengers with respect</li>
                <li>Not use the platform for any unlawful purpose</li>
                <li>Not book seats you do not intend to use without valid reason</li>
                <li>Provide accurate pickup and delivery addresses for package requests</li>
                <li>Be available to receive packages at the agreed address and time</li>
                <li>Not send prohibited items (see Section 8)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">5. Transport Partner Responsibilities</h2>
              <p>By registering as a transport partner on Vaamoose, you agree to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Operate all vehicles in a roadworthy condition with valid registration and insurance</li>
                <li>Employ only licensed drivers with valid Nigerian driver's licences</li>
                <li>Honour all confirmed bookings unless in genuine emergency circumstances</li>
                <li>Not overload vehicles beyond their certified capacity</li>
                <li>Treat all passengers with respect and dignity</li>
                <li>Bear full legal liability for passenger safety during transit</li>
                <li>Handle passenger complaints professionally and in good faith</li>
                <li>Provide accurate vehicle and route information on the platform</li>
              </ul>
              <p className="mt-3">Vaamoose reserves the right to suspend or permanently remove any transport partner from the platform for violation of these terms, misconduct, or consistent poor service without prior notice.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">6. Delivery Agent Responsibilities</h2>
              <p>By registering as a delivery agent on Vaamoose, you agree to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Handle all packages with reasonable care</li>
                <li>Deliver packages to the address provided by the sender</li>
                <li>Not open, tamper with, or use any item in a delivery package</li>
                <li>Confirm delivery using the OTP system provided by Vaamoose</li>
                <li>Bear liability for packages in your physical custody</li>
                <li>Not accept deliveries of prohibited items (see Section 8)</li>
                <li>Communicate promptly with senders about delivery status</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">7. Payments and Refunds</h2>
              <p>All payments on Vaamoose are processed by Paystack, a third-party payment processor. Vaamoose retains a 15% service fee from each transaction. The remaining 85% is paid directly to the transport partner or delivery agent.</p>
              <p className="mt-3"><strong>Refund Policy:</strong> Refunds are the responsibility of the transport partner or delivery agent. Vaamoose's 15% service fee is non-refundable once a booking is confirmed. In cases of dispute, Vaamoose may mediate but cannot guarantee a refund outcome. Refund disputes must be raised within 48 hours of the booking date.</p>
              <p className="mt-3">Vaamoose does not hold user funds. All payments go directly to the partner's designated bank account via Paystack's split payment system.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">8. Prohibited Items</h2>
              <p>The following items are strictly prohibited from being transported or delivered via Vaamoose:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Illegal drugs, narcotics, or controlled substances</li>
                <li>Firearms, ammunition, or explosives</li>
                <li>Stolen goods or items obtained through illegal means</li>
                <li>Hazardous, flammable, or toxic materials</li>
                <li>Human trafficking or any form of human smuggling</li>
                <li>Any item that is illegal under Nigerian law</li>
              </ul>
              <p className="mt-3">Sending prohibited items is grounds for immediate account termination and may be reported to law enforcement authorities.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">9. Complaints and Disputes</h2>
              <p>If you experience a problem with a booking, journey, or delivery:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Use the complaint feature in your student dashboard to report issues</li>
                <li>Vaamoose will investigate and respond within 48 hours</li>
                <li>Vaamoose acts as a mediator between parties and cannot compel partners to issue refunds</li>
                <li>For serious incidents involving injury or criminal activity, contact Nigerian law enforcement directly</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">10. Account Termination</h2>
              <p>Vaamoose reserves the right to suspend or terminate any account at any time for violation of these terms, fraud, abuse of the platform, or any conduct that Vaamoose reasonably believes harms other users or the platform.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">11. Changes to These Terms</h2>
              <p>Vaamoose may update these Terms of Service from time to time. You will be notified of material changes. Continued use of the platform after changes constitutes acceptance of the new terms.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">12. Governing Law</h2>
              <p>These Terms of Service are governed by and construed in accordance with the laws of the Federal Republic of Nigeria. Any dispute arising from these terms shall be subject to the exclusive jurisdiction of Nigerian courts.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">13. Contact</h2>
              <p>For questions about these Terms, contact us at:</p>
              <div className="mt-2 bg-slate-100 rounded-xl p-4 text-sm">
                <p className="font-semibold text-slate-800">Vaamoose</p>
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