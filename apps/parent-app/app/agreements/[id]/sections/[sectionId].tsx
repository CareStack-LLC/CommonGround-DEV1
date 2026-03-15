/**
 * Section Editor Screen
 *
 * Allows editing individual sections of an agreement with:
 * - ARIA suggestions for content
 * - Text editing with formatting
 * - Auto-save functionality
 * - Section templates
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, Stack } from "expo-router";

import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/theme";

interface AgreementSection {
  id: string;
  section_number: number;
  section_title: string;
  section_type: string;
  content?: string;
  is_completed: boolean;
  display_order: number;
}

const SECTION_TEMPLATES: Record<string, string> = {
  parenting_schedule: `**Regular Schedule:**
- [Parent A] has the children on: [days/times]
- [Parent B] has the children on: [days/times]

**Weekend Schedule:**
- Weekends alternate starting [date]

**Summer Schedule:**
- [Describe summer arrangements]

**Transportation:**
- Exchanges occur at: [location]
- Transportation responsibility: [who drives]`,

  decision_making: `**Major Decisions:**
Both parents will jointly make decisions regarding:
- Education and school choice
- Non-emergency medical care
- Religious upbringing
- Extracurricular activities

**Day-to-Day Decisions:**
Each parent may make routine decisions during their parenting time.

**Process for Joint Decisions:**
1. [Describe how decisions will be discussed]
2. [Describe conflict resolution]`,

  communication: `**Between Parents:**
- Primary method: [app/text/email]
- Response time expectation: [hours/days]
- Topics limited to: child-related matters only

**Between Parent and Children:**
- Children may contact either parent freely
- [Parent] will not interfere with calls/video chats
- Scheduled call times: [if applicable]`,

  expenses: `**Child Support:**
- Amount: $[amount] per month
- Paid by: [Parent]
- Payment method: [method]
- Due date: [day] of each month

**Shared Expenses:**
The following are split [50/50 or percentage]:
- Medical expenses not covered by insurance
- Extracurricular activity fees
- School supplies and fees
- [Other agreed expenses]

**Payment Process:**
- Submit receipts within [days]
- Reimbursement within [days]`,

  exchanges: `**Exchange Location:**
- Primary location: [address/public place]
- Backup location: [address]

**Exchange Protocol:**
1. Parent dropping off arrives at [time]
2. Parent picking up arrives at [time]
3. Children's belongings: [describe what travels]

**Late Policy:**
- Grace period: [minutes]
- Notification required after: [minutes]`,

  dispute_resolution: `**Communication First:**
Parents agree to discuss disagreements privately, not involving children.

**Mediation:**
If unable to resolve, parents will:
1. Request mediation through CommonGround
2. Share mediation costs equally
3. Act in good faith to reach resolution

**Professional Help:**
If mediation fails:
- [Describe next steps]
- [Describe who has final say on specific topics]`,

  special_provisions: `**Additional Agreements:**

[Add any special circumstances or agreements specific to your family]

**Right of First Refusal:**
If a parent cannot care for the children during their time, the other parent has first option to care for them before arranging other childcare.

**Modifications:**
This agreement may be modified by mutual written consent of both parents.`,
};

export default function SectionEditorScreen() {
  const { colors } = useTheme();
  const { id: agreementId, sectionId } = useLocalSearchParams<{
    id: string;
    sectionId: string;
  }>();
  const { token } = useAuth();

  const [section, setSection] = useState<AgreementSection | null>(null);
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showARIA, setShowARIA] = useState(false);
  const [ariaLoading, setAriaLoading] = useState(false);
  const [ariaSuggestion, setAriaSuggestion] = useState<string | null>(null);

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch section data
  const fetchSection = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com"}/api/v1/agreements/sections/${sectionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSection(data);
        setContent(data.content || "");
        setOriginalContent(data.content || "");
      } else {
        Alert.alert("Error", "Failed to load section.");
        router.back();
      }
    } catch (error) {
      console.error("Error fetching section:", error);
      Alert.alert("Error", "An unexpected error occurred.");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [sectionId, token]);

  useEffect(() => {
    fetchSection();
  }, [fetchSection]);

  // Track changes
  useEffect(() => {
    setHasChanges(content !== originalContent);
  }, [content, originalContent]);

  // Auto-save after 3 seconds of no typing
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    if (hasChanges && content.trim()) {
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveSection(true);
      }, 3000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [content, hasChanges]);

  // Save section content
  const saveSection = async (isAutoSave = false) => {
    if (!section || saving) return;

    if (!isAutoSave) {
      setSaving(true);
    }

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com"}/api/v1/agreements/sections/${sectionId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: content.trim(),
            is_completed: content.trim().length >= 50,
          }),
        }
      );

      if (response.ok) {
        setOriginalContent(content);
        setHasChanges(false);
        if (!isAutoSave) {
          Alert.alert("Saved", "Section saved successfully.");
        }
      } else {
        if (!isAutoSave) {
          const error = await response.json();
          Alert.alert("Error", error.message || "Failed to save section.");
        }
      }
    } catch (error) {
      console.error("Error saving section:", error);
      if (!isAutoSave) {
        Alert.alert("Error", "An unexpected error occurred.");
      }
    } finally {
      setSaving(false);
    }
  };

  // Get ARIA suggestion for this section
  const getARIASuggestion = async () => {
    if (!section) return;

    setAriaLoading(true);
    setShowARIA(true);

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com"}/api/v1/agreements/${agreementId}/aria/suggest`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            section_type: section.section_type,
            current_content: content,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAriaSuggestion(data.suggestion || data.message);
      } else {
        // Use template as fallback
        setAriaSuggestion(
          SECTION_TEMPLATES[section.section_type] ||
            "ARIA suggestion not available. Try using a template below."
        );
      }
    } catch (error) {
      console.error("Error getting ARIA suggestion:", error);
      setAriaSuggestion(
        SECTION_TEMPLATES[section.section_type] ||
          "Unable to get suggestion. Check your connection."
      );
    } finally {
      setAriaLoading(false);
    }
  };

  // Use template
  const useTemplate = () => {
    if (!section) return;

    const template = SECTION_TEMPLATES[section.section_type];
    if (template) {
      Alert.alert(
        "Use Template",
        "This will replace your current content with the template. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Use Template",
            onPress: () => setContent(template),
          },
        ]
      );
    } else {
      Alert.alert("No Template", "No template available for this section type.");
    }
  };

  // Handle back navigation with unsaved changes
  const handleBack = () => {
    if (hasChanges) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Save before leaving?",
        [
          { text: "Discard", style: "destructive", onPress: () => router.back() },
          { text: "Cancel", style: "cancel" },
          {
            text: "Save",
            onPress: async () => {
              await saveSection(false);
              router.back();
            },
          },
        ]
      );
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.surfaceElevated }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4" style={{ color: colors.secondary }}>
          Loading section...
        </Text>
      </SafeAreaView>
    );
  }

  if (!section) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.surfaceElevated }}
      >
        <Text style={{ color: colors.secondary }}>Section not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.surfaceElevated }} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: section.section_title,
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} className="mr-4">
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View className="flex-row items-center">
              {saving && <ActivityIndicator size="small" color={colors.primary} className="mr-2" />}
              {hasChanges && !saving && (
                <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: colors.accent }} />
              )}
              <TouchableOpacity onPress={() => saveSection(false)} disabled={!hasChanges || saving}>
                <Text
                  className="font-semibold"
                  style={{ color: hasChanges && !saving ? colors.primary : colors.textMuted }}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          {/* Section Header */}
          <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: colors.background }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View
                  className="w-8 h-8 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: `${colors.primary}20` }}
                >
                  <Text className="font-bold" style={{ color: colors.primary }}>
                    {section.section_number}
                  </Text>
                </View>
                <Text className="font-semibold" style={{ color: colors.secondary }}>
                  {section.section_title}
                </Text>
              </View>
              <View
                className="px-2 py-1 rounded-full"
                style={{
                  backgroundColor: section.is_completed ? `${colors.primary}20` : `${colors.accent}20`,
                }}
              >
                <Text
                  className="text-xs font-medium"
                  style={{ color: section.is_completed ? colors.primary : colors.accent }}
                >
                  {section.is_completed ? "Complete" : "Incomplete"}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row mb-4 space-x-2">
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
              style={{ backgroundColor: `${colors.primary}20` }}
              onPress={getARIASuggestion}
            >
              <Ionicons name="sparkles" size={18} color={colors.primary} />
              <Text className="ml-2 font-medium" style={{ color: colors.primary }}>
                Ask ARIA
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
              style={{ backgroundColor: colors.backgroundSecondary }}
              onPress={useTemplate}
            >
              <Ionicons name="document-text" size={18} color={colors.secondary} />
              <Text className="ml-2 font-medium" style={{ color: colors.secondary }}>
                Use Template
              </Text>
            </TouchableOpacity>
          </View>

          {/* ARIA Suggestion Panel */}
          {showARIA && (
            <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: `${colors.primary}10` }}>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="sparkles" size={20} color={colors.primary} />
                  <Text className="ml-2 font-semibold" style={{ color: colors.primary }}>
                    ARIA Suggestion
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowARIA(false)}>
                  <Ionicons name="close" size={20} color={colors.secondary} />
                </TouchableOpacity>
              </View>

              {ariaLoading ? (
                <View className="items-center py-4">
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text className="mt-2 text-sm" style={{ color: colors.secondary }}>
                    Getting suggestion...
                  </Text>
                </View>
              ) : ariaSuggestion ? (
                <>
                  <Text className="text-sm mb-3" style={{ color: colors.secondary }}>
                    {ariaSuggestion}
                  </Text>
                  <TouchableOpacity
                    className="py-2 rounded-lg items-center"
                    style={{ backgroundColor: colors.primary }}
                    onPress={() => {
                      setContent(ariaSuggestion);
                      setShowARIA(false);
                    }}
                  >
                    <Text className="text-white font-medium">Use This Suggestion</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          )}

          {/* Content Editor */}
          <View className="rounded-xl" style={{ backgroundColor: colors.background }}>
            <TextInput
              className="p-4 text-base min-h-[300px]"
              style={{ color: colors.secondary, textAlignVertical: "top" }}
              placeholder="Enter the content for this section...&#10;&#10;Use clear, specific language that both parents can understand and follow. Include dates, times, and locations where applicable."
              placeholderTextColor={colors.inputPlaceholder}
              multiline
              value={content}
              onChangeText={setContent}
            />
          </View>

          {/* Tips */}
          <View className="mt-4 rounded-xl p-4" style={{ backgroundColor: colors.backgroundSecondary }}>
            <View className="flex-row items-start">
              <Ionicons name="bulb" size={18} color={colors.accent} />
              <View className="flex-1 ml-3">
                <Text className="font-medium mb-1" style={{ color: colors.secondary }}>
                  Writing Tips
                </Text>
                <Text className="text-sm" style={{ color: colors.secondary }}>
                  {section.section_type === "parenting_schedule" &&
                    "Be specific about days, times, and locations. Include provisions for schedule changes."}
                  {section.section_type === "decision_making" &&
                    "Clearly define what counts as a major vs. day-to-day decision. Include a tie-breaker process."}
                  {section.section_type === "communication" &&
                    "Set realistic response times and preferred communication methods."}
                  {section.section_type === "expenses" &&
                    "Be specific about which expenses are shared and the process for reimbursement."}
                  {section.section_type === "exchanges" &&
                    "Choose a neutral, public location. Be clear about timing and procedures."}
                  {section.section_type === "dispute_resolution" &&
                    "Start with communication, then escalate to mediation. Keep children out of disputes."}
                  {section.section_type === "special_provisions" &&
                    "Include any unique circumstances or agreements specific to your family."}
                  {!SECTION_TEMPLATES[section.section_type] &&
                    "Write clearly and specifically. Include all relevant details."}
                </Text>
              </View>
            </View>
          </View>

          {/* Character count */}
          <View className="flex-row justify-between mt-4 px-2">
            <Text className="text-xs" style={{ color: colors.secondary }}>
              {content.length} characters
            </Text>
            <Text className="text-xs" style={{ color: content.length >= 50 ? colors.primary : colors.accent }}>
              {content.length >= 50 ? "Meets minimum length" : "Minimum 50 characters to mark complete"}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
