import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Mail, Lock, User, Phone, MapPin, ArrowLeft, Eye, EyeOff, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

interface DeliveryAgentLoginProps {
  onSuccess: () => void;
  onBack: () => void;
}

const API = 'https://blissful-exploration-production.up.railway.app';

const NIGERIAN_BANKS = [
  { name: 'Access Bank', code: '044' },
  { name: 'First Bank', code: '011' },
  { name: 'GTBank', code: '058' },
  { name: 'Zenith Bank', code: '057' },
  { name: 'UBA', code: '033' },
  { name: 'Kuda Bank', code: '090267' },
  { name: 'Opay', code: '100004' },
  { name: 'Palmpay', code: '100033' },
  { name: 'Moniepoint', code: '50515' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Union Bank', code: '032' },
  { name: 'FCMB', code: '214' },
  { name: 'Stanbic IBTC', code: '221' },
];

export function DeliveryAgentLogin({ onSuccess, onBack }: DeliveryAgentLoginProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [coverageAreas, setCoverageAreas] = useState<string[]>(['']);
  const [pricePerDelivery, setPricePerDelivery] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/api/delivery-agents/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('agentToken', data.token);
        localStorage.setItem('agent', JSON.stringify(data.agent));
        if (!data.agent.isApproved) {
          toast.info('Your account is pending approval. You\'ll be notified once approved.');
        }
        onSuccess();
      } else {
        toast.error(data.error || 'Login failed');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !phone || !pricePerDelivery) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (coverageAreas.filter(a => a.trim()).length === 0) {
      toast.error('Please add at least one coverage area');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/api/delivery-agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName, email, password, phone,
          coverageAreas: coverageAreas.filter(a => a.trim()),
          pricePerDelivery: Number(pricePerDelivery),
          bankName, bankCode, bankAccountNumber, accountName,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('agentToken', data.token);
        localStorage.setItem('agent', JSON.stringify(data.agent));
        toast.success('Registration successful! Awaiting approval.');
        onSuccess();
      } else {
        toast.error(data.error || 'Registration failed');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const addCoverageArea = () => setCoverageAreas(prev => [...prev, '']);
  const removeCoverageArea = (i: number) => setCoverageAreas(prev => prev.filter((_, j) => j !== i));
  const updateCoverageArea = (i: number, val: string) => setCoverageAreas(prev => prev.map((a, j) => j === i ? val : a));

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Delivery Agent Portal</h1>
          <p className="text-slate-500 text-sm mt-1">Earn money delivering packages across Nigeria</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-white border border-slate-200 rounded-xl p-1 mb-6">
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all capitalize ${mode === m ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
            >
              {m === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={mode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                      placeholder="your@email.com" required
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type={showPassword ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                      placeholder="••••••••" required
                      className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                      {showPassword ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
                >
                  {isLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Log In'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 max-h-[70vh] overflow-y-auto">

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" required
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="08012345678" required
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" required
                      className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                      {showPassword ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                    </button>
                  </div>
                </div>

                {/* Coverage areas */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Coverage Areas *</label>
                  <p className="text-xs text-slate-400 mb-2">Where can you pick up and deliver?</p>
                  {coverageAreas.map((area, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <div className="relative flex-1">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" value={area} onChange={e => updateCoverageArea(i, e.target.value)}
                          placeholder="e.g. Lagos Island, Redeemer's University"
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      {coverageAreas.length > 1 && (
                        <button type="button" onClick={() => removeCoverageArea(i)} className="p-2.5 text-red-400 hover:bg-red-50 rounded-xl">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addCoverageArea} className="flex items-center gap-1 text-sm text-blue-600 font-medium mt-1">
                    <Plus className="w-4 h-4" /> Add area
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Price per Delivery (₦) *</label>
                  <input type="number" value={pricePerDelivery} onChange={e => setPricePerDelivery(e.target.value)}
                    placeholder="e.g. 500" required
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                {/* Bank details */}
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm font-semibold text-slate-900 mb-3">Bank Details (for payment)</p>
                  <div className="space-y-3">
                    <select value={bankCode} onChange={e => { setBankCode(e.target.value); setBankName(NIGERIAN_BANKS.find(b => b.code === e.target.value)?.name || ''); }}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">Select Bank</option>
                      {NIGERIAN_BANKS.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                    </select>
                    <input type="text" value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="Account Number (10 digits)"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <input type="text" value={accountName} onChange={e => setAccountName(e.target.value.toUpperCase())}
                      placeholder="Account Name"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                <button type="submit" disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 sticky bottom-0"
                >
                  {isLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Register as Delivery Agent'}
                </button>
              </form>
            )}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}