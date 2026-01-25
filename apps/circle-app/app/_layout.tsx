import "../global.css";

import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { DailyCallProvider } from "@commonground/daily-video";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { configureAPI, videoAPIAdapter } from "@/lib/api";

// Configure API on app start
configureAPI();

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isLoading, isAuthenticated } = useAuth();

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
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: "#ffffff",
          },
          animation: "slide_from_right",
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
        ) : (
          <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
        )}
        <Stack.Screen
          name="call/[childId]"
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
          <DailyCallProvider userType="circle" videoAPI={videoAPIAdapter}>
            <RootLayoutNav />
          </DailyCallProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
