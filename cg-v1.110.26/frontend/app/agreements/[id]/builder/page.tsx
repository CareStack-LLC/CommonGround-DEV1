'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { agreementsAPI, Agreement, AgreementSection } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';

// Import section components
import { IntroSection } from '@/components/agreements/sections/intro';
import { ParentInfoSection } from '@/components/agreements/sections/parent-info';
import { OtherParentInfoSection } from '@/components/agreements/sections/other-parent-info';
import { ChildrenInfoSection } from '@/components/agreements/sections/children-info';
import { LegalCustodySection } from '@/components/agreements/sections/legal-custody';
import { PhysicalCustodySection } from '@/components/agreements/sections/physical-custody';
import { ParentingScheduleSection } from '@/components/agreements/sections/parenting-schedule';
import { HolidayScheduleSection } from '@/components/agreements/sections/holiday-schedule';
import { ExchangeLogisticsSection } from '@/components/agreements/sections/exchange-logistics';
import { TransportationSection } from '@/components/agreements/sections/transportation';
import { ChildSupportSection } from '@/components/agreements/sections/child-support';
import { MedicalHealthcareSection } from '@/components/agreements/sections/medical-healthcare';
import { EducationSection } from '@/components/agreements/sections/education';
import { ParentCommunicationSection } from '@/components/agreements/sections/parent-communication';
import { ChildCommunicationSection } from '@/components/agreements/sections/child-communication';
import { TravelSection } from '@/components/agreements/sections/travel';
import { RelocationSection } from '@/components/agreements/sections/relocation';
import { DisputeResolutionSection } from '@/components/agreements/sections/dispute-resolution';
import { OtherProvisionsSection } from '@/components/agreements/sections/other-provisions';
import { ReviewSection } from '@/components/agreements/sections/review';

// Define section types
type SectionKey =
  | 'intro'
  | 'parent_info'
  | 'other_parent_info'
  | 'children_info'
  | 'legal_custody'
  | 'physical_custody'
  | 'parenting_schedule'
  | 'holiday_schedule'
  | 'exchange_logistics'
  | 'transportation'
  | 'child_support'
  | 'medical_healthcare'
  | 'education'
  | 'parent_communication'
  | 'child_communication'
  | 'travel'
  | 'relocation'
  | 'dispute_resolution'
  | 'other_provisions'
  | 'review';

interface SectionConfig {
  key: SectionKey;
  title: string;
  number: number;
  component: React.ComponentType<SectionProps>;
}

interface SectionProps {
  data: any;
  onSave: (data: any) => Promise<void>;
  onNext: () => void;
  onPrevious: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const SECTIONS: SectionConfig[] = [
  { key: 'intro', title: 'Welcome', number: 0, component: IntroSection },
  { key: 'parent_info', title: 'Your Information', number: 1, component: ParentInfoSection },
  { key: 'other_parent_info', title: "Other Parent's Information", number: 2, component: OtherParentInfoSection },
  { key: 'children_info', title: 'Children Information', number: 3, component: ChildrenInfoSection },
  { key: 'legal_custody', title: 'Legal Custody', number: 4, component: LegalCustodySection },
  { key: 'physical_custody', title: 'Physical Custody', number: 5, component: PhysicalCustodySection },
  { key: 'parenting_schedule', title: 'Parenting Schedule', number: 6, component: ParentingScheduleSection },
  { key: 'holiday_schedule', title: 'Holiday Schedule', number: 7, component: HolidayScheduleSection },
  { key: 'exchange_logistics', title: 'Exchange Logistics', number: 8, component: ExchangeLogisticsSection },
  { key: 'transportation', title: 'Transportation', number: 9, component: TransportationSection },
  { key: 'child_support', title: 'Child Support', number: 10, component: ChildSupportSection },
  { key: 'medical_healthcare', title: 'Medical & Healthcare', number: 11, component: MedicalHealthcareSection },
  { key: 'education', title: 'Education', number: 12, component: EducationSection },
  { key: 'parent_communication', title: 'Parent Communication', number: 13, component: ParentCommunicationSection },
  { key: 'child_communication', title: 'Child Communication', number: 14, component: ChildCommunicationSection },
  { key: 'travel', title: 'Travel', number: 15, component: TravelSection },
  { key: 'relocation', title: 'Relocation', number: 16, component: RelocationSection },
  { key: 'dispute_resolution', title: 'Dispute Resolution', number: 17, component: DisputeResolutionSection },
  { key: 'other_provisions', title: 'Other Provisions', number: 18, component: OtherProvisionsSection },
  { key: 'review', title: 'Review & Finalize', number: 19, component: ReviewSection },
];

function AgreementBuilderContent() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const agreementId = params.id as string;

