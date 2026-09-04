import express from 'express';
import cors from 'cors';
import schedulesRouter from './routes/schedules.js';
import roomsRouter from './routes/rooms.js';
import eventsRouter from './routes/events.js';
import announcementsRouter from './routes/announcements.js';
import assignmentsRouter from './routes/assignments.js';
import metaRouter from './routes/meta.js';
import agentRouter from './routes/agent.js';
import authRouter from './routes/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // Middleware
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // REST API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/schedules', schedulesRouter);
  app.use('/api/rooms', roomsRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/announcements', announcementsRouter);
  app.use('/api/assignments', assignmentsRouter);
  app.use('/api/meta', metaRouter);
  app.use('/api/agent', agentRouter);

  // 404 Handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'not_found',
      message: `Route '${req.method} ${req.originalUrl}' not found`
    });
  });

  // Central Error Handler
  app.use(errorHandler);

  return app;
}
