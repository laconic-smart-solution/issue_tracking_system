import http from 'http';
import fs from 'fs';
import app from './app';
import { config } from './config';
import { socketServer } from './sockets/socket.server';

// Ensure storage upload directory exists on Windows Server
if (!fs.existsSync(config.storage.uploadDir)) {
  fs.mkdirSync(config.storage.uploadDir, { recursive: true });
}

const server = http.createServer(app);

// Attach Socket.io
socketServer.init(server);

server.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Issue Tracking Backend Server running on port ${config.port}`);
  console.log(`📡 Health Check: http://localhost:${config.port}/health`);
  console.log(`📁 Local Storage: ${config.storage.uploadDir}`);
  console.log(`🤖 LINE Webhook: http://localhost:${config.port}/api/webhook/line`);
  console.log(`=======================================================`);
});
