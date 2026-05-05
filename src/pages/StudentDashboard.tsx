import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Bus, CreditCard, Heart, User, LogOut,
  MapPin, Calendar, Clock, ChevronRight, Receipt, Star, Camera,
  TrendingUp, Zap, ArrowUpRight, Plus, CheckCircle2,
  Phone, Mail, GraduationCap, Edit2, Save, X, Shield, Home, Navigation, AlertCircle, Package, Gamepad2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { schools } from '@/data/Data';
import { toast } from 'sonner';
import { ComplaintModal } from '@/components/ComplaintModal';

interface StudentDashboardProps {
  onBook: () => void;
  onViewReceipt: (reference: string) => void;
  onTrack: (partnerId: string, partnerName: string) => void;
  onSendPackage: () => void;
  onBack: () => void;
  onPlayGames?: (bookingRef: string, playerName: string) => void;
}

type Tab = 'overview' | 'rides' | 'transactions' | 'favourites' | 'profile';

const API = 'https://blissful-exploration-production.up.railway.app';

const tabConfig = [
  { id: 'overview' as Tab,     icon: LayoutDashboard, label: 'Home'         },
  { id: 'rides' as Tab,        icon: Bus,             label: 'My Rides'     },
  { id: 'transactions' as Tab, icon: CreditCard,      label: 'Transactions' },
  { id: 'favourites' as Tab,   icon: Heart,           label: 'Favourites'   },
  { id: 'profile' as Tab,      icon: User,            label: 'Profile'      },
];

