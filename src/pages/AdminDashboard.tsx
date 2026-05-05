import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bus, CheckCircle2, X, Shield, ArrowLeft, Phone, Mail, CreditCard, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const API = 'https://blissful-exploration-production.up.railway.app';
const ADMIN_KEY = 'vaamoose-admin-secret-2025';

interface AdminDashboardProps {
  onBack: () => void;
}

export function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [partners, setPartners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [adminKey, setAdminKey] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  const handleLogin = () => {
    if (adminKey === ADMIN_KEY) {
      setIsAuthorized(true);
      fetchPartners();
    } else {
      toast.error('Invalid admin key');
    }
  };

  const fetchPartners = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/partners`, {
        headers: { 'x-admin-key': ADMIN_KEY },
      });
      const data = await res.json();
      setPartners(data.partners || []);
    } catch (error) {
      console.error('Failed to fetch partners:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (partnerId: string) => {
    setApprovingId(partnerId);
    try {
      const res = await fetch(`${API}/api/admin/partners/${partnerId}/approve`, {
        method: 'PUT',
        headers: { 'x-admin-key': ADMIN_KEY },
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Partner approved! Subaccount: ${data.subaccountCode}`);
        fetchPartners();
      } else {
        toast.error(data.error || 'Approval failed');
      }
    } catch (error) {
      toast.error('Failed to approve partner');
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (partnerId: string) => {
    if (!confirm('Are you sure you want to remove this partner?')) return;
    try {
      const res = await fetch(`${API}/api/admin/partners/${partnerId}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': ADMIN_KEY },
      });
      if (res.ok) {
        toast.success('Partner removed.');
        fetchPartners();
      }
    } catch (error) {
      toast.error('Failed to remove partner');
    }
  };

  const pendingPartners = partners.filter(p => !p.isApproved);
  const approvedPartners = partners.filter(p => p.isApproved);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Admin Access</h1>
              <p className="text-slate-500 text-sm mt-1">Enter your admin key to continue</p>
            </div>
            <input
              type="password"
              placeholder="Admin secret key"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl mb-4 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6">
              Access Dashboard
            </Button>
            <button onClick={onBack} className="w-full mt-3 text-slate-500 hover:text-slate-700 text-sm flex items-center justify-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-10 pb-10">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
              <p className="text-slate-500 text-sm">Manage transport partners</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center px-4 py-2 bg-amber-100 rounded-xl">
              <p className="text-2xl font-bold text-amber-700">{pendingPartners.length}</p>
              <p className="text-xs text-amber-600">Pending</p>
            </div>
            <div className="text-center px-4 py-2 bg-emerald-100 rounded-xl">
              <p className="text-2xl font-bold text-emerald-700">{approvedPartners.length}</p>
              <p className="text-xs text-emerald-600">Approved</p>
            </div>
          </div>
        </div>

        {isLoading && <div className="text-center py-20 text-slate-500">Loading partners...</div>}

        {/* Pending */}
        {!isLoading && pendingPartners.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full inline-block" />
              Pending Approval ({pendingPartners.length})
            </h2>
            <div className="space-y-3">
              {pendingPartners.map((partner, index) => (
                <motion.div key={partner._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                  <Card className="border-amber-200">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                            <Bus className="w-6 h-6 text-amber-600" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-slate-900">{partner.companyName}</h3>
                            <div className="flex flex-wrap gap-3 mt-1">
                              <span className="flex items-center gap-1 text-sm text-slate-500"><Mail className="w-3 h-3" /> {partner.email}</span>
                              <span className="flex items-center gap-1 text-sm text-slate-500"><Phone className="w-3 h-3" /> {partner.phone}</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{partner.address}</p>

                            {partner.bankAccountNumber ? (
                              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                                <CreditCard className="w-3 h-3 text-blue-600 shrink-0" />
                                <span className="text-xs text-blue-700 font-medium">
                                  {partner.bankName} · {partner.bankAccountNumber} · {partner.accountName}
                                </span>
                              </div>
                            ) : (
                              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                                <AlertCircle className="w-3 h-3 text-red-600 shrink-0" />
                                <span className="text-xs text-red-600">No bank account — cannot approve</span>
                              </div>
                            )}

                            <p className="text-xs text-slate-400 mt-1">Registered: {new Date(partner.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            onClick={() => handleApprove(partner._id)}
                            disabled={approvingId === partner._id || !partner.bankAccountNumber}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 disabled:opacity-50"
                          >
                            {approvingId === partner._id
                              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                              : <><CheckCircle2 className="w-4 h-4" /> Approve</>
                            }
                          </Button>
                          <Button onClick={() => handleReject(partner._id)} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-2">
                            <X className="w-4 h-4" /> Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && pendingPartners.length === 0 && (
          <Card className="mb-8"><CardContent className="p-8 text-center text-slate-500">No partners pending approval.</CardContent></Card>
        )}

        {/* Approved */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block" />
            Approved Partners ({approvedPartners.length})
          </h2>
          {approvedPartners.length === 0 ? (
            <Card><CardContent className="p-12 text-center text-slate-500">No approved partners yet.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {approvedPartners.map((partner, index) => (
                <motion.div key={partner._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                            <Bus className="w-6 h-6 text-emerald-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">{partner.companyName}</h3>
                            <div className="flex flex-wrap gap-3 mt-1">
                              <span className="flex items-center gap-1 text-sm text-slate-500"><Mail className="w-3 h-3" /> {partner.email}</span>
                              <span className="flex items-center gap-1 text-sm text-slate-500"><Phone className="w-3 h-3" /> {partner.phone}</span>
                            </div>

                            {partner.paystackSubaccountCode && (
                              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                                <CreditCard className="w-3 h-3 text-emerald-600" />
                                <span className="text-xs text-emerald-700 font-medium">
                                  Subaccount: {partner.paystackSubaccountCode}
                                </span>
                              </div>
                            )}

                            <div className="flex gap-3 mt-1 text-xs text-slate-400">
                              <span>{partner.vehicles?.length || 0} vehicles</span>
                              <span>{partner.routes?.length || 0} routes</span>
                              <span>{partner.departureDates?.length || 0} departures</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Approved
                          </span>
                          <Button onClick={() => handleReject(partner._id)} variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                            Remove
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}