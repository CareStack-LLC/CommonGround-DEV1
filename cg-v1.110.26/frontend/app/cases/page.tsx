'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { casesAPI, Case } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import { PageContainer, EmptyState } from '@/components/layout';
import { Plus, MapPin, AlertCircle, Briefcase, Clock, CheckCircle, Mail, Send } from 'lucide-react';

function CasesListContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [selectedCaseForInvitation, setSelectedCaseForInvitation] = useState<Case | null>(null);
  const [invitationCode, setInvitationCode] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await casesAPI.list();
      setCases(data);
    } catch (err: any) {
      console.error('Failed to load cases:', err);
      setError(err.message || 'Failed to load cases');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!selectedCaseForInvitation || !invitationCode.trim()) {
      setAcceptError('Please enter the invitation code');
      return;
    }

    try {
      setIsAccepting(true);
      setAcceptError(null);

      await casesAPI.acceptInvitation(selectedCaseForInvitation.id, invitationCode.trim());

      // Reload cases to show updated status
      await loadCases();

      // Close modal and reset
      setShowInvitationModal(false);
      setSelectedCaseForInvitation(null);
      setInvitationCode('');

      // Show success message or navigate to case
      router.push(`/cases/${selectedCaseForInvitation.id}`);
    } catch (err: any) {
      console.error('Failed to accept invitation:', err);
      setAcceptError(err.message || 'Failed to accept invitation. Please check the code and try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  const getUserRole = (caseItem: Case): 'petitioner' | 'respondent' | null => {
    if (!user || !caseItem.participants) return null;
    const participant = caseItem.participants.find(p => p.user_id === user.id);
    return participant?.role as 'petitioner' | 'respondent' | null;
  };

  const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'secondary' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'suspended':
        return 'error';
      case 'closed':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const isParticipantActive = (caseItem: Case): boolean => {
    if (!user || !caseItem.participants) return false;
    const participant = caseItem.participants.find(p => p.user_id === user.id);
    return participant?.is_active ?? false;
  };

  // Cases I created (petitioner) that are still pending - waiting for other parent
  const sentInvitations = cases.filter(c =>
    c.status === 'pending' && getUserRole(c) === 'petitioner' && isParticipantActive(c)
  );

  // Cases I was invited to (respondent) that are pending - need to accept
  const receivedInvitations = cases.filter(c =>
    c.status === 'pending' && getUserRole(c) === 'respondent' && !isParticipantActive(c)
  );

  // Active cases (both parents have joined)
  const activeCases = cases.filter(c => c.status === 'active');

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Navigation />

      {/* Page Header */}
      <div className="border-b border-border bg-card">
        <PageContainer className="py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
                <Briefcase className="h-8 w-8 text-cg-primary" />
                My Cases
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your co-parenting cases and invitations
              </p>
            </div>
            <Link href="/cases/new">
              <Button className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Case
              </Button>
            </Link>
          </div>
        </PageContainer>
      </div>

      <PageContainer className="py-8">
        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading cases...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={loadCases}>
                  Try Again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Invitations Section - Side by Side */}
        {!isLoading && !error && (sentInvitations.length > 0 || receivedInvitations.length > 0) && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-6">Pending Invitations</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Left: Sent Invitations */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Send className="h-5 w-5 text-cg-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Invitations Sent</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Cases you created</p>
                {sentInvitations.length > 0 ? (
                  <div className="space-y-3">
                    {sentInvitations.map((caseItem) => (
                      <Card key={caseItem.id} className="border-cg-primary/20 bg-cg-primary-subtle">
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-foreground mb-1">{caseItem.case_name}</h4>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {caseItem.state}
                              </p>
                              <p className="text-xs text-cg-primary mt-1 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Waiting for other parent
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/cases/${caseItem.id}`)}
                            >
                              View
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">No sent invitations</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right: Received Invitations */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="h-5 w-5 text-cg-warning" />
                  <h3 className="text-lg font-semibold text-foreground">Invitations Received</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Enter code to join</p>
                {receivedInvitations.length > 0 ? (
                  <div className="space-y-3">
                    {receivedInvitations.map((caseItem) => (
                      <Card key={caseItem.id} className="border-cg-warning/20 bg-cg-warning-subtle">
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-foreground mb-1">{caseItem.case_name}</h4>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {caseItem.state}
                              </p>
                              <p className="text-xs text-cg-warning mt-1">Need invitation code</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedCaseForInvitation(caseItem);
                                setShowInvitationModal(true);
                                setAcceptError(null);
                              }}
                            >
                              Accept
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">No received invitations</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && cases.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <EmptyState
                icon={Briefcase}
                title="No cases yet"
                description="Create your first case to start managing your co-parenting arrangement"
                action={{
                  label: "Create Your First Case",
                  onClick: () => router.push('/cases/new')
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Active Cases */}
        {!isLoading && !error && activeCases.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-cg-success" />
              <h2 className="text-xl font-semibold text-foreground">Active Cases</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Cases where both parents have joined</p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {activeCases.map((caseItem) => (
                <Card key={caseItem.id} className="hover:shadow-lg transition-smooth cursor-pointer group" onClick={() => router.push(`/cases/${caseItem.id}`)}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl">{caseItem.case_name}</CardTitle>
                        {caseItem.case_number && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Case #{caseItem.case_number}
                          </p>
                        )}
                      </div>
                      <Badge variant={getStatusVariant(caseItem.status)}>
                        {caseItem.status}
                      </Badge>
                    </div>
                    <CardDescription className="mt-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{caseItem.state}</span>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <p>Created: {new Date(caseItem.created_at).toLocaleDateString()}</p>
                      {caseItem.updated_at !== caseItem.created_at && (
                        <p>Updated: {new Date(caseItem.updated_at).toLocaleDateString()}</p>
                      )}
                    </div>
                    <div className="mt-4 pt-4 border-t border-border">
                      <Button variant="outline" className="w-full" onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/cases/${caseItem.id}`);
                      }}>
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* All Cases Grid (Fallback - if needed) */}
        {!isLoading && !error && cases.length > 0 && sentInvitations.length === 0 && receivedInvitations.length === 0 && activeCases.length === 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cases.map((caseItem) => (
              <Card key={caseItem.id} className="hover:shadow-lg transition-smooth cursor-pointer group" onClick={() => router.push(`/cases/${caseItem.id}`)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{caseItem.case_name}</CardTitle>
                      {caseItem.case_number && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Case #{caseItem.case_number}
                        </p>
                      )}
                    </div>
                    <Badge variant={getStatusVariant(caseItem.status)}>
                      {caseItem.status}
                    </Badge>
                  </div>
                  <CardDescription className="mt-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{caseItem.state}</span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <p>Created: {new Date(caseItem.created_at).toLocaleDateString()}</p>
                    {caseItem.updated_at !== caseItem.created_at && (
                      <p>Updated: {new Date(caseItem.updated_at).toLocaleDateString()}</p>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-border">
                    <Button variant="outline" className="w-full" onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/cases/${caseItem.id}`);
                    }}>
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Invitation Modal */}
        {showInvitationModal && selectedCaseForInvitation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Accept Case Invitation</CardTitle>
                <CardDescription>
                  Enter the invitation code to join: {selectedCaseForInvitation.case_name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="invitation-code" className="block text-sm font-medium text-foreground mb-2">
                      Invitation Code
                    </label>
                    <input
                      id="invitation-code"
                      type="text"
                      value={invitationCode}
                      onChange={(e) => setInvitationCode(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAcceptInvitation();
                        }
                      }}
                      placeholder="Paste your invitation code here"
                      className="w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-cg-primary"
                      disabled={isAccepting}
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      The invitation code was sent to you by the other parent
                    </p>
                  </div>

                  {acceptError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{acceptError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowInvitationModal(false);
                        setSelectedCaseForInvitation(null);
                        setInvitationCode('');
                        setAcceptError(null);
                      }}
                      disabled={isAccepting}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAcceptInvitation}
                      disabled={isAccepting || !invitationCode.trim()}
                      className="flex-1"
                    >
                      {isAccepting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                          Accepting...
                        </>
                      ) : (
                        'Accept Invitation'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </PageContainer>
    </div>
  );
}

export default function CasesListPage() {
  return (
    <ProtectedRoute>
      <CasesListContent />
    </ProtectedRoute>
  );
}
