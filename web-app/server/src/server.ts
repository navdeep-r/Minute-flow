
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './core/logger';
import { authenticateSocket } from './middleware/auth';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

import { initSocketService } from './services/SocketService';
import { sessionBuffer } from './services/SessionBuffer';

// Middleware
io.use(authenticateSocket);

// Initialize Socket Service
const socketService = initSocketService(io);

// Wire up SessionBuffer events
sessionBuffer.on('analysis_result', ({ sessionId, result }: { sessionId: string, result: any }) => {
    socketService.emitAnalysisResult(sessionId, result);
    logger.info(`Emitted analysis result to session ${sessionId}`);
});

io.on('connection', (socket) => {
    logger.info(`New client connected: ${socket.id}`);

    // Placeholder for SocketService
    socket.on('join_room', (room) => {
        socket.join(room);
        logger.info(`Socket ${socket.id} joined room ${room}`);
    });

    socket.on('stream_ingest', (data) => {
        logger.debug(`Received stream data from ${socket.id}`);
        // TODO: Pass to SessionBuffer
    });

    socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});
