/**
 * Bottom Navigation Bar Component
 * Reusable tab bar for screens outside the (tabs) group
 */

import { View, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useTheme } from "@/theme";

type TabItem = {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  route: string;
  label: string;
};

const TABS: TabItem[] = [
  { name: "index", icon: "home-outline", iconFocused: "home", route: "/(tabs)", label: "Dashboard" },
  { name: "messages", icon: "chatbubble-outline", iconFocused: "chatbubble", route: "/(tabs)/messages", label: "Chat" },
  { name: "schedule", icon: "calendar-outline", iconFocused: "calendar", route: "/(tabs)/schedule", label: "Calendar" },
  { name: "clearfund", icon: "wallet-outline", iconFocused: "wallet", route: "/(tabs)/clearfund", label: "Clearfund" },
  { name: "files", icon: "folder-outline", iconFocused: "folder", route: "/(tabs)/files", label: "Files" },
];

export function BottomNavBar() {
  const pathname = usePathname();
  const { colors } = useTheme();

  // Determine which tab is active based on current path
  const getActiveTab = () => {
    if (pathname.includes("/messages")) return "messages";
    if (pathname.includes("/schedule") || pathname.includes("/exchange") || pathname.includes("/events")) return "schedule";
    if (pathname.includes("/clearfund") || pathname.includes("/expenses")) return "clearfund";
    if (pathname.includes("/files") || pathname.includes("/family") || pathname.includes("/agreements") || pathname.includes("/accords")) return "files";
    return "index";
  };

  const activeTab = getActiveTab();

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.tabBarBackground,
        borderTopColor: colors.tabBarBorder,
        borderTopWidth: 1,
        paddingTop: 8,
        paddingBottom: 28,
        paddingHorizontal: 8,
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => router.push(tab.route as any)}
          >
            <Ionicons
              name={isActive ? tab.iconFocused : tab.icon}
              size={22}
              color={isActive ? colors.tabBarActive : colors.tabBarInactive}
            />
            <Text
              style={{
                fontSize: 11,
                fontWeight: "500",
                marginTop: 4,
                color: isActive ? colors.tabBarActive : colors.tabBarInactive,
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
