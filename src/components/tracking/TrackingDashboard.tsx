import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Navigation, 
  Phone, 
  MessageSquare, 
  Share2,
  User,
  Bus,
  ChevronLeft,
  Bell,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface TrackingDashboardProps {
  onBack: () => void;
  onPlayGames?: (bookingRef: string, playerName: string) => void;
}

// Mock tracking data
const mockTracking = {
  bookingId: 'VA-2025-001',
  status: 'in-transit',
  currentLocation: {
    lat: 6.5244,
    lng: 3.3792,
    address: 'Lagos-Ibadan Expressway',
  },
  eta: '45 minutes',
  progress: 65,
  driver: {
    name: 'Michael Adeyemi',
    phone: '+234 801 234 5678',
    rating: 4.8,
    photo: null,
  },
  vehicle: {
    type: 'Luxury Bus',
    plateNumber: 'LAG-123-XA',
    color: 'White',
  },
  route: {
    from: 'Covenant University',
    to: 'Lagos (Ikeja)',
    distance: '45 km',
    duration: '1 hour 30 minutes',
  },
  stops: [
    { name: 'Covenant University', status: 'completed', time: '08:00 AM' },
    { name: 'Ogun State Border', status: 'completed', time: '08:45 AM' },
    { name: 'Lagos Toll Gate', status: 'current', time: '09:15 AM' },
    { name: 'Ikeja Terminal', status: 'pending', time: '09:45 AM' },
  ],
};

export function TrackingDashboard({ onBack, onPlayGames }: TrackingDashboardProps) {
  const [tracking] = useState(mockTracking);
  const [showShareModal, setShowShareModal] = useState(false);
  const [notifications] = useState([
    { id: 1, title: 'Journey Started', message: 'Your bus has departed from Covenant University', time: '08:00 AM', read: true },
    { id: 2, title: 'Stop Reached', message: 'Passed Ogun State Border', time: '08:45 AM', read: true },
    { id: 3, title: 'Approaching', message: 'Arriving at Lagos Toll Gate in 5 minutes', time: '09:10 AM', read: false },
  ]);

  const handleShareWithParent = () => {
    toast.success('Tracking link shared with parent!');
    setShowShareModal(false);
  };

  const handleCallDriver = () => {
    toast.info('Calling driver...');
  };

  const handleMessageDriver = () => {
    toast.info('Opening chat with driver...');
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-10">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share with Parent
            </button>
            <div className="relative">
              <Bell className="w-6 h-6 text-slate-600" />
              {notifications.some(n => !n.read) && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status Banner */}
        <div className="mb-6">
          <Card className="bg-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Booking #{tracking.bookingId}</p>
                  <h2 className="text-2xl font-bold">
                    {tracking.status === 'in-transit' ? 'On Your Way!' : 'Journey Complete'}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-blue-100 text-sm">Estimated Arrival</p>
                  <p className="text-3xl font-bold">{tracking.eta}</p>
                  {onPlayGames && (
                    <button
                      onClick={() => onPlayGames(tracking.bookingId, 'Player')}
                      className="mt-2 flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors text-sm font-medium"
                    >
                      🎮 Play Games
                    </button>
                  )}
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-6">
                <div className="h-3 bg-blue-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${tracking.progress}%` }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                    className="h-full bg-white rounded-full"
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm text-blue-100">
                  <span>{tracking.route.from}</span>
                  <span>{tracking.progress}% complete</span>
                  <span>{tracking.route.to}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map View */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardContent className="p-0">
                <div className="relative h-[500px] bg-slate-900 rounded-xl overflow-hidden">
                  {/* Mock Map Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900">
                    {/* Grid Pattern */}
                    <div className="absolute inset-0 opacity-10" style={{
                      backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                      backgroundSize: '40px 40px'
                    }} />
                    
                    {/* Route Line */}
                    <svg className="absolute inset-0 w-full h-full">
                      <path
                        d="M 100 400 Q 200 350 300 300 T 500 200"
                        stroke="#3B82F6"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray="8 4"
                      />
                    </svg>

                    {/* Start Point */}
                    <div className="absolute bottom-20 left-20">
                      <div className="w-4 h-4 bg-emerald-500 rounded-full" />
                      <p className="text-white text-xs mt-1">Start</p>
                    </div>

                    {/* Current Position */}
                    <motion.div
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <div className="relative">
                        <div className="w-20 h-20 bg-blue-500/30 rounded-full animate-ping absolute" />
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center relative z-10 shadow-lg">
                          <Bus className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </motion.div>

                    {/* End Point */}
                    <div className="absolute top-20 right-20">
                      <div className="w-4 h-4 bg-blue-500 rounded-full" />
                      <p className="text-white text-xs mt-1">Destination</p>
                    </div>
                  </div>

                  {/* Map Overlay Info */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Navigation className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="text-sm text-slate-500">Current Location</p>
                            <p className="font-medium text-slate-900">{tracking.currentLocation.address}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Speed</p>
                          <p className="font-medium text-slate-900">80 km/h</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            {/* Driver Info */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Your Driver</h3>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{tracking.driver.name}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-amber-400">★</span>
                      <span className="text-sm text-slate-600">{tracking.driver.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={handleCallDriver} className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Call
                  </Button>
                  <Button variant="outline" onClick={handleMessageDriver} className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Message
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Info */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Vehicle Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Type</span>
                    <span className="font-medium text-slate-900">{tracking.vehicle.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Plate Number</span>
                    <span className="font-medium text-slate-900">{tracking.vehicle.plateNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Color</span>
                    <span className="font-medium text-slate-900">{tracking.vehicle.color}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Journey Stops */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Journey Stops</h3>
                <div className="space-y-4">
                  {tracking.stops.map((stop, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                        ${stop.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 
                          stop.status === 'current' ? 'bg-blue-100 text-blue-600' : 
                          'bg-slate-100 text-slate-400'}
                      `}>
                        {stop.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : stop.status === 'current' ? (
                          <MapPin className="w-4 h-4" />
                        ) : (
                          <span className="text-xs">{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${
                          stop.status === 'pending' ? 'text-slate-400' : 'text-slate-900'
                        }`}>
                          {stop.name}
                        </p>
                        <p className="text-sm text-slate-500">{stop.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Notifications</h3>
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`p-3 rounded-lg ${notification.read ? 'bg-slate-50' : 'bg-blue-50'}`}
                    >
                      <div className="flex items-start gap-2">
                        {notification.title.includes('Started') ? (
                          <Bus className="w-4 h-4 text-blue-600 mt-0.5" />
                        ) : notification.title.includes('Approaching') ? (
                          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className={`font-medium text-sm ${notification.read ? 'text-slate-700' : 'text-slate-900'}`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-slate-500">{notification.message}</p>
                          <p className="text-xs text-slate-400 mt-1">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Share Modal */}
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-4">Share Tracking</h3>
              <p className="text-slate-600 mb-6">
                Share this tracking link with your parent or guardian so they can follow your journey.
              </p>
              <div className="bg-slate-100 rounded-lg p-3 mb-6 flex items-center gap-2">
                <input
                  type="text"
                  value={`https://vaamoose.ng/track/${tracking.bookingId}`}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-slate-600 outline-none"
                />
                <button 
                  onClick={() => toast.success('Link copied!')}
                  className="text-blue-600 text-sm font-medium"
                >
                  Copy
                </button>
              </div>
              <div className="space-y-3">
                <Button onClick={handleShareWithParent} className="w-full bg-blue-600 hover:bg-blue-700">
                  Share via SMS/Email
                </Button>
                <Button variant="outline" onClick={() => setShowShareModal(false)} className="w-full">
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