export function StudentDashboard({ onBook, onViewReceipt, onTrack, onSendPackage, onBack, onPlayGames }: StudentDashboardProps) {
  const { user, logout, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [favourites, setFavourites] = useState<any[]>([]);
  const [reviewedBookings, setReviewedBookings] = useState<string[]>([]);

  const [showComplaint, setShowComplaint] = useState(false);
  const [selectedComplaintBooking, setSelectedComplaintBooking] = useState<any>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState((user as any)?.phoneNumber || '');
  const [university, setUniversity] = useState((user as any)?.university || '');
  const profilePhoto = (user as any)?.profilePhoto || '';
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchBookings();
    const saved = localStorage.getItem('reviewedBookings');
    if (saved) setReviewedBookings(JSON.parse(saved));
    const savedFavs = localStorage.getItem('vaamoose_favourites');
    if (savedFavs) setFavourites(JSON.parse(savedFavs));
  }, []);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(`${API}/api/bookings/my-bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch {
      console.error('Failed to fetch bookings');
    } finally {
      setIsLoadingBookings(false);
    }
  };

  const paidBookings = bookings.filter(b => b.paymentStatus === 'paid');
  const totalSpent = paidBookings.reduce((s, b) => s + (b.amountPaid || b.price || 0), 0);
  const upcomingBookings = paidBookings.filter(b => new Date(b.departureDate) >= new Date());
  const pastBookings = paidBookings.filter(b => new Date(b.departureDate) < new Date());

  const handlePhotoClick = () => fileInputRef.current?.click();
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(`${API}/api/upload/profile-photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        await fetch(`${API}/api/auth/update-profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ profilePhoto: data.url }),
        });
        updateUser({ profilePhoto: data.url } as any);
        toast.success('Photo updated!');
      } else toast.error('Upload failed');
    } catch { toast.error('Upload error'); }
    finally { setIsUploadingPhoto(false); }
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(`${API}/api/auth/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullName, phoneNumber: phone, university }),
      });
      if (res.ok) {
        updateUser({ fullName, phoneNumber: phone, university } as any);
        toast.success('Profile saved!');
        setIsEditing(false);
      } else toast.error('Failed to save');
    } catch { toast.error('Error saving profile'); }
    finally { setIsLoading(false); }
  };

  const addFavourite = (booking: any) => {
    const fav = { route: booking.route, schoolName: booking.schoolName, companyName: booking.companyName, id: booking._id };
    const exists = favourites.find(f => f.route === fav.route && f.companyName === fav.companyName);
    if (exists) { toast.info('Already in favourites'); return; }
    const updated = [...favourites, fav];
    setFavourites(updated);
    localStorage.setItem('vaamoose_favourites', JSON.stringify(updated));
    toast.success('Added to favourites!');
  };

  const removeFavourite = (id: string) => {
    const updated = favourites.filter(f => f.id !== id);
    setFavourites(updated);
    localStorage.setItem('vaamoose_favourites', JSON.stringify(updated));
    toast.success('Removed from favourites');
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 text-white"
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-white/5 rounded-full" />
        <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-blue-200 text-sm font-medium">{greeting()},</p>
            <h2 className="text-2xl font-bold mt-0.5">{user?.fullName?.split(' ')[0]} 👋</h2>
            <p className="text-blue-200 text-sm mt-2">Ready for your next journey?</p>
            <div className="mt-4 flex gap-3">
              <button onClick={onBook} className="flex items-center gap-2 bg-white text-blue-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors">
                <Plus className="w-4 h-4" /> Book a Ride
              </button>
              <button onClick={() => {
                if (onPlayGames) {
                  const latestBooking = paidBookings[0];
                  if (latestBooking) {
                    onPlayGames(latestBooking.paymentReference || latestBooking._id, user?.fullName || 'Player');
                  } else {
                    toast.info('Book a ride first to play games!');
                  }
                }
              }} className="flex items-center gap-2 bg-blue-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-400 transition-colors">
                <Gamepad2 className="w-4 h-4" /> Play Games
              </button>
            </div>
          </div>
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/20 flex items-center justify-center ring-4 ring-white/30">
            {profilePhoto
              ? <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              : <span className="text-white text-2xl font-bold">{user?.fullName?.charAt(0).toUpperCase()}</span>
            }
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {[
          { label: 'Total Trips', value: paidBookings.length,                 icon: Bus,        color: 'bg-blue-50 text-blue-600',       ring: 'ring-blue-100'    },
          { label: 'Total Spent', value: `₦${(totalSpent/1000).toFixed(0)}k`, icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600', ring: 'ring-emerald-100' },
          { label: 'Upcoming',    value: upcomingBookings.length,              icon: Calendar,   color: 'bg-purple-50 text-purple-600',   ring: 'ring-purple-100'  },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
            className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${stat.color} ring-4 ${stat.ring}`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {upcomingBookings.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900">Upcoming Trip</h3>
            <span className="flex items-center gap-1 text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-full">
              <Zap className="w-3 h-3" /> Next up
            </span>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            {(() => {
              const b = upcomingBookings[0];
              return (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Bus className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{b.companyName}</p>
                        <p className="text-xs text-slate-500">{b.vehicleName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => onTrack(b.companyId, b.companyName)}
                        className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2.5 py-1.5 rounded-lg font-medium border border-green-200"
                      >
                        <Navigation className="w-3 h-3" /> Track
                      </button>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Confirmed
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 mb-3">
                    <div className="flex-1">
                      <p className="text-xs text-slate-400">From</p>
                      <p className="font-semibold text-slate-900 text-sm">{b.schoolName}</p>
                    </div>
                    <div className="w-full sm:w-8 h-0.5 bg-blue-200 relative">
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full" />
                    </div>
                    <div className="flex-1 text-left sm:text-right">
                      <p className="text-xs text-slate-400">To</p>
                      <p className="font-semibold text-slate-900 text-sm">{b.route}</p>
                    </div>
                  </div>
                  {b.pickupLocation && (
                    <div className="flex items-center gap-2 mb-3 bg-blue-50 rounded-xl p-2">
                      <MapPin className="w-3 h-3 text-blue-500" />
                      <p className="text-xs text-blue-700">Pickup: <span className="font-semibold">{b.pickupLocation}</span></p>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-3">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(b.departureDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.departureTime}</span>
                    <span className="flex items-center gap-1 ml-auto font-bold text-blue-600">₦{(b.amountPaid || b.price)?.toLocaleString()}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-900">Recent Rides</h3>
          <button onClick={() => setActiveTab('rides')} className="text-xs text-blue-600 font-medium flex items-center gap-1">
            View all <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        {isLoadingBookings ? (
          <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
        ) : pastBookings.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
            <Bus className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No past rides yet</p>
            <button onClick={onBook} className="mt-3 text-blue-600 text-sm font-medium">Book your first ride →</button>
          </div>
        ) : (
          <div className="space-y-3">
            {pastBookings.slice(0, 3).map((b, i) => (
              <motion.div key={b._id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{b.schoolName} → {b.route}</p>
                  <p className="text-xs text-slate-400">{b.companyName} • {new Date(b.departureDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-blue-600 text-sm">₦{(b.amountPaid || b.price)?.toLocaleString()}</p>
                  {b.paymentReference && (
                    <button onClick={() => onViewReceipt(b.paymentReference)} className="text-xs text-slate-400 hover:text-blue-600 flex items-center gap-0.5 mt-0.5 ml-auto">
                      <Receipt className="w-3 h-3" /> Receipt
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <h3 className="font-bold text-slate-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Book a Ride',    icon: Plus,         color: 'bg-blue-600 text-white',                                 action: onBook          },
            { label: 'Send a Package', icon: Package,      color: 'bg-emerald-600 text-white',                              action: onSendPackage   },
            { label: 'My Receipts',    icon: Receipt,      color: 'bg-slate-800 text-white',                                action: () => setActiveTab('transactions') },
            { label: 'File Complaint', icon: AlertCircle,  color: 'bg-red-50 text-red-600 border border-red-100',           action: () => { setSelectedComplaintBooking(null); setShowComplaint(true); } },
          ].map((action) => (
            <button key={action.label} onClick={action.action}
              className={`${action.color} rounded-2xl p-4 text-left flex items-center gap-3 hover:opacity-90 transition-opacity active:scale-95`}
            >
              <action.icon className="w-5 h-5" />
              <span className="font-semibold text-sm">{action.label}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );

  const renderRides = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">My Rides</h2>
        <span className="text-sm text-slate-500">{paidBookings.length} total</span>
      </div>
      {isLoadingBookings ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
      ) : paidBookings.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <Bus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No rides yet</p>
          <button onClick={onBook} className="mt-4 bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl">Book a Ride</button>
        </div>
      ) : (
        paidBookings.map((b, i) => (
          <motion.div key={b._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
          >
            <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Bus className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{b.companyName}</p>
                    <p className="text-xs text-slate-500">{b.vehicleName}</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-blue-600">₦{(b.amountPaid || b.price)?.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 mb-3 bg-slate-50 rounded-xl p-3">
                <div className="flex-1">
                  <p className="text-xs text-slate-400">FROM</p>
                  <p className="font-semibold text-slate-900 text-sm">{b.schoolName}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
                <div className="flex-1 text-right">
                  <p className="text-xs text-slate-400">TO</p>
                  <p className="font-semibold text-slate-900 text-sm">{b.route}</p>
                </div>
              </div>
              {b.pickupLocation && (
                <div className="flex items-center gap-2 mb-3 bg-blue-50 rounded-xl p-2">
                  <MapPin className="w-3 h-3 text-blue-500" />
                  <p className="text-xs text-blue-700">Pickup: <span className="font-semibold">{b.pickupLocation}</span></p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-slate-400">Date</p>
                  <p className="font-semibold text-slate-700">{new Date(b.departureDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-slate-400">Departure</p>
                  <p className="font-semibold text-slate-700">{b.departureTime || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-slate-400">Seat(s)</p>
                  <p className="font-semibold text-slate-700 truncate">
                    {b.seats?.length > 0 ? b.seats.map((s: any) => `R${s.row}S${s.column}`).join(', ') : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button onClick={() => addFavourite(b)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors">
                  <Heart className="w-3.5 h-3.5" /> Save route
                </button>
                <div className="flex gap-2 flex-wrap justify-end">
                  <button onClick={() => onTrack(b.companyId, b.companyName)}
                    className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2.5 py-1.5 rounded-lg font-medium"
                  >
                    <Navigation className="w-3 h-3" /> Track
                  </button>
                  {!reviewedBookings.includes(b._id) && (
                    <button className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg font-medium">
                      <Star className="w-3 h-3" /> Review
                    </button>
                  )}
                  <button onClick={() => { setSelectedComplaintBooking(b); setShowComplaint(true); }}
                    className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg font-medium"
                  >
                    <AlertCircle className="w-3 h-3" /> Complain
                  </button>
                  {b.paymentReference && (
                    <button onClick={() => onViewReceipt(b.paymentReference)}
                      className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg font-medium"
                    >
                      <Receipt className="w-3 h-3" /> Receipt
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );

  const renderTransactions = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Transactions</h2>
        <div className="text-right">
          <p className="text-xs text-slate-400">Total spent</p>
          <p className="font-bold text-blue-600">₦{totalSpent.toLocaleString()}</p>
        </div>
      </div>
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-5 text-white">
        <p className="text-blue-200 text-sm">Total Payments</p>
        <p className="text-3xl font-bold mt-1">₦{totalSpent.toLocaleString()}</p>
        <div className="flex gap-4 mt-4 text-sm">
          <div><p className="text-blue-300 text-xs">Trips paid</p><p className="font-semibold">{paidBookings.length}</p></div>
          <div><p className="text-blue-300 text-xs">Via Paystack</p><p className="font-semibold">100%</p></div>
          <div><p className="text-blue-300 text-xs">Avg per trip</p><p className="font-semibold">₦{paidBookings.length > 0 ? Math.round(totalSpent / paidBookings.length).toLocaleString() : '0'}</p></div>
        </div>
      </div>
      {paidBookings.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-100">
          <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No transactions yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paidBookings.map((b, i) => (
            <motion.div key={b._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{b.companyName}</p>
                  <p className="text-xs text-slate-400">{b.schoolName} → {b.route}</p>
                  {b.paymentReference && (
                    <p className="text-xs font-mono text-slate-300 mt-0.5">{b.paymentReference.toUpperCase()}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-slate-900">₦{(b.amountPaid || b.price)?.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">{new Date(b.paidAt || b.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  {b.paymentReference && (
                    <button onClick={() => onViewReceipt(b.paymentReference)} className="text-xs text-blue-600 font-medium mt-0.5 flex items-center gap-0.5 ml-auto">
                      <Receipt className="w-3 h-3" /> View
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  const renderFavourites = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Saved Routes</h2>
        <span className="text-sm text-slate-400">{favourites.length} saved</span>
      </div>
      <p className="text-sm text-slate-500">Tap "Save route" on any ride to quickly rebook it.</p>
      {favourites.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No saved routes</p>
          <button onClick={() => setActiveTab('rides')} className="mt-4 text-blue-600 text-sm font-medium">Go to My Rides →</button>
        </div>
      ) : (
        <div className="space-y-3">
          {favourites.map((fav, i) => (
            <motion.div key={fav.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-rose-100 rounded-xl flex items-center justify-center">
                    <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{fav.schoolName} → {fav.route}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{fav.companyName}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={onBook} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Book
                  </button>
                  <button onClick={() => removeFavourite(fav.id)} className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1.5 rounded-lg">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">My Profile</h2>
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-blue-600 flex items-center justify-center ring-4 ring-blue-100">
              {profilePhoto
                ? <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                : <span className="text-white text-3xl font-bold">{user?.fullName?.charAt(0).toUpperCase()}</span>
              }
            </div>
            <button onClick={handlePhotoClick} disabled={isUploadingPhoto}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow-md"
            >
              {isUploadingPhoto
                ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Camera className="w-3.5 h-3.5 text-white" />
              }
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{user?.fullName}</h3>
            <p className="text-slate-500 text-sm">{(user as any)?.email}</p>
            <span className="inline-block mt-1 px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">Student</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-slate-900">Personal Info</h4>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="flex items-center gap-1 text-sm text-blue-600 font-medium">
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
          )}
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0"><User className="w-4 h-4 text-blue-600" /></div>
            <div className="flex-1">
              <p className="text-xs text-slate-400">Full Name</p>
              {isEditing
                ? <input value={fullName} onChange={e => setFullName(e.target.value)} className="w-full text-sm font-semibold text-slate-900 border-b border-blue-300 outline-none bg-transparent py-0.5" />
                : <p className="text-sm font-semibold text-slate-900">{user?.fullName || '—'}</p>
              }
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center shrink-0"><Mail className="w-4 h-4 text-slate-400" /></div>
            <div className="flex-1">
              <p className="text-xs text-slate-400">Email</p>
              <p className="text-sm font-semibold text-slate-400">{(user as any)?.email || '—'}</p>
            </div>
            <span className="text-xs text-slate-300 bg-slate-50 px-2 py-0.5 rounded">locked</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0"><Phone className="w-4 h-4 text-emerald-600" /></div>
            <div className="flex-1">
              <p className="text-xs text-slate-400">Phone</p>
              {isEditing
                ? <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+234 801 234 5678" className="w-full text-sm font-semibold text-slate-900 border-b border-blue-300 outline-none bg-transparent py-0.5" />
                : <p className="text-sm font-semibold text-slate-900">{(user as any)?.phoneNumber || 'Not set'}</p>
              }
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center shrink-0"><GraduationCap className="w-4 h-4 text-purple-600" /></div>
            <div className="flex-1">
              <p className="text-xs text-slate-400">University</p>
              {isEditing ? (
                <select value={university} onChange={e => setUniversity(e.target.value)} className="w-full text-sm font-semibold text-slate-900 border-b border-blue-300 outline-none bg-transparent py-0.5">
                  <option value="">Select university</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              ) : (
                <p className="text-sm font-semibold text-slate-900">
                  {schools.find(s => s.id === (user as any)?.university)?.name || (user as any)?.university || 'Not set'}
                </p>
              )}
            </div>
          </div>
        </div>
        {isEditing && (
          <div className="flex gap-3 mt-5">
            <button onClick={handleSaveProfile} disabled={isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-3 rounded-xl flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />{isLoading ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={() => setIsEditing(false)} className="px-4 py-3 bg-slate-100 text-slate-600 font-semibold text-sm rounded-xl">Cancel</button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
        <h4 className="font-bold text-slate-900">Account</h4>
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
          <Shield className="w-4 h-4 text-slate-400" />
          <p className="text-sm text-slate-600">Verified student account</p>
          <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
        </div>
        <button onClick={() => { setSelectedComplaintBooking(null); setShowComplaint(true); }}
          className="w-full py-3 text-red-600 border border-red-100 bg-red-50 hover:bg-red-100 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <AlertCircle className="w-4 h-4" /> File a Complaint
        </button>
        <button onClick={() => { logout(); onBack(); }}
          className="w-full py-3 text-slate-500 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Log Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 min-h-screen fixed left-0 top-0 z-30">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">Vaamoose</span>
          </div>
        </div>
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-blue-600 flex items-center justify-center shrink-0">
              {profilePhoto
                ? <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                : <span className="text-white font-bold">{user?.fullName?.charAt(0).toUpperCase()}</span>
              }
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 text-sm truncate">{user?.fullName}</p>
              <p className="text-xs text-slate-400 truncate">{(user as any)?.email}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {tabConfig.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
          <button onClick={onSendPackage}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-all"
          >
            <Package className="w-4 h-4" /> Send a Package
          </button>
          <button onClick={onBack}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-all"
          >
            <Home className="w-4 h-4" /> Landing Page
          </button>
          <button onClick={() => { setSelectedComplaintBooking(null); setShowComplaint(true); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
          >
            <AlertCircle className="w-4 h-4" /> File Complaint
          </button>
        </nav>
        <div className="p-4 border-t border-slate-100 space-y-2">
          <button onClick={onBook} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Book a Ride
          </button>
          <button onClick={() => { logout(); onBack(); }} className="w-full text-slate-400 hover:text-red-500 text-sm font-medium py-2 flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4" /> Log Out
          </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-64 pb-24 lg:pb-8">
        <div className="lg:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Bus className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">Vaamoose</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onSendPackage} className="bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1">
              <Package className="w-3 h-3" /> Send
            </button>
            <button onClick={onBook} className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1">
              <Plus className="w-3 h-3" /> Book
            </button>
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-blue-600 flex items-center justify-center">
              {profilePhoto
                ? <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                : <span className="text-white text-xs font-bold">{user?.fullName?.charAt(0).toUpperCase()}</span>
              }
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white">
          <div>
            <h1 className="text-xl font-bold text-slate-900 capitalize">
              {activeTab === 'overview' ? 'Dashboard' : tabConfig.find(t => t.id === activeTab)?.label}
            </h1>
            <p className="text-sm text-slate-400">
              {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={onSendPackage} className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2">
              <Package className="w-4 h-4" /> Send Package
            </button>
            <button onClick={onBook} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2">
              <Plus className="w-4 h-4" /> Book a Ride
            </button>
          </div>
        </div>

        <div className="p-4 lg:p-8 max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {activeTab === 'overview'     && renderOverview()}
              {activeTab === 'rides'        && renderRides()}
              {activeTab === 'transactions' && renderTransactions()}
              {activeTab === 'favourites'   && renderFavourites()}
              {activeTab === 'profile'      && renderProfile()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 px-2 py-2">
        <div className="flex items-center justify-around">
          <button onClick={onBack} className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-slate-400">
            <Home className="w-5 h-5" />
            <span className="text-xs font-medium">Home</span>
          </button>
          {tabConfig.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400'}`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tab.label}</span>
              {activeTab === tab.id && <div className="w-1 h-1 bg-blue-600 rounded-full" />}
            </button>
          ))}
        </div>
      </nav>

      <ComplaintModal
        isOpen={showComplaint}
        onClose={() => { setShowComplaint(false); setSelectedComplaintBooking(null); }}
        booking={selectedComplaintBooking}
        user={{ fullName: user?.fullName, email: (user as any)?.email }}
      />
    </div>
  );
}