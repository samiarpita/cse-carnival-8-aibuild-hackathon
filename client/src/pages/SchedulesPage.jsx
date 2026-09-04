import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  Calendar,
  Plus,
  Search,
  Trash2,
  Edit,
  Clock,
  MapPin,
  User,
} from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

const AUST_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

export default function SchedulesPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { isFaculty } = useAuth();

  const [search, setSearch] = useState('');
  const [selectedDay, setSelectedDay] = useState('all');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    course: '',
    title: '',
    day: 'Sunday',
    start_time: '08:00',
    end_time: '08:50',
    room: '',
    instructor: '',
    section: 'B',
  });

  // Query schedules
  const { data: schedules = [], isLoading, isError } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => api.getSchedules(),
  });

  // Create / Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingSchedule) {
        return await api.updateSchedule(editingSchedule.id, data);
      } else {
        return await api.createSchedule(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      addToast({
        type: 'success',
        title: editingSchedule ? 'Routine Updated' : 'Routine Created',
        message: `Class routine for ${formData.course} successfully saved to live database.`,
      });
      closeForm();
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Failed to save class routine.',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      addToast({
        type: 'success',
        title: 'Class Cancelled',
        message: 'Class routine permanently deleted from database.',
      });
      setDeletingId(null);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Failed to delete class routine.',
      });
    },
  });

  const openAddForm = () => {
    setEditingSchedule(null);
    setFormData({
      course: '',
      title: '',
      day: selectedDay !== 'all' ? selectedDay : 'Sunday',
      start_time: '08:00',
      end_time: '08:50',
      room: '',
      instructor: '',
      section: 'B',
    });
    setIsFormOpen(true);
  };

  const openEditForm = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      course: schedule.course || '',
      title: schedule.title || '',
      day: schedule.day || 'Sunday',
      start_time: schedule.start_time || '08:00',
      end_time: schedule.end_time || '08:50',
      room: schedule.room || '',
      instructor: schedule.instructor || '',
      section: schedule.section || 'B',
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingSchedule(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.course.trim() || !formData.title.trim() || !formData.room.trim()) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in course code, title, and room.',
      });
      return;
    }

    if (formData.start_time >= formData.end_time) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'End time must be strictly after start time.',
      });
      return;
    }

    saveMutation.mutate(formData);
  };

  // Filtered schedules
  const filtered = schedules.filter((s) => {
    const matchesDay = selectedDay === 'all' || s.day === selectedDay;
    const query = search.toLowerCase();
    const matchesSearch =
      !search ||
      s.course?.toLowerCase().includes(query) ||
      s.title?.toLowerCase().includes(query) ||
      s.room?.toLowerCase().includes(query) ||
      s.instructor?.toLowerCase().includes(query);
    return matchesDay && matchesSearch;
  });

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-7xl mx-auto w-full bg-white dark:bg-transparent">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
              <Calendar className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-black dark:text-white tracking-tight">
              Class Schedules
            </h1>
          </div>
          <p className="text-sm text-black dark:text-emerald-300/80 font-medium mt-1">
            Manage routines, room allocations, instructor schedules, and cancelled classes.
          </p>
        </div>

        {isFaculty && (
          <button
            onClick={openAddForm}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            Add Class Routine
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Day Selector Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200/80 dark:border-emerald-900/40 overflow-x-auto shadow-sm">
          <button
            onClick={() => setSelectedDay('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              selectedDay === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-black dark:text-emerald-200 hover:text-black dark:hover:text-white hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
            }`}
          >
            All Days ({schedules.length})
          </button>
          {AUST_DAYS.map((day) => {
            const count = schedules.filter((s) => s.day === day).length;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedDay === day
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-black dark:text-emerald-200 hover:text-black dark:hover:text-white hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                }`}
              >
                {day} <span className="opacity-80 text-[10px] font-bold">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-emerald-700/70 dark:text-emerald-400/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search course, room, instructor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800/60 text-sm text-black dark:text-emerald-50 placeholder-black/50 dark:placeholder-emerald-500/60 focus:outline-none focus:border-emerald-500 shadow-sm transition font-medium"
          />
        </div>
      </div>

      {/* Main Table / Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
          <p className="text-sm font-semibold text-black dark:text-emerald-400">Loading schedules from database...</p>
        </div>
      ) : isError ? (
        <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-center text-rose-800 dark:text-rose-300 font-medium">
          Failed to load class schedules. Please verify backend connection.
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No classes scheduled"
          description={
            search || selectedDay !== 'all'
              ? 'No classes match your current search or day filter.'
              : isFaculty ? 'Add your first class routine to get started.' : 'No class routines scheduled.'
          }
          actionText={isFaculty ? "Add Class" : undefined}
          onAction={isFaculty ? openAddForm : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="glass-card glass-card-hover rounded-2xl p-5 flex flex-col justify-between relative group"
            >
              <div>
                {/* Header tag and Day */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold font-mono bg-emerald-100 dark:bg-emerald-900/40 text-emerald-950 dark:text-emerald-200 border border-emerald-300/80 dark:border-emerald-700/40 shadow-sm">
                    {item.course}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white dark:bg-[#161616] text-black dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/60">
                      {item.day}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white dark:bg-[#161616] text-black dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/60">
                      Sec: {item.section || 'All'}
                    </span>
                  </div>
                </div>

                <h3 className="font-extrabold text-black dark:text-white text-base leading-snug line-clamp-2 mb-3">
                  {item.title}
                </h3>

                {/* Details List */}
                <div className="space-y-2 text-xs text-black dark:text-emerald-100/90 font-semibold">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                    <span className="font-mono">
                      {item.start_time} – {item.end_time}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
                    <span>Room: <strong className="text-black dark:text-white font-extrabold">{item.room}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-black dark:text-emerald-400/80 shrink-0" />
                    <span className="truncate">{item.instructor || 'TBA'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons (Faculty Only) */}
              {isFaculty && (
                <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-emerald-100 dark:border-emerald-900/30">
                  <button
                    onClick={() => openEditForm(item)}
                    className="p-1.5 rounded-lg text-black hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 transition"
                    title="Edit Class Routine"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingId(item.id)}
                    className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 transition shadow-sm"
                    title="Cancel / Delete Class"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal Form */}
      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingSchedule ? 'Edit Class Schedule' : 'Add New Class Routine'}
        subtitle="Specify exact course code, time slot, and room allocation."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                Course Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CSE 4113"
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm text-black dark:text-emerald-50 font-semibold focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                Section
              </label>
              <input
                type="text"
                placeholder="e.g. B or B1/B2"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm text-black dark:text-emerald-50 font-semibold focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
              Course Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Artificial Intelligence"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm text-black dark:text-emerald-50 font-semibold focus:outline-none focus:border-emerald-500 shadow-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                Day of Week *
              </label>
              <select
                value={formData.day}
                onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-semibold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
              >
                {AUST_DAYS.map((d) => (
                  <option key={d} value={d} className="bg-white dark:bg-[#111111] text-black dark:text-emerald-50">
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                Start Time (24h) *
              </label>
              <input
                type="text"
                required
                placeholder="08:00"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-mono font-bold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                End Time (24h) *
              </label>
              <input
                type="text"
                required
                placeholder="08:50"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-mono font-bold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                Room Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 7A03"
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm text-black dark:text-emerald-50 font-semibold focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                Instructor
              </label>
              <input
                type="text"
                placeholder="e.g. Md. Ashraful Islam"
                value={formData.instructor}
                onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm text-black dark:text-emerald-50 font-semibold focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>
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
              {saveMutation.isPending ? 'Saving...' : editingSchedule ? 'Update Schedule' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deleteMutation.mutate(deletingId)}
        title="Cancel Class Routine"
        message="Are you sure you want to cancel and delete this class routine? This change immediately commits to the database and unblocks live student queries."
        confirmText="Delete Routine"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