  // Get initial section from URL query parameter (for editing specific sections)
  const initialSection = searchParams.get('section');
  const initialSectionIndex = initialSection ? parseInt(initialSection, 10) : 0;

  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [sections, setSections] = useState<AgreementSection[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(
    initialSectionIndex >= 0 && initialSectionIndex < SECTIONS.length ? initialSectionIndex : 0
  );
  const [sectionData, setSectionData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAgreement();
  }, [agreementId]);

  // Update current section if URL parameter changes
  useEffect(() => {
    if (initialSection) {
      const idx = parseInt(initialSection, 10);
      if (idx >= 0 && idx < SECTIONS.length) {
        setCurrentSectionIndex(idx);
      }
    }
  }, [initialSection]);

  // Helper to get all wizard keys that map to a backend section
  const getWizardKeysForBackendSection = (sectionType: string, sectionNumber: string): SectionKey[] => {
    const allMappings = {
      'intro': [],
      'parent_info': [{ type: 'basic_info', number: '1', title: 'Basic Information' }],
      'other_parent_info': [{ type: 'basic_info', number: '1', title: 'Basic Information' }],
      'children_info': [{ type: 'basic_info', number: '1', title: 'Basic Information' }],
      'legal_custody': [{ type: 'custody', number: '2', title: 'Legal Custody' }],
      'physical_custody': [{ type: 'custody', number: '3', title: 'Physical Custody' }],
      'parenting_schedule': [{ type: 'schedule', number: '4', title: 'Parenting Time Schedule' }],
      'holiday_schedule': [{ type: 'schedule', number: '5', title: 'Holiday Schedule' }],
      'exchange_logistics': [{ type: 'logistics', number: '8', title: 'Transportation' }],
      'transportation': [{ type: 'logistics', number: '8', title: 'Transportation' }],
      'child_support': [
        { type: 'financial', number: '14', title: 'Child Support' },
        { type: 'financial', number: '15', title: 'Expense Sharing' }
      ],
      'medical_healthcare': [{ type: 'decision_making', number: '11', title: 'Healthcare Decisions' }],
      'education': [{ type: 'decision_making', number: '10', title: 'Education Decisions' }],
      'parent_communication': [{ type: 'communication', number: '16', title: 'Communication Guidelines' }],
      'child_communication': [{ type: 'communication', number: '16', title: 'Communication Guidelines' }],
      'travel': [{ type: 'schedule', number: '6', title: 'Vacation Time' }],
      'relocation': [{ type: 'legal', number: '18', title: 'Modification Process' }],
      'dispute_resolution': [{ type: 'legal', number: '17', title: 'Dispute Resolution' }],
      'other_provisions': [{ type: 'decision_making', number: '9', title: 'Decision-Making Authority' }],
      'review': [],
    } as Record<SectionKey, Array<{ type: string; number: string; title: string }>>;

    // Find all wizard keys that have this backend section in their mappings
    return (Object.entries(allMappings) as [SectionKey, typeof allMappings[SectionKey]][])
      .filter(([_, mappings]) =>
        mappings.some(mapping =>
          mapping.type === sectionType &&
          mapping.number === sectionNumber
        )
      )
      .map(([key]) => key);
  };

  const loadAgreement = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await agreementsAPI.get(agreementId);

      setAgreement(data.agreement);
      setSections(data.sections);

