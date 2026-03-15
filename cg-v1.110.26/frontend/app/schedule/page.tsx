'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { familyFilesAPI, agreementsAPI, exchangesAPI, FamilyFile, Agreement, EventV2, ExchangeInstanceForCalendar, CustodyExchangeInstance } from '@/lib/api';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import CalendarView from '@/components/schedule/calendar-view';
import EventForm from '@/components/schedule/event-form';
import EventDetails from '@/components/schedule/event-details';
import ExchangeForm from '@/components/schedule/exchange-form';
import SilentHandoffCheckIn from '@/components/schedule/silent-handoff-checkin';
import SwapRequestModal from '@/components/schedule/swap-request-modal';
import { ExchangeSummaryCard } from '@/components/schedule/exchange-summary-card';
import {
  Calendar,
  RefreshCw,
  Users,
  FileText,
  Plus,
  ChevronDown,
  ChevronLeft,
  ArrowLeftRight,
  AlertCircle,
} from 'lucide-react';

interface FamilyFileWithAgreements {
  familyFile: FamilyFile;
  agreements: Agreement[];
}

/**
 * TimeBridge - Shared Calendar & Schedule Coordination
 *
 * Design Philosophy: Clean, organized, clarity-first calendar view
 * - Split view: Month calendar + event management
 * - Custody visualization showing parenting time
 * - Professional, polished interface for busy parents
 */

