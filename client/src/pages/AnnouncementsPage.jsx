import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  Megaphone,
  Plus,
  Search,
  Trash2,
  Edit,
  Calendar,
  User,
  Clock,
  CalendarOff,
} from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

const PRIORITIES = ['high', 'medium', 'low'];

export default function AnnouncementsPage() {
  const { isFaculty } = useAuth();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [hideExpired, setHideExpired] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    date: new Date().toISOString().split('T')[0],
    priority: 'medium',
    posted_by: '',
    expires: '',
  });

  // Query Announcements
  const { data: announcements = [], isLoading, isError } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.getAnnouncements(),
  });

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingItem) {
        return await api.updateAnnouncement(editingItem.id, data);
      } else {
        return await api.createAnnouncement(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      addToast({
        type: 'success',
        title: editingItem ? 'Notice Updated' : 'Notice Posted',
        message: `Announcement '${formData.title}' is now live on the notice board.`,
      });
      closeForm();
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Failed to save announcement.',
      });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      addToast({
        type: 'success',
        title: 'Notice Deleted',
        message: 'Announcement removed from database.',
      });
      setDeletingId(null);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Failed to delete announcement.',
      });
    },
  });

  const openAddForm = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      body: '',
      date: new Date().toISOString().split('T')[0],
      priority: 'medium',
      posted_by: 'Department Office',
      expires: '',
    });
    setIsFormOpen(true);
  };

  const openEditForm = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title || '',
      body: item.body || '',
      date: item.date || '',
      priority: item.priority || 'medium',
      posted_by: item.posted_by || '',
      expires: item.expires || '',
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Title and date are required.' });
      return;
    }
    saveMutation.mutate(formData);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Filter announcements
  const filtered = announcements.filter((item) => {
    const matchesPriority = selectedPriority === 'all' || item.priority === selectedPriority;
    const isExpired = item.expires && item.expires < todayStr;
    const matchesExpiry = !hideExpired || !isExpired;
    const query = search.toLowerCase();
    const matchesSearch =
      !search ||
      item.title?.toLowerCase().includes(query) ||
      item.body?.toLowerCase().includes(query) ||
      item.posted_by?.toLowerCase().includes(query);
    return matchesPriority && matchesExpiry && matchesSearch;
  });

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-7xl mx-auto w-full bg-white dark:bg-transparent">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
              <Megaphone className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-black dark:text-white tracking-tight">
              Announcements & Notices
            </h1>
          </div>
          <p className="text-sm text-black dark:text-emerald-300/80 font-medium mt-1">
            Department updates, exam notices, and urgent campus advisories.
          </p>
        </div>

        {isFaculty && (
          <button
            onClick={openAddForm}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            Post Notice
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Priority Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-900/40 overflow-x-auto shadow-sm">
          <button
            onClick={() => setSelectedPriority('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              selectedPriority === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-black dark:text-emerald-200 hover:text-black dark:hover:text-white hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
            }`}
          >
            All Notices ({announcements.length})
          </button>
          {PRIORITIES.map((p) => {
            const count = announcements.filter((a) => a.priority === p).length;
            return (
              <button
                key={p}
                onClick={() => setSelectedPriority(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition ${
                  selectedPriority === p
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-black dark:text-emerald-200 hover:text-black dark:hover:text-white hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                }`}
              >
                {p} Priority <span className="opacity-80 text-[10px] font-bold">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Hide Expired Toggle & Search */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-black dark:text-emerald-200">
            <input
              type="checkbox"
              checked={hideExpired}
              onChange={(e) => setHideExpired(e.target.checked)}
              className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
            />
            Hide Expired
          </label>

          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-emerald-700 dark:text-emerald-400/60 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800/60 text-sm font-semibold text-black dark:text-emerald-50 placeholder-black/50 dark:placeholder-emerald-500/60 focus:outline-none focus:border-emerald-500 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Main Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
          <p className="text-sm font-semibold text-black dark:text-emerald-400">Loading notices from database...</p>
        </div>
      ) : isError ? (
        <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-center text-rose-800 dark:text-rose-300 font-medium">
          Failed to load announcements. Please verify backend connection.
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No notices found"
          description="No announcements match your selected filters."
          actionText={isFaculty ? "Post Notice" : undefined}
          onAction={isFaculty ? openAddForm : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((item) => {
            const isExpired = item.expires && item.expires < todayStr;

            return (
              <div
                key={item.id}
                className={`glass-card glass-card-hover rounded-2xl p-6 flex flex-col justify-between relative group ${
                  isExpired ? 'opacity-65 grayscale-[20%]' : ''
                }`}
              >
                <div>
                  {/* Top Bar with Priority Badge & Expiry */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <StatusBadge status={item.priority} type="priority" />

                    <div className="flex items-center gap-2">
                      {isExpired ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-500/20">
                          <CalendarOff className="w-3 h-3" /> Expired
                        </span>
                      ) : item.expires ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-black dark:text-emerald-300/80">
                          <Clock className="w-3 h-3 text-emerald-700 dark:text-emerald-400" /> Expires: {item.expires}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <h3 className="font-extrabold text-black dark:text-white text-lg leading-snug mb-2.5">
                    {item.title}
                  </h3>

                  <p className="text-sm text-black dark:text-emerald-100/90 whitespace-pre-line leading-relaxed mb-4 font-semibold">
                    {item.body}
                  </p>
                </div>

                {/* Footer Meta & Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-emerald-100 dark:border-emerald-900/30 text-xs text-black dark:text-emerald-300 font-semibold">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                      {item.date}
                    </span>
                    {item.posted_by && (
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                        {item.posted_by}
                      </span>
                    )}
                  </div>

                  {isFaculty && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditForm(item)}
                        className="p-1.5 rounded-lg text-black hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 transition"
                        title="Edit Notice"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingId(item.id)}
                        className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 transition shadow-sm"
                        title="Delete Notice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Announcement Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingItem ? 'Edit Announcement' : 'Post New Announcement'}
        subtitle="Broadcast important notices, schedule adjustments, or campus alerts."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
              Headline / Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. CSE 4113 Class Rescheduled"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-semibold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
              Body Text *
            </label>
            <textarea
              rows="4"
              required
              placeholder="Provide full description of notice, location changes, or action items..."
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-medium text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                Posted Date *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-mono font-bold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                Priority Level *
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-semibold capitalize text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p} className="bg-white dark:bg-[#111111] text-black dark:text-emerald-50">
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                value={formData.expires}
                onChange={(e) => setFormData({ ...formData, expires: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-mono font-bold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
              Author / Department
            </label>
            <input
              type="text"
              placeholder="e.g. Head of CSE Department"
              value={formData.posted_by}
              onChange={(e) => setFormData({ ...formData, posted_by: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-semibold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-emerald-100 dark:border-emerald-800/50">
            <button
              type="button"
              onClick={closeForm}
              className="px-4 py-2 rounded-xl text-sm font-bold text-black dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
            >
              {saveMutation.isPending ? 'Saving...' : editingItem ? 'Update Notice' : 'Post Notice'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deleteMutation.mutate(deletingId)}
        title="Delete Notice"
        message="Are you sure you want to take down this announcement? The notice will immediately disappear from the student board and agent lookup."
        confirmText="Delete Notice"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
