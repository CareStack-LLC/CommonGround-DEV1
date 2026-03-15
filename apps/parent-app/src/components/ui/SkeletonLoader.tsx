import { useEffect, useRef } from "react";
import { View, Animated, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";

interface SkeletonLoaderProps {
  variant?: "card" | "text" | "circle" | "custom";
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  count?: number;
}

function SkeletonItem({ width, height, borderRadius = 8, style }: Omit<SkeletonLoaderProps, "variant" | "count">) {
  const { colors, isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: isDark ? colors.surfaceElevated : colors.borderLight,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonLoader({ variant = "card", width, height, borderRadius, style, count = 1 }: SkeletonLoaderProps) {
  if (variant === "card") {
    return (
      <View style={{ gap: 12 }}>
        {Array.from({ length: count }).map((_, i) => (
          <View key={i} style={{ gap: 10, ...style }}>
            <SkeletonItem width="100%" height={20} borderRadius={6} />
            <SkeletonItem width="60%" height={16} borderRadius={6} />
            <SkeletonItem width="80%" height={16} borderRadius={6} />
          </View>
        ))}
      </View>
    );
  }

  if (variant === "text") {
    return (
      <View style={{ gap: 8 }}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonItem key={i} width={i === count - 1 ? "60%" : "100%"} height={height || 14} borderRadius={4} />
        ))}
      </View>
    );
  }

  if (variant === "circle") {
    return <SkeletonItem width={width || 40} height={height || 40} borderRadius={999} style={style} />;
  }

  return <SkeletonItem width={width} height={height} borderRadius={borderRadius} style={style} />;
}
