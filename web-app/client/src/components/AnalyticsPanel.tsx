
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { TrendingUp, Activity } from 'lucide-react';

interface AnalyticsPanelProps {
    metrics?: {
        engagement: number;
        wordsProcessed: number;
        wpm: number;
    };
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ metrics }) => {
    // Default / Fallback data
    const engagement = metrics?.engagement || 85;
    const words = metrics?.wordsProcessed || 2450;
    const wpm = metrics?.wpm || 120;

    const data = [{ name: 'Engaged', value: engagement }, { name: 'Passive', value: 100 - engagement }];
    const COLORS = ['#a5d64c', '#1e293b'];

    return (
        <div className="h-full bg-card/50 backdrop-blur-md border border-white/5 rounded-2xl p-6 flex flex-col justify-between shadow-glass relative overflow-hidden group">
            {/* Hover Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

            <div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Activity size={14} className="text-primary" />
                    Session Health
                </h3>
            </div>

            {/* Gauge Chart */}
            <div className="flex-1 relative flex items-center justify-center min-h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="80%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>

                <div className="absolute bottom-5 text-center">
                    <span className="text-3xl font-bold text-white">{engagement}%</span>
                    <p className="text-xs text-muted-foreground">Engagement</p>
                </div>
            </div>

            {/* Large Metric */}
            <div className="mt-6 pt-6 border-t border-white/5">
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Words Processed</p>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-1">
                            <Activity size={20} className="text-accent" />
                            {words.toLocaleString()}
                        </h2>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                        <TrendingUp size={12} />
                        +{wpm}/min
                    </div>
                </div>
            </div>

            {/* Progress Bar (Static for now, but could be dynamic) */}
            <div className="mt-4">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Time to Value</span>
                    <span>High</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-secondary w-[75%] rounded-full shadow-[0_0_10px_rgba(165,214,76,0.5)]"></div>
                </div>
            </div>
        </div>
    );
};
