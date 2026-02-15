import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Alert, ActivityIndicator, Share } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { api } from '@/lib/api';
import * as Clipboard from 'expo-clipboard';

interface ReferralStats {
  totalReferrals: number;
  totalPointsEarned: number;
  activeReferrals: number;
  pendingReferrals: number;
}

interface Referral {
  id: string;
  createdAt: string;
  user?: { firstName: string; lastName: string };
  member?: { status: string; joinDate: string };
}

export default function ReferralsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: codeData, isLoading: loadingCode, isError: codeError, refetch: refetchCode } = useQuery({
    queryKey: ['/api/referrals/my-code'],
    queryFn: async () => {
      const response = await api.get('/api/referrals/my-code');
      if (!response.success) throw new Error(response.error || 'Failed to load code');
      return response.data as { referralCode: string; isNew: boolean };
    },
  });

  const { data: statsData, isLoading: loadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['/api/referrals/stats'],
    queryFn: async () => {
      const response = await api.get('/api/referrals/stats');
      if (!response.success) throw new Error(response.error || 'Failed to load stats');
      return response.data as ReferralStats;
    },
  });

  const { data: referralsData, isLoading: loadingList, refetch: refetchList } = useQuery({
    queryKey: ['/api/referrals/my-referrals'],
    queryFn: async () => {
      const response = await api.get('/api/referrals/my-referrals');
      if (!response.success) throw new Error(response.error || 'Failed to load referrals');
      return response.data as Referral[];
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchCode(), refetchStats(), refetchList()]);
    setRefreshing(false);
  }, [refetchCode, refetchStats, refetchList]);

  const referralCode = codeData?.referralCode || '';
  const stats = statsData;
  const referrals = referralsData || [];

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert('Error', 'Could not copy to clipboard');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join APC Connect and help build Nigeria's future! Use my referral code: ${referralCode}`,
      });
    } catch {
      // User cancelled
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'pending': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const isLoading = loadingCode || loadingStats;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00A86B" />
      </View>
    );
  }

  if (codeError) {
    return <ErrorState message="Failed to load referral data" onRetry={() => { refetchCode(); refetchStats(); refetchList(); }} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A86B" />}
    >
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text variant="h2" style={styles.statValue}>{stats?.totalReferrals || 0}</Text>
          <Text variant="caption" style={styles.statLabel}>Total Referrals</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text variant="h2" style={[styles.statValue, { color: '#00A86B' }]}>{stats?.totalPointsEarned || 0}</Text>
          <Text variant="caption" style={styles.statLabel}>Points Earned</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text variant="h2" style={styles.statValue}>{stats?.activeReferrals || 0}</Text>
          <Text variant="caption" style={styles.statLabel}>Active</Text>
        </Card>
      </View>

      <Card style={styles.codeCard}>
        <Text variant="caption" style={styles.codeLabel}>Your Referral Code</Text>
        <View style={styles.codeRow}>
          <View style={styles.codeBox}>
            <Text variant="h2" style={styles.codeText}>{referralCode}</Text>
          </View>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={22} color={copied ? '#10B981' : '#00A86B'} />
          </TouchableOpacity>
        </View>

        <View style={styles.shareRow}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
            <Text variant="caption" style={styles.shareBtnText}>Share Code</Text>
          </TouchableOpacity>
        </View>
      </Card>

      <Card style={styles.howItWorksCard}>
        <Text variant="body" style={{ fontWeight: '600', marginBottom: 12 }}>How It Works</Text>
        {[
          'Share your unique referral code with friends',
          'They register using your code',
          'You earn 100 points when they complete registration!',
        ].map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepCircle}>
              <Text variant="caption" style={styles.stepNum}>{i + 1}</Text>
            </View>
            <Text variant="body" style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </Card>

      <Text variant="h3" style={styles.sectionTitle}>Your Referrals</Text>
      {loadingList ? (
        <ActivityIndicator color="#00A86B" />
      ) : referrals.length > 0 ? (
        referrals.map((ref) => (
          <Card key={ref.id} style={styles.refItem}>
            <View style={styles.refRow}>
              <View style={styles.refAvatar}>
                <Ionicons name="person" size={18} color="#6B7280" />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: '600', fontSize: 14 }}>
                  {ref.user?.firstName || 'Unknown'} {ref.user?.lastName || ''}
                </Text>
                <Text variant="caption" style={{ color: '#9CA3AF' }}>
                  Joined {formatDate(ref.member?.joinDate || ref.createdAt)}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(ref.member?.status)}20` }]}>
                <Text variant="caption" style={[styles.statusText, { color: getStatusColor(ref.member?.status) }]}>
                  {ref.member?.status || 'pending'}
                </Text>
              </View>
            </View>
          </Card>
        ))
      ) : (
        <EmptyState icon="people-outline" title="No referrals yet" subtitle="Share your code to start earning points!" />
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, alignItems: 'center', padding: 14 },
  statValue: { fontWeight: '700', color: '#111827' },
  statLabel: { color: '#6B7280', marginTop: 2 },
  codeCard: { padding: 20, marginBottom: 16 },
  codeLabel: { color: '#6B7280', fontWeight: '600', marginBottom: 10 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  codeBox: { flex: 1, backgroundColor: '#F0FDF4', borderRadius: 10, borderWidth: 2, borderColor: '#00A86B', padding: 14, alignItems: 'center' },
  codeText: { fontWeight: '800', color: '#00A86B', letterSpacing: 3 },
  copyBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  shareRow: { marginTop: 14 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#00A86B', paddingVertical: 12, borderRadius: 10 },
  shareBtnText: { color: '#FFFFFF', fontWeight: '600' },
  howItWorksCard: { padding: 16, marginBottom: 20, backgroundColor: '#FAFAFA' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  stepCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center' },
  stepNum: { fontWeight: '700', color: '#00A86B', fontSize: 12 },
  stepText: { flex: 1, color: '#374151', fontSize: 14 },
  sectionTitle: { color: '#111827', marginBottom: 12 },
  refItem: { padding: 14, marginBottom: 8 },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  refAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
});
