
import { EventEmitter } from 'events';
import { aiProcessor } from './AIProcessor';
import { logger } from '../core/logger';
import { AnalysisResult } from '../types';

interface SessionState {
    buffer: string;
    wordCount: number;
    lastProcessed: number;
    timer: NodeJS.Timeout | null;
}

const WORD_THRESHOLD = 50;
const TIME_THRESHOLD_MS = 30000;

class SessionBuffer extends EventEmitter {
    private sessions: Map<string, SessionState> = new Map();

    constructor() {
        super();
    }

    // Add text to the session buffer
    public add(sessionId: string, text: string) {
        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, {
                buffer: "",
                wordCount: 0,
                lastProcessed: Date.now(),
                timer: null
            });
        }

        const session = this.sessions.get(sessionId)!;
        session.buffer += " " + text;
        session.wordCount += text.split(/\s+/).length;

        // Reset timer on new activity
        if (session.timer) {
            clearTimeout(session.timer);
        }

        // Check Count Threshold
        if (session.wordCount >= WORD_THRESHOLD) {
            this.flush(sessionId);
        } else {
            // Set Timer Threshold
            session.timer = setTimeout(() => {
                this.flush(sessionId);
            }, TIME_THRESHOLD_MS);
        }
    }

    private async flush(sessionId: string) {
        const session = this.sessions.get(sessionId);
        if (!session || !session.buffer.trim()) return;

        const textToProcess = session.buffer;

        // Reset Buffer immediately to capture new incoming data correctly
        session.buffer = "";
        session.wordCount = 0;
        session.lastProcessed = Date.now();

        try {
            const result = await aiProcessor.processTranscript(textToProcess);
            this.emit('analysis_result', { sessionId, result });
            logger.info(`Flushed session ${sessionId}: Processed ${textToProcess.length} chars.`);
        } catch (error) {
            logger.error(`Error processing session ${sessionId}: `, error);
        }
    }
    public getSessionContext(sessionId: string): string {
        const session = this.sessions.get(sessionId);
        if (!session) return "";
        return session.buffer;
    }
}

export const sessionBuffer = new SessionBuffer();
