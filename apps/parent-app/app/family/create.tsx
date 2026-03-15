import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/theme";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming"
];

interface ChildInfo {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
}

export default function CreateFamilyFileScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Form state
  const [familyName, setFamilyName] = useState("");
  const [state, setState] = useState("");
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [coParentEmail, setCoParentEmail] = useState("");
  const [children, setChildren] = useState<ChildInfo[]>([]);

  // Child form state
  const [newChild, setNewChild] = useState<Partial<ChildInfo>>({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "",
  });

  const addChild = () => {
    if (!newChild.first_name || !newChild.last_name) {
      Alert.alert("Required Fields", "Please enter the child's first and last name.");
      return;
    }

    setChildren([
      ...children,
      {
        id: Date.now().toString(),
        first_name: newChild.first_name,
        last_name: newChild.last_name,
        date_of_birth: newChild.date_of_birth || "",
        gender: newChild.gender || "",
      },
    ]);
    setNewChild({ first_name: "", last_name: "", date_of_birth: "", gender: "" });
  };

  const removeChild = (id: string) => {
    setChildren(children.filter((c) => c.id !== id));
  };

  const handleCreate = async () => {
    if (!familyName.trim()) {
      Alert.alert("Required Field", "Please enter a family name.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com"}/api/v1/family-files`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            family_name: familyName.trim(),
            state: state || undefined,
            other_parent_email: coParentEmail.trim() || undefined,
            children: children.length > 0
              ? children.map((c) => ({
                  first_name: c.first_name,
                  last_name: c.last_name,
                  date_of_birth: c.date_of_birth || undefined,
                  gender: c.gender || undefined,
                }))
              : undefined,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        Alert.alert(
          "Family File Created",
          coParentEmail
            ? `Your family file has been created. An invitation has been sent to ${coParentEmail}.`
            : "Your family file has been created successfully.",
          [
            {
              text: "OK",
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        const error = await response.json();
        Alert.alert("Error", error.message || "Failed to create family file.");
      }
    } catch (error) {
      console.error("Error creating family file:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View className="space-y-4">
      <View className="mb-6">
        <Text className="text-2xl font-bold mb-2" style={{ color: colors.secondary }}>
          Create Family File
        </Text>
        <Text style={{ color: colors.secondary }}>
          A family file contains all your co-parenting information in one place.
        </Text>
      </View>

      {/* Family Name */}
      <View>
        <Text className="text-sm font-medium mb-2" style={{ color: colors.secondary }}>
          Family Name *
        </Text>
        <TextInput
          className="rounded-xl px-4 py-3 text-base"
          style={{ backgroundColor: colors.backgroundSecondary, color: colors.secondary }}
          placeholder="e.g., Smith-Johnson Family"
          placeholderTextColor={colors.inputPlaceholder}
          value={familyName}
          onChangeText={setFamilyName}
        />
        <Text className="text-xs mt-1" style={{ color: colors.secondary }}>
          This helps identify your family file.
        </Text>
      </View>

      {/* State */}
      <View className="mt-4">
        <Text className="text-sm font-medium mb-2" style={{ color: colors.secondary }}>
          State (Optional)
        </Text>
        <TouchableOpacity
          className="rounded-xl px-4 py-3 flex-row items-center justify-between"
          style={{ backgroundColor: colors.backgroundSecondary }}
          onPress={() => setShowStateDropdown(!showStateDropdown)}
        >
          <Text style={{ color: state ? colors.secondary : colors.inputPlaceholder }}>
            {state || "Select state"}
          </Text>
          <Ionicons
            name={showStateDropdown ? "chevron-up" : "chevron-down"}
            size={20}
            color={colors.secondary}
          />
        </TouchableOpacity>
        {showStateDropdown && (
          <View
            className="mt-2 rounded-xl max-h-48 overflow-hidden"
            style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.backgroundSecondary }}
          >
            <ScrollView nestedScrollEnabled>
              {US_STATES.map((s) => (
                <TouchableOpacity
                  key={s}
                  className="px-4 py-3 border-b"
                  style={{ borderBottomColor: colors.backgroundSecondary }}
                  onPress={() => {
                    setState(s);
                    setShowStateDropdown(false);
                  }}
                >
                  <Text style={{ color: colors.secondary }}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        <Text className="text-xs mt-1" style={{ color: colors.secondary }}>
          Helps tailor custody information to your jurisdiction.
        </Text>
      </View>

      {/* Next Button */}
      <TouchableOpacity
        className="mt-6 py-4 rounded-xl items-center"
        style={{ backgroundColor: familyName.trim() ? colors.primary : colors.border }}
        onPress={() => setStep(2)}
        disabled={!familyName.trim()}
      >
        <Text
          className="font-semibold text-lg"
          style={{ color: familyName.trim() ? colors.textInverse : colors.textMuted }}
        >
          Continue
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View className="space-y-4">
      <View className="mb-6">
        <Text className="text-2xl font-bold mb-2" style={{ color: colors.secondary }}>
          Add Children
        </Text>
        <Text style={{ color: colors.secondary }}>
          Add the children in your family (you can add more later).
        </Text>
      </View>

      {/* Children List */}
      {children.length > 0 && (
        <View className="space-y-2 mb-4">
          {children.map((child) => (
            <View
              key={child.id}
              className="flex-row items-center justify-between rounded-xl p-3"
              style={{ backgroundColor: colors.backgroundSecondary }}
            >
              <View className="flex-row items-center">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Text className="text-white font-semibold">
                    {child.first_name.charAt(0)}
                  </Text>
                </View>
                <View>
                  <Text className="font-medium" style={{ color: colors.secondary }}>
                    {child.first_name} {child.last_name}
                  </Text>
                  {child.date_of_birth && (
                    <Text className="text-xs" style={{ color: colors.secondary }}>
                      DOB: {child.date_of_birth}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity onPress={() => removeChild(child.id)}>
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Add Child Form */}
      <View className="rounded-xl p-4" style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.backgroundSecondary }}>
        <Text className="font-medium mb-3" style={{ color: colors.primary }}>
          Add Child
        </Text>

        <View className="flex-row space-x-2 mb-3">
          <View className="flex-1">
            <TextInput
              className="rounded-lg px-3 py-2"
              style={{ backgroundColor: colors.backgroundSecondary, color: colors.secondary }}
              placeholder="First Name"
              placeholderTextColor={colors.inputPlaceholder}
              value={newChild.first_name}
              onChangeText={(text) => setNewChild({ ...newChild, first_name: text })}
            />
          </View>
          <View className="flex-1">
            <TextInput
              className="rounded-lg px-3 py-2"
              style={{ backgroundColor: colors.backgroundSecondary, color: colors.secondary }}
              placeholder="Last Name"
              placeholderTextColor={colors.inputPlaceholder}
              value={newChild.last_name}
              onChangeText={(text) => setNewChild({ ...newChild, last_name: text })}
            />
          </View>
        </View>

        <View className="flex-row space-x-2 mb-3">
          <View className="flex-1">
            <TextInput
              className="rounded-lg px-3 py-2"
              style={{ backgroundColor: colors.backgroundSecondary, color: colors.secondary }}
              placeholder="Date of Birth (YYYY-MM-DD)"
              placeholderTextColor={colors.inputPlaceholder}
              value={newChild.date_of_birth}
              onChangeText={(text) => setNewChild({ ...newChild, date_of_birth: text })}
            />
          </View>
          <View className="flex-1">
            <TextInput
              className="rounded-lg px-3 py-2"
              style={{ backgroundColor: colors.backgroundSecondary, color: colors.secondary }}
              placeholder="Gender (optional)"
              placeholderTextColor={colors.inputPlaceholder}
              value={newChild.gender}
              onChangeText={(text) => setNewChild({ ...newChild, gender: text })}
            />
          </View>
        </View>

        <TouchableOpacity
          className="flex-row items-center justify-center py-2 rounded-lg"
          style={{ backgroundColor: colors.primary }}
          onPress={addChild}
        >
          <Ionicons name="add" size={20} color={colors.textInverse} />
          <Text className="text-white font-medium ml-1">Add Child</Text>
        </TouchableOpacity>
      </View>

      {/* Navigation Buttons */}
      <View className="flex-row space-x-3 mt-6">
        <TouchableOpacity
          className="flex-1 py-4 rounded-xl items-center border-2"
          style={{ borderColor: colors.primary }}
          onPress={() => setStep(1)}
        >
          <Text className="font-semibold" style={{ color: colors.primary }}>
            Back
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 py-4 rounded-xl items-center"
          style={{ backgroundColor: colors.primary }}
          onPress={() => setStep(3)}
        >
          <Text className="font-semibold text-white">
            {children.length > 0 ? "Continue" : "Skip"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View className="space-y-4">
      <View className="mb-6">
        <Text className="text-2xl font-bold mb-2" style={{ color: colors.secondary }}>
          Invite Co-Parent
        </Text>
        <Text style={{ color: colors.secondary }}>
          Invite your co-parent to join this family file. They'll receive an email invitation.
        </Text>
      </View>

      {/* Co-Parent Email */}
      <View>
        <Text className="text-sm font-medium mb-2" style={{ color: colors.secondary }}>
          Co-Parent Email (Optional)
        </Text>
        <TextInput
          className="rounded-xl px-4 py-3 text-base"
          style={{ backgroundColor: colors.backgroundSecondary, color: colors.secondary }}
          placeholder="coparent@email.com"
          placeholderTextColor={colors.inputPlaceholder}
          value={coParentEmail}
          onChangeText={setCoParentEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text className="text-xs mt-1" style={{ color: colors.secondary }}>
          You can invite your co-parent later from the family file settings.
        </Text>
      </View>

      {/* Info Box */}
      <View className="rounded-xl p-4 mt-4" style={{ backgroundColor: `${colors.accent}20` }}>
        <View className="flex-row items-start">
          <Ionicons name="information-circle" size={24} color={colors.accent} />
          <View className="flex-1 ml-3">
            <Text className="font-medium mb-1" style={{ color: colors.secondary }}>
              What happens next?
            </Text>
            <Text className="text-sm" style={{ color: colors.secondary }}>
              {coParentEmail
                ? "Your co-parent will receive an email with a link to join this family file. Once they accept, you'll both have access to shared schedules, expenses, and communication tools."
                : "You can start using the family file immediately. Invite your co-parent anytime from settings."}
            </Text>
          </View>
        </View>
      </View>

      {/* Summary */}
      <View className="rounded-xl p-4 mt-4" style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.backgroundSecondary }}>
        <Text className="font-medium mb-3" style={{ color: colors.primary }}>
          Summary
        </Text>
        <View className="space-y-2">
          <View className="flex-row justify-between">
            <Text style={{ color: colors.secondary }}>Family Name:</Text>
            <Text className="font-medium" style={{ color: colors.secondary }}>{familyName}</Text>
          </View>
          {state && (
            <View className="flex-row justify-between">
              <Text style={{ color: colors.secondary }}>State:</Text>
              <Text className="font-medium" style={{ color: colors.secondary }}>{state}</Text>
            </View>
          )}
          <View className="flex-row justify-between">
            <Text style={{ color: colors.secondary }}>Children:</Text>
            <Text className="font-medium" style={{ color: colors.secondary }}>
              {children.length > 0 ? children.map((c) => c.first_name).join(", ") : "None added"}
            </Text>
          </View>
          {coParentEmail && (
            <View className="flex-row justify-between">
              <Text style={{ color: colors.secondary }}>Co-Parent Invite:</Text>
              <Text className="font-medium" style={{ color: colors.secondary }}>{coParentEmail}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Navigation Buttons */}
      <View className="flex-row space-x-3 mt-6">
        <TouchableOpacity
          className="flex-1 py-4 rounded-xl items-center border-2"
          style={{ borderColor: colors.primary }}
          onPress={() => setStep(2)}
        >
          <Text className="font-semibold" style={{ color: colors.primary }}>
            Back
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 py-4 rounded-xl items-center flex-row justify-center"
          style={{ backgroundColor: colors.primary }}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={colors.textInverse} />
              <Text className="font-semibold text-white ml-2">Create Family File</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.surfaceElevated }} edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Progress Indicator */}
          <View className="flex-row items-center justify-center mb-8">
            {[1, 2, 3].map((s) => (
              <View key={s} className="flex-row items-center">
                <View
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: step >= s ? colors.primary : colors.backgroundSecondary,
                  }}
                >
                  <Text
                    className="font-semibold"
                    style={{ color: step >= s ? colors.textInverse : colors.secondary }}
                  >
                    {s}
                  </Text>
                </View>
                {s < 3 && (
                  <View
                    className="w-12 h-1 mx-1"
                    style={{ backgroundColor: step > s ? colors.primary : colors.backgroundSecondary }}
                  />
                )}
              </View>
            ))}
          </View>

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
