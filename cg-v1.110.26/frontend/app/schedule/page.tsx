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
  ArrowLeftRight,
  MapPin,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface FamilyFileWithAgreements {
  familyFile: FamilyFile;
  agreements: Agreement[];
}

/**
 * TimeBridge - Shared Calendar View
 *
 * Design Philosophy: "Google Calendar meets Airbnb"
 * - Split view: Month + Agenda
 * - Custody Ribbon showing mom/dad days
 * - Clean, organized, clarity-first
 */

// Tab Button Component
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
      className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-smooth ${
        active
          ? 'bg-cg-sage text-white'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
      {badge && (
        <span className={`text-xs px-1.5 py-0.5 rounded-md ${
          active ? 'bg-white/20' : 'bg-muted'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// Quick Action Card
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
    sage: 'bg-cg-sage-subtle text-cg-sage hover:border-cg-sage/30',
    purple: 'bg-purple-50 text-purple-700 hover:border-purple-300',
    amber: 'bg-cg-amber-subtle text-cg-amber hover:border-cg-amber/30',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-4 rounded-xl border border-transparent transition-smooth ${colorClasses[color]}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
        color === 'sage' ? 'bg-cg-sage/10' :
        color === 'purple' ? 'bg-purple-100' :
        'bg-cg-amber/10'
      }`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-left">
        <p className="font-medium">{title}</p>
        <p className="text-xs opacity-70">{description}</p>
      </div>
    </button>
  );
}

// Custody Legend
function CustodyLegend() {
  return (
    <div className="flex items-center gap-4 text-xs">
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm bg-cg-sage" />
        <span className="text-muted-foreground">Mom's Time</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm bg-cg-slate" />
        <span className="text-muted-foreground">Dad's Time</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm bg-purple-500" />
        <span className="text-muted-foreground">Exchange</span>
      </div>
    </div>
  );
}

// Family File Selector
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
        className="appearance-none bg-card border border-border rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage/20 focus:border-cg-sage transition-smooth cursor-pointer"
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
      <div className="min-h-screen bg-background pb-20 lg:pb-0">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-cg-sage border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading TimeBridge...</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty State
  if (!selectedFamilyFile) {
    return (
      <div className="min-h-screen bg-background pb-20 lg:pb-0">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center max-w-md px-6">
            <div className="w-20 h-20 rounded-full bg-cg-sage-subtle flex items-center justify-center mx-auto mb-6">
              <Calendar className="h-10 w-10 text-cg-sage" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              Welcome to TimeBridge
            </h2>
            <p className="text-muted-foreground mb-6">
              Create or join a Family File to start coordinating your co-parenting schedule.
            </p>
            <Link
              href="/family-files"
              className="cg-btn-primary inline-flex items-center gap-2"
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
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      <Navigation />

      {/* Page Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Top Row */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cg-sage-subtle flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-cg-sage" />
                </div>
                TimeBridge
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <Users className="h-4 w-4" />
                <span>{selectedFamilyFile.title}</span>
                {selectedAgreement && (
                  <>
                    <span className="text-border">•</span>
                    <FileText className="h-4 w-4" />
                    <span>{selectedAgreement.title}</span>
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
                    className="appearance-none bg-card border border-border rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage/20 focus:border-cg-sage transition-smooth cursor-pointer"
                  >
                    <option value="">All Agreements</option>
                    {currentFamilyFileData.agreements.map(agreement => (
                      <option key={agreement.id} value={agreement.id}>
                        {agreement.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
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
          <div className="mb-6 flex items-center gap-3 p-4 bg-cg-error-subtle border border-cg-error/20 rounded-xl">
            <AlertCircle className="h-5 w-5 text-cg-error flex-shrink-0" />
            <p className="text-sm text-cg-error">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 p-1 bg-muted rounded-xl">
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
        <div className="cg-card p-4 sm:p-6">
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
