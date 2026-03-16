'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { FileSignature, Shield, ExternalLink, Loader2 } from 'lucide-react';

interface ApprovalDisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  agreementTitle: string;
  isLoading?: boolean;
}

export function ApprovalDisclaimerModal({
  isOpen,
  onClose,
  onConfirm,
  agreementTitle,
  isLoading = false,
}: ApprovalDisclaimerModalProps) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedBinding, setAcceptedBinding] = useState(false);

  const canConfirm = acceptedTerms && acceptedBinding && !isLoading;

  const handleClose = () => {
    setAcceptedTerms(false);
    setAcceptedBinding(false);
    onClose();
  };

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-cg-sage/10 rounded-lg">
              <FileSignature className="h-5 w-5 text-cg-sage" />
            </div>
            <DialogTitle className="text-lg">Agreement Approval</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            You are about to formally approve this agreement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Agreement name */}
          <div className="p-3 bg-muted/50 rounded-lg border">
            <p className="text-sm font-medium">{agreementTitle}</p>
          </div>

          {/* What happens explanation */}
          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <Shield className="h-4 w-4 text-cg-sage mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  By approving, your name, email, timestamp, IP address, and device information
                  will be recorded as your digital signature. The agreement content is
                  cryptographically hashed to ensure document integrity.
                </p>
              </div>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border text-cg-sage focus:ring-cg-sage/50 shrink-0"
              />
              <span className="text-sm text-foreground leading-relaxed">
                I have read and agree to the{' '}
                <a
                  href="/legal/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cg-sage hover:underline inline-flex items-center gap-0.5"
                >
                  Terms of Service
                  <ExternalLink className="h-3 w-3" />
                </a>
                {' '}and{' '}
                <a
                  href="/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cg-sage hover:underline inline-flex items-center gap-0.5"
                >
                  Privacy Policy
                  <ExternalLink className="h-3 w-3" />
                </a>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={acceptedBinding}
                onChange={(e) => setAcceptedBinding(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border text-cg-sage focus:ring-cg-sage/50 shrink-0"
              />
              <span className="text-sm text-foreground leading-relaxed">
                I understand this creates a formal agreement between both parents
                and that this document may be submitted to a court
              </span>
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-cg-sage hover:bg-cg-sage/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <FileSignature className="h-4 w-4" />
                Confirm Approval
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
