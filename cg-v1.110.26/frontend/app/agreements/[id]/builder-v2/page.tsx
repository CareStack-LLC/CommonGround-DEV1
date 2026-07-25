'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { agreementsAPI, familyFilesAPI, Agreement, AgreementSection, FamilyFileDetail, FamilyFileChild, ParentInfo } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import { CheckCircle2, Circle, ChevronRight, ChevronLeft, Info, Lightbulb, ArrowLeft, FileText, MessageCircle, AlertCircle, Plus, Trash2 } from 'lucide-react';

// V2 Section Types - 7 sections for standard, 5 for lite
type SectionKeyV2 =
  | 'parties_children'
  | 'scope_duration'
  | 'parenting_time'
  | 'logistics_transitions'
  | 'decision_communication'
  | 'expenses_financial'
  | 'modification_disputes';

interface SectionConfigV2 {
  key: SectionKeyV2;
  title: string;
  number: number;
  description: string;
  isOptional?: boolean;
}

const SECTIONS_V2_STANDARD: SectionConfigV2[] = [
  {
    key: 'parties_children',
    title: 'Parties & Children',
    number: 1,
    description: 'Identify who is covered by this agreement'
  },
  {
    key: 'scope_duration',
    title: 'Scope & Duration',
    number: 2,
    description: 'When this agreement is effective'
  },
  {
    key: 'parenting_time',
    title: 'Parenting Time',
    number: 3,
    description: 'Establish the baseline schedule'
  },
  {
    key: 'logistics_transitions',
    title: 'Logistics & Transitions',
    number: 4,
    description: 'Details for smooth custody exchanges'
  },
  {
    key: 'decision_communication',
    title: 'Decision-Making',
    number: 5,
    description: 'How decisions are made and communicated'
  },
  {
    key: 'expenses_financial',
    title: 'Expenses',
    number: 6,
    description: 'Shared expense management',
    isOptional: true
  },
  {
    key: 'modification_disputes',
    title: 'Review & Sign',
    number: 7,
    description: 'Modifications, disputes, and acknowledgment'
  },
];

interface QuickAccordSuggestion {
  id: string;
  title: string;
  description: string;
}

// Quick Accord suggestions based on completed sections
const QUICK_ACCORD_SUGGESTIONS: Record<string, QuickAccordSuggestion[]> = {
  parenting_time: [
    { id: 'holiday_schedule', title: 'Holiday Schedule', description: 'Detailed holiday arrangements' },
    { id: 'summer_vacation', title: 'Summer Vacation', description: 'Extended summer time plans' },
    { id: 'school_breaks', title: 'School Breaks', description: 'Winter and spring break schedule' },
  ],
  logistics_transitions: [
    { id: 'travel_consent', title: 'Travel Consent', description: 'Travel notification and consent procedures' },
  ],
  decision_communication: [
    { id: 'extracurricular', title: 'Extracurricular Activities', description: 'Sports, lessons, and activity commitments' },
  ],
};

