import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { AppState, AppStateStatus, Platform, View, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/context/AppContext";

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
  headerStyle: { backgroundColor: '#F5F7FF' },
  headerTintColor: '#4F46E5',
  headerTitleStyle: {
    fontFamily: 'Inter_600SemiBold',
    color: '#1E1B4B',
    fontSize: 16,
  },
  headerBackTitle: 'Back',
} as const;

function RootLayoutNav() {
  return (
    <Stack screenOptions={HEADER_STYLE}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
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
      <Stack.Screen name="pricing" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [iconFontsLoaded, iconFontError] = useFonts({
    ...Ionicons.font,
  });

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

  if (!iconsReady) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AppProvider>
            <View style={styles.webRoot}>
              <GestureHandlerRootView style={styles.appContainer}>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </View>
          </AppProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webRoot: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#0F172A' : '#ffffff',
  },
  appContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  }
});
