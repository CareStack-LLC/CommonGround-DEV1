/**
 * Create Family File Screen
 */
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/theme";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com";

export default function CreateFamilyFileScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const [title, setTitle] = useState("");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) {
      setError("Please enter a family name");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/family-files/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          state: state.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to create family file");
      }

      const data = await response.json();
      router.replace(`/(tabs)/files/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceElevated }} edges={["top"]}>
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.backgroundSecondary,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.secondary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.secondary }}>
          New Family File
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.secondary, marginBottom: 8 }}>
            Family Name *
          </Text>
          <TextInput
            style={{
              backgroundColor: colors.inputBackground,
              borderRadius: 12,
              padding: 16,
              fontSize: 16,
              color: colors.secondary,
              borderWidth: 1,
              borderColor: colors.backgroundSecondary,
            }}
            placeholder="e.g., Smith Family"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.secondary, marginBottom: 8 }}>
            State
          </Text>
          <TextInput
            style={{
              backgroundColor: colors.inputBackground,
              borderRadius: 12,
              padding: 16,
              fontSize: 16,
              color: colors.secondary,
              borderWidth: 1,
              borderColor: colors.backgroundSecondary,
            }}
            placeholder="e.g., CA"
            placeholderTextColor={colors.textMuted}
            value={state}
            onChangeText={setState}
            autoCapitalize="characters"
            maxLength={2}
          />
        </View>

        {error && (
          <View style={{
            backgroundColor: "#FEE2E2",
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            flexDirection: "row",
            alignItems: "center",
          }}>
            <Ionicons name="alert-circle" size={20} color="#DC2626" />
            <Text style={{ marginLeft: 12, color: "#DC2626", fontWeight: "500" }}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={{
            backgroundColor: colors.primary,
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
            opacity: loading ? 0.7 : 1,
          }}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={{ color: colors.textInverse, fontSize: 16, fontWeight: "600" }}>Create Family File</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
