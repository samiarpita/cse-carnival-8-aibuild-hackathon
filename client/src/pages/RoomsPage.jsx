import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  Building2,
  Plus,
  Search,
  Trash2,
  Edit,
  CalendarPlus,
  Users,
  Layers,
  Calendar,
  X,
} from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

const ROOM_TYPES = ['classroom', 'lab', 'seminar'];
const EQUIPMENT_OPTIONS = [
  'whiteboard',
  'projector',
  'AC',
  'smart board',
  'computers',
  'microphone',
  'podium',
  'document camera',
];

export default function RoomsPage() {
  const { isFaculty } = useAuth();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [equipmentFilter, setEquipmentFilter] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Booking Modal
  const [bookingRoom, setBookingRoom] = useState(null);
  const [cancellingBooking, setCancellingBooking] = useState(null);

  // Form States
  const [formData, setFormData] = useState({
    room_number: '',
    type: 'classroom',
    capacity: 40,
    equipment: ['whiteboard', 'projector', 'AC'],
    floor: 7,
    status: 'available',
  });

  const [bookingData, setBookingData] = useState({
    date: new Date().toISOString().split('T')[0],
    start_time: '14:00',
    end_time: '16:00',
    booked_by: '',
    purpose: '',
  });

  // Query rooms
  const { data: rooms = [], isLoading, isError } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => api.getRooms(),
  });

  // Save Room Mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingRoom) {
        return await api.updateRoom(editingRoom.id, data);
      } else {
        return await api.createRoom(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      addToast({
        type: 'success',
        title: editingRoom ? 'Room Updated' : 'Room Added',
        message: `Room ${formData.room_number} details saved to database.`,
      });
      closeForm();
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Failed to save room details.',
      });
    },
  });

  // Delete Room Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteRoom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      addToast({
        type: 'success',
        title: 'Room Deleted',
        message: 'Room permanently removed from database.',
      });
      setDeletingId(null);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Failed to delete room.',
      });
    },
  });

  // Book Room Mutation
  const bookMutation = useMutation({
    mutationFn: ({ roomId, booking }) => api.bookRoom(roomId, booking),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      addToast({
        type: 'success',
        title: 'Room Booked',
        message: data.message || `Successfully booked ${bookingRoom?.room_number}.`,
      });
      setBookingRoom(null);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Booking Conflict (409)',
        message: err.message || 'This room is already booked during this time slot.',
      });
    },
  });

  // Cancel Booking Mutation
  const cancelBookingMutation = useMutation({
    mutationFn: ({ roomId, bookingId }) => api.cancelBooking(roomId, bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      addToast({
        type: 'success',
        title: 'Booking Cancelled',
        message: 'Reservation has been released from live calendar.',
      });
      setCancellingBooking(null);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Cancellation Failed',
        message: err.message || 'Failed to cancel booking.',
      });
    },
  });

  const openAddForm = () => {
    setEditingRoom(null);
    setFormData({
      room_number: '',
      type: 'classroom',
      capacity: 40,
      equipment: ['whiteboard', 'projector', 'AC'],
      floor: 7,
      status: 'available',
    });
    setIsFormOpen(true);
  };

  const openEditForm = (room) => {
    setEditingRoom(room);
    setFormData({
      room_number: room.room_number || '',
      type: room.type || 'classroom',
      capacity: room.capacity || 40,
      equipment: Array.isArray(room.equipment) ? room.equipment : [],
      floor: room.floor !== undefined ? room.floor : 7,
      status: room.status || 'available',
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingRoom(null);
  };

  const openBookingModal = (room) => {
    setBookingRoom(room);
    setBookingData({
      date: new Date().toISOString().split('T')[0],
      start_time: '14:00',
      end_time: '16:00',
      booked_by: '',
      purpose: '',
    });
  };

  const handleEquipmentToggle = (item) => {
    setFormData((prev) => {
      const exists = prev.equipment.includes(item);
      if (exists) {
        return { ...prev, equipment: prev.equipment.filter((e) => e !== item) };
      } else {
        return { ...prev, equipment: [...prev.equipment, item] };
      }
    });
  };

  const handleRoomSubmit = (e) => {
    e.preventDefault();
    if (!formData.room_number.trim()) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Room number is required.' });
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    if (!bookingData.booked_by.trim()) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Please enter person/club name.' });
      return;
    }
    if (bookingData.start_time >= bookingData.end_time) {
      addToast({ type: 'error', title: 'Validation Error', message: 'End time must be strictly after start time.' });
      return;
    }

    bookMutation.mutate({
      roomId: bookingRoom.id,
      booking: bookingData,
    });
  };

  // Filtered rooms
  const filtered = rooms.filter((r) => {
    const matchesType = selectedType === 'all' || r.type === selectedType;
    const matchesEquip =
      !equipmentFilter ||
      (r.equipment || []).some((e) => e.toLowerCase().includes(equipmentFilter.toLowerCase()));
    const query = search.toLowerCase();
    const matchesSearch =
      !search ||
      r.room_number?.toLowerCase().includes(query) ||
      r.type?.toLowerCase().includes(query) ||
      (r.equipment || []).some((e) => e.toLowerCase().includes(query));
    return matchesType && matchesEquip && matchesSearch;
  });

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-7xl mx-auto w-full bg-white dark:bg-transparent">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
              <Building2 className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-black dark:text-white tracking-tight">
              Campus Rooms & Labs
            </h1>
          </div>
          <p className="text-sm text-black dark:text-emerald-300/80 font-medium mt-1">
            Browse lecture halls, labs, seminar spaces, and manage reservations with conflict detection.
          </p>
        </div>

        {isFaculty && (
          <button
            onClick={openAddForm}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            Add Room
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Room Type Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-900/40 overflow-x-auto shadow-sm">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              selectedType === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-black dark:text-emerald-200 hover:text-black dark:hover:text-white hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
            }`}
          >
            All Types ({rooms.length})
          </button>
          {ROOM_TYPES.map((type) => {
            const count = rooms.filter((r) => r.type === type).length;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition ${
                  selectedType === type
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-black dark:text-emerald-200 hover:text-black dark:hover:text-white hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                }`}
              >
                {type}s <span className="opacity-80 text-[10px] font-bold">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search & Equipment filters */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={equipmentFilter}
            onChange={(e) => setEquipmentFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold text-black dark:text-emerald-200 focus:outline-none focus:border-emerald-500 shadow-sm"
          >
            <option value="" className="bg-white text-black">All Equipment</option>
            {EQUIPMENT_OPTIONS.map((opt) => (
              <option key={opt} value={opt} className="bg-white text-black">
                Has {opt}
              </option>
            ))}
          </select>

          <div className="relative flex-1 md:w-60">
            <Search className="w-4 h-4 text-emerald-700 dark:text-emerald-400/60 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search room, capacity..."
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
          <p className="text-sm font-semibold text-black dark:text-emerald-400">Loading campus rooms from database...</p>
        </div>
      ) : isError ? (
        <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-center text-rose-800 dark:text-rose-300 font-medium">
          Failed to load rooms. Please verify backend connection.
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No rooms found"
          description="No rooms match your filter criteria or search query."
          actionText={isFaculty ? "Add Room" : undefined}
          onAction={isFaculty ? openAddForm : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((room) => (
            <div
              key={room.id}
              className="glass-card glass-card-hover rounded-2xl p-5 flex flex-col justify-between relative group"
            >
              <div>
                {/* Card Top Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-extrabold font-mono text-black dark:text-white tracking-tight">
                      {room.room_number}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/40 text-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/40">
                      {room.type}
                    </span>
                  </div>
                  <StatusBadge status={room.status} />
                </div>

                {/* Capacity & Floor Meta */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-white dark:bg-[#161616] border border-emerald-100 dark:border-emerald-900/40 mb-3 text-xs">
                  <div className="flex items-center gap-2 text-black dark:text-emerald-100 font-semibold">
                    <Users className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    <span>
                      Capacity: <strong className="font-extrabold text-black dark:text-white">{room.capacity}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-black dark:text-emerald-100 font-semibold">
                    <Layers className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                    <span>
                      Floor: <strong className="font-extrabold text-black dark:text-white">{room.floor || 7}</strong>
                    </span>
                  </div>
                </div>

                {/* Equipment Chips */}
                <div className="mb-4">
                  <span className="text-[11px] font-bold text-black dark:text-emerald-400/80 uppercase tracking-wider block mb-1.5">
                    Equipment
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(room.equipment || []).map((eq) => (
                      <span
                        key={eq}
                        className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-white dark:bg-[#111111] text-black dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/60 shadow-sm"
                      >
                        {eq}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bookings Section */}
                <div className="border-t border-emerald-100 dark:border-emerald-900/40 pt-3">
                  <div className="flex items-center justify-between text-xs font-bold text-black dark:text-emerald-100 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                      Active Bookings ({room.bookings?.length || 0})
                    </span>
                  </div>

                  {room.bookings && room.bookings.length > 0 ? (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {room.bookings.map((b) => (
                        <div
                          key={b.booking_id}
                          className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#161616] border border-emerald-200 dark:border-emerald-800/60 text-[11px] shadow-sm"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-bold text-black dark:text-white truncate">
                              {b.purpose || 'Reserved Slot'}
                            </p>
                            <p className="text-black/80 dark:text-emerald-300 font-mono font-semibold">
                              {b.date} • {b.start_time}–{b.end_time}
                            </p>
                            <p className="text-[10px] text-black/70 dark:text-emerald-400/70 font-medium truncate">
                              By: {b.booked_by}
                            </p>
                          </div>
                          <button
                            onClick={() => setCancellingBooking({ roomId: room.id, bookingId: b.booking_id })}
                            className="p-1 rounded-lg text-black hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition shrink-0"
                            title="Cancel Booking"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-black/70 dark:text-emerald-400/70 italic font-medium">
                      No current reservations for this room.
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-emerald-100 dark:border-emerald-900/30">
                <button
                  onClick={() => openBookingModal(room)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/15 transition-all hover:scale-[1.02]"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  Book Slot
                </button>

                {isFaculty && (
                  <>
                    <button
                      onClick={() => openEditForm(room)}
                      className="p-2 rounded-xl text-black hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 transition"
                      title="Edit Room"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(room.id)}
                      className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 transition shadow-sm"
                      title="Delete Room"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Room Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingRoom ? `Edit Room ${editingRoom.room_number}` : 'Add New Room'}
        subtitle="Set capacity, type, and equipment checklist for room allocations."
      >
        <form onSubmit={handleRoomSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                Room Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 7A08"
                value={formData.room_number}
                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-semibold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                Room Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-semibold capitalize text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
              >
                {ROOM_TYPES.map((t) => (
                  <option key={t} value={t} className="bg-white dark:bg-[#111111] text-black dark:text-emerald-50">
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                Capacity (People) *
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
                Floor
              </label>
              <input
                type="number"
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: Number(e.target.value) })}
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
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-semibold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
              >
                <option value="available" className="bg-white dark:bg-[#111111] text-black dark:text-emerald-50">Available</option>
                <option value="unavailable" className="bg-white dark:bg-[#111111] text-black dark:text-emerald-50">Unavailable</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-2">
              Available Equipment
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EQUIPMENT_OPTIONS.map((opt) => {
                const checked = formData.equipment.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleEquipmentToggle(opt)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold border transition text-left ${
                      checked
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-950 dark:text-emerald-200 border-emerald-400 dark:border-emerald-700/50 shadow-sm'
                        : 'bg-white dark:bg-[#111111] text-black dark:text-emerald-300/80 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                        checked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-emerald-700'
                      }`}
                    >
                      {checked && '✓'}
                    </span>
                    <span className="capitalize">{opt}</span>
                  </button>
                );
              })}
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
              {saveMutation.isPending ? 'Saving...' : editingRoom ? 'Update Room' : 'Add Room'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Book Room Modal */}
      <Modal
        isOpen={Boolean(bookingRoom)}
        onClose={() => setBookingRoom(null)}
        title={`Book Room ${bookingRoom?.room_number}`}
        subtitle="Automatic 409 conflict detection rejects overlapping time slots."
      >
        <form onSubmit={handleBookingSubmit} className="space-y-4">
          <div className="p-3 rounded-xl bg-white dark:bg-[#161616] border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs">
            <span className="text-black dark:text-emerald-200 font-semibold">
              Type: <strong className="capitalize text-black dark:text-white font-extrabold">{bookingRoom?.type}</strong>
            </span>
            <span className="text-black dark:text-emerald-200 font-semibold">
              Capacity: <strong className="text-black dark:text-white font-extrabold">{bookingRoom?.capacity} max</strong>
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
              Booked By (Person / Organization) *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. AUST Robotics Club"
              value={bookingData.booked_by}
              onChange={(e) => setBookingData({ ...bookingData, booked_by: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-semibold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
              Booking Purpose
            </label>
            <input
              type="text"
              placeholder="e.g. AI Hackathon Mentorship Workshop"
              value={bookingData.purpose}
              onChange={(e) => setBookingData({ ...bookingData, purpose: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-semibold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                Date (YYYY-MM-DD) *
              </label>
              <input
                type="date"
                required
                value={bookingData.date}
                onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-mono font-bold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                Start Time *
              </label>
              <input
                type="text"
                required
                placeholder="14:00"
                value={bookingData.start_time}
                onChange={(e) => setBookingData({ ...bookingData, start_time: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-mono font-bold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                End Time *
              </label>
              <input
                type="text"
                required
                placeholder="16:00"
                value={bookingData.end_time}
                onChange={(e) => setBookingData({ ...bookingData, end_time: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-mono font-bold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-emerald-100 dark:border-emerald-800/50">
            <button
              type="button"
              onClick={() => setBookingRoom(null)}
              className="px-4 py-2 rounded-xl text-sm font-bold text-black dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={bookMutation.isPending}
              className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
            >
              {bookMutation.isPending ? 'Verifying Conflict...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Room Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deleteMutation.mutate(deletingId)}
        title="Delete Room"
        message="Are you sure you want to permanently delete this room and all associated reservations from the database?"
        confirmText="Delete Room"
        isLoading={deleteMutation.isPending}
      />

      {/* Cancel Booking Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(cancellingBooking)}
        onClose={() => setCancellingBooking(null)}
        onConfirm={() =>
          cancellingBooking &&
          cancelBookingMutation.mutate({
            roomId: cancellingBooking.roomId,
            bookingId: cancellingBooking.bookingId,
          })
        }
        title="Cancel Reservation"
        message="Are you sure you want to release this booking? The slot will immediately become available for other campus bookings."
        confirmText="Release Booking"
        isLoading={cancelBookingMutation.isPending}
      />
    </div>
  );
}
