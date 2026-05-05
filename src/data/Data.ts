import type { School, TransportCompany, Route, Vehicle, Seat, FAQ, Review } from '@/types';

export const schools: School[] = [
  {
    id: '1',
    name: 'Covenant University',
    location: 'Ota, Ogun State',
    state: 'Ogun',
    logo: '/schools/covenant.png',
    transportCompanies: ['1', '2', '3'],
    popularRoutes: ['Lagos', 'Abuja', 'Ibadan'],
  },
  {
    id: '2',
    name: 'Babcock University',
    location: 'Ilishan-Remo, Ogun State',
    state: 'Ogun',
    logo: '/schools/babcock.png',
    transportCompanies: ['1', '4'],
    popularRoutes: ['Lagos', 'Ibadan'],
  },
  {
    id: '3',
    name: 'Redeemer\'s University',
    location: 'Ede, Osun State',
    state: 'Osun',
    logo: '/schools/redeemers.png',
    transportCompanies: ['2', '5'],
    popularRoutes: ['Lagos', 'Ibadan', 'Abuja'],
  },
  {
    id: '4',
    name: 'Afe Babalola University',
    location: 'Ado-Ekiti, Ekiti State',
    state: 'Ekiti',
    logo: '/schools/abuad.png',
    transportCompanies: ['3', '4'],
    popularRoutes: ['Lagos', 'Ibadan'],
  },
  {
    id: '5',
    name: 'Baze University',
    location: 'Abuja, FCT',
    state: 'FCT',
    logo: '/schools/baze.png',
    transportCompanies: ['1', '2', '3', '5'],
    popularRoutes: ['Lagos', 'Port Harcourt', 'Kano'],
  },
  {
    id: '6',
    name: 'Nile University',
    location: 'Abuja, FCT',
    state: 'FCT',
    logo: '/schools/nile.png',
    transportCompanies: ['2', '4'],
    popularRoutes: ['Lagos', 'Kaduna', 'Jos'],
  },
];

export const transportCompanies: TransportCompany[] = [
  {
    id: '1',
    name: 'Elite Campus Transport',
    logo: '/companies/elite.png',
    rating: 4.8,
    reviewCount: 1247,
    description: 'Premium transportation service with modern vehicles and professional drivers.',
    amenities: ['WiFi', 'AC', 'USB Charging', 'Water', 'Snacks'],
    contactPhone: '+234 801 234 5678',
    contactEmail: 'bookings@elitecampus.ng',
    availableRoutes: [],
    vehicles: [],
  },
  {
    id: '2',
    name: 'Swift Student Rides',
    logo: '/companies/swift.png',
    rating: 4.5,
    reviewCount: 892,
    description: 'Fast, reliable, and affordable rides for students across Nigeria.',
    amenities: ['AC', 'USB Charging', 'Music System'],
    contactPhone: '+234 802 345 6789',
    contactEmail: 'rides@swiftstudent.ng',
    availableRoutes: [],
    vehicles: [],
  },
  {
    id: '3',
    name: 'Comfort Travel NG',
    logo: '/companies/comfort.png',
    rating: 4.6,
    reviewCount: 654,
    description: 'Comfort-focused travel experience with spacious seating and extra luggage allowance.',
    amenities: ['WiFi', 'AC', 'USB Charging', 'Extra Luggage Space', 'Pillows'],
    contactPhone: '+234 803 456 7890',
    contactEmail: 'info@comforttravel.ng',
    availableRoutes: [],
    vehicles: [],
  },
  {
    id: '4',
    name: 'Campus Express',
    logo: '/companies/express.png',
    rating: 4.3,
    reviewCount: 523,
    description: 'Budget-friendly option without compromising on safety and reliability.',
    amenities: ['AC', 'Music System'],
    contactPhone: '+234 804 567 8901',
    contactEmail: 'book@campusexpress.ng',
    availableRoutes: [],
    vehicles: [],
  },
  {
    id: '5',
    name: 'Royal Campus Movers',
    logo: '/companies/royal.png',
    rating: 4.9,
    reviewCount: 432,
    description: 'Luxury transportation for students who want the best travel experience.',
    amenities: ['WiFi', 'AC', 'USB Charging', 'Entertainment System', 'Refreshments', 'Blankets'],
    contactPhone: '+234 805 678 9012',
    contactEmail: 'royal@royalmovers.ng',
    availableRoutes: [],
    vehicles: [],
  },
];

