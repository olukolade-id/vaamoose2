import { useState, useRef } from 'react';
import { User, Mail, Phone, GraduationCap, ArrowLeft, Save, Edit2, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { schools } from '@/data/Data';
import { toast } from 'sonner';

interface ProfilePageProps {
  onBack: () => void;
}

const API = 'https://blissful-exploration-production.up.railway.app';

export function ProfilePage({ onBack }: ProfilePageProps) {
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [university, setUniversity] = useState(user?.university || '');
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview immediately
    const localUrl = URL.createObjectURL(file);
    setProfilePhoto(localUrl);

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(`${API}/api/upload/profile-photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.url) {
        setProfilePhoto(data.url);

        // Save URL to profile immediately
        const saveRes = await fetch(`${API}/api/auth/update-profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ profilePhoto: data.url }),
        });

        if (saveRes.ok) {
          const updatedUser = { ...user, profilePhoto: data.url };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          toast.success('Profile photo updated!');
        }
      } else {
        toast.error('Failed to upload photo');
        setProfilePhoto(user?.profilePhoto || '');
      }
    } catch {
      toast.error('Something went wrong uploading photo');
      setProfilePhoto(user?.profilePhoto || '');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(`${API}/api/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fullName, phoneNumber: phone, university }),
      });

      const data = await res.json();

      if (res.ok) {
        const updatedUser = { ...user, fullName, phoneNumber: phone, university };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        toast.success('Profile updated successfully!');
        setIsEditing(false);
      } else {
        toast.error(data.error || 'Failed to update profile');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedSchool = schools.find(s => s.id === university);

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-10">
      <div className="max-w-2xl mx-auto px-4">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
            <p className="text-slate-500 text-sm">Manage your account information</p>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="mb-6">
          <CardContent className="p-6">

            {/* Avatar with upload */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
              <div className="relative">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center ring-4 ring-white shadow-md">
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-3xl font-bold">
                      {user?.fullName?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Camera button overlay */}
                <button
                  onClick={handlePhotoClick}
                  disabled={isUploadingPhoto}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow-md transition-colors"
                  title="Change profile photo"
                >
                  {isUploadingPhoto ? (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5 text-white" />
                  )}
                </button>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">{user?.fullName}</h2>
                <p className="text-slate-500">{user?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                  Student
                </span>
                <p className="text-xs text-slate-400 mt-1">Tap the camera icon to change photo</p>
              </div>
            </div>

            {/* Form fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={!isEditing}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={user?.email || ''}
                    disabled
                    className="pl-10 bg-slate-50 text-slate-400"
                  />
                </div>
                <p className="text-xs text-slate-400">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label>Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={!isEditing}
                    className="pl-10"
                    placeholder="+234 801 234 5678"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>University</Label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  {isEditing ? (
                    <select
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select university</option>
                      {schools.map((school) => (
                        <option key={school.id} value={school.id}>{school.name}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={selectedSchool?.name || university || 'Not set'}
                      disabled
                      className="pl-10"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              {isEditing ? (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Account</h3>
            <Button
              onClick={() => { logout(); onBack(); }}
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
            >
              Logout
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}