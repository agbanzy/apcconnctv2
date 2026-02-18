import { useEffect, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const slideAnim = new Animated.Value(0);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable;
      setIsOnline(online ?? true);

      // Animate banner entrance/exit
      Animated.timing(slideAnim, {
        toValue: online ? 0 : 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      unsubscribe();
    };
  }, [slideAnim]);

  const bannerHeight = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 48],
  });

  const bannerOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        {
          height: bannerHeight,
          opacity: bannerOpacity,
        },
      ]}
    >
      <View style={styles.bannerContent}>
        <Text style={styles.bannerText}>
          You're offline. Showing cached data.
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: '#FCD34D',
    overflow: 'hidden',
  },
  bannerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  bannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    textAlign: 'center',
  },
});
