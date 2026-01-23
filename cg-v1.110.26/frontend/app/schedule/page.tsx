'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { familyFilesAPI, agreementsAPI, exchangesAPI, FamilyFile, FamilyFileDetail, Agreement, MyTimeCollection, EventV2, ExchangeInstanceForCalendar, CustodyExchangeInstance } from '@/lib/api';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import { PageContainer } from '@/components/layout';
import CollectionsManager from '@/components/schedule/collections-manager';
import TimeBlocksManager from '@/components/schedule/time-blocks-manager';
import CalendarView from '@/components/schedule/calendar-view';
import EventForm from '@/components/schedule/event-form';
import EventDetails from '@/components/schedule/event-details';
import ExchangeForm from '@/components/schedule/exchange-form';
import SilentHandoffCheckIn from '@/components/schedule/silent-handoff-checkin';
import {
  Calendar,
  Clock,
  FolderOpen,
  RefreshCw,
  Users,
  FileText,
  Plus,
  ChevronDown,
  ChevronLeft,
  ArrowLeftRight,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Sparkles,
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

// Tab Button Component with enhanced styling
function TabButton({
  active,
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        group relative flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium
        rounded-xl transition-all duration-200 flex-shrink-0
        ${
          active
            ? 'bg-gradient-to-br from-[var(--portal-primary)] to-[#1f4644] text-white shadow-sm'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
        }
      `}
    >
      <Icon className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${active ? '' : 'group-hover:scale-110'}`} />
      <span className="hidden sm:inline whitespace-nowrap font-medium">{label}</span>
      {badge && (
        <span className={`
          hidden sm:inline text-xs px-2 py-0.5 rounded-md font-medium
          ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}
        `}>
          {badge}
        </span>
      )}
      {active && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
      )}
    </button>
  );
}

// Quick Action Card with enhanced visual design
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
      bg: 'bg-gradient-to-br from-[var(--portal-primary)]/5 to-[var(--portal-primary)]/10',
      icon: 'bg-gradient-to-br from-[var(--portal-primary)] to-[#1f4644] text-white',
      text: 'text-[var(--portal-primary)]',
      hover: 'hover:from-[var(--portal-primary)]/10 hover:to-[var(--portal-primary)]/15 hover:shadow-md',
      border: 'border-[var(--portal-primary)]/10 hover:border-[var(--portal-primary)]/20',
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-50/80 to-purple-100/50',
      icon: 'bg-gradient-to-br from-purple-600 to-purple-700 text-white',
      text: 'text-purple-700',
      hover: 'hover:from-purple-100/80 hover:to-purple-200/50 hover:shadow-md',
      border: 'border-purple-100 hover:border-purple-200',
    },
    amber: {
      bg: 'bg-gradient-to-br from-amber-50/80 to-amber-100/50',
      icon: 'bg-gradient-to-br from-amber-600 to-amber-700 text-white',
      text: 'text-amber-700',
      hover: 'hover:from-amber-100/80 hover:to-amber-200/50 hover:shadow-md',
      border: 'border-amber-100 hover:border-amber-200',
    },
  };

  const classes = colorClasses[color];

  return (
    <button
      onClick={onClick}
      className={`
        group flex items-center gap-3 p-4 rounded-xl border transition-all duration-200
        ${classes.bg} ${classes.hover} ${classes.border}
      `}
    >
      <div className={`
        w-11 h-11 rounded-xl flex items-center justify-center shadow-sm
        transition-transform duration-200 group-hover:scale-110
        ${classes.icon}
      `}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-left flex-1">
        <p className={`font-semibold ${classes.text}`}>{title}</p>
        <p className="text-xs text-slate-600 mt-0.5">{description}</p>
      </div>
      <ChevronLeft className={`h-4 w-4 rotate-180 opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-50 group-hover:translate-x-0 ${classes.text}`} />
    </button>
  );
}

