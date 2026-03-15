import { View, Text, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme";

type IconName = keyof typeof Ionicons.glyphMap;

interface BadgeProps {
  label: string;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "accent";
  icon?: IconName;
  size?: "sm" | "md";
}

export function Badge({ label, variant = "default", icon, size = "md" }: BadgeProps) {
  const { colors } = useTheme();

  const variantStyles: Record<string, { bg: string; text: string }> = {
    default: { bg: colors.secondaryLight, text: colors.textSecondary },
    success: { bg: colors.successLight, text: colors.success },
    warning: { bg: colors.warningLight, text: colors.warning },
    danger: { bg: colors.dangerLight, text: colors.danger },
    info: { bg: colors.primaryLight, text: colors.primary },
    accent: { bg: colors.accentLight, text: colors.accent },
  };

  const vs = variantStyles[variant];
  const isSmall = size === "sm";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: vs.bg,
        paddingHorizontal: isSmall ? 8 : 10,
        paddingVertical: isSmall ? 2 : 4,
        borderRadius: 100,
        gap: 4,
      }}
    >
      {icon && <Ionicons name={icon} size={isSmall ? 10 : 12} color={vs.text} />}
      <Text style={{ fontSize: isSmall ? 11 : 12, fontWeight: "600", color: vs.text }}>
        {label}
      </Text>
    </View>
  );
}
