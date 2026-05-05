import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronDown, 
  Bus, 
  MapPin, 
  Shield, 
  Clock, 
  Star, 
  Users,
  ArrowRight,
  CreditCard,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { schools, reviews, faqs } from '@/data/Data';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface LandingPageProps {
  onSchoolSelect: (schoolId: string) => void;
  onBookRide: () => void;
}

const features = [
  {
    icon: Bus,
    title: 'Select Your School',
    description: 'Choose from 50+ partner universities across Nigeria',
  },
  {
    icon: Users,
    title: 'Pick a Transport Company',
    description: 'Compare prices, ratings, and amenities from trusted partners',
  },
  {
    icon: MapPin,
    title: 'Choose Your Seat',
    description: 'Window, aisle, or front row — the choice is yours',
  },
  {
    icon: Shield,
    title: 'Track Your Journey',
    description: 'Real-time updates for you and your parents',
  },
];

const whyChooseUs = [
  {
    icon: Shield,
    title: 'Safe & Verified',
    description: 'All drivers undergo thorough background checks',
  },
  {
    icon: Clock,
    title: 'On-Time Guarantee',
    description: 'We prioritize punctuality for every journey',
  },
  {
    icon: CreditCard,
    title: 'Transparent Pricing',
    description: 'No hidden fees — what you see is what you pay',
  },
  {
    icon: Bell,
    title: 'Parent Notifications',
    description: 'Keep parents informed with automatic updates',
  },
];

export function LandingPage({ onSchoolSelect, onBookRide }: LandingPageProps) {
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    school.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSchoolSelect = (schoolId: string) => {
    setSelectedSchool(schoolId);
    setShowSchoolDropdown(false);
    const school = schools.find(s => s.id === schoolId);
    if (school) {
      setSearchQuery(school.name);
    }
  };

  const handleFindRide = () => {
    if (selectedSchool) {
      onSchoolSelect(selectedSchool);
    } else {
      setShowSchoolDropdown(true);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center gradient-hero pt-16 sm:pt-20 pb-10 px-4 sm:px-6 md:px-8">
        {/* Background Decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl" />
          <motion.div
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-1/4 right-1/4"
          >
            <Bus className="w-24 h-24 text-blue-200/40" />
          </motion.div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-0 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-slate-900 mb-6">
              Your Ride,{' '}
              <span className="text-blue-600">Your Way</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
              Book safe, reliable transportation from your university to anywhere in Nigeria. 
              Trusted by 10,000+ students across 50+ campuses.
            </p>
          </motion.div>

          {/* School Selector */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-xl mx-auto"
            ref={dropdownRef}
          >
            <div className="relative">
              <div className="flex flex-col sm:flex-row items-stretch gap-3 bg-white rounded-2xl shadow-xl border border-slate-200 p-2">
                <div className="flex-1 flex items-center px-4">
                  <MapPin className="w-5 h-5 text-slate-400 mr-3" />
                  <input
                    type="text"
                    placeholder="Select your university"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSchoolDropdown(true);
                    }}
                    onFocus={() => setShowSchoolDropdown(true)}
                    className="w-full py-3 outline-none text-slate-700 placeholder:text-slate-400"
                  />
                </div>
                <Button
                  onClick={handleFindRide}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-4 sm:px-8 sm:py-6 rounded-xl font-semibold w-full sm:w-auto"
                >
                  Find Your Ride
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>

              {/* School Dropdown */}
              {showSchoolDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 max-h-80 overflow-y-auto z-50"
                >
                  {filteredSchools.length > 0 ? (
                    filteredSchools.map((school) => (
                      <button
                        key={school.id}
                        onClick={() => handleSchoolSelect(school.id)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100 last:border-0"
                      >
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-sm">
                            {school.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{school.name}</p>
                          <p className="text-sm text-slate-500">{school.location}</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center text-slate-500">
                      No universities found
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-16"
          >
            {[
              { value: '50+', label: 'Partner Universities' },
              { value: '10K+', label: 'Happy Students' },
              { value: '4.8', label: 'Average Rating' },
              { value: '25+', label: 'Transport Partners' },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-blue-600">{stat.value}</p>
                <p className="text-slate-600 text-sm">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <ChevronDown className="w-8 h-8 text-slate-400" />
        </motion.div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              How Vaamoose Works
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Booking your campus ride is simple and takes just a few minutes
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className="bg-slate-50 rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <feature.icon className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="absolute -top-3 -left-3 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
                  <p className="text-slate-600">{feature.description}</p>
                </div>
                {index < features.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="w-8 h-8 text-slate-300" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Why Students Choose Vaamoose
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              We prioritize your safety, comfort, and convenience
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {whyChooseUs.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              What Students & Parents Say
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Real experiences from our community
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {reviews.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-slate-50 rounded-2xl p-6"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-slate-700 mb-6">"{review.comment}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium">
                      {review.userName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{review.userName}</p>
                    <p className="text-sm text-slate-500">Student</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="support" className="py-20 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600">
              Everything you need to know about Vaamoose
            </p>
          </motion.div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <AccordionItem value={faq.id} className="bg-white rounded-xl border border-slate-200 px-6">
                  <AccordionTrigger className="text-left font-medium text-slate-900 hover:no-underline py-4">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-slate-600 pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of students who trust Vaamoose for their campus transportation needs.
            </p>
            <Button
              onClick={onBookRide}
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-6 text-lg font-semibold rounded-xl"
            >
              Book Your First Ride
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
