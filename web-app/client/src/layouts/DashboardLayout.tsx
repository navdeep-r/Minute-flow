
import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { TopHeader } from '../components/TopHeader';

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="flex min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">
            <Sidebar />

            <div className="flex-1 flex flex-col ml-64 relative">
                <TopHeader />
                <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    <div className="max-w-7xl mx-auto h-full">
                        {children}
                    </div>
                </main>

                {/* Background ambient glows */}
                <div className="fixed top-0 left-64 w-full h-full pointer-events-none z-[-1] overflow-hidden">
                    <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] mix-blend-screen"></div>
                    <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px] mix-blend-screen"></div>
                </div>
            </div>
        </div>
    );
};

