import { useState, useEffect, useRef } from 'react';
import {
  View, TouchableOpacity, StyleSheet, Animated, Dimensions,
  TouchableWithoutFeedback, Platform, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { storage } from '@/lib/storage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.78;

interface DrawerItem {
  label: string;
  icon: string;
  route: string;
}

const DRAWER_ITEMS: DrawerItem[] = [
  { label: 'Election Day', icon: 'shield-checkmark-outline', route: '/election-day' },
  { label: 'Tasks', icon: 'clipboard-outline', route: '/tasks' },
  { label: 'Rewards', icon: 'gift-outline', route: '/rewards' },
  { label: 'Donations', icon: 'heart-outline', route: '/donations' },
  { label: 'Referrals', icon: 'people-outline', route: '/referrals' },
  { label: 'Dues', icon: 'card-outline', route: '/dues' },
];

interface SideDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export function SideDrawer({ visible, onClose }: SideDrawerProps) {
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [userData, setUserData] = useState<any>(null);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setIsRendered(false));
    }
  }, [visible]);

  const loadUser = async () => {
    const data = await storage.getUserData();
    setUserData(data);
  };

  const handleNavigate = (route: string) => {
    onClose();
    setTimeout(() => {
      router.push(route as any);
    }, 250);
  };

  if (!isRendered) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.drawerHeader}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.userInfo}>
            <Text variant="body" style={styles.userName}>
              {userData?.user?.firstName || 'Member'} {userData?.user?.lastName || ''}
            </Text>
            <Text variant="caption" style={styles.userEmail}>
              {userData?.user?.email || ''}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.drawerContent}>
          <Text variant="caption" style={styles.sectionLabel}>FEATURES</Text>
          {DRAWER_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.drawerItem}
              onPress={() => handleNavigate(item.route)}
              activeOpacity={0.7}
            >
              <View style={styles.drawerItemIcon}>
                <Ionicons name={item.icon as any} size={22} color="#374151" />
              </View>
              <Text variant="body" style={styles.drawerItemLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </TouchableOpacity>
          ))}

          <View style={styles.divider} />
          <Text variant="caption" style={styles.sectionLabel}>NAVIGATION</Text>

          <TouchableOpacity
            style={styles.drawerItem}
            onPress={() => handleNavigate('/(tabs)')}
            activeOpacity={0.7}
          >
            <View style={styles.drawerItemIcon}>
              <Ionicons name="home-outline" size={22} color="#374151" />
            </View>
            <Text variant="body" style={styles.drawerItemLabel}>Home</Text>
            <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.drawerItem}
            onPress={() => handleNavigate('/(tabs)/profile')}
            activeOpacity={0.7}
          >
            <View style={styles.drawerItemIcon}>
              <Ionicons name="person-outline" size={22} color="#374151" />
            </View>
            <Text variant="body" style={styles.drawerItemLabel}>Profile</Text>
            <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.drawerFooter}>
          <Text variant="caption" style={styles.footerText}>APC Connect v1.0</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  drawerHeader: {
    backgroundColor: '#00A86B',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  userEmail: {
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerContent: {
    flex: 1,
    paddingTop: 12,
  },
  sectionLabel: {
    color: '#9CA3AF',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
  },
  drawerItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerItemLabel: {
    flex: 1,
    fontWeight: '500',
    color: '#374151',
    fontSize: 15,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 20,
    marginVertical: 8,
  },
  drawerFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
  },
  footerText: {
    color: '#9CA3AF',
  },
});
