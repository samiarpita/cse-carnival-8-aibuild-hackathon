import { createClient } from '@supabase/supabase-js';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let supabase = null;
let sqliteDb = null;

if (config.isSupabaseConfigured) {
  supabase = createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { persistSession: false }
  });
  console.log('📦 Using Supabase backend');
} else {
  // Use Node.js built-in SQLite for local zero-config setup
  const dbDir = path.resolve(__dirname, '../../data_db');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.resolve(dbDir, 'campusos.sqlite');
  sqliteDb = new DatabaseSync(dbPath);
  sqliteDb.exec('PRAGMA foreign_keys = ON;');
  console.log(`📂 Using Local SQLite backend at: ${dbPath}`);

  // Initialize SQLite tables
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      course TEXT NOT NULL,
      title TEXT NOT NULL,
      day TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      room TEXT NOT NULL,
      instructor TEXT,
      section TEXT
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      room_number TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      equipment TEXT DEFAULT '[]',
      floor INTEGER,
      status TEXT NOT NULL DEFAULT 'available'
    );

    CREATE TABLE IF NOT EXISTS bookings (
      booking_id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      booked_by TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      purpose TEXT,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      end_date TEXT,
      venue TEXT,
      organizer TEXT,
      capacity INTEGER NOT NULL,
      registered INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'upcoming'
    );

    CREATE TABLE IF NOT EXISTS event_registrations (
      event_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      name TEXT NOT NULL,
      PRIMARY KEY (event_id, student_id),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT,
      date TEXT NOT NULL,
      priority TEXT NOT NULL,
      posted_by TEXT,
      expires TEXT
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      course TEXT NOT NULL,
      course_title TEXT,
      title TEXT NOT NULL,
      description TEXT,
      assigned_date TEXT,
      deadline TEXT NOT NULL,
      submission_platform TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      marks REAL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      student_id TEXT UNIQUE,
      department TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Student',
      password_hash TEXT NOT NULL,
      avatar TEXT DEFAULT '👨‍🎓',
      created_at TEXT NOT NULL
    );
  `);
}

// Password hashing & verification
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

// Token generation & verification
export function generateToken(user) {
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    student_id: user.student_id,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  })).toString('base64url');
  
  const signature = crypto.createHmac('sha256', process.env.JWT_SECRET || 'campusos_aust_secret_key_2026')
    .update(payload)
    .digest('base64url');
  
  return `${payload}.${signature}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', process.env.JWT_SECRET || 'campusos_aust_secret_key_2026')
    .update(payload)
    .digest('base64url');
  
  if (signature !== expectedSig) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (data.exp && data.exp < Date.now()) return null;
    return data;
  } catch (e) {
    return null;
  }
}

// Time overlap helper: [s1, e1) overlaps [s2, e2) if s1 < e2 && s2 < e1
export function timesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

