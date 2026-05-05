import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Package, MapPin, Phone, CheckCircle2, Truck, LogOut, Navigation, ArrowRight, User } from 'lucide-react';
import { toast } from 'sonner';

interface DeliveryAgentDashboardProps {
  onBack: () => void;
}

const API = 'https://blissful-exploration-production.up.railway.app';

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-amber-100 text-amber-700',
  accepted:   'bg-blue-100 text-blue-700',
  picked_up:  'bg-purple-100 text-purple-700',
  in_transit: 'bg-indigo-100 text-indigo-700',
  delivered:  'bg-emerald-100 text-emerald-700',
  cancelled:  'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  pending:    'Pending',
  accepted:   'Accepted',
  picked_up:  'Picked Up',
  in_transit: 'In Transit',
  delivered:  'Delivered',
  cancelled:  'Cancelled',
};

type Tab = 'available' | 'active' | 'completed';

export function DeliveryAgentDashboard({ onBack }: DeliveryAgentDashboardProps) {
  const [agent, setAgent] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [availableDeliveries, setAvailableDeliveries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('available');
  const [otpInput, setOtpInput] = useState('');
  const [confirmingDelivery, setConfirmingDelivery] = useState<string | null>(null);
  const locationIntervalRef = useRef<any>(null);

  const token = localStorage.getItem('agentToken');

  useEffect(() => {
    const savedAgent = localStorage.getItem('agent');
    if (savedAgent) setAgent(JSON.parse(savedAgent));
    fetchDashboard();
    fetchAvailableDeliveries();
    return () => clearInterval(locationIntervalRef.current);
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API}/api/delivery-agents/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDashboardData(data);
    } catch { console.error('Failed to fetch dashboard'); }
    finally { setIsLoading(false); }
  };

  const fetchAvailableDeliveries = async () => {
    try {
      const res = await fetch(`${API}/api/delivery-agents/available-deliveries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAvailableDeliveries(data.deliveries || []);
    } catch { console.error('Failed to fetch available deliveries'); }
  };

  const handleAccept = async (deliveryId: string) => {
    try {
      const res = await fetch(`${API}/api/delivery-agents/accept/${deliveryId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Delivery accepted!');
        fetchDashboard();
        fetchAvailableDeliveries();
        setActiveTab('active');
      } else {
        toast.error(data.error || 'Failed to accept');
      }
    } catch { toast.error('Something went wrong'); }
  };

  const handleUpdateStatus = async (deliveryId: string, status: string) => {
    try {
      const res = await fetch(`${API}/api/delivery-agents/update-status/${deliveryId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Status updated to ${STATUS_LABELS[status]}`);
        if (status === 'in_transit') {
          startLocationBroadcast(deliveryId);
        }
        if (status === 'delivered') {
          clearInterval(locationIntervalRef.current);
        }
        fetchDashboard();
      } else {
        toast.error(data.error || 'Failed to update');
      }
    } catch { toast.error('Something went wrong'); }
  };

  const startLocationBroadcast = (deliveryId: string) => {
    clearInterval(locationIntervalRef.current);
    locationIntervalRef.current = setInterval(() => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(async pos => {
        try {
          await fetch(`${API}/api/delivery-agents/location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude, deliveryId }),
          });
        } catch { console.error('Location update failed'); }
      });
    }, 5000);
  };

  const handleConfirmOTP = async (deliveryId: string) => {
    if (!otpInput || otpInput.length !== 4) { toast.error('Please enter the 4-digit OTP'); return; }
    try {
      const res = await fetch(`${API}/api/delivery-agents/confirm-otp/${deliveryId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpInput }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Delivery confirmed! 🎉');
        setConfirmingDelivery(null);
        setOtpInput('');
        fetchDashboard();
      } else {
        toast.error(data.error || 'Invalid OTP');
      }
    } catch { toast.error('Something went wrong'); }
  };

  const handleLogout = () => {
    localStorage.removeItem('agentToken');
    localStorage.removeItem('agent');
    onBack();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const allDeliveries = dashboardData?.deliveries || [];
  const activeDeliveries = allDeliveries.filter((d: any) => ['accepted', 'picked_up', 'in_transit'].includes(d.status));
  const completedDeliveries = allDeliveries.filter((d: any) => d.status === 'delivered');
  const earnings = dashboardData?.earnings || 0;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">{agent?.fullName}</h1>
              <p className="text-blue-200 text-sm">Delivery Agent</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-white/80 hover:text-white text-sm">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        {/* Stats */}
        <div className="max-w-2xl mx-auto mt-5 grid grid-cols-3 gap-3">
          {[
            { label: 'Total Deliveries', value: completedDeliveries.length },
            { label: 'Active',           value: activeDeliveries.length    },
            { label: 'Earnings',         value: `₦${earnings.toLocaleString()}` },
          ].map(stat => (
            <div key={stat.label} className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-blue-200 text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Tabs */}
        <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200 mb-5 w-fit">
          {([
            { id: 'available', label: `Available (${availableDeliveries.length})`  },
            { id: 'active',    label: `Active (${activeDeliveries.length})`          },
            { id: 'completed', label: `Done (${completedDeliveries.length})`         },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Available deliveries */}
        {activeTab === 'available' && (
          <div className="space-y-4">
            {availableDeliveries.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-slate-100">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-semibold text-slate-700">No deliveries available</p>
                <p className="text-slate-400 text-sm mt-1">New requests will appear here</p>
              </div>
            ) : (
              availableDeliveries.map((d: any) => (
                <motion.div key={d._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-slate-900">{d.itemDescription}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{d.estimatedWeight}</p>
                    </div>
                    <span className="text-lg font-bold text-blue-600">₦{d.price?.toLocaleString()}</span>
                  </div>
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-start gap-2 text-slate-600">
                      <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      <span><b>Pickup:</b> {d.pickupAddress}</span>
                    </div>
                    <div className="flex items-start gap-2 text-slate-600">
                      <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span><b>Deliver to:</b> {d.receiverAddress}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <User className="w-4 h-4 text-slate-400" />
                      <span>{d.receiverName} · {d.receiverPhone}</span>
                    </div>
                  </div>
                  <button onClick={() => handleAccept(d._id)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Accept Delivery
                  </button>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Active deliveries */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {activeDeliveries.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-slate-100">
                <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-semibold text-slate-700">No active deliveries</p>
                <p className="text-slate-400 text-sm mt-1">Accept a delivery to get started</p>
              </div>
            ) : (
              activeDeliveries.map((d: any) => (
                <motion.div key={d._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
                >
                  <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-slate-900">{d.itemDescription}</p>
                        <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[d.status]}`}>
                          {STATUS_LABELS[d.status]}
                        </span>
                      </div>
                      <span className="text-lg font-bold text-blue-600">₦{d.price?.toLocaleString()}</span>
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-start gap-2 text-slate-600">
                        <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        <span>{d.pickupAddress}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 text-xs">
                        <ArrowRight className="w-3 h-3" />
                      </div>
                      <div className="flex items-start gap-2 text-slate-600">
                        <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{d.receiverAddress}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span>{d.receiverName} · {d.receiverPhone}</span>
                      </div>
                    </div>

                    {/* Action buttons based on status */}
                    <div className="space-y-2">
                      {d.status === 'accepted' && (
                        <button onClick={() => handleUpdateStatus(d._id, 'picked_up')}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
                        >
                          <Package className="w-4 h-4" /> Mark as Picked Up
                        </button>
                      )}
                      {d.status === 'picked_up' && (
                        <button onClick={() => handleUpdateStatus(d._id, 'in_transit')}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
                        >
                          <Navigation className="w-4 h-4" /> Start Transit (Share Location)
                        </button>
                      )}
                      {d.status === 'in_transit' && (
                        <>
                          <div className="flex items-center gap-2 bg-green-50 rounded-xl p-2 mb-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <p className="text-xs text-green-700 font-medium">Location being shared live</p>
                          </div>
                          <button onClick={() => handleUpdateStatus(d._id, 'delivered')}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Mark as Delivered
                          </button>
                        </>
                      )}

                      {/* OTP confirmation */}
                      {d.status === 'delivered' && !d.otpVerified && (
                        <div className="space-y-2">
                          <p className="text-sm text-slate-600 font-medium">Enter OTP from receiver to confirm:</p>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              maxLength={4}
                              value={confirmingDelivery === d._id ? otpInput : ''}
                              onChange={e => { setConfirmingDelivery(d._id); setOtpInput(e.target.value); }}
                              placeholder="4-digit OTP"
                              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-center text-xl font-bold tracking-widest"
                            />
                            <button onClick={() => handleConfirmOTP(d._id)}
                              className="px-5 py-3 bg-emerald-600 text-white rounded-xl font-semibold"
                            >
                              Confirm
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Completed deliveries */}
        {activeTab === 'completed' && (
          <div className="space-y-3">
            {completedDeliveries.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-slate-100">
                <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No completed deliveries yet</p>
              </div>
            ) : (
              completedDeliveries.map((d: any) => (
                <div key={d._id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{d.itemDescription}</p>
                    <p className="text-xs text-slate-400">{d.receiverName} · {new Date(d.deliveredAt || d.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <p className="font-bold text-emerald-600 shrink-0">₦{d.price?.toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}