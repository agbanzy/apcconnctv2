import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { queryClient } from '@/lib/queryClient';
import { AuthGuard } from '@/components/AuthGuard';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthGuard>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="tasks"
              options={{
                headerShown: true,
                headerTitle: 'Tasks',
                headerStyle: { backgroundColor: '#00A86B' },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: { fontWeight: '600' },
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="rewards"
              options={{
                headerShown: true,
                headerTitle: 'Points & Rewards',
                headerStyle: { backgroundColor: '#00A86B' },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: { fontWeight: '600' },
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="donations"
              options={{
                headerShown: true,
                headerTitle: 'Donations',
                headerStyle: { backgroundColor: '#00A86B' },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: { fontWeight: '600' },
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="referrals"
              options={{
                headerShown: true,
                headerTitle: 'Referral Program',
                headerStyle: { backgroundColor: '#00A86B' },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: { fontWeight: '600' },
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="dues"
              options={{
                headerShown: true,
                headerTitle: 'Membership Dues',
                headerStyle: { backgroundColor: '#00A86B' },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: { fontWeight: '600' },
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="election-day"
              options={{
                headerShown: true,
                headerTitle: 'Election Day',
                headerStyle: { backgroundColor: '#1E40AF' },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: { fontWeight: '600' },
                animation: 'slide_from_right',
              }}
            />
          </Stack>
        </AuthGuard>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
