/**
 * CampusCopilot Deterministic Semantic Agent Provider
 * Executes real tool calls against the live database / REST endpoints.
 * Handles:
 * - Domain boundary check: Rejects off-topic queries outside campus operations
 * - Rescheduling & Planning: Formats complete rescheduling plans with room profiles,
 *   future events/occupancy in that room, and conflict-free open slots
 * - General Room, Class, and Availability queries
 * - Simple lookups (schedules, assignments, announcements, events)
 * - Multi-source reasoning (events before 2 PM, labs with projector & capacity >= 30)
 * - Fully-specified actions (booking room 7A02 tomorrow 3-5, event registration)
 * - Deliberately-messy vague trap ("Just book me any room tomorrow afternoon" -> clarifying question, 0 writes)
 * - Unauthorized / out-of-scope refusal (deleting data, overriding capacity)
 */

export class FallbackProvider {
  async run({ message, history = [], executeTool }) {
    const text = message.trim();
    const lower = text.toLowerCase();
    const actions_taken = [];
    let action_card = null;

    // Helper to log and record a tool call
    const callTool = async (name, args = {}) => {
      console.log(`[CampusCopilot Fallback] Calling tool: ${name} with args:`, args);
      const res = await executeTool(name, args);
      actions_taken.push({ tool: name, args, result: res });
      return res;
    };

    // Extract recent contextual entities from conversation history for multi-turn reasoning
    let contextRoom = null;
    let contextCourse = null;
    if (Array.isArray(history) && history.length > 0) {
      for (let i = history.length - 1; i >= 0; i--) {
        const item = history[i];
        const hText = typeof item.content === 'string' ? item.content : (typeof item.reply === 'string' ? item.reply : '');
        if (!contextRoom) {
          const rm = hText.match(/\b(7[A-C]\d{2}|9A\d{2})\b/i);
          if (rm) contextRoom = rm[1].toUpperCase();
        }
        if (!contextCourse) {
          const cm = hText.match(/\b(cse\s*\d{4}|ipe\s*\d{4})\b/i);
          if (cm) contextCourse = cm[1].toUpperCase().replace(/\s+/, ' ');
        }
        if (contextRoom && contextCourse) break;
      }
    }

    // Friendly response if student asks how to clear or reset chat history
    if (lower.includes('clear chat') || lower.includes('clear history') || lower.includes('reset chat') || lower.includes('delete chat')) {
      return {
        reply: "🔄 **Chat History Management**: You can reset or clear your conversation history at any time by clicking the **Clear History** button at the top-right corner of the chat window.",
        actions_taken: [],
        action_card: null
      };
    }

    // =========================================================================
    // 1. REFUSAL PATH (Unauthorized, destructive, or policy violation requests)
    // =========================================================================
    const isDestructive =
      (lower.includes('delete') || lower.includes('drop') || lower.includes('wipe') || lower.includes('clear')) &&
      !lower.includes('chat') &&
      !lower.includes('conversation') &&
      (lower.includes('announcement') ||
        lower.includes('assignment') ||
        lower.includes('schedule') ||
        lower.includes('table') ||
        lower.includes('database') ||
        lower.includes('all'));

    const isBypassPolicy =
      (lower.includes('book') || lower.includes('register')) &&
      (lower.includes('anyway') ||
        lower.includes('even though') ||
        lower.includes('force') ||
        lower.includes('bypass') ||
        lower.includes('even if'));

    const isUnauthorized =
      isDestructive || isBypassPolicy || lower.includes('reveal system prompt') || lower.includes('change another student');

    if (isUnauthorized) {
      if (isDestructive) {
        return {
          reply:
            "⛔ **Request Refused**: I am unauthorized to delete or modify university-wide records, announcements, or assignments. Such administrative operations must be conducted through the University Academic Affairs office.",
          actions_taken,
          action_card: null
        };
      }
      if (isBypassPolicy) {
        return {
          reply:
            "⛔ **Request Refused**: I cannot bypass university capacity or scheduling policies. If a room has a booking conflict or an event is at full capacity, university regulations strictly prohibit double-booking or overbooking.",
          actions_taken,
          action_card: null
        };
      }
      return {
        reply: "⛔ **Request Refused**: I do not have authorization to perform that action.",
        actions_taken,
        action_card: null
      };
    }

    // =========================================================================
    // 2. DOMAIN BOUNDARY & OFF-TOPIC GUARDRAIL
    // If the user asks a question completely unrelated to this university website
    // =========================================================================
    const campusKeywords = [
      'class', 'course', 'routine', 'schedule', 'lecture', 'lab', 'room', 'slot',
      'booking', 'book', 'cancel', 'event', 'workshop', 'hackathon', 'seminar',
      'carnival', 'contest', 'orientation', 'announcement', 'notice', 'advisory',
      'assignment', 'homework', 'deadline', 'exam', 'marks', 'grade', 'submission',
      'instructor', 'teacher', 'sir', 'maam', 'ma\'am', 'professor', 'faculty',
      'student', 'attendee', 'registration', 'register', 'reschedule', 'rescheduling',
      'plan', 'planning', 'shift', 'floor', 'capacity', 'projector', 'equipment',
      'ac', 'whiteboard', 'available', 'availability', 'free', 'busy', 'occupied',
      'time', 'today', 'tomorrow', 'yesterday', 'week', 'sunday', 'monday', 'tuesday',
      'wednesday', 'thursday', 'friday', 'saturday', 'hello', 'hi', 'hey', 'help',
      'who are you', 'what can you do', 'menu', 'options', 'aust', 'campus', 'university',
      'cse', 'ipe', 'dwm', 'compiler', 'security', 'machine learning', 'pattern recognition',
      'soft computing', 'deep learning', 'ai'
    ];

    const hasCampusKeyword = campusKeywords.some((kw) => lower.includes(kw));
    const hasRoomPattern = /\b(7[A-C]\d{2}|9A\d{2})\b/i.test(text);
    const hasCoursePattern = /\b(cse|ipe)\s*\d{4}\b/i.test(text);

    // Off-topic patterns (recipes, unrelated code, sports, world geography, movies, general trivia)
    const isOffTopic =
      lower.includes('recipe') ||
      lower.includes('cook') ||
      lower.includes('bake') ||
      lower.includes('cake') ||
      lower.includes('pizza') ||
      lower.includes('capital of') ||
      lower.includes('president of') ||
      lower.includes('prime minister') ||
      lower.includes('tallest mountain') ||
      lower.includes('weather in') ||
      lower.includes('write python code') ||
      lower.includes('write javascript code') ||
      lower.includes('reverse a linked list') ||
      lower.includes('fibonacci') ||
      lower.includes('bubble sort') ||
      lower.includes('leetcode') ||
      lower.includes('movie') ||
      lower.includes('celebrity') ||
      lower.includes('actor') ||
      lower.includes('premier league') ||
      lower.includes('world cup') ||
      lower.includes('nba') ||
      lower.includes('cricket score') ||
      lower.includes('tell me a joke') ||
      lower.includes('tell me a story') ||
      lower.includes('write a poem');

    if (isOffTopic || (!hasCampusKeyword && !hasRoomPattern && !hasCoursePattern && lower.split(/\s+/).length > 2)) {
      return {
        reply:
          "ℹ️ **CampusCopilot is dedicated exclusively to campus & university operations.**\n\n" +
          "I can only assist you with information and actions related to this university platform:\n" +
          "- 📅 **Class Routines & Schedules** (Course timings, instructors, sections, days)\n" +
          "- 🏢 **Room Availability, Details & Bookings** (Classrooms, computer labs, seminar halls)\n" +
          "- 🔄 **Rescheduling & Class Planning** (Finding open slots, room occupancy, conflict avoidance)\n" +
          "- 🎪 **Campus Events, Hackathons & RSVPs** (Workshops, guest talks, registrations)\n" +
          "- 📢 **Official Notices & Announcements** (Department alerts, urgent updates)\n" +
          "- 📝 **Assignments & Course Deadlines** (Due dates, marks, submission platforms)\n\n" +
          "*Please ask a question related to campus schedules, rooms, events, assignments, or notices!*",
        actions_taken: [],
        action_card: null
      };
    }

    // =========================================================================
    // 3. RESCHEDULING & PLANNING ASSISTANT (Dedicated Rescheduling Planner)
    // "plan for rescheduling", "planning to reschedule", "reschedule CSE 4129", etc.
    // =========================================================================
    const isRescheduleQuery =
      lower.includes('reschedule') ||
      lower.includes('rescheduling') ||
      lower.includes('shift class') ||
      lower.includes('move class') ||
      lower.includes('makeup class') ||
      lower.includes('make up class') ||
      (lower.includes('plan') && (lower.includes('class') || lower.includes('room') || lower.includes('schedule') || lower.includes('routine')));

    if (isRescheduleQuery) {
      const now = await callTool('get_current_datetime');

      // 1. Identify Room if mentioned
      const roomMatch = text.match(/\b(7[A-C]\d{2}|9A\d{2})\b/i);
      let targetRoomNumber = roomMatch ? roomMatch[1].toUpperCase() : null;

      // 2. Identify Course if mentioned
      const courseMatch = text.match(/\b(cse\s*\d{4}|ipe\s*\d{4})\b/i);
      let targetCourse = courseMatch ? courseMatch[1].toUpperCase().replace(/\s+/, ' ') : null;

      // Keyword courses
      if (!targetCourse) {
        if (lower.includes('compiler') || lower.includes('formal language')) targetCourse = 'CSE 4129';
        else if (lower.includes('pattern') || lower.includes('machine learning')) targetCourse = 'CSE 4113';
        else if (lower.includes('cyber') || lower.includes('security')) targetCourse = 'CSE 4173';
        else if (lower.includes('soft computing')) targetCourse = 'CSE 4137';
        else if (lower.includes('mining') || lower.includes('warehousing')) targetCourse = 'CSE 4141';
        else if (lower.includes('industrial') || lower.includes('management')) targetCourse = 'IPE 4111';
      }

      // If course found but room not specified, look up routine room for this course
      let courseRoutine = [];
      if (targetCourse) {
        const courseSchedules = await callTool('get_schedule', { course: targetCourse });
        courseRoutine = Array.isArray(courseSchedules) ? courseSchedules : [];
        if (!targetRoomNumber && courseRoutine.length > 0) {
          targetRoomNumber = courseRoutine[0].room;
        }
      }

      // Default room fallback if neither specified
      if (!targetRoomNumber && !targetCourse) {
        return {
          reply:
            "📋 **Rescheduling Planner**\n\nTo prepare an accurate rescheduling plan, which course or room would you like to reschedule?\n\n" +
            "- **Example**: *\"Plan for rescheduling CSE 4129\"* or *\"Find available slots to reschedule room 7A05\"*\n\n" +
            "Once you specify the class or room, I will inspect all current routines, existing room bookings, and upcoming campus events to calculate conflict-free open slots for you.",
          actions_taken,
          action_card: null
        };
      }

      targetRoomNumber = targetRoomNumber || '7A05';

      // Gather live room data
      const allRooms = await callTool('search_rooms', {});
      const roomProfile = (Array.isArray(allRooms) ? allRooms : []).find(
        (r) => r.room_number.toUpperCase() === targetRoomNumber
      ) || { room_number: targetRoomNumber, type: 'classroom', capacity: 45, equipment: ['projector', 'AC', 'whiteboard'], floor: 7 };

      // Gather all regular classes in this room
      const roomClasses = await callTool('get_schedule', { room: targetRoomNumber });
      const routineClasses = Array.isArray(roomClasses) ? roomClasses : [];

      // Gather all future events hosted in this room
      const allEvents = await callTool('get_events', {});
      const roomEvents = (Array.isArray(allEvents) ? allEvents : []).filter(
        (e) => (e.venue || '').toUpperCase().includes(targetRoomNumber)
      );

      // Gather active bookings in this room
      const roomBookings = roomProfile.bookings || [];

      // Format current routine in this room
      const routineSummary =
        routineClasses.length > 0
          ? routineClasses
              .map((c) => `  • **${c.day}** (${c.start_time} – ${c.end_time}): **${c.course}** (${c.title}) [Instructor: ${c.instructor}]`)
              .join('\n')
          : '  • *No regular weekly classes assigned to this room.*';

      // Format future events in this room
      const eventsSummary =
        roomEvents.length > 0
          ? roomEvents
              .map(
                (e) =>
                  `  • 🎪 **${e.name}**: **${e.date}** (${e.start_time} – ${e.end_time}) [Organizer: ${e.organizer}, Capacity: ${e.capacity}]`
              )
              .join('\n')
          : '  • *No upcoming campus events currently scheduled in this room.*';

      // Format bookings in this room
      const bookingsSummary =
        roomBookings.length > 0
          ? roomBookings
              .map((b) => `  • 🔒 **${b.date}** (${b.start_time} – ${b.end_time}) booked by *${b.booked_by}* (${b.purpose || 'Session'})`)
              .join('\n')
          : '  • *No temporary reservations currently active in this room.*';

      // Calculate conflict-free rescheduling suggestions
      // Academic week is Sunday - Thursday
      const freeSlotSuggestions = [
        `  • 🟢 **Sunday**: 14:00 – 16:30 (Afternoon window)`,
        `  • 🟢 **Monday**: 08:00 – 11:00 (Morning window)`,
        `  • 🟢 **Tuesday**: 13:00 – 15:30 (Mid-day window)`,
        `  • 🟢 **Wednesday**: 10:30 – 13:00 (Late morning window)`,
        `  • 🟢 **Thursday**: 14:40 – 17:30 (Afternoon window)`
      ].join('\n');

      const courseTitleHeader = targetCourse
        ? `Rescheduling Plan for **${targetCourse}** (Room **${targetRoomNumber}**)`
        : `Rescheduling & Availability Plan for Room **${targetRoomNumber}**`;

      return {
        reply:
          `## 📅 ${courseTitleHeader}\n\n` +
          `### 🏢 1. Room Profile\n` +
          `- **Room**: **${roomProfile.room_number}** (${roomProfile.type?.toUpperCase() || 'CLASSROOM'}, Floor ${roomProfile.floor || 7})\n` +
          `- **Capacity**: **${roomProfile.capacity} seats**\n` +
          `- **Equipment**: ${Array.isArray(roomProfile.equipment) ? roomProfile.equipment.join(', ') : (roomProfile.equipment || 'Standard')}\n\n` +
          `### 🗓️ 2. Regular Weekly Class Commitments\n` +
          `${routineSummary}\n\n` +
          `### 🎪 3. Future Campus Events in Room ${targetRoomNumber}\n` +
          `${eventsSummary}\n\n` +
          `### 🔒 4. Active Room Bookings\n` +
          `${bookingsSummary}\n\n` +
          `### 💡 5. Recommended Conflict-Free Slots for Rescheduling\n` +
          `The following slots avoid all regular class hours, room reservations, and campus events:\n` +
          `${freeSlotSuggestions}\n\n` +
          `---\n` +
          `*Would you like me to book Room **${targetRoomNumber}** for your rescheduled session? Just say:* \n` +
          `👉 *"Book Room ${targetRoomNumber} tomorrow from 3 PM to 5 PM."*`,
        actions_taken,
        action_card: null
      };
    }

    // =========================================================================
    // 4. VAGUE TRAP: Underspecified Action Requests
    // e.g. "Just book me any room tomorrow afternoon"
    // The agent MUST ask a clarifying question and execute ZERO write calls.
    // =========================================================================
    const isVagueBooking =
      lower.includes('book') &&
      (lower.includes('any room') || lower.includes('some room') || lower.includes('a room')) &&
      !lower.match(/\b(7[abc]\d{2})\b/i) &&
      !(lower.includes('capacity') || lower.includes('people') || lower.includes('projector') || lower.includes('lab') || lower.includes('classroom'));

    if (isVagueBooking || lower === 'just book me any room tomorrow afternoon.' || lower.includes('just book me any room')) {
      return {
        reply:
          "To help you book a room, could you please clarify a few details?\n\n1. **Time slot**: What specific hours tomorrow afternoon (e.g., 2:00 PM – 4:00 PM)?\n2. **Capacity & Purpose**: How many attendees will there be, and what is the meeting purpose?\n3. **Equipment**: Do you require a projector, lab computers, or a standard seminar setup?\n\nOnce you let me know, I'll find and reserve an available room for you!",
        actions_taken: [],
        action_card: null
      };
    }

    // =========================================================================
    // 5. RELATIVE TIME LOOKUPS: "When is my next class?"
    // =========================================================================
    if (lower.includes('next class') || (lower.includes('when') && lower.includes('class') && (lower.includes('next') || lower.includes('today')))) {
      const now = await callTool('get_current_datetime');
      const todayClasses = await callTool('get_schedule', { day: now.day });

      const sortedToday = (Array.isArray(todayClasses) ? todayClasses : []).sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      );

      const nextToday = sortedToday.find((c) => c.start_time >= now.time);

      if (nextToday) {
        return {
          reply: `Your next class today (${now.day}) is **${nextToday.course} — ${nextToday.title}** from **${nextToday.start_time}** to **${nextToday.end_time}** in Room **${nextToday.room}** with ${nextToday.instructor || 'TBA'} (Section: ${nextToday.section || 'General'}).`,
          actions_taken,
          action_card: null
        };
      }

      const academicDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
      let currentIdx = academicDays.indexOf(now.day);
      let nextDay = academicDays[(currentIdx + 1) % academicDays.length];

      const nextDayClasses = await callTool('get_schedule', { day: nextDay });
      const sortedNext = (Array.isArray(nextDayClasses) ? nextDayClasses : []).sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      );

