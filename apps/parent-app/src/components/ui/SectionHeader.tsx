import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme";

interface SectionHeaderProps {
  title: string;
  action?: () => void;
  actionLabel?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
}

export function SectionHeader({ title, action, actionLabel, actionIcon }: SectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "700", color: colors.textPrimary }}>
        {title}
      </Text>
      {action && (
        <TouchableOpacity onPress={action} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {actionLabel && (
            <Text style={{ fontSize: 14, fontWeight: "500", color: colors.primary }}>
              {actionLabel}
            </Text>
          )}
          <Ionicons name={actionIcon || "chevron-forward"} size={16} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}
