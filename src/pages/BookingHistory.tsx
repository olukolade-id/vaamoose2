import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bus, MapPin, Calendar, CreditCard, ArrowLeft, Package, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface BookingHistoryProps {
  onBack: () => void;
  onViewReceipt?: (reference: string) => void;
}

export function BookingHistory({ onBack, onViewReceipt: _onViewReceipt }: BookingHistoryProps) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewedBookings, setReviewedBookings] = useState<string[]>([]);

  useEffect(() => {
    fetchBookings();
    const saved = localStorage.getItem('reviewedBookings');
    if (saved) setReviewedBookings(JSON.parse(saved));
  }, []);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://blissful-exploration-production.up.railway.app/api/bookings/my-bookings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (!comment.trim()) {
      toast.error('Please write a comment');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://blissful-exploration-production.up.railway.app/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          partnerId: selectedBooking.companyId,
          bookingId: selectedBooking._id,
          rating,
          comment,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Review submitted! Thank you.');
        const updated = [...reviewedBookings, selectedBooking._id];
        setReviewedBookings(updated);
        localStorage.setItem('reviewedBookings', JSON.stringify(updated));
        setShowReviewModal(false);
        setRating(0);
        setComment('');
        setSelectedBooking(null);
      } else {
        toast.error(data.error || 'Failed to submit review');
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-100 text-emerald-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-10">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Bookings</h1>
            <p className="text-slate-500 text-sm">Your travel history</p>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-20 text-slate-500">
            Loading your bookings...
          </div>
        )}

        {/* Empty State */}
        {!isLoading && bookings.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bus className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No bookings yet</h3>
              <p className="text-slate-500 mb-6">You haven't made any bookings yet.</p>
              <Button onClick={onBack} className="bg-blue-600 hover:bg-blue-700 text-white">
                Book a Ride
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Bookings List */}
        <div className="space-y-4">
          {bookings.map((booking, index) => (
            <motion.div
              key={booking._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Bus className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{booking.companyName}</h3>
                        <p className="text-sm text-slate-500">{booking.vehicleName}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.paymentStatus)}`}>
                      {booking.paymentStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-400">From</p>
                        <p className="text-sm font-medium text-slate-700">{booking.schoolName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-400" />
                      <div>
                        <p className="text-xs text-slate-400">To</p>
                        <p className="text-sm font-medium text-slate-700">{booking.route}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-400">Date</p>
                        <p className="text-sm font-medium text-slate-700">
                          {new Date(booking.departureDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-400">Amount</p>
                        <p className="text-sm font-bold text-blue-600">
                          ₦{booking.price?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Seats */}
                  {booking.seats?.length > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="w-4 h-4 text-slate-400" />
                      <p className="text-sm text-slate-600">
                        Seats: {booking.seats.map((s: any) => `Row ${s.row} Seat ${s.column}`).join(', ')}
                      </p>
                    </div>
                  )}

                  {/* Luggage Photos */}
                  {booking.luggagePhotos?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-slate-400 mb-2">Luggage Photos:</p>
                      <div className="flex gap-2">
                        {booking.luggagePhotos.map((photo: string, i: number) => (
                          <img
                            key={i}
                            src={photo}
                            alt={`Luggage ${i + 1}`}
                            className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-slate-400">
                      Booked on {new Date(booking.createdAt).toLocaleDateString()}
                    </p>

                    {/* Review Button */}
                    {booking.paymentStatus === 'paid' && (
                      reviewedBookings.includes(booking._id) ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <Star className="w-3 h-3 fill-emerald-500" />
                          Reviewed
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowReviewModal(true);
                          }}
                          className="text-amber-600 border-amber-200 hover:bg-amber-50 flex items-center gap-1"
                        >
                          <Star className="w-4 h-4" />
                          Leave a Review
                        </Button>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {showReviewModal && selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Leave a Review</h3>
                  <p className="text-sm text-slate-500">{selectedBooking.companyName}</p>
                </div>
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setRating(0);
                    setComment('');
                  }}
                  className="p-2 rounded-full hover:bg-slate-100"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Star Rating */}
              <div className="mb-6">
                <p className="text-sm font-medium text-slate-700 mb-3">
                  How was your experience?
                </p>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-10 h-10 transition-colors ${
                          star <= (hoveredRating || rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-200 fill-slate-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-amber-600 mt-2 font-medium">
                    {rating === 1 && 'Poor'}
                    {rating === 2 && 'Fair'}
                    {rating === 3 && 'Good'}
                    {rating === 4 && 'Very Good'}
                    {rating === 5 && 'Excellent!'}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div className="mb-6">
                <p className="text-sm font-medium text-slate-700 mb-2">Tell us more</p>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience with other students..."
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Trip Summary */}
              <div className="bg-slate-50 rounded-xl p-3 mb-6 text-sm text-slate-600">
                <p>{selectedBooking.schoolName} → {selectedBooking.route}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(selectedBooking.departureDate).toLocaleDateString()}
                </p>
              </div>

              <Button
                onClick={handleReviewSubmit}
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}