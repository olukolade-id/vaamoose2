import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Bus, Clock, Route, ArrowLeft, Navigation, RefreshCw } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom bus icon
const busIcon = L.divIcon({
  html: `
    <div style="
      background: #2563eb;
      border: 3px solid white;
      border-radius: 50%;
      width: 42px;
      height: 42px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(37,99,235,0.5);
    ">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M17 20H7v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-1H3V6c0-3.5 3.58-4 9-4s9 .5 9 4v14h-1v1a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1zM5 14h14v-4H5v4zm0 2v2h4v-2H5zm10 0v2h4v-2h-4zM5 8h14V6H5v2z"/>
      </svg>
    </div>
  `,
  className: '',
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  popupAnchor: [0, -25],
});

// Auto-pan map when bus moves
function MapFollower({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.panTo([lat, lng], { animate: true, duration: 1 });
  }, [lat, lng]);
  return null;
}

interface LiveTrackingProps {
  partnerId: string;
  companyName: string;
  onBack: () => void;
}

const API = 'https://blissful-exploration-production.up.railway.app';

export function LiveTracking({ partnerId, companyName, onBack }: LiveTrackingProps) {
  const [journey, setJourney] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [locationHistory, setLocationHistory] = useState<[number, number][]>([]);
  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    fetchJourney();
    // Poll every 5 seconds
    pollIntervalRef.current = setInterval(fetchJourney, 5000);
    return () => clearInterval(pollIntervalRef.current);
  }, [partnerId]);

  const fetchJourney = async () => {
    try {
      const res = await fetch(`${API}/api/partners/journey/${partnerId}`);
      const data = await res.json();

      if (data.isActive && data.currentLat && data.currentLng) {
        setJourney(data);
        setLastUpdated(new Date());
        setLocationHistory(prev => {
          const newPoint: [number, number] = [data.currentLat, data.currentLng];
          // Avoid duplicate consecutive points
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            if (last[0] === newPoint[0] && last[1] === newPoint[1]) return prev;
          }
          return [...prev.slice(-50), newPoint]; // keep last 50 points for trail
        });
      } else {
        setJourney(data);
      }
    } catch {
      console.error('Failed to fetch journey');
    } finally {
      setIsLoading(false);
    }
  };

  const getElapsed = () => {
    if (!journey?.startTime) return '—';
    const ms = Date.now() - new Date(journey.startTime).getTime();
    const mins = Math.floor(ms / 60000);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-300">Loading live tracking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">

      {/* Top bar */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="text-center">
          <p className="text-white font-semibold text-sm">{companyName}</p>
          {journey?.isActive && (
            <p className="text-xs text-slate-400">{journey.routeFrom} → {journey.routeTo}</p>
          )}
        </div>
        <button onClick={fetchJourney} className="text-slate-400 hover:text-white transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {!journey?.isActive ? (
        // No active journey
        <div className="flex-1 flex items-center justify-center p-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-sm"
          >
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bus className="w-10 h-10 text-slate-500" />
            </div>
            <h3 className="text-white font-bold text-xl mb-2">No Active Journey</h3>
            <p className="text-slate-400 text-sm mb-6">
              {companyName} has not started a journey yet. The map will appear automatically when the driver starts the trip.
            </p>
            <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
              <div className="w-2 h-2 bg-slate-600 rounded-full animate-pulse" />
              Checking every 5 seconds...
            </div>
          </motion.div>
        </div>
      ) : (
        <>
          {/* Map */}
          <div className="flex-1 relative" style={{ minHeight: '60vh' }}>
            <MapContainer
              center={[journey.currentLat, journey.currentLng]}
              zoom={14}
              style={{ width: '100%', height: '100%', minHeight: '60vh' }}
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Bus trail */}
              {locationHistory.length > 1 && (
                <Polyline
                  positions={locationHistory}
                  color="#3b82f6"
                  weight={4}
                  opacity={0.6}
                  dashArray="8, 4"
                />
              )}

              {/* Bus marker */}
              <Marker
                position={[journey.currentLat, journey.currentLng]}
                icon={busIcon}
              >
                <Popup>
                  <div className="text-center p-1">
                    <p className="font-bold text-sm">{companyName}</p>
                    <p className="text-xs text-slate-500">{journey.routeFrom} → {journey.routeTo}</p>
                    <p className="text-xs text-blue-600 mt-1">{journey.distanceKm} km travelled</p>
                  </div>
                </Popup>
              </Marker>

              <MapFollower lat={journey.currentLat} lng={journey.currentLng} />
            </MapContainer>

            {/* Live badge */}
            <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </div>

            {/* Last updated */}
            {lastUpdated && (
              <div className="absolute top-3 right-3 z-[1000] bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
                Updated {lastUpdated.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            )}
          </div>

          {/* Stats bar */}
          <div className="bg-slate-800 border-t border-slate-700 p-4">
            <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
              <div className="bg-slate-700 rounded-xl p-3 text-center">
                <Route className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <p className="text-white font-bold">{journey.distanceKm} km</p>
                <p className="text-slate-400 text-xs">Distance</p>
              </div>
              <div className="bg-slate-700 rounded-xl p-3 text-center">
                <Clock className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                <p className="text-white font-bold">{getElapsed()}</p>
                <p className="text-slate-400 text-xs">Elapsed</p>
              </div>
              <div className="bg-slate-700 rounded-xl p-3 text-center">
                <Navigation className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                <p className="text-white font-bold text-xs">
                  {journey.currentLat?.toFixed(3)}, {journey.currentLng?.toFixed(3)}
                </p>
                <p className="text-slate-400 text-xs">GPS</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mt-3 text-slate-500 text-xs">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Location updates every 5 seconds
            </div>
          </div>
        </>
      )}
    </div>
  );
}
