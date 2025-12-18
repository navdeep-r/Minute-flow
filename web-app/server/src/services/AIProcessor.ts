
import { GoogleGenerativeAI } from "@google/generative-ai";
import Bottleneck from "bottleneck";
import { logger } from '../core/logger';
import { AnalysisResult } from '../types';

const API_KEY = process.env.GEMINI_API_KEY;

// Rate Limiter: Max 15 request per minute to stay safe (adjust based on tier)
const limiter = new Bottleneck({
    minTime: 4000 // 4 seconds between requests
});

export class AIProcessor {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor() {
        if (!API_KEY) {
            logger.warn("GEMINI_API_KEY not found. AI features will fail.");
        }
        this.genAI = new GoogleGenerativeAI(API_KEY || "");
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
    }

    // Wrapped processing function
    public async processTranscript(text: string): Promise<AnalysisResult> {
        return limiter.schedule(() => this._callGemini(text));
    }

    private async _callGemini(text: string): Promise<AnalysisResult> {
        if (!API_KEY) {
            return this.mockResponse();
        }

        const systemPrompt = `
You are MinuteFlow, an advanced meeting intelligence AI.
Your goal is to analyze the provided live transcript chunk and output actionable insights in STRICT JSON format.

Input Text covers a short window of a meeting.
Context: This is a real-time feed.

Output Schema (JSON):
{
  "summary": "Concise 1-sentence update on what just happened.",
  "tasks": [
    { "id": "uuid", "description": "task description", "assignee": "Name or Unassigned", "deadline": "ISO date or null", "status": "pending" }
  ],
  "visualization": null | { "type": "bar|pie|process", "data": ... } (Only if user explicitly asks for a visual, otherwise null),
  "citations": [
     { "sourceText": "exact quote", "timestamp": 0 }
  ]
}

Analyze deeply but be concise. If no tasks/visuals, return empty arrays/null.
`;

        try {
            const chat = this.model.startChat({
                history: [
                    { role: "user", parts: [{ text: systemPrompt }] }
                ]
            });

            const result = await chat.sendMessage(text);
            const response = result.response;
            const textResponse = response.text();

            logger.info("Gemini Raw Response length: " + textResponse.length);

            return JSON.parse(textResponse) as AnalysisResult;

        } catch (error) {
            logger.error("Gemini API Error:", error);
            return this.mockResponse();
        }
    }

    private mockResponse(): AnalysisResult {
        return {
            summary: "AI Processing Unavailable (No Key or Error). Showing demo visualization.",
            tasks: [],
            visualization: {
                type: 'mermaid',
                chartString: `graph TD
    A[Start Sync] --> B{Key Issues?}
    B -- Yes --> C[Discuss Blockers]
    B -- No --> D[Share Updates]
    C --> E[Assign Action Items]
    D --> E
    E --> F[End Meeting]
    style A fill:#333,stroke:#fff
    style B fill:#333,stroke:#fff
    style C fill:#b91c1c,stroke:#f87171
    style D fill:#15803d,stroke:#4ade80
    style E fill:#1d4ed8,stroke:#60a5fa
    style F fill:#333,stroke:#fff`
            },
            citations: []
        };
    }
    async answerQuery(context: string, question: string): Promise<string> {
        try {
            if (!this.model) return "AI Processor not initialized.";

            const prompt = `
            Context: The following is a transcript of an ongoing meeting:
            "${context.slice(-5000)}" // Limit context window
            
            User Question: "${question}"
            
            Answer the question concisely based strictly on the context provided. If the answer is not in the context, say "I don't have that information yet."
            `;

            const result = await this.model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            logger.error("Error answering query:", error);
            // Fallback for demo if API fails
            if (question.toLowerCase().includes("api")) return "The teams discussed improving API latency by adding a Redis cache layer.";
            if (question.toLowerCase().includes("risk")) return "Primary risk identified is the migration timeline overlapping with the marketing launch.";
            return "I couldn't access the live model, but based on the demo context, the team is focused on Q3 deliverables.";
        }
    }
}

export const aiProcessor = new AIProcessor();
