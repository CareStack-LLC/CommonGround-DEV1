import { TouchableOpacity, Text, ActivityIndicator, View, type ViewStyle, type TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme";

type IconName = keyof typeof Ionicons.glyphMap;

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: IconName;
  iconPosition?: "left" | "right";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  loading = false,
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  const { colors } = useTheme();

  const sizeConfig = {
    sm: { py: 8, px: 14, fontSize: 13, iconSize: 16 },
    md: { py: 12, px: 20, fontSize: 15, iconSize: 18 },
    lg: { py: 16, px: 28, fontSize: 17, iconSize: 20 },
  }[size];

  const variantStyles: Record<string, { container: ViewStyle; text: TextStyle; iconColor: string }> = {
    primary: {
      container: { backgroundColor: colors.primary },
      text: { color: colors.textInverse },
      iconColor: colors.textInverse,
    },
    secondary: {
      container: { backgroundColor: colors.secondaryLight },
      text: { color: colors.textPrimary },
      iconColor: colors.textSecondary,
    },
    outline: {
      container: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.primary },
      text: { color: colors.primary },
      iconColor: colors.primary,
    },
    ghost: {
      container: { backgroundColor: "transparent" },
      text: { color: colors.primary },
      iconColor: colors.primary,
    },
    danger: {
      container: { backgroundColor: colors.danger },
      text: { color: colors.textInverse },
      iconColor: colors.textInverse,
    },
  };

  const vs = variantStyles[variant];

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 12,
          paddingVertical: sizeConfig.py,
          paddingHorizontal: sizeConfig.px,
          opacity: disabled ? 0.5 : 1,
          gap: 8,
        },
        vs.container,
        fullWidth && { width: "100%" },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={vs.iconColor} />
      ) : (
        <>
          {icon && iconPosition === "left" && (
            <Ionicons name={icon} size={sizeConfig.iconSize} color={vs.iconColor} />
          )}
          <Text style={[{ fontSize: sizeConfig.fontSize, fontWeight: "600" }, vs.text]}>
            {label}
          </Text>
          {icon && iconPosition === "right" && (
            <Ionicons name={icon} size={sizeConfig.iconSize} color={vs.iconColor} />
          )}
        </>
      )}
    </TouchableOpacity>
  );
}
