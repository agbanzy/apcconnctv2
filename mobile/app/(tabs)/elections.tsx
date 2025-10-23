import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useState } from 'react';

export default function ElectionsScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: elections, isLoading, refetch } = useQuery({
    queryKey: ['/api/elections'],
    queryFn: async () => {
      const response = await api.get('/api/elections');
      return response.data;
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing':
        return '#10B981';
      case 'upcoming':
        return '#3B82F6';
      case 'completed':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text variant="body">Loading elections...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A86B" />
      }
    >
      <View style={styles.header}>
        <Text variant="h2">Party Elections</Text>
        <Text variant="caption" style={styles.subtitle}>
          {elections?.length || 0} elections
        </Text>
      </View>

      {elections && elections.length > 0 ? (
        elections.map((election: any) => (
          <Card key={election.id} style={styles.electionCard}>
            <View style={styles.cardHeader}>
              <View style={styles.titleSection}>
                <Text variant="h3" style={styles.electionTitle}>
                  {election.title}
                </Text>
                <Text variant="caption" style={styles.position}>
                  Position: {election.position}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${getStatusColor(election.status)}20` },
                ]}
              >
                <Text
                  variant="caption"
                  style={[styles.statusText, { color: getStatusColor(election.status) }]}
                >
                  {getStatusText(election.status)}
                </Text>
              </View>
            </View>

            {election.description && (
              <Text variant="body" style={styles.description} numberOfLines={2}>
                {election.description}
              </Text>
            )}

            <View style={styles.stats}>
              <Text variant="caption" style={styles.statText}>
                📊 Total Votes: {election.totalVotes || 0}
              </Text>
            </View>

            {election.status === 'ongoing' && (
              <Button
                title="Vote Now"
                onPress={() => {}}
                style={styles.voteButton}
              />
            )}

            {election.status === 'upcoming' && (
              <Button
                title="View Details"
                onPress={() => {}}
                variant="outline"
                style={styles.detailsButton}
              />
            )}

            {election.status === 'completed' && (
              <Button
                title="View Results"
                onPress={() => {}}
                variant="outline"
                style={styles.detailsButton}
              />
            )}
          </Card>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text variant="h3" style={styles.emptyText}>
            No elections available
          </Text>
          <Text variant="caption" style={styles.emptySubtext}>
            Check back later for party elections
          </Text>
        </View>
      )}
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
  header: {
    marginBottom: 20,
  },
  subtitle: {
    color: '#6B7280',
    marginTop: 4,
  },
  electionCard: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleSection: {
    flex: 1,
    marginRight: 12,
  },
  electionTitle: {
    marginBottom: 4,
  },
  position: {
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontWeight: '600',
    fontSize: 12,
  },
  description: {
    color: '#6B7280',
    marginBottom: 12,
  },
  stats: {
    marginBottom: 16,
  },
  statText: {
    color: '#6B7280',
  },
  voteButton: {
    marginTop: 8,
  },
  detailsButton: {
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#9CA3AF',
  },
});
