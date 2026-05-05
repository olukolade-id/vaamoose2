import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, Mail, Lock, User, Phone, GraduationCap, ArrowLeft, Bus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { schools } from '@/data/Data';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onPartnerSignup?: () => void;
  onViewTerms?: () => void;
  onViewPrivacy?: () => void;
}

export function LoginModal({ isOpen, onClose, onSuccess, onPartnerSignup, onViewTerms, onViewPrivacy }: LoginModalProps) {
  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [signupType, setSignupType] = useState<null | 'student'>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { login, signup } = useAuth();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupSchool, setSignupSchool] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [parentEmail, setParentEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const success = await login(loginEmail, loginPassword, rememberMe);
    if (success) {
      onSuccess();
    } else {
      setError('Invalid email or password. Please try again.');
    }
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy to create an account.');
      return;
    }
    setIsLoading(true);
    setError('');
    const result = await signup(signupName, signupEmail, signupPassword, signupPhone, signupSchool, parentEmail);
    if (result === true) {
      onSuccess();
    } else if (result === 'exists') {
      setError('An account with this email already exists. Please sign in.');
    } else {
      setError('Failed to create account. Please try again.');
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await fetch('https://blissful-exploration-production.up.railway.app/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      setForgotSent(true);
    } catch {
      setForgotSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col"
          style={{ maxHeight: '90vh' }}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white rounded-t-3xl shrink-0">
            <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="text-center">
              <img src="/vaamoose-logo.jpg" alt="Vaamoose" className="h-10 w-auto mx-auto mb-3 brightness-0 invert" />
              <h2 className="text-2xl font-bold">
                {showForgotPassword ? 'Reset Password' : 'Welcome to Vaamoose'}
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                {showForgotPassword ? 'Enter your email to reset your password' : 'Your safe ride to anywhere'}
              </p>
            </div>
          </div>

          {/* Content - scrollable */}
          <div className="overflow-y-auto flex-1 p-6">

            {/* Forgot Password */}
            {showForgotPassword ? (
              <div className="space-y-4">
                {forgotSent ? (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Check your email!</h3>
                    <p className="text-slate-500 text-sm">If an account exists for {forgotEmail}, we've sent a reset link.</p>
                    <Button onClick={() => { setShowForgotPassword(false); setForgotSent(false); setForgotEmail(''); }} className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white">
                      Back to Sign In
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <button type="button" onClick={() => setShowForgotPassword(false)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
                      <ArrowLeft className="w-4 h-4" /> Back to Sign In
                    </button>
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input type="email" placeholder="your@email.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="pl-10" required />
                      </div>
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6">
                      {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setError(''); setSignupType(null); }}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Create Account</TabsTrigger>
                </TabsList>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
                )}

                {/* Login Tab */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input id="login-email" type="email" placeholder="student@university.edu.ng" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="pl-10" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input id="login-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="pl-10 pr-10" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="rounded border-slate-300 text-blue-600" />
                        <span className="text-slate-600">Remember me</span>
                      </label>
                      <button type="button" onClick={() => setShowForgotPassword(true)} className="text-blue-600 hover:underline">
                        Forgot password?
                      </button>
                    </div>
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6" disabled={isLoading}>
                      {isLoading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </form>
                </TabsContent>

                {/* Signup Tab */}
                <TabsContent value="signup">

                  {/* STEP 1: Choose account type */}
                  {!signupType ? (
                    <div className="space-y-4">
                      <p className="text-center text-slate-600 text-sm mb-6">Who are you signing up as?</p>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSignupType('student')}
                        className="w-full p-5 border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 rounded-2xl flex items-center gap-4 transition-all text-left group"
                      >
                        <div className="w-14 h-14 bg-blue-100 group-hover:bg-blue-200 rounded-2xl flex items-center justify-center shrink-0 transition-colors">
                          <GraduationCap className="w-7 h-7 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-base">I'm a Student</p>
                          <p className="text-slate-500 text-sm">Book safe rides from your university</p>
                        </div>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { onClose(); onPartnerSignup?.(); }}
                        className="w-full p-5 border-2 border-slate-200 hover:border-amber-500 hover:bg-amber-50 rounded-2xl flex items-center gap-4 transition-all text-left group"
                      >
                        <div className="w-14 h-14 bg-amber-100 group-hover:bg-amber-200 rounded-2xl flex items-center justify-center shrink-0 transition-colors">
                          <Bus className="w-7 h-7 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-base">I'm a Transport Company</p>
                          <p className="text-slate-500 text-sm">Register your company and list your rides</p>
                        </div>
                      </motion.button>

                      <p className="text-center text-xs text-slate-400 pt-2">
                        Already have an account?{' '}
                        <button onClick={() => setActiveTab('login')} className="text-blue-600 hover:underline">Sign in</button>
                      </p>
                    </div>

                  ) : (
                    /* STEP 2: Student signup form */
                    <form onSubmit={handleSignup} className="space-y-4">
                      <button type="button" onClick={() => setSignupType(null)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2">
                        <ArrowLeft className="w-4 h-4" /> Back
                      </button>

                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input id="signup-name" type="text" placeholder="John Doe" value={signupName} onChange={(e) => setSignupName(e.target.value)} className="pl-10" required />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input id="signup-email" type="email" placeholder="student@university.edu.ng" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className="pl-10" required />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-phone">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input id="signup-phone" type="tel" placeholder="+234 801 234 5678" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} className="pl-10" required />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-school">University</Label>
                        <div className="relative">
                          <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <select id="signup-school" value={signupSchool} onChange={(e) => setSignupSchool(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" required>
                            <option value="">Select your university</option>
                            {schools.map((school) => (
                              <option key={school.id} value={school.id}>{school.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="parent-email">Parent/Guardian Email (Optional)</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input id="parent-email" type="email" placeholder="parent@email.com" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} className="pl-10" />
                        </div>
                        <p className="text-xs text-slate-500">We'll share your trip updates with them</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input id="signup-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className="pl-10 pr-10" required />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* T&C Checkbox */}
                      <div className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all ${agreedToTerms ? 'border-blue-200 bg-blue-50' : 'border-slate-200'}`}>
                        <input
                          type="checkbox"
                          id="agree-terms"
                          checked={agreedToTerms}
                          onChange={(e) => { setAgreedToTerms(e.target.checked); setError(''); }}
                          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                        />
                        <label htmlFor="agree-terms" className="text-sm text-slate-600 cursor-pointer leading-relaxed">
                          I have read and agree to the{' '}
                          <button
                            type="button"
                            onClick={() => { onClose(); onViewTerms?.(); }}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            Terms of Service
                          </button>
                          {' '}and{' '}
                          <button
                            type="button"
                            onClick={() => { onClose(); onViewPrivacy?.(); }}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            Privacy Policy
                          </button>
                          . I understand that Vaamoose is a marketplace platform and not a transport provider.
                        </label>
                      </div>

                      <Button
                        type="submit"
                        className={`w-full py-6 text-white font-semibold transition-all ${agreedToTerms ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'}`}
                        disabled={isLoading || !agreedToTerms}
                      >
                        {isLoading ? 'Creating account...' : 'Create Account'}
                      </Button>

                      {!agreedToTerms && (
                        <p className="text-xs text-center text-slate-400">You must agree to the terms to create an account</p>
                      )}
                    </form>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}