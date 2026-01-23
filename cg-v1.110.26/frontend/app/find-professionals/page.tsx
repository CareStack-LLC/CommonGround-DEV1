'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { familyFilesAPI, FirmDirectoryEntry, FirmPublicProfile, ProfessionalAccess, FamilyFile } from '@/lib/api';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import { PageContainer } from '@/components/layout';
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
        <div className="w-14 h-14 border-3 border-[var(--portal-primary)]/20 border-t-[var(--portal-primary)] rounded-full animate-spin" />
        <p className="mt-4 text-slate-600 font-medium">Loading directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors mt-1"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 flex items-center justify-center shadow-md">
              <Building2 className="h-5 w-5 text-emerald-600" />
            </div>
            Find Professionals
          </h1>
          <p className="text-slate-600 font-medium mt-1 ml-14">
            Search for attorneys, mediators, and legal professionals
          </p>
        </div>
      </div>

      {/* Search Filters */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-lg p-6">
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
              <button type="submit" className="cg-btn-primary flex items-center gap-2 shadow-md hover:shadow-lg">
                <Search className="h-4 w-4" />
                Search
              </button>
            </div>
          </form>
        </div>

      {/* Results */}
      {error ? (
        <div className="bg-white border-2 border-red-200 rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/5 flex items-center justify-center shadow-md">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-red-600 font-bold">{error}</p>
          </div>
        </div>
      ) : firms.length === 0 ? (
        <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-lg p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 flex items-center justify-center shadow-md">
            <Building2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>No firms found</h3>
          <p className="text-slate-600 font-medium">Try adjusting your search filters or check back later</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {firms.map((firm) => (
            <button
              key={firm.id}
              onClick={() => handleViewFirm(firm.slug)}
              className="group text-left bg-white rounded-xl p-6 border-2 border-slate-200 hover:border-[var(--portal-primary)]/30 hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
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
                    style={{ backgroundColor: firm.primary_color || 'var(--portal-primary)' }}
                  >
                    <Building2 className="h-7 w-7 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 truncate group-hover:text-[var(--portal-primary)] transition-colors" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                    {firm.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-[var(--portal-primary)]/10 text-[var(--portal-primary)] font-medium">
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
                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-[var(--portal-primary)] group-hover:translate-x-1 transition-all duration-200" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Firm Detail Modal */}
      <Dialog open={!!selectedFirm} onOpenChange={() => setSelectedFirm(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          {selectedFirm && (
            <>
              {/* Hero Header */}
              <div className="relative bg-gradient-to-br from-[var(--portal-primary)] via-[var(--portal-primary)]/95 to-[#1a4746] p-8 pb-6">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
                <div className="relative flex items-start gap-6">
                  {selectedFirm.logo_url ? (
                    <img
                      src={selectedFirm.logo_url}
                      alt={selectedFirm.name}
                      className="w-20 h-20 rounded-xl object-contain bg-white p-3 shadow-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl flex items-center justify-center shadow-lg bg-white/10 backdrop-blur-sm border border-white/20 flex-shrink-0">
                      <Building2 className="h-10 w-10 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                      {selectedFirm.name}
                    </DialogTitle>
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold bg-white/20 backdrop-blur-sm text-white border border-white/30">
                        {getFirmTypeLabel(selectedFirm.firm_type)}
                      </span>
                      {selectedFirm.city && (
                        <span className="inline-flex items-center gap-1.5 text-white/90">
                          <MapPin className="h-4 w-4" />
                          <span className="font-medium">{selectedFirm.city}, {selectedFirm.state}</span>
                        </span>
                      )}
                      {selectedFirm.professionals && selectedFirm.professionals.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-white/90">
                          <Users className="h-4 w-4" />
                          <span className="font-medium">{selectedFirm.professionals.length} {selectedFirm.professionals.length === 1 ? 'Professional' : 'Professionals'}</span>
                        </span>
                      )}
                    </div>
                    {selectedFirm.description && (
                      <p className="text-white/90 text-sm leading-relaxed line-clamp-2">
                        {selectedFirm.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* About Section */}
                {selectedFirm.description && (
                  <div className="bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-[var(--portal-primary)]" />
                      </div>
                      About Our Firm
                    </h3>
                    <p className="text-slate-700 leading-relaxed">{selectedFirm.description}</p>
                  </div>
                )}

                {/* Practice Areas */}
                {selectedFirm.practice_areas && selectedFirm.practice_areas.length > 0 && (
                  <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/5 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                      </div>
                      Areas of Expertise
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedFirm.practice_areas.map((area) => (
                        <div
                          key={area}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--portal-primary)]" />
                          <span className="text-sm font-medium text-slate-900">{area}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact Information */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-blue-600" />
                    </div>
                    Get in Touch
                  </h3>
                  <div className="grid gap-3">
                    {selectedFirm.phone && (
                      <a
                        href={`tel:${selectedFirm.phone}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 group-hover:border-[var(--portal-primary)] transition-colors">
                          <Phone className="h-4 w-4 text-slate-600 group-hover:text-[var(--portal-primary)]" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-slate-600 font-medium mb-0.5">Phone</div>
                          <div className="text-sm font-bold text-[var(--portal-primary)]">{selectedFirm.phone}</div>
                        </div>
                      </a>
                    )}
                    {selectedFirm.email && (
                      <a
                        href={`mailto:${selectedFirm.email}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 group-hover:border-[var(--portal-primary)] transition-colors">
                          <Mail className="h-4 w-4 text-slate-600 group-hover:text-[var(--portal-primary)]" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-slate-600 font-medium mb-0.5">Email</div>
                          <div className="text-sm font-bold text-[var(--portal-primary)] truncate">{selectedFirm.email}</div>
                        </div>
                      </a>
                    )}
                    {selectedFirm.website && (
                      <a
                        href={selectedFirm.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 group-hover:border-[var(--portal-primary)] transition-colors">
                          <Globe className="h-4 w-4 text-slate-600 group-hover:text-[var(--portal-primary)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-slate-600 font-medium mb-0.5">Website</div>
                          <div className="text-sm font-bold text-[var(--portal-primary)] truncate">
                            {selectedFirm.website.replace(/^https?:\/\//, '')}
                          </div>
                        </div>
                      </a>
                    )}
                    {(selectedFirm.address_line1 || selectedFirm.city) && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                          <MapPin className="h-4 w-4 text-slate-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-slate-600 font-medium mb-0.5">Office Location</div>
                          <div className="text-sm font-medium text-slate-900">
                            {selectedFirm.address_line1 && <div>{selectedFirm.address_line1}</div>}
                            {selectedFirm.address_line2 && <div>{selectedFirm.address_line2}</div>}
                            {selectedFirm.city && (
                              <div>
                                {selectedFirm.city}, {selectedFirm.state} {selectedFirm.zip_code}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Team Members */}
                {selectedFirm.professionals && selectedFirm.professionals.length > 0 && (
                  <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 flex items-center justify-center">
                        <Users className="h-4 w-4 text-emerald-600" />
                      </div>
                      Our Team
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Select a specific attorney or invite the entire firm to your case
                    </p>
                    <div className="space-y-3">
                      {selectedFirm.professionals.map((prof) => (
                        <button
                          key={prof.id}
                          onClick={() => setSelectedProfessionalId(
                            selectedProfessionalId === prof.id ? null : prof.id
                          )}
                          className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                            selectedProfessionalId === prof.id
                              ? 'border-[var(--portal-primary)] bg-[var(--portal-primary)]/5 shadow-md'
                              : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                            selectedProfessionalId === prof.id
                              ? 'bg-[var(--portal-primary)] text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {prof.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-900 mb-1">{prof.name}</div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                                {getProfessionalTypeLabel(prof.professional_type)}
                              </span>
                              {prof.license_verified && (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium">
                                  <Shield className="h-3 w-3" />
                                  Licensed
                                </span>
                              )}
                            </div>
                          </div>
                          {selectedProfessionalId === prof.id && (
                            <CheckCircle className="h-5 w-5 text-[var(--portal-primary)] flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Family File Selection - show when no familyFileId but user has family files */}
                {!familyFileId && familyFiles.length > 1 && (
                  <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Select Family File</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Choose which family file to invite this firm to:
                    </p>
                    <div className="space-y-2">
                      {familyFiles.map((file) => (
                        <button
                          key={file.id}
                          onClick={() => handleFamilyFileChange(file.id)}
                          className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-200 hover:border-[var(--portal-primary)] hover:bg-slate-50 transition-all text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-[var(--portal-primary)]" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{file.title || 'Family File'}</div>
                              <div className="text-xs text-slate-600 font-medium">
                                {file.family_file_number}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Family File Warning - show when user has no family files */}
                {!familyFileId && familyFiles.length === 0 && !isLoadingFamilyFiles && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-amber-900 mb-1">Family File Required</h4>
                        <p className="text-sm text-amber-700">
                          To invite this firm, please create a Family File first or go to your existing Family File and click "Invite Professional".
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading family files indicator */}
                {!familyFileId && isLoadingFamilyFiles && (
                  <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-300 border-t-[var(--portal-primary)]" />
                      <span className="text-sm text-slate-600 font-medium">Loading your family files...</span>
                    </div>
                  </div>
                )}

                {/* Existing Firm Warning */}
                {familyFileId && hasExistingFirm && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <RefreshCw className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-amber-900 mb-1">Professional Already Assigned</h4>
                        <p className="text-sm text-amber-700 mb-3">
                          You already have a legal professional on your case. To switch firms, you'll need to remove the current professional from your Family File Settings.
                        </p>
                        <button
                          onClick={() => {
                            setSelectedFirm(null);
                            router.push(`/family-files/${familyFileId}/settings`);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium text-sm transition-colors"
                        >
                          <Settings className="h-4 w-4" />
                          Go to Settings
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Invite Feedback */}
                {inviteError && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-red-900 mb-1">Invitation Failed</h4>
                        <p className="text-sm text-red-700">{inviteError}</p>
                      </div>
                    </div>
                  </div>
                )}
                {inviteSuccess && (
                  <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-emerald-900 mb-1">Success!</h4>
                        <p className="text-sm text-emerald-700">{inviteSuccess}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="border-t-2 border-slate-200 bg-slate-50 p-6">
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <button
                    onClick={() => setSelectedFirm(null)}
                    className="cg-btn-secondary shadow-md hover:shadow-lg order-2 sm:order-1"
                  >
                    Close
                  </button>
                  {familyFileId && !hasExistingFirm && (
                    <button
                      onClick={handleInviteFirm}
                      disabled={isInviting || !!inviteSuccess}
                      className="cg-btn-primary flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
                    >
                      {isInviting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                          Sending Invitation...
                        </>
                      ) : inviteSuccess ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Invitation Sent!
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          {selectedProfessionalId ? 'Invite This Attorney' : 'Invite This Firm'}
                        </>
                      )}
                    </button>
                  )}
                </div>
                {familyFileId && !hasExistingFirm && !selectedProfessionalId && (
                  <p className="text-xs text-center text-slate-600 mt-3">
                    💡 Inviting the entire firm allows any team member to work on your case
                  </p>
                )}
              </div>
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
        <PageContainer background="transparent">
          <FindProfessionalsContent />
        </PageContainer>
      </div>
    </ProtectedRoute>
  );
}
