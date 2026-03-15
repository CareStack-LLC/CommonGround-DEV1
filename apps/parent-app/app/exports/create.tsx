/**
 * Create Export Screen
 *
 * Wizard for creating court-ready export packages
 */

import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

import { useFamilyFile } from "@/hooks/useFamilyFile";
import { parent } from "@commonground/api-client";
import {
  PackageType,
  ClaimType,
  RedactionLevel,
  SectionType,
  getSectionDisplayName,
  getSectionDescription,
  getDefaultSections,
} from "@commonground/api-client/src/api/parent/exports";
import { useTheme } from "@/theme";

type Step = "type" | "dates" | "claim" | "sections" | "options" | "review";

export default function CreateExportScreen() {
  const { familyFile } = useFamilyFile();
  const { colors } = useTheme();
  const [step, setStep] = useState<Step>("type");
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [packageType, setPackageType] = useState<PackageType | null>(null);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // 30 days ago
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [claimType, setClaimType] = useState<ClaimType | null>(null);
  const [claimDescription, setClaimDescription] = useState("");
  const [selectedSections, setSelectedSections] = useState<SectionType[]>([]);
  const [redactionLevel, setRedactionLevel] = useState<RedactionLevel>(RedactionLevel.STANDARD);
  const [redactMessages, setRedactMessages] = useState(false);

  const allSections = Object.values(SectionType);
  const claimTypes = Object.values(ClaimType);

  const toggleSection = (section: SectionType) => {
    setSelectedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const selectAllSections = () => {
    setSelectedSections(allSections);
  };

  const clearAllSections = () => {
    setSelectedSections([]);
  };

  const handlePackageTypeSelect = (type: PackageType) => {
    setPackageType(type);
    setSelectedSections(getDefaultSections(type));
    setStep(type === PackageType.INVESTIGATION ? "claim" : "dates");
  };

  const handleCreate = async () => {
    if (!familyFile?.id || !packageType) return;

    setIsCreating(true);
    try {
      const request = {
        case_id: familyFile.id,
        package_type: packageType,
        date_start: startDate.toISOString().split("T")[0],
        date_end: endDate.toISOString().split("T")[0],
        claim_type: claimType || undefined,
        claim_description: claimDescription || undefined,
        redaction_level: redactionLevel,
        sections: selectedSections,
        message_content_redacted: redactMessages,
      };

      const exportResponse = await parent.exports.createExport(request);
      Alert.alert(
        "Report Created",
        `Your report (#${exportResponse.export_number}) is being generated. This may take a few minutes.`,
        [{ text: "View Report", onPress: () => router.replace(`/exports/${exportResponse.id}`) }]
      );
    } catch (error) {
      console.error("Failed to create export:", error);
      Alert.alert("Error", "Failed to create report. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderStepIndicator = () => {
    const steps: Step[] = packageType === PackageType.INVESTIGATION
      ? ["type", "claim", "dates", "sections", "options", "review"]
      : ["type", "dates", "sections", "options", "review"];
    const currentIndex = steps.indexOf(step);

    return (
      <View style={{ flexDirection: "row", justifyContent: "center", paddingVertical: 16, backgroundColor: colors.cardBackground }}>
        {steps.map((s, i) => (
          <View key={s} style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: i <= currentIndex ? colors.primary : colors.backgroundSecondary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {i < currentIndex ? (
                <Ionicons name="checkmark" size={14} color={colors.textInverse} />
              ) : (
                <Text style={{ color: i === currentIndex ? colors.textInverse : colors.secondary, fontSize: 12, fontWeight: "600" }}>
                  {i + 1}
                </Text>
              )}
            </View>
            {i < steps.length - 1 && (
              <View style={{ width: 24, height: 2, backgroundColor: i < currentIndex ? colors.primary : colors.backgroundSecondary }} />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderTypeStep = () => (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "600", color: colors.textPrimary, marginBottom: 8 }}>
        Select Package Type
      </Text>
      <Text style={{ fontSize: 14, color: colors.secondary, marginBottom: 24 }}>
        Choose the type of documentation you need
      </Text>

      <TouchableOpacity
        style={{
          backgroundColor: colors.cardBackground,
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          borderWidth: 2,
          borderColor: packageType === PackageType.COURT ? colors.primary : colors.backgroundSecondary,
        }}
        onPress={() => handlePackageTypeSelect(PackageType.COURT)}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="briefcase" size={24} color={colors.primary} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textPrimary }}>Court Package</Text>
            <Text style={{ fontSize: 13, color: colors.secondary, marginTop: 4 }}>
              Comprehensive summary of all co-parenting data for court proceedings
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          backgroundColor: colors.cardBackground,
          borderRadius: 12,
          padding: 16,
          borderWidth: 2,
          borderColor: packageType === PackageType.INVESTIGATION ? colors.primary : colors.backgroundSecondary,
        }}
        onPress={() => handlePackageTypeSelect(PackageType.INVESTIGATION)}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="search" size={24} color={colors.primary} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textPrimary }}>Investigation</Text>
            <Text style={{ fontSize: 13, color: colors.secondary, marginTop: 4 }}>
              Focused report on a specific concern or claim
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderClaimStep = () => (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "600", color: colors.textPrimary, marginBottom: 8 }}>
        Claim Details
      </Text>
      <Text style={{ fontSize: 14, color: colors.secondary, marginBottom: 24 }}>
        What concern are you documenting?
      </Text>

      {claimTypes.map((type) => (
        <TouchableOpacity
          key={type}
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 8,
            padding: 12,
            marginBottom: 8,
            borderWidth: 2,
            borderColor: claimType === type ? colors.primary : colors.backgroundSecondary,
          }}
          onPress={() => setClaimType(type)}
        >
          <Text style={{ fontSize: 14, fontWeight: claimType === type ? "600" : "400", color: colors.textPrimary }}>
            {type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          </Text>
        </TouchableOpacity>
      ))}

      <TextInput
        style={{
          backgroundColor: colors.cardBackground,
          borderRadius: 8,
          padding: 12,
          marginTop: 16,
          minHeight: 80,
          textAlignVertical: "top",
          borderWidth: 1,
          borderColor: colors.backgroundSecondary,
          color: colors.textPrimary,
        }}
        placeholder="Describe the concern (optional)"
        placeholderTextColor={colors.secondary}
        value={claimDescription}
        onChangeText={setClaimDescription}
        multiline
      />

      <View style={{ flexDirection: "row", marginTop: 24 }}>
        <TouchableOpacity
          style={{ flex: 1, padding: 12, backgroundColor: colors.backgroundSecondary, borderRadius: 8, marginRight: 8 }}
          onPress={() => setStep("type")}
        >
          <Text style={{ textAlign: "center", color: colors.secondary, fontWeight: "500" }}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flex: 1,
            padding: 12,
            backgroundColor: claimType ? colors.primary : colors.backgroundSecondary,
            borderRadius: 8,
            marginLeft: 8,
          }}
          onPress={() => claimType && setStep("dates")}
          disabled={!claimType}
        >
          <Text style={{ textAlign: "center", color: claimType ? colors.textInverse : colors.secondary, fontWeight: "500" }}>
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDatesStep = () => (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "600", color: colors.textPrimary, marginBottom: 8 }}>
        Date Range
      </Text>
      <Text style={{ fontSize: 14, color: colors.secondary, marginBottom: 24 }}>
        Select the time period to include
      </Text>

      <TouchableOpacity
        style={{
          backgroundColor: colors.cardBackground,
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
        onPress={() => setShowStartPicker(true)}
      >
        <Text style={{ color: colors.secondary }}>Start Date</Text>
        <Text style={{ fontWeight: "600", color: colors.textPrimary }}>{formatDate(startDate)}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          backgroundColor: colors.cardBackground,
          borderRadius: 8,
          padding: 12,
          marginBottom: 24,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
        onPress={() => setShowEndPicker(true)}
      >
        <Text style={{ color: colors.secondary }}>End Date</Text>
        <Text style={{ fontWeight: "600", color: colors.textPrimary }}>{formatDate(endDate)}</Text>
      </TouchableOpacity>

      {(showStartPicker || showEndPicker) && Platform.OS === "ios" && (
        <View style={{ backgroundColor: colors.cardBackground, borderRadius: 8, marginBottom: 16, padding: 8 }}>
          <DateTimePicker
            value={showStartPicker ? startDate : endDate}
            mode="date"
            display="spinner"
            onChange={(event, date) => {
              if (date) {
                if (showStartPicker) setStartDate(date);
                else setEndDate(date);
              }
            }}
          />
          <TouchableOpacity
            style={{ padding: 12, alignItems: "center" }}
            onPress={() => {
              setShowStartPicker(false);
              setShowEndPicker(false);
            }}
          >
            <Text style={{ color: colors.primary, fontWeight: "600" }}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

      {showStartPicker && Platform.OS === "android" && (
        <DateTimePicker
          value={startDate}
          mode="date"
          onChange={(event, date) => {
            setShowStartPicker(false);
            if (date) setStartDate(date);
          }}
        />
      )}

      {showEndPicker && Platform.OS === "android" && (
        <DateTimePicker
          value={endDate}
          mode="date"
          onChange={(event, date) => {
            setShowEndPicker(false);
            if (date) setEndDate(date);
          }}
        />
      )}

      <View style={{ flexDirection: "row" }}>
        <TouchableOpacity
          style={{ flex: 1, padding: 12, backgroundColor: colors.backgroundSecondary, borderRadius: 8, marginRight: 8 }}
          onPress={() => setStep(packageType === PackageType.INVESTIGATION ? "claim" : "type")}
        >
          <Text style={{ textAlign: "center", color: colors.secondary, fontWeight: "500" }}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, padding: 12, backgroundColor: colors.primary, borderRadius: 8, marginLeft: 8 }}
          onPress={() => setStep("sections")}
        >
          <Text style={{ textAlign: "center", color: colors.textInverse, fontWeight: "500" }}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSectionsStep = () => (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "600", color: colors.textPrimary, marginBottom: 8 }}>
        Select Sections
      </Text>
      <View style={{ flexDirection: "row", marginBottom: 16 }}>
        <TouchableOpacity onPress={selectAllSections} style={{ marginRight: 16 }}>
          <Text style={{ color: colors.primary, fontWeight: "500" }}>Select All</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={clearAllSections}>
          <Text style={{ color: colors.secondary, fontWeight: "500" }}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ maxHeight: 300 }}>
        {allSections.map((section) => (
          <TouchableOpacity
            key={section}
            style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 8,
              padding: 12,
              marginBottom: 8,
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 2,
              borderColor: selectedSections.includes(section) ? colors.primary : colors.backgroundSecondary,
            }}
            onPress={() => toggleSection(section)}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                borderWidth: 2,
                borderColor: selectedSections.includes(section) ? colors.primary : colors.secondary,
                backgroundColor: selectedSections.includes(section) ? colors.primary : "transparent",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              {selectedSections.includes(section) && (
                <Ionicons name="checkmark" size={14} color={colors.textInverse} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textPrimary }}>
                {getSectionDisplayName(section)}
              </Text>
              <Text style={{ fontSize: 12, color: colors.secondary, marginTop: 2 }}>
                {getSectionDescription(section)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={{ flexDirection: "row", marginTop: 16 }}>
        <TouchableOpacity
          style={{ flex: 1, padding: 12, backgroundColor: colors.backgroundSecondary, borderRadius: 8, marginRight: 8 }}
          onPress={() => setStep("dates")}
        >
          <Text style={{ textAlign: "center", color: colors.secondary, fontWeight: "500" }}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flex: 1,
            padding: 12,
            backgroundColor: selectedSections.length > 0 ? colors.primary : colors.backgroundSecondary,
            borderRadius: 8,
            marginLeft: 8,
          }}
          onPress={() => selectedSections.length > 0 && setStep("options")}
          disabled={selectedSections.length === 0}
        >
          <Text style={{ textAlign: "center", color: selectedSections.length > 0 ? colors.textInverse : colors.secondary, fontWeight: "500" }}>
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderOptionsStep = () => (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "600", color: colors.textPrimary, marginBottom: 8 }}>
        Privacy Options
      </Text>
      <Text style={{ fontSize: 14, color: colors.secondary, marginBottom: 24 }}>
        Configure redaction settings
      </Text>

      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textPrimary, marginBottom: 8 }}>
        Redaction Level
      </Text>
      {Object.values(RedactionLevel).map((level) => (
        <TouchableOpacity
          key={level}
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 8,
            padding: 12,
            marginBottom: 8,
            borderWidth: 2,
            borderColor: redactionLevel === level ? colors.primary : colors.backgroundSecondary,
          }}
          onPress={() => setRedactionLevel(level)}
        >
          <Text style={{ fontSize: 14, fontWeight: redactionLevel === level ? "600" : "400", color: colors.textPrimary }}>
            {level === RedactionLevel.NONE ? "None - Full data" :
             level === RedactionLevel.STANDARD ? "Standard - SSN, addresses masked" :
             "Enhanced - All PII masked"}
          </Text>
        </TouchableOpacity>
      ))}

      <View style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: colors.cardBackground,
        borderRadius: 8,
        padding: 12,
        marginTop: 16,
      }}>
        <Text style={{ fontSize: 14, color: colors.textPrimary }}>Redact message content</Text>
        <Switch
          value={redactMessages}
          onValueChange={setRedactMessages}
          trackColor={{ false: colors.backgroundSecondary, true: colors.primary }}
          thumbColor={colors.background}
        />
      </View>

      <View style={{ flexDirection: "row", marginTop: 24 }}>
        <TouchableOpacity
          style={{ flex: 1, padding: 12, backgroundColor: colors.backgroundSecondary, borderRadius: 8, marginRight: 8 }}
          onPress={() => setStep("sections")}
        >
          <Text style={{ textAlign: "center", color: colors.secondary, fontWeight: "500" }}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, padding: 12, backgroundColor: colors.primary, borderRadius: 8, marginLeft: 8 }}
          onPress={() => setStep("review")}
        >
          <Text style={{ textAlign: "center", color: colors.textInverse, fontWeight: "500" }}>Review</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderReviewStep = () => (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "600", color: colors.textPrimary, marginBottom: 16 }}>
        Review & Generate
      </Text>

      <View style={{ backgroundColor: colors.cardBackground, borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: colors.secondary }}>Package Type</Text>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textPrimary }}>
            {packageType === PackageType.COURT ? "Court Package" : "Investigation"}
          </Text>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: colors.secondary }}>Date Range</Text>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textPrimary }}>
            {formatDate(startDate)} - {formatDate(endDate)}
          </Text>
        </View>

        {claimType && (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 12, color: colors.secondary }}>Claim Type</Text>
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textPrimary }}>
              {claimType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </Text>
          </View>
        )}

        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: colors.secondary }}>Sections</Text>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textPrimary }}>
            {selectedSections.length} sections selected
          </Text>
        </View>

        <View>
          <Text style={{ fontSize: 12, color: colors.secondary }}>Redaction</Text>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textPrimary }}>
            {redactionLevel.charAt(0).toUpperCase() + redactionLevel.slice(1)}
            {redactMessages ? " + Message content" : ""}
          </Text>
        </View>
      </View>

      <View style={{ backgroundColor: colors.primaryLight, borderRadius: 8, padding: 12, marginBottom: 24 }}>
        <Text style={{ fontSize: 13, color: colors.primary, textAlign: "center" }}>
          Your report will include SHA-256 integrity verification for court admissibility.
        </Text>
      </View>

      <View style={{ flexDirection: "row" }}>
        <TouchableOpacity
          style={{ flex: 1, padding: 12, backgroundColor: colors.backgroundSecondary, borderRadius: 8, marginRight: 8 }}
          onPress={() => setStep("options")}
        >
          <Text style={{ textAlign: "center", color: colors.secondary, fontWeight: "500" }}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, padding: 12, backgroundColor: colors.primary, borderRadius: 8, marginLeft: 8 }}
          onPress={handleCreate}
          disabled={isCreating}
        >
          {isCreating ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={{ textAlign: "center", color: colors.textInverse, fontWeight: "600" }}>
              Generate Report
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceElevated }} edges={["bottom"]}>
      {renderStepIndicator()}
      <ScrollView>
        {step === "type" && renderTypeStep()}
        {step === "claim" && renderClaimStep()}
        {step === "dates" && renderDatesStep()}
        {step === "sections" && renderSectionsStep()}
        {step === "options" && renderOptionsStep()}
        {step === "review" && renderReviewStep()}
      </ScrollView>
    </SafeAreaView>
  );
}