export const routes: Route[] = [
  { id: '1', from: 'Covenant University', to: 'Lagos (Ikeja)', distance: 45, estimatedDuration: 90, basePrice: 3500, popular: true },
  { id: '2', from: 'Covenant University', to: 'Lagos (Lekki)', distance: 55, estimatedDuration: 120, basePrice: 4500, popular: true },
  { id: '3', from: 'Covenant University', to: 'Abuja', distance: 580, estimatedDuration: 480, basePrice: 15000, popular: true },
  { id: '4', from: 'Covenant University', to: 'Ibadan', distance: 85, estimatedDuration: 120, basePrice: 4000, popular: false },
  { id: '5', from: 'Babcock University', to: 'Lagos (Ikeja)', distance: 65, estimatedDuration: 100, basePrice: 4000, popular: true },
  { id: '6', from: 'Babcock University', to: 'Ibadan', distance: 45, estimatedDuration: 60, basePrice: 2500, popular: false },
  { id: '7', from: 'Redeemer\'s University', to: 'Lagos (Ikeja)', distance: 200, estimatedDuration: 180, basePrice: 6000, popular: true },
  { id: '8', from: 'Redeemer\'s University', to: 'Abuja', distance: 450, estimatedDuration: 360, basePrice: 12000, popular: true },
  { id: '9', from: 'Baze University', to: 'Lagos', distance: 750, estimatedDuration: 600, basePrice: 18000, popular: true },
  { id: '10', from: 'Baze University', to: 'Port Harcourt', distance: 650, estimatedDuration: 480, basePrice: 15000, popular: false },
  { id: '11', from: 'Baze University', to: 'Kano', distance: 420, estimatedDuration: 300, basePrice: 10000, popular: false },
];

export const vehicles: Vehicle[] = [
  {
    id: '1',
    type: 'sedan',
    name: 'Comfort Sedan',
    capacity: 3,
    luggageCapacity: 2,
    image: '/vehicles/sedan.png',
    features: ['Air Conditioning', 'USB Charging', 'Comfortable Seats'],
    priceMultiplier: 1.0,
  },
  {
    id: '2',
    type: 'minivan',
    name: 'Family Minivan',
    capacity: 7,
    luggageCapacity: 5,
    image: '/vehicles/minivan.png',
    features: ['Air Conditioning', 'USB Charging', 'Spacious Interior', 'Music System'],
    priceMultiplier: 1.3,
  },
  {
    id: '3',
    type: 'luxury-bus',
    name: 'Luxury Coach',
    capacity: 14,
    luggageCapacity: 20,
    image: '/vehicles/bus.png',
    features: ['Air Conditioning', 'WiFi', 'USB Charging', 'Reclining Seats', 'Entertainment System', 'Onboard Restroom'],
    priceMultiplier: 1.8,
  },
];

export const generateSeats = (vehicleType: string): Seat[] => {
  const seats: Seat[] = [];
  let rows = 0;
  let cols = 4;
  
  if (vehicleType === 'sedan') {
    rows = 2;
    cols = 2;
  } else if (vehicleType === 'minivan') {
    rows = 3;
    cols = 3;
  } else {
    rows = 5;
    cols = 4;
  }
  
  for (let row = 1; row <= rows; row++) {
    for (let col = 1; col <= cols; col++) {
      const isWindow = col === 1 || col === cols;
      const isFront = row === 1;
      
      let type: Seat['type'] = 'standard';
      let price = 0;
      
      if (isFront) {
        type = 'front';
        price = 500;
      } else if (isWindow) {
        type = 'window';
        price = 200;
      } else {
        type = 'aisle';
        price = 0;
      }
      
      seats.push({
        id: `${row}-${col}`,
        row,
        column: col,
        type,
        status: Math.random() > 0.7 ? 'occupied' : 'available',
        price,
      });
    }
  }
  
  return seats;
};

