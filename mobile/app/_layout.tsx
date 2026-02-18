import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { queryClient, persister } from '@/lib/queryClient';
import { AuthGuard } from '@/components/AuthGuard';
import { OfflineBanner } from '@/components/OfflineBanner';
import { auth } from '@/lib/auth';
import { registerForPushNotifications, setupNotificationListeners } from '@/lib/push-notifications';

SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const router = useRouter();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  // Setup online manager to track connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = state.isConnected && state.isInternetReachable;
      onlineManager.setOnline(!!isOnline);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Initialize push notifications after user is authenticated
  useEffect(() => {
    const initializePushNotifications = async () => {
      const isAuthenticated = await auth.isAuthenticated();

      if (isAuthenticated) {
        // Register for push notifications
        const registerResult = await registerForPushNotifications();
        if (registerResult.success) {
          console.log('Push notifications registered successfully');
        } else {
          console.warn('Failed to register push notifications:', registerResult.message);
        }
      }
    };

    initializePushNotifications();
  }, []);

  // Set up notification listeners
  useEffect(() => {
    const cleanupListeners = setupNotificationListeners(
      // Notification received while app is open
      (notification) => {
        console.log('Notification received:', notification);
      },
      // Notification response (user tapped notification)
      (response) => {
        const data = response.notification.request.content.data;
        console.log('Notification tapped:', data);

        // Handle deep linking based on notification type
        if (data?.type && data?.id) {
          handleNotificationNavigation(data.type, data.id);
        }
      }
    );

    return () => {
      cleanupListeners?.();
    };
  }, [router]);

  const handleNotificationNavigation = (type: string, id: string) => {
    switch (type) {
      case 'task':
        router.push(`/tasks/${id}`);
        break;
      case 'event':
        router.push(`/events/${id}`);
        break;
      case 'election':
        router.push(`/election-day`);
        break;
      case 'news':
        router.push(`/knowledge-base`);
        break;
      case 'campaign':
        router.push(`/campaigns/${id}`);
        break;
      case 'donation':
        router.push(`/donations`);
        break;
      case 'volunteer':
        router.push(`/volunteer`);
        break;
      default:
        // Default to home/dashboard
        router.push('/(tabs)/home');
    }
  };

  return (
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
            <Stack.Screen
              name="manage-agents"
              options={{
                headerShown: true,
                headerTitle: 'Manage Agents',
                headerStyle: { backgroundColor: '#1E40AF' },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: { fontWeight: '600' },
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="digital-id"
              options={{
                headerShown: true,
                headerTitle: 'Digital ID Card',
                headerStyle: { backgroundColor: '#00A86B' },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: { fontWeight: '600' },
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="points"
              options={{
                headerShown: true,
                headerTitle: 'Points',
                headerStyle: { backgroundColor: '#00A86B' },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: { fontWeight: '600' },
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="volunteer"
              options={{
                headerShown: true,
                headerTitle: 'Volunteer',
                headerStyle: { backgroundColor: '#00A86B' },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: { fontWeight: '600' },
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="leaderboard"
              options={{
                headerShown: true,
                headerTitle: 'Leaderboard',
                headerStyle: { backgroundColor: '#00A86B' },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: { fontWeight: '600' },
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="campaigns"
              options={{
                headerShown: true,
                headerTitle: 'Campaigns',
                headerStyle: { backgroundColor: '#00A86B' },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: { fontWeight: '600' },
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="knowledge-base"
              options={{
                headerShown: true,
                headerTitle: 'Knowledge Base',
                headerStyle: { backgroundColor: '#00A86B' },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: { fontWeight: '600' },
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="quizzes"
              options={{
                headerShown: true,
                headerTitle: 'Quizzes',
                headerStyle: { backgroundColor: '#00A86B' },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: { fontWeight: '600' },
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="ideas"
              options={{
                headerShown: true,
                headerTitle: 'Ideas',
                headerStyle: { backgroundColor: '#00A86B' },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: { fontWeight: '600' },
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="search"
              options={{
                headerShown: true,
                headerTitle: 'Search',
                headerStyle: { backgroundColor: '#00A86B' },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: { fontWeight: '600' },
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="notification-settings"
              options={{
                headerShown: true,
                headerTitle: 'Notifications',
                headerStyle: { backgroundColor: '#00A86B' },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: { fontWeight: '600' },
                animation: 'slide_from_right',
              }}
            />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
      onSuccess={() => {
        // Optional: Handle successful persistence hydration
      }}
    >
      <SafeAreaProvider>
        <OfflineBanner />
        <AuthGuard>
          <RootLayoutContent />
        </AuthGuard>
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  );
}
