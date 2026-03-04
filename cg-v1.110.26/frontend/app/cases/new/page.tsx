'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { casesAPI, CreateCaseRequest, Child } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProtectedRoute } from '@/components/protected-route';

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
];

function CreateCaseContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  // Form data
  const [caseName, setCaseName] = useState('');
  const [state, setState] = useState('');
  const [otherParentEmail, setOtherParentEmail] = useState('');
  const [children, setChildren] = useState<Omit<Child, 'id'>[]>([
    {
      first_name: '',
      last_name: '',
      date_of_birth: '',
      gender: 'prefer_not_to_say',
    },
  ]);

  const addChild = () => {
    setChildren([
      ...children,
      {
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: 'prefer_not_to_say',
      },
    ]);
  };

  const removeChild = (index: number) => {
    setChildren(children.filter((_, i) => i !== index));
  };

  const updateChild = (index: number, field: keyof Omit<Child, 'id'>, value: string) => {
    const updated = [...children];
    updated[index] = { ...updated[index], [field]: value };
    setChildren(updated);
  };

  const validateStep1 = () => {
    if (!caseName.trim()) {
      setError('Case name is required');
      return false;
    }
    if (!state) {
      setError('Please select a state');
      return false;
    }
    if (!otherParentEmail.trim()) {
      setError('Other parent\'s email is required');
      return false;
    }
    if (otherParentEmail === user?.email) {
      setError('You cannot invite yourself');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (children.length === 0) {
      setError('At least one child is required');
      return false;
    }

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!child.first_name.trim()) {
        setError(`Child ${i + 1}: First name is required`);
        return false;
      }
      if (!child.last_name.trim()) {
        setError(`Child ${i + 1}: Last name is required`);
        return false;
      }
      if (!child.date_of_birth) {
        setError(`Child ${i + 1}: Date of birth is required`);
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    setError(null);
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setError(null);
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateStep2()) {
      return;
    }

    try {
      setIsSubmitting(true);

      const data: CreateCaseRequest = {
        case_name: caseName,
        other_parent_email: otherParentEmail,
        state,
        children: children.map((child) => ({
          first_name: child.first_name,
          last_name: child.last_name,
          date_of_birth: child.date_of_birth,
          gender: child.gender,
        })),
      };

      const newCase = await casesAPI.create(data);

      // Success! Redirect to case details
      router.push(`/cases/${newCase.id}`);
    } catch (err: any) {
      console.error('Failed to create case:', err);
      setError(err.message || 'Failed to create case. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="text-2xl font-bold text-gray-900">
              CommonGround
            </Link>
            <Link href="/cases">
              <Button variant="outline">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Cases
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Case</h1>
          <p className="mt-2 text-gray-600">
            Set up a co-parenting case and invite the other parent
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                1
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${step >= 1 ? 'text-gray-900' : 'text-gray-500'}`}>
                  Case Details
                </p>
              </div>
            </div>
            <div className={`flex-1 h-1 mx-4 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                2
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${step >= 2 ? 'text-gray-900' : 'text-gray-500'}`}>
                  Children
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Case Details */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Case Information</CardTitle>
              <CardDescription>
                Provide basic information about your co-parenting case
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="caseName">Case Name *</Label>
                <Input
                  id="caseName"
                  placeholder="e.g., Smith Family, Doe v. Doe"
                  value={caseName}
                  onChange={(e) => setCaseName(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  A descriptive name for your case
                </p>
              </div>

              <div>
                <Label htmlFor="state">State *</Label>
                <select
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a state</option>
                  {US_STATES.map((st) => (
                    <option key={st.code} value={st.code}>
                      {st.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  The state where custody arrangements will be filed
                </p>
              </div>

              <div>
                <Label htmlFor="otherParentEmail">Other Parent's Email *</Label>
                <Input
                  id="otherParentEmail"
                  type="email"
                  placeholder="parent@example.com"
                  value={otherParentEmail}
                  onChange={(e) => setOtherParentEmail(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  An invitation will be sent to this email address
                </p>
              </div>

              <div className="pt-4 flex justify-end">
                <Button onClick={handleNext} size="lg">
                  Next: Add Children
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Children */}
        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Children Information</CardTitle>
                <CardDescription>
                  Add information about the children involved in this case
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {children.map((child, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-gray-900">Child {index + 1}</h3>
                      {children.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeChild(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`firstName-${index}`}>First Name *</Label>
                        <Input
                          id={`firstName-${index}`}
                          value={child.first_name}
                          onChange={(e) => updateChild(index, 'first_name', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`lastName-${index}`}>Last Name *</Label>
                        <Input
                          id={`lastName-${index}`}
                          value={child.last_name}
                          onChange={(e) => updateChild(index, 'last_name', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`dob-${index}`}>Date of Birth *</Label>
                        <Input
                          id={`dob-${index}`}
                          type="date"
                          value={child.date_of_birth}
                          onChange={(e) => updateChild(index, 'date_of_birth', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`gender-${index}`}>Gender</Label>
                        <select
                          id={`gender-${index}`}
                          value={child.gender}
                          onChange={(e) => updateChild(index, 'gender', e.target.value)}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                          <option value="prefer_not_to_say">Prefer not to say</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addChild}
                  className="w-full"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Another Child
                </Button>

                <div className="pt-4 flex justify-between">
                  <Button type="button" variant="outline" onClick={handleBack}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                  </Button>
                  <Button type="submit" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating Case...
                      </>
                    ) : (
                      <>
                        Create Case & Send Invitation
                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        )}

        {/* Help Text */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">What happens next?</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>An invitation email will be sent to the other parent</li>
                  <li>They'll create an account and accept the invitation</li>
                  <li>Once accepted, the case becomes active</li>
                  <li>You can then create agreements and start communicating</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function CreateCasePage() {
  return (
    <ProtectedRoute>
      <CreateCaseContent />
    </ProtectedRoute>
  );
}
