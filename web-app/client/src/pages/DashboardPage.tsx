
import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { LivePanel } from '../components/LivePanel';
import { AIPanel } from '../components/AIPanel';
import { AnalyticsPanel } from '../components/AnalyticsPanel';
import { TasksPanel } from '../components/TasksPanel';

export const DashboardPage: React.FC = () => {
    const { socket } = useAuth();
    const [segments, setSegments] = useState<any[]>([]);
    const [visualization, setVisualization] = useState<any>(null);
    const [metrics, setMetrics] = useState({ engagement: 85, wordsProcessed: 2450, wpm: 120 });

    useEffect(() => {
        if (!socket) return;
        socket.on('analysis_result', (data: any) => {
            const res = data.result;
            if (res.visualization) setVisualization(res.visualization);
        });

        socket.on('live_metrics', (data: any) => {
            setMetrics(data);
        });

        // Mock data stream for visual testing if DB empty
        const interval = setInterval(() => {
            setSegments(prev => {
                if (prev.length > 20) return prev.slice(1);
                return [...prev, {
                    speaker: Math.random() > 0.5 ? "Sarah" : "Mike",
                    text: Math.random() > 0.5 ? "We need to double down on the API performance. It's critical." : "Agreed. I'll add a task to review the indexes.",
                    timestamp: Date.now(),
                    isFinal: true
                }];
            });

            // Mock Metrics update
            setMetrics(prev => ({
                engagement: Math.min(100, Math.max(0, prev.engagement + (Math.random() - 0.5) * 10)),
                wordsProcessed: prev.wordsProcessed + Math.floor(Math.random() * 5),
                wpm: 100 + Math.floor(Math.random() * 40)
            }));
        }, 2000);

        return () => clearInterval(interval);
    }, [socket]);

    return (
        <DashboardLayout>
            <div className="h-[calc(100vh-8rem)] grid grid-cols-12 grid-rows-12 gap-6 p-1">
                {/* 1. Live Panel (Top/Left - Large) */}
                <div className="col-span-8 row-span-7">
                    <LivePanel segments={segments} />
                </div>

                {/* 2. AI Panel (Top/Right - Medium) */}
                <div className="col-span-4 row-span-7">
                    <AIPanel data={visualization} />
                </div>

                {/* 3. Analytics (Bottom/Left - Medium) */}
                <div className="col-span-4 row-span-5">
                    <AnalyticsPanel metrics={{
                        engagement: Math.round(metrics.engagement),
                        wordsProcessed: metrics.wordsProcessed,
                        wpm: metrics.wpm
                    }} />
                </div>

                {/* 4. Tasks (Bottom/Right - Wide) */}
                <div className="col-span-8 row-span-5">
                    <TasksPanel />
                </div>
            </div>
        </DashboardLayout>
    );
};
