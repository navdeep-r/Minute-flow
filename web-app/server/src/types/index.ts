
export interface StreamPayload {
    sessionId: string;
    speaker: string;
    text: string;
    timestamp: number; // Unix timestamp in ms
    isFinal: boolean; // Indicates if the ASR result is final or interim
}

export interface Task {
    id: string;
    description: string;
    assignee: string | "Unassigned";
    deadline: string | null; // ISO Date string
    status: "pending" | "in-progress" | "completed";
}

export interface AnalysisResult {
    summary: string;
    tasks: Task[];
    visualization: any | null; // Recharts config or Mermaid string
    citations: {
        sourceText: string;
        timestamp: number;
    }[];
}

export interface SessionConfig {
    sessionId: string;
    orgId: string;
    consentGiven: boolean;
    recordingEnabled: boolean;
}
