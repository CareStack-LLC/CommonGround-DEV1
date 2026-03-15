/**
 * AgreementFinancialSummary — Shows child support & financial terms from agreement
 */

import { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { useTheme } from "@/theme";
import { Card, Badge } from "@/components/ui";

interface FinancialSummary {
  child_support_amount?: number;
  child_support_frequency?: string;
  child_support_payer?: string;
  child_support_payee?: string;
  expense_split_percentage?: { parent_a: number; parent_b: number };
  special_provisions?: string[];
  agreement_title?: string;
}

export function AgreementFinancialSummary({ familyFileId }: { familyFileId: string | null }) {
  const { colors } = useTheme();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (!familyFileId) return;
    try {
      const token = await SecureStore.getItemAsync("auth_token");
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com";
      const response = await fetch(`${apiUrl}/api/v1/agreements/family-file/${familyFileId}/financial-summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setSummary(await response.json() as FinancialSummary);
      }
    } catch {
      // Endpoint may not exist yet — gracefully degrade
    }
  }, [familyFileId]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  if (!summary) return null;

  const hasContent = summary.child_support_amount || summary.expense_split_percentage || summary.special_provisions?.length;
  if (!hasContent) return null;

  return (
    <Card style={{ borderLeftWidth: 4, borderLeftColor: colors.primary }}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="document-text" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: "500", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Agreement Financial Terms
            </Text>
            {summary.child_support_amount && (
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textPrimary, marginTop: 2 }}>
                ${summary.child_support_amount.toLocaleString()}/{summary.child_support_frequency || "month"}
              </Text>
            )}
          </View>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={colors.textMuted} />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.divider, gap: 12 }}>
          {/* Child Support */}
          {summary.child_support_amount && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="cash-outline" size={16} color={colors.primary} />
                <Text style={{ fontSize: 14, color: colors.textSecondary }}>Child Support</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textPrimary }}>
                  ${summary.child_support_amount.toLocaleString()}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  {summary.child_support_payer} pays {summary.child_support_payee}
                </Text>
              </View>
            </View>
          )}

          {/* Expense Split */}
          {summary.expense_split_percentage && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="pie-chart-outline" size={16} color={colors.primary} />
                <Text style={{ fontSize: 14, color: colors.textSecondary }}>Shared Expenses</Text>
              </View>
              <Badge
                label={`${summary.expense_split_percentage.parent_a}/${summary.expense_split_percentage.parent_b}`}
                variant="info"
              />
            </View>
          )}

          {/* Special Provisions */}
          {summary.special_provisions && summary.special_provisions.length > 0 && (
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary }}>Special Provisions</Text>
              {summary.special_provisions.map((provision, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, marginTop: 6 }} />
                  <Text style={{ fontSize: 13, color: colors.textMuted, flex: 1 }}>{provision}</Text>
                </View>
              ))}
            </View>
          )}

          {summary.agreement_title && (
            <Text style={{ fontSize: 12, color: colors.textMuted, fontStyle: "italic" }}>
              From: {summary.agreement_title}
            </Text>
          )}
        </View>
      )}
    </Card>
  );
}