// Quick Action Card - matches dashboard ActionStreamItem style
function QuickActionCard({
  icon: Icon,
  title,
  description,
  color,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: 'sage' | 'purple' | 'amber';
  onClick: () => void;
}) {
  const colorClasses = {
    sage: {
      iconBg: 'bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5',
      iconColor: 'text-[var(--portal-primary)]',
    },
    purple: {
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    amber: {
      iconBg: 'bg-cg-amber-subtle',
      iconColor: 'text-cg-amber',
    },
  };

  const classes = colorClasses[color];

  return (
    <button
      onClick={onClick}
      className="w-full bg-card rounded-2xl border-2 border-border p-5 flex items-center gap-4 text-left hover:border-[var(--portal-primary)]/30 hover:shadow-xl transition-all duration-300 hover:scale-[1.01] group"
    >
      <div className={`w-14 h-14 ${classes.iconBg} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300`}>
        <Icon className={`w-6 h-6 ${classes.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>{title}</p>
        <p className="text-sm text-muted-foreground truncate font-medium">{description}</p>
      </div>
      <ChevronLeft className="h-5 w-5 rotate-180 text-muted-foreground flex-shrink-0 group-hover:text-[var(--portal-primary)] group-hover:translate-x-1 transition-all duration-300" />
    </button>
  );
}

// Custody Legend with dashboard-matching styling
function CustodyLegend() {
  return (
    <div className="flex items-center gap-4 text-xs bg-card px-4 py-3 rounded-2xl border-2 border-border shadow-lg flex-wrap">
      <span className="text-muted-foreground font-semibold mr-1">Legend:</span>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-[var(--portal-primary)] shadow-sm" />
        <span className="text-foreground font-semibold whitespace-nowrap">Your Time</span>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-cg-slate shadow-sm" />
        <span className="text-foreground font-semibold whitespace-nowrap">Their Time</span>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm" />
        <span className="text-foreground font-semibold whitespace-nowrap">Exchange</span>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-[#2D6A8F] shadow-sm" />
        <span className="text-foreground font-semibold whitespace-nowrap">Professional</span>
      </div>
    </div>
  );
}

// Family File Selector with enhanced styling
function FamilyFileSelector({
  familyFiles,
  selected,
  onSelect,
}: {
  familyFiles: FamilyFileWithAgreements[];
  selected: FamilyFile | null;
  onSelect: (id: string) => void;
}) {
  if (familyFiles.length <= 1) return null;

  return (
    <div className="relative">
      <select
        value={selected?.id || ''}
        onChange={(e) => onSelect(e.target.value)}
        className="
          appearance-none bg-card border border-border rounded-xl
          px-4 py-2.5 pr-10 text-sm font-medium text-foreground
          focus:outline-none focus:ring-2 focus:ring-[var(--portal-primary)]/20 focus:border-[var(--portal-primary)]
          transition-all cursor-pointer hover:border-border
          shadow-sm
        "
      >
        {familyFiles.map((item) => (
          <option key={item.familyFile.id} value={item.familyFile.id}>
            {item.familyFile.title}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
    </div>
  );
}

function ScheduleContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [familyFilesWithAgreements, setFamilyFilesWithAgreements] = useState<FamilyFileWithAgreements[]>([]);
  const [selectedFamilyFile, setSelectedFamilyFile] = useState<FamilyFile | null>(null);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showExchangeForm, setShowExchangeForm] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [eventFormDate, setEventFormDate] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<EventV2 | null>(null);
  const [calendarKey, setCalendarKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExchangeInstance, setSelectedExchangeInstance] = useState<CustodyExchangeInstance | null>(null);

  useEffect(() => {
    if (user) {
      loadFamilyFilesAndAgreements();
    }
  }, [user]);

  const loadFamilyFilesAndAgreements = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const familyFilesResponse = await familyFilesAPI.list();
      const familyFiles = familyFilesResponse.items || [];

      const filesWithAgreements: FamilyFileWithAgreements[] = [];

      for (const ff of familyFiles) {
        try {
          const agreementsResponse = await agreementsAPI.listForFamilyFile(ff.id);
          filesWithAgreements.push({
            familyFile: ff,
            agreements: agreementsResponse.items || [],
          });
        } catch (err) {
          console.error(`Failed to load agreements for family file ${ff.id}:`, err);
          filesWithAgreements.push({
            familyFile: ff,
            agreements: [],
          });
        }
      }

      setFamilyFilesWithAgreements(filesWithAgreements);

      if (filesWithAgreements.length > 0) {
        const firstWithAgreements = filesWithAgreements.find(f => f.agreements.length > 0);
        if (firstWithAgreements) {
          setSelectedFamilyFile(firstWithAgreements.familyFile);
          if (firstWithAgreements.agreements.length > 0) {
            setSelectedAgreement(firstWithAgreements.agreements[0]);
          }
        } else {
          setSelectedFamilyFile(filesWithAgreements[0].familyFile);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load family files');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEvent = (date?: Date) => {
    setEventFormDate(date);
    setShowEventForm(true);
  };

  const handleEventCreated = () => {
    setShowEventForm(false);
    setEventFormDate(undefined);
    setCalendarKey(prev => prev + 1);
  };

  const handleExchangeCreated = () => {
    setShowExchangeForm(false);
    setCalendarKey(prev => prev + 1);
  };

  const handleSwapCreated = () => {
    setShowSwapModal(false);
    setCalendarKey(prev => prev + 1);
  };

  const handleEventClick = (event: EventV2) => {
    setSelectedEvent(event);
  };

  const handleRsvpUpdate = () => {
    setCalendarKey(prev => prev + 1);
  };

  const handleExchangeClick = async (exchange: ExchangeInstanceForCalendar) => {
    if (!selectedFamilyFile) return;

    try {
      const exchangeDate = new Date(exchange.scheduled_time);
      const startDate = new Date(exchangeDate);
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date(exchangeDate);
      endDate.setDate(endDate.getDate() + 1);

      const instances = await exchangesAPI.getUpcoming(
        selectedFamilyFile.id,
        startDate.toISOString(),
        endDate.toISOString()
      );
      const fullInstance = instances.find(inst => inst.id === exchange.id);

      if (fullInstance) {
        setSelectedExchangeInstance(fullInstance);
      } else {
        console.error('Exchange instance not found:', exchange.id);
      }
    } catch (err: any) {
      console.error('Failed to load exchange details:', err);
    }
  };

  const handleCheckInComplete = (updatedInstance: CustodyExchangeInstance) => {
    setSelectedExchangeInstance(updatedInstance);
    setCalendarKey(prev => prev + 1);
  };

  const handleFamilyFileChange = (familyFileId: string) => {
    const item = familyFilesWithAgreements.find(f => f.familyFile.id === familyFileId);
    if (item) {
      setSelectedFamilyFile(item.familyFile);
      if (item.agreements.length > 0) {
        setSelectedAgreement(item.agreements[0]);
      } else {
        setSelectedAgreement(null);
      }
      setCalendarKey(prev => prev + 1);
    }
  };

  const handleAgreementChange = (agreementId: string) => {
    const currentData = familyFilesWithAgreements.find(f => f.familyFile.id === selectedFamilyFile?.id);
    const agreement = currentData?.agreements.find(a => a.id === agreementId);
    if (agreement) {
      setSelectedAgreement(agreement);
      setCalendarKey(prev => prev + 1);
    }
  };

  if (!user) {
    router.push('/login');
    return null;
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted via-background to-muted">
        <Navigation />
        <main className="max-w-3xl mx-auto px-4 py-8 pb-32 lg:pb-8">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <div className="w-14 h-14 border-3 border-[var(--portal-primary)]/20 border-t-[var(--portal-primary)] rounded-full animate-spin mx-auto" />
              <p className="mt-4 text-muted-foreground font-medium">Loading TimeBridge...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Empty State
  if (!selectedFamilyFile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted via-background to-muted">
        <Navigation />
        <main className="max-w-3xl mx-auto px-4 py-8 pb-32 lg:pb-8">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center max-w-md px-6">
              <div className="w-20 h-20 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Calendar className="w-10 h-10 text-[var(--portal-primary)]" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                Welcome to TimeBridge
              </h2>
              <p className="text-muted-foreground font-medium mb-8 max-w-md mx-auto">
                Your shared calendar for coordinating parenting time, exchanges, and important events.
              </p>
              <button
                onClick={() => router.push('/family-files')}
                className="bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F] text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center gap-3"
              >
                <Users className="w-5 h-5" />
                Go to Family Files
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const currentFamilyFileData = familyFilesWithAgreements.find(f => f.familyFile.id === selectedFamilyFile.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted via-background to-muted pb-32 lg:pb-8">
      <Navigation />

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="w-12 h-12 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-2xl flex items-center justify-center shadow-md">
              <Calendar className="w-6 h-6 text-[var(--portal-primary)]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                TimeBridge
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground ml-14">
            <Users className="h-4 w-4" />
            <span className="font-medium">{selectedFamilyFile.title}</span>
            {selectedAgreement && (
              <>
                <span className="text-muted-foreground">•</span>
                <FileText className="h-4 w-4" />
                <span className="font-medium">{selectedAgreement.title}</span>
              </>
            )}
          </div>
        </div>

        {/* Exchange Schedule from Agreement */}
        {selectedFamilyFile && (
          <div className="mb-6">
            <ExchangeSummaryCard familyFileId={selectedFamilyFile.id} />
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-3 mb-6">
          <QuickActionCard
            icon={Plus}
            title="New Event"
            description="Add to shared calendar"
            color="sage"
            onClick={() => handleCreateEvent()}
          />
          <QuickActionCard
            icon={ArrowLeftRight}
            title="Schedule Exchange"
            description="Plan pickup/dropoff"
            color="purple"
            onClick={() => setShowExchangeForm(true)}
          />
          <QuickActionCard
            icon={RefreshCw}
            title="Request Swap"
            description="Propose schedule change"
            color="sage"
            onClick={() => setShowSwapModal(true)}
          />
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-destructive/10 border-2 border-destructive/20 rounded-2xl">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive font-medium">{error}</p>
          </div>
        )}

        {/* Custody Legend */}
        <div className="mb-6">
          <CustodyLegend />
        </div>

        {/* Calendar */}
        <div className="bg-card rounded-2xl border-2 border-border shadow-lg p-4 sm:p-6">
          <CalendarView
            key={calendarKey}
            caseId={selectedFamilyFile.id}
            agreementId={selectedAgreement?.id}
            onCreateEvent={handleCreateEvent}
            onEventClick={handleEventClick}
            onExchangeClick={handleExchangeClick}
          />
        </div>
      </main>

      {/* Modals */}
      {showEventForm && (
        <EventForm
          caseId={selectedFamilyFile.id}
          agreementId={selectedAgreement?.id}
          onClose={() => {
            setShowEventForm(false);
            setEventFormDate(undefined);
          }}
          onSuccess={handleEventCreated}
          initialDate={eventFormDate}
        />
      )}

      {selectedEvent && (
        <EventDetails
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onRsvpUpdate={handleRsvpUpdate}
        />
      )}

      {showExchangeForm && (
        <ExchangeForm
          caseId={selectedFamilyFile.id}
          agreementId={selectedAgreement?.id}
          onClose={() => setShowExchangeForm(false)}
          onSuccess={handleExchangeCreated}
        />
      )}

      {showSwapModal && (
        <SwapRequestModal
          caseId={selectedFamilyFile.id}
          onClose={() => setShowSwapModal(false)}
          onSuccess={handleSwapCreated}
        />
      )}

      {selectedExchangeInstance && (
        <SilentHandoffCheckIn
          instance={selectedExchangeInstance}
          familyFileId={selectedFamilyFile?.id}
          onCheckInComplete={handleCheckInComplete}
          onClose={() => setSelectedExchangeInstance(null)}
        />
      )}
    </div>
  );
}

export default function SchedulePage() {
  return (
    <ProtectedRoute>
      <ScheduleContent />
    </ProtectedRoute>
  );
}
