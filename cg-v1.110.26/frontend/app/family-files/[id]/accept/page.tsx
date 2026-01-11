'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { familyFilesAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, ArrowRight, Loader2, Home } from 'lucide-react';
import { PageContainer } from '@/components/layout';

export default function AcceptInvitationPage() {
    const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const familyFileId = params.id as string;

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState<string>('Verifying invitation...');

    useEffect(() => {
        // Wait for auth to initialize
        if (isAuthLoading) return;

        if (!isAuthenticated) {
            // Redirect to login/register if not authenticated
            const returnUrl = encodeURIComponent(`/family-files/${familyFileId}/accept`);
            router.push(`/login?returnUrl=${returnUrl}`);
            return;
        }

        acceptInvitation();
    }, [isAuthenticated, isAuthLoading, familyFileId]);

    const acceptInvitation = async () => {
        try {
            setStatus('loading');
            setMessage('Joining family file...');

            await familyFilesAPI.acceptInvitation(familyFileId);

            setStatus('success');
            setMessage('You have successfully joined the Family File!');
        } catch (err: any) {
            console.error('Failed to accept invitation:', err);
            setStatus('error');

            // Handle specific error cases
            if (err.message?.includes('already joined')) {
                setStatus('success'); // Treat as success if they're already in
                setMessage('You are already a member of this Family File.');
            } else {
                setMessage(err.message || 'Failed to accept invitation. The link may be invalid or expired.');
            }
        }
    };

    const handleContinue = () => {
        router.push(`/family-files/${familyFileId}`);
    };

    const handleDashboard = () => {
        router.push('/family-files');
    };

    if (isAuthLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        {status === 'loading' && <Loader2 className="h-6 w-6 text-primary animate-spin" />}
                        {status === 'success' && <CheckCircle className="h-6 w-6 text-green-600" />}
                        {status === 'error' && <AlertCircle className="h-6 w-6 text-destructive" />}
                    </div>
                    <CardTitle>Family File Invitation</CardTitle>
                    <CardDescription>
                        {status === 'loading' && 'Please wait while we process your invitation...'}
                        {status === 'success' && 'Welcome to the family!'}
                        {status === 'error' && 'Something went wrong'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {status === 'success' && (
                        <Alert className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="h-4 w-4 text-green-700" />
                            <AlertDescription>{message}</AlertDescription>
                        </Alert>
                    )}

                    {status === 'error' && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{message}</AlertDescription>
                        </Alert>
                    )}

                    {status === 'loading' && (
                        <div className="text-center text-muted-foreground text-sm">
                            Connecting you to your co-parenting workspace...
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                    {status === 'success' && (
                        <Button className="w-full" onClick={handleContinue}>
                            Go to Family File
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}

                    {(status === 'error' || status === 'success') && (
                        <Button variant="outline" className="w-full" onClick={handleDashboard}>
                            <Home className="mr-2 h-4 w-4" />
                            Return to Dashboard
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
