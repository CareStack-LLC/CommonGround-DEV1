'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { familyFilesAPI, FamilyFileCreate } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import { PageContainer } from '@/components/layout';
import {
  FolderHeart,
  AlertCircle,
  ArrowLeft,
  Plus,
  Trash2,
  User,
  Baby,
  Mail,
} from 'lucide-react';

interface ChildInput {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  middle_name?: string;
  gender?: string;
}

function NewFamilyFileContent() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [parentARole, setParentARole] = useState('parent_a');
  const [parentBEmail, setParentBEmail] = useState('');
  const [parentBRole, setParentBRole] = useState('parent_b');
  const [state, setState] = useState('');
  const [county, setCounty] = useState('');
  const [children, setChildren] = useState<ChildInput[]>([]);

  const addChild = () => {
    setChildren([...children, { first_name: '', last_name: '', date_of_birth: '' }]);
  };

  const updateChild = (index: number, field: keyof ChildInput, value: string) => {
    const updated = [...children];
    updated[index] = { ...updated[index], [field]: value };
    setChildren(updated);
  };

  const removeChild = (index: number) => {
    setChildren(children.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please enter a title for your Family File');
      return;
    }

    try {
      setIsSubmitting(true);

      const data: FamilyFileCreate = {
        title: title.trim(),
        parent_a_role: parentARole,
        state: state || undefined,
        county: county || undefined,
        children: children.filter(c => c.first_name && c.last_name && c.date_of_birth),
      };

      if (parentBEmail.trim()) {
        data.parent_b_email = parentBEmail.trim();
        data.parent_b_role = parentBRole;
      }

      const result = await familyFilesAPI.create(data);
      router.push(`/family-files/${result.id}`);
    } catch (err: any) {
      console.error('Failed to create family file:', err);
      setError(err.message || 'Failed to create Family File');
    } finally {
      setIsSubmitting(false);
    }
  };

  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderHeart className="h-6 w-6 text-primary" />
            New Family File
          </h1>
          <p className="text-muted-foreground">
            Create a new co-parenting arrangement
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
            <CardDescription>
              Give your Family File a name and set your role
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Family File Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Smith Family - Emma & Jake"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                A friendly name for your co-parenting arrangement
              </p>
            </div>

            <div>
              <Label htmlFor="parentARole">Your Role</Label>
              <select
                id="parentARole"
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
                value={parentARole}
                onChange={(e) => setParentARole(e.target.value)}
              >
                <option value="mother">Mother</option>
                <option value="father">Father</option>
                <option value="parent_a">Parent A</option>
                <option value="parent_b">Parent B</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Co-Parent Invitation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Invite Co-Parent (Optional)
            </CardTitle>
            <CardDescription>
              Send an invitation to your co-parent to join this Family File
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="parentBEmail">Co-Parent Email</Label>
              <Input
                id="parentBEmail"
                type="email"
                placeholder="coparent@example.com"
                value={parentBEmail}
                onChange={(e) => setParentBEmail(e.target.value)}
              />
            </div>

            {parentBEmail && (
              <div>
                <Label htmlFor="parentBRole">Co-Parent Role</Label>
                <select
                  id="parentBRole"
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
                  value={parentBRole}
                  onChange={(e) => setParentBRole(e.target.value)}
                >
                  <option value="mother">Mother</option>
                  <option value="father">Father</option>
                  <option value="parent_a">Parent A</option>
                  <option value="parent_b">Parent B</option>
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Jurisdiction (Optional)</CardTitle>
            <CardDescription>
              State and county for legal context
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="state">State</Label>
              <select
                id="state"
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                <option value="">Select state...</option>
                {states.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="county">County</Label>
              <Input
                id="county"
                placeholder="e.g., Los Angeles"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Children */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Baby className="h-5 w-5" />
              Children (Optional)
            </CardTitle>
            <CardDescription>
              Add children now or later. Child profiles require both parents to approve.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {children.map((child, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Child {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeChild(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>First Name *</Label>
                    <Input
                      placeholder="First name"
                      value={child.first_name}
                      onChange={(e) => updateChild(index, 'first_name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Last Name *</Label>
                    <Input
                      placeholder="Last name"
                      value={child.last_name}
                      onChange={(e) => updateChild(index, 'last_name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Date of Birth *</Label>
                    <Input
                      type="date"
                      value={child.date_of_birth}
                      onChange={(e) => updateChild(index, 'date_of_birth', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <select
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
                      value={child.gender || ''}
                      onChange={(e) => updateChild(index, 'gender', e.target.value)}
                    >
                      <option value="">Select...</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addChild}>
              <Plus className="h-4 w-4 mr-2" />
              Add Child
            </Button>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Family File'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewFamilyFilePage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navigation />
        <PageContainer>
          <NewFamilyFileContent />
        </PageContainer>
      </div>
    </ProtectedRoute>
  );
}