// Custody Legend with refined styling
function CustodyLegend() {
  return (
    <div className="flex items-center gap-4 text-xs bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-100">
      <span className="text-slate-500 font-medium mr-1">Legend:</span>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-[var(--portal-primary)] to-[#1f4644] shadow-sm" />
        <span className="text-slate-700 font-medium whitespace-nowrap">Your Time</span>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-slate-400 to-slate-500 shadow-sm" />
        <span className="text-slate-700 font-medium whitespace-nowrap">Their Time</span>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-purple-500 to-purple-600 shadow-sm" />
        <span className="text-slate-700 font-medium whitespace-nowrap">Exchange</span>
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
          appearance-none bg-white border border-slate-200 rounded-xl
          px-4 py-2.5 pr-10 text-sm font-medium text-slate-900
          focus:outline-none focus:ring-2 focus:ring-[var(--portal-primary)]/20 focus:border-[var(--portal-primary)]
          transition-all cursor-pointer hover:border-slate-300
          shadow-sm
        "
      >
        {familyFiles.map((item) => (
          <option key={item.familyFile.id} value={item.familyFile.id}>
            {item.familyFile.title}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
    </div>
  );
}

function ScheduleContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [familyFilesWithAgreements, setFamilyFilesWithAgreements] = useState<FamilyFileWithAgreements[]>([]);
  const [selectedFamilyFile, setSelectedFamilyFile] = useState<FamilyFile | null>(null);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<MyTimeCollection | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showExchangeForm, setShowExchangeForm] = useState(false);
  const [eventFormDate, setEventFormDate] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<EventV2 | null>(null);
  const [activeTab, setActiveTab] = useState<'calendar' | 'collections' | 'blocks'>('calendar');
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

  const handleEventClick = (event: EventV2) => {
    setSelectedEvent(event);
  };

  const handleRsvpUpdate = () => {
    setCalendarKey(prev => prev + 1);
  };

  const handleCollectionSelect = (collection: MyTimeCollection) => {
    setSelectedCollection(collection);
    setActiveTab('blocks');
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 pb-20 lg:pb-0">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="w-14 h-14 border-3 border-[var(--portal-primary)] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-6 text-slate-600 font-medium">Loading TimeBridge...</p>
            <p className="mt-2 text-sm text-slate-500">Syncing your schedule</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty State
  if (!selectedFamilyFile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 pb-20 lg:pb-0">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center max-w-md px-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Calendar className="h-12 w-12 text-[var(--portal-primary)]" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              Welcome to TimeBridge
            </h2>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Your shared calendar for coordinating parenting time, exchanges, and important events.
            </p>
            <Link
              href="/family-files"
              className="
                inline-flex items-center gap-2 px-6 py-3
                bg-gradient-to-br from-[var(--portal-primary)] to-[#1f4644] text-white
                rounded-xl font-medium shadow-md hover:shadow-lg
                transition-all duration-200 hover:-translate-y-0.5
              "
            >
              <Users className="h-4 w-4" />
              Go to Family Files
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentFamilyFileData = familyFilesWithAgreements.find(f => f.familyFile.id === selectedFamilyFile.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 pb-24 lg:pb-8">
      <Navigation />

      {/* Page Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Top Row */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="p-2 -ml-2 rounded-xl hover:bg-slate-100 transition-colors"
                  aria-label="Go back"
                >
                  <ChevronLeft className="h-5 w-5 text-slate-600" />
                </button>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--portal-primary)] to-[#1f4644] flex items-center justify-center shadow-md">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900">
                  TimeBridge
                </h1>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 ml-14">
                <Users className="h-4 w-4" />
                <span className="font-medium">{selectedFamilyFile.title}</span>
                {selectedAgreement && (
                  <>
                    <span className="text-slate-300">•</span>
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">{selectedAgreement.title}</span>
                  </>
                )}
              </div>
            </div>

            {/* Selectors */}
            <div className="flex items-center gap-3">
              <FamilyFileSelector
                familyFiles={familyFilesWithAgreements}
                selected={selectedFamilyFile}
                onSelect={handleFamilyFileChange}
              />
              {currentFamilyFileData && currentFamilyFileData.agreements.length > 1 && (
                <div className="relative">
                  <select
                    value={selectedAgreement?.id || ''}
                    onChange={(e) => handleAgreementChange(e.target.value)}
                    className="
                      appearance-none bg-white border border-slate-200 rounded-xl
                      px-4 py-2.5 pr-10 text-sm font-medium text-slate-900
                      focus:outline-none focus:ring-2 focus:ring-[var(--portal-primary)]/20 focus:border-[var(--portal-primary)]
                      transition-all cursor-pointer hover:border-slate-300
                      shadow-sm
                    "
                  >
                    <option value="">All Agreements</option>
                    {currentFamilyFileData.agreements.map(agreement => (
                      <option key={agreement.id} value={agreement.id}>
                        {agreement.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
              icon={FolderOpen}
              title="My Collections"
              description="Organize time blocks"
              color="amber"
              onClick={() => setActiveTab('collections')}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 p-1.5 bg-white rounded-xl border border-slate-200 shadow-sm">
            <TabButton
              active={activeTab === 'calendar'}
              icon={Calendar}
              label="Calendar"
              onClick={() => setActiveTab('calendar')}
            />
            <TabButton
              active={activeTab === 'collections'}
              icon={FolderOpen}
              label="Collections"
              onClick={() => setActiveTab('collections')}
            />
            <TabButton
              active={activeTab === 'blocks'}
              icon={Clock}
              label="Time Blocks"
              badge="Private"
              onClick={() => setActiveTab('blocks')}
            />
          </div>

          {activeTab === 'calendar' && <CustodyLegend />}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
          {activeTab === 'calendar' && (
            <CalendarView
              key={calendarKey}
              caseId={selectedFamilyFile.id}
              agreementId={selectedAgreement?.id}
              onCreateEvent={handleCreateEvent}
              onEventClick={handleEventClick}
              onExchangeClick={handleExchangeClick}
            />
          )}
          {activeTab === 'collections' && (
            <div className="max-w-3xl mx-auto">
              <CollectionsManager caseId={selectedFamilyFile.id} onCollectionSelect={handleCollectionSelect} />
            </div>
          )}
          {activeTab === 'blocks' && (
            <div className="max-w-3xl mx-auto">
              <TimeBlocksManager caseId={selectedFamilyFile.id} selectedCollection={selectedCollection || undefined} />
            </div>
          )}
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
