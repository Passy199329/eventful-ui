'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

function Sidebar({ active }: { active: string }) {
  const links = [
    { label: 'Overview', href: '/dashboard', icon: '📊' },
    { label: 'Events', href: '/dashboard/events', icon: '🎉' },
    { label: 'Tickets', href: '/dashboard/tickets', icon: '🎟️' },
    { label: 'Payments', href: '/dashboard/payments', icon: '💳' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-100 min-h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-gray-100">
        <a href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <span className="text-white font-black text-sm">E</span>
          </div>
          <span className="font-bold text-gray-900">Eventful</span>
        </a>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map(link => (
          <a key={link.href} href={link.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              active === link.label ? 'bg-violet-50 text-violet-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}>
            <span>{link.icon}</span>
            {link.label}
          </a>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <button onClick={() => { localStorage.clear(); window.location.href = '/'; }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 w-full">
          <span>🚪</span> Log out
        </button>
      </div>
    </aside>
  );
}

interface FormState {
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  price: string;
  capacity: string;
  bannerImage: string;
}

const initialForm: FormState = {
  title: '',
  description: '',
  location: '',
  startDate: '',
  endDate: '',
  price: '',
  capacity: '',
  bannerImage: '',
};

export default function CreateEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormState>(initialForm);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setError('');
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.title.trim()) errors.title = 'Title is required';
    if (!form.description.trim()) errors.description = 'Description is required';
    if (!form.location.trim()) errors.location = 'Location is required';
    if (!form.startDate) errors.startDate = 'Start date & time is required';
    if (!form.endDate) errors.endDate = 'End date & time is required';

    if (form.startDate && form.endDate) {
      if (new Date(form.endDate) <= new Date(form.startDate)) {
        errors.endDate = 'End must be after start';
      }
    }

    const price = Number(form.price);
    if (form.price === '' || Number.isNaN(price) || price < 0) {
      errors.price = 'Enter a valid price (0 for free)';
    }

    const capacity = Number(form.capacity);
    if (form.capacity === '' || !Number.isInteger(capacity) || capacity < 1) {
      errors.capacity = 'Capacity must be at least 1';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        price: Number(form.price),
        capacity: Number(form.capacity),
        ...(form.bannerImage.trim() && { bannerImage: form.bannerImage.trim() }),
      };

      const res = await axios.post(`${API_URL}/events`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      router.push(`/events/${res.data._id}`);
    } catch (err: any) {
      const data = err.response?.data;
      const msg =
        typeof data?.message === 'string'
          ? data.message
          : data?.message?.message || 'Failed to create event. Please try again.';

      if (err.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        router.push('/login');
        return;
      }

      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar active="Events" />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <a href="/dashboard" className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-900 text-sm mb-4 transition-colors">
              ← Back to dashboard
            </a>
            <h1 className="text-2xl font-black text-gray-900">Create Event</h1>
            <p className="text-gray-500 text-sm mt-1">Fill in the details to publish your event</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-8">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1.5">Event title *</label>
                <input
                  id="title"
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Lagos Music Festival 2026"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-gray-900 placeholder-gray-400 text-sm"
                />
                {fieldErrors.title && <p className="text-red-500 text-xs mt-1.5">{fieldErrors.title}</p>}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">Description *</label>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe your event..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-gray-900 placeholder-gray-400 text-sm resize-none"
                />
                {fieldErrors.description && <p className="text-red-500 text-xs mt-1.5">{fieldErrors.description}</p>}
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1.5">Location *</label>
                <input
                  id="location"
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="e.g. Eko Hotel, Lagos"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-gray-900 placeholder-gray-400 text-sm"
                />
                {fieldErrors.location && <p className="text-red-500 text-xs mt-1.5">{fieldErrors.location}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1.5">Start date &amp; time *</label>
                  <input
                    id="startDate"
                    type="datetime-local"
                    name="startDate"
                    value={form.startDate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-gray-900 text-sm"
                  />
                  {fieldErrors.startDate && <p className="text-red-500 text-xs mt-1.5">{fieldErrors.startDate}</p>}
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1.5">End date &amp; time *</label>
                  <input
                    id="endDate"
                    type="datetime-local"
                    name="endDate"
                    value={form.endDate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-gray-900 text-sm"
                  />
                  {fieldErrors.endDate && <p className="text-red-500 text-xs mt-1.5">{fieldErrors.endDate}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1.5">Ticket price (₦) *</label>
                  <input
                    id="price"
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="0 for free events"
                    min={0}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-gray-900 placeholder-gray-400 text-sm"
                  />
                  {fieldErrors.price && <p className="text-red-500 text-xs mt-1.5">{fieldErrors.price}</p>}
                </div>
                <div>
                  <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1.5">Capacity *</label>
                  <input
                    id="capacity"
                    type="number"
                    name="capacity"
                    value={form.capacity}
                    onChange={handleChange}
                    placeholder="Total tickets available"
                    min={1}
                    step={1}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-gray-900 placeholder-gray-400 text-sm"
                  />
                  {fieldErrors.capacity && <p className="text-red-500 text-xs mt-1.5">{fieldErrors.capacity}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="bannerImage" className="block text-sm font-medium text-gray-700 mb-1.5">Banner image URL (optional)</label>
                <input
                  id="bannerImage"
                  type="url"
                  name="bannerImage"
                  value={form.bannerImage}
                  onChange={handleChange}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-gray-900 placeholder-gray-400 text-sm"
                />
                {form.bannerImage && (
                  <div className="mt-3 rounded-xl overflow-hidden h-40">
                    <img
                      src={form.bannerImage}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={e => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  {loading ? 'Publishing...' : 'Publish Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}