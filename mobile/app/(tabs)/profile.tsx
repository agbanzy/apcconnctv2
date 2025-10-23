import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { auth } from '@/lib/auth';
import { storage } from '@/lib/storage';

export default function ProfileScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const data = await storage.getUserData();
    setUserData(data);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await auth.logout();
              router.replace('/(auth)/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (!userData) {
    return (
      <View style={styles.centerContainer}>
        <Text variant="body">Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text variant="h1" style={styles.avatarText}>
              {userData.user?.firstName?.charAt(0)}
              {userData.user?.lastName?.charAt(0)}
            </Text>
          </View>
        </View>

        <Text variant="h2" style={styles.name}>
          {userData.user?.firstName} {userData.user?.lastName}
        </Text>

        <Text variant="caption" style={styles.email}>
          {userData.user?.email}
        </Text>

        <View style={styles.memberInfo}>
          <View style={styles.infoRow}>
            <Text variant="caption" style={styles.label}>
              Member ID:
            </Text>
            <Text variant="body" style={styles.value}>
              {userData.member?.memberId}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text variant="caption" style={styles.label}>
              Status:
            </Text>
            <View
              style={[
                styles.statusBadge,
                userData.member?.status === 'active'
                  ? styles.statusActive
                  : styles.statusPending,
              ]}
            >
              <Text variant="caption" style={styles.statusText}>
                {userData.member?.status?.toUpperCase()}
              </Text>
            </View>
          </View>

          {userData.member?.referralCode && (
            <View style={styles.infoRow}>
              <Text variant="caption" style={styles.label}>
                Referral Code:
              </Text>
              <Text variant="body" style={[styles.value, styles.referralCode]}>
                {userData.member.referralCode}
              </Text>
            </View>
          )}
        </View>
      </Card>

      {userData.member?.status === 'pending' && (
        <Card style={styles.verificationCard}>
          <Text variant="h3" style={styles.verificationTitle}>
            Verify Your Account
          </Text>
          <Text variant="caption" style={styles.verificationText}>
            Complete NIN verification to activate your account and access all features
          </Text>
          <Button
            title="Verify NIN"
            onPress={() => {}}
            style={styles.verifyButton}
          />
        </Card>
      )}

      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem}>
          <Text variant="body">Edit Profile</Text>
          <Text variant="caption" style={styles.chevron}>
            ›
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text variant="body">Settings</Text>
          <Text variant="caption" style={styles.chevron}>
            ›
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text variant="body">Help & Support</Text>
          <Text variant="caption" style={styles.chevron}>
            ›
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text variant="body">About APC Connect</Text>
          <Text variant="caption" style={styles.chevron}>
            ›
          </Text>
        </TouchableOpacity>
      </View>

      <Button
        title="Logout"
        onPress={handleLogout}
        variant="outline"
        loading={loading}
        disabled={loading}
        style={styles.logoutButton}
      />

      <Text variant="caption" style={styles.version}>
        Version 1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00A86B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
  },
  name: {
    marginBottom: 4,
  },
  email: {
    color: '#6B7280',
    marginBottom: 20,
  },
  memberInfo: {
    width: '100%',
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: '#6B7280',
  },
  value: {
    fontWeight: '600',
  },
  referralCode: {
    color: '#00A86B',
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontWeight: '600',
    fontSize: 12,
  },
  verificationCard: {
    marginBottom: 16,
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  verificationTitle: {
    marginBottom: 8,
  },
  verificationText: {
    color: '#6B7280',
    marginBottom: 16,
  },
  verifyButton: {
    marginTop: 8,
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  chevron: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  logoutButton: {
    marginBottom: 16,
  },
  version: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginBottom: 32,
  },
});
