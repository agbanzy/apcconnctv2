import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Dimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { storage } from '@/lib/storage';
import { Ionicons } from '@expo/vector-icons';

interface MemberStats {
  points: number;
  badges: number;
  eventsAttended: number;
  tasksCompleted: number;
  rank?: number;
  totalMembers?: number;
}

interface RecentNews {
  id: string;
  title: string;
  category: string;
  createdAt: string;
}

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  location: string;
}

interface ActiveTask {
  id: string;
  title: string;
  points: number;
  type: string;
}

export default function DashboardScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const data = await storage.getUserData();
    setUserData(data);
  };

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['/api/analytics/member-overview'],
    queryFn: async () => {
      const response = await api.get('/api/analytics/member-overview');
      return response.data as MemberStats;
    },
  });

  const { data: recentNews, refetch: refetchNews } = useQuery({
    queryKey: ['/api/news', 'recent'],
    queryFn: async () => {
      const response = await api.get('/api/news?limit=3');
      return response.data as RecentNews[];
    },
  });

  const { data: upcomingEvents, refetch: refetchEvents } = useQuery({
    queryKey: ['/api/events', 'upcoming'],
    queryFn: async () => {
      const response = await api.get('/api/events?limit=3');
      return response.data as UpcomingEvent[];
    },
  });

  const { data: activeTasks, refetch: refetchTasks } = useQuery({
    queryKey: ['/api/micro-tasks', 'active'],
    queryFn: async () => {
      const response = await api.get('/api/micro-tasks?limit=3');
      return response.data as ActiveTask[];
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchStats(),
      refetchNews(),
      refetchEvents(),
      refetchTasks(),
      loadUserData(),
    ]);
    setRefreshing(false);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
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
          {getGreeting()}, {userData?.user?.firstName || 'Member'}!
        </Text>
        <View style={styles.memberIdRow}>
          <Text variant="caption" style={styles.memberIdText}>
            Member ID: {userData?.member?.memberId || 'Loading...'}
          </Text>
          {userData?.member?.status === 'active' && (
            <View style={styles.activeBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text variant="caption" style={styles.activeText}>Active</Text>
            </View>
          )}
        </View>
        
        {userData?.member?.status === 'pending' && (
          <Card style={styles.warningCard}>
            <View style={styles.warningContent}>
              <Ionicons name="warning" size={20} color="#F59E0B" />
              <View style={styles.warningTextContainer}>
                <Text variant="body" style={styles.warningTitle}>Verify Your Account</Text>
                <Text variant="caption" style={styles.warningText}>
                  Complete NIN verification to access all features
                </Text>
              </View>
            </View>
            <Button
              title="Verify Now"
              onPress={() => router.push('/(tabs)/profile')}
              variant="outline"
              style={styles.verifyButton}
            />
          </Card>
        )}
      </View>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Ionicons name="trophy" size={24} color="#00A86B" />
          <Text variant="h2" style={styles.statValue}>
            {stats?.points?.toLocaleString() || 0}
          </Text>
          <Text variant="caption" style={styles.statLabel}>
            Points
          </Text>
        </Card>

        <Card style={styles.statCard}>
          <Ionicons name="ribbon" size={24} color="#8B5CF6" />
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
          <Ionicons name="calendar" size={24} color="#3B82F6" />
          <Text variant="h2" style={styles.statValue}>
            {stats?.eventsAttended || 0}
          </Text>
          <Text variant="caption" style={styles.statLabel}>
            Events
          </Text>
        </Card>

        <Card style={styles.statCard}>
          <Ionicons name="checkmark-done" size={24} color="#10B981" />
          <Text variant="h2" style={styles.statValue}>
            {stats?.tasksCompleted || 0}
          </Text>
          <Text variant="caption" style={styles.statLabel}>
            Tasks Done
          </Text>
        </Card>
      </View>

      {stats?.rank && (
        <Card style={styles.rankCard}>
          <View style={styles.rankContent}>
            <View style={styles.rankInfo}>
              <Text variant="caption" style={styles.rankLabel}>Your Rank</Text>
              <Text variant="h2" style={styles.rankValue}>#{stats.rank}</Text>
            </View>
            <View style={styles.rankDivider} />
            <View style={styles.rankInfo}>
              <Text variant="caption" style={styles.rankLabel}>Total Members</Text>
              <Text variant="h2" style={styles.rankValue}>{stats.totalMembers?.toLocaleString()}</Text>
            </View>
          </View>
        </Card>
      )}

      {recentNews && recentNews.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="h3" style={styles.sectionTitle}>Latest News</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/news')}>
              <Text variant="caption" style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {recentNews.slice(0, 3).map((news) => (
            <TouchableOpacity 
              key={news.id} 
              style={styles.newsItem}
              onPress={() => router.push('/(tabs)/news')}
            >
              <View style={styles.newsIcon}>
                <Ionicons name="newspaper-outline" size={20} color="#00A86B" />
              </View>
              <View style={styles.newsContent}>
                <Text variant="body" style={styles.newsTitle} numberOfLines={2}>
                  {news.title}
                </Text>
                <Text variant="caption" style={styles.newsDate}>
                  {formatDate(news.createdAt)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {upcomingEvents && upcomingEvents.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="h3" style={styles.sectionTitle}>Upcoming Events</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
              <Text variant="caption" style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {upcomingEvents.slice(0, 3).map((event) => (
            <TouchableOpacity 
              key={event.id} 
              style={styles.eventItem}
              onPress={() => router.push('/(tabs)/events')}
            >
              <View style={styles.eventDate}>
                <Text variant="caption" style={styles.eventMonth}>
                  {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                </Text>
                <Text variant="h2" style={styles.eventDay}>
                  {new Date(event.date).getDate()}
                </Text>
              </View>
              <View style={styles.eventContent}>
                <Text variant="body" style={styles.eventTitle} numberOfLines={1}>
                  {event.title}
                </Text>
                <Text variant="caption" style={styles.eventLocation} numberOfLines={1}>
                  {event.location}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text variant="h3" style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/(tabs)/elections')}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="checkmark-circle-outline" size={28} color="#3B82F6" />
            </View>
            <Text variant="caption" style={styles.quickActionLabel}>Vote</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/(tabs)/events')}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="calendar-outline" size={28} color="#10B981" />
            </View>
            <Text variant="caption" style={styles.quickActionLabel}>Events</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/(tabs)/news')}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="newspaper-outline" size={28} color="#F59E0B" />
            </View>
            <Text variant="caption" style={styles.quickActionLabel}>News</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/(tabs)/profile')}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="person-outline" size={28} color="#8B5CF6" />
            </View>
            <Text variant="caption" style={styles.quickActionLabel}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomSpacer} />
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
  memberIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberIdText: {
    color: '#6B7280',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  activeText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '600',
  },
  warningCard: {
    marginTop: 16,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    color: '#92400E',
    fontWeight: '600',
    marginBottom: 2,
  },
  warningText: {
    color: '#B45309',
  },
  verifyButton: {
    borderColor: '#F59E0B',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    gap: 4,
  },
  statValue: {
    color: '#111827',
    fontWeight: '700',
  },
  statLabel: {
    color: '#6B7280',
  },
  rankCard: {
    marginBottom: 20,
    backgroundColor: '#00A86B',
  },
  rankContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankInfo: {
    flex: 1,
    alignItems: 'center',
  },
  rankLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  rankValue: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  rankDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#111827',
  },
  seeAll: {
    color: '#00A86B',
    fontWeight: '600',
  },
  newsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  newsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newsContent: {
    flex: 1,
  },
  newsTitle: {
    fontWeight: '500',
    marginBottom: 2,
  },
  newsDate: {
    color: '#9CA3AF',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  eventDate: {
    width: 48,
    height: 48,
    backgroundColor: '#00A86B',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventMonth: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  eventDay: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: -2,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  eventLocation: {
    color: '#6B7280',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: (Dimensions.get('window').width - 56) / 4,
    alignItems: 'center',
    gap: 8,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 20,
  },
});
