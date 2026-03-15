"use client";

import { useState, useEffect } from "react";
import { MapPin, Clock, CalendarDays, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { agreementsAPI, ExchangeSummaryResponse, ExchangeScheduleItem, AgreementSection } from "@/lib/api";

interface ExchangeSummaryCardProps {
  familyFileId: string;
  agreementId?: string;
}

/**
 * Extract exchange schedule data from agreement sections.
 * Looks at section_type "logistics" (Transportation #8) and "schedule" sections (4-7)
 * for exchange days, times, and locations.
 */
function extractExchangeFromSections(
  sections: AgreementSection[],
  agreementTitle: string
): ExchangeSummaryResponse | null {
  const relevantSections = sections.filter(
    s => s.section_type === "logistics" || s.section_type === "schedule"
  );
  if (relevantSections.length === 0) return null;

  const schedules: ExchangeScheduleItem[] = [];

  for (const section of relevantSections) {
    const sd = section.structured_data;

    if (sd) {
      // Check for exchange schedules in structured data
      if (sd.exchanges && Array.isArray(sd.exchanges)) {
        for (const ex of sd.exchanges) {
          schedules.push({
            day_of_week: ex.day_of_week || ex.day || null,
            time: ex.time || ex.pickup_time || ex.dropoff_time || null,
            location: ex.location || ex.pickup_location || ex.dropoff_location || null,
          });
        }
      }

      // Check for exchange_schedule array
      if (sd.exchange_schedule && Array.isArray(sd.exchange_schedule)) {
        for (const ex of sd.exchange_schedule) {
          schedules.push({
            day_of_week: ex.day_of_week || ex.day || null,
            time: ex.time || null,
            location: ex.location || null,
          });
        }
      }

      // Check for pickup/dropoff fields directly on the section
      if (sd.pickup_day || sd.dropoff_day || sd.exchange_day) {
        schedules.push({
          day_of_week: sd.pickup_day || sd.dropoff_day || sd.exchange_day || null,
          time: sd.pickup_time || sd.dropoff_time || sd.exchange_time || null,
          location: sd.pickup_location || sd.dropoff_location || sd.exchange_location || sd.default_location || null,
        });
      }

      // Check for default exchange location
      if (sd.default_exchange_location && schedules.length === 0) {
        schedules.push({
          day_of_week: null,
          time: null,
          location: sd.default_exchange_location,
        });
      }
    }
  }

  if (schedules.length === 0) return null;

  return {
    schedules,
    agreement_title: agreementTitle,
  };
}

export function ExchangeSummaryCard({ familyFileId, agreementId }: ExchangeSummaryCardProps) {
  const [data, setData] = useState<ExchangeSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        if (agreementId) {
          // Fetch the full agreement with sections and extract exchange data
          const result = await agreementsAPI.get(agreementId);
          const extracted = extractExchangeFromSections(
            result.sections,
            result.agreement.title
          );
          setData(extracted);
        } else {
          // Fallback: try the exchange summary endpoint
          const summary = await agreementsAPI.getExchangeSummary(familyFileId);
          setData(summary);
        }
      } catch {
        // No active agreement or no exchange data
      } finally {
        setLoading(false);
      }
    }
    if (familyFileId || agreementId) load();
  }, [familyFileId, agreementId]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
        <div className="h-5 bg-muted rounded w-48 mb-3" />
        <div className="h-4 bg-muted rounded w-64" />
      </div>
    );
  }

  if (!data || data.schedules.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--portal-primary)]/10 flex items-center justify-center">
            <FileText className="w-4.5 h-4.5 text-[var(--portal-primary)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Exchange Schedule
            </h3>
            <p className="text-xs text-muted-foreground">
              No exchange schedule found. Once an agreement with custody exchange terms is active, schedule details will appear here.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
