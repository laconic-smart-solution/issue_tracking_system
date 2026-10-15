import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',

  database: {
    user: process.env.DB_USER || 'ISSUE_TRACKING',
    password: process.env.DB_PASSWORD || 'ISSUE_TRACKING',
    connectString: process.env.DB_CONNECT_STRING || '192.168.0.131:1521/LACONIC',
  },

  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  line: {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    channelSecret: process.env.LINE_CHANNEL_SECRET || '',
  },

  storage: {
    uploadDir: process.env.STORAGE_UPLOAD_DIR || path.join(__dirname, '../../storage/uploads'),
  }
};
