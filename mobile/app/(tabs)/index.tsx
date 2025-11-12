import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { NigeriaMap } from '@/components/NigeriaMap';
import { api } from '@/lib/api';
import { storage } from '@/lib/storage';

export default function DashboardScreen() {
  const [userData, setUserData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const data = await storage.getUserData();
    setUserData(data);
  };

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['/api/analytics/member-overview'],
    queryFn: async () => {
      const response = await api.get('/api/analytics/member-overview');
      return response.data;
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    await loadUserData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A86B" />
      }
    >
      <View style={styles.welcomeSection}>
        <Text variant="h2" style={styles.welcomeText}>
          Welcome back, {userData?.user?.firstName || 'Member'}! 👋
        </Text>
        <Text variant="caption" style={styles.memberIdText}>
          Member ID: {userData?.member?.memberId || 'Loading...'}
        </Text>
        
        {userData?.member?.status === 'pending' && (
          <Card style={styles.warningCard}>
            <Text variant="caption" style={styles.warningText}>
              ⚠️ Please verify your NIN to activate your account
            </Text>
          </Card>
        )}
      </View>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text variant="h2" style={styles.statValue}>
            {stats?.points || 0}
          </Text>
          <Text variant="caption" style={styles.statLabel}>
            Points Earned
          </Text>
        </Card>

        <Card style={styles.statCard}>
          <Text variant="h2" style={styles.statValue}>
            {stats?.badges || 0}
          </Text>
          <Text variant="caption" style={styles.statLabel}>
            Badges
          </Text>
        </Card>
      </View>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text variant="h2" style={styles.statValue}>
            {stats?.eventsAttended || 0}
          </Text>
          <Text variant="caption" style={styles.statLabel}>
            Events
          </Text>
        </Card>

        <Card style={styles.statCard}>
          <Text variant="h2" style={styles.statValue}>
            {stats?.tasksCompleted || 0}
          </Text>
          <Text variant="caption" style={styles.statLabel}>
            Tasks Done
          </Text>
        </Card>
      </View>

      <View style={styles.mapSection}>
        <Text variant="h3" style={styles.sectionTitle}>
          APC Nationwide
        </Text>
        <Card>
          <NigeriaMap mode="members" />
        </Card>
      </View>

      <View style={styles.quickActions}>
        <Text variant="h3" style={styles.sectionTitle}>
          Quick Actions
        </Text>

        <Card style={styles.actionCard}>
          <Text variant="body" style={styles.actionTitle}>
            📚 Take a Quiz
          </Text>
          <Text variant="caption" style={styles.actionSubtitle}>
            Test your political knowledge
          </Text>
        </Card>

        <Card style={styles.actionCard}>
          <Text variant="body" style={styles.actionTitle}>
            🎯 Complete Tasks
          </Text>
          <Text variant="caption" style={styles.actionSubtitle}>
            Earn points and badges
          </Text>
        </Card>

        <Card style={styles.actionCard}>
          <Text variant="body" style={styles.actionTitle}>
            📅 Upcoming Events
          </Text>
          <Text variant="caption" style={styles.actionSubtitle}>
            RSVP to party events
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeText: {
    color: '#111827',
    marginBottom: 4,
  },
  memberIdText: {
    color: '#6B7280',
  },
  warningCard: {
    marginTop: 12,
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  warningText: {
    color: '#92400E',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  statValue: {
    color: '#00A86B',
    fontWeight: '700',
  },
  statLabel: {
    color: '#6B7280',
    marginTop: 4,
  },
  mapSection: {
    marginTop: 12,
    marginBottom: 12,
  },
  quickActions: {
    marginTop: 12,
  },
  sectionTitle: {
    marginBottom: 16,
    color: '#111827',
  },
  actionCard: {
    marginBottom: 12,
    padding: 16,
  },
  actionTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  actionSubtitle: {
    color: '#6B7280',
  },
});
