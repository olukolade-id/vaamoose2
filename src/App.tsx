import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { WelcomePage } from '@/pages/WelcomePage';
import { LandingPage } from '@/components/landing/LandingPage';
import { BookingFlow } from '@/components/booking/BookingFlow';
import { TrackingDashboard } from '@/components/tracking/TrackingDashboard';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { LoginModal } from '@/components/auth/LoginModal';
import { PartnerLogin } from '@/pages/PartnerLogin';
import { PartnerDashboard } from '@/pages/PartnerDashboard';
import { PaymentVerify } from '@/pages/PaymentVerify';
import { BookingHistory } from '@/pages/BookingHistory';
import { ProfilePage } from '@/pages/ProfilePage';
import { SearchPage } from '@/pages/SearchPage';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { PaymentReceipt } from '@/pages/PaymentReceipt';
import { VerifyReceipt } from '@/pages/VerifyReceipt';
import { StudentDashboard } from '@/pages/StudentDashboard';
import { LiveTracking } from '@/pages/LiveTracking';
import { SendPackage } from '@/pages/SendPackage';
import { DeliveryAgentLogin } from '@/pages/DeliveryAgentLogin';
import { DeliveryAgentDashboard } from '@/pages/DeliveryAgentDashboard';
import { TermsPage } from '@/pages/TermsPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { VaamooseAI } from '@/components/VaamooseAI';
import { GameRoom } from '@/components/GameRoom';
import { Toaster } from '@/components/ui/sonner';
import './App.css';

