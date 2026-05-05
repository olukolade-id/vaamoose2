import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Calendar, ArrowLeft, Bus, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface SearchPageProps {
  onBack: () => void;
  onBook: (partnerId: string) => void;
}

export function SearchPage({ onBack, onBook }: SearchPageProps) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    setIsLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      if (date) params.append('date', date);

      const res = await fetch(
        `https://blissful-exploration-production.up.railway.app/api/partners/departures?${params.toString()}`
      );
      const data = await res.json();
      setResults(data.departures || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-10">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="outline" onClick={onBack} className="flex items-center gap-2 shrink-0">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Search Rides</h1>
            <p className="text-slate-500 text-xs">Find available rides from partners</p>
          </div>
        </div>

        {/* Search Form */}
        <Card className="mb-6">
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 gap-3 mb-4">
              <div className="space-y-1.5">
                <Label className="text-sm">From</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="e.g. Covenant University"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">To</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                  <Input
                    placeholder="e.g. Lagos"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            <Button
              onClick={handleSearch}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5"
            >
              <Search className="w-4 h-4 mr-2" />
              {isLoading ? 'Searching...' : 'Search Available Rides'}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {hasSearched && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-900">
              {results.length > 0 ? `${results.length} ride(s) found` : 'No rides found'}
            </h2>

            {results.length === 0 && (
              <Card>
                <CardContent className="p-10 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bus className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">No rides available</h3>
                  <p className="text-slate-500 text-sm">Try different dates or destinations</p>
                </CardContent>
              </Card>
            )}

            {results.map((departure, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="space-y-3 flex-1">
                        {/* Company */}
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                            <Bus className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 text-sm">{departure.partnerName}</h3>
                            <p className="text-xs text-slate-500">{departure.partnerPhone}</p>
                          </div>
                        </div>

                        {/* Route */}
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900 text-sm">{departure.routeFrom}</p>
                          <span className="text-slate-400 text-sm">→</span>
                          <p className="font-medium text-slate-900 text-sm">{departure.routeTo}</p>
                        </div>

                        {/* Details */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(departure.date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {departure.time}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {departure.availableSeats} seats
                          </div>
                        </div>

                        <p className="text-xs text-slate-600">
                          Vehicle: <span className="font-medium">{departure.vehicleName}</span>
                        </p>
                      </div>

                      {/* Book Button */}
                      <Button
                        onClick={() => onBook(departure.partnerId)}
                        className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto shrink-0"
                      >
                        Book Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}