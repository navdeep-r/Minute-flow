
import React, { useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';

interface TranscriptSegment {
    speaker: string;
    text: string;
    timestamp: number;
    isFinal: boolean;
}

export const LivePanel: React.FC<{ segments: TranscriptSegment[] }> = ({ segments }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [segments]);

    return (
        <div className="h-full bg-card/50 backdrop-blur-md border border-white/5 rounded-2xl p-6 flex flex-col shadow-glass relative overflow-hidden">

            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-neon-red"></span>
                        Live Transcript
                    </h3>
                    <div className="mt-2 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 border-2 border-white/10 shadow-lg"></div>
                        <div>
                            <p className="text-sm font-bold text-white">Sarah (Product Lead)</p>
                            <p className="text-xs text-green-400">Speaking...</p>
                        </div>
                    </div>
                </div>

                {/* Waveform Visualization (CSS Animation) */}
                <div className="flex items-center gap-1 h-8">
                    {[...Array(8)].map((_, i) => (
                        <div
                            key={i}
                            className="w-1 bg-gradient-to-t from-primary to-transparent rounded-full animate-pulse"
                            style={{
                                height: `${Math.random() * 100}%`,
                                animationDelay: `${i * 0.1}s`,
                                animationDuration: '0.8s'
                            }}
                        ></div>
                    ))}
                </div>
            </div>

            {/* Transcript Feed */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar mask-Linear-gradient">
                {/* Mock Context */}
                <div className="text-center py-4">
                    <span className="bg-white/5 text-xs px-3 py-1 rounded-full text-muted-foreground">Today, 10:23 AM</span>
                </div>

                {segments.length === 0 && <p className="text-muted-foreground text-center italic text-sm">Listening for audio...</p>}

                {segments.map((seg, idx) => {
                    // Simple logic to detect "Action Items" for styling
                    const isAction = seg.text.toLowerCase().includes("task") || seg.text.toLowerCase().includes("action");
                    const isDecision = seg.text.toLowerCase().includes("decid") || seg.text.toLowerCase().includes("agree");

                    return (
                        <div key={idx} className={`group flex gap-4 ${seg.isFinal ? 'opacity-100' : 'opacity-60 blur-[1px]'}`}>
                            <div className="mt-1 min-w-[32px] font-mono text-xs text-muted-foreground text-right">{new Date(seg.timestamp).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })}</div>
                            <div className="flex-1">
                                <p className="text-xs font-bold text-indigo-400 mb-0.5">{seg.speaker}</p>
                                <div className={`p-3 rounded-lg text-sm leading-relaxed transition-all ${isAction
                                        ? "bg-blue-500/10 border border-blue-500/20 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                                        : isDecision
                                            ? "bg-purple-500/10 border border-purple-500/20 text-purple-100"
                                            : "bg-white/5 border border-transparent text-white/90"
                                    }`}>
                                    {seg.text}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} className="h-4" />
            </div>
        </div>
    );
};
