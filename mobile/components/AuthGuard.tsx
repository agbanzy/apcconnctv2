import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { auth } from '@/lib/auth';
import * as SecureStore from 'expo-secure-store';

interface AuthContextType {
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ refreshAuth: async () => {} });

export const useAuthRefresh = () => useContext(AuthContext);

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  const checkAuth = useCallback(async () => {
    try {
      const [authenticated, onboardingFlag] = await Promise.all([
        auth.isAuthenticated(),
        SecureStore.getItemAsync('onboarding_completed'),
      ]);
      setIsAuthenticated(authenticated);
      setHasSeenOnboarding(onboardingFlag === 'true');
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setHasSeenOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!hasSeenOnboarding && !inOnboarding) {
      router.replace('/onboarding');
    } else if (hasSeenOnboarding && !isAuthenticated && !inAuthGroup && !inOnboarding) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && (inAuthGroup || inOnboarding)) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, hasSeenOnboarding, segments, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00A86B" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ refreshAuth: checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