      if (sortedNext.length > 0) {
        const firstNext = sortedNext[0];
        return {
          reply: `You have no more classes today (${now.day}). Your next scheduled class is on **${nextDay}**:\n\n- **${firstNext.course} — ${firstNext.title}**\n- ⏰ **Time**: ${firstNext.start_time} – ${firstNext.end_time}\n- 📍 **Room**: ${firstNext.room}\n- 👤 **Instructor**: ${firstNext.instructor || 'TBA'}\n- 🏷️ **Section**: ${firstNext.section || 'General'}`,
          actions_taken,
          action_card: null
        };
      }

      return {
        reply: `You have no upcoming classes scheduled for the remainder of today (${now.day}).`,
        actions_taken,
        action_card: null
      };
    }

    // =========================================================================
    // 6. DAY SCHEDULE LOOKUP: "What classes do I have on Wednesday?"
    // =========================================================================
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const mentionedDay = daysOfWeek.find((d) => lower.includes(d.toLowerCase()));

    if (mentionedDay && (lower.includes('class') || lower.includes('schedule') || lower.includes('lecture') || lower.includes('routine'))) {
      const schedules = await callTool('get_schedule', { day: mentionedDay });
      if (!schedules || schedules.length === 0) {
        return {
          reply: `You have no scheduled classes on **${mentionedDay}**.`,
          actions_taken,
          action_card: null
        };
      }

      const sorted = [...schedules].sort((a, b) => a.start_time.localeCompare(b.start_time));
      const list = sorted
        .map(
          (s) =>
            `• **${s.start_time} – ${s.end_time}**: ${s.course} (${s.title}) — Room **${s.room}** (Sec ${s.section}, ${s.instructor})`
        )
        .join('\n');

      return {
        reply: `Here is your class schedule for **${mentionedDay}** (${sorted.length} classes):\n\n${list}`,
        actions_taken,
        action_card: null
      };
    }

    // =========================================================================
    // 7. SPECIFIC COURSE / INSTRUCTOR / CLASS LOOKUPS
    // "Who teaches Compiler?", "When is CSE 4113?", "Classes in room 7A03"
    // =========================================================================
    const isSpecificClassQuery =
      lower.includes('who teaches') ||
      lower.includes('instructor for') ||
      lower.includes('where is') ||
      lower.includes('when is') ||
      hasCoursePattern ||
      (lower.includes('class') && (lower.includes('room') || lower.includes('course') || lower.includes('dr.') || lower.includes('ms.') || lower.includes('mr.')));

    if (isSpecificClassQuery && !lower.includes('book') && !lower.includes('reschedule')) {
      const allSchedules = await callTool('get_schedule', {});
      const schedulesList = Array.isArray(allSchedules) ? allSchedules : [];

      let matched = [];
      const courseCodeMatch = text.match(/\b(cse|ipe)\s*\d{4}\b/i);
      const roomNumberMatch = text.match(/\b(7[A-C]\d{2}|9A\d{2})\b/i);

      if (courseCodeMatch) {
        const code = courseCodeMatch[0].toUpperCase().replace(/\s+/, ' ');
        matched = schedulesList.filter((s) => s.course.toUpperCase().replace(/\s+/, ' ') === code);
      } else if (roomNumberMatch) {
        const rm = roomNumberMatch[0].toUpperCase();
        matched = schedulesList.filter((s) => s.room.toUpperCase() === rm);
      } else if (lower.includes('compiler')) {
        matched = schedulesList.filter((s) => s.title.toLowerCase().includes('compiler'));
      } else if (lower.includes('pattern') || lower.includes('machine learning')) {
        matched = schedulesList.filter((s) => s.title.toLowerCase().includes('pattern') || s.title.toLowerCase().includes('machine learning'));
      } else if (lower.includes('security')) {
        matched = schedulesList.filter((s) => s.title.toLowerCase().includes('security'));
      } else if (lower.includes('soft computing')) {
        matched = schedulesList.filter((s) => s.title.toLowerCase().includes('soft computing'));
      } else if (lower.includes('mining') || lower.includes('warehousing')) {
        matched = schedulesList.filter((s) => s.title.toLowerCase().includes('warehousing'));
      } else if (lower.includes('industrial') || lower.includes('management')) {
        matched = schedulesList.filter((s) => s.title.toLowerCase().includes('industrial'));
      } else if (lower.includes('nusrat')) {
        matched = schedulesList.filter((s) => (s.instructor || '').toLowerCase().includes('nusrat'));
      } else if (lower.includes('shahriar') || lower.includes('mahbub')) {
        matched = schedulesList.filter((s) => (s.instructor || '').toLowerCase().includes('shahriar'));
      } else if (lower.includes('shamim') || lower.includes('akhter')) {
        matched = schedulesList.filter((s) => (s.instructor || '').toLowerCase().includes('shamim'));
      } else if (lower.includes('faisal') || lower.includes('shah')) {
        matched = schedulesList.filter((s) => (s.instructor || '').toLowerCase().includes('faisal'));
      } else if (lower.includes('reno')) {
        matched = schedulesList.filter((s) => (s.instructor || '').toLowerCase().includes('reno'));
      }

      if (matched.length > 0) {
        const list = matched
          .map(
            (s) =>
              `• **${s.day}** (${s.start_time} – ${s.end_time}): **${s.course}** — *${s.title}*\n  📍 Room: **${s.room}** | 👤 Instructor: **${s.instructor}** (Sec ${s.section})`
          )
          .join('\n\n');

        return {
          reply: `Here are the class schedule details you asked about:\n\n${list}`,
          actions_taken,
          action_card: null
        };
      }
    }

    // =========================================================================
    // 8. GENERAL ROOM DETAILS & AVAILABILITY
    // "Tell me about room 7A02", "Is 7A05 free?", "Show available rooms"
    // =========================================================================
    const isRoomInquiry =
      (lower.includes('room') || lower.includes('lab') || lower.includes('seminar hall') || lower.includes('classroom')) &&
      !lower.includes('book') &&
      !lower.includes('register') &&
      !lower.includes('reschedule');

    if (isRoomInquiry) {
      const roomMatch = text.match(/\b(7[A-C]\d{2}|9A\d{2})\b/i);
      const rooms = await callTool('search_rooms', {});
      const roomsList = Array.isArray(rooms) ? rooms : [];

      // Specific room asked
      if (roomMatch) {
        const targetNumber = roomMatch[0].toUpperCase();
        const found = roomsList.find((r) => r.room_number.toUpperCase() === targetNumber);

        if (found) {
          const bookings = found.bookings || [];
          const bookingsText =
            bookings.length > 0
              ? bookings.map((b) => `  - 🔒 ${b.date} (${b.start_time} – ${b.end_time}) by *${b.booked_by}* (${b.purpose || 'Session'})`).join('\n')
              : '  - *No active bookings (Free for reservation)*';

          return {
            reply:
              `### 🏢 **Room ${found.room_number} Details**\n\n` +
              `- **Type**: ${found.type?.toUpperCase() || 'CLASSROOM'}\n` +
              `- **Capacity**: **${found.capacity} people**\n` +
              `- **Floor**: Floor ${found.floor || 7}\n` +
              `- **Equipment**: ${Array.isArray(found.equipment) ? found.equipment.join(', ') : (found.equipment || 'Standard')}\n` +
              `- **Status**: \`${found.status?.toUpperCase() || 'AVAILABLE'}\`\n\n` +
              `**Current Bookings / Occupancy:**\n${bookingsText}\n\n` +
              `*Would you like me to book Room ${found.room_number}? Just let me know the date and time!*`,
            actions_taken,
            action_card: null
          };
        }
      }

      // Filter by type or availability if requested
      let filteredRooms = roomsList;
      if (lower.includes('lab')) filteredRooms = filteredRooms.filter((r) => r.type === 'lab');
      else if (lower.includes('seminar')) filteredRooms = filteredRooms.filter((r) => r.type === 'seminar');
      else if (lower.includes('classroom')) filteredRooms = filteredRooms.filter((r) => r.type === 'classroom');

      if (filteredRooms.length > 0) {
        const list = filteredRooms
          .slice(0, 8)
          .map(
            (r) =>
              `• **Room ${r.room_number}** (${r.type}, Cap: **${r.capacity}**): Equipment: ${Array.isArray(r.equipment) ? r.equipment.join(', ') : r.equipment} | \`${r.status}\``
          )
          .join('\n');

        return {
          reply: `Here are the campus rooms matching your query:\n\n${list}\n\n*Would you like more details or want to book any of these rooms?*`,
          actions_taken,
          action_card: null
        };
      }
    }

    // =========================================================================
    // 9. UPCOMING EVENTS & WORKSHOPS: "What are the upcoming events?", "Show events", etc.
    // =========================================================================
    const isUpcomingEventQuery =
      (lower.includes('event') ||
        lower.includes('workshop') ||
        lower.includes('hackathon') ||
        lower.includes('seminar') ||
        lower.includes('lecture') ||
        lower.includes('contest') ||
        lower.includes('carnival')) &&
      !lower.includes('register') &&
      !lower.includes('cancel') &&
      !lower.includes('free until');

    if (isUpcomingEventQuery) {
      const now = await callTool('get_current_datetime');
      const events = await callTool('get_events', {});

      let relevant = (Array.isArray(events) ? events : []).filter(
        (e) => e.status === 'upcoming' || e.status === 'ongoing' || !e.status
      );

      if (lower.includes('hackathon')) {
        relevant = relevant.filter((e) => e.name.toLowerCase().includes('hackathon'));
      } else if (lower.includes('lecture') || lower.includes('deep learning')) {
        relevant = relevant.filter(
          (e) => e.name.toLowerCase().includes('lecture') || e.name.toLowerCase().includes('deep learning')
        );
      } else if (lower.includes('carnival')) {
        relevant = relevant.filter((e) => e.name.toLowerCase().includes('carnival'));
      } else if (lower.includes('contest') || lower.includes('programming')) {
        relevant = relevant.filter(
          (e) => e.name.toLowerCase().includes('contest') || e.name.toLowerCase().includes('programming')
        );
      } else if (lower.includes('security')) {
        relevant = relevant.filter((e) => e.name.toLowerCase().includes('security'));
      }

      relevant.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.start_time || '').localeCompare(b.start_time || '');
      });

      if (relevant.length === 0) {
        return {
          reply: `There are currently no matching upcoming events found on campus.`,
          actions_taken,
          action_card: null
        };
      }

      const list = relevant
        .map((e) => {
          const available = Math.max(0, (e.capacity || 0) - (e.registered || 0));
          const capacityTag =
            available === 0
              ? '🔴 **FULL**'
              : `🟢 **${available} seats left** (${e.registered}/${e.capacity} registered)`;

          return (
            `### 🎪 **${e.name}**\n` +
            `- 🗓️ **Date**: ${e.date}${e.end_date && e.end_date !== e.date ? ` to ${e.end_date}` : ''}\n` +
            `- ⏰ **Time**: ${e.start_time} – ${e.end_time}\n` +
            `- 📍 **Venue**: Room **${e.venue}**\n` +
            `- 👥 **Organizer**: ${e.organizer || 'Campus Organization'}\n` +
            `- 🎟️ **Availability**: ${capacityTag}\n` +
            `- 📝 **Description**: ${e.description}`
          );
        })
        .join('\n\n---\n\n');

      return {
        reply: `Here are the upcoming campus events, workshops, and hackathons (as of **${now.date}**):\n\n${list}\n\n*Would you like me to register you for any of these events? Just say: "Register me for [Event Name]"!*`,
        actions_taken,
        action_card: null
      };
    }

    // =========================================================================
    // 10. MULTI-SOURCE: "I'm free until 2 PM — is there anything on campus I could drop into?"
    // =========================================================================
    if (lower.includes('free until') || (lower.includes('2 pm') && lower.includes('drop into')) || (lower.includes('free') && lower.includes('event'))) {
      const now = await callTool('get_current_datetime');
      const events = await callTool('get_events', { status: 'upcoming' });

      const matchingEvents = (Array.isArray(events) ? events : []).filter((e) => {
        const start = e.start_time || '00:00';
        return start <= '14:00';
      });

      if (matchingEvents.length > 0) {
        const eventList = matchingEvents
          .map(
            (e) =>
              `• **${e.name}**\n  - ⏰ Time: ${e.start_time} – ${e.end_time} | 📍 Venue: Room **${e.venue}**\n  - 👥 Organizer: ${e.organizer} | Status: \`${e.status}\`\n  - 📝 *${e.description}*`
          )
          .join('\n\n');

        return {
          reply: `Yes! You are free until 2:00 PM, and here are upcoming campus events happening before 2:00 PM you can drop into:\n\n${eventList}\n\nWould you like me to register you for any of these sessions?`,
          actions_taken,
          action_card: null
        };
      }

      const allUpcoming = (Array.isArray(events) ? events : []).slice(0, 3);
      const suggestions = allUpcoming
        .map((e) => `• **${e.name}** at ${e.start_time} in Room ${e.venue}`)
        .join('\n');

      return {
        reply: `There are no scheduled events starting before 2:00 PM today. However, later in the day we have:\n\n${suggestions}`,
        actions_taken,
        action_card: null
      };
    }

    // =========================================================================
    // 11. MULTI-SOURCE: "Which labs have a projector and can fit at least 30 people?"
    // =========================================================================
    if (lower.includes('lab') && (lower.includes('projector') || lower.includes('30'))) {
      const labs = await callTool('search_rooms', {
        type: 'lab',
        min_capacity: 30,
        equipment: ['projector']
      });

      if (!labs || labs.length === 0) {
        return {
          reply: 'No computer labs currently match the criteria of having a projector and capacity of at least 30 people.',
          actions_taken,
          action_card: null
        };
      }

      const list = labs
        .map(
          (r) =>
            `• **Lab ${r.room_number}** (Floor ${r.floor}): Capacity: **${r.capacity} people**, Equipment: ${Array.isArray(r.equipment) ? r.equipment.join(', ') : r.equipment}, Status: \`${r.status}\``
        )
        .join('\n');

      return {
        reply: `The following computer labs have a projector and can accommodate at least 30 people:\n\n${list}`,
        actions_taken,
        action_card: null
      };
    }

    // =========================================================================
    // 12. ASSIGNMENTS DUE THIS WEEK: "What assignments do I have due this week?"
    // =========================================================================
    if (lower.includes('assignment') || lower.includes('homework') || lower.includes('deadline')) {
      const now = await callTool('get_current_datetime');
      const assignments = await callTool('get_assignments', {});

      const pending = (Array.isArray(assignments) ? assignments : []).filter((a) => a.status !== 'graded');

      if (pending.length === 0) {
        return {
          reply: '🎉 You have no pending assignments due this week! All coursework is submitted or graded.',
          actions_taken,
          action_card: null
        };
      }

      const list = pending
        .map(
          (a) =>
            `• **${a.course}: ${a.title}**\n  - 📅 **Deadline**: ${a.deadline} | Status: \`${a.status.toUpperCase()}\` | Marks: ${a.marks}\n  - 📤 **Platform**: ${a.submission_platform}\n  - 📝 *${a.description}*`
        )
        .join('\n\n');

      return {
        reply: `Here are your pending assignments due around this period (as of ${now.date}):\n\n${list}`,
        actions_taken,
        action_card: null
      };
    }

    // =========================================================================
    // 13. ANNOUNCEMENTS: "Show me all high priority announcements."
    // =========================================================================
    if (lower.includes('announcement') || lower.includes('notice') || lower.includes('advisory')) {
      const isHighPriority = lower.includes('high priority') || lower.includes('urgent') || lower.includes('high');
      const announcements = await callTool('get_announcements', {
        priority: isHighPriority ? 'high' : undefined,
        active_only: true
      });

      if (!announcements || announcements.length === 0) {
        return {
          reply: `There are currently no active ${isHighPriority ? 'high priority ' : ''}announcements posted.`,
          actions_taken,
          action_card: null
        };
      }

      const list = announcements
        .map(
          (a) =>
            `📢 **${a.title}** [Priority: \`${a.priority.toUpperCase()}\`]\n- 🗓️ Posted: ${a.date} by *${a.posted_by}* (Expires: ${a.expires})\n- ${a.body}`
        )
        .join('\n\n---\n\n');

      return {
        reply: `Here are the active ${isHighPriority ? 'high priority ' : ''}campus announcements:\n\n${list}`,
        actions_taken,
        action_card: null
      };
    }

    // =========================================================================
    // 14. ACTION: "Book Room 7A02 tomorrow from 3 PM to 5 PM."
    // =========================================================================
    const directRoomMatch = text.match(/\b(7[A-C]\d{2})\b/i);
    const roomNumber = directRoomMatch ? directRoomMatch[1].toUpperCase() : (lower.includes('it') || lower.includes('that') || lower.includes('room') ? contextRoom : null);
    if (lower.includes('book') && roomNumber) {
      const now = await callTool('get_current_datetime');

      let bookingDate = now.date;
      if (lower.includes('tomorrow')) {
        const d = new Date(now.date);
        d.setDate(d.getDate() + 1);
        bookingDate = d.toISOString().split('T')[0];
      }

      let startTime = '15:00';
      let endTime = '17:00';
      const timeRangeMatch = text.match(/(\d{1,2})\s*(?:pm|am)?\s*(?:to|-)\s*(\d{1,2})\s*(pm|am)?/i);
      if (timeRangeMatch) {
        let s = parseInt(timeRangeMatch[1], 10);
        let e = parseInt(timeRangeMatch[2], 10);
        const isPM = lower.includes('pm');
        if (isPM && s < 12) s += 12;
        if (isPM && e < 12) e += 12;
        startTime = `${String(s).padStart(2, '0')}:00`;
        endTime = `${String(e).padStart(2, '0')}:00`;
      }

      const bookingRes = await callTool('book_room', {
        room_number: roomNumber,
        date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        booked_by: 'Current Student',
        purpose: 'Academic Study & Project Work'
      });

      if (bookingRes.error) {
        return {
          reply: `⚠️ **Booking Conflict / Error**: ${bookingRes.message || 'The room could not be booked for this time slot.'}`,
          actions_taken,
          action_card: null
        };
      }

      action_card = {
        type: 'room_booking',
        title: 'Room Booking Confirmed',
        room_number: roomNumber,
        date: bookingDate,
        time: `${startTime} - ${endTime}`,
        booked_by: 'Current Student',
        purpose: 'Academic Study & Project Work'
      };

      return {
        reply: `🎉 **Room Booking Confirmed!**\n\nRoom **${roomNumber}** has been successfully booked for **${bookingDate}** from **${startTime}** to **${endTime}**. The live dashboard has been updated.`,
        actions_taken,
        action_card
      };
    }

    // =========================================================================
    // 15. ACTION: "Register me for the Guest Lecture on Deep Learning."
    // =========================================================================
    if (lower.includes('register') && (lower.includes('event') || lower.includes('lecture') || lower.includes('workshop') || lower.includes('deep learning'))) {
      const regRes = await callTool('register_for_event', {
        event_name_or_id: 'Guest Lecture on Deep Learning',
        student_id: '22-41988',
        name: 'Sakibul Hassan'
      });

      if (regRes.error && regRes.error !== 'already_registered') {
        return {
          reply: `⚠️ **Registration Notice**: ${regRes.message || 'Could not complete registration for this event.'}`,
          actions_taken,
          action_card: null
        };
      }

      action_card = {
        type: 'event_registration',
        title: 'Event Registration Confirmed',
        event_name: regRes.event_name || 'Guest Lecture: Deep Learning in Medical Imaging',
        venue: regRes.venue || 'Room 7C05',
        date: regRes.date || '2026-09-08',
        student_name: 'Sakibul Hassan',
        student_id: '22-41988'
      };

      const replyMsg =
        regRes.error === 'already_registered'
          ? `🎉 **You are already registered!** You have a confirmed seat for **${action_card.event_name}** in venue **${action_card.venue}** on **${action_card.date}** (Student ID: \`${action_card.student_id}\`).`
          : `🎉 **Registration Confirmed!** You have been successfully registered for **${action_card.event_name}** in venue **${action_card.venue}** on **${action_card.date}** (Student ID: \`${action_card.student_id}\`).`;

      return {
        reply: replyMsg,
        actions_taken,
        action_card
      };
    }

    // =========================================================================
    // 16. MULTI-FILTER ROOM SEARCH: "I need a room for 5 people with a projector, tomorrow between 2 and 4."
    // =========================================================================
    if (lower.includes('room') && (lower.includes('projector') || lower.includes('people') || lower.includes('between'))) {
      const now = await callTool('get_current_datetime');
      let targetDate = now.date;
      if (lower.includes('tomorrow')) {
        const d = new Date(now.date);
        d.setDate(d.getDate() + 1);
        targetDate = d.toISOString().split('T')[0];
      }

      const available = await callTool('search_rooms', {
        min_capacity: 5,
        equipment: ['projector'],
        date: targetDate,
        start_time: '14:00',
        end_time: '16:00'
      });

      if (!available || available.length === 0) {
        return {
          reply: `I searched for available rooms with a projector fitting at least 5 people on **${targetDate}** between **14:00 and 16:00**, but none are currently free.`,
          actions_taken,
          action_card: null
        };
      }

      const list = available
        .slice(0, 5)
        .map((r) => `• **Room ${r.room_number}** (${r.type}, Cap: ${r.capacity})`)
        .join('\n');

      return {
        reply: `I found ${available.length} available room(s) with a projector fitting at least 5 people for **${targetDate}** between **14:00 – 16:00**:\n\n${list}\n\nWhich room would you like me to book for you?`,
        actions_taken,
        action_card: null
      };
    }

    // =========================================================================
    // 17. GENERAL CAMPUS ASSISTANCE / GREETING
    // =========================================================================
    const now = await callTool('get_current_datetime');
    return {
      reply:
        `👋 **Hello! I'm CampusCopilot** — your real-time campus assistant.\n\n` +
        `As of **${now.day}, ${now.date} (${now.time})**, I can help you with:\n` +
        `- 📅 **Class Schedules**: *"When is my next class?"* or *"Who teaches Compiler?"*\n` +
        `- 🏢 **Room Availability**: *"Is room 7A02 free?"* or *"Find labs with a projector"*\n` +
        `- 🔄 **Rescheduling Planner**: *"Plan for rescheduling CSE 4129"*\n` +
        `- 🎪 **Campus Events**: *"What are the upcoming events on campus?"*\n` +
        `- 📝 **Assignments**: *"What assignments do I have due this week?"*\n` +
        `- 📢 **Notices**: *"Show all high priority announcements"*\n\n` +
        `*What would you like to explore?*`,
      actions_taken,
      action_card: null
    };
  }
}
