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

interface Event {
  _id: string;
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  price: number;
  capacity?: number;
  ticketsSold?: number;
  bannerImage?: string;
  creatorId: string;
  status?: string;
}

interface EditFormState {
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  price: string;
  capacity: string;
  bannerImage: string;
}

function toLocalInputValue(iso: string) {
  // Converts an ISO date string to the value format <input type="datetime-local"> expects
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MyEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [editError, setEditError] = useState('');
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const myId = user.sub;

    axios.get(`${API_URL}/events`)
      .then(res => {
        const mine = myId
          ? res.data.filter((ev: Event) => ev.creatorId === myId)
          : [];
        setEvents(mine);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load your events.');
        setLoading(false);
      });
  }, [router]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const openEdit = (event: Event) => {
    setEditingEvent(event);
    setEditError('');
    setEditFieldErrors({});
    setEditForm({
      title: event.title,
      description: event.description,
      location: event.location,
      startDate: toLocalInputValue(event.startDate),
      endDate: toLocalInputValue(event.endDate),
      price: String(event.price),
      capacity: event.capacity != null ? String(event.capacity) : '',
      bannerImage: event.bannerImage || '',
    });
  };

  const closeEdit = () => {
    setEditingEvent(null);
    setEditForm(null);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => prev ? { ...prev, [name]: value } : prev);
    setEditFieldErrors(prev => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const validateEdit = (form: EditFormState): boolean => {
    const errors: Record<string, string> = {};

    if (!form.title.trim()) errors.title = 'Title is required';
    if (!form.description.trim()) errors.description = 'Description is required';
    if (!form.location.trim()) errors.location = 'Location is required';
    if (!form.startDate) errors.startDate = 'Start date & time is required';
    if (!form.endDate) errors.endDate = 'End date & time is required';

    if (form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate)) {
      errors.endDate = 'End must be after start';
    }

    const price = Number(form.price);
    if (form.price === '' || Number.isNaN(price) || price < 0) {
      errors.price = 'Enter a valid price (0 for free)';
    }

    const capacity = Number(form.capacity);
    if (form.capacity === '' || !Number.isInteger(capacity) || capacity < 1) {
      errors.capacity = 'Capacity must be at least 1';
    }

    setEditFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm || !editingEvent) return;
    setEditError('');

    if (!validateEdit(editForm)) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        location: editForm.location.trim(),
        startDate: new Date(editForm.startDate).toISOString(),
        endDate: new Date(editForm.endDate).toISOString(),
        price: Number(editForm.price),
        capacity: Number(editForm.capacity),
        ...(editForm.bannerImage.trim() && { bannerImage: editForm.bannerImage.trim() }),
      };

      const res = await axios.patch(`${API_URL}/events/${editingEvent._id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setEvents(prev => prev.map(ev => (ev._id === editingEvent._id ? res.data : ev)));
      closeEdit();
    } catch (err: any) {
      const data = err.response?.data;
      const msg =
        typeof data?.message === 'string'
          ? data.message
          : data?.message?.message || 'Could not save changes. Please try again.';

      if (err.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        router.push('/login');
        return;
      }

      setEditError(msg);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingEvent) return;
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    setDeleting(true);
    setDeleteError('');
    try {
      await axios.delete(`${API_URL}/events/${deletingEvent._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEvents(prev => prev.filter(ev => ev._id !== deletingEvent._id));
      setDeletingEvent(null);
    } catch (err: any) {
      const data = err.response?.data;
      const msg =
        typeof data?.message === 'string'
          ? data.message
          : data?.message?.message || 'Could not delete the event. Please try again.';

      if (err.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        router.push('/login');
        return;
      }

      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar active="Events" />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-5xl mx-auto">

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-black text-gray-900">My Events</h1>
              <p className="text-gray-500 text-sm mt-1">Manage the events you've created</p>
            </div>
            <a
              href="/dashboard/events/create"
              className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              + Create event
            </a>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-24" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <p className="text-gray-500 mb-4">You haven't created any events yet.</p>
              <a href="/dashboard/events/create" className="text-violet-600 font-medium hover:underline text-sm">
                Create your first event
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map(event => (
                <div
                  key={event._id}
                  className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4"
                >
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-violet-500 to-purple-700 flex-shrink-0 flex items-center justify-center">
                    {event.bannerImage ? (
                      <img src={event.bannerImage} alt={event.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white/30 text-3xl font-bold select-none">E</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <a
                      href={`/events/${event._id}`}
                      className="font-bold text-gray-900 hover:text-violet-600 transition-colors truncate block"
                    >
                      {event.title}
                    </a>
                    <p className="text-gray-500 text-sm truncate">{event.location}</p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {formatDate(event.startDate)}
                      {event.capacity != null && (
                        <> · {event.ticketsSold ?? 0}/{event.capacity} sold</>
                      )}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-900 text-sm">
                      {event.price === 0 ? 'Free' : `₦${event.price.toLocaleString()}`}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <a
                      href="/dashboard/check-in"
                      className="px-3 py-2 rounded-xl border border-violet-100 text-violet-600 hover:bg-violet-50 text-sm font-medium transition-colors"
                    >
                      Check in
                    </a>
                    <button
                      onClick={() => openEdit(event)}
                      className="px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => { setDeletingEvent(event); setDeleteError(''); }}
                      className="px-3 py-2 rounded-xl border border-red-100 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Edit modal */}
      {editingEvent && editForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 my-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 text-lg">Edit event</h2>
              <button
                onClick={closeEdit}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {editError && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                <input
                  id="edit-title"
                  name="title"
                  type="text"
                  value={editForm.title}
                  onChange={handleEditChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-gray-900 text-sm"
                />
                {editFieldErrors.title && <p className="text-red-500 text-xs mt-1.5">{editFieldErrors.title}</p>}
              </div>

              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  id="edit-description"
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-gray-900 text-sm resize-none"
                />
                {editFieldErrors.description && <p className="text-red-500 text-xs mt-1.5">{editFieldErrors.description}</p>}
              </div>

              <div>
                <label htmlFor="edit-location" className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
                <input
                  id="edit-location"
                  name="location"
                  type="text"
                  value={editForm.location}
                  onChange={handleEditChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-gray-900 text-sm"
                />
                {editFieldErrors.location && <p className="text-red-500 text-xs mt-1.5">{editFieldErrors.location}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-startDate" className="block text-sm font-medium text-gray-700 mb-1.5">Start</label>
                  <input
                    id="edit-startDate"
                    name="startDate"
                    type="datetime-local"
                    value={editForm.startDate}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-gray-900 text-sm"
                  />
                  {editFieldErrors.startDate && <p className="text-red-500 text-xs mt-1.5">{editFieldErrors.startDate}</p>}
                </div>
                <div>
                  <label htmlFor="edit-endDate" className="block text-sm font-medium text-gray-700 mb-1.5">End</label>
                  <input
                    id="edit-endDate"
                    name="endDate"
                    type="datetime-local"
                    value={editForm.endDate}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-gray-900 text-sm"
                  />
                  {editFieldErrors.endDate && <p className="text-red-500 text-xs mt-1.5">{editFieldErrors.endDate}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-price" className="block text-sm font-medium text-gray-700 mb-1.5">Price (₦)</label>
                  <input
                    id="edit-price"
                    name="price"
                    type="number"
                    min={0}
                    value={editForm.price}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-gray-900 text-sm"
                  />
                  {editFieldErrors.price && <p className="text-red-500 text-xs mt-1.5">{editFieldErrors.price}</p>}
                </div>
                <div>
                  <label htmlFor="edit-capacity" className="block text-sm font-medium text-gray-700 mb-1.5">Capacity</label>
                  <input
                    id="edit-capacity"
                    name="capacity"
                    type="number"
                    min={1}
                    step={1}
                    value={editForm.capacity}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-gray-900 text-sm"
                  />
                  {editFieldErrors.capacity && <p className="text-red-500 text-xs mt-1.5">{editFieldErrors.capacity}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="edit-bannerImage" className="block text-sm font-medium text-gray-700 mb-1.5">Banner image URL</label>
                <input
                  id="edit-bannerImage"
                  name="bannerImage"
                  type="url"
                  value={editForm.bannerImage}
                  onChange={handleEditChange}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-gray-900 text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deletingEvent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <h2 className="font-bold text-gray-900 text-lg mb-2">Delete event?</h2>
            <p className="text-gray-500 text-sm mb-5">
              This will permanently delete <span className="font-medium text-gray-700">{deletingEvent.title}</span>. This can't be undone.
            </p>

            {deleteError && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setDeletingEvent(null)}
                disabled={deleting}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}