
import React from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';

interface Task {
    id: string;
    text: string;
    assignee: string;
    status: 'assigned' | 'sent';
    app: 'jira' | 'whatsapp' | 'slack';
}

const MOCK_TASKS: Task[] = [
    { id: '1', text: "Update API Documentation for v2 migration", assignee: "Sarah", status: "assigned", app: "jira" },
    { id: '2', text: "Schedule follow-up with Design Team", assignee: "Alex", status: "sent", app: "slack" },
    { id: '3', text: "Review final budget proposal", assignee: "Mike", status: "sent", app: "whatsapp" },
];

export const TasksPanel: React.FC = () => {
    return (
        <div className="h-full bg-card/50 backdrop-blur-md border border-white/5 rounded-2xl p-6 flex flex-col shadow-glass">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-secondary" />
                    Action Items
                </h3>
                <span className="text-xs bg-white/5 px-2 py-1 rounded text-white/60">3 Pending</span>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                {MOCK_TASKS.map((task) => (
                    <div key={task.id} className="group flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-xs border border-white/5">
                                {task.assignee[0]}
                            </div>
                            <div>
                                <p className="text-sm text-white font-medium line-clamp-1">{task.text}</p>
                                <p className="text-xs text-muted-foreground">Assigned to {task.assignee}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className={`text-[10px] px-2 py-1 rounded-md uppercase font-medium tracking-wide ${task.status === 'sent'
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                }`}>
                                {task.status}
                            </span>

                            {/* App Icon Mock */}
                            <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center grayscale group-hover:grayscale-0 transition-all opacity-50 group-hover:opacity-100">
                                {task.app === 'jira' && <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>}
                                {task.app === 'slack' && <div className="w-3 h-3 bg-fuchsia-500 rounded-sm"></div>}
                                {task.app === 'whatsapp' && <div className="w-3 h-3 bg-green-500 rounded-sm"></div>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button className="mt-4 w-full py-2.5 rounded-lg border border-dashed border-white/10 text-xs text-muted-foreground hover:bg-white/5 hover:text-white transition-colors flex items-center justify-center gap-2">
                View All Tasks <ArrowRight size={12} />
            </button>
        </div>
    );
};
