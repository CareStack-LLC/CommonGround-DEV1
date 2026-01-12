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
import { CheckCircle2, Circle, ChevronRight, ChevronLeft, Info, Lightbulb } from 'lucide-react';

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
      if (data.agreement.family_file_id) {
        try {
          const familyFileData = await familyFilesAPI.get(data.agreement.family_file_id);
          setFamilyFile(familyFileData);
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
      setCompletedSections(prev => new Set([...prev, key]));

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

  const currentSection = sections[currentSectionIndex];
  const currentData = sectionData[currentSection.key] || {};
  const suggestions = QUICK_ACCORD_SUGGESTIONS[currentSection.key] || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Header */}
      <header className="bg-card border-b sticky top-16 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-bold text-foreground">SharedCare Agreement</h1>
              <p className="text-sm text-muted-foreground">Simple 7-Section Builder</p>
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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Section {currentSection.number} of {sections.length}
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

      {/* Section Navigation */}
      <div className="bg-card border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-4 overflow-x-auto">
            {sections.map((section, index) => (
              <button
                key={section.key}
                onClick={() => setCurrentSectionIndex(index)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors whitespace-nowrap ${
                  index === currentSectionIndex
                    ? 'bg-cg-primary text-white'
                    : completedSections.has(section.key)
                    ? 'bg-cg-success/10 text-cg-success'
                    : 'text-muted-foreground hover:bg-secondary'
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
          <Card className="mb-6 border-cg-primary/30 bg-cg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-cg-primary" />
                <CardTitle className="text-lg">Would you like to add more detail?</CardTitle>
              </div>
              <CardDescription>
                These Quick Accords can be added now or later to supplement your main agreement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    className="w-full text-left p-4 rounded-lg border bg-card hover:border-cg-primary/50 transition-colors"
                  >
                    <h4 className="font-medium text-foreground">{suggestion.title}</h4>
                    <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleContinueAfterSuggestions}
                  className="flex-1"
                >
                  Skip for now
                </Button>
                <Button
                  onClick={handleContinueAfterSuggestions}
                  className="flex-1 bg-cg-primary hover:bg-cg-primary/90"
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section Content */}
        {!showQuickAccordSuggestions && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cg-primary text-white font-bold text-sm">
                  {currentSection.number}
                </div>
                <div>
                  <CardTitle>{currentSection.title}</CardTitle>
                  <CardDescription>{currentSection.description}</CardDescription>
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
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentSectionIndex < sections.length - 1 ? (
              <Button
                onClick={handleNext}
                className="bg-cg-primary hover:bg-cg-primary/90"
              >
                Save & Continue
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={() => router.push(`/agreements/${agreementId}`)}
                className="bg-cg-success hover:bg-cg-success/90"
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

  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleChange = (field: string, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onSave(newData);
  };

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
          <div className="p-4 rounded-lg bg-cg-primary/5 border border-cg-primary/20">
            <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-cg-success" />
              Parent Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Parent A */}
              <div className="p-3 rounded-lg bg-card border">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  {formatRole(familyFile.parent_a_role) || 'Parent A'}
                </div>
                <div className="font-medium text-foreground">
                  {formatParentName(familyFile.parent_a_info)}
                </div>
                {familyFile.parent_a_info?.email && (
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {familyFile.parent_a_info.email}
                  </div>
                )}
              </div>
              {/* Parent B */}
              <div className="p-3 rounded-lg bg-card border">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  {formatRole(familyFile.parent_b_role) || 'Parent B'}
                </div>
                <div className="font-medium text-foreground">
                  {familyFile.parent_b_info
                    ? formatParentName(familyFile.parent_b_info)
                    : familyFile.parent_b_email
                      ? `Invited: ${familyFile.parent_b_email}`
                      : 'Not yet invited'}
                </div>
                {familyFile.parent_b_info?.email && (
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {familyFile.parent_b_info.email}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Children Information */}
          {familyFile.children && familyFile.children.length > 0 && (
            <div className="p-4 rounded-lg bg-cg-primary/5 border border-cg-primary/20">
              <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cg-success" />
                Children ({familyFile.children.length})
              </h3>
              <div className="space-y-2">
                {familyFile.children.map((child) => (
                  <div key={child.id} className="p-3 rounded-lg bg-card border flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">
                        {child.first_name} {child.last_name}
                        {child.preferred_name && (
                          <span className="text-muted-foreground ml-1">
                            ("{child.preferred_name}")
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {calculateAge(child.date_of_birth)} years old
                        {child.gender && ` • ${child.gender}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Info className="h-4 w-4" />
              This information is pulled from your Family File. To update parent or child details, visit your Family File settings.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-muted/50 border">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Info className="h-4 w-4" />
            Loading family information...
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="current_arrangements">Current Living Arrangements</Label>
          <Textarea
            id="current_arrangements"
            placeholder="Describe the current custody situation..."
            value={data.current_arrangements || ''}
            onChange={(e) => onChange('current_arrangements', e.target.value)}
            className="mt-1.5"
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
        <Label htmlFor="effective_date">When should this agreement start?</Label>
        <Input
          id="effective_date"
          type="date"
          value={data.effective_date || ''}
          onChange={(e) => onChange('effective_date', e.target.value)}
          className="mt-1.5 max-w-xs"
        />
      </div>

      <div>
        <Label>How long should this agreement last?</Label>
        <RadioGroup
          value={data.duration_type || 'indefinite'}
          onValueChange={(value) => onChange('duration_type', value)}
          className="mt-2 space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="indefinite" id="indefinite" />
            <Label htmlFor="indefinite" className="font-normal">Until modified by both parents</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="until_child_18" id="until_child_18" />
            <Label htmlFor="until_child_18" className="font-normal">Until child(ren) turn 18</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="fixed_term" id="fixed_term" />
            <Label htmlFor="fixed_term" className="font-normal">For a specific period</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>How often should you review this agreement?</Label>
        <RadioGroup
          value={data.review_schedule || 'annual'}
          onValueChange={(value) => onChange('review_schedule', value)}
          className="mt-2 space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="annual" id="annual" />
            <Label htmlFor="annual" className="font-normal">Annually</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="every_6_months" id="every_6_months" />
            <Label htmlFor="every_6_months" className="font-normal">Every 6 months</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="as_needed" id="as_needed" />
            <Label htmlFor="as_needed" className="font-normal">As needed</Label>
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
        <Label>Where will the child(ren) primarily live?</Label>
        <RadioGroup
          value={data.primary_residence || ''}
          onValueChange={(value) => onChange('primary_residence', value)}
          className="mt-2 space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="equal" id="equal" />
            <Label htmlFor="equal" className="font-normal">Equal time with both parents (50/50)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="parent_a" id="parent_a" />
            <Label htmlFor="parent_a" className="font-normal">Primarily with me</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="parent_b" id="parent_b" />
            <Label htmlFor="parent_b" className="font-normal">Primarily with other parent</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>What schedule pattern works best?</Label>
        <RadioGroup
          value={data.schedule_pattern || ''}
          onValueChange={(value) => onChange('schedule_pattern', value)}
          className="mt-2 space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="week_on_week_off" id="week_on_week_off" />
            <Label htmlFor="week_on_week_off" className="font-normal">Week-on, week-off</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="2-2-3" id="2-2-3" />
            <Label htmlFor="2-2-3" className="font-normal">2-2-3 rotation</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="every_other_weekend" id="every_other_weekend" />
            <Label htmlFor="every_other_weekend" className="font-normal">Every other weekend + one weeknight</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="custom" id="custom" />
            <Label htmlFor="custom" className="font-normal">Custom arrangement</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="transition_day">Transition day</Label>
          <select
            id="transition_day"
            value={data.transition_day || ''}
            onChange={(e) => onChange('transition_day', e.target.value)}
            className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
          <Label htmlFor="transition_time">Transition time</Label>
          <Input
            id="transition_time"
            type="time"
            value={data.transition_time || ''}
            onChange={(e) => onChange('transition_time', e.target.value)}
            className="mt-1.5"
          />
        </div>
      </div>
    </div>
  );
}

function LogisticsForm({ data, onChange }: { data: any; onChange: (field: string, value: any) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <Label>Where will exchanges happen?</Label>
        <RadioGroup
          value={data.exchange_location || ''}
          onValueChange={(value) => onChange('exchange_location', value)}
          className="mt-2 space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="school" id="school" />
            <Label htmlFor="school" className="font-normal">At school (pickup/dropoff)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="parent_a_home" id="parent_a_home" />
            <Label htmlFor="parent_a_home" className="font-normal">At my home</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="parent_b_home" id="parent_b_home" />
            <Label htmlFor="parent_b_home" className="font-normal">At other parent's home</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="neutral_location" id="neutral_location" />
            <Label htmlFor="neutral_location" className="font-normal">Neutral location</Label>
          </div>
        </RadioGroup>
      </div>

      {data.exchange_location === 'neutral_location' && (
        <div>
          <Label htmlFor="exchange_address">Exchange location address</Label>
          <Input
            id="exchange_address"
            placeholder="Address of neutral location..."
            value={data.exchange_location_address || ''}
            onChange={(e) => onChange('exchange_location_address', e.target.value)}
            className="mt-1.5"
          />
        </div>
      )}

      <div>
        <Label>Who handles transportation?</Label>
        <RadioGroup
          value={data.transportation_responsibility || ''}
          onValueChange={(value) => onChange('transportation_responsibility', value)}
          className="mt-2 space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="picking_up_parent" id="picking_up_parent" />
            <Label htmlFor="picking_up_parent" className="font-normal">Parent picking up handles transportation</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="dropping_off_parent" id="dropping_off_parent" />
            <Label htmlFor="dropping_off_parent" className="font-normal">Parent dropping off handles transportation</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="shared" id="shared" />
            <Label htmlFor="shared" className="font-normal">Meet in the middle</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Preferred communication method</Label>
        <RadioGroup
          value={data.transition_communication || 'commonground'}
          onValueChange={(value) => onChange('transition_communication', value)}
          className="mt-2 space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="commonground" id="commonground" />
            <Label htmlFor="commonground" className="font-normal">CommonGround app</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="text" id="text" />
            <Label htmlFor="text" className="font-normal">Text messages</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="email" id="email" />
            <Label htmlFor="email" className="font-normal">Email</Label>
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
        <Label>How will major decisions be made?</Label>
        <RadioGroup
          value={data.major_decision_authority || 'joint'}
          onValueChange={(value) => onChange('major_decision_authority', value)}
          className="mt-2 space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="joint" id="joint" />
            <Label htmlFor="joint" className="font-normal">Together (both parents must agree)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="parent_a" id="decision_parent_a" />
            <Label htmlFor="decision_parent_a" className="font-normal">I make final decisions</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="parent_b" id="decision_parent_b" />
            <Label htmlFor="decision_parent_b" className="font-normal">Other parent makes final decisions</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="divided" id="divided" />
            <Label htmlFor="divided" className="font-normal">Divided by category (specify below)</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>How quickly should you respond to messages?</Label>
        <RadioGroup
          value={data.response_timeframe || '24_hours'}
          onValueChange={(value) => onChange('response_timeframe', value)}
          className="mt-2 space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="same_day_urgent" id="same_day" />
            <Label htmlFor="same_day" className="font-normal">Same day for urgent, 24 hours for routine</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="24_hours" id="24_hours" />
            <Label htmlFor="24_hours" className="font-normal">Within 24 hours</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="48_hours" id="48_hours" />
            <Label htmlFor="48_hours" className="font-normal">Within 48 hours</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}

function ExpensesForm({ data, onChange }: { data: any; onChange: (field: string, value: any) => void }) {
  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg bg-muted/50 border">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Info className="h-4 w-4" />
          This section covers shared expenses beyond any court-ordered child support. Use CommonGround's ClearFund to track and split expenses.
        </p>
      </div>

      <div>
        <Label>How will you split shared expenses?</Label>
        <RadioGroup
          value={data.split_ratio || '50/50'}
          onValueChange={(value) => onChange('split_ratio', value)}
          className="mt-2 space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="50/50" id="50_50" />
            <Label htmlFor="50_50" className="font-normal">50/50 split</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="60/40" id="60_40" />
            <Label htmlFor="60_40" className="font-normal">60/40 split</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="income_based" id="income_based" />
            <Label htmlFor="income_based" className="font-normal">Based on income proportions</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>How quickly should reimbursements happen?</Label>
        <RadioGroup
          value={data.reimbursement_window || '30_days'}
          onValueChange={(value) => onChange('reimbursement_window', value)}
          className="mt-2 space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="14_days" id="14_days" />
            <Label htmlFor="14_days" className="font-normal">Within 14 days</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="30_days" id="30_days" />
            <Label htmlFor="30_days" className="font-normal">Within 30 days</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}

function AcknowledgmentForm({ data, onChange }: { data: any; onChange: (field: string, value: any) => void }) {
  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg border bg-cg-primary/5">
        <h3 className="font-medium text-foreground mb-2">Review Your Agreement</h3>
        <p className="text-sm text-muted-foreground">
          Please review all sections. Once both parents acknowledge, this agreement becomes active.
        </p>
      </div>

      <div>
        <Label>How will you resolve disagreements?</Label>
        <div className="mt-2 space-y-2">
          <div className="p-3 rounded border bg-muted/30">
            <div className="font-medium text-sm">Step 1: Direct Discussion</div>
            <div className="text-xs text-muted-foreground">Try to work it out through CommonGround messaging</div>
          </div>
          <div className="p-3 rounded border bg-muted/30">
            <div className="font-medium text-sm">Step 2: Mediation</div>
            <div className="text-xs text-muted-foreground">Use a neutral third party if needed</div>
          </div>
          <div className="p-3 rounded border bg-muted/30">
            <div className="font-medium text-sm">Step 3: Legal Action</div>
            <div className="text-xs text-muted-foreground">Court as last resort</div>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="escalation_timeframe">How long to try each step before escalating?</Label>
        <RadioGroup
          value={data.escalation_timeframe || '14_days'}
          onValueChange={(value) => onChange('escalation_timeframe', value)}
          className="mt-2 space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="7_days" id="7_days" />
            <Label htmlFor="7_days" className="font-normal">7 days</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="14_days" id="escalation_14_days" />
            <Label htmlFor="escalation_14_days" className="font-normal">14 days</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="30_days" id="escalation_30_days" />
            <Label htmlFor="escalation_30_days" className="font-normal">30 days</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="border-t pt-6">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="acknowledgment"
            checked={data.parent_a_acknowledgment || false}
            onChange={(e) => onChange('parent_a_acknowledgment', e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="acknowledgment" className="font-normal text-sm">
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