export const faqs: FAQ[] = [
  {
    id: '1',
    question: 'How do I book a ride on Vaamoose?',
    answer: 'Simply select your university, choose a transport company, pick your preferred vehicle type, select your seat, upload a photo of your luggage, and complete payment. You\'ll receive a confirmation with your tracking code.',
    category: 'booking',
  },
  {
    id: '2',
    question: 'Can I cancel my booking?',
    answer: 'Yes, you can cancel your booking up to 24 hours before departure for a full refund. Cancellations within 24 hours attract a 50% cancellation fee.',
    category: 'booking',
  },
  {
    id: '3',
    question: 'What if my luggage is overweight?',
    answer: 'Each passenger is allowed up to 20kg of luggage included in the fare. Additional weight is charged at ₦100 per kg. You can upload photos of your luggage during booking so the driver can prepare adequate space.',
    category: 'luggage',
  },
  {
    id: '4',
    question: 'How does parent tracking work?',
    answer: 'After booking, you can share your tracking link with your parent or guardian. They\'ll be able to see your journey progress in real-time and receive notifications when you depart and arrive.',
    category: 'tracking',
  },
  {
    id: '5',
    question: 'What payment methods are accepted?',
    answer: 'We accept card payments (Visa, Mastercard, Verve), bank transfers, and mobile money (OPay, PalmPay). All payments are secure and encrypted.',
    category: 'payment',
  },
  {
    id: '6',
    question: 'Are the drivers verified?',
    answer: 'Yes, all drivers on Vaamoose undergo thorough background checks, including verification of their driver\'s license, vehicle registration, and criminal record check.',
    category: 'safety',
  },
  {
    id: '7',
    question: 'What happens if my ride is delayed?',
    answer: 'You\'ll receive real-time updates about any delays via SMS and app notifications. If the delay exceeds 2 hours, you\'re eligible for a partial refund or rescheduling.',
    category: 'general',
  },
  {
    id: '8',
    question: 'Can I choose my seat?',
    answer: 'Absolutely! During booking, you can select your preferred seat. Window seats cost an additional ₦200, and front-row seats cost ₦500 extra.',
    category: 'booking',
  },
];

export const reviews: Review[] = [
  {
    id: '1',
    userId: '1',
    userName: 'Chioma Adeyemi',
    userAvatar: '/avatars/chioma.png',
    companyId: '1',
    bookingId: '1',
    rating: 5,
    comment: 'Amazing service! The driver was punctual and the vehicle was super comfortable. Will definitely use again!',
    createdAt: '2025-01-15',
  },
  {
    id: '2',
    userId: '2',
    userName: 'Emmanuel Okafor',
    userAvatar: '/avatars/emmanuel.png',
    companyId: '2',
    bookingId: '2',
    rating: 4,
    comment: 'Good experience overall. The WiFi was a bit slow but the ride was smooth and safe.',
    createdAt: '2025-01-12',
  },
  {
    id: '3',
    userId: '3',
    userName: 'Fatima Ibrahim',
    userAvatar: '/avatars/fatima.png',
    companyId: '3',
    bookingId: '3',
    rating: 5,
    comment: 'Love the parent tracking feature! My mom could follow my journey all the way. Very reassuring.',
    createdAt: '2025-01-10',
  },
  {
    id: '4',
    userId: '4',
    userName: 'David Nwosu',
    userAvatar: '/avatars/david.png',
    companyId: '5',
    bookingId: '4',
    rating: 5,
    comment: 'The luxury bus was worth every naira. Felt like first-class travel!',
    createdAt: '2025-01-08',
  },
];

export const destinations = [
  'Lagos (Ikeja)',
  'Lagos (Lekki)',
  'Lagos (Victoria Island)',
  'Abuja (Central)',
  'Abuja (Gwarinpa)',
  'Port Harcourt',
  'Ibadan',
  'Kano',
  'Kaduna',
  'Enugu',
  'Benin City',
  'Warri',
  'Abeokuta',
  'Osogbo',
  'Akure',
];
