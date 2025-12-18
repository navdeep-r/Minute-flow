
import { Server, Socket } from 'socket.io';
import { logger } from '../core/logger';
import { ingestionQueue } from './IngestionQueue';
import { sessionBuffer } from './SessionBuffer';
import { aiProcessor } from './AIProcessor';
import { StreamPayload } from '../types';

export class SocketService {
    private io: Server;

    constructor(io: Server) {
        this.io = io;
        this.setupHandlers();
    }

    private setupHandlers() {
        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
        });
    }

    private handleConnection(socket: Socket) {
        // Handled by middleware mostly, but we set up listeners here

        socket.on('join_room', (sessionId: string) => {
            socket.join(sessionId);
            logger.info(`Socket ${socket.id} joined session ${sessionId}`);
        });

        socket.on('stream_ingest', (data: StreamPayload) => {
            // Validate data basics
            if (!data.sessionId || !data.text) {
                logger.warn(`Invalid payload from ${socket.id}`);
                return;
            }

            // Push to Queue
            ingestionQueue.add(data, socket.id);
        });

        socket.on('ask_question', async (data: { sessionId: string, question: string }) => {
            if (!data.sessionId || !data.question) return;

            logger.info(`Question received for session ${data.sessionId}: ${data.question}`);

            const context = sessionBuffer.getSessionContext(data.sessionId);
            const answer = await aiProcessor.answerQuery(context, data.question);

            socket.emit('qna_response', { question: data.question, answer });
        });
    }

    public emitAnalysisResult(sessionId: string, result: any) {
        this.io.to(sessionId).emit('analysis_result', result);
    }
}

let socketServiceInstance: SocketService | null = null;

export const initSocketService = (io: Server) => {
    socketServiceInstance = new SocketService(io);
    return socketServiceInstance;
};

export const getSocketService = () => {
    if (!socketServiceInstance) throw new Error("SocketService not initialized");
    return socketServiceInstance;
};
