'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface TicketTier {
  name: string;
  price: number;
  capacity: number;
  sold: number;
}

interface Event {
  _id: string;
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  ticketTiers: TicketTier[];
  bannerImage?: string;
  creatorId: string;
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
          {user ? (
            <>
              <a href="/dashboard" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors px-3 py-2">
                Dashboard
              </a>
              <a href="/my-tickets" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors px-3 py-2">
                My Tickets
              </a>
              <button onClick={handleLogout} className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors px-3 py-2">
                Log out
              </button>
            </>
          ) : (
            <>
              <a href="/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors px-3 py-2">
                Log in
              </a>
              <a href="/register" className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                Sign up
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [purchasing, setPurchasing] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedTierName, setSelectedTierName] = useState('');

  useEffect(() => {
    axios.get(`${API_URL}/events/${params.id}`)
      .then(res => {
        setEvent(res.data);
        // Default to the first available tier
        if (res.data.ticketTiers?.length > 0) {
          setSelectedTierName(res.data.ticketTiers[0].name);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Event not found.');
        setLoading(false);
      });
  }, [params.id]);

  // Derive the currently selected tier object from the event's tiers
  const selectedTier = event?.ticketTiers?.find(t => t.name === selectedTierName);
  const remainingInTier = selectedTier ? selectedTier.capacity - selectedTier.sold : 0;
  const isSoldOut = remainingInTier <= 0;
  const maxQuantity = Math.min(10, remainingInTier);

  const handlePurchase = async () => {
    if (!selectedTier || isSoldOut) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.email) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
      return;
    }

    setPurchasing(true);
    try {
      const ticketRes = await axios.post(
        `${API_URL}/tickets/purchase`,
        { eventId: params.id, ticketType: selectedTierName, quantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const paymentRes = await axios.post(
        `${API_URL}/payments/initialize`,
        {
          ticketId: ticketRes.data._id,
          email: user.email,
          amount: selectedTier.price * quantity,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      window.location.href = paymentRes.data.authorization_url;
    } catch (err: any) {
      const data = err.response?.data;
      const msg =
        typeof data?.message === 'string'
          ? data.message
          : data?.message?.message || 'Purchase failed. Please try again.';

      if (err.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        router.push('/login');
        return;
      }

      setError(msg);
      setPurchasing(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-24 max-w-4xl mx-auto px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-72 bg-gray-200 rounded-2xl" />
            <div className="h-8 bg-gray-200 rounded w-2/3" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Navbar />
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error || 'Event not found'}</p>
          <a href="/" className="text-violet-600 hover:underline font-medium">Back to events</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-24 pb-16 max-w-5xl mx-auto px-4">

        {/* Back */}
        <a href="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-900 text-sm mb-6 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to events
        </a>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left - Event info */}
          <div className="lg:col-span-2 space-y-6">

            {/* Banner */}
            <div className="relative h-72 rounded-2xl overflow-hidden bg-gradient-to-br from-violet-500 to-purple-700">
              {event.bannerImage ? (
                <img src={event.bannerImage} alt={event.title} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white/20 text-9xl font-bold select-none">E</span>
                </div>
              )}
            </div>

            {/* Title & Description */}
            <div>
              <h1 className="text-3xl font-black text-gray-900 mb-3">{event.title}</h1>
              <p className="text-gray-600 leading-relaxed">{event.description}</p>
            </div>

            {/* Details */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <h2 className="font-bold text-gray-900">Event Details</h2>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{formatDate(event.startDate)}</p>
                  <p className="text-gray-500 text-sm">{formatTime(event.startDate)} — {formatTime(event.endDate)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{event.location}</p>
                  <p className="text-gray-500 text-sm">Venue location</p>
                </div>
              </div>
            </div>

            {/* Ticket tiers overview */}
            {event.ticketTiers?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 mb-4">Ticket Tiers</h2>
                <div className="space-y-3">
                  {event.ticketTiers.map(tier => {
                    const remaining = tier.capacity - tier.sold;
                    const soldOut = remaining <= 0;
                    return (
                      <div key={tier.name}
                        className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{tier.name}</p>
                          <p className="text-gray-400 text-xs mt-0.5">
                            {soldOut ? (
                              <span className="text-red-500">Sold out</span>
                            ) : (
                              <>{remaining} remaining</>
                            )}
                          </p>
                        </div>
                        <p className="font-bold text-violet-600 text-sm">
                          {tier.price === 0 ? 'Free' : `₦${tier.price.toLocaleString()}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Share */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-4">Share this event</h2>
              <div className="flex gap-3">
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(event.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                >
                  Twitter
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                >
                  Facebook
                </a>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(event.title + ' ' + (typeof window !== 'undefined' ? window.location.href : ''))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                >
                  WhatsApp
                </a>
              </div>
            </div>
          </div>

          {/* Right - Purchase */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-24 space-y-5">

              {/* Selected tier price */}
              <div>
                <p className="text-gray-500 text-sm">Price per ticket</p>
                <p className="text-3xl font-black text-gray-900">
                  {selectedTier
                    ? selectedTier.price === 0 ? 'Free' : `₦${selectedTier.price.toLocaleString()}`
                    : '—'}
                </p>
                {selectedTier && isSoldOut && (
                  <p className="text-red-500 text-xs mt-1">This tier is sold out</p>
                )}
                {selectedTier && !isSoldOut && (
                  <p className="text-gray-400 text-xs mt-1">{remainingInTier} tickets left</p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              {/* Tier selector */}
              {event.ticketTiers?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Ticket tier
                  </label>
                  <select
                    value={selectedTierName}
                    onChange={e => {
                      setSelectedTierName(e.target.value);
                      setQuantity(1);
                      setError('');
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-900 text-sm"
                  >
                    {event.ticketTiers.map(tier => (
                      <option key={tier.name} value={tier.name} disabled={tier.capacity - tier.sold <= 0}>
                        {tier.name} — {tier.price === 0 ? 'Free' : `₦${tier.price.toLocaleString()}`}
                        {tier.capacity - tier.sold <= 0 ? ' (Sold out)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quantity */}
              {!isSoldOut && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Quantity
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      −
                    </button>
                    <span className="text-xl font-bold text-gray-900 w-8 text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(q => Math.min(maxQuantity, q + 1))}
                      disabled={quantity >= maxQuantity}
                      className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4">
                {!isSoldOut && selectedTier && (
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-500 text-sm">Total</span>
                    <span className="font-bold text-gray-900">
                      {selectedTier.price === 0 ? 'Free' : `₦${(selectedTier.price * quantity).toLocaleString()}`}
                    </span>
                  </div>
                )}

                <button
                  onClick={handlePurchase}
                  disabled={purchasing || isSoldOut || !selectedTier}
                  className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  {purchasing ? 'Processing...' : isSoldOut ? 'Sold out' : 'Get tickets'}
                </button>

                <p className="text-center text-gray-400 text-xs mt-3">
                  Secure payment via Paystack
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}