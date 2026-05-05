import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  MapPin,
  Wifi,
  Wind,
  BatteryCharging,
  Droplets,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { schools, generateSeats } from '@/data/Data';
import { usePartners } from '@/hooks/usePartners';
import type { TransportCompany, Vehicle, Seat, Route } from '@/types';
import { toast } from 'sonner';

interface BookingFlowProps {
  schoolId: string | null;
  onBack: () => void;
  onComplete?: () => void;
}

type BookingStep =
  | 'company'
  | 'vehicle'
  | 'seats'
  | 'route'
  | 'luggage'
  | 'summary';

const amenitiesIcons: Record<string, React.ElementType> = {
  WiFi: Wifi,
  AC: Wind,
  'USB Charging': BatteryCharging,
  Water: Droplets,
};

export function BookingFlow({ schoolId, onBack }: BookingFlowProps) {
  const { transportCompanies } = usePartners();

  const [currentStep, setCurrentStep] = useState<BookingStep>('company');
  const [selectedCompany, setSelectedCompany] = useState<TransportCompany | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [allSeats, setAllSeats] = useState<Seat[]>([]);
  const [luggagePhotos, setLuggagePhotos] = useState<string[]>([]);
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');

  const school = schools.find(s => s.id === schoolId);

  const safeNumber = (v: any, fallback = 0) => {
    const n = Number(v);
    return isNaN(n) ? fallback : n;
  };

  const calculateBaseFare = () => {
    if (!selectedRoute || !selectedVehicle) return 0;
    return safeNumber(selectedRoute.basePrice) * safeNumber(selectedVehicle.priceMultiplier, 1);
  };

  const calculateSeatTotal = () =>
    selectedSeats.reduce((sum, seat) => sum + safeNumber(seat.price), 0);

  const calculateTotal = () => Math.round(calculateBaseFare() + calculateSeatTotal());

  const calculateFee = () => {
    const base = calculateTotal();
    if (!base) return 0;
    let fee = base < 2500 ? Math.ceil(base * 0.015) : Math.ceil(base * 0.015 + 100);
    if (fee > 2000) fee = 2000;
    return fee;
  };

  const calculateTotalWithFee = () => calculateTotal() + calculateFee();

  const availableRoutes =
    selectedCompany?.availableRoutes.map((r: any, i: number) => ({
      id: r._id || String(i),
      from: r.from,
      to: r.to,
      distance: r.distance,
      estimatedDuration: r.estimatedDuration,
      basePrice: safeNumber(r.basePrice), popular: false,
    })) || [];

  const steps = [
    { id: 'company', label: 'Company' },
    { id: 'vehicle', label: 'Vehicle' },
    { id: 'seats',   label: 'Seats'   },
    { id: 'route',   label: 'Route'   },
    { id: 'luggage', label: 'Luggage' },
    { id: 'summary', label: 'Summary' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const handleNext = () => {
    const next = currentStepIndex + 1;
    if (next < steps.length) setCurrentStep(steps[next].id as BookingStep);
  };

  const handleBack = () => {
    const prev = currentStepIndex - 1;
    if (prev >= 0) setCurrentStep(steps[prev].id as BookingStep);
    else onBack();
  };

  const handleCompanySelect = (company: TransportCompany) => {
    setSelectedCompany(company);
    handleNext();
  };

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicle({ ...vehicle, priceMultiplier: safeNumber(vehicle.priceMultiplier, 1) });
    setAllSeats(generateSeats(vehicle.type));
    setSelectedSeats([]);
    handleNext();
  };

  const handleSeatToggle = (seat: Seat) => {
    if (seat.status === 'occupied') return;
    setSelectedSeats(prev => {
      const exists = prev.find(s => s.id === seat.id);
      return exists ? prev.filter(s => s.id !== seat.id) : [...prev, seat];
    });
  };

  const handleRouteSelect = (route: Route) => {
    setSelectedRoute(route);
    handleNext();
  };

  const handleBooking = async () => {
    if (!selectedCompany || !selectedVehicle || !selectedRoute || !departureDate || !departureTime || selectedSeats.length === 0) {
      toast.error('Please complete all booking details');
      return;
    }

    const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    const user = savedUser ? JSON.parse(savedUser) : {};

    if (!user.email) {
      toast.error('Please login again');
      return;
    }

    const bookingData = {
      schoolId,
      schoolName: school?.name,
      companyId: selectedCompany.id,
      companyName: selectedCompany.name,
      vehicleId: selectedVehicle.id,
      vehicleName: selectedVehicle.name,
      routeId: selectedRoute.id,
      routeTo: selectedRoute.to,
      departureDate,
      departureTime,
      seats: selectedSeats,
      totalPrice: calculateTotal(),
      luggagePhotos,
      pickupLocation,
    };

    try {
      const res = await fetch(
        'https://blissful-exploration-production.up.railway.app/api/payment/initialize',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, amount: calculateTotalWithFee(), bookingData }),
        }
      );

      const data = await res.json();

      if (data.authorization_url) {
        localStorage.setItem('paymentReference', data.reference);
        localStorage.setItem('bookingData', JSON.stringify(bookingData));
        window.location.href = data.authorization_url;
      } else {
        toast.error(data.error || 'Payment initialization failed');
      }
    } catch {
      toast.error('Network error. Please try again.');
    }
  };

  // ── STEP RENDERS ──

  const renderCompany = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Choose Your Transport Partner</h2>
        <p className="text-slate-500 mt-1">Available companies at {school?.name}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {transportCompanies.map(company => {
          const Icon = amenitiesIcons['AC'] || Wind;
          return (
            <button
              key={company.id}
              onClick={() => handleCompanySelect(company)}
              className={`text-left p-5 border-2 rounded-2xl transition-all hover:shadow-md ${
                selectedCompany?.id === company.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{company.name}</h3>
                  <p className="text-xs text-slate-500">{company.rating} ★ ({company.reviewCount} reviews)</p>
                </div>
              </div>
              <p className="text-sm text-slate-600">{company.description}</p>
              <div className="flex flex-wrap gap-1 mt-3">
                {company.amenities.slice(0, 4).map(a => (
                  <span key={a} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{a}</span>
                ))}
              </div>
            </button>
          );
        })}
        {transportCompanies.length === 0 && (
          <div className="col-span-2 text-center py-12 text-slate-400">
            <p>No transport companies available yet.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderVehicle = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Choose Your Ride</h2>
        <p className="text-slate-500 mt-1">Select the vehicle type for your journey</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(selectedCompany?.vehicles || []).map((vehicle: any) => (
          <button
            key={vehicle._id || vehicle.id}
            onClick={() => handleVehicleSelect({ ...vehicle, id: vehicle._id || vehicle.id })}
            className={`text-left p-5 border-2 rounded-2xl transition-all hover:shadow-md ${
              selectedVehicle?.id === (vehicle._id || vehicle.id) ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'
            }`}
          >
            <h3 className="font-bold text-slate-900 mb-1">{vehicle.name}</h3>
            <p className="text-sm text-slate-500 mb-2">{vehicle.type} • {vehicle.capacity} seats</p>
            <p className="text-sm text-blue-600 font-semibold">x{vehicle.priceMultiplier} multiplier</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {(vehicle.features || []).map((f: string) => (
                <span key={f} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{f}</span>
              ))}
            </div>
          </button>
        ))}
        {(!selectedCompany?.vehicles || selectedCompany.vehicles.length === 0) && (
          <div className="col-span-3 text-center py-12 text-slate-400">
            <p>This company has no vehicles added yet.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderSeats = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Select Your Seats</h2>
        <p className="text-slate-500 mt-1">Choose your preferred seating position</p>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex justify-center mb-4">
            <div className="px-6 py-2 bg-slate-200 rounded-t-lg text-sm text-slate-500">FRONT</div>
          </div>
          <div className="flex flex-col items-center gap-2">
            {Array.from(new Set(allSeats.map(s => s.row))).map(row => (
              <div key={row} className="flex gap-2">
                {allSeats.filter(s => s.row === row).map(seat => (
                  <button
                    key={seat.id}
                    onClick={() => handleSeatToggle(seat)}
                    disabled={seat.status === 'occupied'}
                    className={`w-12 h-12 rounded-lg text-xs font-bold transition-all ${
                      seat.status === 'occupied' ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : selectedSeats.find(s => s.id === seat.id) ? 'bg-blue-600 text-white shadow-lg'
                      : seat.type === 'window' ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300 hover:bg-emerald-200'
                      : seat.type === 'front' ? 'bg-amber-100 text-amber-700 border-2 border-amber-300 hover:bg-amber-200'
                      : 'bg-slate-100 text-slate-700 border-2 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {seat.row}-{seat.column}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-4">
            <div className="px-6 py-2 bg-slate-200 rounded-b-lg text-sm text-slate-500">BACK</div>
          </div>
        </div>

        <div className="lg:w-72 bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-900 mb-3">Seat Legend</h3>
          <div className="space-y-2 text-sm">
            {[
              { color: 'bg-emerald-100 border-emerald-300', label: 'Window (+₦200)' },
              { color: 'bg-amber-100 border-amber-300', label: 'Front Row (+₦500)' },
              { color: 'bg-slate-100 border-slate-300', label: 'Standard (Free)' },
              { color: 'bg-slate-200', label: 'Occupied' },
              { color: 'bg-blue-600', label: 'Selected' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded ${item.color} border-2`} />
                <span className="text-slate-600">{item.label}</span>
              </div>
            ))}
          </div>
          {selectedSeats.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="font-semibold text-slate-900 mb-2">Selected</p>
              {selectedSeats.map(s => (
                <div key={s.id} className="flex justify-between text-sm text-slate-600">
                  <span>Row {s.row}, Seat {s.column}</span>
                  <span>₦{s.price}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderRoute = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Where Are You Headed?</h2>
        <p className="text-slate-500 mt-1">Select your destination and travel details</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {availableRoutes.map(route => (
            <button
              key={route.id}
              onClick={() => handleRouteSelect(route)}
              className={`w-full text-left p-5 border-2 rounded-2xl transition-all hover:shadow-md ${
                selectedRoute?.id === route.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{route.to}</p>
                    <p className="text-sm text-slate-500">{route.distance}km • {Math.round(route.estimatedDuration / 60)}h</p>
                  </div>
                </div>
                <p className="text-xl font-bold text-blue-600">
                  ₦{Math.round(route.basePrice * safeNumber(selectedVehicle?.priceMultiplier, 1)).toLocaleString()}
                </p>
              </div>
            </button>
          ))}
          {availableRoutes.length === 0 && (
            <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200">
              <p>This company has no routes added yet.</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Departure Date</label>
            <input type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Departure Time</label>
            <select value={departureTime} onChange={e => setDepartureTime(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select time</option>
              {['06:00','08:00','10:00','12:00','14:00','16:00','18:00'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Pickup Location on Campus</label>
            <input
              type="text"
              value={pickupLocation}
              onChange={e => setPickupLocation(e.target.value)}
              placeholder="e.g. Main Gate, Cafeteria, Male Hostel..."
              className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderLuggage = () => (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Snap Your Luggage</h2>
        <p className="text-slate-500 mt-1">Help drivers prepare space for your items</p>
      </div>
      <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center hover:border-blue-400 hover:bg-blue-50 transition-all">
        <p className="text-slate-500 mb-4">Upload photos of your luggage</p>
        <input type="file" accept="image/*" multiple id="luggage-upload" className="hidden"
          onChange={async e => {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;
            const toastId = toast.loading('Uploading...');
            try {
              const urls: string[] = [];
              for (const file of files) {
                const fd = new FormData();
                fd.append('photo', file);
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                const res = await fetch('https://blissful-exploration-production.up.railway.app/api/upload/luggage', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}` },
                  body: fd,
                });
                const data = await res.json();
                if (data.url) urls.push(data.url);
              }
              setLuggagePhotos(prev => [...prev, ...urls]);
              toast.success(`${urls.length} photo(s) uploaded!`, { id: toastId });
            } catch {
              toast.error('Upload failed', { id: toastId });
            }
          }}
        />
        <label htmlFor="luggage-upload" className="cursor-pointer inline-block bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700">
          Choose Photos
        </label>
      </div>
      {luggagePhotos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          {luggagePhotos.map((url, i) => (
            <div key={i} className="relative">
              <img src={url} alt={`Luggage ${i+1}`} className="w-full h-40 object-cover rounded-xl" />
              <button onClick={() => setLuggagePhotos(p => p.filter((_, j) => j !== i))}
                className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSummary = () => (
    <Card className="p-6 space-y-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-slate-900">Review Your Booking</h2>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">Company</span><span className="font-semibold">{selectedCompany?.name}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Vehicle</span><span className="font-semibold">{selectedVehicle?.name}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Route</span><span className="font-semibold">{school?.name} → {selectedRoute?.to}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Date</span><span className="font-semibold">{departureDate}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Time</span><span className="font-semibold">{departureTime}</span></div>
        {pickupLocation && <div className="flex justify-between"><span className="text-slate-500">Pickup</span><span className="font-semibold">{pickupLocation}</span></div>}
        <div className="flex justify-between"><span className="text-slate-500">Seats</span><span className="font-semibold">{selectedSeats.map(s => `R${s.row}S${s.column}`).join(', ') || '—'}</span></div>
      </div>

      <div className="border-t border-slate-100 pt-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">Base fare</span><span>₦{safeNumber(selectedRoute?.basePrice)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Vehicle multiplier</span><span>x{safeNumber(selectedVehicle?.priceMultiplier, 1)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Seat upgrades</span><span>₦{calculateSeatTotal()}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Processing fee</span><span>₦{calculateFee()}</span></div>
        <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-100">
          <span>Total</span>
          <span className="text-blue-600">₦{calculateTotalWithFee().toLocaleString()}</span>
        </div>
      </div>

      <Button onClick={handleBooking} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-semibold">
        Confirm & Pay ₦{calculateTotalWithFee().toLocaleString()}
      </Button>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-10">
      <div className="max-w-5xl mx-auto px-4">

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                index < currentStepIndex ? 'bg-blue-600 text-white'
                : index === currentStepIndex ? 'bg-blue-600 text-white'
                : 'bg-slate-200 text-slate-500'
              }`}>
                {index < currentStepIndex ? <Check className="w-5 h-5" /> : index + 1}
              </div>
              <span className={`ml-2 text-sm font-medium hidden sm:block ${index <= currentStepIndex ? 'text-slate-900' : 'text-slate-400'}`}>
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-8 sm:w-12 h-0.5 mx-2 sm:mx-4 ${index < currentStepIndex ? 'bg-blue-600' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
            {currentStep === 'company' && renderCompany()}
            {currentStep === 'vehicle' && renderVehicle()}
            {currentStep === 'seats'   && renderSeats()}
            {currentStep === 'route'   && renderRoute()}
            {currentStep === 'luggage' && renderLuggage()}
            {currentStep === 'summary' && renderSummary()}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={handleBack} className="flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          {currentStep !== 'company' && currentStep !== 'summary' && (
            <Button
              onClick={handleNext}
              disabled={
                (currentStep === 'seats' && selectedSeats.length === 0) ||
                (currentStep === 'route' && !selectedRoute)
              }
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
