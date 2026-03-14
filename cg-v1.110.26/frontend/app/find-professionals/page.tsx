'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { familyFilesAPI, FirmDirectoryEntry, FirmPublicProfile, ProfessionalAccess, FamilyFile } from '@/lib/api';
import { ProfessionalCard } from '@/components/directory/ProfessionalCard';
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
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, Building2, CheckCircle, ChevronRight, FileText, RefreshCw, Search, Send, Settings, UserPlus } from 'lucide-react';

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

  // Firm invite modal
  const [selectedFirm, setSelectedFirm] = useState<FirmPublicProfile | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

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
        setSelectedFamilyFileId(familyFileIdFromUrl);
        return;
      }

      try {
        setIsLoadingFamilyFiles(true);
        const response = await familyFilesAPI.list();
        const files = response.items || [];
        setFamilyFiles(files);

        if (files.length === 1) {
          setSelectedFamilyFileId(files[0].id);
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

  const handleInviteClick = (firm: FirmDirectoryEntry) => {
    // Cast to FirmPublicProfile for state compatibility (simplified context)
    setSelectedFirm(firm as unknown as FirmPublicProfile);
    setInviteError(null);
    setInviteSuccess(null);
  };

  const handleViewProfile = (firm: FirmDirectoryEntry) => {
    const url = `/directory/${firm.slug}${familyFileId ? `?familyFileId=${familyFileId}` : ''}`;
    router.push(url);
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
          <ChevronRight className="h-5 w-5 text-slate-600 rotate-180" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
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
          <h3 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>No firms found</h3>
          <p className="text-slate-600 font-medium">Try adjusting your search filters or check back later</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {firms.map((firm) => (
            <div key={firm.id} className="h-full">
              <ProfessionalCard
                firm={firm}
                onViewProfile={handleViewProfile}
                onInvite={familyFileId ? handleInviteClick : undefined}
              />
            </div>
          ))}
        </div>
      )}

      {/* Firm Detail Modal */}
      <Dialog open={!!selectedFirm} onOpenChange={() => setSelectedFirm(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          {selectedFirm && (
            <>
              {/* Header */}
              <div className="relative bg-gradient-to-br from-[var(--portal-primary)] via-[var(--portal-primary)]/95 to-[#1a4746] p-6">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />

                <div className="relative flex items-center gap-4">
                  <DialogTitle className="text-xl font-bold text-white flex items-center gap-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                    <UserPlus className="w-5 h-5" />
                    Confirm Invitation
                  </DialogTitle>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Simplified Invite Dialog Content */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {selectedFirm.logo_url ? (
                      <img src={selectedFirm.logo_url} alt={selectedFirm.name} className="w-10 h-10 rounded-lg object-contain bg-white p-1 border" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[var(--portal-primary)] flex items-center justify-center text-white font-bold">
                        {selectedFirm.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-slate-900">{selectedFirm.name}</h4>
                      <p className="text-xs text-slate-500">{selectedFirm.city}, {selectedFirm.state}</p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 mb-0">
                    You are about to invite this firm to your Family File.
                    They will receive an email notification request.
                  </p>

                  {familyFileId && hasExistingFirm && (
                    <div className="mt-3 flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <p><strong>Note:</strong> You already have a professional assigned. They will be replaced only if you confirm removal in settings later.</p>
                    </div>
                  )}
                </div>

                {/* Invite Feedback */}
                {inviteError && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-red-900 text-sm">Invitation Failed</h4>
                        <p className="text-xs text-red-700">{inviteError}</p>
                      </div>
                    </div>
                  </div>
                )}
                {inviteSuccess && (
                  <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-emerald-900 text-sm">Success!</h4>
                        <p className="text-xs text-emerald-700">{inviteSuccess}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Family File Selection - show when no familyFileId but user has family files */}
                {!familyFileId && familyFiles.length > 1 && (
                  <div className="bg-white border-2 border-slate-200 rounded-2xl p-4">
                    <h3 className="text-sm font-bold text-slate-900 mb-2">Select Family File</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {familyFiles.map((file) => (
                        <button
                          key={file.id}
                          onClick={() => handleFamilyFileChange(file.id)}
                          className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-[var(--portal-primary)] hover:bg-slate-50 transition-all text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-medium text-slate-900 text-sm">{file.title || 'Family File'}</div>
                              <div className="text-xs text-slate-500">
                                {file.family_file_number}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Family File Warning - show when user has no family files */}
                {!familyFileId && familyFiles.length === 0 && !isLoadingFamilyFiles && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-amber-900 text-sm">Family File Required</h4>
                        <p className="text-xs text-amber-700">
                          Please create a Family File first or go to your existing Family File and click "Invite Professional".
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="border-t border-slate-200 bg-slate-50 p-4 rounded-b-lg">
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <button
                    onClick={() => setSelectedFirm(null)}
                    className="cg-btn-secondary shadow-sm hover:shadow-md order-2 sm:order-1 text-sm py-2"
                  >
                    Cancel
                  </button>
                  {familyFileId && (
                    <button
                      onClick={handleInviteFirm}
                      disabled={isInviting || !!inviteSuccess}
                      className="cg-btn-primary flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2 text-sm py-2 px-4"
                    >
                      {isInviting ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-white/30 border-t-white" />
                          Sending...
                        </>
                      ) : inviteSuccess ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Sent!
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send Invitation
                        </>
                      )}
                    </button>
                  )}
                </div>
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
