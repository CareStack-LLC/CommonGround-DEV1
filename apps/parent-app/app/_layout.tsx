import "../global.css";

import { useEffect, useCallback } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { DailyCallProvider } from "@commonground/daily-video";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { NotificationProvider } from "@/providers/NotificationProvider";
import { RealtimeProvider } from "@/providers/RealtimeProvider";
import { IncomingCallProvider } from "@/providers/IncomingCallProvider";
import { ThemeProvider, useTheme } from "@/theme";
import { configureAPI, videoAPIAdapter } from "@/lib/api";

// Configure API on app start
configureAPI();

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isLoading, isAuthenticated } = useAuth();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return null;
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
        ) : (
          <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
        )}
        <Stack.Screen
          name="call/[sessionId]"
          options={{
            presentation: "fullScreenModal",
            animation: "slide_from_bottom",
          }}
        />
        {/* Feature screens */}
        <Stack.Screen name="family" />
        <Stack.Screen name="accords" />
        <Stack.Screen name="agreements" />
        <Stack.Screen name="expenses" />
        <Stack.Screen name="events" />
        <Stack.Screen name="exchange" />
        <Stack.Screen name="messages" />
        <Stack.Screen name="circle" />
        <Stack.Screen name="schedule" />
        <Stack.Screen name="custody" />
        <Stack.Screen name="recordings" />
        <Stack.Screen name="exports" />
        <Stack.Screen name="activity" />
        <Stack.Screen name="wallet" />
        <Stack.Screen name="settings" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "DMSans-Regular": require("../assets/fonts/DMSans-Regular.ttf"),
    "DMSans-Medium": require("../assets/fonts/DMSans-Medium.ttf"),
    "DMSans-SemiBold": require("../assets/fonts/DMSans-SemiBold.ttf"),
    "DMSans-Bold": require("../assets/fonts/DMSans-Bold.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <RealtimeProvider>
                <IncomingCallProvider>
                  <DailyCallProvider userType="parent" videoAPI={videoAPIAdapter}>
                    <RootLayoutNav />
                  </DailyCallProvider>
                </IncomingCallProvider>
              </RealtimeProvider>
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
