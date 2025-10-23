import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useState } from 'react';

export default function EventsScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ['/api/events'],
    queryFn: async () => {
      const response = await api.get('/api/events');
      return response.data;
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text variant="body">Loading events...</Text>
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
        <Text variant="h2">Upcoming Events</Text>
        <Text variant="caption" style={styles.subtitle}>
          {events?.length || 0} events available
        </Text>
      </View>

      {events && events.length > 0 ? (
        events.map((event: any) => (
          <Card key={event.id} style={styles.eventCard}>
            <View style={styles.eventHeader}>
              <Text variant="h3" style={styles.eventTitle}>
                {event.title}
              </Text>
              <View style={styles.categoryBadge}>
                <Text variant="caption" style={styles.categoryText}>
                  {event.category}
                </Text>
              </View>
            </View>

            <Text variant="body" style={styles.eventDescription} numberOfLines={2}>
              {event.description}
            </Text>

            <View style={styles.eventDetails}>
              <Text variant="caption" style={styles.detailText}>
                📅 {formatDate(event.date)}
              </Text>
              <Text variant="caption" style={styles.detailText}>
                📍 {event.location}
              </Text>
            </View>

            <Button
              title="RSVP"
              onPress={() => {}}
              variant="outline"
              style={styles.rsvpButton}
            />
          </Card>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text variant="h3" style={styles.emptyText}>
            No events available
          </Text>
          <Text variant="caption" style={styles.emptySubtext}>
            Check back later for upcoming events
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
  eventCard: {
    marginBottom: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventTitle: {
    flex: 1,
    marginRight: 8,
  },
  categoryBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: '#0369A1',
    fontWeight: '600',
  },
  eventDescription: {
    color: '#6B7280',
    marginBottom: 12,
  },
  eventDetails: {
    marginBottom: 16,
  },
  detailText: {
    color: '#6B7280',
    marginBottom: 4,
  },
  rsvpButton: {
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
