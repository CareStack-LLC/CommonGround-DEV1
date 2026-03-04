import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type IconName = keyof typeof Ionicons.glyphMap;

// CommonGround Design System Colors
const SAGE = "#4A6C58";
const SLATE_LIGHT = "#94A3B8";
const WHITE = "#FFFFFF";
const SAND = "#F5F0E8";

function TabBarIcon({ name, color }: { name: IconName; color: string }) {
  return <Ionicons size={22} name={name} color={color} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: SAGE,
        tabBarInactiveTintColor: SLATE_LIGHT,
        tabBarStyle: {
          backgroundColor: WHITE,
          borderTopColor: SAND,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 28,
          height: 80,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
          marginTop: 4,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? "home" : "home-outline"} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? "chatbubble" : "chatbubble-outline"} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? "calendar" : "calendar-outline"} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="clearfund"
        options={{
          title: "Clearfund",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? "wallet" : "wallet-outline"} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="files"
        options={{
          title: "Files",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? "folder" : "folder-outline"} color={color} />
          ),
        }}
      />
      {/* Hidden tabs */}
      <Tabs.Screen name="family" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
