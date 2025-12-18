
import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../core/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_123';

export const authenticateSocket = (socket: Socket, next: (err?: any) => void) => {
    const token = socket.handshake.auth.token;

    if (!token) {
        logger.warn(`Socket connection attempt without token: ${socket.id}. Allowing for Dev.`);
        // In Production: return next(new Error("Authentication error"));
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        (socket as any).user = decoded;
        next();
    } catch (err) {
        logger.error(`Invalid token for socket: ${socket.id}`);
        return next(new Error("Authentication error"));
    }
};
