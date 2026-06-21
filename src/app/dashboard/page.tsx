'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface Payment {
  _id: string;
  userId: string;
  ticketId: string;
  email: string;
  amount: number;
  status: string;
  reference: string;
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    success: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    failed: 'bg-red-100 text-red-700',
  };
  const dotColor: Record<string, string> = {
    success: 'bg-green-500',
    pending: 'bg-yellow-500',
    failed: 'bg-red-500',
  };
  const style = styles[status] || 'bg-gray-100 text-gray-600';
  const dot = dotColor[status] || 'bg-gray-400';

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${style}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function DashboardPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/login'); return; }

    // Note: requires a GET /payments endpoint that lists all payments
    axios.get(`${API_URL}/payments`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => {
      setPayments(res.data);
      setLoading(false);
    }).catch(() => {
      setPayments([]);
      setLoading(false);
    });
  }, []);

  const filtered = payments.filter(p => {
    const matchesFilter = filter === 'all' || p.status === filter;
    const matchesSearch = p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.reference.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalRevenue = payments
    .filter(p => p.status === 'success')
    .reduce((sum, p) => sum + p.amount, 0);

  const successCount = payments.filter(p => p.status === 'success').length;
  const pendingCount = payments.filter(p => p.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar active="Payments" />

      <main className="flex-1 ml-64 p-8">
        <div className="max-w-5xl mx-auto">

          <div className="mb-8">
            <h1 className="text-2xl font-black text-gray-900">Payments</h1>
            <p className="text-gray-500 text-sm mt-1">Track all transactions</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-gray-500 text-sm font-medium mb-2">Total Revenue</p>
              <p className="text-3xl font-black text-gray-900">N{totalRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-gray-500 text-sm font-medium mb-2">Successful</p>
              <p className="text-3xl font-black text-green-600">{successCount}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-gray-500 text-sm font-medium mb-2">Pending</p>
              <p className="text-3xl font-black text-yellow-600">{pendingCount}</p>
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
                placeholder="Search by email or reference..."
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
              <option value="all">All status</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
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
                <span className="text-4xl">💳</span>
                <p className="text-gray-500 font-medium mt-3">No payments found</p>
                <p className="text-gray-400 text-sm mt-1">Transactions will appear here once tickets are purchased</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Reference</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(payment => (
                    <tr key={payment._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-gray-700 text-sm font-mono">{payment.reference}</td>
                      <td className="px-6 py-4 text-gray-700 text-sm">{payment.email}</td>
                      <td className="px-6 py-4 text-gray-900 text-sm font-medium">N{payment.amount.toLocaleString()}</td>
                      <td className="px-6 py-4"><StatusBadge status={payment.status} /></td>
                      <td className="px-6 py-4 text-gray-500 text-sm">
                        {new Date(payment.createdAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <p className="text-gray-400 text-xs mt-4 text-right">{filtered.length} transactions</p>
        </div>
      </main>
    </div>
  );
}