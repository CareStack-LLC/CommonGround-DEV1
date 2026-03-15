"use client";

import { useState, useEffect } from "react";
import { MapPin, Clock, CalendarDays, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { agreementsAPI, ExchangeSummaryResponse } from "@/lib/api";

interface ExchangeSummaryCardProps {
  familyFileId: string;
}

export function ExchangeSummaryCard({ familyFileId }: ExchangeSummaryCardProps) {
  const [data, setData] = useState<ExchangeSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const summary = await agreementsAPI.getExchangeSummary(familyFileId);
        setData(summary);
      } catch {
        // No active agreement or no exchange data
      } finally {
        setLoading(false);
      }
    }
    if (familyFileId) load();
  }, [familyFileId]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
        <div className="h-5 bg-muted rounded w-48 mb-3" />
        <div className="h-4 bg-muted rounded w-64" />
      </div>
    );
  }

  if (!data || data.schedules.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--portal-primary)]/10 flex items-center justify-center">
            <FileText className="w-4.5 h-4.5 text-[var(--portal-primary)]" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-foreground">
              Exchange Schedule
            </h3>
            {data.agreement_title && (
              <p className="text-xs text-muted-foreground">
                From: {data.agreement_title}
              </p>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {data.schedules.map((schedule, idx) => (
            <div
              key={idx}
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 bg-muted/50 rounded-lg"
            >
              {schedule.day_of_week && (
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="w-3.5 h-3.5 text-[var(--portal-primary)]" />
                  <span className="font-medium text-foreground">
                    {schedule.day_of_week}
                  </span>
                </div>
              )}
              {schedule.time && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{schedule.time}</span>
                </div>
              )}
              {schedule.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{schedule.location}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
