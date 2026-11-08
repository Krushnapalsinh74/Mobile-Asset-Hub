import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { ActivityIndicator, AppState, AppStateStatus, Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider, useApp } from "@/context/AppContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 0,
      refetchOnMount: false,
      refetchOnWindowFocus: true,
    },
  },
});

function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

const HEADER_STYLE = {
  headerStyle: { backgroundColor: '#F4EEE5' },
  headerTintColor: '#C85C3E',
  headerTitleStyle: {
    fontFamily: 'Inter_600SemiBold',
    color: '#3D2D27',
    fontSize: 16,
  },
  headerBackTitle: 'Back',
} as const;

function RootLayoutNav() {
  const { isLoaded, studentEmail, boardId, standardId } = useApp();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const firstSegment = (segments[0] as string | undefined) ?? '';
    const isPublicRoute = firstSegment === 'welcome' || firstSegment === 'login' || firstSegment === 'register';

    if (!studentEmail) {
      if (!isPublicRoute) {
        router.replace('/welcome');
      }
    } else {
      if (isPublicRoute) {
        if (!boardId || !standardId) {
          router.replace('/onboarding');
        } else {
          router.replace('/subjects');
        }
      }
    }
  }, [isLoaded, studentEmail, boardId, standardId, segments]);

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4EEE5' }}>
        <ActivityIndicator size="large" color="#C85C3E" />
      </View>
    );
  }

  return (
    <Stack screenOptions={HEADER_STYLE}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="subjects" options={{ headerShown: false }} />
      <Stack.Screen name="subject" options={{ headerShown: false }} />
      <Stack.Screen name="chapters" options={{ headerShown: false }} />
      <Stack.Screen name="topics" options={{ headerShown: false }} />
      <Stack.Screen name="topic-dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="chat" options={{ headerShown: false }} />
      <Stack.Screen name="test-config" options={{ headerShown: false }} />
      <Stack.Screen name="test-quiz" options={{ headerShown: false }} />
      <Stack.Screen name="explanation" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="history" options={{ headerShown: false }} />
      <Stack.Screen name="saved" options={{ headerShown: false }} />
      <Stack.Screen name="mistakes" options={{ headerShown: false }} />
      <Stack.Screen name="questions-pdf" options={{ headerShown: false }} />
      <Stack.Screen name="flashcard" options={{ headerShown: false }} />
      <Stack.Screen name="checkout" options={{ headerShown: false }} />
      <Stack.Screen name="payment" options={{ headerShown: false }} />
      <Stack.Screen name="classroom-slides" options={{ headerShown: false }} />
      <Stack.Screen name="report-card" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  // Load Ionicons separately — icons must always render regardless of CDN font status
  const [iconFontsLoaded, iconFontError] = useFonts({
    ...Ionicons.font,
  });

  // Load Inter fonts separately — these load from Google Fonts CDN on web and may be slower
  const [interFontsLoaded, interFontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const iconsReady = iconFontsLoaded || !!iconFontError;
  const interReady = interFontsLoaded || !!interFontError;

  useEffect(() => {
    if (iconsReady && interReady) {
      SplashScreen.hideAsync();
    }
  }, [iconsReady, interReady]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  // Wait until icon fonts are ready (they load from local Metro assets — should be fast).
  // Proceed even if Inter CDN fonts fail, so icons are never blocked.
  if (!iconsReady) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AppProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AppProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
