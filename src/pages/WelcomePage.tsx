import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Search, MapPin, Calendar, ArrowRight, Star,
  Shield, Clock, Users, ChevronDown, Bus,
  CheckCircle2, Phone, Zap
} from 'lucide-react';

interface WelcomePageProps {
  onGetStarted: () => void;
  onSearch: () => void;
  onLogin: () => void;
}

const stats = [
  { value: '50+', label: 'Partner Companies' },
  { value: '10K+', label: 'Happy Students' },
  { value: '100+', label: 'Routes Available' },
  { value: '99%', label: 'Safe Arrivals' },
];

const features = [
  {
    icon: Shield,
    title: 'Verified Partners',
    description: 'Every transport company is thoroughly vetted before appearing on our platform.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: Clock,
    title: 'Real-Time Tracking',
    description: 'Track your ride live and share your journey with parents for peace of mind.',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: Zap,
    title: 'Instant Booking',
    description: 'Book your seat in minutes with secure payment and instant confirmation.',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Users,
    title: 'Parent Notifications',
    description: 'Keep your family informed with automatic updates throughout your journey.',
    color: 'from-purple-500 to-violet-600',
  },
];

const steps = [
  {
    number: '01',
    title: 'Choose Your School',
    description: 'Select your university and see all available transport partners serving your campus.',
  },
  {
    number: '02',
    title: 'Pick Your Ride',
    description: 'Browse vehicles, compare prices, choose your preferred seat and departure date.',
  },
  {
    number: '03',
    title: 'Pay Securely',
    description: 'Pay with card, bank transfer or USSD. Get instant confirmation via email.',
  },
  {
    number: '04',
    title: 'Travel Safely',
    description: 'Board your ride and let your family track your journey in real time.',
  },
];

const testimonials = [
  {
    name: 'Chioma Adeyemi',
    school: 'Covenant University',
    rating: 5,
    comment: 'Vaamoose made my journey home so stress-free! I booked in 5 minutes and my mum could track me the whole way.',
    avatar: 'C',
    color: 'bg-blue-500',
  },
  {
    name: 'Emmanuel Okafor',
    school: 'Babcock University',
    rating: 5,
    comment: 'The seat selection feature is brilliant. I always get my window seat and the ride is always on time!',
    avatar: 'E',
    color: 'bg-amber-500',
  },
  {
    name: 'Fatima Ibrahim',
    school: 'Baze University',
    rating: 5,
    comment: 'My parents love the tracking feature. They know exactly when I arrive. Best student transport app in Nigeria!',
    avatar: 'F',
    color: 'bg-emerald-500',
  },
];

