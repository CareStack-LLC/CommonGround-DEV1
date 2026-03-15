/**
 * AgreementExchangeHeader — Shows exchange details from active agreement
 *
 * Displayed at top of calendar: "Exchanges: Fridays at 6:00 PM at Mayo Elementary"
 */

import { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { useTheme } from "@/theme";
import { Card } from "@/components/ui";

interface ExchangeSchedule {
  day_of_week?: string;
  time?: string;
  location?: string;
  notes?: string;
}

interface ExchangeSummary {
  schedules: ExchangeSchedule[];
  agreement_title?: string;
}

export function AgreementExchangeHeader({ familyFileId }: { familyFileId: string | null }) {
  const { colors } = useTheme();
  const [summary, setSummary] = useState<ExchangeSummary | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (!familyFileId) return;
    try {
      const token = await SecureStore.getItemAsync("auth_token");
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com";
      const response = await fetch(`${apiUrl}/api/v1/agreements/family-file/${familyFileId}/exchange-summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setSummary(await response.json() as ExchangeSummary);
      }
    } catch {
      // Endpoint may not exist yet — gracefully degrade
    }
  }, [familyFileId]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  if (!summary?.schedules?.length) return null;

  const primary = summary.schedules[0];
  const summaryLine = [primary.day_of_week, primary.time, primary.location].filter(Boolean).join(" at ");

  return (
    <Card style={{ borderLeftWidth: 4, borderLeftColor: colors.accent, marginHorizontal: 16, marginTop: 12 }}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.accentLight, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="document-text" size={18} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: "500", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Agreement Exchange Schedule
            </Text>
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textPrimary, marginTop: 2 }}>
              {summaryLine || "Exchange details"}
            </Text>
          </View>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={colors.textMuted} />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.divider, gap: 8 }}>
          {summary.schedules.map((sched, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="calendar-outline" size={16} color={colors.accent} />
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                {[sched.day_of_week, sched.time].filter(Boolean).join(" at ")}
              </Text>
              {sched.location && (
                <>
                  <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                  <Text style={{ fontSize: 14, color: colors.textMuted }}>{sched.location}</Text>
                </>
              )}
            </View>
          ))}
          {summary.agreement_title && (
            <Text style={{ fontSize: 12, color: colors.textMuted, fontStyle: "italic", marginTop: 4 }}>
              From: {summary.agreement_title}
            </Text>
          )}
        </View>
      )}
    </Card>
  );
}
