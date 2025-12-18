
import mongoose, { Schema, Document } from 'mongoose';

export interface IMeeting extends Document {
    sessionId: string;
    orgId: string;
    startTime: Date;
    endTime?: Date;
    participants: string[];
    transcript: {
        speaker: string;
        text: string;
        timestamp: number;
    }[];
    summary: string;
    status: 'live' | 'completed';
    privacy: {
        recordingEnabled: boolean;
        public: boolean;
    };
}

const MeetingSchema: Schema = new Schema({
    sessionId: { type: String, required: true, unique: true },
    orgId: { type: String, required: true },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    participants: [{ type: String }],
    transcript: [{
        speaker: String,
        text: String,
        timestamp: Number
    }],
    summary: { type: String, default: "" },
    status: { type: String, enum: ['live', 'completed'], default: 'live' },
    privacy: {
        recordingEnabled: { type: Boolean, default: false },
        public: { type: Boolean, default: false }
    }
});

export const Meeting = mongoose.model<IMeeting>('Meeting', MeetingSchema);
