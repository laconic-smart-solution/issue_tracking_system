import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { config } from '../config';

class SocketServer {
  private io: SocketIOServer | null = null;

  init(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: (origin, callback) => {
          callback(null, true);
        },
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.io.on('connection', (socket) => {
      console.log(`[Socket.io] Client connected: ${socket.id}`);

      socket.on('disconnect', () => {
        console.log(`[Socket.io] Client disconnected: ${socket.id}`);
      });
    });

    console.log('✅ [Socket.io] WebSocket server initialized.');
  }

  emit(event: string, data: any) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  notifyNewTicket(ticket: any) {
    this.emit('ticket:created', ticket);
  }

  notifyTicketUpdate(ticket: any) {
    this.emit('ticket:updated', ticket);
  }

  notifyNewMessage(message: any) {
    this.emit('message:received', message);
  }

  notifySLAWarning(warningData: any) {
    this.emit('sla:warning', warningData);
  }
}

export const socketServer = new SocketServer();
