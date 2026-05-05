// Types for Vaamoose Student Transport Platform

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  phoneNumber?: string;
  role?: 'student' | 'parent' | 'driver' | 'admin';
  avatar?: string;
  schoolId?: string;
  university?: string;
  parentEmail?: string;
  createdAt?: string;
  profilePhoto?: string;
}

export interface School {
  id: string;
  name: string;
  location: string;
  state: string;
  logo?: string;
  transportCompanies: string[];
  popularRoutes: string[];
}

export interface TransportCompany {
  id: string;
  name: string;
  logo: string;
  rating: number;
  reviewCount: number;
  description: string;
  amenities: string[];
  contactPhone: string;
  contactEmail: string;
  availableRoutes: Route[];
  vehicles: Vehicle[];
}

export interface Route {
  id: string;
  from: string;
  to: string;
  distance: number;
  estimatedDuration: number;
  basePrice: number;
  popular: boolean;
}

export interface Vehicle {
  id: string;
  type: 'sedan' | 'minivan' | 'luxury-bus';
  name: string;
  capacity: number;
  luggageCapacity: number;
  image: string;
  features: string[];
  priceMultiplier: number;
}

export interface Seat {
  id: string;
  row: number;
  column: number;
  type: 'window' | 'aisle' | 'front' | 'standard';
  status: 'available' | 'selected' | 'occupied';
  price: number;
}

export interface Booking {
  id: string;
  userId: string;
  schoolId: string;
  companyId: string;
  routeId: string;
  vehicleId: string;
  seatIds: string[];
  departureDate: string;
  departureTime: string;
  luggage: {
    photos: string[];
    description: string;
    weight: number;
    oversized: boolean;
  };
  passengerCount: number;
  status: 'pending' | 'confirmed' | 'in-transit' | 'completed' | 'cancelled';
  totalPrice: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  trackingCode: string;
  createdAt: string;
  parentNotified: boolean;
}

export interface Tracking {
  bookingId: string;
  currentLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  route: {
    lat: number;
    lng: number;
  }[];
  eta: string;
  status: 'waiting' | 'picked-up' | 'in-transit' | 'arrived';
  driver: {
    name: string;
    phone: string;
    photo?: string;
    rating: number;
  };
  vehicle: {
    type: string;
    plateNumber: string;
    color: string;
  };
  lastUpdated: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'booking' | 'tracking' | 'promo' | 'system';
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  companyId: string;
  bookingId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface Amenity {
  id: string;
  name: string;
  icon: string;
}

// Booking Flow State
export interface BookingFlowState {
  step: number;
  school: School | null;
  company: TransportCompany | null;
  route: Route | null;
  vehicle: Vehicle | null;
  seats: Seat[];
  departureDate: string;
  departureTime: string;
  luggage: {
    photos: string[];
    description: string;
  };
  passengerInfo: {
    name: string;
    phone: string;
    email: string;
  };
}