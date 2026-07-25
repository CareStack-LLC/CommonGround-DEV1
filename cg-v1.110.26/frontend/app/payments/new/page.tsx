'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, DollarSign, Calendar, FileText, AlertCircle, Shield, Sparkles, Lock, Zap, Stethoscope, GraduationCap, Volleyball, Baby } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { casesAPI, clearfundAPI, familyFilesAPI, Case, FamilyFile, ObligationCategory, CreateObligationRequest, CategorySplitsResponse } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import { trackExpenseSubmitted } from '@/lib/analytics';

const categories: { value: ObligationCategory; label: string; description: string }[] = [
  { value: 'medical', label: 'Medical', description: 'Doctor visits, medications, therapy' },
  { value: 'education', label: 'Education', description: 'Tuition, supplies, tutoring' },
  { value: 'sports', label: 'Sports', description: 'Equipment, fees, uniforms' },
  { value: 'extracurricular', label: 'Extracurricular', description: 'Music lessons, clubs, activities' },
  { value: 'device', label: 'Device', description: 'Phone, tablet, computer' },
  { value: 'camp', label: 'Camp', description: 'Summer camp, day camp' },
  { value: 'clothing', label: 'Clothing', description: 'School clothes, seasonal items' },
  { value: 'transportation', label: 'Transportation', description: 'Travel costs, gas reimbursement' },
  { value: 'childcare', label: 'Childcare', description: 'Daycare, babysitting' },
  { value: 'child_support', label: 'Child Support', description: 'Regular support payments' },
  { value: 'other', label: 'Other', description: 'Other child-related expenses' },
];

// Quick-create templates for common expense types
interface QuickTemplate {
  label: string;
  icon: React.ElementType;
  category: ObligationCategory;
  titlePrefix: string;
  receiptRequired: boolean;
  verificationRequired: boolean;
  description: string;
}

const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    label: 'Doctor Visit',
    icon: Stethoscope,
    category: 'medical',
    titlePrefix: 'Doctor Visit — ',
    receiptRequired: true,
    verificationRequired: true,
    description: 'Medical appointment copay or bill',
  },
  {
    label: 'School Supplies',
    icon: GraduationCap,
    category: 'education',
    titlePrefix: 'School Supplies — ',
    receiptRequired: true,
    verificationRequired: true,
    description: 'Books, materials, or tuition',
  },
  {
    label: 'Sports / Activities',
    icon: Volleyball,
    category: 'sports',
    titlePrefix: 'Sports — ',
    receiptRequired: true,
    verificationRequired: true,
    description: 'Equipment, fees, or uniforms',
  },
  {
    label: 'Childcare',
    icon: Baby,
    category: 'childcare',
    titlePrefix: 'Childcare — ',
    receiptRequired: false,
    verificationRequired: true,
    description: 'Daycare, babysitting, or after-school',
  },
];

// Combined type for Cases and Family Files
interface CaseOrFamilyFile {
  id: string;
  name: string;
  type: 'case' | 'family_file';
  status: string;
}

function NewExpenseContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<CaseOrFamilyFile[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ObligationCategory>('medical');
  const [totalAmount, setTotalAmount] = useState('');
  const [petitionerPercentage, setPetitionerPercentage] = useState(50);
  const [dueDate, setDueDate] = useState('');
  const [verificationRequired, setVerificationRequired] = useState(true);
  const [receiptRequired, setReceiptRequired] = useState(false);
  const [notes, setNotes] = useState('');

  // Category splits from agreement
  const [categorySplits, setCategorySplits] = useState<CategorySplitsResponse | null>(null);
  const [splitFromAgreement, setSplitFromAgreement] = useState(false);

  // Attestation
  const [includeAttestation, setIncludeAttestation] = useState(false);
  const [attestationText, setAttestationText] = useState('');

  useEffect(() => {
    loadCasesAndFamilyFiles();
  }, []);

  // Load category splits when a family file is selected
  useEffect(() => {
    if (!selectedCaseId) return;
    const selectedItem = items.find(i => i.id === selectedCaseId);
    if (selectedItem?.type === 'family_file') {
      clearfundAPI.getCategorySplits(selectedCaseId)
        .then(splits => {
          setCategorySplits(splits);
          // Apply initial category split
          applyCategorySplit(category, splits);
        })
        .catch(() => setCategorySplits(null));
    } else {
      setCategorySplits(null);
      setSplitFromAgreement(false);
    }
  }, [selectedCaseId, items]);

  const applyCategorySplit = useCallback((cat: ObligationCategory, splits: CategorySplitsResponse | null) => {
    if (!splits || !splits.split_locked) {
      setSplitFromAgreement(false);
      return;
    }
    // Check category-specific split first, then global
    if (cat in splits.category_splits) {
      setPetitionerPercentage(splits.category_splits[cat]);
      setSplitFromAgreement(true);
    } else if (splits.global_parent_a_percentage !== null) {
      setPetitionerPercentage(splits.global_parent_a_percentage);
      setSplitFromAgreement(true);
    } else {
      setSplitFromAgreement(false);
    }
  }, []);

  const handleCategoryChange = (cat: ObligationCategory) => {
    setCategory(cat);
    applyCategorySplit(cat, categorySplits);
  };

  const loadCasesAndFamilyFiles = async () => {
    try {
      setIsLoading(true);

      // Load both Cases and Family Files in parallel
      const [casesData, familyFilesResponse] = await Promise.all([
        casesAPI.list().catch(() => [] as Case[]),
        familyFilesAPI.list().catch(() => ({ items: [] as FamilyFile[], total: 0 })),
      ]);

      // Transform Cases
      const caseItems: CaseOrFamilyFile[] = casesData
        .filter(c => c.status === 'active')
        .map(c => ({
          id: c.id,
          name: c.case_name,
          type: 'case' as const,
          status: c.status,
        }));

      // Transform Family Files
      const familyFileItems: CaseOrFamilyFile[] = familyFilesResponse.items
        .filter(ff => ff.status === 'active')
        .map(ff => ({
          id: ff.id,
          name: ff.title,
          type: 'family_file' as const,
          status: ff.status,
        }));

      // Combine both lists
      const allItems = [...caseItems, ...familyFileItems];
      setItems(allItems);

      // Auto-select first item if available
      if (allItems.length > 0) {
        setSelectedCaseId(allItems[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load cases and family files');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCaseId) {
      setError('Please select a case');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    const amount = parseFloat(totalAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const data: CreateObligationRequest = {
        case_id: selectedCaseId,
        source_type: 'request',
        purpose_category: category,
        title: title.trim(),
        description: description.trim() || undefined,
        total_amount: amount.toFixed(2),  // Send as string with 2 decimal places
        petitioner_percentage: petitionerPercentage,
        due_date: dueDate || undefined,
        verification_required: verificationRequired,
        receipt_required: receiptRequired,
        notes: notes.trim() || undefined,
        include_attestation: includeAttestation,
        attestation_text: includeAttestation ? attestationText.trim() : undefined,
      };

      const obligation = await clearfundAPI.createObligation(data);
      trackExpenseSubmitted();
      router.push(`/payments/${obligation.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    router.push('/login');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-3 border-[var(--portal-primary)]/20 border-t-[var(--portal-primary)] rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="bg-card rounded-2xl border-2 border-border shadow-lg p-8 text-center">
            <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
              <DollarSign className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>No Active Cases or Family Files</h2>
            <p className="text-muted-foreground mb-6 font-medium">
              You need an active case or family file to create expense requests.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[var(--portal-primary)] to-cg-slate text-white rounded-xl font-bold shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const respondentPercentage = 100 - petitionerPercentage;
  const amount = parseFloat(totalAmount) || 0;
  const petitionerShare = (amount * petitionerPercentage) / 100;
  const respondentShare = amount - petitionerShare;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b-2 border-border">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <button
            onClick={() => router.push('/payments')}
            className="group flex items-center text-muted-foreground hover:text-[var(--portal-primary)] mb-4 transition-all duration-300 font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform duration-300" />
            Back to Payments
          </button>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-3" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
            <div className="w-12 h-12 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-2xl flex items-center justify-center shadow-md">
              <DollarSign className="h-6 w-6 text-[var(--portal-primary)]" />
            </div>
            New Expense Request
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Create a purpose-locked financial obligation
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6 pb-32">
        {error && (
          <div className="mb-4 bg-cg-error-subtle border-2 border-cg-error-subtle text-cg-error-dark px-4 py-3 rounded-2xl flex items-center gap-2 shadow-lg">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Quick Create Templates */}
        <div className="mb-6">
          <p className="text-sm font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-cg-amber" />
            Quick Create
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {QUICK_TEMPLATES.map((tpl) => (
              <button
                key={tpl.label}
                type="button"
                onClick={() => {
                  setCategory(tpl.category);
                  setTitle(tpl.titlePrefix);
                  setReceiptRequired(tpl.receiptRequired);
                  setVerificationRequired(tpl.verificationRequired);
                  applyCategorySplit(tpl.category, categorySplits);
                }}
                className="flex flex-col items-center gap-1.5 p-3 bg-card rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/40 hover:shadow-md transition-all duration-300 group"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <tpl.icon className="h-4 w-4 text-[var(--portal-primary)]" />
                </div>
                <span className="text-xs font-bold text-foreground">{tpl.label}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-card rounded-2xl border-2 border-border shadow-lg p-6">
            <div className="space-y-6">
              {/* Case/Family File Selection */}
              {items.length > 1 && (
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                    Case / Family File
                  </label>
                  <select
                    value={selectedCaseId}
                    onChange={(e) => setSelectedCaseId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-border rounded-xl bg-card text-foreground focus:ring-2 focus:ring-[var(--portal-primary)]/20 focus:border-[var(--portal-primary)] transition-all duration-300"
                    required
                  >
                    {items.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} {item.type === 'family_file' ? '(Family File)' : '(Case)'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-foreground mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Emma's Dental Visit"
                  className="w-full px-4 py-3 border-2 border-border rounded-xl bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-[var(--portal-primary)]/20 focus:border-[var(--portal-primary)] transition-all duration-300"
                  required
                  maxLength={200}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-bold text-foreground mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  Category *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categories.map((cat) => {
                    const hasCategorySplit = categorySplits?.split_locked && cat.value in (categorySplits?.category_splits || {});
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => handleCategoryChange(cat.value)}
                        className={`p-3 rounded-xl border-2 text-left transition-all duration-300 relative ${
                          category === cat.value
                            ? 'border-[var(--portal-primary)] bg-[var(--portal-primary)]/5 shadow-md'
                            : 'border-border hover:border-[var(--portal-primary)]/30 hover:shadow-md bg-card'
                        }`}
                      >
                        <p className={`font-bold text-sm ${category === cat.value ? 'text-[var(--portal-primary)]' : 'text-foreground'}`}>{cat.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 font-medium">{cat.description}</p>
                        {hasCategorySplit && (
                          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cg-sage rounded-full" title="Custom split from agreement" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-bold text-foreground mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  Total Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 border-2 border-border rounded-xl bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-[var(--portal-primary)]/20 focus:border-[var(--portal-primary)] transition-all duration-300"
                    required
                  />
                </div>
              </div>

              {/* Split Percentage */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                    Cost Split
                  </label>
                  {splitFromAgreement && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cg-sage-subtle text-cg-sage-dark text-xs font-bold rounded-lg border border-cg-sage-subtle">
                      <Lock className="h-3 w-3" />
                      From Agreement
                    </span>
                  )}
                </div>
                {splitFromAgreement && categorySplits && (
                  <p className="text-xs text-cg-sage-dark mb-2 font-medium">
                    Your agreement specifies {petitionerPercentage}/{100 - petitionerPercentage} for {categories.find(c => c.value === category)?.label} expenses
                  </p>
                )}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={petitionerPercentage}
                      onChange={(e) => {
                        setPetitionerPercentage(parseInt(e.target.value));
                        if (splitFromAgreement) setSplitFromAgreement(false);
                      }}
                      className="w-full accent-[var(--portal-primary)]"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground mt-1 font-medium">
                      <span>Petitioner: {petitionerPercentage}%</span>
                      <span>Respondent: {respondentPercentage}%</span>
                    </div>
                  </div>
                </div>
                {amount > 0 && (
                  <div className="flex justify-between text-sm mt-2 p-3 bg-muted rounded-xl border-2 border-border">
                    <span className="text-foreground font-bold">Petitioner: ${petitionerShare.toFixed(2)}</span>
                    <span className="text-foreground font-bold">Respondent: ${respondentShare.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-bold text-foreground mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-border rounded-xl bg-card text-foreground focus:ring-2 focus:ring-[var(--portal-primary)]/20 focus:border-[var(--portal-primary)] transition-all duration-300"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-foreground mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide details about this expense..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-border rounded-xl bg-card text-foreground placeholder:text-muted-foreground resize-none focus:ring-2 focus:ring-[var(--portal-primary)]/20 focus:border-[var(--portal-primary)] transition-all duration-300"
                  maxLength={2000}
                />
              </div>

              {/* Requirements */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  Requirements
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-muted rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-all duration-300">
                  <input
                    type="checkbox"
                    checked={verificationRequired}
                    onChange={(e) => setVerificationRequired(e.target.checked)}
                    className="w-5 h-5 rounded border-border accent-[var(--portal-primary)]"
                  />
                  <span className="text-sm text-foreground font-medium">Require verification (proof of payment)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-muted rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-all duration-300">
                  <input
                    type="checkbox"
                    checked={receiptRequired}
                    onChange={(e) => setReceiptRequired(e.target.checked)}
                    className="w-5 h-5 rounded border-border accent-[var(--portal-primary)]"
                  />
                  <span className="text-sm text-foreground font-medium">Require receipt upload</span>
                </label>
              </div>

              {/* Attestation */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-muted rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 transition-all duration-300">
                  <input
                    type="checkbox"
                    checked={includeAttestation}
                    onChange={(e) => {
                      setIncludeAttestation(e.target.checked);
                      if (e.target.checked && !attestationText) {
                        setAttestationText(
                          `I attest that these funds will be used exclusively for: ${title || '[expense title]'} (${categories.find(c => c.value === category)?.label || category}). I understand this is a legal record and commit to providing documentation upon request.`
                        );
                      }
                    }}
                    className="w-5 h-5 rounded border-border accent-[var(--portal-primary)]"
                  />
                  <div className="flex-1">
                    <span className="text-sm text-foreground font-bold flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-[var(--portal-primary)]" />
                      Include Attestation (sworn statement)
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">Creates a legal record of your commitment to use funds as stated</p>
                  </div>
                </label>
                {includeAttestation && (
                  <textarea
                    value={attestationText}
                    onChange={(e) => setAttestationText(e.target.value)}
                    placeholder="I attest that these funds will be used for..."
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-[var(--portal-primary)]/30 rounded-xl bg-[var(--portal-primary)]/5 text-foreground placeholder:text-muted-foreground resize-none focus:ring-2 focus:ring-[var(--portal-primary)]/20 focus:border-[var(--portal-primary)] transition-all duration-300 text-sm"
                    maxLength={5000}
                  />
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-bold text-foreground mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={2}
                  className="w-full px-4 py-3 border-2 border-border rounded-xl bg-card text-foreground placeholder:text-muted-foreground resize-none focus:ring-2 focus:ring-[var(--portal-primary)]/20 focus:border-[var(--portal-primary)] transition-all duration-300"
                  maxLength={2000}
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => router.push('/payments')}
              className="flex-1 px-6 py-3 bg-card border-2 border-border text-foreground rounded-xl font-bold hover:border-[var(--portal-primary)]/30 hover:shadow-lg transition-all duration-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[var(--portal-primary)] to-cg-slate text-white rounded-xl font-bold shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSubmitting ? 'Creating...' : 'Create Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewExpensePage() {
  return (
    <ProtectedRoute>
      <NewExpenseContent />
    </ProtectedRoute>
  );
}
