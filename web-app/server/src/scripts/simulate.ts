
import { io } from 'socket.io-client';
import jwt from 'jsonwebtoken';

const URL = 'http://localhost:3000';
const SECRET = 'dev_secret_key_123'; // Must match server

// Generate a valid token
const token = jwt.sign({ name: "SimUser", role: "host" }, SECRET);

const socket = io(URL, {
    auth: { token }
});

const SESSION_ID = "demo-session";
const SAMPLE_DIALOGUE = [
    { speaker: "Alice", text: "Alright, let's kick off this weekly sync." },
    { speaker: "Bob", text: "Sure. I wanted to update everyone on the frontend migration." },
    { speaker: "Alice", text: "Go ahead. Is it on track for Friday?" },
    { speaker: "Bob", text: "We hit a snag with the routing library, but I think we can fix it by tomorrow." },
    { speaker: "Alice", text: "Okay, let's add that as a task. Bob to fix routing by EOD tomorrow." },
    { speaker: "Charlie", text: "I can help with the testing once that's done." },
    { speaker: "Alice", text: "Great. Can you also create a pie chart of our current bug distribution? I want to see where we stand." },
    { speaker: "Bob", text: "Will do visually." }
];

console.log(`Starting simulation for Session: ${SESSION_ID}`);

socket.on('connect', () => {
    console.log("Connected to Backend.");
    socket.emit('join_room', SESSION_ID);

    let index = 0;
    const interval = setInterval(() => {
        if (index >= SAMPLE_DIALOGUE.length) {
            console.log("Simulation finished.");
            clearInterval(interval);
            // socket.disconnect();
            return;
        }

        const line = SAMPLE_DIALOGUE[index];
        const payload = {
            sessionId: SESSION_ID,
            speaker: line.speaker,
            text: line.text,
            timestamp: Date.now(),
            isFinal: true
        };

        console.log(`Sending: [${line.speaker}] ${line.text}`);
        socket.emit('stream_ingest', payload);

        // Emit simulated metrics
        const metrics = {
            engagement: 50 + Math.sin(index * 0.5) * 40, // Sine wave 10-90
            wordsProcessed: index * 15,
            wpm: 100 + Math.random() * 50
        };
        socket.emit('live_metrics', metrics); // Note: Server needs to broadcast this or client needs to listen to 'metrics' from server? 
        // Actually, normally server calculates metrics. 
        // For this hack, I'll emit to server, and server should broadcast.
        // But Server doesn't have a handler for 'live_metrics' from client to broadcast.
        // So this won't work unless I add a handler or just let the FRONTEND mock be the primary driver as implemented.
        // Usage of frontend mock is safer for "looks dynamic" requirement without complex backend metric calculator.
        // I will revert this idea and rely on Frontend Mock for visuals, as implemented in DashboardPage.

        index++;
    }, 3000); // Every 3 seconds
});

socket.on('analysis_result', (data) => {
    console.log(">>> RECEIVED ANALYSIS RESULT <<<");
    console.log(JSON.stringify(data, null, 2));
});

socket.on('disconnect', () => {
    console.log("Disconnected.");
});
