import { useState, useEffect } from 'react';
export function usePartners() {
  const [partners, setPartners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const res = await fetch('https://blissful-exploration-production.up.railway.app/api/partners/public');
        const data = await res.json();
        setPartners(data.partners || []);
      } catch (error) {
        console.error('Failed to fetch partners:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPartners();
  }, []);

  // Convert partners to the same format as your old transportCompanies data
  const transportCompanies = partners.map((p) => ({
    id: p._id,
    name: p.companyName,
    logo: p.logo || '',
    rating: 4.5,
    reviewCount: 0,
    description: `Transport services by ${p.companyName}`,
    amenities: ['AC'],
    contactPhone: p.phone,
    contactEmail: p.email,
    availableRoutes: p.routes || [],
    vehicles: p.vehicles || [],
    departureDates: p.departureDates || [],
  }));

  return { transportCompanies, partners, isLoading };
}