function BuilderV2Content() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const agreementId = params.id as string;

  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [familyFile, setFamilyFile] = useState<FamilyFileDetail | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [sectionData, setSectionData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [showQuickAccordSuggestions, setShowQuickAccordSuggestions] = useState(false);
  const [existingSections, setExistingSections] = useState<AgreementSection[]>([]);

  const sections = SECTIONS_V2_STANDARD;

  useEffect(() => {
    loadAgreement();
  }, [agreementId]);

  // Reverse map backend types to v2 section keys
  const BACKEND_TO_V2_MAP: Record<string, string> = {
    parties: 'parties_children',
    scope: 'scope_duration',
    schedule: 'parenting_time',
    logistics: 'logistics_transitions',
    decision_making: 'decision_communication',
    financial: 'expenses_financial',
    legal: 'modification_disputes',
  };

  const loadAgreement = async () => {
    try {
      setIsLoading(true);
      const data = await agreementsAPI.get(agreementId);
      setAgreement(data.agreement);
      setExistingSections(data.sections || []);

      // Load family file data if this is a family file-based agreement
      let ff: FamilyFileDetail | null = null;
      if (data.agreement.family_file_id) {
        try {
          ff = await familyFilesAPI.get(data.agreement.family_file_id);
          setFamilyFile(ff);
        } catch (err) {
          console.error('Failed to load family file:', err);
        }
      }

      // Load existing data if any, mapping backend types to v2 keys
      const dataMap: Record<string, any> = {};
      const completed = new Set<string>();
      const sectionsArray = data.sections || [];
      sectionsArray.forEach((section: AgreementSection) => {
        if (section.structured_data) {
          const v2Key = BACKEND_TO_V2_MAP[section.section_type] || section.section_type;
          dataMap[v2Key] = section.structured_data;
          completed.add(v2Key);
        }
      });

      // Auto-populate parties_children from FamilyFile if section is empty
      if (!dataMap['parties_children'] && ff) {
        const parentAName = ff.parent_a_info
          ? `${ff.parent_a_info.first_name || ''} ${ff.parent_a_info.last_name || ''}`.trim()
          : '';
        const parentBName = ff.parent_b_info
          ? `${ff.parent_b_info.first_name || ''} ${ff.parent_b_info.last_name || ''}`.trim()
          : ff.parent_b_email || '';
        const children = (ff.children || []).map((child: FamilyFileChild) => ({
          name: `${child.first_name} ${child.last_name}`.trim(),
          date_of_birth: child.date_of_birth,
          gender: child.gender || '',
        }));

        dataMap['parties_children'] = {
          parent_a_name: parentAName,
          parent_a_role: ff.parent_a_role || 'parent_a',
          parent_b_name: parentBName,
          parent_b_role: ff.parent_b_role || 'parent_b',
          children,
          state: ff.state || '',
          county: ff.county || '',
        };
        completed.add('parties_children');
      }

      setSectionData(dataMap);
      setCompletedSections(completed);
    } catch (err: any) {
      setError(err.message || 'Failed to load agreement');
    } finally {
      setIsLoading(false);
    }
  };

  // Map v2 section keys to backend section types
  const SECTION_TYPE_MAP: Record<string, { type: string; number: string; title: string }> = {
    parties_children: { type: 'parties', number: '1', title: 'Parties & Children' },
    scope_duration: { type: 'scope', number: '2', title: 'Scope & Duration' },
    parenting_time: { type: 'schedule', number: '3', title: 'Parenting Time' },
    logistics_transitions: { type: 'logistics', number: '4', title: 'Logistics & Transitions' },
    decision_communication: { type: 'decision_making', number: '5', title: 'Decision-Making' },
    expenses_financial: { type: 'financial', number: '6', title: 'Expenses' },
    modification_disputes: { type: 'legal', number: '7', title: 'Review & Sign' },
  };

  const handleSaveSection = async (key: string, data: any) => {
    try {
      setIsSaving(true);
      setError(null);

      // Update local state
      setSectionData(prev => ({ ...prev, [key]: data }));

      // Only mark as completed if required fields are filled
      const requiredForSection = REQUIRED_FIELDS[key as SectionKeyV2] || [];
      const allFilled = requiredForSection.every(field => {
        const val = data?.[field];
        return val !== undefined && val !== null && val !== '' && val !== false;
      });
      if (allFilled) {
        setCompletedSections(prev => new Set([...prev, key]));
      } else {
        setCompletedSections(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }

      // Save to backend via API
      const sectionInfo = SECTION_TYPE_MAP[key];
      if (sectionInfo && agreementId) {
        // Check if section already exists
        const existingSection = existingSections.find(s =>
          s.section_type === sectionInfo.type || s.section_number === sectionInfo.number
        );

        if (existingSection) {
          // Update existing section
          await agreementsAPI.updateSection(agreementId, existingSection.id, {
            content: JSON.stringify(data),
            structured_data: data,
          });
        } else {
          // Create new section
          const newSection = await agreementsAPI.createSection(
            agreementId,
            sectionInfo.type,
            {
              section_number: sectionInfo.number,
              section_title: sectionInfo.title,
              structured_data: data,
            }
          );
          setExistingSections(prev => [...prev, newSection]);
        }
      }

    } catch (err: any) {
      setError(err.message || 'Failed to save section');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    // Check for Quick Accord suggestions
    const currentSection = sections[currentSectionIndex];
    const suggestions = QUICK_ACCORD_SUGGESTIONS[currentSection.key];
    if (suggestions && suggestions.length > 0) {
      setShowQuickAccordSuggestions(true);
    } else if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleContinueAfterSuggestions = () => {
    setShowQuickAccordSuggestions(false);
    if (currentSectionIndex < sections.length - 1) {
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
    return Math.round(((currentSectionIndex + 1) / sections.length) * 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="w-14 h-14 border-3 border-[var(--portal-primary)]/20 border-t-[var(--portal-primary)] rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-muted-foreground font-medium">Loading agreement builder...</p>
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
          <Card className="max-w-md border-2 border-border rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="text-destructive" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground mb-4 font-medium">{error}</p>
              <Button
                onClick={() => router.push('/agreements')}
                className="bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F] hover:opacity-90"
              >
                Back to Agreements
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentSection = sections[currentSectionIndex];
  const currentData = sectionData[currentSection.key] || {};
  const suggestions = QUICK_ACCORD_SUGGESTIONS[currentSection.key] || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b-2 border-border sticky top-16 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              <button aria-label="Back"
                onClick={() => router.push(`/agreements/${agreementId}`)}
                className="p-2.5 rounded-xl bg-card border-2 border-border hover:border-[var(--portal-primary)]/30 hover:shadow-lg transition-all duration-300"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <div className="w-12 h-12 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-2xl flex items-center justify-center shadow-md">
                <FileText className="w-5 h-5 text-[var(--portal-primary)]" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>SharedCare Agreement</h1>
                <p className="text-sm text-muted-foreground font-medium">Simple 7-Section Builder</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/agreements/${agreementId}/aria`)}
                className="border-2 border-[#FEF7ED] hover:border-[#F5A623] hover:shadow-lg transition-all duration-300 font-bold text-[#E09520] bg-[#FEF7ED]"
              >
                <MessageCircle className="w-4 h-4 mr-1.5" />
                Switch to ARIA
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/agreements/${agreementId}`)}
                className="border-2 border-border hover:border-[var(--portal-primary)]/30 hover:shadow-lg transition-all duration-300 font-bold"
              >
                Save & Exit
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-card border-b-2 border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-foreground">
              Section {currentSection.number} of {sections.length}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {getProgressPercentage()}% Complete
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5 shadow-inner">
            <div
              className="bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F] h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="bg-card border-b-2 border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            {sections.map((section, index) => (
              <button
                key={section.key}
                onClick={() => setCurrentSectionIndex(index)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap border-2 ${
                  index === currentSectionIndex
                    ? 'bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F] text-white border-transparent shadow-lg'
                    : completedSections.has(section.key)
                    ? 'bg-[#E8F4F0] text-[#2D8A70] border-[#E8F4F0] hover:shadow-md'
                    : 'text-muted-foreground border-border hover:border-[var(--portal-primary)]/30 hover:shadow-md bg-card'
                }`}
              >
                {completedSections.has(section.key) ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
                {section.number}. {section.title}
                {section.isOptional && <span className="text-xs opacity-70">(optional)</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Accord Suggestions Modal */}
        {showQuickAccordSuggestions && suggestions.length > 0 && (
          <Card className="mb-6 border-2 border-[#FEF7ED] rounded-2xl shadow-lg bg-gradient-to-br from-[#FEF7ED] to-white">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#F5A623] to-[#E09520] rounded-2xl flex items-center justify-center shadow-md">
                  <Lightbulb className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Would you like to add more detail?</CardTitle>
                  <CardDescription className="font-medium">
                    These Quick Accords can be added now or later to supplement your main agreement.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => {
                      if (agreement?.family_file_id) {
                        window.open(
                          `/family-files/${agreement.family_file_id}/quick-accord/new?category=${suggestion.id}&context=${sections[currentSectionIndex].key}`,
                          '_blank'
                        );
                      }
                    }}
                    className="w-full text-left p-4 rounded-xl border-2 border-border bg-card hover:border-[var(--portal-primary)]/30 hover:shadow-lg transition-all duration-300"
                  >
                    <h4 className="font-bold text-foreground">{suggestion.title}</h4>
                    <p className="text-sm text-muted-foreground font-medium">{suggestion.description}</p>
                    <span className="text-xs text-[var(--portal-primary)] font-semibold mt-1 inline-block">Create QuickAccord →</span>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleContinueAfterSuggestions}
                  className="flex-1 border-2 border-border hover:border-[var(--portal-primary)]/30 hover:shadow-lg font-bold transition-all duration-300"
                >
                  Skip for now
                </Button>
                <Button
                  onClick={handleContinueAfterSuggestions}
                  className="flex-1 bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F] hover:opacity-90 font-bold transition-all duration-300"
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section Content */}
        {!showQuickAccordSuggestions && (
          <Card className="border-2 border-border rounded-2xl shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F] text-white font-bold text-lg shadow-md">
                  {currentSection.number}
                </div>
                <div>
                  <CardTitle style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>{currentSection.title}</CardTitle>
                  <CardDescription className="font-medium">{currentSection.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Render section-specific form */}
              <SectionForm
                sectionKey={currentSection.key}
                data={currentData}
                onSave={(data) => handleSaveSection(currentSection.key, data)}
                isSaving={isSaving}
                familyFile={familyFile}
              />
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        {!showQuickAccordSuggestions && (
          <div className="mt-6 flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentSectionIndex === 0}
              className="border-2 border-border hover:border-[var(--portal-primary)]/30 hover:shadow-lg font-bold transition-all duration-300 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentSectionIndex < sections.length - 1 ? (
              <Button
                onClick={handleNext}
                className="bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F] hover:opacity-90 font-bold transition-all duration-300 shadow-lg"
              >
                Save & Continue
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={() => router.push(`/agreements/${agreementId}`)}
                className="bg-gradient-to-r from-[#3DAA8A] to-[#2D8A70] hover:opacity-90 font-bold transition-all duration-300 shadow-lg"
              >
                Finish Agreement
                <CheckCircle2 className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Section Form Component
// Required fields per section for inline validation
const REQUIRED_FIELDS: Record<SectionKeyV2, string[]> = {
  parties_children: [], // Pre-filled from FamilyFile, no manual required fields
  scope_duration: ['effective_date'],
  parenting_time: ['primary_residence', 'schedule_pattern'],
  logistics_transitions: ['exchange_location', 'transportation_responsibility'],
  decision_communication: ['major_decision_authority'],
  expenses_financial: [], // Optional section
  modification_disputes: ['parent_a_acknowledgment'],
};

const REQUIRED_FIELD_LABELS: Record<string, string> = {
  effective_date: 'Start date',
  primary_residence: 'Primary residence',
  schedule_pattern: 'Schedule pattern',
  exchange_location: 'Exchange location',
  transportation_responsibility: 'Transportation',
  major_decision_authority: 'Decision authority',
  parent_a_acknowledgment: 'Acknowledgment',
};

function SectionForm({
  sectionKey,
  data,
  onSave,
  isSaving,
  familyFile,
}: {
  sectionKey: SectionKeyV2;
  data: any;
  onSave: (data: any) => void;
  isSaving: boolean;
  familyFile: FamilyFileDetail | null;
}) {
  const [formData, setFormData] = useState(data);
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleChange = (field: string, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onSave(newData);
  };

  // Calculate missing required fields
  const requiredFields = REQUIRED_FIELDS[sectionKey] || [];
  const missingFields = requiredFields.filter(field => {
    const val = formData?.[field];
    return val === undefined || val === null || val === '' || val === false;
  });

  const formContent = (() => {
    switch (sectionKey) {
      case 'parties_children':
        return <PartiesChildrenForm data={formData} onChange={handleChange} familyFile={familyFile} />;
      case 'scope_duration':
        return <ScopeDurationForm data={formData} onChange={handleChange} />;
      case 'parenting_time':
        return <ParentingTimeForm data={formData} onChange={handleChange} />;
      case 'logistics_transitions':
        return <LogisticsForm data={formData} onChange={handleChange} />;
      case 'decision_communication':
        return <DecisionMakingForm data={formData} onChange={handleChange} />;
      case 'expenses_financial':
        return <ExpensesForm data={formData} onChange={handleChange} />;
      case 'modification_disputes':
        return <AcknowledgmentForm data={formData} onChange={handleChange} />;
      default:
        return <div>Section not implemented</div>;
    }
  })();

  return (
    <div>
      {formContent}

      {/* Validation indicator */}
      {missingFields.length > 0 && (
        <div className="mt-6 p-3 rounded-xl bg-[#FEF7ED] border-2 border-[#FEF7ED]">
          <p className="text-sm font-semibold text-[#E09520] flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Required fields remaining:
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {missingFields.map(field => (
              <span key={field} className="px-2.5 py-1 bg-[#FEF7ED] text-[#E09520] text-xs font-bold rounded-full">
                {REQUIRED_FIELD_LABELS[field] || field.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to format parent name
function formatParentName(info: ParentInfo | null | undefined): string {
  if (!info) return 'Not yet joined';
  const first = info.first_name || '';
  const last = info.last_name || '';
  if (first || last) {
    return `${first} ${last}`.trim();
  }
  return info.email;
}

// Helper function to format role display
function formatRole(role: string | null | undefined): string {
  if (!role) return '';
  const roleMap: Record<string, string> = {
    mother: 'Mother',
    father: 'Father',
    parent_a: 'Parent A',
    parent_b: 'Parent B',
  };
  return roleMap[role] || role;
}

// Helper function to calculate age from date of birth
function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Individual Section Forms
function PartiesChildrenForm({
  data,
  onChange,
  familyFile,
}: {
  data: any;
  onChange: (field: string, value: any) => void;
  familyFile: FamilyFileDetail | null;
}) {
  return (
    <div className="space-y-6">
      {/* Parent Information */}
      {familyFile ? (
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-gradient-to-br from-[var(--portal-primary)]/5 to-[var(--portal-primary)]/10 border-2 border-[var(--portal-primary)]/20">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
              <CheckCircle2 className="h-5 w-5 text-[#3DAA8A]" />
              Parent Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Parent A */}
              <div className="p-4 rounded-xl bg-card border-2 border-border shadow-sm">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1 font-bold">
                  {formatRole(familyFile.parent_a_role) || 'Parent A'}
                </div>
                <div className="font-bold text-foreground">
                  {formatParentName(familyFile.parent_a_info)}
                </div>
                {familyFile.parent_a_info?.email && (
                  <div className="text-sm text-muted-foreground mt-0.5 font-medium">
                    {familyFile.parent_a_info.email}
                  </div>
                )}
              </div>
              {/* Parent B */}
              <div className="p-4 rounded-xl bg-card border-2 border-border shadow-sm">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1 font-bold">
                  {formatRole(familyFile.parent_b_role) || 'Parent B'}
                </div>
                <div className="font-bold text-foreground">
                  {familyFile.parent_b_info
                    ? formatParentName(familyFile.parent_b_info)
                    : familyFile.parent_b_email
                      ? `Invited: ${familyFile.parent_b_email}`
                      : 'Not yet invited'}
                </div>
                {familyFile.parent_b_info?.email && (
                  <div className="text-sm text-muted-foreground mt-0.5 font-medium">
                    {familyFile.parent_b_info.email}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Children Information */}
          {familyFile.children && familyFile.children.length > 0 && (
            <div className="p-5 rounded-xl bg-gradient-to-br from-[var(--portal-primary)]/5 to-[var(--portal-primary)]/10 border-2 border-[var(--portal-primary)]/20">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                <CheckCircle2 className="h-5 w-5 text-[#3DAA8A]" />
                Children ({familyFile.children.length})
              </h3>
              <div className="space-y-3">
                {familyFile.children.map((child) => (
                  <div key={child.id} className="p-4 rounded-xl bg-card border-2 border-border shadow-sm flex items-center justify-between">
                    <div>
                      <div className="font-bold text-foreground">
                        {child.first_name} {child.last_name}
                        {child.preferred_name && (
                          <span className="text-muted-foreground ml-1 font-medium">
                            ("{child.preferred_name}")
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground font-medium">
                        {calculateAge(child.date_of_birth)} years old
                        {child.gender && ` • ${child.gender}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-muted border-2 border-border">
            <p className="text-sm text-muted-foreground flex items-center gap-2 font-medium">
              <Info className="h-4 w-4 text-[var(--portal-primary)]" />
              This information is pulled from your Family File. To update parent or child details, visit your Family File settings.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-muted border-2 border-border">
          <p className="text-sm text-muted-foreground flex items-center gap-2 font-medium">
            <Info className="h-4 w-4 text-[var(--portal-primary)]" />
            Loading family information...
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="current_arrangements" className="font-bold">Current Living Arrangements</Label>
          <Textarea
            id="current_arrangements"
            placeholder="Describe the current custody situation..."
            value={data.current_arrangements || ''}
            onChange={(e) => onChange('current_arrangements', e.target.value)}
            className="mt-2 border-2 border-border rounded-xl focus:border-[var(--portal-primary)] focus:ring-[var(--portal-primary)]"
          />
        </div>
      </div>
    </div>
  );
}

function ScopeDurationForm({ data, onChange }: { data: any; onChange: (field: string, value: any) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="effective_date" className="font-bold">When should this agreement start?</Label>
        <Input
          id="effective_date"
          type="date"
          value={data.effective_date || ''}
          onChange={(e) => onChange('effective_date', e.target.value)}
          className="mt-2 max-w-xs border-2 border-border rounded-xl focus:border-[var(--portal-primary)] focus:ring-[var(--portal-primary)]"
        />
      </div>

      <div>
        <Label className="font-bold">How long should this agreement last?</Label>
        <RadioGroup
          value={data.duration_type || 'indefinite'}
          onValueChange={(value) => onChange('duration_type', value)}
          className="mt-3 space-y-3"
        >
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="indefinite" id="indefinite" />
            <Label htmlFor="indefinite" className="font-medium cursor-pointer">Until modified by both parents</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="until_child_18" id="until_child_18" />
            <Label htmlFor="until_child_18" className="font-medium cursor-pointer">Until child(ren) turn 18</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="fixed_term" id="fixed_term" />
            <Label htmlFor="fixed_term" className="font-medium cursor-pointer">For a specific period</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label className="font-bold">How often should you review this agreement?</Label>
        <RadioGroup
          value={data.review_schedule || 'annual'}
          onValueChange={(value) => onChange('review_schedule', value)}
          className="mt-3 space-y-3"
        >
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="annual" id="annual" />
            <Label htmlFor="annual" className="font-medium cursor-pointer">Annually</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="every_6_months" id="every_6_months" />
            <Label htmlFor="every_6_months" className="font-medium cursor-pointer">Every 6 months</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="as_needed" id="as_needed" />
            <Label htmlFor="as_needed" className="font-medium cursor-pointer">As needed</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}

function ParentingTimeForm({ data, onChange }: { data: any; onChange: (field: string, value: any) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <Label className="font-bold">Where will the child(ren) primarily live?</Label>
        <RadioGroup
          value={data.primary_residence || ''}
          onValueChange={(value) => onChange('primary_residence', value)}
          className="mt-3 space-y-3"
        >
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="equal" id="equal" />
            <Label htmlFor="equal" className="font-medium cursor-pointer">Equal time with both parents (50/50)</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="parent_a" id="parent_a" />
            <Label htmlFor="parent_a" className="font-medium cursor-pointer">Primarily with me</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="parent_b" id="parent_b" />
            <Label htmlFor="parent_b" className="font-medium cursor-pointer">Primarily with other parent</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label className="font-bold">What schedule pattern works best?</Label>
        <RadioGroup
          value={data.schedule_pattern || ''}
          onValueChange={(value) => onChange('schedule_pattern', value)}
          className="mt-3 space-y-3"
        >
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="week_on_week_off" id="week_on_week_off" />
            <Label htmlFor="week_on_week_off" className="font-medium cursor-pointer">Week-on, week-off</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="2-2-3" id="2-2-3" />
            <Label htmlFor="2-2-3" className="font-medium cursor-pointer">2-2-3 rotation</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="every_other_weekend" id="every_other_weekend" />
            <Label htmlFor="every_other_weekend" className="font-medium cursor-pointer">Every other weekend + one weeknight</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="custom" id="custom" />
            <Label htmlFor="custom" className="font-medium cursor-pointer">Custom arrangement</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="transition_day" className="font-bold">Transition day</Label>
          <select
            id="transition_day"
            value={data.transition_day || ''}
            onChange={(e) => onChange('transition_day', e.target.value)}
            className="mt-2 w-full rounded-xl border-2 border-border bg-card px-4 py-2.5 text-sm font-medium focus:border-[var(--portal-primary)] focus:ring-[var(--portal-primary)] focus:outline-none transition-colors"
          >
            <option value="">Select day...</option>
            <option value="Sunday">Sunday</option>
            <option value="Monday">Monday</option>
            <option value="Tuesday">Tuesday</option>
            <option value="Wednesday">Wednesday</option>
            <option value="Thursday">Thursday</option>
            <option value="Friday">Friday</option>
            <option value="Saturday">Saturday</option>
          </select>
        </div>
        <div>
          <Label htmlFor="transition_time" className="font-bold">Transition time</Label>
          <Input
            id="transition_time"
            type="time"
            value={data.transition_time || ''}
            onChange={(e) => onChange('transition_time', e.target.value)}
            className="mt-2 border-2 border-border rounded-xl focus:border-[var(--portal-primary)] focus:ring-[var(--portal-primary)]"
          />
        </div>
      </div>

      {/* Holiday Schedule */}
      <div className="border-t-2 border-border pt-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Label className="font-bold text-base">Holiday Schedule</Label>
            <p className="text-sm text-muted-foreground mt-1">How will major holidays be handled?</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const holidays = [...(data.holiday_schedule || []), { holiday_name: '', arrangement: 'alternate_yearly', start_time: '', end_time: '', notes: '' }];
              onChange('holiday_schedule', holidays);
            }}
            className="border-2 border-[#FEF7ED] hover:border-[#F5A623] text-[#E09520] bg-[#FEF7ED]"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Holiday
          </Button>
        </div>
        {(data.holiday_schedule || []).map((holiday: any, idx: number) => (
          <div key={idx} className="p-4 rounded-xl border-2 border-border bg-card mb-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-muted-foreground">Holiday {idx + 1}</span>
              <button aria-label="Delete"
                type="button"
                onClick={() => {
                  const holidays = [...(data.holiday_schedule || [])];
                  holidays.splice(idx, 1);
                  onChange('holiday_schedule', holidays);
                }}
                className="text-[#E06B6B] hover:text-[#C53030] transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Holiday name</Label>
                <select
                  value={holiday.holiday_name || ''}
                  onChange={(e) => {
                    const holidays = [...(data.holiday_schedule || [])];
                    holidays[idx] = { ...holidays[idx], holiday_name: e.target.value };
                    onChange('holiday_schedule', holidays);
                  }}
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-[var(--portal-primary)] focus:outline-none"
                >
                  <option value="">Select holiday...</option>
                  <option value="Thanksgiving">Thanksgiving</option>
                  <option value="Christmas">Christmas</option>
                  <option value="Christmas Eve">Christmas Eve</option>
                  <option value="New Year">New Year</option>
                  <option value="Easter">Easter</option>
                  <option value="Spring Break">Spring Break</option>
                  <option value="Summer Break">Summer Break</option>
                  <option value="Fourth of July">Fourth of July</option>
                  <option value="Labor Day">Labor Day</option>
                  <option value="Memorial Day">Memorial Day</option>
                  <option value="Halloween">Halloween</option>
                  <option value="Mother's Day">Mother&apos;s Day</option>
                  <option value="Father's Day">Father&apos;s Day</option>
                  <option value="Winter Break">Winter Break</option>
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium">Arrangement</Label>
                <select
                  value={holiday.arrangement || 'alternate_yearly'}
                  onChange={(e) => {
                    const holidays = [...(data.holiday_schedule || [])];
                    holidays[idx] = { ...holidays[idx], arrangement: e.target.value };
                    onChange('holiday_schedule', holidays);
                  }}
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-[var(--portal-primary)] focus:outline-none"
                >
                  <option value="alternate_yearly">Alternate yearly</option>
                  <option value="parent_a_even_years">I get even years</option>
                  <option value="parent_b_even_years">Other parent gets even years</option>
                  <option value="split_day">Split the day</option>
                  <option value="always_parent_a">Always with me</option>
                  <option value="always_parent_b">Always with other parent</option>
                </select>
              </div>
            </div>
            <div className="mt-2">
              <Label className="text-xs font-medium">Notes (optional)</Label>
              <Input
                value={holiday.notes || ''}
                placeholder="e.g., Pickup at 6 PM day before"
                onChange={(e) => {
                  const holidays = [...(data.holiday_schedule || [])];
                  holidays[idx] = { ...holidays[idx], notes: e.target.value };
                  onChange('holiday_schedule', holidays);
                }}
                className="mt-1 border border-border rounded-lg text-sm"
              />
            </div>
          </div>
        ))}
        {(!data.holiday_schedule || data.holiday_schedule.length === 0) && (
          <p className="text-sm text-muted-foreground italic">No holidays added yet. Click &quot;Add Holiday&quot; to specify holiday arrangements.</p>
        )}
      </div>

      {/* Recurring Activities */}
      <div className="border-t-2 border-border pt-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Label className="font-bold text-base">Recurring Activities</Label>
            <p className="text-sm text-muted-foreground mt-1">Regular activities like sports, lessons, or therapy</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const activities = [...(data.recurring_activities || []), { activity_name: '', day_of_week: '', time: '', end_time: '', location: '', responsible_parent: 'during_own_time', cost_per_session: '', cost_frequency: '' }];
              onChange('recurring_activities', activities);
            }}
            className="border-2 border-[#FEF7ED] hover:border-[#F5A623] text-[#E09520] bg-[#FEF7ED]"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Activity
          </Button>
        </div>
        {(data.recurring_activities || []).map((activity: any, idx: number) => (
          <div key={idx} className="p-4 rounded-xl border-2 border-border bg-card mb-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-muted-foreground">Activity {idx + 1}</span>
              <button aria-label="Delete"
                type="button"
                onClick={() => {
                  const activities = [...(data.recurring_activities || [])];
                  activities.splice(idx, 1);
                  onChange('recurring_activities', activities);
                }}
                className="text-[#E06B6B] hover:text-[#C53030] transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Activity name</Label>
                <Input
                  value={activity.activity_name || ''}
                  placeholder="e.g., Soccer practice"
                  onChange={(e) => {
                    const activities = [...(data.recurring_activities || [])];
                    activities[idx] = { ...activities[idx], activity_name: e.target.value };
                    onChange('recurring_activities', activities);
                  }}
                  className="mt-1 border border-border rounded-lg text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Day of week</Label>
                <select
                  value={activity.day_of_week || ''}
                  onChange={(e) => {
                    const activities = [...(data.recurring_activities || [])];
                    activities[idx] = { ...activities[idx], day_of_week: e.target.value };
                    onChange('recurring_activities', activities);
                  }}
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-[var(--portal-primary)] focus:outline-none"
                >
                  <option value="">Select day...</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div>
                <Label className="text-xs font-medium">Start time</Label>
                <Input
                  type="time"
                  value={activity.time || ''}
                  onChange={(e) => {
                    const activities = [...(data.recurring_activities || [])];
                    activities[idx] = { ...activities[idx], time: e.target.value };
                    onChange('recurring_activities', activities);
                  }}
                  className="mt-1 border border-border rounded-lg text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">End time</Label>
                <Input
                  type="time"
                  value={activity.end_time || ''}
                  onChange={(e) => {
                    const activities = [...(data.recurring_activities || [])];
                    activities[idx] = { ...activities[idx], end_time: e.target.value };
                    onChange('recurring_activities', activities);
                  }}
                  className="mt-1 border border-border rounded-lg text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Who takes them?</Label>
                <select
                  value={activity.responsible_parent || 'during_own_time'}
                  onChange={(e) => {
                    const activities = [...(data.recurring_activities || [])];
                    activities[idx] = { ...activities[idx], responsible_parent: e.target.value };
                    onChange('recurring_activities', activities);
                  }}
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-[var(--portal-primary)] focus:outline-none"
                >
                  <option value="during_own_time">Whoever has them</option>
                  <option value="parent_a">I always take them</option>
                  <option value="parent_b">Other parent always takes them</option>
                  <option value="alternating">We alternate</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div>
                <Label className="text-xs font-medium">Location (optional)</Label>
                <Input
                  value={activity.location || ''}
                  placeholder="e.g., Lincoln Elementary"
                  onChange={(e) => {
                    const activities = [...(data.recurring_activities || [])];
                    activities[idx] = { ...activities[idx], location: e.target.value };
                    onChange('recurring_activities', activities);
                  }}
                  className="mt-1 border border-border rounded-lg text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Cost per session ($)</Label>
                <Input
                  type="number"
                  value={activity.cost_per_session || ''}
                  placeholder="0"
                  onChange={(e) => {
                    const activities = [...(data.recurring_activities || [])];
                    activities[idx] = { ...activities[idx], cost_per_session: e.target.value ? parseFloat(e.target.value) : '' };
                    onChange('recurring_activities', activities);
                  }}
                  className="mt-1 border border-border rounded-lg text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Cost frequency</Label>
                <select
                  value={activity.cost_frequency || ''}
                  onChange={(e) => {
                    const activities = [...(data.recurring_activities || [])];
                    activities[idx] = { ...activities[idx], cost_frequency: e.target.value };
                    onChange('recurring_activities', activities);
                  }}
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-[var(--portal-primary)] focus:outline-none"
                >
                  <option value="">Select...</option>
                  <option value="per_session">Per session</option>
                  <option value="monthly">Monthly</option>
                  <option value="semester">Per semester</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
            </div>
          </div>
        ))}
        {(!data.recurring_activities || data.recurring_activities.length === 0) && (
          <p className="text-sm text-muted-foreground italic">No activities added yet. Click &quot;Add Activity&quot; for sports, lessons, therapy, etc.</p>
        )}
      </div>
    </div>
  );
}

function LogisticsForm({ data, onChange }: { data: any; onChange: (field: string, value: any) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <Label className="font-bold">Where will exchanges happen?</Label>
        <RadioGroup
          value={data.exchange_location || ''}
          onValueChange={(value) => onChange('exchange_location', value)}
          className="mt-3 space-y-3"
        >
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="school" id="school" />
            <Label htmlFor="school" className="font-medium cursor-pointer">At school (pickup/dropoff)</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="parent_a_home" id="parent_a_home" />
            <Label htmlFor="parent_a_home" className="font-medium cursor-pointer">At my home</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="parent_b_home" id="parent_b_home" />
            <Label htmlFor="parent_b_home" className="font-medium cursor-pointer">At other parent's home</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="neutral_location" id="neutral_location" />
            <Label htmlFor="neutral_location" className="font-medium cursor-pointer">Neutral location</Label>
          </div>
        </RadioGroup>
      </div>

      {data.exchange_location === 'neutral_location' && (
        <div>
          <Label htmlFor="exchange_address" className="font-bold">Exchange location address</Label>
          <Input
            id="exchange_address"
            placeholder="Address of neutral location..."
            value={data.exchange_location_address || ''}
            onChange={(e) => onChange('exchange_location_address', e.target.value)}
            className="mt-2 border-2 border-border rounded-xl focus:border-[var(--portal-primary)] focus:ring-[var(--portal-primary)]"
          />
        </div>
      )}

      <div>
        <Label className="font-bold">Who handles transportation?</Label>
        <RadioGroup
          value={data.transportation_responsibility || ''}
          onValueChange={(value) => onChange('transportation_responsibility', value)}
          className="mt-3 space-y-3"
        >
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="picking_up_parent" id="picking_up_parent" />
            <Label htmlFor="picking_up_parent" className="font-medium cursor-pointer">Parent picking up handles transportation</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="dropping_off_parent" id="dropping_off_parent" />
            <Label htmlFor="dropping_off_parent" className="font-medium cursor-pointer">Parent dropping off handles transportation</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="shared" id="shared" />
            <Label htmlFor="shared" className="font-medium cursor-pointer">Meet in the middle</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label className="font-bold">Preferred communication method</Label>
        <RadioGroup
          value={data.transition_communication || 'commonground'}
          onValueChange={(value) => onChange('transition_communication', value)}
          className="mt-3 space-y-3"
        >
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="commonground" id="commonground" />
            <Label htmlFor="commonground" className="font-medium cursor-pointer">CommonGround app</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="text" id="text" />
            <Label htmlFor="text" className="font-medium cursor-pointer">Text messages</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="email" id="email" />
            <Label htmlFor="email" className="font-medium cursor-pointer">Email</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}

function DecisionMakingForm({ data, onChange }: { data: any; onChange: (field: string, value: any) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <Label className="font-bold">How will major decisions be made?</Label>
        <RadioGroup
          value={data.major_decision_authority || 'joint'}
          onValueChange={(value) => onChange('major_decision_authority', value)}
          className="mt-3 space-y-3"
        >
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="joint" id="joint" />
            <Label htmlFor="joint" className="font-medium cursor-pointer">Together (both parents must agree)</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="parent_a" id="decision_parent_a" />
            <Label htmlFor="decision_parent_a" className="font-medium cursor-pointer">I make final decisions</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="parent_b" id="decision_parent_b" />
            <Label htmlFor="decision_parent_b" className="font-medium cursor-pointer">Other parent makes final decisions</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="divided" id="divided" />
            <Label htmlFor="divided" className="font-medium cursor-pointer">Divided by category (specify below)</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label className="font-bold">How quickly should you respond to messages?</Label>
        <RadioGroup
          value={data.response_timeframe || '24_hours'}
          onValueChange={(value) => onChange('response_timeframe', value)}
          className="mt-3 space-y-3"
        >
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="same_day_urgent" id="same_day" />
            <Label htmlFor="same_day" className="font-medium cursor-pointer">Same day for urgent, 24 hours for routine</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="24_hours" id="24_hours" />
            <Label htmlFor="24_hours" className="font-medium cursor-pointer">Within 24 hours</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="48_hours" id="48_hours" />
            <Label htmlFor="48_hours" className="font-medium cursor-pointer">Within 48 hours</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}

const EXPENSE_CATEGORIES_BUILDER = [
  { key: 'medical', label: 'Medical' },
  { key: 'education', label: 'Education' },
  { key: 'sports', label: 'Sports' },
  { key: 'extracurricular', label: 'Extracurricular' },
  { key: 'childcare', label: 'Childcare' },
  { key: 'clothing', label: 'Clothing' },
  { key: 'transportation', label: 'Transportation' },
];

function ExpensesForm({ data, onChange }: { data: any; onChange: (field: string, value: any) => void }) {
  const [perCategoryEnabled, setPerCategoryEnabled] = useState(
    !!data.category_splits && Object.keys(data.category_splits).length > 0
  );

  // Parse global split ratio to a percentage for pre-filling
  const globalPct = (() => {
    const ratio = data.split_ratio || '50/50';
    if (ratio === '50/50') return 50;
    if (ratio === '60/40') return 60;
    return 50;
  })();

  const handleCategorySplitChange = (categoryKey: string, value: number) => {
    const current = data.category_splits || {};
    const updated = { ...current, [categoryKey]: value };
    onChange('category_splits', updated);
  };

  const togglePerCategory = (enabled: boolean) => {
    setPerCategoryEnabled(enabled);
    if (enabled && (!data.category_splits || Object.keys(data.category_splits).length === 0)) {
      // Pre-fill all categories from global split
      const prefilled: Record<string, number> = {};
      EXPENSE_CATEGORIES_BUILDER.forEach(cat => { prefilled[cat.key] = globalPct; });
      onChange('category_splits', prefilled);
    } else if (!enabled) {
      onChange('category_splits', null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-muted border-2 border-border">
        <p className="text-sm text-muted-foreground flex items-center gap-2 font-medium">
          <Info className="h-4 w-4 text-[var(--portal-primary)]" />
          This section covers shared expenses beyond any court-ordered child support. Use CommonGround&apos;s ClearFund to track and split expenses.
        </p>
      </div>

      <div>
        <Label className="font-bold">How will you split shared expenses?</Label>
        <RadioGroup
          value={data.split_ratio || '50/50'}
          onValueChange={(value) => onChange('split_ratio', value)}
          className="mt-3 space-y-3"
        >
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="50/50" id="50_50" />
            <Label htmlFor="50_50" className="font-medium cursor-pointer">50/50 split</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="60/40" id="60_40" />
            <Label htmlFor="60_40" className="font-medium cursor-pointer">60/40 split</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="income_based" id="income_based" />
            <Label htmlFor="income_based" className="font-medium cursor-pointer">Based on income proportions</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Per-Category Splits */}
      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
          <input
            type="checkbox"
            checked={perCategoryEnabled}
            onChange={(e) => togglePerCategory(e.target.checked)}
            className="h-5 w-5 rounded border-border accent-[var(--portal-primary)]"
          />
          <div>
            <span className="text-sm font-bold text-foreground">Different splits per category</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              e.g. Medical 50/50, Education 80/20, Sports 60/40
            </p>
          </div>
        </label>

        {perCategoryEnabled && (
          <div className="ml-1 space-y-3 p-4 rounded-xl border-2 border-[var(--portal-primary)]/20 bg-[var(--portal-primary)]/5">
            <p className="text-xs text-muted-foreground font-medium mb-1">
              Set Parent A&apos;s percentage for each category. Parent B gets the remainder.
            </p>
            {EXPENSE_CATEGORIES_BUILDER.map((cat) => {
              const val = (data.category_splits || {})[cat.key] ?? globalPct;
              return (
                <div key={cat.key} className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-foreground w-28 flex-shrink-0">{cat.label}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={val}
                    onChange={(e) => handleCategorySplitChange(cat.key, parseInt(e.target.value))}
                    className="flex-1 accent-[var(--portal-primary)]"
                  />
                  <span className="text-sm font-mono font-bold text-foreground w-20 text-right">{val}/{100 - val}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <Label className="font-bold">How quickly should reimbursements happen?</Label>
        <RadioGroup
          value={data.reimbursement_window || '30_days'}
          onValueChange={(value) => onChange('reimbursement_window', value)}
          className="mt-3 space-y-3"
        >
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="14_days" id="14_days" />
            <Label htmlFor="14_days" className="font-medium cursor-pointer">Within 14 days</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="30_days" id="30_days" />
            <Label htmlFor="30_days" className="font-medium cursor-pointer">Within 30 days</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}

function AcknowledgmentForm({ data, onChange }: { data: any; onChange: (field: string, value: any) => void }) {
  return (
    <div className="space-y-6">
      <div className="p-5 rounded-xl border-2 border-[var(--portal-primary)]/20 bg-gradient-to-br from-[var(--portal-primary)]/5 to-[var(--portal-primary)]/10">
        <h3 className="font-bold text-foreground mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Review Your Agreement</h3>
        <p className="text-sm text-muted-foreground font-medium">
          Please review all sections. Once both parents acknowledge, this agreement becomes active.
        </p>
      </div>

      <div>
        <Label className="font-bold">How will you resolve disagreements?</Label>
        <div className="mt-3 space-y-3">
          <div className="p-4 rounded-xl border-2 border-border bg-card shadow-sm">
            <div className="font-bold text-sm text-foreground">Step 1: Direct Discussion</div>
            <div className="text-sm text-muted-foreground font-medium mt-1">Try to work it out through CommonGround messaging</div>
          </div>
          <div className="p-4 rounded-xl border-2 border-border bg-card shadow-sm">
            <div className="font-bold text-sm text-foreground">Step 2: Mediation</div>
            <div className="text-sm text-muted-foreground font-medium mt-1">Use a neutral third party if needed</div>
          </div>
          <div className="p-4 rounded-xl border-2 border-border bg-card shadow-sm">
            <div className="font-bold text-sm text-foreground">Step 3: Legal Action</div>
            <div className="text-sm text-muted-foreground font-medium mt-1">Court as last resort</div>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="escalation_timeframe" className="font-bold">How long to try each step before escalating?</Label>
        <RadioGroup
          value={data.escalation_timeframe || '14_days'}
          onValueChange={(value) => onChange('escalation_timeframe', value)}
          className="mt-3 space-y-3"
        >
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="7_days" id="7_days" />
            <Label htmlFor="7_days" className="font-medium cursor-pointer">7 days</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="14_days" id="escalation_14_days" />
            <Label htmlFor="escalation_14_days" className="font-medium cursor-pointer">14 days</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-colors">
            <RadioGroupItem value="30_days" id="escalation_30_days" />
            <Label htmlFor="escalation_30_days" className="font-medium cursor-pointer">30 days</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="border-t-2 border-border pt-6">
        <div className="flex items-start gap-4 p-4 rounded-xl border-2 border-[#E8F4F0] bg-gradient-to-br from-[#E8F4F0] to-white">
          <input
            type="checkbox"
            id="acknowledgment"
            checked={data.parent_a_acknowledgment || false}
            onChange={(e) => onChange('parent_a_acknowledgment', e.target.checked)}
            className="mt-1 h-5 w-5 rounded-lg border-2 border-border text-[var(--portal-primary)] focus:ring-[var(--portal-primary)]"
          />
          <Label htmlFor="acknowledgment" className="font-medium text-sm cursor-pointer">
            I have reviewed this SharedCare Agreement and acknowledge its contents.
            I understand this is a starting point that both parents must accept,
            and that it can be modified by mutual written consent.
          </Label>
        </div>
      </div>
    </div>
  );
}

export default function BuilderV2Page() {
  return (
    <ProtectedRoute>
      <BuilderV2Content />
    </ProtectedRoute>
  );
}
