import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import webhookRoutes from './routes/webhook.routes';
import ticketRoutes from './routes/ticket.routes';
import metaRoutes from './routes/meta.routes';
import legacyRoutes from './routes/legacy.routes';
import aiRoutes from './routes/ai.routes';

const app = express();

// Middlewares (Allows both localhost and local network access e.g. 192.168.x.x)
app.use(cors({
  origin: (origin, callback) => {
    callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Local Windows Server Storage for Attachments/Images
app.use('/uploads', express.static(config.storage.uploadDir));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/webhook', webhookRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/legacy', legacyRoutes);
app.use('/api/ai', aiRoutes);

export default app;
