import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, MapPin, User, ArrowLeft, ArrowRight, Check, Camera, Truck } from 'lucide-react';
import { toast } from 'sonner';

interface SendPackageProps {
  onBack: () => void;
}

const API = 'https://blissful-exploration-production.up.railway.app';

type Step = 'pickup' | 'receiver' | 'package' | 'agent' | 'confirm';

const WEIGHT_OPTIONS = ['Light (under 2kg)', 'Medium (2–10kg)', 'Heavy (10kg+)'];

export function SendPackage({ onBack }: SendPackageProps) {
  const [currentStep, setCurrentStep] = useState<Step>('pickup');
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemPhotos, setItemPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Form fields
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupDescription, setPickupDescription] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [estimatedWeight, setEstimatedWeight] = useState('Light (under 2kg)');

  const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
  const user = savedUser ? JSON.parse(savedUser) : {};

  const steps: { id: Step; label: string }[] = [
    { id: 'pickup',  label: 'Pickup'   },
    { id: 'receiver',label: 'Receiver' },
    { id: 'package', label: 'Package'  },
    { id: 'agent',   label: 'Agent'    },
    { id: 'confirm', label: 'Confirm'  },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${API}/api/delivery/agents`);
      const data = await res.json();
      setAgents(data.agents || []);
    } catch {
      console.error('Failed to fetch agents');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setIsUploadingPhoto(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('photo', file);
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await fetch(`${API}/api/upload/luggage`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const data = await res.json();
        if (data.url) urls.push(data.url);
      }
      setItemPhotos(prev => [...prev, ...urls]);
      toast.success(`${urls.length} photo(s) uploaded!`);
    } catch {
      toast.error('Upload failed');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 'pickup' && !pickupAddress.trim()) { toast.error('Please enter pickup address'); return; }
    if (currentStep === 'receiver' && (!receiverName.trim() || !receiverPhone.trim() || !receiverAddress.trim())) { toast.error('Please fill in all receiver details'); return; }
    if (currentStep === 'package' && !itemDescription.trim()) { toast.error('Please describe the item'); return; }
    if (currentStep === 'agent' && !selectedAgent) { toast.error('Please select a delivery agent'); return; }
    const next = currentStepIndex + 1;
    if (next < steps.length) setCurrentStep(steps[next].id);
  };

  const handleBack = () => {
    const prev = currentStepIndex - 1;
    if (prev >= 0) setCurrentStep(steps[prev].id);
    else onBack();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(`${API}/api/delivery/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          senderName: user.fullName,
          senderEmail: user.email,
          receiverName, receiverPhone, receiverAddress,
          pickupAddress, pickupDescription,
          itemDescription, itemPhotos, estimatedWeight,
          agentId: selectedAgent._id,
          price: selectedAgent.pricePerDelivery,
        }),
      });

      const data = await res.json();

      if (data.authorization_url) {
        localStorage.setItem('pendingDeliveryId', data.delivery._id);
        window.location.href = data.authorization_url;
      } else {
        toast.error(data.error || 'Failed to create delivery');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-10">
      <div className="max-w-2xl mx-auto px-4">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={handleBack} className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Send a Package</h1>
            <p className="text-slate-500 text-sm">Door-to-door delivery across Nigeria</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                index < currentStepIndex ? 'bg-blue-600 text-white'
                : index === currentStepIndex ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                : 'bg-slate-200 text-slate-500'
              }`}>
                {index < currentStepIndex ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span className={`ml-1.5 text-xs font-medium hidden sm:block ${index <= currentStepIndex ? 'text-slate-900' : 'text-slate-400'}`}>
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-6 sm:w-10 h-0.5 mx-1.5 sm:mx-3 ${index < currentStepIndex ? 'bg-blue-600' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

            {/* STEP 1 — Pickup */}
            {currentStep === 'pickup' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900">Where should we pick up?</h2>
                    <p className="text-xs text-slate-500">Where is the package currently?</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Pickup Address *</label>
                  <textarea
                    value={pickupAddress}
                    onChange={e => setPickupAddress(e.target.value)}
                    placeholder="e.g. Shop 14, Computer Village, Ikeja, Lagos"
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Extra directions (optional)</label>
                  <input
                    type="text"
                    value={pickupDescription}
                    onChange={e => setPickupDescription(e.target.value)}
                    placeholder="e.g. Ask for Mama Emeka, yellow shop"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
            )}

            {/* STEP 2 — Receiver */}
            {currentStep === 'receiver' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900">Who is receiving?</h2>
                    <p className="text-xs text-slate-500">The person getting the package</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Receiver's Name *</label>
                  <input type="text" value={receiverName} onChange={e => setReceiverName(e.target.value)}
                    placeholder="e.g. Emma Adeyemi"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Receiver's Phone *</label>
                  <input type="tel" value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)}
                    placeholder="e.g. 08012345678"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Delivery Address *</label>
                  <textarea
                    value={receiverAddress}
                    onChange={e => setReceiverAddress(e.target.value)}
                    placeholder="e.g. Block C Room 12, Female Hostel, Redeemer's University, Mowe"
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  />
                </div>
              </div>
            )}

            {/* STEP 3 — Package */}
            {currentStep === 'package' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Package className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900">What are you sending?</h2>
                    <p className="text-xs text-slate-500">Describe your package</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Item Description *</label>
                  <textarea
                    value={itemDescription}
                    onChange={e => setItemDescription(e.target.value)}
                    placeholder="e.g. 3 dresses and a pair of shoes in a black bag"
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Estimated Weight</label>
                  <div className="grid grid-cols-3 gap-2">
                    {WEIGHT_OPTIONS.map(w => (
                      <button key={w} onClick={() => setEstimatedWeight(w)}
                        className={`p-3 text-xs font-medium rounded-xl border-2 transition-all ${estimatedWeight === w ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Photos of item (optional but recommended)</label>
                  <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                    <Camera className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-500">{isUploadingPhoto ? 'Uploading...' : 'Tap to add photos'}</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} disabled={isUploadingPhoto} />
                  </label>
                  {itemPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {itemPhotos.map((url, i) => (
                        <div key={i} className="relative">
                          <img src={url} alt={`Item ${i+1}`} className="w-full h-24 object-cover rounded-xl" />
                          <button onClick={() => setItemPhotos(p => p.filter((_, j) => j !== i))}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4 — Select Agent */}
            {currentStep === 'agent' && (
              <div className="space-y-3">
                <h2 className="font-bold text-slate-900 text-lg">Choose a Delivery Agent</h2>
                <p className="text-sm text-slate-500">Select who will deliver your package</p>
                {agents.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                    <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No delivery agents available yet</p>
                    <p className="text-slate-400 text-sm mt-1">Check back soon</p>
                  </div>
                ) : (
                  agents.map(agent => (
                    <button key={agent._id} onClick={() => setSelectedAgent(agent)}
                      className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${selectedAgent?._id === agent._id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Truck className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{agent.fullName}</p>
                            <p className="text-xs text-slate-500">⭐ {agent.rating} · {agent.totalDeliveries} deliveries</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {agent.coverageAreas?.map((area: string) => (
                                <span key={area} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{area}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-blue-600">₦{agent.pricePerDelivery?.toLocaleString()}</p>
                          <p className="text-xs text-slate-400">per delivery</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* STEP 5 — Confirm */}
            {currentStep === 'confirm' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                <h2 className="font-bold text-slate-900 text-lg">Review Your Request</h2>

                <div className="space-y-3 text-sm">
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                    <p className="font-semibold text-slate-700 text-xs uppercase tracking-wide">Pickup</p>
                    <p className="text-slate-900">{pickupAddress}</p>
                    {pickupDescription && <p className="text-slate-500">{pickupDescription}</p>}
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                    <p className="font-semibold text-slate-700 text-xs uppercase tracking-wide">Receiver</p>
                    <p className="text-slate-900 font-semibold">{receiverName}</p>
                    <p className="text-slate-600">{receiverPhone}</p>
                    <p className="text-slate-600">{receiverAddress}</p>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                    <p className="font-semibold text-slate-700 text-xs uppercase tracking-wide">Package</p>
                    <p className="text-slate-900">{itemDescription}</p>
                    <p className="text-slate-500">{estimatedWeight}</p>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                    <p className="font-semibold text-slate-700 text-xs uppercase tracking-wide">Agent</p>
                    <p className="text-slate-900 font-semibold">{selectedAgent?.fullName}</p>
                    <p className="text-slate-500">Coverage: {selectedAgent?.coverageAreas?.join(', ')}</p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Delivery Fee</span>
                  <span className="text-2xl font-bold text-blue-600">₦{selectedAgent?.pricePerDelivery?.toLocaleString()}</span>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                  After payment, your agent will be notified and will pick up your package. You'll receive updates at every step.
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  {isSubmitting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
                  ) : (
                    <>Pay ₦{selectedAgent?.pricePerDelivery?.toLocaleString()} & Send Package</>
                  )}
                </button>
              </div>
            )}

          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {currentStep !== 'confirm' && (
          <div className="flex justify-between mt-6">
            <button onClick={handleBack} className="flex items-center gap-2 px-5 py-3 border border-slate-200 bg-white rounded-xl text-slate-600 font-medium hover:bg-slate-50">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={handleNext} className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium">
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}