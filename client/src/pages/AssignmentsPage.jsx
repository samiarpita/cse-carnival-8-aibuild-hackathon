import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  BookOpenCheck,
  Plus,
  Search,
  Trash2,
  Edit,
  Clock,
  Award,
  UploadCloud,
  CheckCircle2,
} from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

const STATUS_FILTERS = ['all', 'pending', 'submitted'];

export default function AssignmentsPage() {
  const { isFaculty } = useAuth();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    course: '',
    course_title: '',
    title: '',
    description: '',
    assigned_date: new Date().toISOString().split('T')[0],
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    submission_platform: 'Google Classroom',
    status: 'pending',
    marks: 10,
  });

  // Query Assignments
  const { data: assignments = [], isLoading, isError } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => api.getAssignments(),
  });

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingItem) {
        return await api.updateAssignment(editingItem.id, data);
      } else {
        return await api.createAssignment(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      addToast({
        type: 'success',
        title: editingItem ? 'Assignment Updated' : 'Assignment Created',
        message: `Task for ${formData.course} saved.`,
      });
      closeForm();
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Failed to save assignment.',
      });
    },
  });

  // Quick Status Toggle Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, newStatus }) => api.updateAssignment(id, { status: newStatus }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      addToast({
        type: 'success',
        title: 'Status Updated',
        message: `Assignment marked as ${variables.newStatus}.`,
      });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      addToast({
        type: 'success',
        title: 'Assignment Deleted',
        message: 'Assignment removed from database.',
      });
      setDeletingId(null);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Failed to delete assignment.',
      });
    },
  });

  const openAddForm = () => {
    setEditingItem(null);
    setFormData({
      course: '',
      course_title: '',
      title: '',
      description: '',
      assigned_date: new Date().toISOString().split('T')[0],
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      submission_platform: 'Google Classroom',
      status: 'pending',
      marks: 10,
    });
    setIsFormOpen(true);
  };

  const openEditForm = (item) => {
    setEditingItem(item);
    setFormData({
      course: item.course || '',
      course_title: item.course_title || '',
      title: item.title || '',
      description: item.description || '',
      assigned_date: item.assigned_date || '',
      deadline: item.deadline || '',
      submission_platform: item.submission_platform || 'Google Classroom',
      status: item.status || 'pending',
      marks: item.marks || 10,
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.course.trim() || !formData.title.trim() || !formData.deadline) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Course, title, and deadline are required.' });
      return;
    }
    saveMutation.mutate(formData);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Filter assignments
  const filtered = assignments.filter((item) => {
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    const query = search.toLowerCase();
    const matchesSearch =
      !search ||
      item.course?.toLowerCase().includes(query) ||
      item.course_title?.toLowerCase().includes(query) ||
      item.title?.toLowerCase().includes(query) ||
      item.submission_platform?.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-7xl mx-auto w-full bg-white dark:bg-transparent">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
              <BookOpenCheck className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-black dark:text-white tracking-tight">
              Assignments & Deadlines
            </h1>
          </div>
          <p className="text-sm text-black dark:text-emerald-300/80 font-medium mt-1">
            Track coursework deadlines, submission portals, marks, and completion status.
          </p>
        </div>

        {isFaculty && (
          <button
            onClick={openAddForm}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            Add Assignment
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-900/40 overflow-x-auto shadow-sm">
          {STATUS_FILTERS.map((st) => {
            const count = st === 'all' ? assignments.length : assignments.filter((a) => a.status === st).length;
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
            placeholder="Search course, assignment..."
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
          <p className="text-sm font-semibold text-black dark:text-emerald-400">Loading assignments from database...</p>
        </div>
      ) : isError ? (
        <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-center text-rose-800 dark:text-rose-300 font-medium">
          Failed to load assignments. Please verify backend connection.
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No assignments found"
          description="No coursework matching your current search or status filter."
          actionText={isFaculty ? "Add Assignment" : undefined}
          onAction={isFaculty ? openAddForm : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => {
            const isOverdue = item.status === 'pending' && item.deadline < todayStr;

            return (
              <div
                key={item.id}
                className="glass-card glass-card-hover rounded-2xl p-5 flex flex-col justify-between relative group"
              >
                <div>
                  {/* Top Header with Course Badge & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-emerald-100 dark:bg-emerald-900/40 text-black dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/40">
                      {item.course}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>

                  <h3 className="font-extrabold text-black dark:text-white text-base leading-snug line-clamp-2 mb-1.5">
                    {item.title}
                  </h3>

                  {item.course_title && (
                    <p className="text-xs font-bold text-black dark:text-emerald-300 mb-2.5">
                      {item.course_title}
                    </p>
                  )}

                  <p className="text-xs text-black dark:text-emerald-100/80 line-clamp-2 mb-4 leading-relaxed font-semibold">
                    {item.description || 'No detailed instructions provided.'}
                  </p>

                  {/* Deadline & Marks Meta */}
                  <div className="space-y-2 text-xs text-black dark:text-emerald-100 font-semibold mb-4">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#161616] border border-emerald-100 dark:border-emerald-900/40">
                      <div className="flex items-center gap-2">
                        <Clock className={`w-4 h-4 ${isOverdue ? 'text-rose-600 animate-pulse' : 'text-emerald-700 dark:text-emerald-400'}`} />
                        <div>
                          <p className="text-[10px] text-black/80 dark:text-emerald-400/80 uppercase tracking-wider font-bold">
                            Deadline
                          </p>
                          <p className={`font-mono font-extrabold ${isOverdue ? 'text-rose-700 dark:text-rose-400' : 'text-black dark:text-white'}`}>
                            {item.deadline} {isOverdue && '(Overdue)'}
                          </p>
                        </div>
                      </div>

                      {item.marks && (
                        <div className="text-right">
                          <p className="text-[10px] text-black/80 dark:text-emerald-400/80 uppercase tracking-wider font-bold flex items-center gap-1 justify-end">
                            <Award className="w-3 h-3 text-amber-600" /> Marks
                          </p>
                          <p className="font-mono font-extrabold text-black dark:text-white">
                            {item.marks} pts
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-black dark:text-emerald-300 font-medium">
                      <UploadCloud className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                      <span>Platform: <strong className="text-black dark:text-emerald-100 font-bold">{item.submission_platform || 'Online'}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Bottom Toggle & Actions */}
                <div className="flex items-center justify-between gap-2 pt-4 border-t border-emerald-100 dark:border-emerald-900/30">
                  <button
                    onClick={() =>
                      toggleStatusMutation.mutate({
                        id: item.id,
                        newStatus: item.status === 'submitted' ? 'pending' : 'submitted',
                      })
                    }
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all shadow-sm ${
                      item.status === 'submitted'
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-black dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/50'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/15 hover:scale-[1.02]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {item.status === 'submitted' ? 'Mark Pending' : 'Mark Done'}
                  </button>

                  {isFaculty && (
                    <>
                      <button
                        onClick={() => openEditForm(item)}
                        className="p-2 rounded-xl text-black hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 transition"
                        title="Edit Assignment"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingId(item.id)}
                        className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 transition shadow-sm"
                        title="Delete Assignment"
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

      {/* Add / Edit Assignment Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingItem ? 'Edit Assignment' : 'Add New Assignment'}
        subtitle="Manage course deadlines, instructions, and target points."
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
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-semibold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                Course Full Title
              </label>
              <input
                type="text"
                placeholder="e.g. Artificial Intelligence"
                value={formData.course_title}
                onChange={(e) => setFormData({ ...formData, course_title: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-semibold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
              Assignment Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Lab Report 1: Search Algorithms"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-semibold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
              Description & Requirements
            </label>
            <textarea
              rows="3"
              placeholder="Enter instructions, format requirements, and guidelines..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                Assigned Date
              </label>
              <input
                type="date"
                value={formData.assigned_date}
                onChange={(e) => setFormData({ ...formData, assigned_date: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-mono font-bold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                Deadline *
              </label>
              <input
                type="date"
                required
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-mono font-bold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                Submission Portal
              </label>
              <input
                type="text"
                placeholder="Google Classroom"
                value={formData.submission_platform}
                onChange={(e) => setFormData({ ...formData, submission_platform: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-semibold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-black dark:text-emerald-100 mb-1">
                Total Marks
              </label>
              <input
                type="number"
                value={formData.marks}
                onChange={(e) => setFormData({ ...formData, marks: Number(e.target.value) })}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111111] border border-emerald-200 dark:border-emerald-800 text-sm font-semibold text-black dark:text-emerald-50 focus:outline-none focus:border-emerald-500 shadow-sm"
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
                <option value="pending" className="bg-white dark:bg-[#111111] text-black dark:text-emerald-50">Pending</option>
                <option value="submitted" className="bg-white dark:bg-[#111111] text-black dark:text-emerald-50">Submitted</option>
              </select>
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
              {saveMutation.isPending ? 'Saving...' : editingItem ? 'Update Assignment' : 'Add Assignment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deleteMutation.mutate(deletingId)}
        title="Delete Assignment"
        message="Are you sure you want to delete this assignment? It will be removed from your active deadlines."
        confirmText="Delete Assignment"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
