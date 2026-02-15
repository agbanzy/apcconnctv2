import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Modal, FlatList, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { storage } from '@/lib/storage';
import { useEffect } from 'react';

interface LeaderboardEntry {
  rank: number;
  memberId: string;
  firstName: string;
  lastName: string;
  points: number;
  state?: string;
}

interface State {
  id: string;
  name: string;
}

const TIME_PERIODS = [
  { key: 'all', label: 'All Time' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'weekly', label: 'Weekly' },
];

export default function LeaderboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('all');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedStateName, setSelectedStateName] = useState<string>('All States');
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const data = await storage.getUserData();
      setUserData(data);
    })();
  }, []);

  const { data: states } = useQuery({
    queryKey: ['/api/states'],
    queryFn: async () => {
      const response = await api.get('/api/states');
      if (!response.success) return [];
      return response.data as State[];
    },
  });

  const { data: leaderboard, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/leaderboard', period, selectedState],
    queryFn: async () => {
      let endpoint: string;
      if (selectedState) {
        endpoint = `/api/leaderboard/state/${selectedState}`;
      } else if (period === 'all') {
        endpoint = '/api/leaderboard/global';
      } else {
        endpoint = `/api/leaderboard/timeframe/${period}`;
      }
      const response = await api.get(endpoint);
      if (!response.success) throw new Error(response.error || 'Failed to load leaderboard');
      return response.data as LeaderboardEntry[];
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return { name: 'trophy' as const, color: '#F59E0B' };
    if (rank === 2) return { name: 'medal' as const, color: '#9CA3AF' };
    if (rank === 3) return { name: 'medal' as const, color: '#CD7F32' };
    return null;
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
        <Text variant="body" style={{ marginTop: 12, color: '#6B7280' }}>Loading leaderboard...</Text>
      </View>
    );
  }

  if (error) {
    return <ErrorState message="Could not load leaderboard" onRetry={() => refetch()} />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.periodScroll}
        contentContainerStyle={styles.periodContainer}
      >
        {TIME_PERIODS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodChip, period === p.key && styles.periodChipActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text
              variant="caption"
              style={[styles.periodChipText, period === p.key && styles.periodChipTextActive]}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.stateFilterRow}>
        <TouchableOpacity style={styles.stateSelector} onPress={() => setShowStatePicker(true)}>
          <Ionicons name="location-outline" size={16} color="#374151" />
          <Text variant="body" style={styles.stateSelectorText} numberOfLines={1}>{selectedStateName}</Text>
          <Ionicons name="chevron-down" size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A86B" />}
      >
        <View style={styles.header}>
          <Ionicons name="trophy" size={28} color="#F59E0B" />
          <Text variant="h2" style={styles.headerTitle}>Leaderboard</Text>
        </View>

        {leaderboard && leaderboard.length > 0 ? (
          <>
            {leaderboard.slice(0, 3).length > 0 && (
              <View style={styles.topThree}>
                {leaderboard.slice(0, 3).map((entry, index) => (
                  <View key={entry.memberId} style={[styles.topCard, index === 0 && styles.topCardFirst]}>
                    <View style={[styles.rankBadge, { backgroundColor: index === 0 ? '#F59E0B' : index === 1 ? '#9CA3AF' : '#CD7F32' }]}>
                      <Text variant="caption" style={styles.rankBadgeText}>{entry.rank}</Text>
                    </View>
                    <View style={[styles.topAvatar, index === 0 && styles.topAvatarFirst]}>
                      <Text variant="body" style={styles.topAvatarText}>
                        {entry.firstName?.[0]}{entry.lastName?.[0]}
                      </Text>
                    </View>
                    <Text variant="body" style={styles.topName} numberOfLines={1}>
                      {entry.firstName} {entry.lastName?.[0]}.
                    </Text>
                    <Text variant="caption" style={styles.topPoints}>
                      {entry.points?.toLocaleString()} pts
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {leaderboard.slice(3).map((entry) => {
              const isMe = userData?.member?.memberId === entry.memberId;
              return (
                <View key={entry.memberId} style={[styles.listItem, isMe && styles.listItemMe]}>
                  <Text variant="body" style={styles.listRank}>#{entry.rank}</Text>
                  <View style={styles.listAvatar}>
                    <Text variant="caption" style={styles.listAvatarText}>
                      {entry.firstName?.[0]}{entry.lastName?.[0]}
                    </Text>
                  </View>
                  <View style={styles.listInfo}>
                    <Text variant="body" style={[styles.listName, isMe && styles.listNameMe]}>
                      {entry.firstName} {entry.lastName}
                      {isMe ? ' (You)' : ''}
                    </Text>
                    {entry.state && (
                      <Text variant="caption" style={styles.listState}>{entry.state}</Text>
                    )}
                  </View>
                  <Text variant="body" style={styles.listPoints}>
                    {entry.points?.toLocaleString()}
                  </Text>
                </View>
              );
            })}
          </>
        ) : (
          <EmptyState
            icon="trophy-outline"
            title="No rankings yet"
            subtitle="Be the first to earn points and climb the leaderboard!"
          />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showStatePicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowStatePicker(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text variant="h3">Select State</Text>
            <TouchableOpacity onPress={() => setShowStatePicker(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.stateOption, !selectedState && styles.stateOptionActive]}
            onPress={() => { setSelectedState(null); setSelectedStateName('All States'); setShowStatePicker(false); }}
          >
            <Text variant="body" style={[styles.stateOptionText, !selectedState && styles.stateOptionTextActive]}>All States</Text>
            {!selectedState && <Ionicons name="checkmark" size={20} color="#00A86B" />}
          </TouchableOpacity>
          <FlatList
            data={states || []}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.stateOption, selectedState === item.id && styles.stateOptionActive]}
                onPress={() => { setSelectedState(item.id); setSelectedStateName(item.name); setShowStatePicker(false); }}
              >
                <Text variant="body" style={[styles.stateOptionText, selectedState === item.id && styles.stateOptionTextActive]}>{item.name}</Text>
                {selectedState === item.id && <Ionicons name="checkmark" size={20} color="#00A86B" />}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  stateFilterRow: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  stateSelector: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F3F4F6', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  stateSelectorText: { flex: 1, fontWeight: '500', color: '#374151' },
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  stateOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  stateOptionActive: { backgroundColor: '#F0FDF4' },
  stateOptionText: { color: '#374151', fontWeight: '500' },
  stateOptionTextActive: { color: '#00A86B', fontWeight: '600' },
  periodScroll: { maxHeight: 56, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  periodContainer: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, flexDirection: 'row' },
  periodChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  periodChipActive: { backgroundColor: '#00A86B' },
  periodChipText: { color: '#6B7280', fontWeight: '600' },
  periodChipTextActive: { color: '#FFFFFF' },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  headerTitle: { color: '#111827' },
  topThree: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 12, marginBottom: 24, paddingHorizontal: 8 },
  topCard: { alignItems: 'center', flex: 1 },
  topCardFirst: { marginTop: -12 },
  rankBadge: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  rankBadgeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  topAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#00A86B', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  topAvatarFirst: { width: 72, height: 72, borderRadius: 36 },
  topAvatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  topName: { fontWeight: '600', fontSize: 13, color: '#111827', textAlign: 'center' },
  topPoints: { color: '#00A86B', fontWeight: '700', fontSize: 13 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, marginBottom: 8 },
  listItemMe: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#00A86B' },
  listRank: { width: 36, fontWeight: '700', color: '#6B7280', textAlign: 'center' },
  listAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  listAvatarText: { color: '#374151', fontWeight: '600', fontSize: 13 },
  listInfo: { flex: 1 },
  listName: { fontWeight: '500', color: '#111827' },
  listNameMe: { color: '#00A86B', fontWeight: '700' },
  listState: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  listPoints: { fontWeight: '700', color: '#00A86B' },
});
