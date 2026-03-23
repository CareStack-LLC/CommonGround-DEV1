'use client';

import { useState, useCallback } from 'react';
import { type AriaInsights, type FlaggedMessage, SEVERITY_COLORS, ACTION_COLORS } from './page';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function SeverityBadge({ severity }: { severity: string }) {
  const color = SEVERITY_COLORS[severity] || '#8AACBC';
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border"
      style={{
        color,
        backgroundColor: `${color}15`,
        borderColor: `${color}30`,
      }}
    >
      {severity}
    </span>
  );
}

function ActionBadge({ action }: { action: string }) {
  const color = ACTION_COLORS[action] || '#8AACBC';
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{
        color,
        backgroundColor: `${color}15`,
      }}
    >
      {action?.replace(/_/g, ' ') || 'pending'}
    </span>
  );
}

function ToxicityBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    score >= 0.8 ? '#ef4444' : score >= 0.5 ? '#f97316' : score >= 0.3 ? '#f59e0b' : '#10b981';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden max-w-[80px]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[11px] text-[#8AACBC] tabular-nums">{score.toFixed(2)}</span>
    </div>
  );
}

export default function MessagesTab({
  data,
  days,
}: {
  data: AriaInsights;
  days: number;
}) {
  const [messages, setMessages] = useState<FlaggedMessage[]>(data.recent_flagged || []);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState((data.recent_flagged?.length || 0) >= 50);

  const loadMore = useCallback(async () => {
    try {
      setLoadingMore(true);
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const res = await fetch(
        `${API_BASE}/api/v1/admin/aria/insights?days=${days}&offset=${messages.length}&limit=50`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) return;
      const json = await res.json();
      const newMsgs = json.recent_flagged || [];
      setMessages((prev) => [...prev, ...newMsgs]);
      setHasMore(newMsgs.length >= 50);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  }, [days, messages.length]);

  return (
    <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[#D0E4EC]">Recent Flagged Messages</h2>
          <p className="text-xs text-[#4A6E7F] mt-0.5">
            Metadata only — no message content shown for privacy compliance
          </p>
        </div>
        <span className="text-xs text-[#6B8A9A]">
          {messages.length} result{messages.length !== 1 ? 's' : ''}
        </span>
      </div>

      {messages.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2D6A8F]/20">
                  <th className="text-left text-xs text-[#6B8A9A] font-medium pb-3 pr-4">
                    Timestamp
                  </th>
                  <th className="text-left text-xs text-[#6B8A9A] font-medium pb-3 pr-4">
                    Severity
                  </th>
                  <th className="text-left text-xs text-[#6B8A9A] font-medium pb-3 pr-4">
                    Categories
                  </th>
                  <th className="text-left text-xs text-[#6B8A9A] font-medium pb-3 pr-4">
                    Toxicity
                  </th>
                  <th className="text-left text-xs text-[#6B8A9A] font-medium pb-3 pr-4">
                    Action
                  </th>
                  <th className="text-left text-xs text-[#6B8A9A] font-medium pb-3 pr-4">
                    Level
                  </th>
                  <th className="text-left text-xs text-[#6B8A9A] font-medium pb-3">
                    Sender
                  </th>
                </tr>
              </thead>
              <tbody>
                {messages.map((msg, i) => (
                  <tr
                    key={i}
                    className="border-b border-[#2D6A8F]/10 last:border-0 hover:bg-[#2D6A8F]/10 transition-colors"
                  >
                    <td className="py-2.5 pr-4 text-xs text-[#6B8A9A] whitespace-nowrap">
                      {msg.timestamp
                        ? new Date(msg.timestamp).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="py-2.5 pr-4">
                      <SeverityBadge severity={msg.severity || 'unknown'} />
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {(msg.categories || []).slice(0, 3).map((cat) => (
                          <span
                            key={cat}
                            className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#2D6A8F]/20 text-[#8AACBC] capitalize"
                          >
                            {cat.replace(/_/g, ' ')}
                          </span>
                        ))}
                        {(msg.categories || []).length > 3 && (
                          <span className="text-[10px] text-[#6B8A9A]">
                            +{msg.categories.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">
                      <ToxicityBar score={msg.toxicity_score} />
                    </td>
                    <td className="py-2.5 pr-4">
                      <ActionBadge action={msg.user_action} />
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-[#8AACBC] text-center">
                      {msg.intervention_level || '—'}
                    </td>
                    <td className="py-2.5 text-xs text-[#6B8A9A] font-mono">
                      {msg.sender_id || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="flex justify-center mt-4">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-4 py-2 rounded-lg bg-[#2D6A8F]/20 hover:bg-[#2D6A8F]/30 text-[#8AACBC] hover:text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="text-[#4A6E7F] text-sm text-center py-10">No flagged messages</p>
      )}
    </div>
  );
}
