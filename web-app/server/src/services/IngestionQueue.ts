
import Queue from 'better-queue';
// @ts-ignore
import MemoryStore from 'better-queue-memory';
import { StreamPayload } from '../types';
import { sessionBuffer } from './SessionBuffer';
import { logger } from '../core/logger';

// Interface for the task placed in queue
interface IngestTask {
    payload: StreamPayload;
    socketId: string; // To potentially send back specific ack or error
}

class IngestionQueue {
    private queue: Queue<IngestTask, any>;

    constructor() {
        this.queue = new Queue(this.processTask, {
            store: new MemoryStore(), // Use file-store or sqlite in real prod
            batchSize: 1,
            concurrent: 5 // Workers
        });

        logger.info("IngestionQueue initialized.");
    }

    private processTask = (task: IngestTask, cb: (err?: any, result?: any) => void) => {
        const { payload } = task;

        // Pass to SessionBuffer
        sessionBuffer.add(payload.sessionId, payload.text);

        cb(null, true);
    };

    public add(payload: StreamPayload, socketId: string) {
        this.queue.push({ payload, socketId });
    }
}

export const ingestionQueue = new IngestionQueue();
