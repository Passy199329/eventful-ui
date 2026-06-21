'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface Ticket {
  _id: string;
  eventId: string;
  ticketType: string;
  quantity: number;
  totalPrice: number;
  isScanned: boolean;
  qrCode?: string;
  createdAt: string;
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
              <a href="/my-tickets" className="text-violet-600 text-sm font-medium px-3 py-2">My Tickets</a>
              <button onClick={handleLogout} className="text-gray-600 hover:text-gray-900 text-sm font-medium px-3 py-2">Log out</button>
            </>
          ) : (
            <>
              <a href="/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium px-3 py-2">Log in</a>
              <a href="/register" className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">Sign up</a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function TicketCard({ ticket, onGenerateQR }: { ticket: Ticket; onGenerateQR: (id: string) => void }) {
  const [showQR, setShowQR] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* Ticket header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-700 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-violet-200 text-xs font-medium uppercase tracking-wide mb-1">
              {ticket.ticketType} Ticket
            </p>
            <p className="text-white font-bold text-lg">x{ticket.quantity}</p>
          </div>
          <div className="text-right">
            <p className="text-violet-200 text-xs mb-1">Total paid</p>
            <p className="text-white font-bold text-lg">
              {ticket.totalPrice === 0 ? 'Free' : `₦${ticket.totalPrice.toLocaleString()}`}
            </p>
          </div>
        </div>
      </div>

      {/* Dashed divider */}
      <div className="relative">
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-50 border border-gray-100" />
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-50 border border-gray-100" />
        <div className="border-t border-dashed border-gray-200 mx-4" />
      </div>

      {/* Ticket body */}
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs">Ticket ID</p>
            <p className="text-gray-700 text-sm font-mono">{ticket._id.slice(-8).toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-xs">Purchased</p>
            <p className="text-gray-700 text-sm">
              {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
            ticket.isScanned
              ? 'bg-gray-100 text-gray-500'
              : 'bg-green-100 text-green-700'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${ticket.isScanned ? 'bg-gray-400' : 'bg-green-500'}`} />
            {ticket.isScanned ? 'Used' : 'Valid'}
          </span>

          <div className="flex gap-2">
            {ticket.qrCode ? (
              <button
                onClick={() => setShowQR(!showQR)}
                className="text-violet-600 hover:text-violet-700 text-xs font-medium border border-violet-200 hover:border-violet-300 px-3 py-1.5 rounded-lg transition-colors"
              >
                {showQR ? 'Hide QR' : 'Show QR'}
              </button>
            ) : (
              <button
                onClick={() => onGenerateQR(ticket._id)}
                className="text-violet-600 hover:text-violet-700 text-xs font-medium border border-violet-200 hover:border-violet-300 px-3 py-1.5 rounded-lg transition-colors"
              >
                Generate QR
              </button>
            )}
          </div>
        </div>

        {showQR && ticket.qrCode && (
          <div className="flex justify-center pt-2">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <img src={ticket.qrCode} alt="QR Code" className="w-40 h-40" />
              <p className="text-center text-gray-400 text-xs mt-2">Scan at event entrance</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/login'); return; }

    axios.get(`${API_URL}/tickets/my-tickets`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => {
      setTickets(res.data);
      setLoading(false);
    }).catch(() => {
      setError('Failed to load tickets.');
      setLoading(false);
    });
  }, []);

  const handleGenerateQR = async (ticketId: string) => {
    const token = localStorage.getItem('accessToken');
    try {
      const res = await axios.post(
        `${API_URL}/qrcode/${ticketId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTickets(tickets.map(t =>
        t._id === ticketId ? { ...t, qrCode: res.data.qrCode } : t
      ));
    } catch {
      alert('Failed to generate QR code.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-24 pb-16 max-w-3xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900">My Tickets</h1>
          <p className="text-gray-500 text-sm mt-1">Your purchased event tickets</p>
        </div>

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
                <div className="h-24 bg-gray-200" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-red-500 mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="text-violet-600 font-medium hover:underline">Try again</button>
          </div>
        )}

        {!loading && !error && tickets.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🎟️</span>
            </div>
            <p className="text-gray-500 font-medium">No tickets yet</p>
            <p className="text-gray-400 text-sm mt-1 mb-4">Browse events and purchase your first ticket</p>
            <a href="/" className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors inline-block">
              Browse Events
            </a>
          </div>
        )}

        {!loading && !error && tickets.length > 0 && (
          <div className="space-y-4">
            {tickets.map(ticket => (
              <TicketCard key={ticket._id} ticket={ticket} onGenerateQR={handleGenerateQR} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}