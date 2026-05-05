import { motion } from 'framer-motion';
import { Instagram, Twitter, Facebook, Linkedin, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FooterProps {
  onNavigate?: (view: string) => void;
  onPartnerClick?: () => void;
}

const socialLinks = [
  { icon: Instagram, href: 'https://www.instagram.com/vaamoose_/',      label: 'Instagram' },
  { icon: Twitter,   href: 'https://x.com/vaamoose_?s=21',              label: 'Twitter'   },
  { icon: Facebook,  href: 'https://www.facebook.com/vaamoose',         label: 'Facebook'  },
  { icon: Linkedin,  href: 'https://www.linkedin.com/company/vaamoose', label: 'LinkedIn'  },
];

export function Footer({ onNavigate, onPartnerClick }: FooterProps) {
  return (
    <footer className="bg-slate-900 text-white">

      {/* CTA Section */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center max-w-2xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold mb-4"
            >
              Ready to ride?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-slate-400 mb-8"
            >
              Book your first ride today at vaamoose.online. iOS and Android apps coming soon.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Download for iOS
              </Button>
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35zm13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27zm3.35-4.31c.34.27.59.69.59 1.19s-.22.9-.57 1.18l-2.29 1.32-2.5-2.5 2.5-2.5 2.27 1.31zM6.05 2.66l10.76 6.22-2.27 2.27L6.05 2.66z"/>
                </svg>
                Download for Android
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Links Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">

          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <img
              src="/vaamoose-logo.jpg"
              alt="Vaamoose"
              className="h-10 w-auto mb-4 brightness-0 invert"
            />
            <p className="text-slate-400 text-sm mb-4">
              Safe, reliable transportation for students across Nigeria.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-blue-600 transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              {[
                { label: 'About Us',  action: () => onNavigate?.('landing') },
                { label: 'Careers',   action: () => window.open('mailto:olukoladeidowu@gmail.com?subject=Careers at Vaamoose', '_blank') },
                { label: 'Press',     action: () => window.open('mailto:olukoladeidowu@gmail.com?subject=Press Enquiry', '_blank') },
                { label: 'Blog',      action: () => window.open('https://www.instagram.com/vaamoose_/', '_blank') },
              ].map((link) => (
                <li key={link.label}>
                  <button
                    onClick={link.action}
                    className="text-slate-400 hover:text-white transition-colors text-sm text-left"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              {[
                { label: 'Help Center',      action: () => window.open('mailto:olukoladeidowu@gmail.com?subject=Help Request', '_blank') },
                { label: 'Safety',           action: () => onNavigate?.('terms') },
                { label: 'Terms of Service', action: () => onNavigate?.('terms') },
                { label: 'Privacy Policy',   action: () => onNavigate?.('privacy') },
              ].map((link) => (
                <li key={link.label}>
                  <button
                    onClick={link.action}
                    className="text-slate-400 hover:text-white transition-colors text-sm text-left"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Partners */}
          <div>
            <h4 className="font-semibold mb-4">Partners</h4>
            <ul className="space-y-2">
              {[
                { label: 'For Drivers',    action: () => onNavigate?.('delivery-agent-login') },
                { label: 'For Schools',    action: () => window.open('mailto:olukoladeidowu@gmail.com?subject=School Partnership', '_blank') },
                { label: 'For Companies',  action: () => onPartnerClick?.() },
                { label: 'Partner Portal', action: () => onNavigate?.('partner-login') },
              ].map((link) => (
                <li key={link.label}>
                  <button
                    onClick={link.action}
                    className="text-slate-400 hover:text-white transition-colors text-sm text-left"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:olukoladeidowu@gmail.com"
                  className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  olukoladeidowu@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+2348123342817"
                  className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  +234 812 334 2817
                </a>
              </li>
              <li className="flex items-center gap-2 text-slate-400 text-sm">
                <MapPin className="w-4 h-4 shrink-0" />
                Lagos, Nigeria
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-sm">
              © 2026 Vaamoose. All rights reserved.
            </p>
            <div className="flex gap-6">
              <button onClick={() => onNavigate?.('terms')}   className="text-slate-400 hover:text-white text-sm transition-colors">Terms</button>
              <button onClick={() => onNavigate?.('privacy')} className="text-slate-400 hover:text-white text-sm transition-colors">Privacy</button>
              <button onClick={() => window.open('mailto:olukoladeidowu@gmail.com?subject=Cookies Policy', '_blank')} className="text-slate-400 hover:text-white text-sm transition-colors">Cookies</button>
            </div>
          </div>
        </div>
      </div>

    </footer>
  );
}