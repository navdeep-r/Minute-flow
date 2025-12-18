
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, FileText, CheckCircle, Network, BarChart, Settings, LogOut } from 'lucide-react';

export const Sidebar: React.FC = () => {
    const { logout, user } = useAuth();

    return (
        <aside className="w-64 h-screen fixed left-0 top-0 z-20 flex flex-col border-r border-white/5 bg-card/50 backdrop-blur-xl shadow-glass transition-all">
            {/* Logo Area */}
            <div className="p-6 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-black font-bold shadow-neon-blue">
                        M
                    </div>
                    <h1 className="text-xl font-bold tracking-wider text-white">MinuteFlow</h1>
                </div>
            </div>

            {/* Video Feed Preview */}
            <div className="p-4">
                <div className="rounded-xl overflow-hidden aspect-video bg-black border border-white/10 relative shadow-neon-blue group">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-2 z-10 transition-opacity opacity-80 group-hover:opacity-100">
                        <span className="text-[10px] font-medium text-white/80">LIVE FEED</span>
                        <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                            <span className="text-xs text-white uppercase tracking-wider">Sync #42</span>
                        </div>
                    </div>
                    {/* Placeholder for actual video stream or static image */}
                    <div className="w-full h-full bg-slate-800 animate-pulse opacity-20"></div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
                <NavItem icon={<FileText />} label="Transcript" active />
                <NavItem icon={<CheckCircle />} label="Tasks & Actions" />
                <NavItem icon={<Network />} label="Knowledge Graph" />
                <NavItem icon={<BarChart />} label="Analytics" />
                <div className="pt-4 pb-2">
                    <div className="h-px bg-white/5 w-full"></div>
                </div>
                <NavItem icon={<Settings />} label="Settings" />
            </nav>

            {/* User Profile */}
            <div className="p-4 border-t border-white/5 bg-white/5">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-accent to-primary flex items-center justify-center text-sm font-bold shadow-lg">
                        {user?.name?.[0] || 'U'}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">{user?.name || 'Guest'}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Pro Plan</span>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                >
                    <LogOut size={14} />
                    Sign Out
                </button>
            </div>
        </aside>
    );
};

const NavItem = ({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) => (
    <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${active
            ? "bg-primary/10 text-white shadow-[inset_3px_0_0_0_#3b82f6]"
            : "text-muted-foreground hover:bg-white/5 hover:text-white"
        }`}>
        {React.cloneElement(icon as React.ReactElement, {
            size: 18,
            className: active ? "text-primary drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "group-hover:text-white transition-colors"
        })}
        <span className="text-sm font-medium tracking-wide">{label}</span>
    </button>
);
