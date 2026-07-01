'use client';

import { useEffect, useState } from 'react';
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

type Tab = 'purchases' | 'received';

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    success: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    failed: 'bg-red-100 text-red-600',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function PaymentRow({ payment }: { payment: Payment }) {
  const date = new Date(payment.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="flex items-center gap-4 py-4 border-b border-gray-50 last:border-0">
      <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
        <span className="text-violet-600 text-lg">💳</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{payment.email}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          Ref: {payment.reference} · {date}
        </p>
      </div>

      <div className="text-right flex-shrink-0 flex items-center gap-3">
        <StatusBadge status={payment.status} />
        <p className="font-bold text-gray-900 text-sm">
          ₦{payment.amount.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">💳</span>
      </div>
      <p className="text-gray-500 font-medium">
        {tab === 'purchases' ? 'No purchases yet' : 'No payments received yet'}
      </p>
      <p className="text-gray-400 text-sm mt-1">
        {tab === 'purchases'
          ? 'Tickets you buy will appear here'
          : 'Payments from your events will appear here'}
      </p>
    </div>
  );
}

export default function PaymentsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('purchases');
  const [purchases, setPurchases] = useState<Payment[]>([]);
  const [received, setReceived] = useState<Payment[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [loadingReceived, setLoadingReceived] = useState(true);
  const [errorPurchases, setErrorPurchases] = useState('');
  const [errorReceived, setErrorReceived] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    // Fetch both in parallel
    axios.get(`${API_URL}/payments/my-purchases`, { headers })
      .then(res => {
        setPurchases(res.data);
        setLoadingPurchases(false);
      })
      .catch(err => {
        if (err.response?.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          router.push('/login');
          return;
        }
        setErrorPurchases('Could not load your purchases.');
        setLoadingPurchases(false);
      });

    axios.get(`${API_URL}/payments/received`, { headers })
      .then(res => {
        setReceived(res.data);
        setLoadingReceived(false);
      })
      .catch(err => {
        if (err.response?.status === 401) return;
        setErrorReceived('Could not load received payments.');
        setLoadingReceived(false);
      });
  }, [router]);

  const totalReceived = received
    .filter(p => p.status === 'success')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalSpent = purchases
    .filter(p => p.status === 'success')
    .reduce((sum, p) => sum + p.amount, 0);

  const activeList = tab === 'purchases' ? purchases : received;
  const activeLoading = tab === 'purchases' ? loadingPurchases : loadingReceived;
  const activeError = tab === 'purchases' ? errorPurchases : errorReceived;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar active="Payments" />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-4xl mx-auto">

          <div className="mb-8">
            <h1 className="text-2xl font-black text-gray-900">Payments</h1>
            <p className="text-gray-500 text-sm mt-1">Your purchase history and received payments</p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-gray-500 text-sm mb-1">Total spent</p>
              <p className="text-2xl font-black text-gray-900">
                {loadingPurchases ? '—' : `₦${totalSpent.toLocaleString()}`}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                {purchases.filter(p => p.status === 'success').length} successful purchase{purchases.filter(p => p.status === 'success').length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-gray-500 text-sm mb-1">Total received</p>
              <p className="text-2xl font-black text-violet-600">
                {loadingReceived ? '—' : `₦${totalReceived.toLocaleString()}`}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                {received.filter(p => p.status === 'success').length} successful payment{received.filter(p => p.status === 'success').length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
            <button
              onClick={() => setTab('purchases')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'purchases' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              My Purchases
              {!loadingPurchases && purchases.length > 0 && (
                <span className="ml-2 bg-gray-200 text-gray-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {purchases.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('received')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'received' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Received
              {!loadingReceived && received.length > 0 && (
                <span className="ml-2 bg-violet-100 text-violet-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {received.length}
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            {activeLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4 py-4 border-b border-gray-50 animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                      <div className="h-3 bg-gray-200 rounded w-1/3" />
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-20" />
                  </div>
                ))}
              </div>
            ) : activeError ? (
              <div className="text-center py-12">
                <p className="text-red-500 text-sm">{activeError}</p>
              </div>
            ) : activeList.length === 0 ? (
              <EmptyState tab={tab} />
            ) : (
              <div>
                {activeList.map(payment => (
                  <PaymentRow key={payment._id} payment={payment} />
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}