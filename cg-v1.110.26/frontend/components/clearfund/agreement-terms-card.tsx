"use client";

import { useState, useEffect } from "react";
import { FileText, DollarSign, PieChart, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { agreementsAPI, FinancialSummaryResponse } from "@/lib/api";

interface AgreementTermsCardProps {
  familyFileId: string;
}

export function AgreementTermsCard({ familyFileId }: AgreementTermsCardProps) {
  const [data, setData] = useState<FinancialSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const summary = await agreementsAPI.getFinancialSummary(familyFileId);
        setData(summary);
      } catch {
        // No active agreement or no financial data
      } finally {
        setLoading(false);
      }
    }
    if (familyFileId) load();
  }, [familyFileId]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
        <div className="h-5 bg-muted rounded w-48 mb-3" />
        <div className="h-4 bg-muted rounded w-64 mb-2" />
        <div className="h-4 bg-muted rounded w-40" />
      </div>
    );
  }

  if (!data || !(data.child_support_amount || data.expense_split_percentage || data.special_provisions?.length > 0)) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--portal-primary)]/10 flex items-center justify-center">
            <FileText className="w-4.5 h-4.5 text-[var(--portal-primary)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Agreement Financial Terms
            </h3>
            <p className="text-xs text-muted-foreground">
              No active agreement with financial terms found. Upload or create an agreement to see child support, expense splits, and provisions here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--portal-primary)]/10 flex items-center justify-center">
            <FileText className="w-4.5 h-4.5 text-[var(--portal-primary)]" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-foreground">
              Agreement Financial Terms
            </h3>
            {data.agreement_title && (
              <p className="text-xs text-muted-foreground">
                From: {data.agreement_title}
              </p>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Child Support */}
          {data.child_support_amount && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-[var(--portal-primary)]" />
                <span className="text-sm font-medium text-foreground">
                  Child Support
                </span>
              </div>
              <div className="ml-6 space-y-1">
                <p className="text-lg font-semibold text-foreground">
                  ${data.child_support_amount.toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{data.child_support_frequency || "month"}
                  </span>
                </p>
                {data.child_support_payer && data.child_support_payee && (
                  <p className="text-xs text-muted-foreground">
                    {data.child_support_payer} → {data.child_support_payee}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Expense Split */}
          {data.expense_split_percentage && Object.keys(data.expense_split_percentage).length > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <PieChart className="w-4 h-4 text-[var(--portal-primary)]" />
                <span className="text-sm font-medium text-foreground">
                  Expense Split
                </span>
              </div>
              <div className="ml-6 flex flex-wrap gap-3">
                {Object.entries(data.expense_split_percentage).map(([party, pct]) => (
                  <div key={party} className="text-center">
                    <p className="text-lg font-semibold text-foreground">{pct}%</p>
                    <p className="text-xs text-muted-foreground capitalize">{party}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Special Provisions */}
          {data.special_provisions.length > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-foreground">
                  Special Provisions
                </span>
              </div>
              <ul className="ml-6 space-y-1">
                {data.special_provisions.map((provision, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-[var(--portal-primary)] mt-1">•</span>
                    {provision}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
