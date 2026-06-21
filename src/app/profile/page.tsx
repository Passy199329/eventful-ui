'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface Profile {
  firstName: string;
  lastName: string;
  phone: string;
  bio: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
}

function Navbar() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <span className="text-white font-black text-sm">E</span>
          </div>
          <span className="font-bold text-gray-900 text-lg">Eventful</span>
        </a>
        <div className="flex items-center gap-3">
          <a href="/my-tickets" className="text-gray-600 hover:text-gray-900 text-sm font-medium px-3 py-2">My Tickets</a>
          <a href="/profile" className="text-violet-600 text-sm font-medium px-3 py-2">Profile</a>
          <button onClick={handleLogout} className="text-gray-600 hover:text-gray-900 text-sm font-medium px-3 py-2">Log out</button>
        </div>
      </div>
    </nav>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<Profile>({
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/login'); return; }

    axios.get(`${API_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => {
      setForm({
        firstName: res.data.firstName || '',
        lastName: res.data.lastName || '',
        phone: res.data.phone || '',
        bio: res.data.bio || '',
        emailNotifications: res.data.emailNotifications ?? true,
        smsNotifications: res.data.smsNotifications ?? false,
        pushNotifications: res.data.pushNotifications ?? true,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setSuccess(false);
    setError('');
  };

  const handleToggle = (field: keyof Profile) => {
    setForm({ ...form, [field]: !form[field] });
    setSuccess(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    const token = localStorage.getItem('accessToken');
    try {
      await axios.patch(
        `${API_URL}/users/profile`,
        {
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          bio: form.bio,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);

    const token = localStorage.getItem('accessToken');
    try {
      await axios.patch(
        `${API_URL}/users/notifications`,
        {
          emailNotifications: form.emailNotifications,
          smsNotifications: form.smsNotifications,
          pushNotifications: form.pushNotifications,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Failed to update notification preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-24 max-w-2xl mx-auto px-4 animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-4">
            {[1,2,3,4].map(i => <div key={i} className="h-12 bg-gray-200 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-24 pb-16 max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900">Profile Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your account information</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-100 text-green-700 text-sm rounded-xl px-4 py-3 mb-6">
            Changes saved successfully!
          </div>
        )}

        {/* Personal Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-6">
          <h2 className="font-bold text-gray-900 mb-6">Personal Information</h2>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">First name</label>
                <input type="text" name="firstName" value={form.firstName} onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-gray-900 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name</label>
                <input type="text" name="lastName" value={form.lastName} onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-gray-900 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone number</label>
              <input type="tel" name="phone" value={form.phone} onChange={handleChange}
                placeholder="+234..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-gray-900 placeholder-gray-400 text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
              <textarea name="bio" value={form.bio} onChange={handleChange} rows={3}
                placeholder="Tell us about yourself..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-gray-900 placeholder-gray-400 text-sm resize-none" />
            </div>

            <button type="submit" disabled={saving}
              className="bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm">
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Notification Preferences */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <h2 className="font-bold text-gray-900 mb-6">Notification Preferences</h2>

          <div className="space-y-4">
            {[
              { key: 'emailNotifications' as const, label: 'Email Notifications', desc: 'Receive event reminders via email' },
              { key: 'smsNotifications' as const, label: 'SMS Notifications', desc: 'Receive event reminders via SMS' },
              { key: 'pushNotifications' as const, label: 'Push Notifications', desc: 'Receive push notifications on this device' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{item.label}</p>
                  <p className="text-gray-400 text-xs">{item.desc}</p>
                </div>
                <button
                  onClick={() => handleToggle(item.key)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form[item.key] ? 'bg-violet-600' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form[item.key] ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            ))}
          </div>

          <button onClick={handleSaveNotifications} disabled={saving}
            className="mt-6 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm">
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}