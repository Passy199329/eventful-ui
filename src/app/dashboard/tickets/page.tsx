'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface Ticket {
  _id: string;
  userId: string;
  eventId: string;
  ticketType: string;
  quantity: number;
  totalPrice: number;
  isScanned: boolean;
  createdAt: string;
}

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

export default function DashboardTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/login'); return; }

    // Note: requires a GET /tickets endpoint that lists all tickets
    axios.get(`${API_URL}/tickets`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => {
      setTickets(res.data);
      setLoading(false);
    }).catch(() => {
      setTickets([]);
      setLoading(false);
    });
  }, []);

  const filtered = tickets.filter(t => {
    const matchesFilter = filter === 'all' ||
      (filter === 'used' && t.isScanned) ||
      (filter === 'valid' && !t.isScanned);
    const matchesSearch = t.ticketType.toLowerCase().includes(search.toLowerCase()) ||
      t._id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalSold = tickets.reduce((sum, t) => sum + t.quantity, 0);
  const totalRevenue = tickets.reduce((sum, t) => sum + t.totalPrice, 0);
  const usedCount = tickets.filter(t => t.isScanned).length;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar active="Tickets" />

      <main className="flex-1 ml-64 p-8">
        <div className="max-w-5xl mx-auto">

          <div className="mb-8">
            <h1 className="text-2xl font-black text-gray-900">Tickets</h1>
            <p className="text-gray-500 text-sm mt-1">All purchased tickets across events</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-gray-500 text-sm font-medium mb-2">Tickets Sold</p>
              <p className="text-3xl font-black text-gray-900">{totalSold}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-gray-500 text-sm font-medium mb-2">Revenue</p>
              <p className="text-3xl font-black text-violet-600">N{totalRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-gray-500 text-sm font-medium mb-2">Checked In</p>
              <p className="text-3xl font-black text-green-600">{usedCount}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by ticket type or ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-900 placeholder-gray-400 text-sm"
              />
            </div>
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-900 text-sm"
            >
              <option value="all">All tickets</option>
              <option value="valid">Valid</option>
              <option value="used">Used</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-4 animate-pulse">
                {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <span className="text-4xl">🎟️</span>
                <p className="text-gray-500 font-medium mt-3">No tickets found</p>
                <p className="text-gray-400 text-sm mt-1">Tickets will appear here once purchased</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ticket ID</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(ticket => (
                    <tr key={ticket._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-gray-700 text-sm font-mono">{ticket._id.slice(-8).toUpperCase()}</td>
                      <td className="px-6 py-4 text-gray-900 text-sm font-medium">{ticket.ticketType}</td>
                      <td className="px-6 py-4 text-gray-700 text-sm">{ticket.quantity}</td>
                      <td className="px-6 py-4 text-gray-900 text-sm font-medium">
                        {ticket.totalPrice === 0 ? 'Free' : `N${ticket.totalPrice.toLocaleString()}`}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                          ticket.isScanned ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${ticket.isScanned ? 'bg-gray-400' : 'bg-green-500'}`} />
                          {ticket.isScanned ? 'Used' : 'Valid'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm">
                        {new Date(ticket.createdAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <p className="text-gray-400 text-xs mt-4 text-right">{filtered.length} tickets</p>
        </div>
      </main>
    </div>
  );
}