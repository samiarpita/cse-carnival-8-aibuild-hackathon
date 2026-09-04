import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  PartyPopper,
  Plus,
  Search,
  Trash2,
  Edit,
  UserPlus,
  Users,
  MapPin,
  Calendar,
  Clock,
  X,
} from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

const EVENT_STATUSES = ['all', 'upcoming', 'ongoing', 'full', 'completed', 'cancelled'];

export default function EventsPage() {
  const { isFaculty } = useAuth();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Registration Modal
  const [registeringEvent, setRegisteringEvent] = useState(null);
  const [cancellingReg, setCancellingReg] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '10:00',
    end_time: '13:00',
    end_date: new Date().toISOString().split('T')[0],
    venue: '7C01',
    organizer: 'AUSTPIC',
    capacity: 60,
    status: 'upcoming',
  });

  const [studentData, setStudentData] = useState({
    student_id: '',
    name: '',
  });

  // Query events
  const { data: events = [], isLoading, isError } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.getEvents(),
  });

  // Save Event Mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingEvent) {
        return await api.updateEvent(editingEvent.id, data);
      } else {
        return await api.createEvent(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      addToast({
        type: 'success',
        title: editingEvent ? 'Event Updated' : 'Event Published',
        message: `Event '${formData.name}' successfully saved.`,
      });
      closeForm();
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Failed to save event.',
      });
    },
  });

  // Delete Event Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      addToast({
        type: 'success',
        title: 'Event Deleted',
        message: 'Event permanently removed from database.',
      });
      setDeletingId(null);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Failed to delete event.',
      });
    },
  });

  // Register Student Mutation
  const registerMutation = useMutation({
    mutationFn: ({ eventId, registration }) => api.registerForEvent(eventId, registration),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      addToast({
        type: 'success',
        title: 'Registered Successfully',
        message: data.message || `Student ${studentData.name} registered.`,
      });
      setRegisteringEvent(null);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Registration Rejected (409)',
        message: err.message || 'Event has reached full capacity or student is already registered.',
      });
    },
  });

  // Cancel Registration Mutation
  const cancelRegMutation = useMutation({
    mutationFn: ({ eventId, studentId }) => api.cancelEventRegistration(eventId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      addToast({
        type: 'success',
        title: 'Registration Cancelled',
        message: 'Student registration removed and seat released.',
      });
      setCancellingReg(null);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Cancellation Failed',
        message: err.message || 'Failed to cancel registration.',
      });
    },
  });

  const openAddForm = () => {
    setEditingEvent(null);
    setFormData({
      name: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      start_time: '10:00',
      end_time: '13:00',
      end_date: new Date().toISOString().split('T')[0],
      venue: '7C01',
      organizer: 'AUST CSE Society',
      capacity: 60,
      status: 'upcoming',
    });
    setIsFormOpen(true);
  };

  const openEditForm = (evt) => {
    setEditingEvent(evt);
    setFormData({
      name: evt.name || '',
      description: evt.description || '',
      date: evt.date || '',
      start_time: evt.start_time || '10:00',
      end_time: evt.end_time || '13:00',
      end_date: evt.end_date || evt.date,
      venue: evt.venue || '7C01',
      organizer: evt.organizer || '',
      capacity: evt.capacity || 60,
      status: evt.status || 'upcoming',
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingEvent(null);
  };

  const openRegisterModal = (evt) => {
    setRegisteringEvent(evt);
    setStudentData({ student_id: '', name: '' });
  };

  const handleEventSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.date || !formData.venue.trim()) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Name, date, and venue are required.' });
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!studentData.student_id.trim() || !studentData.name.trim()) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Student ID and name are required.' });
      return;
    }
    registerMutation.mutate({
      eventId: registeringEvent.id,
      registration: studentData,
    });
  };

  // Filtered events
  const filtered = events.filter((evt) => {
    const matchesStatus = selectedStatus === 'all' || evt.status === selectedStatus;
    const query = search.toLowerCase();
    const matchesSearch =
      !search ||
      evt.name?.toLowerCase().includes(query) ||
      evt.venue?.toLowerCase().includes(query) ||
      evt.organizer?.toLowerCase().includes(query) ||
      evt.description?.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-7xl mx-auto w-full bg-white dark:bg-transparent">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
              <PartyPopper className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-black dark:text-white tracking-tight">
              Campus Events & Workshops
            </h1>
          </div>
          <p className="text-sm text-black dark:text-emerald-300/80 font-medium mt-1">
            Browse upcoming club events, hackathons, and guest seminars with real-time capacity management.
          </p>
        </div>

        {isFaculty && (
          <button
            onClick={openAddForm}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-900/40 overflow-x-auto shadow-sm">
          {EVENT_STATUSES.map((st) => {
            const count = st === 'all' ? events.length : events.filter((e) => e.status === st).length;
            return (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition ${
                  selectedStatus === st
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-black dark:text-emerald-200 hover:text-black dark:hover:text-white hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                }`}
              >
                {st} <span className="opacity-80 text-[10px] font-bold">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-emerald-700 dark:text-emerald-400/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search event, venue, organizer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800/60 text-sm font-semibold text-black dark:text-emerald-50 placeholder-black/50 dark:placeholder-emerald-500/60 focus:outline-none focus:border-emerald-500 shadow-sm"
          />
        </div>
      </div>

      {/* Main Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
          <p className="text-sm font-semibold text-black dark:text-emerald-400">Loading campus events from database...</p>
        </div>
      ) : isError ? (
        <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-center text-rose-800 dark:text-rose-300 font-medium">
          Failed to load events. Please verify backend connection.
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No events found"
          description="No campus events match your current filter selection."
          actionText={isFaculty ? "Create Event" : undefined}
          onAction={isFaculty ? openAddForm : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((evt) => {
            const isFull = evt.registered >= evt.capacity || evt.status === 'full';
            const percentFilled = Math.min(100, Math.round((evt.registered / evt.capacity) * 100));

            return (
              <div
                key={evt.id}
                className="glass-card glass-card-hover rounded-2xl p-5 flex flex-col justify-between relative group"
              >
                <div>
                  {/* Top Meta & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-900/40 text-black dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/40">
                      {evt.organizer || 'Campus Club'}
                    </span>
                    <StatusBadge status={evt.status} />
                  </div>

                  <h3 className="font-extrabold text-black dark:text-white text-base leading-snug line-clamp-2 mb-2">
                    {evt.name}
                  </h3>

                  <p className="text-xs text-black dark:text-emerald-100/80 line-clamp-2 mb-4 leading-relaxed font-semibold">
                    {evt.description || 'No description provided.'}
                  </p>

                  {/* Event Timing & Venue */}
                  <div className="space-y-2 text-xs text-black dark:text-emerald-100 font-semibold mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                      <span className="font-mono">
                        {evt.date} {evt.end_date && evt.end_date !== evt.date ? `to ${evt.end_date}` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                      <span className="font-mono">
                        {evt.start_time} – {evt.end_time}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-teal-700 dark:teal-400" />
                      <span>Venue: <strong className="text-black dark:text-white font-extrabold">{evt.venue}</strong></span>
                    </div>
                  </div>

                  {/* Capacity Progress Bar */}
                  <div className="p-3 rounded-xl bg-white dark:bg-[#161616] border border-emerald-100 dark:border-emerald-900/40 mb-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-black dark:text-emerald-200 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                        Registrations
                      </span>
                      <span className="font-mono font-extrabold text-black dark:text-emerald-300">
                        {evt.registered} / {evt.capacity} ({percentFilled}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-emerald-200/60 dark:bg-emerald-900/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isFull
                            ? 'bg-rose-500'
                            : percentFilled > 80
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percentFilled}%` }}
                      />
                    </div>
                  </div>

                  {/* Registered Students Accordion List */}
                  {evt.registrations && evt.registrations.length > 0 && (
                    <div className="border-t border-emerald-100 dark:border-emerald-900/40 pt-2.5">
                      <span className="text-[11px] font-bold text-black dark:text-emerald-300 block mb-1.5">
                        Enrolled Students ({evt.registrations.length})
                      </span>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {evt.registrations.map((r) => (
                          <div
                            key={r.student_id}
                            className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-[#161616] border border-emerald-200 dark:border-emerald-800/60 text-[10px] shadow-sm"
                          >
                            <div>
                              <span className="font-bold text-black dark:text-white mr-1.5">{r.name}</span>
                              <span className="font-mono text-black/70 dark:text-emerald-400/80">({r.student_id})</span>
                            </div>
                            <button
                              onClick={() => setCancellingReg({ eventId: evt.id, studentId: r.student_id })}
                              className="text-black hover:text-rose-700 dark:hover:text-rose-400 p-0.5 rounded transition"
                              title="Cancel Registration"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-emerald-100 dark:border-emerald-900/30">
                  <button
                    onClick={() => openRegisterModal(evt)}
                    disabled={isFull}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all shadow-md ${
                      isFull
                        ? 'bg-neutral-200 dark:bg-emerald-950/30 text-neutral-500 dark:text-emerald-600/50 cursor-not-allowed border border-neutral-300 dark:border-emerald-900/30'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/15 hover:scale-[1.02]'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {isFull ? 'At Capacity' : 'Register Student'}
                  </button>

                  {isFaculty && (
                    <>
                      <button
                        onClick={() => openEditForm(evt)}
                        className="p-2 rounded-xl text-black hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 transition"
                        title="Edit Event"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingId(evt.id)}
                        className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 transition shadow-sm"
                        title="Delete Event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Event Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingEvent ? 'Edit Campus Event' : 'Publish New Campus Event'}
        subtitle="Manage event schedule, venue, capacity, and registration status."
      >
        <form onSubmit={handleEventSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
              Event Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. AUST AI Build Hackathon"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-semibold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
              Description
            </label>
            <textarea
              rows="3"
              placeholder="Describe event details, prerequisites, and agenda..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-medium text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-mono font-bold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-mono font-bold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                Start Time (24h) *
              </label>
              <input
                type="text"
                required
                placeholder="09:00"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-mono font-bold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                End Time (24h) *
              </label>
              <input
                type="text"
                required
                placeholder="17:00"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-mono font-bold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                Venue / Room *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 7C01"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-semibold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                Max Capacity *
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-semibold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-semibold capitalize text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
              >
                {EVENT_STATUSES.filter((s) => s !== 'all').map((s) => (
                  <option key={s} value={s} className="bg-white dark:bg-[#111111] text-black dark:text-emerald-50">
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
              Organizer
            </label>
            <input
              type="text"
              placeholder="e.g. AUSTPIC / CSE Department"
              value={formData.organizer}
              onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
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
              {saveMutation.isPending ? 'Saving...' : editingEvent ? 'Update Event' : 'Publish Event'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Register Student Modal */}
      <Modal
        isOpen={Boolean(registeringEvent)}
        onClose={() => setRegisteringEvent(null)}
        title={`Register for ${registeringEvent?.name}`}
        subtitle={`Current Capacity: ${registeringEvent?.registered} / ${registeringEvent?.capacity} seats filled.`}
      >
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
              Student ID *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 20-40532"
              value={studentData.student_id}
              onChange={(e) => setStudentData({ ...studentData, student_id: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-mono font-bold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
              Student Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sakibul Hassan"
              value={studentData.name}
              onChange={(e) => setStudentData({ ...studentData, name: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-semibold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-emerald-100 dark:border-emerald-800/50">
            <button
              type="button"
              onClick={() => setRegisteringEvent(null)}
              className="px-4 py-2 rounded-xl text-sm font-bold text-black dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
            >
              {registerMutation.isPending ? 'Verifying Capacity...' : 'Confirm Registration'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Event Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deleteMutation.mutate(deletingId)}
        title="Delete Campus Event"
        message="Are you sure you want to delete this event? All student registrations for this event will also be removed."
        confirmText="Delete Event"
        isLoading={deleteMutation.isPending}
      />

      {/* Cancel Registration Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(cancellingReg)}
        onClose={() => setCancellingReg(null)}
        onConfirm={() =>
          cancellingReg &&
          cancelRegMutation.mutate({
            eventId: cancellingReg.eventId,
            studentId: cancellingReg.studentId,
          })
        }
        title="Cancel Student Registration"
        message={`Are you sure you want to cancel ${cancellingReg?.studentName}'s registration? Their seat will immediately open up.`}
        confirmText="Cancel Registration"
        isLoading={cancelRegMutation.isPending}
      />
    </div>
  );
}
