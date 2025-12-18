
import React from 'react';

export const TopHeader: React.FC = () => {
    return (
        <header className="h-16 w-full flex items-center justify-between px-6 border-b border-white/5 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
            {/* Left: Session Status */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 shadow-neon-red">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                    <span className="text-xs font-bold text-red-100 tracking-wider">LIVE</span>
                </div>
                <div className="h-4 w-px bg-white/10"></div>
                <span className="text-sm font-mono text-muted-foreground">00:18:42</span>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-6">
                {/* Placeholder for other actions if needed, or empty */}
            </div>
        </header>
    );
};
