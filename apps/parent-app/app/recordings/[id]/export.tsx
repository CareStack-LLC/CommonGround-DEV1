/**
 * Evidence Export Screen
 *
 * Generates court-ready evidence packages with:
 * - Original recording with integrity hash
 * - Chain of custody documentation
 * - Transcription (optional)
 * - Compliance certification
 */

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  TextInput,
  Linking,
} from "react-native";
import { useState } from "react";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";

import { parent, type EvidenceExportResponse } from "@commonground/api-client";

export default function EvidenceExportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // Form state
  const [caseNumber, setCaseNumber] = useState("");
  const [courtName, setCourtName] = useState("");
  const [courtOrderReference, setCourtOrderReference] = useState("");
  const [discoveryRequestId, setDiscoveryRequestId] = useState("");
  const [includeTranscription, setIncludeTranscription] = useState(true);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<EvidenceExportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!id) return;

    setIsExporting(true);
    setError(null);

    try {
      const result = await parent.recordings.exportEvidence(id, {
        case_number: caseNumber || undefined,
        court_name: courtName || undefined,
        court_order_reference: courtOrderReference || undefined,
        discovery_request_id: discoveryRequestId || undefined,
        include_transcription: includeTranscription,
      });

      setExportResult(result);
    } catch (err: any) {
      setError(err.message || "Failed to generate evidence package");
      Alert.alert("Export Failed", err.message || "Failed to generate evidence package");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = async () => {
    if (!exportResult?.package_url) return;

    try {
      await Linking.openURL(exportResult.package_url);
    } catch (err) {
      Alert.alert("Error", "Failed to open download link");
    }
  };

  const handleNewExport = () => {
    setExportResult(null);
    setCaseNumber("");
    setCourtName("");
    setCourtOrderReference("");
    setDiscoveryRequestId("");
    setIncludeTranscription(true);
  };

  // Show success state
  if (exportResult) {
    return (
      <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900" edges={["top"]}>
        <Stack.Screen options={{ title: "Export Complete" }} />

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Success Header */}
          <View className="items-center py-8 bg-white dark:bg-secondary-800">
            <View className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full items-center justify-center">
              <Ionicons name="checkmark-circle" size={48} color="#16a34a" />
            </View>
            <Text className="text-xl font-bold text-secondary-900 dark:text-white mt-4">
              Evidence Package Ready
            </Text>
            <Text className="text-secondary-500 dark:text-secondary-400 mt-1">
              Your court-ready package has been generated
            </Text>
          </View>

          {/* Certificate Info */}
          <View className="px-6 py-4">
            <View className="bg-white dark:bg-secondary-800 rounded-xl p-4 border border-secondary-100 dark:border-secondary-700">
              <View className="flex-row items-center mb-4">
                <Ionicons name="ribbon" size={24} color="#2563eb" />
                <Text className="text-lg font-semibold text-secondary-900 dark:text-white ml-2">
                  Certificate of Authenticity
                </Text>
              </View>

              <DetailRow label="Certificate Number" value={exportResult.certificate_number} />
              <DetailRow label="Export ID" value={exportResult.export_id} />
              <DetailRow
                label="Generated"
                value={format(new Date(exportResult.generated_at), "MMM d, yyyy 'at' h:mm a")}
              />
              <DetailRow
                label="Expires"
                value={format(new Date(exportResult.expires_at), "MMM d, yyyy")}
              />
              <DetailRow
                label="Package Size"
                value={`${(exportResult.package_size / (1024 * 1024)).toFixed(2)} MB`}
              />
            </View>
          </View>

          {/* Integrity Hashes */}
          <View className="px-6 py-2">
            <View className="bg-white dark:bg-secondary-800 rounded-xl p-4 border border-secondary-100 dark:border-secondary-700">
              <View className="flex-row items-center mb-4">
                <Ionicons name="shield-checkmark" size={24} color="#16a34a" />
                <Text className="text-lg font-semibold text-secondary-900 dark:text-white ml-2">
                  Integrity Verification
                </Text>
              </View>

              <View className="bg-secondary-50 dark:bg-secondary-900 rounded-lg p-3 mb-3">
                <Text className="text-secondary-500 dark:text-secondary-400 text-xs mb-1">
                  Recording Hash (SHA-256)
                </Text>
                <Text className="font-mono text-xs text-secondary-900 dark:text-white">
                  {exportResult.recording_hash}
                </Text>
              </View>

              <View className="bg-secondary-50 dark:bg-secondary-900 rounded-lg p-3">
                <Text className="text-secondary-500 dark:text-secondary-400 text-xs mb-1">
                  Package Hash (SHA-256)
                </Text>
                <Text className="font-mono text-xs text-secondary-900 dark:text-white">
                  {exportResult.package_hash}
                </Text>
              </View>

              {exportResult.transcription_hash && (
                <View className="bg-secondary-50 dark:bg-secondary-900 rounded-lg p-3 mt-3">
                  <Text className="text-secondary-500 dark:text-secondary-400 text-xs mb-1">
                    Transcription Hash (SHA-256)
                  </Text>
                  <Text className="font-mono text-xs text-secondary-900 dark:text-white">
                    {exportResult.transcription_hash}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Package Contents */}
          <View className="px-6 py-2">
            <View className="bg-white dark:bg-secondary-800 rounded-xl p-4 border border-secondary-100 dark:border-secondary-700">
              <View className="flex-row items-center mb-4">
                <Ionicons name="folder-open" size={24} color="#2563eb" />
                <Text className="text-lg font-semibold text-secondary-900 dark:text-white ml-2">
                  Package Contents
                </Text>
              </View>

              {exportResult.files_included.map((file, index) => (
                <View
                  key={file}
                  className={`flex-row items-center py-2 ${
                    index < exportResult.files_included.length - 1
                      ? "border-b border-secondary-100 dark:border-secondary-700"
                      : ""
                  }`}
                >
                  <Ionicons
                    name={getFileIcon(file)}
                    size={18}
                    color="#64748b"
                  />
                  <Text className="text-secondary-700 dark:text-secondary-300 ml-2">
                    {file}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Download Button */}
          <View className="px-6 py-4">
            <TouchableOpacity
              className="bg-primary-600 py-4 rounded-xl flex-row items-center justify-center"
              onPress={handleDownload}
            >
              <Ionicons name="download" size={24} color="#ffffff" />
              <Text className="text-white font-semibold text-lg ml-2">
                Download Package
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="mt-3 py-3 flex-row items-center justify-center"
              onPress={handleNewExport}
            >
              <Text className="text-primary-600 font-medium">Generate New Export</Text>
            </TouchableOpacity>
          </View>

          {/* Legal Notice */}
          <View className="px-6 py-2">
            <View className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={20} color="#2563eb" />
                <View className="flex-1 ml-2">
                  <Text className="text-blue-700 dark:text-blue-300 font-medium">
                    Court-Ready Documentation
                  </Text>
                  <Text className="text-blue-600 dark:text-blue-400 text-sm mt-1">
                    This evidence package includes a complete chain of custody, cryptographic
                    verification, and certification suitable for court proceedings. The download
                    link is valid for 7 days.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900" edges={["top"]}>
      <Stack.Screen options={{ title: "Export Evidence" }} />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="px-6 py-6 bg-white dark:bg-secondary-800 border-b border-secondary-100 dark:border-secondary-700">
          <View className="flex-row items-center">
            <View className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center">
              <Ionicons name="briefcase" size={24} color="#2563eb" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-lg font-semibold text-secondary-900 dark:text-white">
                Court-Ready Evidence Package
              </Text>
              <Text className="text-secondary-500 dark:text-secondary-400 text-sm">
                Generate documentation for legal proceedings
              </Text>
            </View>
          </View>
        </View>

        {/* Package Contents Preview */}
        <View className="px-6 py-4">
          <Text className="text-lg font-semibold text-secondary-900 dark:text-white mb-3">
            Package Will Include
          </Text>

          <View className="bg-white dark:bg-secondary-800 rounded-xl p-4 border border-secondary-100 dark:border-secondary-700">
            <PackageItem icon="videocam" label="Original Recording" description="Unmodified file with SHA-256 hash" />
            <PackageItem icon="shield-checkmark" label="Chain of Custody" description="Complete access audit trail" />
            <PackageItem icon="ribbon" label="Certification" description="Authenticity and compliance statement" />
            <PackageItem icon="document" label="Manifest" description="File integrity verification data" />
            {includeTranscription && (
              <PackageItem icon="document-text" label="Transcription" description="Full transcript with timestamps" />
            )}
          </View>
        </View>

        {/* Options */}
        <View className="px-6 py-2">
          <Text className="text-lg font-semibold text-secondary-900 dark:text-white mb-3">
            Export Options
          </Text>

          <View className="bg-white dark:bg-secondary-800 rounded-xl p-4 border border-secondary-100 dark:border-secondary-700">
            <View className="flex-row items-center justify-between py-2">
              <View className="flex-1">
                <Text className="text-secondary-900 dark:text-white font-medium">
                  Include Transcription
                </Text>
                <Text className="text-secondary-500 dark:text-secondary-400 text-sm">
                  Add full transcript to the package
                </Text>
              </View>
              <Switch
                value={includeTranscription}
                onValueChange={setIncludeTranscription}
                trackColor={{ false: "#cbd5e1", true: "#93c5fd" }}
                thumbColor={includeTranscription ? "#2563eb" : "#f4f4f5"}
              />
            </View>
          </View>
        </View>

        {/* Legal Context (Optional) */}
        <View className="px-6 py-4">
          <Text className="text-lg font-semibold text-secondary-900 dark:text-white mb-1">
            Legal Context
          </Text>
          <Text className="text-secondary-500 dark:text-secondary-400 text-sm mb-3">
            Optional - Add case details for the certification
          </Text>

          <View className="bg-white dark:bg-secondary-800 rounded-xl p-4 border border-secondary-100 dark:border-secondary-700">
            <InputField
              label="Case Number"
              value={caseNumber}
              onChangeText={setCaseNumber}
              placeholder="e.g., 2024-FL-12345"
            />
            <InputField
              label="Court Name"
              value={courtName}
              onChangeText={setCourtName}
              placeholder="e.g., Superior Court of California"
            />
            <InputField
              label="Court Order Reference"
              value={courtOrderReference}
              onChangeText={setCourtOrderReference}
              placeholder="e.g., Order dated Jan 15, 2024"
            />
            <InputField
              label="Discovery Request ID"
              value={discoveryRequestId}
              onChangeText={setDiscoveryRequestId}
              placeholder="e.g., RFP-001"
              isLast
            />
          </View>
        </View>

        {/* Error */}
        {error && (
          <View className="px-6 py-2">
            <View className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <Text className="text-red-700 dark:text-red-300">{error}</Text>
            </View>
          </View>
        )}

        {/* Generate Button */}
        <View className="px-6 py-4">
          <TouchableOpacity
            className={`py-4 rounded-xl flex-row items-center justify-center ${
              isExporting ? "bg-primary-400" : "bg-primary-600"
            }`}
            onPress={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text className="text-white font-semibold text-lg ml-2">
                  Generating Package...
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="download" size={24} color="#ffffff" />
                <Text className="text-white font-semibold text-lg ml-2">
                  Generate Evidence Package
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="mt-3 py-3 flex-row items-center justify-center"
            onPress={() => router.back()}
          >
            <Text className="text-secondary-500">Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PackageItem({
  icon,
  label,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
}) {
  return (
    <View className="flex-row items-center py-2 border-b border-secondary-100 dark:border-secondary-700 last:border-b-0">
      <Ionicons name={icon} size={20} color="#2563eb" />
      <View className="ml-3 flex-1">
        <Text className="text-secondary-900 dark:text-white font-medium">{label}</Text>
        <Text className="text-secondary-500 dark:text-secondary-400 text-sm">{description}</Text>
      </View>
      <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
    </View>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  isLast,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  isLast?: boolean;
}) {
  return (
    <View className={`py-2 ${!isLast ? "border-b border-secondary-100 dark:border-secondary-700" : ""}`}>
      <Text className="text-secondary-500 dark:text-secondary-400 text-sm mb-1">{label}</Text>
      <TextInput
        className="text-secondary-900 dark:text-white py-1"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
      />
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-2 border-b border-secondary-100 dark:border-secondary-700 last:border-b-0">
      <Text className="text-secondary-500 dark:text-secondary-400">{label}</Text>
      <Text className="text-secondary-900 dark:text-white font-medium">{value}</Text>
    </View>
  );
}

function getFileIcon(filename: string): keyof typeof Ionicons.glyphMap {
  if (filename.includes("recording")) return "videocam";
  if (filename.includes("transcription")) return "document-text";
  if (filename.includes("chain_of_custody")) return "link";
  if (filename.includes("certification")) return "ribbon";
  if (filename.includes("MANIFEST")) return "list";
  if (filename.includes("README")) return "information-circle";
  return "document";
}
