import { View, TouchableOpacity, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";

interface CardProps {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "outlined";
  padding?: number;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Card({ children, variant = "default", padding = 16, onPress, style }: CardProps) {
  const { colors } = useTheme();

  const baseStyle: ViewStyle = {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding,
    ...(variant === "outlined" && {
      borderWidth: 1,
      borderColor: colors.cardBorder,
    }),
    ...(variant === "default" && {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 2,
    }),
    ...(variant === "elevated" && {
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 16,
      elevation: 4,
    }),
    ...style,
  };

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={baseStyle}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={baseStyle}>{children}</View>;
}
