import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, hashPassword } from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Search for data directory
function findDataDir() {
  const possiblePaths = [
    path.resolve(__dirname, '../../../data'),
    path.resolve(__dirname, '../../data'),
    path.resolve(process.cwd(), 'data'),
    path.resolve(process.cwd(), '../data')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Could not locate data/ directory containing seed JSON files.');
}

async function seed() {
  console.log('🌱 Starting CampusOS database seed...');
  const dataDir = findDataDir();
  console.log(`📁 Loading seed data from: ${dataDir}`);

  // 1. Schedules
  const schedulesRaw = fs.readFileSync(path.join(dataDir, 'schedules.json'), 'utf-8');
  const schedules = JSON.parse(schedulesRaw);
  console.log(`⏳ Seeding ${schedules.length} schedules...`);
  for (const item of schedules) {
    const existing = await db.schedules.getById(item.id);
    if (existing) {
      await db.schedules.update(item.id, item);
    } else {
      await db.schedules.create(item);
    }
  }
  console.log('✅ Schedules seeded.');

  // 2. Rooms & Bookings
  const roomsRaw = fs.readFileSync(path.join(dataDir, 'rooms.json'), 'utf-8');
  const rooms = JSON.parse(roomsRaw);
  console.log(`⏳ Seeding ${rooms.length} rooms...`);
  for (const item of rooms) {
    const { bookings = [], ...roomData } = item;
    const existing = await db.rooms.getById(item.id);
    if (existing) {
      await db.rooms.update(item.id, roomData);
    } else {
      await db.rooms.create(roomData);
    }

    // Seed room bookings
    for (const b of bookings) {
      try {
        await db.rooms.addBooking(item.id, b);
      } catch (err) {
        // If already exists or booked, ignore in seed upsert
      }
    }
  }
  console.log('✅ Rooms & bookings seeded.');

  // 3. Events & Registrations
  const eventsRaw = fs.readFileSync(path.join(dataDir, 'events.json'), 'utf-8');
  const events = JSON.parse(eventsRaw);
  console.log(`⏳ Seeding ${events.length} events...`);
  for (const item of events) {
    const { registrations = [], ...evtData } = item;
    const existing = await db.events.getById(item.id);
    if (existing) {
      await db.events.update(item.id, evtData);
    } else {
      await db.events.create(evtData);
    }

    // Seed registrations
    for (const reg of registrations) {
      try {
        await db.events.registerStudent(item.id, reg);
      } catch (err) {
        // If already registered or full, ignore in seed upsert
      }
    }
  }
  console.log('✅ Events & registrations seeded.');

  // 4. Announcements
  const annRaw = fs.readFileSync(path.join(dataDir, 'announcements.json'), 'utf-8');
  const announcements = JSON.parse(annRaw);
  console.log(`⏳ Seeding ${announcements.length} announcements...`);
  for (const item of announcements) {
    const existing = await db.announcements.getById(item.id);
    if (existing) {
      await db.announcements.update(item.id, item);
    } else {
      await db.announcements.create(item);
    }
  }
  console.log('✅ Announcements seeded.');

  // 5. Assignments
  const asgnRaw = fs.readFileSync(path.join(dataDir, 'assignments.json'), 'utf-8');
  const assignments = JSON.parse(asgnRaw);
  console.log(`⏳ Seeding ${assignments.length} assignments...`);
  for (const item of assignments) {
    const existing = await db.assignments.getById(item.id);
    if (existing) {
      await db.assignments.update(item.id, item);
    } else {
      await db.assignments.create(item);
    }
  }
  console.log('✅ Assignments seeded.');

  // 6. Default Users (Authentication)
  const defaultUsers = [
    {
      id: 'usr-001',
      name: 'Sakibul Hassan',
      email: '20-40532@aust.edu',
      student_id: '20-40532',
      department: 'Computer Science & Engineering',
      role: 'Student',
      password_hash: hashPassword('password123'),
      avatar: '👨‍🎓',
      created_at: '2026-09-01T00:00:00.000Z'
    },
    {
      id: 'usr-002',
      name: 'Prof. Dr. Md. Shahriar Mahbub',
      email: 'mahbub.cse@aust.edu',
      student_id: 'FAC-701',
      department: 'Computer Science & Engineering',
      role: 'Faculty',
      password_hash: hashPassword('password123'),
      avatar: '👨‍🏫',
      created_at: '2026-09-01T00:00:00.000Z'
    },
    {
      id: 'usr-003',
      name: 'AUSTPIC Executive',
      email: 'austpic@aust.edu',
      student_id: 'CLUB-01',
      department: 'CSE / AUSTPIC',
      role: 'Club Organizer',
      password_hash: hashPassword('password123'),
      avatar: '🏆',
      created_at: '2026-09-01T00:00:00.000Z'
    }
  ];

  console.log(`⏳ Seeding ${defaultUsers.length} initial user accounts...`);
  for (const u of defaultUsers) {
    const existing = await db.users.getById(u.id);
    if (existing) {
      await db.users.update(u.id, u);
    } else {
      await db.users.create(u);
    }
  }
  console.log('✅ User accounts seeded.');

  console.log('🎉 Seeding successfully completed!');
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
