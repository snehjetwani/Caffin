import 'react-native-gesture-handler';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/lib/auth';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootNavigator />
          <StatusBar style="dark" />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { session, profile, authLoading, profileLoading } = useAuth();

  // Keep the splash up until we know whether to show tabs or auth.
  const deciding = authLoading || (!!session && profileLoading);
  useEffect(() => {
    if (!deciding) SplashScreen.hideAsync().catch(() => {});
  }, [deciding]);
  if (deciding) return null;

  // Three states, each a distinct route tree (no two screens share a URL):
  //   signed in + app-row  -> the tab app
  //   signed in, no app-row -> finish registration (step 2 never completed)
  //   signed out            -> the auth group
  const inApp = !!session && !!profile;
  const needsProfile = !!session && !profile;

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={inApp}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="session/active" options={{ gestureEnabled: false }} />
        <Stack.Screen
          name="session/review"
          options={{ presentation: 'modal', gestureEnabled: false }}
        />
        <Stack.Screen
          name="profile/[username]"
          options={{ headerShown: true, title: 'Profile', headerTintColor: colors.text }}
        />
      </Stack.Protected>
      <Stack.Protected guard={needsProfile}>
        <Stack.Screen name="complete-profile" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