export const db = {
  isSupabase: Boolean(supabase),

  schedules: {
    async getAll(filters = {}) {
      if (supabase) {
        let query = supabase.from('schedules').select('*');
        if (filters.day) query = query.eq('day', filters.day);
        if (filters.course) query = query.ilike('course', `%${filters.course}%`);
        if (filters.room) query = query.eq('room', filters.room);
        if (filters.instructor) query = query.ilike('instructor', `%${filters.instructor}%`);
        const { data, error } = await query;
        if (error) throw error;
        return data;
      } else {
        let sql = 'SELECT * FROM schedules WHERE 1=1';
        const params = [];
        if (filters.day) {
          sql += ' AND day = ?';
          params.push(filters.day);
        }
        if (filters.course) {
          sql += ' AND course LIKE ?';
          params.push(`%${filters.course}%`);
        }
        if (filters.room) {
          sql += ' AND room = ?';
          params.push(filters.room);
        }
        if (filters.instructor) {
          sql += ' AND instructor LIKE ?';
          params.push(`%${filters.instructor}%`);
        }
        sql += ' ORDER BY start_time ASC';
        return sqliteDb.prepare(sql).all(...params);
      }
    },

    async getById(id) {
      if (supabase) {
        const { data, error } = await supabase.from('schedules').select('*').eq('id', id).single();
        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
      } else {
        const row = sqliteDb.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
        return row || null;
      }
    },

    async create(record) {
      if (supabase) {
        const { data, error } = await supabase.from('schedules').insert(record).select().single();
        if (error) throw error;
        return data;
      } else {
        const stmt = sqliteDb.prepare(`
          INSERT INTO schedules (id, course, title, day, start_time, end_time, room, instructor, section)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          record.id,
          record.course,
          record.title,
          record.day,
          record.start_time,
          record.end_time,
          record.room,
          record.instructor || null,
          record.section || null
        );
        return this.getById(record.id);
      }
    },

    async update(id, updates) {
      if (supabase) {
        const { data, error } = await supabase.from('schedules').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
      } else {
        const existing = await this.getById(id);
        if (!existing) return null;
        const merged = { ...existing, ...updates };
        const stmt = sqliteDb.prepare(`
          UPDATE schedules
          SET course = ?, title = ?, day = ?, start_time = ?, end_time = ?, room = ?, instructor = ?, section = ?
          WHERE id = ?
        `);
        stmt.run(
          merged.course,
          merged.title,
          merged.day,
          merged.start_time,
          merged.end_time,
          merged.room,
          merged.instructor,
          merged.section,
          id
        );
        return this.getById(id);
      }
    },

    async delete(id) {
      if (supabase) {
        const { error } = await supabase.from('schedules').delete().eq('id', id);
        if (error) throw error;
        return true;
      } else {
        const result = sqliteDb.prepare('DELETE FROM schedules WHERE id = ?').run(id);
        return result.changes > 0;
      }
    }
  },

  rooms: {
    async getAll(filters = {}) {
      let roomsList = [];
      if (supabase) {
        let query = supabase.from('rooms').select('*, bookings(*)');
        if (filters.type) query = query.eq('type', filters.type);
        if (filters.min_capacity) query = query.gte('capacity', Number(filters.min_capacity));
        if (filters.status) query = query.eq('status', filters.status);
        const { data, error } = await query;
        if (error) throw error;
        roomsList = data;
      } else {
        let sql = 'SELECT * FROM rooms WHERE 1=1';
        const params = [];
        if (filters.type) {
          sql += ' AND type = ?';
          params.push(filters.type);
        }
        if (filters.min_capacity) {
          sql += ' AND capacity >= ?';
          params.push(Number(filters.min_capacity));
        }
        if (filters.status) {
          sql += ' AND status = ?';
          params.push(filters.status);
        }
        const rows = sqliteDb.prepare(sql).all(...params);
        const bookingsStmt = sqliteDb.prepare('SELECT * FROM bookings WHERE room_id = ?');
        roomsList = rows.map(r => ({
          ...r,
          equipment: typeof r.equipment === 'string' ? JSON.parse(r.equipment) : (r.equipment || []),
          bookings: bookingsStmt.all(r.id)
        }));
      }

      // Filter equipment array if requested
      if (filters.equipment) {
        const reqEquip = Array.isArray(filters.equipment)
          ? filters.equipment.map(e => e.toLowerCase())
          : [filters.equipment.toLowerCase()];
        roomsList = roomsList.filter(r => {
          const roomEquip = (r.equipment || []).map(e => e.toLowerCase());
          return reqEquip.every(req => roomEquip.some(e => e.includes(req)));
        });
      }

      // Filter availability by date and time window
      if (filters.date && filters.start_time && filters.end_time) {
        roomsList = roomsList.filter(r => {
          const conflicts = (r.bookings || []).filter(b => 
            b.date === filters.date && timesOverlap(filters.start_time, filters.end_time, b.start_time, b.end_time)
          );
          return conflicts.length === 0;
        });
      }

      return roomsList;
    },

    async getById(id) {
      if (supabase) {
        const { data, error } = await supabase.from('rooms').select('*, bookings(*)').or(`id.eq.${id},room_number.eq.${id}`).single();
        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
      } else {
        const row = sqliteDb.prepare('SELECT * FROM rooms WHERE id = ? OR room_number = ?').get(id, id);
        if (!row) return null;
        const bookings = sqliteDb.prepare('SELECT * FROM bookings WHERE room_id = ?').all(row.id);
        return {
          ...row,
          equipment: typeof row.equipment === 'string' ? JSON.parse(row.equipment) : (row.equipment || []),
          bookings
        };
      }
    },

    async create(record) {
      if (supabase) {
        const { bookings, ...roomData } = record;
        const { data, error } = await supabase.from('rooms').insert(roomData).select().single();
        if (error) throw error;
        return { ...data, bookings: [] };
      } else {
        const stmt = sqliteDb.prepare(`
          INSERT INTO rooms (id, room_number, type, capacity, equipment, floor, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          record.id,
          record.room_number,
          record.type,
          record.capacity,
          JSON.stringify(record.equipment || []),
          record.floor || null,
          record.status || 'available'
        );
        return this.getById(record.id);
      }
    },

    async update(id, updates) {
      if (supabase) {
        const { bookings, ...roomData } = updates;
        const { data, error } = await supabase.from('rooms').update(roomData).eq('id', id).select('*, bookings(*)').single();
        if (error) throw error;
        return data;
      } else {
        const existing = await this.getById(id);
        if (!existing) return null;
        const merged = { ...existing, ...updates };
        const stmt = sqliteDb.prepare(`
          UPDATE rooms
          SET room_number = ?, type = ?, capacity = ?, equipment = ?, floor = ?, status = ?
          WHERE id = ?
        `);
        stmt.run(
          merged.room_number,
          merged.type,
          merged.capacity,
          JSON.stringify(merged.equipment || []),
          merged.floor,
          merged.status,
          existing.id
        );
        return this.getById(existing.id);
      }
    },

    async delete(id) {
      const existing = await this.getById(id);
      if (!existing) return false;
      if (supabase) {
        const { error } = await supabase.from('rooms').delete().eq('id', existing.id);
        if (error) throw error;
        return true;
      } else {
        const res = sqliteDb.prepare('DELETE FROM rooms WHERE id = ?').run(existing.id);
        return res.changes > 0;
      }
    },

    async addBooking(roomIdOrNumber, bookingData) {
      const room = await this.getById(roomIdOrNumber);
      if (!room) {
        const err = new Error(`Room '${roomIdOrNumber}' not found`);
        err.statusCode = 404;
        err.code = 'room_not_found';
        throw err;
      }

      // Check conflict
      const conflicts = (room.bookings || []).filter(b => 
        b.date === bookingData.date && timesOverlap(bookingData.start_time, bookingData.end_time, b.start_time, b.end_time)
      );

      if (conflicts.length > 0) {
        const err = new Error(`Room ${room.room_number} is already booked on ${bookingData.date} from ${conflicts[0].start_time} to ${conflicts[0].end_time}`);
        err.statusCode = 409;
        err.code = 'room_unavailable';
        err.conflictingBooking = conflicts[0];
        throw err;
      }

      const bookingId = bookingData.booking_id || `bk-${Date.now()}-${Math.floor(Math.random()*1000)}`;
      const newBooking = {
        booking_id: bookingId,
        room_id: room.id,
        booked_by: bookingData.booked_by,
        date: bookingData.date,
        start_time: bookingData.start_time,
        end_time: bookingData.end_time,
        purpose: bookingData.purpose || ''
      };

      if (supabase) {
        const { data, error } = await supabase.from('bookings').insert(newBooking).select().single();
        if (error) throw error;
        return data;
      } else {
        const stmt = sqliteDb.prepare(`
          INSERT INTO bookings (booking_id, room_id, booked_by, date, start_time, end_time, purpose)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          newBooking.booking_id,
          newBooking.room_id,
          newBooking.booked_by,
          newBooking.date,
          newBooking.start_time,
          newBooking.end_time,
          newBooking.purpose
        );
        return newBooking;
      }
    },

    async deleteBooking(roomIdOrNumber, bookingId) {
      const room = await this.getById(roomIdOrNumber);
      if (!room) return false;

      if (supabase) {
        const { error } = await supabase.from('bookings').delete().match({ booking_id: bookingId, room_id: room.id });
        if (error) throw error;
        return true;
      } else {
        const res = sqliteDb.prepare('DELETE FROM bookings WHERE booking_id = ? AND room_id = ?').run(bookingId, room.id);
        return res.changes > 0;
      }
    }
  },

  events: {
    async getAll(filters = {}) {
      if (supabase) {
        let query = supabase.from('events').select('*, registrations:event_registrations(*)');
        if (filters.status) query = query.eq('status', filters.status);
        if (filters.after) query = query.gte('date', filters.after);
        const { data, error } = await query;
        if (error) throw error;
        return data;
      } else {
        let sql = 'SELECT * FROM events WHERE 1=1';
        const params = [];
        if (filters.status) {
          sql += ' AND status = ?';
          params.push(filters.status);
        }
        if (filters.after) {
          sql += ' AND date >= ?';
          params.push(filters.after);
        }
        sql += ' ORDER BY date ASC, start_time ASC';
        const rows = sqliteDb.prepare(sql).all(...params);
        const regStmt = sqliteDb.prepare('SELECT student_id, name FROM event_registrations WHERE event_id = ?');
        return rows.map(evt => ({
          ...evt,
          registrations: regStmt.all(evt.id)
        }));
      }
    },

    async getById(id) {
      if (supabase) {
        const { data, error } = await supabase
          .from('events')
          .select('*, registrations:event_registrations(*)')
          .or(`id.eq.${id},name.ilike.%${id}%`)
          .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
      } else {
        let row = sqliteDb.prepare('SELECT * FROM events WHERE id = ?').get(id);
        if (!row) {
          row = sqliteDb.prepare('SELECT * FROM events WHERE name LIKE ?').get(`%${id}%`);
        }
        if (!row) return null;
        const registrations = sqliteDb.prepare('SELECT student_id, name FROM event_registrations WHERE event_id = ?').all(row.id);
        return {
          ...row,
          registrations
        };
      }
    },

    async create(record) {
      if (supabase) {
        const { registrations, ...evtData } = record;
        const { data, error } = await supabase.from('events').insert(evtData).select().single();
        if (error) throw error;
        return { ...data, registrations: [] };
      } else {
        const stmt = sqliteDb.prepare(`
          INSERT INTO events (id, name, description, date, start_time, end_time, end_date, venue, organizer, capacity, registered, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          record.id,
          record.name,
          record.description || '',
          record.date,
          record.start_time,
          record.end_time,
          record.end_date || record.date,
          record.venue || '',
          record.organizer || '',
          record.capacity,
          record.registered || 0,
          record.status || 'upcoming'
        );
        return this.getById(record.id);
      }
    },

    async update(id, updates) {
      if (supabase) {
        const { registrations, ...evtData } = updates;
        const { data, error } = await supabase.from('events').update(evtData).eq('id', id).select('*, registrations:event_registrations(*)').single();
        if (error) throw error;
        return data;
      } else {
        const existing = await this.getById(id);
        if (!existing) return null;
        const merged = { ...existing, ...updates };
        const stmt = sqliteDb.prepare(`
          UPDATE events
          SET name = ?, description = ?, date = ?, start_time = ?, end_time = ?, end_date = ?, venue = ?, organizer = ?, capacity = ?, registered = ?, status = ?
          WHERE id = ?
        `);
        stmt.run(
          merged.name,
          merged.description,
          merged.date,
          merged.start_time,
          merged.end_time,
          merged.end_date,
          merged.venue,
          merged.organizer,
          merged.capacity,
          merged.registered,
          merged.status,
          existing.id
        );
        return this.getById(existing.id);
      }
    },

    async delete(id) {
      const existing = await this.getById(id);
      if (!existing) return false;
      if (supabase) {
        const { error } = await supabase.from('events').delete().eq('id', existing.id);
        if (error) throw error;
        return true;
      } else {
        const res = sqliteDb.prepare('DELETE FROM events WHERE id = ?').run(existing.id);
        return res.changes > 0;
      }
    },

    async registerStudent(eventIdOrName, studentData) {
      const event = await this.getById(eventIdOrName);
      if (!event) {
        const err = new Error(`Event '${eventIdOrName}' not found`);
        err.statusCode = 404;
        err.code = 'event_not_found';
        throw err;
      }

      // Check if already registered
      const isAlreadyRegistered = (event.registrations || []).some(r => r.student_id === studentData.student_id);
      if (isAlreadyRegistered) {
        const err = new Error(`Student ${studentData.student_id} is already registered for ${event.name}`);
        err.statusCode = 400;
        err.code = 'already_registered';
        throw err;
      }

      // Check capacity
      if (event.registered >= event.capacity) {
        const err = new Error(`Event '${event.name}' is already at full capacity (${event.capacity}/${event.capacity})`);
        err.statusCode = 409;
        err.code = 'event_full';
        throw err;
      }

      const newRegisteredCount = event.registered + 1;
      const newStatus = newRegisteredCount >= event.capacity ? 'full' : event.status;

      if (supabase) {
        const { error: regErr } = await supabase.from('event_registrations').insert({
          event_id: event.id,
          student_id: studentData.student_id,
          name: studentData.name
        });
        if (regErr) throw regErr;
        const { data, error: updateErr } = await supabase
          .from('events')
          .update({ registered: newRegisteredCount, status: newStatus })
          .eq('id', event.id)
          .select('*, registrations:event_registrations(*)')
          .single();
        if (updateErr) throw updateErr;
        return data;
      } else {
        sqliteDb.prepare('INSERT INTO event_registrations (event_id, student_id, name) VALUES (?, ?, ?)').run(
          event.id,
          studentData.student_id,
          studentData.name
        );
        sqliteDb.prepare('UPDATE events SET registered = ?, status = ? WHERE id = ?').run(
          newRegisteredCount,
          newStatus,
          event.id
        );
        return this.getById(event.id);
      }
    },

    async cancelRegistration(eventIdOrName, studentId) {
      const event = await this.getById(eventIdOrName);
      if (!event) return false;

      const isRegistered = (event.registrations || []).some(r => r.student_id === studentId);
      if (!isRegistered) return false;

      const newRegisteredCount = Math.max(0, event.registered - 1);
      const newStatus = event.status === 'full' ? 'upcoming' : event.status;

      if (supabase) {
        const { error: delErr } = await supabase
          .from('event_registrations')
          .delete()
          .match({ event_id: event.id, student_id: studentId });
        if (delErr) throw delErr;
        await supabase.from('events').update({ registered: newRegisteredCount, status: newStatus }).eq('id', event.id);
        return true;
      } else {
        sqliteDb.prepare('DELETE FROM event_registrations WHERE event_id = ? AND student_id = ?').run(event.id, studentId);
        sqliteDb.prepare('UPDATE events SET registered = ?, status = ? WHERE id = ?').run(newRegisteredCount, newStatus, event.id);
        return true;
      }
    }
  },

  announcements: {
    async getAll(filters = {}) {
      if (supabase) {
        let query = supabase.from('announcements').select('*');
        if (filters.priority) query = query.eq('priority', filters.priority);
        if (filters.active_only) {
          const today = new Date().toISOString().split('T')[0];
          query = query.gte('expires', today);
        }
        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw error;
        return data;
      } else {
        let sql = 'SELECT * FROM announcements WHERE 1=1';
        const params = [];
        if (filters.priority) {
          sql += ' AND priority = ?';
          params.push(filters.priority);
        }
        if (filters.active_only) {
          const today = new Date().toISOString().split('T')[0];
          sql += ' AND expires >= ?';
          params.push(today);
        }
        sql += ' ORDER BY date DESC';
        return sqliteDb.prepare(sql).all(...params);
      }
    },

    async getById(id) {
      if (supabase) {
        const { data, error } = await supabase.from('announcements').select('*').eq('id', id).single();
        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
      } else {
        return sqliteDb.prepare('SELECT * FROM announcements WHERE id = ?').get(id) || null;
      }
    },

    async create(record) {
      if (supabase) {
        const { data, error } = await supabase.from('announcements').insert(record).select().single();
        if (error) throw error;
        return data;
      } else {
        const stmt = sqliteDb.prepare(`
          INSERT INTO announcements (id, title, body, date, priority, posted_by, expires)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          record.id,
          record.title,
          record.body || '',
          record.date,
          record.priority,
          record.posted_by || '',
          record.expires || null
        );
        return this.getById(record.id);
      }
    },

    async update(id, updates) {
      if (supabase) {
        const { data, error } = await supabase.from('announcements').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
      } else {
        const existing = await this.getById(id);
        if (!existing) return null;
        const merged = { ...existing, ...updates };
        const stmt = sqliteDb.prepare(`
          UPDATE announcements
          SET title = ?, body = ?, date = ?, priority = ?, posted_by = ?, expires = ?
          WHERE id = ?
        `);
        stmt.run(
          merged.title,
          merged.body,
          merged.date,
          merged.priority,
          merged.posted_by,
          merged.expires,
          id
        );
        return this.getById(id);
      }
    },

    async delete(id) {
      if (supabase) {
        const { error } = await supabase.from('announcements').delete().eq('id', id);
        if (error) throw error;
        return true;
      } else {
        const res = sqliteDb.prepare('DELETE FROM announcements WHERE id = ?').run(id);
        return res.changes > 0;
      }
    }
  },

  assignments: {
    async getAll(filters = {}) {
      if (supabase) {
        let query = supabase.from('assignments').select('*');
        if (filters.status) query = query.eq('status', filters.status);
        if (filters.course) query = query.ilike('course', `%${filters.course}%`);
        if (filters.due_before) query = query.lte('deadline', filters.due_before);
        const { data, error } = await query.order('deadline', { ascending: true });
        if (error) throw error;
        return data;
      } else {
        let sql = 'SELECT * FROM assignments WHERE 1=1';
        const params = [];
        if (filters.status) {
          sql += ' AND status = ?';
          params.push(filters.status);
        }
        if (filters.course) {
          sql += ' AND course LIKE ?';
          params.push(`%${filters.course}%`);
        }
        if (filters.due_before) {
          sql += ' AND deadline <= ?';
          params.push(filters.due_before);
        }
        sql += ' ORDER BY deadline ASC';
        return sqliteDb.prepare(sql).all(...params);
      }
    },

    async getById(id) {
      if (supabase) {
        const { data, error } = await supabase.from('assignments').select('*').eq('id', id).single();
        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
      } else {
        return sqliteDb.prepare('SELECT * FROM assignments WHERE id = ?').get(id) || null;
      }
    },

    async create(record) {
      if (supabase) {
        const { data, error } = await supabase.from('assignments').insert(record).select().single();
        if (error) throw error;
        return data;
      } else {
        const stmt = sqliteDb.prepare(`
          INSERT INTO assignments (id, course, course_title, title, description, assigned_date, deadline, submission_platform, status, marks)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          record.id,
          record.course,
          record.course_title || '',
          record.title,
          record.description || '',
          record.assigned_date || null,
          record.deadline,
          record.submission_platform || '',
          record.status || 'pending',
          record.marks ?? null
        );
        return this.getById(record.id);
      }
    },

    async update(id, updates) {
      if (supabase) {
        const { data, error } = await supabase.from('assignments').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
      } else {
        const existing = await this.getById(id);
        if (!existing) return null;
        const merged = { ...existing, ...updates };
        const stmt = sqliteDb.prepare(`
          UPDATE assignments
          SET course = ?, course_title = ?, title = ?, description = ?, assigned_date = ?, deadline = ?, submission_platform = ?, status = ?, marks = ?
          WHERE id = ?
        `);
        stmt.run(
          merged.course,
          merged.course_title,
          merged.title,
          merged.description,
          merged.assigned_date,
          merged.deadline,
          merged.submission_platform,
          merged.status,
          merged.marks,
          id
        );
        return this.getById(id);
      }
    },

    async delete(id) {
      if (supabase) {
        const { error } = await supabase.from('assignments').delete().eq('id', id);
        if (error) throw error;
        return true;
      } else {
        const res = sqliteDb.prepare('DELETE FROM assignments WHERE id = ?').run(id);
        return res.changes > 0;
      }
    }
  },

  users: {
    async getAll() {
      if (supabase) {
        const { data, error } = await supabase.from('users').select('id, name, email, student_id, department, role, avatar, created_at');
        if (error) throw error;
        return data;
      } else {
        return sqliteDb.prepare('SELECT id, name, email, student_id, department, role, avatar, created_at FROM users ORDER BY created_at ASC').all();
      }
    },

    async getById(id) {
      if (supabase) {
        const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
      } else {
        return sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
      }
    },

    async getByEmail(email) {
      const normalized = (email || '').trim().toLowerCase();
      if (supabase) {
        const { data, error } = await supabase.from('users').select('*').ilike('email', normalized).single();
        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
      } else {
        return sqliteDb.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(normalized) || null;
      }
    },

    async getByStudentId(studentId) {
      const normalized = (studentId || '').trim().toLowerCase();
      if (supabase) {
        const { data, error } = await supabase.from('users').select('*').ilike('student_id', normalized).single();
        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
      } else {
        return sqliteDb.prepare('SELECT * FROM users WHERE LOWER(student_id) = LOWER(?)').get(normalized) || null;
      }
    },

    async getByIdentifier(identifier) {
      const normalized = (identifier || '').trim().toLowerCase();
      if (supabase) {
        const { data, error } = await supabase.from('users').select('*').or(`email.ilike.${normalized},student_id.ilike.${normalized}`).single();
        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
      } else {
        return sqliteDb.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(student_id) = LOWER(?)').get(normalized, normalized) || null;
      }
    },

    async create(record) {
      const newUser = {
        id: record.id || `usr-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        name: record.name,
        email: record.email.trim().toLowerCase(),
        student_id: record.student_id ? record.student_id.trim() : null,
        department: record.department || 'Computer Science & Engineering',
        role: record.role || 'Student',
        password_hash: record.password_hash,
        avatar: record.avatar || (record.role === 'Faculty' ? '👨‍🏫' : record.role === 'Club Organizer' ? '🏆' : '👨‍🎓'),
        created_at: record.created_at || new Date().toISOString()
      };

      if (supabase) {
        const { data, error } = await supabase.from('users').insert(newUser).select().single();
        if (error) throw error;
        return data;
      } else {
        const stmt = sqliteDb.prepare(`
          INSERT INTO users (id, name, email, student_id, department, role, password_hash, avatar, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          newUser.id,
          newUser.name,
          newUser.email,
          newUser.student_id,
          newUser.department,
          newUser.role,
          newUser.password_hash,
          newUser.avatar,
          newUser.created_at
        );
        return this.getById(newUser.id);
      }
    },

    async update(id, updates) {
      const existing = await this.getById(id);
      if (!existing) return null;
      const merged = { ...existing, ...updates };

      if (supabase) {
        const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
      } else {
        const stmt = sqliteDb.prepare(`
          UPDATE users
          SET name = ?, email = ?, student_id = ?, department = ?, role = ?, password_hash = ?, avatar = ?
          WHERE id = ?
        `);
        stmt.run(
          merged.name,
          merged.email,
          merged.student_id,
          merged.department,
          merged.role,
          merged.password_hash,
          merged.avatar,
          id
        );
        return this.getById(id);
      }
    },

    async delete(id) {
      if (supabase) {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
        return true;
      } else {
        const res = sqliteDb.prepare('DELETE FROM users WHERE id = ?').run(id);
        return res.changes > 0;
      }
    }
  }
};
