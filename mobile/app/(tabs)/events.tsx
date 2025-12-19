import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Alert, Modal, Linking } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';

interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  time?: string;
  endDate?: string;
  location: string;
  address?: string;
  capacity?: number;
  currentAttendees?: number;
  isOnline?: boolean;
  meetingLink?: string;
  state?: {
    name: string;
  };
  hasRsvped?: boolean;
  rsvpId?: string;
}

export default function EventsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const queryClient = useQueryClient();

  const categories = [
    { key: 'all', label: 'All Events' },
    { key: 'rally', label: 'Rallies' },
    { key: 'town_hall', label: 'Town Halls' },
    { key: 'training', label: 'Training' },
    { key: 'meeting', label: 'Meetings' },
  ];

  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ['/api/events', selectedCategory],
    queryFn: async () => {
      const url = selectedCategory === 'all' 
        ? '/api/events' 
        : `/api/events?category=${selectedCategory}`;
      const response = await api.get(url);
      return response.data as Event[];
    },
  });

  const rsvpMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await api.post(`/api/events/${eventId}/rsvp`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      Alert.alert('Success', 'You have successfully RSVPed to this event!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to RSVP to event');
    },
  });

  const cancelRsvpMutation = useMutation({
    mutationFn: async ({ eventId, rsvpId }: { eventId: string; rsvpId: string }) => {
      const response = await api.delete(`/api/events/${eventId}/rsvp/${rsvpId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      Alert.alert('Cancelled', 'Your RSVP has been cancelled');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to cancel RSVP');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleRsvp = (event: Event) => {
    if (event.hasRsvped && event.rsvpId) {
      Alert.alert(
        'Cancel RSVP',
        'Are you sure you want to cancel your RSVP for this event?',
        [
          { text: 'No', style: 'cancel' },
          { 
            text: 'Yes, Cancel', 
            style: 'destructive',
            onPress: () => cancelRsvpMutation.mutate({ eventId: event.id, rsvpId: event.rsvpId! })
          },
        ]
      );
    } else {
      rsvpMutation.mutate(event.id);
    }
  };

  const handleOpenMeetingLink = (link: string) => {
    Linking.openURL(link).catch(() => {
      Alert.alert('Error', 'Unable to open meeting link');
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'rally':
        return '#00A86B';
      case 'town_hall':
        return '#3B82F6';
      case 'training':
        return '#8B5CF6';
      case 'meeting':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case 'rally':
        return 'megaphone-outline';
      case 'town_hall':
        return 'people-outline';
      case 'training':
        return 'school-outline';
      case 'meeting':
        return 'chatbubbles-outline';
      default:
        return 'calendar-outline';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text variant="body">Loading events...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.categoryChip,
              selectedCategory === cat.key && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Text
              variant="caption"
              style={[
                styles.categoryChipText,
                selectedCategory === cat.key && styles.categoryChipTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
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
          events.map((event) => (
            <Card key={event.id} style={styles.eventCard}>
              <TouchableOpacity onPress={() => setSelectedEvent(event)}>
                <View style={styles.eventHeader}>
                  <View style={styles.eventDateBox}>
                    <Text variant="caption" style={styles.eventMonth}>
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                    </Text>
                    <Text variant="h2" style={styles.eventDay}>
                      {new Date(event.date).getDate()}
                    </Text>
                  </View>
                  
                  <View style={styles.eventInfo}>
                    <View style={styles.eventTitleRow}>
                      <Text variant="h3" style={styles.eventTitle} numberOfLines={2}>
                        {event.title}
                      </Text>
                    </View>
                    
                    <View style={styles.eventMeta}>
                      <View style={[
                        styles.categoryBadge,
                        { backgroundColor: `${getCategoryColor(event.category)}20` }
                      ]}>
                        <Ionicons 
                          name={getCategoryIcon(event.category)} 
                          size={12} 
                          color={getCategoryColor(event.category)} 
                        />
                        <Text 
                          variant="caption" 
                          style={[styles.categoryText, { color: getCategoryColor(event.category) }]}
                        >
                          {event.category.replace('_', ' ')}
                        </Text>
                      </View>
                      
                      {event.isOnline && (
                        <View style={styles.onlineBadge}>
                          <Ionicons name="videocam" size={12} color="#3B82F6" />
                          <Text variant="caption" style={styles.onlineText}>Online</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <View style={styles.eventDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={16} color="#6B7280" />
                    <Text variant="caption" style={styles.detailText}>
                      {formatTime(event.date)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color="#6B7280" />
                    <Text variant="caption" style={styles.detailText} numberOfLines={1}>
                      {event.location}
                    </Text>
                  </View>
                  {event.capacity && (
                    <View style={styles.detailRow}>
                      <Ionicons name="people-outline" size={16} color="#6B7280" />
                      <Text variant="caption" style={styles.detailText}>
                        {event.currentAttendees || 0} / {event.capacity} attending
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.eventActions}>
                <Button
                  title={event.hasRsvped ? "Cancel RSVP" : "RSVP"}
                  onPress={() => handleRsvp(event)}
                  variant={event.hasRsvped ? "outline" : "primary"}
                  loading={rsvpMutation.isPending || cancelRsvpMutation.isPending}
                  style={styles.rsvpButton}
                />
                <TouchableOpacity 
                  style={styles.detailsButton}
                  onPress={() => setSelectedEvent(event)}
                >
                  <Text variant="caption" style={styles.detailsButtonText}>Details</Text>
                </TouchableOpacity>
              </View>

              {event.hasRsvped && (
                <View style={styles.rsvpConfirmed}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text variant="caption" style={styles.rsvpConfirmedText}>You're attending</Text>
                </View>
              )}
            </Card>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
            <Text variant="h3" style={styles.emptyText}>
              No events available
            </Text>
            <Text variant="caption" style={styles.emptySubtext}>
              Check back later for upcoming events
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!selectedEvent}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedEvent(null)}
      >
        {selectedEvent && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text variant="h3">Event Details</Text>
              <TouchableOpacity onPress={() => setSelectedEvent(null)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text variant="h2" style={styles.modalTitle}>{selectedEvent.title}</Text>
              
              <View style={styles.modalSection}>
                <View style={styles.modalDetailRow}>
                  <Ionicons name="calendar-outline" size={20} color="#00A86B" />
                  <Text variant="body">{formatDate(selectedEvent.date)}</Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Ionicons name="time-outline" size={20} color="#00A86B" />
                  <Text variant="body">{formatTime(selectedEvent.date)}</Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Ionicons name="location-outline" size={20} color="#00A86B" />
                  <View style={styles.modalLocationText}>
                    <Text variant="body">{selectedEvent.location}</Text>
                    {selectedEvent.address && (
                      <Text variant="caption" style={styles.addressText}>{selectedEvent.address}</Text>
                    )}
                  </View>
                </View>
                {selectedEvent.capacity && (
                  <View style={styles.modalDetailRow}>
                    <Ionicons name="people-outline" size={20} color="#00A86B" />
                    <Text variant="body">
                      {selectedEvent.currentAttendees || 0} / {selectedEvent.capacity} spots filled
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.modalSection}>
                <Text variant="h3" style={styles.modalSectionTitle}>Description</Text>
                <Text variant="body" style={styles.modalDescription}>{selectedEvent.description}</Text>
              </View>

              {selectedEvent.isOnline && selectedEvent.meetingLink && (
                <Button
                  title="Join Online Meeting"
                  onPress={() => handleOpenMeetingLink(selectedEvent.meetingLink!)}
                  variant="outline"
                  style={styles.meetingButton}
                />
              )}

              <Button
                title={selectedEvent.hasRsvped ? "Cancel RSVP" : "RSVP to Event"}
                onPress={() => {
                  handleRsvp(selectedEvent);
                  setSelectedEvent(null);
                }}
                variant={selectedEvent.hasRsvped ? "outline" : "primary"}
                style={styles.modalRsvpButton}
              />
            </ScrollView>
          </View>
        )}
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
  categoryScroll: {
    maxHeight: 56,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#00A86B',
  },
  categoryChipText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
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
    gap: 12,
    marginBottom: 12,
  },
  eventDateBox: {
    width: 56,
    height: 56,
    backgroundColor: '#00A86B',
    borderRadius: 12,
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
    fontSize: 20,
    fontWeight: '700',
    marginTop: -2,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitleRow: {
    marginBottom: 6,
  },
  eventTitle: {
    color: '#111827',
  },
  eventMeta: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontWeight: '600',
    fontSize: 11,
    textTransform: 'capitalize',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  onlineText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 11,
  },
  eventDetails: {
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    color: '#6B7280',
    flex: 1,
  },
  eventActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rsvpButton: {
    flex: 1,
  },
  detailsButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  detailsButtonText: {
    color: '#00A86B',
    fontWeight: '600',
  },
  rsvpConfirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  rsvpConfirmedText: {
    color: '#10B981',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    gap: 8,
  },
  emptyText: {
    color: '#6B7280',
  },
  emptySubtext: {
    color: '#9CA3AF',
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
  modalTitle: {
    marginBottom: 20,
  },
  modalSection: {
    marginBottom: 24,
    gap: 12,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  modalLocationText: {
    flex: 1,
  },
  addressText: {
    color: '#6B7280',
    marginTop: 2,
  },
  modalSectionTitle: {
    marginBottom: 8,
  },
  modalDescription: {
    color: '#6B7280',
    lineHeight: 24,
  },
  meetingButton: {
    marginBottom: 12,
  },
  modalRsvpButton: {
    marginBottom: 32,
  },
});
