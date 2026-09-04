-- CampusOS Database Schema (Postgres / Supabase)
-- Mirroring schema/schema.md exact field definitions

CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  course TEXT NOT NULL,
  title TEXT NOT NULL,
  day TEXT NOT NULL CHECK (day IN ('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday')),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  room TEXT NOT NULL,
  instructor TEXT,
  section TEXT
);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  room_number TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('classroom', 'lab', 'seminar')),
  capacity INTEGER NOT NULL,
  equipment TEXT[] DEFAULT '{}',
  floor INTEGER,
  status TEXT NOT NULL DEFAULT 'available'
);

CREATE TABLE IF NOT EXISTS bookings (
  booking_id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  booked_by TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  purpose TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  end_date DATE,
  venue TEXT,
  organizer TEXT,
  capacity INTEGER NOT NULL,
  registered INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'upcoming'
);

CREATE TABLE IF NOT EXISTS event_registrations (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  name TEXT NOT NULL,
  PRIMARY KEY (event_id, student_id)
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  date DATE NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  posted_by TEXT,
  expires DATE
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  course TEXT NOT NULL,
  course_title TEXT,
  title TEXT NOT NULL,
  description TEXT,
  assigned_date DATE,
  deadline DATE NOT NULL,
  submission_platform TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  marks NUMERIC
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  student_id TEXT UNIQUE,
  department TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Student' CHECK (role IN ('Student', 'Faculty', 'Club Organizer', 'Admin')),
  password_hash TEXT NOT NULL,
  avatar TEXT DEFAULT '👨‍🎓',
  created_at TEXT NOT NULL
);
