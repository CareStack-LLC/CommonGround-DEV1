import { View, Text, Image } from "react-native";
import { useTheme } from "@/theme";

interface AvatarProps {
  name: string;
  size?: number;
  imageUrl?: string;
  color?: string;
}

export function Avatar({ name, size = 40, imageUrl, color }: AvatarProps) {
  const { colors } = useTheme();

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const bgColor = color || colors.primary;

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bgColor,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: colors.textInverse,
          fontSize: size * 0.38,
          fontWeight: "700",
          letterSpacing: 0.5,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}
