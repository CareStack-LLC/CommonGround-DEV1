/**
 * Agreement Preview Screen
 *
 * Shows a full, formatted preview of the agreement for review:
 * - All sections displayed in order
 * - Print-ready formatting
 * - PDF download option
 * - Quick navigation between sections
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
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

interface Agreement {
  id: string;
  agreement_number: string;
  title: string;
  agreement_type: string;
  agreement_version: string;
  status: string;
  petitioner_approved: boolean;
  respondent_approved: boolean;
  effective_date?: string;
  court_ordered: boolean;
  sections?: AgreementSection[];
  created_at: string;
  family_file?: {
    id: string;
    family_name: string;
    parent_a?: { id: string; first_name: string; last_name: string };
    parent_b?: { id: string; first_name: string; last_name: string };
    children?: Array<{ id: string; first_name: string; last_name: string; date_of_birth: string }>;
  };
}

export default function AgreementPreviewScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);

  // Fetch agreement data
  const fetchAgreement = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com"}/api/v1/agreements/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAgreement(data);
      } else {
        Alert.alert("Error", "Failed to load agreement.");
        router.back();
      }
    } catch (error) {
      console.error("Error fetching agreement:", error);
      Alert.alert("Error", "An unexpected error occurred.");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchAgreement();
  }, [fetchAgreement]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleShare = async () => {
    if (!agreement) return;

    try {
      const text = generatePlainTextAgreement();
      await Share.share({
        message: text,
        title: agreement.title,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const generatePlainTextAgreement = () => {
    if (!agreement) return "";

    const sections = agreement.sections?.sort((a, b) => a.display_order - b.display_order) || [];

    let text = `${agreement.title}\n`;
    text += `Agreement #${agreement.agreement_number}\n`;
    text += `Status: ${agreement.status.replace("_", " ").toUpperCase()}\n`;
    text += `\n${"=".repeat(50)}\n\n`;

    // Parties
    if (agreement.family_file) {
      text += `PARTIES:\n`;
      if (agreement.family_file.parent_a) {
        text += `  Parent A: ${agreement.family_file.parent_a.first_name} ${agreement.family_file.parent_a.last_name}\n`;
      }
      if (agreement.family_file.parent_b) {
        text += `  Parent B: ${agreement.family_file.parent_b.first_name} ${agreement.family_file.parent_b.last_name}\n`;
      }
      text += `\n`;
    }

    // Children
    if (agreement.family_file?.children?.length) {
      text += `CHILDREN:\n`;
      agreement.family_file.children.forEach((child) => {
        text += `  - ${child.first_name} ${child.last_name} (DOB: ${child.date_of_birth})\n`;
      });
      text += `\n`;
    }

    // Sections
    sections.forEach((section) => {
      text += `${"-".repeat(50)}\n`;
      text += `SECTION ${section.section_number}: ${section.section_title.toUpperCase()}\n`;
      text += `${"-".repeat(50)}\n\n`;
      text += `${section.content || "[No content]"}\n\n`;
    });

    text += `${"=".repeat(50)}\n`;
    text += `Generated via CommonGround\n`;
    text += `Date: ${new Date().toLocaleDateString()}\n`;

    return text;
  };

  if (loading) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.surfaceElevated }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4" style={{ color: colors.secondary }}>
          Loading preview...
        </Text>
      </SafeAreaView>
    );
  }

  if (!agreement) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.surfaceElevated }}
      >
        <Text style={{ color: colors.secondary }}>Agreement not found.</Text>
      </SafeAreaView>
    );
  }

  const sections = agreement.sections?.sort((a, b) => a.display_order - b.display_order) || [];
  const completedCount = sections.filter((s) => s.is_completed).length;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.surfaceElevated }} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Preview",
          headerRight: () => (
            <TouchableOpacity onPress={handleShare} className="mr-4">
              <Ionicons name="share-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Quick Navigation */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="max-h-12 border-b"
        style={{ borderBottomColor: colors.backgroundSecondary }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
      >
        {sections.map((section, index) => (
          <TouchableOpacity
            key={section.id}
            className="px-3 py-1 rounded-full mr-2"
            style={{
              backgroundColor: selectedSectionIndex === index ? colors.primary : colors.backgroundSecondary,
            }}
            onPress={() => setSelectedSectionIndex(index)}
          >
            <Text
              className="font-medium text-sm"
              style={{
                color: selectedSectionIndex === index ? "white" : colors.secondary,
              }}
            >
              {section.section_number}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
      >
        {/* Header */}
        <View className="rounded-xl p-5 mb-6" style={{ backgroundColor: colors.background }}>
          <Text className="text-2xl font-bold mb-2" style={{ color: colors.secondary }}>
            {agreement.title}
          </Text>
          <Text className="text-sm mb-3" style={{ color: colors.textMuted }}>
            {agreement.agreement_number}
          </Text>

          <View className="flex-row items-center mb-4">
            <View
              className="px-3 py-1 rounded-full mr-2"
              style={{ backgroundColor: `${colors.primary}20` }}
            >
              <Text className="font-medium" style={{ color: colors.primary }}>
                {agreement.status.replace("_", " ")}
              </Text>
            </View>
            {agreement.court_ordered && (
              <View
                className="px-3 py-1 rounded-full flex-row items-center"
                style={{ backgroundColor: `${colors.accent}20` }}
              >
                <Ionicons name="business" size={12} color={colors.accent} />
                <Text className="font-medium ml-1" style={{ color: colors.accent }}>
                  Court Ordered
                </Text>
              </View>
            )}
          </View>

          {/* Progress */}
          <View className="flex-row items-center">
            <Text className="text-sm" style={{ color: colors.secondary }}>
              {completedCount} of {sections.length} sections complete
            </Text>
            <View className="flex-1 h-2 rounded-full ml-3" style={{ backgroundColor: colors.backgroundSecondary }}>
              <View
                className="h-full rounded-full"
                style={{
                  backgroundColor: colors.primary,
                  width: `${(completedCount / sections.length) * 100}%`,
                }}
              />
            </View>
          </View>
        </View>

        {/* Parties */}
        {agreement.family_file && (
          <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: colors.background }}>
            <Text className="font-semibold mb-3" style={{ color: colors.secondary }}>
              Parties to this Agreement
            </Text>
            <View className="flex-row">
              <View className="flex-1">
                <Text className="text-xs mb-1" style={{ color: colors.textMuted }}>
                  PARENT A
                </Text>
                <Text className="font-medium" style={{ color: colors.secondary }}>
                  {agreement.family_file.parent_a?.first_name}{" "}
                  {agreement.family_file.parent_a?.last_name}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs mb-1" style={{ color: colors.textMuted }}>
                  PARENT B
                </Text>
                <Text className="font-medium" style={{ color: colors.secondary }}>
                  {agreement.family_file.parent_b?.first_name}{" "}
                  {agreement.family_file.parent_b?.last_name}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Sections */}
        {sections.map((section, index) => (
          <View
            key={section.id}
            className="rounded-xl p-4 mb-4"
            style={{
              backgroundColor: colors.background,
              borderWidth: selectedSectionIndex === index ? 2 : 0,
              borderColor: colors.primary,
            }}
          >
            {/* Section Header */}
            <View className="flex-row items-center justify-between mb-3 pb-3 border-b" style={{ borderBottomColor: colors.backgroundSecondary }}>
              <View className="flex-row items-center">
                <View
                  className="w-8 h-8 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: section.is_completed ? `${colors.primary}20` : colors.backgroundSecondary }}
                >
                  <Text
                    className="font-bold"
                    style={{ color: section.is_completed ? colors.primary : colors.secondary }}
                  >
                    {section.section_number}
                  </Text>
                </View>
                <View>
                  <Text className="font-semibold" style={{ color: colors.secondary }}>
                    {section.section_title}
                  </Text>
                  <Text className="text-xs" style={{ color: colors.textMuted }}>
                    {section.section_type.replace(/_/g, " ")}
                  </Text>
                </View>
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

            {/* Section Content */}
            {section.content ? (
              <Text className="leading-6" style={{ color: colors.secondary }}>
                {section.content}
              </Text>
            ) : (
              <View className="py-4 items-center">
                <Ionicons name="document-text-outline" size={32} color={colors.textMuted} />
                <Text className="mt-2 text-sm" style={{ color: colors.textMuted }}>
                  No content added yet
                </Text>
                {agreement.status === "draft" && (
                  <TouchableOpacity
                    className="mt-3 px-4 py-2 rounded-lg"
                    style={{ backgroundColor: colors.primary }}
                    onPress={() => router.push(`/agreements/${id}/sections/${section.id}`)}
                  >
                    <Text className="text-white font-medium">Add Content</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ))}

        {/* Footer */}
        <View className="rounded-xl p-4 mb-6" style={{ backgroundColor: colors.backgroundSecondary }}>
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <View className="flex-1 ml-3">
              <Text className="font-medium mb-1" style={{ color: colors.secondary }}>
                About This Agreement
              </Text>
              <Text className="text-sm" style={{ color: colors.secondary }}>
                This agreement was created on {formatDate(agreement.created_at)}.
                {agreement.effective_date &&
                  ` It becomes effective on ${formatDate(agreement.effective_date)}.`}
                {agreement.status === "draft" &&
                  " Complete all sections and submit for approval."}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        {agreement.status === "draft" && (
          <TouchableOpacity
            className="py-4 rounded-xl items-center flex-row justify-center mb-6"
            style={{ backgroundColor: colors.primary }}
            onPress={() => router.back()}
          >
            <Ionicons name="create" size={20} color="white" />
            <Text className="text-white font-semibold text-lg ml-2">Continue Editing</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
