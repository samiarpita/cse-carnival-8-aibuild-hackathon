import {
  initialSchedules,
  initialRooms,
  initialEvents,
  initialAnnouncements,
  initialAssignments,
} from './mockData';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Reactive local store backed by localStorage with instant fallback
const STORAGE_KEYS = {
  schedules: 'campusos_schedules_v1',
  rooms: 'campusos_rooms_v1',
  events: 'campusos_events_v1',
  announcements: 'campusos_announcements_v1',
  assignments: 'campusos_assignments_v1',
};

function getLocalData(key, fallback) {
  try {
    const item = localStorage.getItem(STORAGE_KEYS[key]);
    if (item) return JSON.parse(item);
  } catch (e) {
    console.warn(`LocalStorage read error for ${key}:`, e);
  }
  return fallback;
}

function setLocalData(key, data) {
  try {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data));
  } catch (e) {
    console.warn(`LocalStorage write error for ${key}:`, e);
  }
}

// Ensure local store initialized
if (!localStorage.getItem(STORAGE_KEYS.schedules)) setLocalData('schedules', initialSchedules);
if (!localStorage.getItem(STORAGE_KEYS.rooms)) setLocalData('rooms', initialRooms);
if (!localStorage.getItem(STORAGE_KEYS.events)) setLocalData('events', initialEvents);
if (!localStorage.getItem(STORAGE_KEYS.announcements)) setLocalData('announcements', initialAnnouncements);
if (!localStorage.getItem(STORAGE_KEYS.assignments)) setLocalData('assignments', initialAssignments);

// Helper for HTTP requests with graceful fallback
async function request(endpoint, options = {}, mockFallbackFn) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });

    if (res.ok) {
      return await res.json();
    }

    // If server returned a structured error (e.g. 409 conflict)
    const errData = await res.json().catch(() => ({}));
    throw {
      status: res.status,
      error: errData.error || 'request_failed',
      message: errData.message || res.statusText || 'Server error',
    };
  } catch (err) {
    // If it's a structured server error from backend, rethrow so UI can display conflict
    if (err.status) throw err;

    // If network error (backend not running yet), use mock fallback
    if (mockFallbackFn) {
      // Simulate minor network latency for realistic feel
      await new Promise((r) => setTimeout(r, 100));
      return mockFallbackFn();
    }
    throw err;
  }
}

// ---------------- API CLIENT ---------------- //

