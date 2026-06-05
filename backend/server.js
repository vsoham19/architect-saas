import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './src/middleware/error.js';

import userRoutes from './src/routes/userRoutes.js';
import projectRoutes from './src/routes/projectRoutes.js';
import taskRoutes from './src/routes/taskRoutes.js';
import documentRoutes from './src/routes/documentRoutes.js';
import notificationRoutes from './src/routes/notificationRoutes.js';
import auditRoutes from './src/routes/auditRoutes.js';

dotenv.config();

const app = express();

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'apikey']
}));

app.use(express.json());

// Health Routes
app.get('/', (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Backend running successfully"
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Backend running successfully"
  });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditRoutes);

// Error Middleware
app.use(errorHandler);

// IMPORTANT FOR VERCEL
export default app;