import http from 'http';
import { createApp } from './src/app.js';

let server;
const PORT = 4099; // Test port to avoid conflicts
const BASE_URL = `http://localhost:${PORT}/api`;

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json();
  return { status: response.status, data };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runTests() {
  console.log('🧪 Starting CampusOS Backend API Smoke & Business Logic Tests...\n');

  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });
  console.log(`📡 Test server running on ${PORT}`);

  try {
    // 1. Health Check
    const health = await request('/health');
    assert(health.status === 200 && health.data.status === 'ok', 'GET /api/health returns 200 ok');

    // 2. Meta Time Endpoint
    const meta = await request('/meta/now');
    assert(meta.status === 200 && meta.data.date && meta.data.day, `GET /api/meta/now returns server time (${meta.data.day}, ${meta.data.time})`);

    // 3. Schedules CRUD & Filter
    const schedules = await request('/schedules');
    assert(schedules.status === 200 && Array.isArray(schedules.data), `GET /api/schedules returns array (${schedules.data.length} items)`);

    const wednesdaySchedules = await request('/schedules?day=Wednesday');
    assert(wednesdaySchedules.status === 200 && wednesdaySchedules.data.every(s => s.day === 'Wednesday'), 'GET /api/schedules?day=Wednesday filters correctly');

    const newSchedule = {
      id: `sch-test-${Date.now()}`,
      course: 'CSE 4199',
      title: 'Testing and Verification',
      day: 'Monday',
      start_time: '10:00',
      end_time: '11:30',
      room: '7A01',
      instructor: 'Dr. Test',
      section: 'A'
    };
    const createSch = await request('/schedules', { method: 'POST', body: newSchedule });
    assert(createSch.status === 201 && createSch.data.id === newSchedule.id, 'POST /api/schedules creates schedule item');

    const delSch = await request(`/schedules/${newSchedule.id}`, { method: 'DELETE' });
    assert(delSch.status === 200, 'DELETE /api/schedules/:id deletes schedule item');

    // 4. Rooms CRUD, Filters & Conflict Booking
    const rooms = await request('/rooms');
    assert(rooms.status === 200 && Array.isArray(rooms.data), `GET /api/rooms returns array (${rooms.data.length} rooms)`);

    // Test Multi-filter query: Which labs have a projector and can fit at least 30 people?
    const labQuery = await request('/rooms?type=lab&min_capacity=30&equipment=projector');
    assert(
      labQuery.status === 200 &&
      labQuery.data.every(r => r.type === 'lab' && r.capacity >= 30 && r.equipment.some(e => e.includes('projector'))),
      `GET /api/rooms?type=lab&min_capacity=30&equipment=projector returns filtered labs (${labQuery.data.length} matches)`
    );

    // Test Room Booking & Conflict
    const testRoom = rooms.data[0];
    const testBookingDate = '2026-09-15';
    const bookRes1 = await request(`/rooms/${testRoom.id}/book`, {
      method: 'POST',
      body: {
        booked_by: 'Automated Tester',
        date: testBookingDate,
        start_time: '14:00',
        end_time: '16:00',
        purpose: 'AI Hackathon Demo'
      }
    });
    assert(bookRes1.status === 201 && bookRes1.data.success, `POST /api/rooms/:id/book books free slot on ${testRoom.room_number}`);

    // Attempt overlapping booking (e.g. 15:00 - 17:00) -> Must return 409 Conflict
    const bookConflict = await request(`/rooms/${testRoom.id}/book`, {
      method: 'POST',
      body: {
        booked_by: 'Conflicting Requester',
        date: testBookingDate,
        start_time: '15:00',
        end_time: '17:00',
        purpose: 'Conflict test'
      }
    });
    assert(bookConflict.status === 409 && bookConflict.data.error === 'room_unavailable', 'POST /api/rooms/:id/book correctly returns 409 Conflict on overlap');

    // Clean up test booking
    if (bookRes1.data.booking?.booking_id) {
      await request(`/rooms/${testRoom.id}/bookings/${bookRes1.data.booking.booking_id}`, { method: 'DELETE' });
    }

    // 5. Events CRUD, Registration & Capacity Enforcement
    const events = await request('/events');
    assert(events.status === 200 && Array.isArray(events.data), `GET /api/events returns array (${events.data.length} events)`);

    // Create a mini event with capacity 1 to test capacity enforcement
    const miniEvent = {
      id: `evt-test-cap-${Date.now()}`,
      name: 'Exclusive VIP Workshop',
      date: '2026-09-20',
      start_time: '10:00',
      end_time: '12:00',
      capacity: 1,
      registered: 0
    };
    await request('/events', { method: 'POST', body: miniEvent });

    // First registration -> 201 Created
    const reg1 = await request(`/events/${miniEvent.id}/register`, {
      method: 'POST',
      body: { student_id: '99-00001', name: 'First Student' }
    });
    assert(reg1.status === 201 && reg1.data.event.registered === 1 && reg1.data.event.status === 'full', 'POST /api/events/:id/register registers first student & updates status to "full"');

    // Second registration -> 409 Event Full
    const reg2 = await request(`/events/${miniEvent.id}/register`, {
      method: 'POST',
      body: { student_id: '99-00002', name: 'Second Student' }
    });
    assert(reg2.status === 409 && reg2.data.error === 'event_full', 'POST /api/events/:id/register rejects registration with 409 when capacity is full');

    // Cancel registration -> Decrements registered & reverts status
    const cancelReg = await request(`/events/${miniEvent.id}/registrations/99-00001`, { method: 'DELETE' });
    assert(cancelReg.status === 200, 'DELETE /api/events/:id/registrations/:studentId cancels registration');

    // Clean up test event
    await request(`/events/${miniEvent.id}`, { method: 'DELETE' });

    // 6. Announcements CRUD & Filters
    const announcements = await request('/announcements');
    assert(announcements.status === 200 && Array.isArray(announcements.data), `GET /api/announcements returns array (${announcements.data.length} announcements)`);

    const highPriority = await request('/announcements?priority=high');
    assert(highPriority.status === 200 && highPriority.data.every(a => a.priority === 'high'), 'GET /api/announcements?priority=high filters correctly');

    // 7. Assignments CRUD & Filters
    const assignments = await request('/assignments');
    assert(assignments.status === 200 && Array.isArray(assignments.data), `GET /api/assignments returns array (${assignments.data.length} assignments)`);

    // 8. Authentication & Database User Tests
    const weakRegRes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Weak Pass Test',
        email: 'weak.pass@aust.edu',
        password: 'password123'
      }
    });
    assert(weakRegRes.status === 400 && weakRegRes.data.error === 'weak_password', 'POST /api/auth/register rejects weak password with 400 (requires 8+ chars, upper, lower, number, special)');

    const testRegEmail = `test.student.${Date.now()}@aust.edu`;
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Arpita Dey',
        email: testRegEmail,
        student_id: `22-${Math.floor(10000 + Math.random() * 90000)}`,
        department: 'Computer Science & Engineering',
        role: 'Student',
        password: 'Password123!'
      }
    });
    assert(regRes.status === 201 && regRes.data.token && regRes.data.user.email === testRegEmail, 'POST /api/auth/register creates user with strong password and returns token');

    const dupRegRes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Duplicate Test',
        email: testRegEmail,
        password: 'Password123!'
      }
    });
    assert(dupRegRes.status === 409, 'POST /api/auth/register rejects duplicate email with 409');

    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        emailOrId: '20-40532@aust.edu',
        password: 'password123'
      }
    });
    assert(loginRes.status === 200 && loginRes.data.token && loginRes.data.user.student_id === '20-40532', 'POST /api/auth/login authenticates seeded student');

    const badLoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        emailOrId: '20-40532@aust.edu',
        password: 'wrong_password_here'
      }
    });
    assert(badLoginRes.status === 401, 'POST /api/auth/login rejects wrong password with 401');

    const meRes = await request('/auth/me', {
      headers: {
        Authorization: `Bearer ${loginRes.data.token}`
      }
    });
    assert(meRes.status === 200 && meRes.data.user.student_id === '20-40532', 'GET /api/auth/me verifies Bearer token');

    const usersListRes = await request('/auth/users');
    assert(usersListRes.status === 200 && Array.isArray(usersListRes.data.users), `GET /api/auth/users returns available demo users (${usersListRes.data.users.length} users)`);

    // 9. Agent Chat Scaffold
    const agentChat = await request('/agent/chat', {
      method: 'POST',
      body: { message: 'When is my next class?' }
    });
    assert(agentChat.status === 200 && agentChat.data.reply, 'POST /api/agent/chat receives message and responds');

    console.log('\n========================================');
    console.log('🎉 ALL BACKEND API TESTS PASSED 100%!');
    console.log('========================================\n');
  } finally {
    if (server) {
      server.close();
    }
  }
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUNNER TERMINATED WITH ERROR:', err);
  if (server) server.close();
  process.exit(1);
});
