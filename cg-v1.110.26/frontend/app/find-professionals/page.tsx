'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { familyFilesAPI, FirmDirectoryEntry, FirmPublicProfile, ProfessionalAccess, FamilyFile } from '@/lib/api';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import { PageContainer } from '@/components/layout';
import {
  CGCard,
  CGCardHeader,
  CGCardTitle,
  CGCardDescription,
  CGCardContent,
  CGButton,
  CGBadge,
  CGEmptyState,
} from '@/components/cg';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Building2,
  Search,
  MapPin,
  Phone,
  Mail,
  Globe,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Users,
  Shield,
  Sparkles,
  ChevronRight,
  Send,
  Settings,
  RefreshCw,
  FileText,
} from 'lucide-react';

const US_STATES = [
  { value: '', label: 'All States' },
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

const FIRM_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'law_firm', label: 'Law Firm' },
  { value: 'mediation_practice', label: 'Mediation Practice' },
  { value: 'court_services', label: 'Court Services' },
  { value: 'solo_practice', label: 'Solo Practice' },
];

function FindProfessionalsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const familyFileIdFromUrl = searchParams.get('familyFileId');

  const [firms, setFirms] = useState<FirmDirectoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // Firm detail modal
  const [selectedFirm, setSelectedFirm] = useState<FirmPublicProfile | null>(null);
  const [isLoadingFirm, setIsLoadingFirm] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);

  // Track existing professionals on the family file
  const [existingProfessionals, setExistingProfessionals] = useState<ProfessionalAccess[]>([]);
  const [hasExistingFirm, setHasExistingFirm] = useState(false);

  // Family file selection (when not provided in URL)
  const [familyFiles, setFamilyFiles] = useState<FamilyFile[]>([]);
  const [selectedFamilyFileId, setSelectedFamilyFileId] = useState<string | null>(familyFileIdFromUrl);
  const [isLoadingFamilyFiles, setIsLoadingFamilyFiles] = useState(false);

  // Derived familyFileId - prefer URL param, then selected
  const familyFileId = familyFileIdFromUrl || selectedFamilyFileId;

  // Load user's family files on mount if no familyFileId in URL
  useEffect(() => {
    const loadFamilyFiles = async () => {
      if (familyFileIdFromUrl) {
        // Already have it from URL, no need to fetch
        setSelectedFamilyFileId(familyFileIdFromUrl);
        return;
      }

      try {
        setIsLoadingFamilyFiles(true);
        const response = await familyFilesAPI.list();
        const files = response.items || [];
        setFamilyFiles(files);

        // Auto-select if user has exactly one family file
        if (files.length === 1) {
          setSelectedFamilyFileId(files[0].id);
          // Update URL to include the familyFileId
          router.replace(`/find-professionals?familyFileId=${files[0].id}`);
        }
      } catch (err) {
        console.error('Failed to load family files:', err);
      } finally {
        setIsLoadingFamilyFiles(false);
      }
    };

    loadFamilyFiles();
  }, [familyFileIdFromUrl, router]);

  useEffect(() => {
    searchFirms();
    if (familyFileId) {
      loadExistingProfessionals();
    }
  }, [familyFileId]);

  const handleFamilyFileChange = (fileId: string) => {
    setSelectedFamilyFileId(fileId);
    // Update URL with the selected family file
    router.replace(`/find-professionals?familyFileId=${fileId}`);
  };

  const loadExistingProfessionals = async () => {
    if (!familyFileId) return;
    try {
      const response = await familyFilesAPI.getProfessionalAccess(familyFileId);
      setExistingProfessionals(response.professionals || []);
      setHasExistingFirm((response.professionals || []).length > 0);
    } catch (err) {
      console.error('Failed to load existing professionals:', err);
    }
  };

  const searchFirms = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await familyFilesAPI.searchFirmDirectory({
        query: searchQuery || undefined,
        state: selectedState || undefined,
        firm_type: selectedType || undefined,
      });
      setFirms(result.items || []);
    } catch (err: any) {
      console.error('Failed to search firms:', err);
      setError(err.message || 'Failed to load firm directory');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchFirms();
  };

  const handleViewFirm = async (firmSlug: string) => {
    try {
      setIsLoadingFirm(true);
      const firmData = await familyFilesAPI.getFirmProfile(firmSlug);
      setSelectedFirm(firmData);
      setSelectedProfessionalId(null);
      setInviteSuccess(null);
      setInviteError(null);
    } catch (err: any) {
      console.error('Failed to load firm:', err);
    } finally {
      setIsLoadingFirm(false);
    }
  };

  const handleInviteFirm = async () => {
    if (!familyFileId || !selectedFirm) {
      setInviteError('Please select a family file first');
      return;
    }

    try {
      setIsInviting(true);
      setInviteError(null);
      await familyFilesAPI.inviteProfessional(familyFileId, {
        firm_id: selectedFirm.id,
        professional_id: selectedProfessionalId || undefined,
      });
      setInviteSuccess('Invitation sent successfully');
      setTimeout(() => {
        setSelectedFirm(null);
        router.push(`/family-files/${familyFileId}`);
      }, 1500);
    } catch (err: any) {
      console.error('Failed to invite firm:', err);
      setInviteError(err.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const getFirmTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      law_firm: 'Law Firm',
      mediation_practice: 'Mediation',
      court_services: 'Court Services',
      solo_practice: 'Solo Practice',
    };
    return labels[type] || type;
  };

  const getProfessionalTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      attorney: 'Attorney',
      paralegal: 'Paralegal',
      mediator: 'Mediator',
      parenting_coordinator: 'Parenting Coordinator',
      intake_coordinator: 'Intake Coordinator',
      practice_admin: 'Practice Admin',
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-14 h-14 border-3 border-[#2C5F5D]/20 border-t-[#2C5F5D] rounded-full animate-spin" />
        <p className="mt-4 text-slate-600 font-medium">Loading directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <CGButton variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </CGButton>
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-3" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
            <div className="w-10 h-10 rounded-xl bg-cg-sage-subtle flex items-center justify-center">
              <Building2 className="h-5 w-5 text-cg-sage" />
            </div>
            Find Professionals
          </h1>
          <p className="text-muted-foreground mt-1 ml-14">
            Search for attorneys, mediators, and legal professionals
          </p>
        </div>
      </div>

      {/* Search Filters */}
      <CGCard variant="elevated">
        <CGCardContent className="py-4">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <Label htmlFor="search" className="sr-only">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by firm name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 focus-visible:ring-cg-sage"
                  />
                </div>
              </div>

              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="focus:ring-cg-sage">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state.value} value={state.value || 'all'}>
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="focus:ring-cg-sage">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {FIRM_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value || 'all'}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end">
              <CGButton type="submit" variant="primary">
                <Search className="h-4 w-4 mr-2" />
                Search
              </CGButton>
            </div>
          </form>
        </CGCardContent>
      </CGCard>

      {/* Results */}
      {error ? (
        <CGCard variant="default" className="border-cg-error/30 bg-cg-error-subtle">
          <CGCardContent className="py-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-cg-error" />
              <p className="text-cg-error font-medium">{error}</p>
            </div>
          </CGCardContent>
        </CGCard>
      ) : firms.length === 0 ? (
        <CGCard variant="elevated">
          <CGCardContent className="py-12">
            <CGEmptyState
              icon={<Building2 className="h-8 w-8" />}
              title="No firms found"
              description="Try adjusting your search filters or check back later"
            />
          </CGCardContent>
        </CGCard>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {firms.map((firm) => (
            <button
              key={firm.id}
              onClick={() => handleViewFirm(firm.slug)}
              className="group text-left bg-white rounded-xl p-6 border-2 border-slate-200 hover:border-[#2C5F5D]/30 hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-start gap-4 mb-4">
                {firm.logo_url ? (
                  <img
                    src={firm.logo_url}
                    alt={firm.name}
                    className="w-14 h-14 rounded-xl object-contain bg-slate-50 p-2 border border-slate-200"
                  />
                ) : (
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: firm.primary_color || '#2C5F5D' }}
                  >
                    <Building2 className="h-7 w-7 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 truncate group-hover:text-[#2C5F5D] transition-colors" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                    {firm.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-[#2C5F5D]/10 text-[#2C5F5D] font-medium">
                      {getFirmTypeLabel(firm.firm_type)}
                    </span>
                  </div>
                </div>
              </div>

              {(firm.city || firm.state) && (
                <div className="flex items-center gap-2 mb-3 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {firm.city && `${firm.city}, `}{firm.state}
                  </span>
                </div>
              )}

              {firm.practice_areas && firm.practice_areas.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {firm.practice_areas.slice(0, 3).map((area) => (
                    <span
                      key={area}
                      className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium"
                    >
                      {area}
                    </span>
                  ))}
                  {firm.practice_areas.length > 3 && (
                    <span className="text-xs text-slate-500 py-1">
                      +{firm.practice_areas.length - 3} more
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <div className="flex items-center gap-1.5 text-sm text-slate-600">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">{firm.professional_count}</span>
                  <span>professional{firm.professional_count !== 1 ? 's' : ''}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-[#2C5F5D] group-hover:translate-x-1 transition-all duration-200" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Firm Detail Modal */}
      <Dialog open={!!selectedFirm} onOpenChange={() => setSelectedFirm(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedFirm && (
            <>
              <DialogHeader>
                <div className="bg-gradient-to-br from-[#2C5F5D]/5 via-white to-[#2C5F5D]/5 rounded-xl p-4 border border-[#2C5F5D]/10">
                  <div className="flex items-start gap-4">
                    {selectedFirm.logo_url ? (
                      <img
                        src={selectedFirm.logo_url}
                        alt={selectedFirm.name}
                        className="w-16 h-16 rounded-xl object-contain bg-white p-2 shadow-sm"
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-xl flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: selectedFirm.primary_color || '#2C5F5D' }}
                      >
                        <Building2 className="h-8 w-8 text-white" />
                      </div>
                    )}
                    <div className="flex-1">
                      <DialogTitle className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>{selectedFirm.name}</DialogTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-[#2C5F5D]/10 text-[#2C5F5D]">
                          {getFirmTypeLabel(selectedFirm.firm_type)}
                        </span>
                        {selectedFirm.city && (
                          <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                            <MapPin className="h-3.5 w-3.5" />
                            {selectedFirm.city}, {selectedFirm.state}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Description */}
                {selectedFirm.description && (
                  <p className="text-sm text-muted-foreground">{selectedFirm.description}</p>
                )}

                {/* Contact Info */}
                <div className="space-y-2">
                  {selectedFirm.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${selectedFirm.phone}`} className="text-cg-sage hover:underline">
                        {selectedFirm.phone}
                      </a>
                    </div>
                  )}
                  {selectedFirm.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${selectedFirm.email}`} className="text-cg-sage hover:underline">
                        {selectedFirm.email}
                      </a>
                    </div>
                  )}
                  {selectedFirm.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={selectedFirm.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cg-sage hover:underline"
                      >
                        {selectedFirm.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                  {(selectedFirm.address_line1 || selectedFirm.city) && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="text-foreground">
                        {selectedFirm.address_line1 && <div>{selectedFirm.address_line1}</div>}
                        {selectedFirm.address_line2 && <div>{selectedFirm.address_line2}</div>}
                        {selectedFirm.city && (
                          <div>
                            {selectedFirm.city}, {selectedFirm.state} {selectedFirm.zip_code}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Practice Areas */}
                {selectedFirm.practice_areas && selectedFirm.practice_areas.length > 0 && (
                  <div>
                    <Label className="text-sm font-semibold" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Practice Areas</Label>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedFirm.practice_areas.map((area) => (
                        <span
                          key={area}
                          className="text-xs px-2 py-1 rounded-full bg-cg-sage-subtle text-cg-sage"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Team Members */}
                {selectedFirm.professionals && selectedFirm.professionals.length > 0 && (
                  <div>
                    <Label className="text-sm font-semibold" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Team Members</Label>
                    <div className="space-y-2 mt-2">
                      {selectedFirm.professionals.map((prof) => (
                        <button
                          key={prof.id}
                          onClick={() => setSelectedProfessionalId(
                            selectedProfessionalId === prof.id ? null : prof.id
                          )}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors text-left ${
                            selectedProfessionalId === prof.id
                              ? 'border-cg-sage bg-cg-sage-subtle/50'
                              : 'border-border hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-cg-sage-subtle flex items-center justify-center">
                              <Briefcase className="h-4 w-4 text-cg-sage" />
                            </div>
                            <div>
                              <div className="font-medium text-foreground text-sm">{prof.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {getProfessionalTypeLabel(prof.professional_type)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {prof.license_verified && (
                              <span title="License Verified">
                                <Shield className="h-4 w-4 text-cg-sage" />
                              </span>
                            )}
                            {selectedProfessionalId === prof.id && (
                              <CheckCircle className="h-4 w-4 text-cg-sage" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Select a specific professional or invite the entire firm
                    </p>
                  </div>
                )}

                {/* Invite Feedback */}
                {inviteError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{inviteError}</AlertDescription>
                  </Alert>
                )}
                {inviteSuccess && (
                  <Alert className="bg-cg-sage-subtle text-cg-sage border-cg-sage/30">
                    <CheckCircle className="h-4 w-4 text-cg-sage" />
                    <AlertDescription>{inviteSuccess}</AlertDescription>
                  </Alert>
                )}

                {/* Family File Selection - show when no familyFileId but user has family files */}
                {!familyFileId && familyFiles.length > 1 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Select Family File</Label>
                    <p className="text-xs text-muted-foreground">
                      Choose which family file to invite this firm to:
                    </p>
                    <div className="space-y-2">
                      {familyFiles.map((file) => (
                        <button
                          key={file.id}
                          onClick={() => handleFamilyFileChange(file.id)}
                          className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-cg-sage-subtle flex items-center justify-center">
                              <FileText className="h-4 w-4 text-cg-sage" />
                            </div>
                            <div>
                              <div className="font-medium text-foreground text-sm">{file.title || 'Family File'}</div>
                              <div className="text-xs text-muted-foreground">
                                {file.family_file_number}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Family File Warning - show when user has no family files */}
                {!familyFileId && familyFiles.length === 0 && !isLoadingFamilyFiles && (
                  <Alert className="bg-cg-amber-subtle text-cg-amber border-cg-amber/30">
                    <AlertCircle className="h-4 w-4 text-cg-amber" />
                    <AlertDescription>
                      To invite this firm, please create a Family File first or go to your existing Family File and click "Invite Professional".
                    </AlertDescription>
                  </Alert>
                )}

                {/* Loading family files indicator */}
                {!familyFileId && isLoadingFamilyFiles && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cg-sage" />
                    Loading your family files...
                  </div>
                )}

                {/* Existing Firm Warning */}
                {familyFileId && hasExistingFirm && (
                  <Alert className="bg-cg-amber-subtle text-cg-amber border-cg-amber/30">
                    <RefreshCw className="h-4 w-4 text-cg-amber" />
                    <AlertDescription>
                      You already have a legal professional on your case. To switch firms, you'll need to remove the current professional from your{' '}
                      <button
                        onClick={() => {
                          setSelectedFirm(null);
                          router.push(`/family-files/${familyFileId}/settings`);
                        }}
                        className="underline font-medium hover:no-underline"
                      >
                        Family File Settings
                      </button>
                      .
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <DialogFooter>
                <CGButton variant="ghost" onClick={() => setSelectedFirm(null)}>
                  Close
                </CGButton>
                {familyFileId && hasExistingFirm && (
                  <CGButton
                    variant="secondary"
                    onClick={() => {
                      setSelectedFirm(null);
                      router.push(`/family-files/${familyFileId}/settings`);
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Go to Settings to Switch Firm
                  </CGButton>
                )}
                {familyFileId && !hasExistingFirm && (
                  <CGButton
                    variant="primary"
                    onClick={handleInviteFirm}
                    disabled={isInviting || !!inviteSuccess}
                  >
                    {isInviting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        {selectedProfessionalId ? 'Invite Professional' : 'Invite Firm'}
                      </>
                    )}
                  </CGButton>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function FindProfessionalsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-20 lg:pb-0">
        <Navigation />
        <PageContainer>
          <FindProfessionalsContent />
        </PageContainer>
      </div>
    </ProtectedRoute>
  );
}