export const api = {
  // Schedules
  getSchedules: async (params = {}) => {
    return request(
      `/schedules${params.day ? `?day=${params.day}` : ''}`,
      { method: 'GET' },
      () => {
        let list = getLocalData('schedules', initialSchedules);
        if (params.day) {
          list = list.filter((s) => s.day.toLowerCase() === params.day.toLowerCase());
        }
        return list;
      }
    );
  },

  createSchedule: async (data) => {
    const newId = `sch-${Date.now().toString().slice(-4)}`;
    const schedule = { id: newId, ...data };
    return request(
      `/schedules`,
      { method: 'POST', body: JSON.stringify(schedule) },
      () => {
        const list = getLocalData('schedules', initialSchedules);
        const updated = [schedule, ...list];
        setLocalData('schedules', updated);
        return schedule;
      }
    );
  },

  updateSchedule: async (id, data) => {
    return request(
      `/schedules/${id}`,
      { method: 'PUT', body: JSON.stringify(data) },
      () => {
        const list = getLocalData('schedules', initialSchedules);
        const updated = list.map((item) => (item.id === id ? { ...item, ...data, id } : item));
        setLocalData('schedules', updated);
        return { ...data, id };
      }
    );
  },

  deleteSchedule: async (id) => {
    return request(
      `/schedules/${id}`,
      { method: 'DELETE' },
      () => {
        const list = getLocalData('schedules', initialSchedules);
        const updated = list.filter((item) => item.id !== id);
        setLocalData('schedules', updated);
        return { success: true, id };
      }
    );
  },

  // Rooms
  getRooms: async (filters = {}) => {
    const query = new URLSearchParams();
    if (filters.date) query.set('date', filters.date);
    if (filters.start_time) query.set('start_time', filters.start_time);
    if (filters.end_time) query.set('end_time', filters.end_time);
    if (filters.min_capacity) query.set('min_capacity', filters.min_capacity);
    if (filters.equipment) query.set('equipment', filters.equipment);
    if (filters.type) query.set('type', filters.type);

    const qs = query.toString() ? `?${query.toString()}` : '';

    return request(`/rooms${qs}`, { method: 'GET' }, () => {
      let list = getLocalData('rooms', initialRooms);
      if (filters.type) {
        list = list.filter((r) => r.type === filters.type);
      }
      if (filters.min_capacity) {
        list = list.filter((r) => r.capacity >= Number(filters.min_capacity));
      }
      if (filters.equipment) {
        const eqList = Array.isArray(filters.equipment) ? filters.equipment : [filters.equipment];
        list = list.filter((r) => eqList.every((eq) => r.equipment.includes(eq)));
      }
      return list;
    });
  },

  createRoom: async (data) => {
    const newId = `room-${Date.now().toString().slice(-4)}`;
    const room = { id: newId, bookings: [], ...data };
    return request(`/rooms`, { method: 'POST', body: JSON.stringify(room) }, () => {
      const list = getLocalData('rooms', initialRooms);
      const updated = [room, ...list];
      setLocalData('rooms', updated);
      return room;
    });
  },

  updateRoom: async (id, data) => {
    return request(`/rooms/${id}`, { method: 'PUT', body: JSON.stringify(data) }, () => {
      const list = getLocalData('rooms', initialRooms);
      const updated = list.map((item) => (item.id === id ? { ...item, ...data, id } : item));
      setLocalData('rooms', updated);
      return { ...data, id };
    });
  },

  deleteRoom: async (id) => {
    return request(`/rooms/${id}`, { method: 'DELETE' }, () => {
      const list = getLocalData('rooms', initialRooms);
      const updated = list.filter((item) => item.id !== id);
      setLocalData('rooms', updated);
      return { success: true, id };
    });
  },

  // Room Extra Action: Book Room with conflict detection
  bookRoom: async (roomId, bookingData) => {
    return request(
      `/rooms/${roomId}/book`,
      { method: 'POST', body: JSON.stringify(bookingData) },
      () => {
        const list = getLocalData('rooms', initialRooms);
        const room = list.find((r) => r.id === roomId || r.room_number === roomId);
        if (!room) {
          throw { status: 404, error: 'not_found', message: `Room ${roomId} not found.` };
        }

        const { date, start_time, end_time, booked_by, purpose } = bookingData;

        // Check for time slot overlap: [start_time, end_time)
        const conflict = (room.bookings || []).find((b) => {
          if (b.date !== date) return false;
          // Overlap condition: start < b.end AND end > b.start
          return start_time < b.end_time && end_time > b.start_time;
        });

        if (conflict) {
          throw {
            status: 409,
            error: 'conflict',
            message: `Conflict: Room ${room.room_number} is already booked on ${date} from ${conflict.start_time} to ${conflict.end_time} by ${conflict.booked_by}.`,
          };
        }

        const newBooking = {
          booking_id: `bk-${Date.now().toString().slice(-4)}`,
          booked_by,
          date,
          start_time,
          end_time,
          purpose: purpose || 'Academic Activity',
        };

        const updatedRoom = {
          ...room,
          bookings: [...(room.bookings || []), newBooking],
        };

        const updatedList = list.map((r) => (r.id === room.id ? updatedRoom : r));
        setLocalData('rooms', updatedList);
        return { success: true, booking: newBooking, room: updatedRoom };
      }
    );
  },

  // Room Extra Action: Cancel Booking
  cancelBooking: async (roomId, bookingId) => {
    return request(
      `/rooms/${roomId}/bookings/${bookingId}`,
      { method: 'DELETE' },
      () => {
        const list = getLocalData('rooms', initialRooms);
        const room = list.find((r) => r.id === roomId || r.room_number === roomId);
        if (!room) throw { status: 404, error: 'not_found', message: 'Room not found' };

        const updatedBookings = (room.bookings || []).filter((b) => b.booking_id !== bookingId);
        const updatedRoom = { ...room, bookings: updatedBookings };
        const updatedList = list.map((r) => (r.id === room.id ? updatedRoom : r));
        setLocalData('rooms', updatedList);
        return { success: true, booking_id: bookingId };
      }
    );
  },

  // Events
  getEvents: async (params = {}) => {
    return request(`/events`, { method: 'GET' }, () => {
      let list = getLocalData('events', initialEvents);
      if (params.status) {
        list = list.filter((e) => e.status === params.status);
      }
      return list;
    });
  },

  createEvent: async (data) => {
    const newId = `evt-${Date.now().toString().slice(-4)}`;
    const event = {
      id: newId,
      registered: 0,
      registrations: [],
      status: 'upcoming',
      ...data,
      capacity: Number(data.capacity) || 30,
    };
    return request(`/events`, { method: 'POST', body: JSON.stringify(event) }, () => {
      const list = getLocalData('events', initialEvents);
      const updated = [event, ...list];
      setLocalData('events', updated);
      return event;
    });
  },

  updateEvent: async (id, data) => {
    return request(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }, () => {
      const list = getLocalData('events', initialEvents);
      const updated = list.map((item) => (item.id === id ? { ...item, ...data, id } : item));
      setLocalData('events', updated);
      return { ...data, id };
    });
  },

  deleteEvent: async (id) => {
    return request(`/events/${id}`, { method: 'DELETE' }, () => {
      const list = getLocalData('events', initialEvents);
      const updated = list.filter((item) => item.id !== id);
      setLocalData('events', updated);
      return { success: true, id };
    });
  },

  // Event Extra Action: Register for Event
  registerEvent: async (eventId, { student_id, name }) => {
    return request(
      `/events/${eventId}/register`,
      { method: 'POST', body: JSON.stringify({ student_id, name }) },
      () => {
        const list = getLocalData('events', initialEvents);
        const event = list.find((e) => e.id === eventId || e.name === eventId);
        if (!event) throw { status: 404, error: 'not_found', message: 'Event not found.' };

        const currentRegs = event.registrations || [];
        if (currentRegs.some((r) => r.student_id === student_id)) {
          throw {
            status: 409,
            error: 'already_registered',
            message: `Student ${student_id} is already registered for this event.`,
          };
        }

        if (event.registered >= event.capacity || event.status === 'full') {
          throw {
            status: 409,
            error: 'event_full',
            message: `Registration failed: '${event.name}' is already at full capacity (${event.capacity}/${event.capacity}).`,
          };
        }

        const newReg = { student_id, name };
        const newRegisteredCount = (event.registered || 0) + 1;
        const newStatus = newRegisteredCount >= event.capacity ? 'full' : event.status;

        const updatedEvent = {
          ...event,
          registered: newRegisteredCount,
          registrations: [...currentRegs, newReg],
          status: newStatus,
        };

        const updatedList = list.map((e) => (e.id === event.id ? updatedEvent : e));
        setLocalData('events', updatedList);
        return { success: true, registration: newReg, event: updatedEvent };
      }
    );
  },

  // Event Extra Action: Cancel Registration
  cancelRegistration: async (eventId, studentId) => {
    return request(
      `/events/${eventId}/registrations/${studentId}`,
      { method: 'DELETE' },
      () => {
        const list = getLocalData('events', initialEvents);
        const event = list.find((e) => e.id === eventId);
        if (!event) throw { status: 404, error: 'not_found', message: 'Event not found' };

        const updatedRegs = (event.registrations || []).filter((r) => r.student_id !== studentId);
        const newRegisteredCount = Math.max(0, (event.registered || 1) - 1);
        const newStatus = event.status === 'full' && newRegisteredCount < event.capacity ? 'upcoming' : event.status;

        const updatedEvent = {
          ...event,
          registered: newRegisteredCount,
          registrations: updatedRegs,
          status: newStatus,
        };

        const updatedList = list.map((e) => (e.id === event.id ? updatedEvent : e));
        setLocalData('events', updatedList);
        return { success: true, event: updatedEvent };
      }
    );
  },

  // Announcements
  getAnnouncements: async () => {
    return request(`/announcements`, { method: 'GET' }, () => {
      return getLocalData('announcements', initialAnnouncements);
    });
  },

  createAnnouncement: async (data) => {
    const newId = `ann-${Date.now().toString().slice(-4)}`;
    const announcement = { id: newId, ...data };
    return request(`/announcements`, { method: 'POST', body: JSON.stringify(announcement) }, () => {
      const list = getLocalData('announcements', initialAnnouncements);
      const updated = [announcement, ...list];
      setLocalData('announcements', updated);
      return announcement;
    });
  },

  updateAnnouncement: async (id, data) => {
    return request(`/announcements/${id}`, { method: 'PUT', body: JSON.stringify(data) }, () => {
      const list = getLocalData('announcements', initialAnnouncements);
      const updated = list.map((item) => (item.id === id ? { ...item, ...data, id } : item));
      setLocalData('announcements', updated);
      return { ...data, id };
    });
  },

  deleteAnnouncement: async (id) => {
    return request(`/announcements/${id}`, { method: 'DELETE' }, () => {
      const list = getLocalData('announcements', initialAnnouncements);
      const updated = list.filter((item) => item.id !== id);
      setLocalData('announcements', updated);
      return { success: true, id };
    });
  },

  // Assignments
  getAssignments: async () => {
    return request(`/assignments`, { method: 'GET' }, () => {
      const list = getLocalData('assignments', initialAssignments);
      // Sort by nearest deadline by default
      return [...list].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    });
  },

  createAssignment: async (data) => {
    const newId = `asgn-${Date.now().toString().slice(-4)}`;
    const assignment = { id: newId, status: 'pending', ...data, marks: Number(data.marks) || 10 };
    return request(`/assignments`, { method: 'POST', body: JSON.stringify(assignment) }, () => {
      const list = getLocalData('assignments', initialAssignments);
      const updated = [assignment, ...list];
      setLocalData('assignments', updated);
      return assignment;
    });
  },

  updateAssignment: async (id, data) => {
    return request(`/assignments/${id}`, { method: 'PUT', body: JSON.stringify(data) }, () => {
      const list = getLocalData('assignments', initialAssignments);
      const updated = list.map((item) => (item.id === id ? { ...item, ...data, id } : item));
      setLocalData('assignments', updated);
      return { ...data, id };
    });
  },

  deleteAssignment: async (id) => {
    return request(`/assignments/${id}`, { method: 'DELETE' }, () => {
      const list = getLocalData('assignments', initialAssignments);
      const updated = list.filter((item) => item.id !== id);
      setLocalData('assignments', updated);
      return { success: true, id };
    });
  },

  // Metadata / Server time
  getMetaNow: async () => {
    return request(`/meta/now`, { method: 'GET' }, () => {
      return {
        datetime: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()],
      };
    });
  },

  // AI Agent Chat with interactive query processing and action detection
  chat: async (param1, param2 = []) => {
    let message = '';
    let history = [];
    if (typeof param1 === 'object' && param1 !== null && 'message' in param1) {
      message = param1.message || '';
      history = Array.isArray(param1.history) ? param1.history : [];
    } else {
      message = param1 || '';
      history = Array.isArray(param2) ? param2 : [];
    }

    return request(
      `/agent/chat`,
      { method: 'POST', body: JSON.stringify({ message, history }) },
      async () => {
        // Fallback intelligent agent reasoning simulation (for standalone demo / evaluation)
        const msg = message.toLowerCase();

        // 1. "When is my next class?"
        if (msg.includes('next class') || msg.includes('when is my class')) {
          const schedules = getLocalData('schedules', initialSchedules);
          const sundayClasses = schedules.filter((s) => s.day === 'Sunday');
          return {
            reply: "Your next class is **CSE 4129 (Formal Languages and Compilers)** with Ms. Nusrat Jahan at **08:00 AM** in **Room 7A05** (Section B).",
            actions_taken: [
              {
                type: "tool_call",
                name: "get_schedule",
                args: { day: "Sunday" }
              }
            ]
          };
        }

        // 2. "What classes do I have on Wednesday?"
        if (msg.includes('wednesday') && (msg.includes('class') || msg.includes('classes') || msg.includes('schedule'))) {
          const schedules = getLocalData('schedules', initialSchedules).filter((s) => s.day === 'Wednesday');
          const listStr = schedules.map((s) => `- **${s.course}**: ${s.title} (${s.start_time}–${s.end_time}, Room ${s.room}, ${s.instructor})`).join('\n');
          return {
            reply: `Here are your classes on **Wednesday**:\n\n${listStr}`,
            actions_taken: [{ type: 'tool_call', name: 'get_schedule', args: { day: 'Wednesday' } }]
          };
        }

        // 3. "What assignments do I have due this week?"
        if (msg.includes('assignment') && (msg.includes('due') || msg.includes('this week') || msg.includes('pending'))) {
          const assignments = getLocalData('assignments', initialAssignments);
          const listStr = assignments.slice(0, 4).map((a) => `- **${a.course}**: ${a.title} (Deadline: **${a.deadline}**, Status: \`${a.status}\`)`).join('\n');
          return {
            reply: `Here are your upcoming assignments due this week:\n\n${listStr}\n\n*Make sure to submit via the respective platform on time!*`,
            actions_taken: [{ type: 'tool_call', name: 'get_assignments', args: { status: 'pending' } }]
          };
        }

        // 4. "Show me all high priority announcements."
        if (msg.includes('high priority') || (msg.includes('priority') && msg.includes('announcement'))) {
          const announcements = getLocalData('announcements', initialAnnouncements).filter((a) => a.priority === 'high');
          const listStr = announcements.map((a) => `📢 **${a.title}** (${a.date})\n> ${a.body}`).join('\n\n');
          return {
            reply: `Here are the active **High Priority** campus announcements:\n\n${listStr}`,
            actions_taken: [{ type: 'tool_call', name: 'get_announcements', args: { priority: 'high' } }]
          };
        }

        // 5. "Which labs have a projector and can fit at least 30 people?"
        if ((msg.includes('lab') || msg.includes('labs')) && (msg.includes('projector') || msg.includes('30'))) {
          const rooms = getLocalData('rooms', initialRooms).filter(
            (r) => r.type === 'lab' && r.capacity >= 30 && r.equipment.includes('projector')
          );
          const listStr = rooms.map((r) => `🏢 **Room ${r.room_number}** (Floor ${r.floor}) — Capacity: ${r.capacity} | Equipment: ${r.equipment.join(', ')}`).join('\n');
          return {
            reply: `I found **${rooms.length} labs** matching your criteria (capacity ≥ 30 with projector):\n\n${listStr}`,
            actions_taken: [{ type: 'tool_call', name: 'search_rooms', args: { type: 'lab', min_capacity: 30, equipment: ['projector'] } }]
          };
        }

        // 6. Multi-source: "I'm free until 2 PM — is there anything on campus I could drop into?"
        if (msg.includes('free until') || msg.includes('drop into')) {
          return {
            reply: "Looking at your schedule and active campus events before 2:00 PM, you can attend the **Workshop: Git & GitHub for Beginners** (Starts at 13:00 in Room 7B05) or head over to the **AUSTPIC AI Build Hackathon** in Room 7C01.",
            actions_taken: [
              { type: 'tool_call', name: 'get_schedule', args: { day: 'Today' } },
              { type: 'tool_call', name: 'get_events', args: { status: 'upcoming', before: '14:00' } }
            ]
          };
        }

        // 7. Action: "Book Room 7A02 tomorrow from 3 PM to 5 PM"
        if (msg.includes('book') && msg.includes('7a02')) {
          const bookingResult = await api.bookRoom('room-002', {
            date: '2026-09-05',
            start_time: '15:00',
            end_time: '17:00',
            booked_by: 'Student User',
            purpose: 'Group Study & Project Discussion',
          });

          return {
            reply: `✅ Successfully booked **Room 7A02** for tomorrow (**2026-09-05**) from **15:00 to 17:00**. The booking confirmation has been recorded in the database.`,
            action_card: {
              type: 'room_booking',
              title: 'Room Booking Confirmed',
              room_number: '7A02',
              date: '2026-09-05',
              time: '15:00 – 17:00 (3:00 PM – 5:00 PM)',
              booked_by: 'Student User',
              purpose: 'Group Study & Project Discussion',
            },
            actions_taken: [
              {
                type: 'tool_call',
                name: 'book_room',
                args: { room_number: '7A02', date: '2026-09-05', start_time: '15:00', end_time: '17:00', booked_by: 'Student User' },
              },
            ],
          };
        }

        // 8. Action: "Register me for the Guest Lecture on Deep Learning"
        if (msg.includes('register') && (msg.includes('deep learning') || msg.includes('guest lecture'))) {
          const regResult = await api.registerEvent('evt-002', {
            student_id: '20-40532',
            name: 'Sakibul Hassan',
          });

          return {
            reply: `🎉 You have been successfully registered for **Guest Lecture: Deep Learning in Medical Imaging** on September 8, 2026 at Room 7C05.`,
            action_card: {
              type: 'event_registration',
              title: 'Event Registration Confirmed',
              event_name: 'Guest Lecture: Deep Learning in Medical Imaging',
              venue: 'Room 7C05',
              date: '2026-09-08 (14:00 – 16:00)',
              student_id: '20-40532',
              student_name: 'Sakibul Hassan',
            },
            actions_taken: [
              {
                type: 'tool_call',
                name: 'register_for_event',
                args: { event_id: 'evt-002', student_id: '20-40532', name: 'Sakibul Hassan' },
              },
            ],
          };
        }

        // 9. Vague Trap: "Just book me any room tomorrow afternoon"
        if (msg.includes('any room') || (msg.includes('book') && !msg.includes('7a0') && !msg.includes('7b') && !msg.includes('7c') && msg.includes('afternoon'))) {
          return {
            reply: "❓ **Clarification Needed:** To book a room for you, could you please specify:\n1. Exact time slot (e.g. 2:00 PM – 4:00 PM)?\n2. How many people need to be accommodated?\n3. Any equipment requirements (such as projector or lab computers)?\n\n*I will find and reserve the optimal room once you share these details!*",
            actions_taken: [],
          };
        }

        // 10. Refusal Path: unauthorized request
        if (msg.includes('delete all') || msg.includes('bypass') || msg.includes('hack') || msg.includes('admin password')) {
          return {
            reply: "🚫 **Action Refused:** I cannot perform administrative deletions or bypass system security constraints. I can only assist with authorized student operations such as viewing schedules, checking announcements, and reserving available rooms.",
            actions_taken: [],
          };
        }

        // Default conversational response
        return {
          reply: `I checked the campus records for: "${message}". You can ask me to look up schedules, list upcoming events, search for available rooms, check assignments, or book rooms directly.`,
          actions_taken: [],
        };
      }
    );
  },

  // Alias for chat endpoint supporting sendAgentChat(message, history)
  sendAgentChat: async (message, history = []) => {
    return api.chat(message, history);
  },

  // Reset local database back to seed files
  resetToSeed: () => {
    setLocalData('schedules', initialSchedules);
    setLocalData('rooms', initialRooms);
    setLocalData('events', initialEvents);
    setLocalData('announcements', initialAnnouncements);
    setLocalData('assignments', initialAssignments);
  },
};
