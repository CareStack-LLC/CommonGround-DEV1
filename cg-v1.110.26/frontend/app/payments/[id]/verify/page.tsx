'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  Camera,
  DollarSign,
  Store,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  FileText,
  Receipt,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { clearfundAPI, Obligation } from '@/lib/api';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

function VerifyReceiptContent() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [obligation, setObligation] = useState<Obligation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [vendorName, setVendorName] = useState<string>('');

  const obligationId = params.id as string;

  useEffect(() => {
    if (obligationId) {
      loadObligation();
    }
  }, [obligationId]);

  const loadObligation = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await clearfundAPI.getObligation(obligationId);
      setObligation(data);
      // Pre-fill amount with total obligation amount
      setAmount(parseFloat(data.total_amount).toFixed(2));
    } catch (err: any) {
      console.error('Error loading obligation:', err);
      setError(err.message || 'Failed to load obligation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please upload an image (JPEG, PNG, GIF, WebP) or PDF file');
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File is too large. Maximum size is 10MB');
        return;
      }

      setReceiptFile(file);
      setError(null);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setReceiptPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        // For PDFs, show a placeholder
        setReceiptPreview(null);
      }
    }
  };

  const removeFile = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAmountChange = (value: string) => {
    // Only allow numbers and one decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setAmount(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!receiptFile) {
      setError('Please select a receipt file');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await clearfundAPI.uploadReceiptFile(
        obligationId,
        receiptFile,
        amountNum,
        vendorName || undefined
      );
      setSuccess(true);
      // Redirect back to obligation after short delay
      setTimeout(() => {
        router.push(`/payments/${obligationId}`);
      }, 2000);
    } catch (err: any) {
      console.error('Error uploading receipt:', err);
      setError(err.message || 'Failed to upload receipt');
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
          <div className="w-12 h-12 border-2 border-cg-sage border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!obligation) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-2xl mx-auto p-8">
          <div className="cg-card-elevated p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Receipt className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Obligation Not Found</h2>
            <p className="text-muted-foreground mb-6">
              This obligation may have been deleted or you don't have access.
            </p>
            <button onClick={() => router.push('/payments')} className="cg-btn-primary">
              Back to Payments
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-2xl mx-auto p-8">
          <div className="cg-card-elevated p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-cg-success-subtle flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-cg-success" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Receipt Uploaded!</h2>
            <p className="text-muted-foreground mb-6">
              Your receipt has been submitted for verification.
            </p>
            <p className="text-sm text-muted-foreground">Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      <Navigation />

      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.push(`/payments/${obligationId}`)}
            className="flex items-center text-muted-foreground hover:text-foreground mb-4 transition-smooth"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Obligation
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Upload className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Upload Receipt</h1>
              <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                {obligation.title}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Obligation Summary */}
          <div className="cg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-xl font-bold font-mono text-foreground">
                  {formatCurrency(obligation.total_amount)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Already Verified</p>
                <p className="text-lg font-medium font-mono text-cg-success">
                  {formatCurrency(obligation.amount_verified)}
                </p>
              </div>
            </div>
          </div>

          {/* Receipt Upload */}
          <div className="cg-card p-6">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Camera className="h-5 w-5 text-muted-foreground" />
              Receipt Image or PDF
            </h2>

            <div className="space-y-4">
              {/* File Preview / Upload Area */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  receiptFile
                    ? 'border-cg-sage bg-cg-sage-subtle/30'
                    : 'border-border hover:border-cg-sage/50 hover:bg-muted/50'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                {receiptPreview ? (
                  <div className="relative">
                    <img
                      src={receiptPreview}
                      alt="Receipt preview"
                      className="max-h-64 mx-auto rounded-lg object-contain"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile();
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-card rounded-full shadow-md hover:bg-muted transition-colors"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : receiptFile ? (
                  <div className="py-4">
                    <div className="w-16 h-16 rounded-xl bg-purple-100 flex items-center justify-center mx-auto mb-3">
                      <FileText className="h-8 w-8 text-purple-600" />
                    </div>
                    <p className="font-medium text-foreground">{receiptFile.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {(receiptFile.size / 1024).toFixed(1)} KB
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile();
                      }}
                      className="mt-3 text-sm text-cg-error hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="py-8">
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-foreground">Click to upload receipt</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      JPEG, PNG, GIF, WebP, or PDF (max 10MB)
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Receipt Details */}
          <div className="cg-card p-6">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              Receipt Details
            </h2>

            <div className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Receipt Amount *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-3 text-lg font-mono bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-cg-sage/20 focus:border-cg-sage"
                    required
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter the total amount shown on the receipt
                </p>
              </div>

              {/* Vendor Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Vendor / Store Name (Optional)
                </label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="e.g., Target, Amazon, CVS"
                    className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-cg-sage/20 focus:border-cg-sage"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-cg-error-subtle border border-cg-error/20 rounded-xl">
              <AlertCircle className="h-5 w-5 text-cg-error flex-shrink-0" />
              <p className="text-sm text-cg-error">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push(`/payments/${obligationId}`)}
              className="cg-btn-secondary flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cg-btn-primary flex-1 inline-flex items-center justify-center gap-2"
              disabled={isSubmitting || !receiptFile}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Submit Receipt
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function VerifyReceiptPage() {
  return (
    <ProtectedRoute>
      <VerifyReceiptContent />
    </ProtectedRoute>
  );
}
