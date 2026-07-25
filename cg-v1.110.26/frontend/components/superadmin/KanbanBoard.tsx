'use client';

import { useState } from 'react';
import { Clock, User, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface SprintItem {
  id: string;
  title: string;
  description?: string;
  severity?: string;
  platform?: string;
  status: string;
  assigned_to?: string;
  estimated_hours?: number;
  actual_hours?: number;
  story_points?: number;
}

interface KanbanBoardProps {
  items: SprintItem[];
  onStatusChange?: (itemId: string, newStatus: string) => void;
  loading?: boolean;
}

const COLUMNS = [
  { key: 'todo', label: 'To Do', icon: Clock, color: 'border-muted-foreground' },
  { key: 'in_progress', label: 'In Progress', icon: Loader2, color: 'border-cg-slate-light' },
  { key: 'done', label: 'Done', icon: CheckCircle, color: 'border-emerald-500' },
  { key: 'blocked', label: 'Blocked', icon: XCircle, color: 'border-red-400' },
];

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-300',
  high: 'bg-amber-500/20 text-amber-300',
  medium: 'bg-cg-slate-light/20 text-cg-slate-light',
  low: 'bg-muted-foreground/20 text-muted-foreground',
};

export function KanbanBoard({ items, onStatusChange, loading }: KanbanBoardProps) {
  const [dragItem, setDragItem] = useState<string | null>(null);

  const handleDragStart = (itemId: string) => setDragItem(itemId);
  const handleDragEnd = () => setDragItem(null);

  const handleDrop = (status: string) => {
    if (dragItem && onStatusChange) {
      onStatusChange(dragItem, status);
    }
    setDragItem(null);
  };

  return (
    <div className="grid grid-cols-4 gap-3">
      {COLUMNS.map(col => {
        const colItems = items.filter(i => i.status === col.key);
        const Icon = col.icon;
        return (
          <div
            key={col.key}
            className={`bg-cg-slate-deep/40 border-t-2 ${col.color} rounded-lg min-h-[200px]`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(col.key)}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-cg-slate/15">
              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-cg-slate-muted">{col.label}</span>
              <span className="ml-auto text-[10px] text-cg-slate-strong bg-foreground px-1.5 py-0.5 rounded">
                {colItems.length}
              </span>
            </div>

            {/* Items */}
            <div className="p-2 space-y-2">
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-16 bg-foreground/50 rounded-lg animate-pulse" />
                ))
              ) : (
                colItems.map(item => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(item.id)}
                    onDragEnd={handleDragEnd}
                    className={`bg-foreground/60 border border-cg-slate/15 rounded-lg p-2.5 cursor-grab active:cursor-grabbing hover:border-cg-sage/30 transition-colors ${
                      dragItem === item.id ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="text-xs text-cg-slate-tint font-medium mb-1.5 line-clamp-2">
                      {item.title}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.severity && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.medium}`}>
                          {item.severity}
                        </span>
                      )}
                      {item.platform && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cg-slate/20 text-muted-foreground">
                          {item.platform}
                        </span>
                      )}
                      {item.story_points && (
                        <span className="text-[10px] text-cg-slate-strong ml-auto">{item.story_points}sp</span>
                      )}
                    </div>
                    {item.assigned_to && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <User className="w-2.5 h-2.5 text-cg-slate-strong" />
                        <span className="text-[10px] text-cg-slate-strong">{item.assigned_to}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
