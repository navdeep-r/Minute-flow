
import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';
import { Sparkles, Terminal, FileJson, MessageSquare, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AIPanelProps {
    data: any;
}

interface ChatMessage {
    role: 'user' | 'ai';
    text: string;
}

export const AIPanel: React.FC<AIPanelProps> = ({ data }) => {
    const { socket } = useAuth();
    const [activeTab, setActiveTab] = useState<'visual' | 'code' | 'chat'>('chat');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (data && data.type === 'mermaid' && activeTab === 'visual') {
            mermaid.initialize({
                startOnLoad: true,
                theme: 'dark',
                themeVariables: {
                    primaryColor: '#3b82f6',
                    primaryTextColor: '#fff',
                    primaryBorderColor: '#3b82f6',
                    lineColor: '#a5d64c',
                    secondaryColor: '#0a0b14',
                    tertiaryColor: '#1e293b'
                }
            });
            setTimeout(() => {
                mermaid.run().catch(e => console.error(e));
            }, 100);
        }
    }, [data, activeTab]);

    useEffect(() => {
        if (!socket) return;
        socket.on('qna_response', (data: { question: string, answer: string }) => {
            setMessages(prev => [...prev, { role: 'ai', text: data.answer }]);
        });
        return () => {
            socket.off('qna_response');
        };
    }, [socket]);

    const handleSend = () => {
        if (!input.trim() || !socket) return;

        // Add user message immediately
        setMessages(prev => [...prev, { role: 'user', text: input }]);

        // Emit to backend (Assuming session ID is managed or we pick a dummy one for now. 
        // In real app, DashboardPage should probably handle this or context has sessionId.
        // For simulation, we'll use a hardcoded or prop-passed ID, or rely on socket room logic if implemented.
        // Wait, socket.io rooms join logic in simulation uses "sim-session-...". 
        // The dashboard doesn't currently know the session ID unless we store it.
        // Let's assume the simulated session ID is needed. 
        // For simplicity in this step, I'll broadcast to the room the socket joined? 
        // Or better, let's just emit. The backend `ask_question` expects sessionId.
        // I will hack a session ID search or just hardcode "active-session" for the demo since simulation uses a random one but 
        // the client doesn't know it unless it receives it. 
        // Check DashboardPage: it listens for analysis_result. 
        // I will make the client join a static "demo-session" in simulation and here.

        // Actually, the simulation script generates a random ID. 
        // I should update simulation to use a fixed ID "demo-session" so the client can join it too.
        socket.emit('ask_question', { sessionId: "demo-session", question: input });
        setInput("");
    };

    return (
        <div className="h-full bg-card/50 backdrop-blur-md border border-white/5 rounded-2xl p-6 flex flex-col shadow-glass">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={14} className="text-accent" />
                    AI Insights
                </h3>
                <div className="flex p-0.5 bg-white/5 rounded-lg border border-white/5">
                    <TabButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageSquare size={12} />} label="Chat" />
                    <TabButton active={activeTab === 'visual'} onClick={() => setActiveTab('visual')} icon={<FileJson size={12} />} label="Visual" />
                    <TabButton active={activeTab === 'code'} onClick={() => setActiveTab('code')} icon={<Terminal size={12} />} label="Code" />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 bg-black/40 rounded-xl border border-white/5 relative overflow-hidden flex flex-col">

                {activeTab === 'chat' && (
                    <div className="flex-1 flex flex-col">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.length === 0 && (
                                <div className="text-center text-muted-foreground mt-10 text-xs">
                                    Ask anything about the meeting context...
                                </div>
                            )}
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-lg text-xs ${msg.role === 'user'
                                            ? 'bg-primary/20 text-white'
                                            : 'bg-white/10 text-gray-200'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="p-3 border-t border-white/5 flex gap-2">
                            <input
                                className="flex-1 bg-transparent border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
                                placeholder="Ask a question..."
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                            />
                            <button onClick={handleSend} className="p-2 bg-primary/20 hover:bg-primary/30 rounded text-primary transition-colors">
                                <Send size={14} />
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'visual' && (
                    <div className="p-4 h-full overflow-auto flex items-center justify-center">
                        {data && data.type === 'mermaid' ? (
                            <div className="mermaid scale-90">{data.chartString}</div>
                        ) : (
                            <div className="text-muted-foreground text-xs flex flex-col items-center">
                                <FileJson className="mb-2 opacity-50" />
                                No visualization yet
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'code' && (
                    <div className="p-4 h-full overflow-auto font-mono text-xs text-green-400 bg-black/80">
                        <div className="text-muted-foreground">No code generated.</div>
                    </div>
                )}
            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label }: any) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-medium transition-all ${active ? 'bg-primary/20 text-primary shadow-neon-blue' : 'text-muted-foreground hover:text-white'
            }`}
    >
        {icon} {label}
    </button>
);
