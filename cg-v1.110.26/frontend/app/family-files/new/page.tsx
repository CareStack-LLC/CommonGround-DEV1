'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { familyFilesAPI, FamilyFileCreate } from '@/lib/api';
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
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 flex items-center justify-center shadow-md">
              <FolderHeart className="h-6 w-6 text-[var(--portal-primary)]" />
            </div>
            New Family File
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
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
        <div className="bg-card border-2 border-border rounded-2xl shadow-lg p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Basic Information</h2>
            <p className="text-sm text-muted-foreground font-medium mt-1">
              Give your Family File a name and set your role
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-sm font-medium text-foreground">Family File Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Smith Family - Emma & Jake"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground font-medium mt-1">
                A friendly name for your co-parenting arrangement
              </p>
            </div>

            <div>
              <Label htmlFor="parentARole" className="text-sm font-medium text-foreground">Your Role</Label>
              <select
                id="parentARole"
                className="w-full mt-1 rounded-lg border-2 border-border bg-card px-3 py-2 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[var(--portal-primary)] focus:border-[var(--portal-primary)]"
                value={parentARole}
                onChange={(e) => setParentARole(e.target.value)}
              >
                <option value="mother">Mother</option>
                <option value="father">Father</option>
                <option value="parent_a">Parent A</option>
                <option value="parent_b">Parent B</option>
              </select>
            </div>
          </div>
        </div>

        {/* Co-Parent Invitation */}
        <div className="bg-card border-2 border-border rounded-2xl shadow-lg p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-3" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 flex items-center justify-center shadow-md">
                <Mail className="h-5 w-5 text-[var(--portal-primary)]" />
              </div>
              Invite Co-Parent (Optional)
            </h2>
            <p className="text-sm text-muted-foreground font-medium mt-1">
              Send an invitation to your co-parent to join this Family File
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="parentBEmail" className="text-sm font-medium text-foreground">Co-Parent Email</Label>
              <Input
                id="parentBEmail"
                type="email"
                placeholder="coparent@example.com"
                value={parentBEmail}
                onChange={(e) => setParentBEmail(e.target.value)}
                className="mt-1"
              />
            </div>

            {parentBEmail && (
              <div>
                <Label htmlFor="parentBRole" className="text-sm font-medium text-foreground">Co-Parent Role</Label>
                <select
                  id="parentBRole"
                  className="w-full mt-1 rounded-lg border-2 border-border bg-card px-3 py-2 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[var(--portal-primary)] focus:border-[var(--portal-primary)]"
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
          </div>
        </div>

        {/* Location */}
        <div className="bg-card border-2 border-border rounded-2xl shadow-lg p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Jurisdiction (Optional)</h2>
            <p className="text-sm text-muted-foreground font-medium mt-1">
              State and county for legal context
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="state" className="text-sm font-medium text-foreground">State</Label>
              <select
                id="state"
                className="w-full mt-1 rounded-lg border-2 border-border bg-card px-3 py-2 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[var(--portal-primary)] focus:border-[var(--portal-primary)]"
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
              <Label htmlFor="county" className="text-sm font-medium text-foreground">County</Label>
              <Input
                id="county"
                placeholder="e.g., Los Angeles"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Children */}
        <div className="bg-card border-2 border-border rounded-2xl shadow-lg p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-3" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 flex items-center justify-center shadow-md">
                <Baby className="h-5 w-5 text-[var(--portal-primary)]" />
              </div>
              Children (Optional)
            </h2>
            <p className="text-sm text-muted-foreground font-medium mt-1">
              Add children now or later. Child profiles require both parents to approve.
            </p>
          </div>
          <div className="space-y-4">
            {children.map((child, index) => (
              <div key={index} className="p-4 border-2 border-border rounded-xl bg-muted space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground">Child {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeChild(index)}
                    className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-sm font-medium text-foreground">First Name *</Label>
                    <Input
                      placeholder="First name"
                      value={child.first_name}
                      onChange={(e) => updateChild(index, 'first_name', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-foreground">Last Name *</Label>
                    <Input
                      placeholder="Last name"
                      value={child.last_name}
                      onChange={(e) => updateChild(index, 'last_name', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-foreground">Date of Birth *</Label>
                    <Input
                      type="date"
                      value={child.date_of_birth}
                      onChange={(e) => updateChild(index, 'date_of_birth', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-foreground">Gender</Label>
                    <select
                      className="w-full mt-1 rounded-lg border-2 border-border bg-card px-3 py-2 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[var(--portal-primary)] focus:border-[var(--portal-primary)]"
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

            <button
              type="button"
              onClick={addChild}
              className="cg-btn-secondary flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <Plus className="h-4 w-4" />
              Add Child
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="cg-btn-secondary shadow-md hover:shadow-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="cg-btn-primary shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Family File'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewFamilyFilePage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-20 lg:pb-0">
        <Navigation />
        <PageContainer background="transparent">
          <NewFamilyFileContent />
        </PageContainer>
      </div>
    </ProtectedRoute>
  );
}