export function WelcomePage({ onGetStarted, onSearch, onLogin }: WelcomePageProps) {
  const [partners, setPartners] = useState<any[]>([]);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, -150]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const res = await fetch('https://blissful-exploration-production.up.railway.app/api/partners/public');
        const data = await res.json();
        setPartners(data.partners?.slice(0, 6) || []);
      } catch (error) {
        console.error('Failed to fetch partners:', error);
      }
    };
    fetchPartners();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
        body { font-family: 'DM Sans', sans-serif; }
        .font-display { font-family: 'Syne', sans-serif; }
        .grain {
          position: fixed; top: -50%; left: -50%; width: 200%; height: 200%;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
          opacity: 0.03; pointer-events: none; z-index: 100;
        }
        .glow-amber { box-shadow: 0 0 60px rgba(245, 158, 11, 0.15); }
        .glow-blue { box-shadow: 0 0 60px rgba(59, 130, 246, 0.15); }
        .hero-gradient {
          background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.3) 0%, transparent 60%),
                      radial-gradient(ellipse 40% 40% at 80% 50%, rgba(245,158,11,0.15) 0%, transparent 50%),
                      #0a0f1e;
        }
        .card-gradient {
          background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .amber-gradient { background: linear-gradient(135deg, #f59e0b, #ea580c); }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .float { animation: float 6s ease-in-out infinite; }
        .float-delay { animation: float 6s ease-in-out infinite 2s; }
        .float-delay-2 { animation: float 6s ease-in-out infinite 4s; }
      `}</style>

      <div className="grain" />

      {/* ─── HERO ─── */}
      <section className="hero-gradient min-h-screen flex flex-col items-center justify-center relative px-4 sm:px-6 md:px-8 pt-16 sm:pt-20 pb-14 md:pb-16">
        <div className="absolute top-32 left-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl float hidden lg:block" />
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl float-delay hidden lg:block" />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="text-center max-w-5xl mx-auto relative z-10 w-full"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-medium mb-6"
          >
            <Zap className="w-3 h-3" />
            Nigeria's #1 Student Transport Platform
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold leading-none mb-6"
          >
            <span className="text-white">Travel</span>
            <br />
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Smarter.
            </span>
            <br />
            <span className="text-white">Arrive</span>{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Safer.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-slate-400 text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed px-2 sm:px-0"
          >
            Book verified transport from your university with real-time tracking,
            seat selection, and parent notifications — all in one place.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 px-4"
          >
            <button
              onClick={onGetStarted}
              className="amber-gradient text-white font-semibold px-6 py-3.5 rounded-2xl text-base w-full sm:w-auto flex items-center justify-center gap-2 hover:opacity-90 transition-all hover:scale-105 glow-amber"
            >
              Book a Ride
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={onSearch}
              className="card-gradient text-white font-semibold px-6 py-3.5 rounded-2xl text-base w-full sm:w-auto flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
            >
              <Search className="w-5 h-5" />
              Search Rides
            </button>
          </motion.div>

          {/* Search Bar - simplified on mobile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="card-gradient rounded-3xl p-3 sm:p-4 max-w-3xl mx-auto glow-blue"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="text-left">
                  <p className="text-xs text-slate-500">From</p>
                  <p className="text-sm text-slate-300">Your University</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="text-left">
                  <p className="text-xs text-slate-500">To</p>
                  <p className="text-sm text-slate-300">Destination</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3">
                <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="text-left">
                  <p className="text-xs text-slate-500">Date</p>
                  <p className="text-sm text-slate-300">Choose Date</p>
                </div>
              </div>
            </div>
            <button
              onClick={onSearch}
              className="w-full mt-2 amber-gradient text-white font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-all text-sm"
            >
              <Search className="w-4 h-4" />
              Search Available Rides
            </button>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500"
        >
          <p className="text-xs">Scroll to explore</p>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </motion.div>
      </section>

      {/* ─── STATS ─── */}
      <section className="py-12 border-y border-white/5">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <p className="font-display text-3xl md:text-5xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent mb-1">
                  {stat.value}
                </p>
                <p className="text-slate-400 text-xs md:text-sm">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-amber-400 text-xs font-medium mb-3 tracking-widest uppercase">Why Vaamoose</p>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-white mb-4">
              Built for Nigerian Students
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm md:text-base">
              Everything you need for a safe, comfortable journey from campus to home.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="card-gradient rounded-3xl p-6"
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent" />
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-blue-400 text-xs font-medium mb-3 tracking-widest uppercase">Simple Process</p>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-white mb-4">
              Book in 4 Easy Steps
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm">
              From selection to safe arrival — we've made it incredibly simple.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
              >
                <div className="card-gradient rounded-3xl p-6 h-full">
                  <div className="font-display text-4xl font-bold text-white/10 mb-3">{step.number}</div>
                  <h3 className="font-display text-base font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PARTNERS ─── */}
      {partners.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <p className="text-emerald-400 text-xs font-medium mb-3 tracking-widest uppercase">Our Partners</p>
              <h2 className="font-display text-3xl md:text-5xl font-bold text-white mb-4">
                Trusted Transport Companies
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto text-sm">
                All verified and ready to take you home safely.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {partners.map((partner, index) => (
                <motion.div
                  key={partner._id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.03 }}
                  className="card-gradient rounded-3xl p-5 cursor-pointer group"
                  onClick={onGetStarted}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center">
                      <Bus className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-white text-sm">{partner.companyName}</h3>
                      <p className="text-slate-500 text-xs">{partner.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{partner.vehicles?.length || 0} vehicle(s)</span>
                    <span className="text-slate-400">{partner.routes?.length || 0} route(s)</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent" />
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-amber-400 text-xs font-medium mb-3 tracking-widest uppercase">Testimonials</p>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-white mb-4">
              Students Love Vaamoose
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card-gradient rounded-3xl p-5"
              >
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-300 leading-relaxed mb-4 text-sm">"{testimonial.comment}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 ${testimonial.color} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{testimonial.name}</p>
                    <p className="text-slate-500 text-xs">{testimonial.school}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="card-gradient rounded-3xl p-8 md:p-12 text-center glow-amber relative overflow-hidden"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <h2 className="font-display text-3xl md:text-5xl font-bold text-white mb-4">
                Ready to Travel Smarter?
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto mb-8 text-base">
                Join thousands of Nigerian students who trust Vaamoose for safe, comfortable journeys.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={onGetStarted}
                  className="amber-gradient text-white font-semibold px-6 py-3.5 rounded-2xl text-base w-full sm:w-auto flex items-center justify-center gap-2 hover:opacity-90 transition-all hover:scale-105"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={onLogin}
                  className="text-slate-300 hover:text-white font-medium px-4 py-3.5 flex items-center gap-2 transition-colors text-sm text-center"
                >
                  Already have an account? Sign in
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/5 py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
            <div className="flex items-center gap-3">
              <img src="/vaamoose-logo.jpg" alt="Vaamoose" className="h-7 w-auto brightness-0 invert opacity-80" />
            </div>
            <div className="flex items-center gap-4 text-slate-500 text-sm">
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
              <a href="#" className="hover:text-white transition-colors flex items-center gap-1">
                <Phone className="w-4 h-4" /> Contact
              </a>
            </div>
            <p className="text-slate-600 text-xs">© 2025 Vaamoose. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}