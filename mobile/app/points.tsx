import { useState, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';

interface PointsData {
  totalPoints: number;
  breakdown: { source: string; total: number; count: number }[];
}

const SOURCE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  referral: { label: 'Referrals', icon: 'people', color: '#3B82F6' },
  task: { label: 'Tasks', icon: 'clipboard', color: '#10B981' },
  quiz: { label: 'Quizzes', icon: 'school', color: '#8B5CF6' },
  event: { label: 'Events', icon: 'calendar', color: '#F59E0B' },
  engagement: { label: 'Engagement', icon: 'heart', color: '#EF4444' },
  dues: { label: 'Dues Payment', icon: 'card', color: '#06B6D4' },
  admin: { label: 'Admin Award', icon: 'shield', color: '#6366F1' },
  purchase: { label: 'Purchased', icon: 'cart', color: '#EC4899' },
  donation: { label: 'Donations', icon: 'gift', color: '#14B8A6' },
  vote: { label: 'Voting', icon: 'checkmark-circle', color: '#00A86B' },
  campaign: { label: 'Campaigns', icon: 'megaphone', color: '#F97316' },
  idea: { label: 'Ideas', icon: 'bulb', color: '#EAB308' },
};

export default function PointsScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: pointsData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/points/my-points'],
    queryFn: async () => {
      const response = await api.get('/api/points/my-points');
      if (!response.success) throw new Error(response.error || 'Failed to load points');
      return response.data as PointsData;
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
      </View>
    );
  }

  if (error) {
    return <ErrorState message="Failed to load points" onRetry={refetch} />;
  }

  const breakdown = pointsData?.breakdown || [];
  const totalPoints = pointsData?.totalPoints || 0;
  const sortedBreakdown = [...breakdown].sort((a, b) => Number(b.total) - Number(a.total));

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A86B" />}
      >
        <View style={styles.header}>
          <Ionicons name="star" size={28} color="#F59E0B" />
          <Text variant="h2" style={styles.headerTitle}>My Points</Text>
        </View>

        <Card style={styles.totalCard}>
          <View style={styles.totalInner}>
            <View style={styles.totalIconCircle}>
              <Ionicons name="diamond" size={32} color="#F59E0B" />
            </View>
            <Text variant="h1" style={styles.totalPoints}>{totalPoints.toLocaleString()}</Text>
            <Text variant="body" style={styles.totalLabel}>Total Points Earned</Text>
          </View>
        </Card>

        <Text variant="h3" style={styles.sectionTitle}>Points Breakdown</Text>

        {sortedBreakdown.length > 0 ? (
          sortedBreakdown.map((item) => {
            const config = SOURCE_LABELS[item.source] || { label: item.source, icon: 'ellipse', color: '#6B7280' };
            const percentage = totalPoints > 0 ? (Number(item.total) / totalPoints) * 100 : 0;
            return (
              <Card key={item.source} style={styles.breakdownCard}>
                <View style={styles.breakdownRow}>
                  <View style={[styles.sourceIcon, { backgroundColor: `${config.color}15` }]}>
                    <Ionicons name={config.icon as any} size={20} color={config.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.breakdownHeader}>
                      <Text variant="body" style={styles.sourceName}>{config.label}</Text>
                      <Text variant="body" style={styles.sourcePoints}>+{Number(item.total).toLocaleString()}</Text>
                    </View>
                    <View style={styles.breakdownMeta}>
                      <Text variant="caption" style={styles.sourceCount}>{Number(item.count)} time{Number(item.count) !== 1 ? 's' : ''}</Text>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: config.color }]} />
                      </View>
                      <Text variant="caption" style={styles.percentText}>{percentage.toFixed(0)}%</Text>
                    </View>
                  </View>
                </View>
              </Card>
            );
          })
        ) : (
          <EmptyState icon="star-outline" title="No points yet" subtitle="Complete tasks, quizzes, and events to earn points!" />
        )}

        <Card style={styles.tipCard}>
          <View style={styles.tipRow}>
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <View style={{ flex: 1 }}>
              <Text variant="body" style={styles.tipTitle}>How to earn more points</Text>
              <Text variant="caption" style={styles.tipText}>
                Complete quizzes, attend events, refer friends, pay dues, submit ideas, and participate in campaigns to earn points.
              </Text>
            </View>
          </View>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  content: { padding: 16, paddingTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  headerTitle: { fontWeight: '700', color: '#111827' },
  totalCard: { marginBottom: 24, backgroundColor: '#00A86B' },
  totalInner: { alignItems: 'center', paddingVertical: 12 },
  totalIconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  totalPoints: { color: '#FFFFFF', fontWeight: '800', fontSize: 36 },
  totalLabel: { color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  sectionTitle: { fontWeight: '600', color: '#374151', marginBottom: 12 },
  breakdownCard: { marginBottom: 8 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sourceIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  breakdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sourceName: { fontWeight: '600', color: '#374151', fontSize: 14 },
  sourcePoints: { fontWeight: '700', color: '#00A86B', fontSize: 14 },
  breakdownMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  sourceCount: { color: '#9CA3AF', fontSize: 11, width: 60 },
  progressBar: { flex: 1, height: 4, backgroundColor: '#F3F4F6', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  percentText: { color: '#9CA3AF', fontSize: 11, width: 30, textAlign: 'right' },
  tipCard: { marginTop: 16 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  tipTitle: { fontWeight: '600', color: '#374151', fontSize: 13, marginBottom: 2 },
  tipText: { color: '#6B7280', fontSize: 12, lineHeight: 18 },
});
