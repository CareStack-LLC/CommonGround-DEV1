import { Tabs } from "expo-router";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type TabIconProps = {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
  label: string;
  emoji: string;
};

function TabIcon({ emoji, focused, label }: TabIconProps) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 4, width: 65 }}>
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text
        style={{
          fontSize: 10,
          marginTop: 2,
          fontWeight: '600',
          color: focused ? '#9333ea' : '#9ca3af',
          textAlign: 'center',
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

export default function MainTabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#9333ea",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 0,
          height: 80,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 20,
          position: "absolute",
        },
        tabBarShowLabel: false,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="home"
              emoji="🏠"
              color={color}
              focused={focused}
              label="Home"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="circle"
        options={{
          title: "My Circle",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="people"
              emoji="👨‍👩‍👧‍👦"
              color={color}
              focused={focused}
              label="Circle"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="theater"
        options={{
          title: "Theater",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="tv"
              emoji="🎬"
              color={color}
              focused={focused}
              label="Theater"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="arcade"
        options={{
          title: "Arcade",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="game-controller"
              emoji="🎮"
              color={color}
              focused={focused}
              label="Arcade"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="book"
              emoji="📚"
              color={color}
              focused={focused}
              label="Library"
            />
          ),
        }}
      />
    </Tabs>
  );
}