type AppView =
  | 'welcome'
  | 'landing'
  | 'student-dashboard'
  | 'booking'
  | 'tracking'
  | 'live-tracking'
  | 'profile'
  | 'partner-login'
  | 'partner-dashboard'
  | 'payment-verify'
  | 'booking-history'
  | 'search'
  | 'admin'
  | 'receipt'
  | 'verify-receipt'
  | 'checkout'
  | 'send-package'
  | 'delivery-agent-login'
  | 'delivery-agent-dashboard'
  | 'terms'
  | 'privacy'
  | 'games';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('welcome');
  const [showLogin, setShowLogin] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [, setSelectedPartner] = useState<string | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [selectedPartnerName, setSelectedPartnerName] = useState('');
  const [gameBookingRef, setGameBookingRef] = useState('');
  const [gamePlayerName, setGamePlayerName] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get('admin') === 'true') {
      setCurrentView('admin');
      window.history.replaceState({}, document.title, '/');
      return;
    }

    // Check for checkout page (Payaza payment)
    const checkoutRef = urlParams.get('reference');
    const provider = urlParams.get('provider');
    if (checkoutRef && provider === 'payaza') {
      setCurrentView('checkout');
      return;
    }

    const ref = urlParams.get('reference') || urlParams.get('trxref');
    if (ref) {
      localStorage.setItem('paymentReference', ref);
      setCurrentView('receipt');
      return;
    }

    const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    const savedToken = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (savedUser && savedToken) {
      setCurrentView('student-dashboard');
    }
  }, []);

  const handleSchoolSelect = (schoolId: string) => {
    setSelectedSchool(schoolId);
    if (!isAuthenticated) setShowLogin(true);
    else setCurrentView('booking');
  };

  const handleLoginSuccess = () => {
    setShowLogin(false);
    if (selectedSchool) setCurrentView('booking');
    else setCurrentView('student-dashboard');
  };

  const handleBookFromSearch = (partnerId: string) => {
    setSelectedPartner(partnerId);
    if (!isAuthenticated) setShowLogin(true);
    else setCurrentView('booking');
  };

  const handleTrackJourney = (partnerId: string, partnerName: string) => {
    setSelectedPartnerId(partnerId);
    setSelectedPartnerName(partnerName);
    setCurrentView('live-tracking');
  };

  const isFullScreenPage = [
    'welcome', 'partner-login', 'partner-dashboard', 'admin',
    'student-dashboard', 'live-tracking', 'delivery-agent-login', 'delivery-agent-dashboard', 'checkout',
  ].includes(currentView);

  const renderView = () => {
    switch (currentView) {
      case 'welcome':
        return (
          <WelcomePage
            onGetStarted={() => {
              if (isAuthenticated) setCurrentView('student-dashboard');
              else setShowLogin(true);
            }}
            onSearch={() => setCurrentView('search')}
            onLogin={() => setShowLogin(true)}
          />
        );

      case 'student-dashboard':
        return (
          <StudentDashboard
            onBook={() => setCurrentView('booking')}
            onViewReceipt={(reference) => {
              localStorage.setItem('paymentReference', reference);
              setCurrentView('receipt');
            }}
            onTrack={handleTrackJourney}
            onSendPackage={() => setCurrentView('send-package')}
            onBack={() => setCurrentView('welcome')}
            onPlayGames={(bookingRef, playerName) => {
              setGameBookingRef(bookingRef);
              setGamePlayerName(playerName);
              setCurrentView('games');
            }}
          />
        );

      case 'live-tracking':
        return (
          <LiveTracking
            partnerId={selectedPartnerId}
            companyName={selectedPartnerName}
            onBack={() => setCurrentView('student-dashboard')}
          />
        );

      case 'send-package':
        return (
          <SendPackage
            onBack={() => setCurrentView('student-dashboard')}
          />
        );

      case 'delivery-agent-login':
        return (
          <DeliveryAgentLogin
            onSuccess={() => setCurrentView('delivery-agent-dashboard')}
            onBack={() => setCurrentView('welcome')}
          />
        );

      case 'delivery-agent-dashboard':
        return (
          <DeliveryAgentDashboard
            onBack={() => setCurrentView('welcome')}
          />
        );

      case 'landing':
        return (
          <LandingPage
            onSchoolSelect={handleSchoolSelect}
            onBookRide={() => {
              if (!isAuthenticated) setShowLogin(true);
              else setCurrentView('booking');
            }}
          />
        );

      case 'receipt':
        return (
          <PaymentReceipt
            reference={
              new URLSearchParams(window.location.search).get('reference') ||
              localStorage.getItem('paymentReference') ||
              ''
            }
            onBack={() => setCurrentView(isAuthenticated ? 'student-dashboard' : 'welcome')}
          />
        );

      case 'verify-receipt':
        return <VerifyReceipt onBack={() => setCurrentView(isAuthenticated ? 'student-dashboard' : 'welcome')} />;

      case 'booking':
        return (
          <BookingFlow
            schoolId={selectedSchool}
            onBack={() => setCurrentView(isAuthenticated ? 'student-dashboard' : 'landing')}
            onComplete={() => setCurrentView('student-dashboard')}
          />
        );

      case 'tracking':
        return (
          <TrackingDashboard
            onBack={() => setCurrentView('student-dashboard')}
            onPlayGames={(bookingRef, playerName) => {
              setGameBookingRef(bookingRef);
              setGamePlayerName(playerName);
              setCurrentView('games');
            }}
          />
        );

      case 'partner-login':
        return <PartnerLogin onSuccess={() => setCurrentView('partner-dashboard')} />;

      case 'partner-dashboard':
        return <PartnerDashboard onBack={() => setCurrentView('welcome')} />;

      case 'payment-verify':
        return (
          <PaymentVerify
            onSuccess={() => setCurrentView('student-dashboard')}
            onBack={() => setCurrentView('booking')}
          />
        );

      case 'booking-history':
        return (
          <BookingHistory
            onBack={() => setCurrentView('student-dashboard')}
            onViewReceipt={(reference) => {
              localStorage.setItem('paymentReference', reference);
              setCurrentView('receipt');
            }}
          />
        );

      case 'profile':
        return <ProfilePage onBack={() => setCurrentView('student-dashboard')} />;

      case 'search':
        return (
          <SearchPage
            onBack={() => setCurrentView(isAuthenticated ? 'student-dashboard' : 'welcome')}
            onBook={handleBookFromSearch}
          />
        );

      case 'admin':
        return <AdminDashboard onBack={() => setCurrentView('welcome')} />;

      case 'terms':
        return <TermsPage onBack={() => setCurrentView('welcome')} />;

      case 'privacy':
        return <PrivacyPage onBack={() => setCurrentView('welcome')} />;

      case 'checkout':
        return <CheckoutPage />;

      case 'games':
        return (
          <GameRoom
            bookingReference={gameBookingRef}
            playerName={gamePlayerName}
            onBack={() => setCurrentView('student-dashboard')}
          />
        );

      default:
        return (
          <WelcomePage
            onGetStarted={() => setShowLogin(true)}
            onSearch={() => setCurrentView('search')}
            onLogin={() => setShowLogin(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {!isFullScreenPage && (
        <Navbar
          onNavigate={(view) => setCurrentView(view as AppView)}
          onLoginClick={() => setShowLogin(true)}
          onPartnerClick={() => setCurrentView('partner-login')}
          onSearchClick={() => setCurrentView('search')}
          onVerifyClick={() => setCurrentView('verify-receipt')}
          onDeliveryAgentClick={() => setCurrentView('delivery-agent-login')}
        />
      )}

      <main>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {!isFullScreenPage && (
        <Footer
          onNavigate={(view) => setCurrentView(view as AppView)}
          onPartnerClick={() => setCurrentView('partner-login')}
        />
      )}

      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={handleLoginSuccess}
        onPartnerSignup={() => setCurrentView('partner-login')}
        onViewTerms={() => setCurrentView('terms')}
        onViewPrivacy={() => setCurrentView('privacy')}
      />

          <VaamooseAI
        onBook={() => setCurrentView('booking')}
        onSendPackage={() => setCurrentView('send-package')}
      />

      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#0F172A', color: '#fff', border: 'none' },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;