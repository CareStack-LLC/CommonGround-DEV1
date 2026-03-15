"use client";

import { useState, useEffect } from "react";
import { FileText, DollarSign, PieChart, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { agreementsAPI, FinancialSummaryResponse, AgreementSection } from "@/lib/api";

interface AgreementTermsCardProps {
  familyFileId: string;
  agreementId?: string;
}

/**
 * Extract financial summary data from agreement sections.
 * Looks at section_type "financial" sections (Child Support #14, Expense Sharing #15)
 * and parses structured_data or content for financial terms.
 */
function extractFinancialFromSections(
  sections: AgreementSection[],
  agreementTitle: string
): FinancialSummaryResponse | null {
  const financialSections = sections.filter(s => s.section_type === "financial");
  if (financialSections.length === 0) return null;

  let childSupportAmount: number | null = null;
  let childSupportFrequency: string | null = null;
  let childSupportPayer: string | null = null;
  let childSupportPayee: string | null = null;
  let expenseSplit: Record<string, number> | null = null;
  const specialProvisions: string[] = [];

  for (const section of financialSections) {
    const sd = section.structured_data;
    const content = typeof section.content === "string" ? section.content : "";

    // Check structured_data first (most reliable)
    if (sd) {
      // Child support fields
      if (sd.monthly_amount || sd.child_support_amount || sd.amount) {
        childSupportAmount = parseFloat(sd.monthly_amount || sd.child_support_amount || sd.amount) || null;
      }
      if (sd.frequency || sd.payment_frequency) {
        childSupportFrequency = sd.frequency || sd.payment_frequency;
      }
      if (sd.payer || sd.paying_parent) {
        childSupportPayer = sd.payer || sd.paying_parent;
      }
      if (sd.payee || sd.receiving_parent) {
        childSupportPayee = sd.payee || sd.receiving_parent;
      }

      // Expense split fields
      if (sd.split_percentage || sd.expense_split) {
        expenseSplit = sd.split_percentage || sd.expense_split;
      }
      // V2: split_ratio is a string like "50/50", "60/40", "income_based"
      if (sd.split_ratio && typeof sd.split_ratio === "string") {
        const ratioMatch = sd.split_ratio.match(/(\d+)\s*\/\s*(\d+)/);
        if (ratioMatch) {
          expenseSplit = {
            "Parent A": parseInt(ratioMatch[1]),
            "Parent B": parseInt(ratioMatch[2]),
          };
        } else if (sd.split_ratio !== "custom") {
          // Display as a provision if it's a named split like "income_based"
          specialProvisions.push(`Expense split: ${sd.split_ratio.replace(/_/g, " ")}`);
        }
        if (sd.custom_split_details) {
          specialProvisions.push(sd.custom_split_details);
        }
      } else if (sd.split_ratio && typeof sd.split_ratio === "object") {
        expenseSplit = sd.split_ratio;
      }
      if (sd.petitioner_percentage != null && sd.respondent_percentage != null) {
        expenseSplit = {
          "Parent A": sd.petitioner_percentage,
          "Parent B": sd.respondent_percentage,
        };
      }

      // V2: expense_categories as special provisions
      if (sd.expense_categories && Array.isArray(sd.expense_categories) && sd.expense_categories.length > 0) {
        specialProvisions.push(`Shared expenses: ${sd.expense_categories.join(", ")}`);
      }

      // V2: reimbursement_window
      if (sd.reimbursement_window) {
        specialProvisions.push(`Reimbursement window: ${sd.reimbursement_window.replace(/_/g, " ")}`);
      }

      // Special provisions
      if (sd.special_provisions && Array.isArray(sd.special_provisions)) {
        specialProvisions.push(...sd.special_provisions);
      }
      if (sd.notes) {
        specialProvisions.push(sd.notes);
      }
    }

    // Fallback: try to parse amounts from content text
    if (!childSupportAmount && content) {
      const amountMatch = content.match(/\$[\d,]+(?:\.\d{2})?/);
      if (amountMatch && section.section_title?.toLowerCase().includes("child support")) {
        childSupportAmount = parseFloat(amountMatch[0].replace(/[$,]/g, "")) || null;
      }
    }
  }

  // If we found nothing useful, return null
  if (!childSupportAmount && !expenseSplit && specialProvisions.length === 0) {
    return null;
  }

  return {
    child_support_amount: childSupportAmount,
    child_support_frequency: childSupportFrequency,
    child_support_payer: childSupportPayer,
    child_support_payee: childSupportPayee,
    expense_split_percentage: expenseSplit,
    special_provisions: specialProvisions,
    agreement_title: agreementTitle,
  };
}

export function AgreementTermsCard({ familyFileId, agreementId }: AgreementTermsCardProps) {
  const [data, setData] = useState<FinancialSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        if (agreementId) {
          // Fetch the full agreement with sections and extract financial data
          const result = await agreementsAPI.get(agreementId);
          const extracted = extractFinancialFromSections(
            result.sections,
            result.agreement.title
          );
          setData(extracted);
        } else {
          // Fallback: try the financial summary endpoint
          const summary = await agreementsAPI.getFinancialSummary(familyFileId);
          setData(summary);
        }
      } catch {
        // No active agreement or no financial data
      } finally {
        setLoading(false);
      }
    }
    if (familyFileId || agreementId) load();
  }, [familyFileId, agreementId]);

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
