import "../global.css";

import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { DailyCallProvider } from "@commonground/daily-video";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { NotificationProvider } from "@/providers/NotificationProvider";
import { RealtimeProvider } from "@/providers/RealtimeProvider";
import { IncomingCallProvider } from "@/providers/IncomingCallProvider";
import { useColorScheme } from "@/hooks/useColorScheme";
import { configureAPI, videoAPIAdapter } from "@/lib/api";

// Configure API on app start
configureAPI();

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isLoading, isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();

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
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colorScheme === "dark" ? "#0f172a" : "#ffffff",
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
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