      // Load existing section data into state
      // Map backend template sections to wizard sections
      const dataMap: Record<string, any> = {};

      data.sections.forEach((section) => {
        // Parse structured_data if it exists, otherwise try to parse content
        let sectionContent = section.structured_data;
        if (!sectionContent && section.content) {
          try {
            sectionContent = JSON.parse(section.content);
          } catch {
            sectionContent = { content: section.content };
          }
        }

        // Find all wizard keys that map to this backend section
        const wizardKeys = getWizardKeysForBackendSection(section.section_type, section.section_number);

        // For each wizard key, extract its specific data from the merged structure
        wizardKeys.forEach(key => {
          // If the backend data has the wizard key as a property, use that
          // This handles merged sections (parent_info, other_parent_info, children_info all in basic_info)
          if (sectionContent && typeof sectionContent === 'object' && key in sectionContent) {
            dataMap[key] = sectionContent[key];
          } else {
            // Otherwise use the entire section content (for non-merged sections)
            dataMap[key] = sectionContent;
          }
        });
      });

      setSectionData(dataMap);
    } catch (err: any) {
      console.error('Failed to load agreement:', err);
      setError(err.message || 'Failed to load agreement');
    } finally {
      setIsLoading(false);
    }
  };

  // Map frontend wizard sections to backend template section types
  // Returns an array because some wizard sections need to update multiple backend sections
  const getSectionMappings = (wizardKey: SectionKey): Array<{ type: string; number: string; title: string }> => {
    const mappings: Record<SectionKey, Array<{ type: string; number: string; title: string }>> = {
      'intro': [], // No backend equivalent - skip
      'parent_info': [{ type: 'basic_info', number: '1', title: 'Basic Information' }],
      'other_parent_info': [{ type: 'basic_info', number: '1', title: 'Basic Information' }],
      'children_info': [{ type: 'basic_info', number: '1', title: 'Basic Information' }],
      'legal_custody': [{ type: 'custody', number: '2', title: 'Legal Custody' }],
      'physical_custody': [{ type: 'custody', number: '3', title: 'Physical Custody' }],
      'parenting_schedule': [{ type: 'schedule', number: '4', title: 'Parenting Time Schedule' }],
      'holiday_schedule': [{ type: 'schedule', number: '5', title: 'Holiday Schedule' }],
      'exchange_logistics': [{ type: 'logistics', number: '8', title: 'Transportation' }],
      'transportation': [{ type: 'logistics', number: '8', title: 'Transportation' }],
      // Child support wizard section covers BOTH backend financial sections
      'child_support': [
        { type: 'financial', number: '14', title: 'Child Support' },
        { type: 'financial', number: '15', title: 'Expense Sharing' }
      ],
      'medical_healthcare': [{ type: 'decision_making', number: '11', title: 'Healthcare Decisions' }],
      'education': [{ type: 'decision_making', number: '10', title: 'Education Decisions' }],
      'parent_communication': [{ type: 'communication', number: '16', title: 'Communication Guidelines' }],
      'child_communication': [{ type: 'communication', number: '16', title: 'Communication Guidelines' }],
      'travel': [{ type: 'schedule', number: '6', title: 'Vacation Time' }],
      'relocation': [{ type: 'legal', number: '18', title: 'Modification Process' }],
      'dispute_resolution': [{ type: 'legal', number: '17', title: 'Dispute Resolution' }],
      'other_provisions': [{ type: 'decision_making', number: '9', title: 'Decision-Making Authority' }],
      'review': [], // No backend equivalent - skip
    };

    return mappings[wizardKey] || [];
  };

  const handleSaveSection = async (data: any) => {
    try {
      setIsSaving(true);
      setError(null);

      const currentSection = SECTIONS[currentSectionIndex];
      const sectionKey = currentSection.key;

      // Get backend mappings for this wizard section (can be multiple)
      const backendMappings = getSectionMappings(sectionKey);

      // Skip sections that don't map to backend (intro, review)
      if (backendMappings.length === 0) {
        // Just store locally for UI purposes
        setSectionData((prev) => ({
          ...prev,
          [sectionKey]: data,
        }));
        setIsSaving(false);
        return;
      }

      // Update all backend sections that this wizard section maps to
      for (const backendMapping of backendMappings) {
        // Find the backend template section that matches this mapping
        const existingSection = sections.find((s) =>
          s.section_type === backendMapping.type &&
          s.section_number === backendMapping.number
        );

        if (existingSection) {
          // For sections that map to the same backend section (like basic_info),
          // we need to merge the data instead of overwriting
          let mergedData = { ...(existingSection.structured_data || {}) };

          // Store this wizard section's data under its own key
          mergedData[sectionKey] = data;

          // Update existing template section with merged data
          const updatedSection = await agreementsAPI.updateSection(agreementId, existingSection.id, {
            section_number: backendMapping.number,
            section_title: backendMapping.title,
            content: JSON.stringify(mergedData),
            structured_data: mergedData,
          });

          // Update sections array
          setSections((prev) =>
            prev.map((s) => (s.id === updatedSection.id ? updatedSection : s))
          );
        } else {
          // If template section doesn't exist, create it
          // This shouldn't happen if create_agreement() was called properly
          console.warn(`Template section not found: ${backendMapping.type} #${backendMapping.number}`);

          // Store data under wizard section key
          const sectionData = { [sectionKey]: data };

          const newSection = await agreementsAPI.createSection(
            agreementId,
            backendMapping.type,
            sectionData
          );
          setSections((prev) => [...prev, newSection]);
        }
      }

      // Update local state with wizard key for UI
      setSectionData((prev) => ({
        ...prev,
        [sectionKey]: data,
      }));
    } catch (err: any) {
      console.error('Failed to save section:', err);
      setError(err.message || 'Failed to save section');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    if (currentSectionIndex < SECTIONS.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getProgressPercentage = () => {
    return Math.round((currentSectionIndex / SECTIONS.length) * 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cg-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading agreement builder...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !agreement) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground mb-4">{error}</p>
              <Button onClick={() => router.push('/agreements')}>
                Back to Agreements
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentSection = SECTIONS[currentSectionIndex];
  const SectionComponent = currentSection.component;

  return (
    <div className="min-h-screen bg-background">
      {/* Main Navigation */}
      <Navigation />

      {/* Builder Header */}
      <header className="bg-card border-b sticky top-16 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-bold text-foreground">Agreement Builder</h1>
              <p className="text-sm text-muted-foreground">{agreement?.title}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push(`/agreements/${agreementId}`)}
            >
              Save & Exit
            </Button>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-card border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Section {currentSection.number + 1} of {SECTIONS.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {getProgressPercentage()}% Complete
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-cg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>
      </div>

      {/* Section Navigation Breadcrumb */}
      <div className="bg-card border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 text-sm overflow-x-auto">
            {SECTIONS.map((section, index) => (
              <div key={section.key} className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setCurrentSectionIndex(index)}
                  className={`px-2 py-1 rounded transition-colors ${
                    index === currentSectionIndex
                      ? 'bg-cg-primary/10 text-cg-primary font-medium'
                      : index < currentSectionIndex
                      ? 'text-cg-success hover:bg-cg-success/10'
                      : 'text-muted-foreground'
                  }`}
                  disabled={index > currentSectionIndex + 1}
                >
                  {index === currentSectionIndex && '▶ '}
                  {section.number > 0 ? `${section.number}.` : ''} {section.title}
                  {index < currentSectionIndex && ' ✓'}
                </button>
                {index < SECTIONS.length - 1 && (
                  <span className="text-border">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <SectionComponent
          data={sectionData[currentSection.key] || {}}
          onSave={handleSaveSection}
          onNext={handleNext}
          onPrevious={handlePrevious}
          isFirst={currentSectionIndex === 0}
          isLast={currentSectionIndex === SECTIONS.length - 1}
        />
      </main>
    </div>
  );
}

export default function AgreementBuilderPage() {
  return (
    <ProtectedRoute>
      <AgreementBuilderContent />
    </ProtectedRoute>
  );
}
