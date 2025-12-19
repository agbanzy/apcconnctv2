import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity, Modal, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { auth } from '@/lib/auth';
import { storage } from '@/lib/storage';
import { api } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';

interface UserProfile {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    dateOfBirth?: string;
  };
  member: {
    id: string;
    memberId: string;
    status: string;
    referralCode: string;
    nin?: string;
    ninVerified?: boolean;
    points?: number;
    ward?: {
      name: string;
      lga?: {
        name: string;
        state?: {
          name: string;
        };
      };
    };
  };
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNinModal, setShowNinModal] = useState(false);
  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [ninData, setNinData] = useState({
    nin: '',
    dateOfBirth: '',
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const data = await storage.getUserData();
    setUserData(data);
    if (data?.user) {
      setEditData({
        firstName: data.user.firstName || '',
        lastName: data.user.lastName || '',
        phone: data.user.phone || '',
      });
    }
  };

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ['/api/profile'],
    queryFn: async () => {
      const response = await api.get('/api/profile');
      return response.data as UserProfile;
    },
  });

  const { data: badges } = useQuery({
    queryKey: ['/api/profile/badges'],
    queryFn: async () => {
      const response = await api.get('/api/profile/badges');
      return response.data as Badge[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/analytics/member-overview'],
    queryFn: async () => {
      const response = await api.get('/api/analytics/member-overview');
      return response.data;
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof editData) => {
      const response = await api.patch('/api/profile', data);
      return response.data;
    },
    onSuccess: async () => {
      await refetchProfile();
      await loadUserData();
      setShowEditModal(false);
      Alert.alert('Success', 'Profile updated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update profile');
    },
  });

  const verifyNinMutation = useMutation({
    mutationFn: async (data: typeof ninData) => {
      const response = await api.post('/api/profile/verify-nin', data);
      return response.data;
    },
    onSuccess: async () => {
      await refetchProfile();
      await loadUserData();
      setShowNinModal(false);
      Alert.alert('Success', 'NIN verification submitted successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to verify NIN');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProfile(), loadUserData()]);
    setRefreshing(false);
  }, [refetchProfile]);

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

  const handleUpdateProfile = () => {
    updateProfileMutation.mutate(editData);
  };

  const handleVerifyNin = () => {
    if (!ninData.nin || ninData.nin.length !== 11) {
      Alert.alert('Error', 'Please enter a valid 11-digit NIN');
      return;
    }
    if (!ninData.dateOfBirth) {
      Alert.alert('Error', 'Please enter your date of birth');
      return;
    }
    verifyNinMutation.mutate(ninData);
  };

  const displayData = profile || userData;

  if (!displayData) {
    return (
      <View style={styles.centerContainer}>
        <Text variant="body">Loading profile...</Text>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'expired':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A86B" />
        }
      >
        <Card style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text variant="h1" style={styles.avatarText}>
                {displayData.user?.firstName?.charAt(0)}
                {displayData.user?.lastName?.charAt(0)}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.editAvatarButton}
              onPress={() => {
                setEditData({
                  firstName: displayData.user?.firstName || '',
                  lastName: displayData.user?.lastName || '',
                  phone: displayData.user?.phone || '',
                });
                setShowEditModal(true);
              }}
            >
              <Ionicons name="pencil" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text variant="h2" style={styles.name}>
            {displayData.user?.firstName} {displayData.user?.lastName}
          </Text>

          <Text variant="caption" style={styles.email}>
            {displayData.user?.email}
          </Text>

          <View style={styles.memberInfo}>
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Ionicons name="card-outline" size={18} color="#6B7280" />
                <Text variant="caption" style={styles.labelText}>Member ID</Text>
              </View>
              <Text variant="body" style={styles.infoValue}>
                {displayData.member?.memberId}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#6B7280" />
                <Text variant="caption" style={styles.labelText}>Status</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${getStatusColor(displayData.member?.status || '')}20` },
                ]}
              >
                <Ionicons 
                  name={displayData.member?.status === 'active' ? 'checkmark-circle' : 'time-outline'} 
                  size={14} 
                  color={getStatusColor(displayData.member?.status || '')} 
                />
                <Text 
                  variant="caption" 
                  style={[styles.statusText, { color: getStatusColor(displayData.member?.status || '') }]}
                >
                  {displayData.member?.status?.toUpperCase()}
                </Text>
              </View>
            </View>

            {displayData.member?.ward && (
              <View style={styles.infoRow}>
                <View style={styles.infoLabel}>
                  <Ionicons name="location-outline" size={18} color="#6B7280" />
                  <Text variant="caption" style={styles.labelText}>Location</Text>
                </View>
                <Text variant="body" style={styles.infoValue} numberOfLines={1}>
                  {displayData.member.ward.name}, {displayData.member.ward.lga?.name}
                </Text>
              </View>
            )}

            {displayData.member?.referralCode && (
              <View style={styles.infoRow}>
                <View style={styles.infoLabel}>
                  <Ionicons name="gift-outline" size={18} color="#6B7280" />
                  <Text variant="caption" style={styles.labelText}>Referral Code</Text>
                </View>
                <View style={styles.referralContainer}>
                  <Text variant="body" style={styles.referralCode}>
                    {displayData.member.referralCode}
                  </Text>
                  <TouchableOpacity onPress={() => {
                    Alert.alert('Referral Code Copied!', displayData.member?.referralCode);
                  }}>
                    <Ionicons name="copy-outline" size={18} color="#00A86B" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </Card>

        {displayData.member?.status === 'pending' && (
          <Card style={styles.verificationCard}>
            <View style={styles.verificationHeader}>
              <Ionicons name="shield" size={24} color="#3B82F6" />
              <View style={styles.verificationText}>
                <Text variant="h3">Verify Your Account</Text>
                <Text variant="caption" style={styles.verificationSubtext}>
                  Complete NIN verification to activate your account
                </Text>
              </View>
            </View>
            <Button
              title="Verify NIN"
              onPress={() => setShowNinModal(true)}
              style={styles.verifyButton}
            />
          </Card>
        )}

        {displayData.member?.ninVerified && (
          <Card style={styles.verifiedCard}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text variant="body" style={styles.verifiedText}>NIN Verified</Text>
          </Card>
        )}

        {stats && (
          <View style={styles.statsSection}>
            <Text variant="h3" style={styles.sectionTitle}>Your Stats</Text>
            <View style={styles.statsGrid}>
              <Card style={styles.miniStatCard}>
                <Text variant="h2" style={styles.miniStatValue}>{stats.points?.toLocaleString() || 0}</Text>
                <Text variant="caption" style={styles.miniStatLabel}>Points</Text>
              </Card>
              <Card style={styles.miniStatCard}>
                <Text variant="h2" style={styles.miniStatValue}>{stats.badges || 0}</Text>
                <Text variant="caption" style={styles.miniStatLabel}>Badges</Text>
              </Card>
              <Card style={styles.miniStatCard}>
                <Text variant="h2" style={styles.miniStatValue}>{stats.eventsAttended || 0}</Text>
                <Text variant="caption" style={styles.miniStatLabel}>Events</Text>
              </Card>
              <Card style={styles.miniStatCard}>
                <Text variant="h2" style={styles.miniStatValue}>{stats.tasksCompleted || 0}</Text>
                <Text variant="caption" style={styles.miniStatLabel}>Tasks</Text>
              </Card>
            </View>
          </View>
        )}

        {badges && badges.length > 0 && (
          <View style={styles.badgesSection}>
            <Text variant="h3" style={styles.sectionTitle}>Your Badges</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgesList}
            >
              {badges.map((badge) => (
                <Card key={badge.id} style={styles.badgeCard}>
                  <Text style={styles.badgeIcon}>{badge.icon}</Text>
                  <Text variant="caption" style={styles.badgeName}>{badge.name}</Text>
                </Card>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowEditModal(true)}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="person-outline" size={22} color="#374151" />
              <Text variant="body" style={styles.menuItemText}>Edit Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Coming Soon', 'Settings feature coming soon!')}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="settings-outline" size={22} color="#374151" />
              <Text variant="body" style={styles.menuItemText}>Settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Coming Soon', 'Help & Support feature coming soon!')}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="help-circle-outline" size={22} color="#374151" />
              <Text variant="body" style={styles.menuItemText}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('About APC Connect', 'Version 1.0.0\n\nA comprehensive political engagement platform for the All Progressives Congress (APC) in Nigeria.')}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="information-circle-outline" size={22} color="#374151" />
              <Text variant="body" style={styles.menuItemText}>About APC Connect</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
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

      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text variant="h3">Edit Profile</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Input
              label="First Name"
              value={editData.firstName}
              onChangeText={(text) => setEditData({ ...editData, firstName: text })}
              placeholder="Enter your first name"
            />

            <Input
              label="Last Name"
              value={editData.lastName}
              onChangeText={(text) => setEditData({ ...editData, lastName: text })}
              placeholder="Enter your last name"
            />

            <Input
              label="Phone Number"
              value={editData.phone}
              onChangeText={(text) => setEditData({ ...editData, phone: text })}
              placeholder="+234 XXX XXX XXXX"
              keyboardType="phone-pad"
            />

            <Button
              title="Save Changes"
              onPress={handleUpdateProfile}
              loading={updateProfileMutation.isPending}
              disabled={updateProfileMutation.isPending}
              style={styles.saveButton}
            />
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showNinModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNinModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text variant="h3">NIN Verification</Text>
            <TouchableOpacity onPress={() => setShowNinModal(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.ninInfo}>
              <Ionicons name="information-circle" size={20} color="#3B82F6" />
              <Text variant="caption" style={styles.ninInfoText}>
                Your NIN will be verified against the National Identity Management Commission (NIMC) database.
              </Text>
            </View>

            <Input
              label="National Identification Number (NIN)"
              value={ninData.nin}
              onChangeText={(text) => setNinData({ ...ninData, nin: text.replace(/\D/g, '').slice(0, 11) })}
              placeholder="Enter your 11-digit NIN"
              keyboardType="number-pad"
              maxLength={11}
            />

            <Input
              label="Date of Birth"
              value={ninData.dateOfBirth}
              onChangeText={(text) => setNinData({ ...ninData, dateOfBirth: text })}
              placeholder="YYYY-MM-DD"
            />

            <Button
              title="Verify NIN"
              onPress={handleVerifyNin}
              loading={verifyNinMutation.isPending}
              disabled={verifyNinMutation.isPending}
              style={styles.saveButton}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#00A86B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  name: {
    marginBottom: 4,
    textAlign: 'center',
  },
  email: {
    color: '#6B7280',
    marginBottom: 20,
  },
  memberInfo: {
    width: '100%',
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelText: {
    color: '#6B7280',
  },
  infoValue: {
    fontWeight: '600',
    maxWidth: '50%',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontWeight: '600',
    fontSize: 12,
  },
  referralContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  referralCode: {
    color: '#00A86B',
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  verificationCard: {
    marginBottom: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  verificationText: {
    flex: 1,
  },
  verificationSubtext: {
    color: '#6B7280',
    marginTop: 4,
  },
  verifyButton: {
    backgroundColor: '#3B82F6',
  },
  verifiedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    backgroundColor: '#D1FAE5',
  },
  verifiedText: {
    color: '#059669',
    fontWeight: '600',
  },
  statsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    color: '#111827',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  miniStatCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
  },
  miniStatValue: {
    color: '#00A86B',
    fontWeight: '700',
  },
  miniStatLabel: {
    color: '#6B7280',
    marginTop: 2,
  },
  badgesSection: {
    marginBottom: 16,
  },
  badgesList: {
    gap: 12,
  },
  badgeCard: {
    alignItems: 'center',
    padding: 16,
    minWidth: 80,
  },
  badgeIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  badgeName: {
    textAlign: 'center',
    color: '#374151',
    fontWeight: '500',
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
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    color: '#374151',
  },
  logoutButton: {
    marginBottom: 16,
    borderColor: '#EF4444',
  },
  version: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginBottom: 32,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  saveButton: {
    marginTop: 24,
    marginBottom: 32,
  },
  ninInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  ninInfoText: {
    color: '#1E40AF',
    flex: 1,
  },
});
