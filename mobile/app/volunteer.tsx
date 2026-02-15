import { useState, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
  Modal, ActivityIndicator, Alert
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';

interface VolunteerTask {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  pointsReward: number;
  taskScope: string;
  location?: string;
  maxVolunteers?: number;
  currentVolunteers?: number;
  expiresAt?: string;
  createdAt: string;
  isApplied?: boolean;
}

const CATEGORIES = ['All', 'Voter Registration', 'Community Outreach', 'Event Support', 'Digital Campaign', 'Ward Mobilization'];

const PRIORITY_COLORS: Record<string, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981',
};

export default function VolunteerScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTask, setSelectedTask] = useState<VolunteerTask | null>(null);
  const queryClient = useQueryClient();

  const { data: tasks, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/tasks/volunteer', selectedCategory],
    queryFn: async () => {
      const catParam = selectedCategory !== 'All' ? `?category=${encodeURIComponent(selectedCategory)}` : '';
      const response = await api.get(`/api/tasks/volunteer${catParam}`);
      if (!response.success) throw new Error(response.error || 'Failed to load tasks');
      return (response.data as any)?.tasks || response.data as VolunteerTask[];
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await api.post(`/api/tasks/${taskId}/apply`);
      if (!response.success) throw new Error(response.error || 'Failed to apply');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/volunteer'] });
      Alert.alert('Applied!', 'You have successfully applied for this task.');
      setSelectedTask(null);
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message || 'Failed to apply');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
      </View>
    );
  }

  if (error) {
    return <ErrorState message="Failed to load volunteer tasks" onRetry={refetch} />;
  }

  const taskList = Array.isArray(tasks) ? tasks : [];

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryContainer}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text variant="caption" style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A86B" />}
      >
        <View style={styles.header}>
          <Ionicons name="hand-left" size={28} color="#00A86B" />
          <Text variant="h2" style={styles.headerTitle}>Volunteer</Text>
          <View style={styles.taskCount}>
            <Text variant="caption" style={styles.taskCountText}>{taskList.length} tasks</Text>
          </View>
        </View>

        {taskList.length > 0 ? (
          taskList.map((task) => (
            <TouchableOpacity key={task.id} activeOpacity={0.7} onPress={() => setSelectedTask(task)}>
              <Card style={styles.taskCard}>
                <View style={styles.taskHeader}>
                  <View style={{ flex: 1 }}>
                    <Text variant="h3" style={styles.taskTitle}>{task.title}</Text>
                    <View style={styles.taskMeta}>
                      <View style={[styles.priorityBadge, { backgroundColor: `${PRIORITY_COLORS[task.priority] || '#6B7280'}15` }]}>
                        <Text variant="caption" style={[styles.priorityText, { color: PRIORITY_COLORS[task.priority] || '#6B7280' }]}>
                          {task.priority}
                        </Text>
                      </View>
                      <View style={styles.categoryBadge}>
                        <Text variant="caption" style={styles.categoryText}>{task.category}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.pointsBadge}>
                    <Ionicons name="star" size={14} color="#F59E0B" />
                    <Text variant="body" style={styles.pointsText}>{task.pointsReward}</Text>
                  </View>
                </View>
                <Text variant="body" style={styles.taskDesc} numberOfLines={2}>{task.description}</Text>
                <View style={styles.taskFooter}>
                  {task.location && (
                    <View style={styles.footerItem}>
                      <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                      <Text variant="caption" style={styles.footerText}>{task.taskScope}</Text>
                    </View>
                  )}
                  {task.expiresAt && (
                    <View style={styles.footerItem}>
                      <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                      <Text variant="caption" style={styles.footerText}>Due {formatDate(task.expiresAt)}</Text>
                    </View>
                  )}
                  {task.maxVolunteers && (
                    <View style={styles.footerItem}>
                      <Ionicons name="people-outline" size={14} color="#9CA3AF" />
                      <Text variant="caption" style={styles.footerText}>
                        {task.currentVolunteers || 0}/{task.maxVolunteers}
                      </Text>
                    </View>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          ))
        ) : (
          <EmptyState icon="hand-left-outline" title="No volunteer tasks" subtitle="Check back later for new volunteer opportunities!" />
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={!!selectedTask} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedTask(null)}>
        {selectedTask && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text variant="h3" style={{ flex: 1 }}>Task Details</Text>
              <TouchableOpacity onPress={() => setSelectedTask(null)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <Text variant="h2" style={styles.modalTitle}>{selectedTask.title}</Text>
              <View style={styles.modalMeta}>
                <View style={[styles.priorityBadge, { backgroundColor: `${PRIORITY_COLORS[selectedTask.priority] || '#6B7280'}15` }]}>
                  <Text variant="caption" style={[styles.priorityText, { color: PRIORITY_COLORS[selectedTask.priority] || '#6B7280' }]}>
                    {selectedTask.priority} priority
                  </Text>
                </View>
                <View style={styles.categoryBadge}>
                  <Text variant="caption" style={styles.categoryText}>{selectedTask.category}</Text>
                </View>
                <View style={styles.pointsBadge}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text variant="body" style={styles.pointsText}>{selectedTask.pointsReward} pts</Text>
                </View>
              </View>
              <Text variant="body" style={styles.modalDesc}>{selectedTask.description}</Text>

              <View style={styles.modalDetails}>
                {selectedTask.taskScope && (
                  <View style={styles.detailRow}>
                    <Ionicons name="globe-outline" size={18} color="#6B7280" />
                    <Text variant="body" style={styles.detailText}>Scope: {selectedTask.taskScope}</Text>
                  </View>
                )}
                {selectedTask.expiresAt && (
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={18} color="#6B7280" />
                    <Text variant="body" style={styles.detailText}>Expires: {formatDate(selectedTask.expiresAt)}</Text>
                  </View>
                )}
                {selectedTask.maxVolunteers && (
                  <View style={styles.detailRow}>
                    <Ionicons name="people-outline" size={18} color="#6B7280" />
                    <Text variant="body" style={styles.detailText}>
                      Volunteers: {selectedTask.currentVolunteers || 0} / {selectedTask.maxVolunteers}
                    </Text>
                  </View>
                )}
              </View>

              <Button
                title={selectedTask.isApplied ? 'Already Applied' : 'Apply for Task'}
                onPress={() => applyMutation.mutate(selectedTask.id)}
                disabled={selectedTask.isApplied || applyMutation.isPending}
                style={{ marginTop: 24 }}
              />
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  categoryScroll: { maxHeight: 52, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  categoryContainer: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F3F4F6' },
  categoryChipActive: { backgroundColor: '#00A86B' },
  categoryChipText: { color: '#6B7280', fontWeight: '500', fontSize: 12 },
  categoryChipTextActive: { color: '#FFFFFF' },
  scrollView: { flex: 1 },
  content: { padding: 16, paddingTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  headerTitle: { fontWeight: '700', color: '#111827', flex: 1 },
  taskCount: { backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  taskCountText: { color: '#00A86B', fontWeight: '600', fontSize: 12 },
  taskCard: { marginBottom: 12 },
  taskHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  taskTitle: { fontWeight: '600', color: '#111827', fontSize: 15, marginBottom: 6 },
  taskMeta: { flexDirection: 'row', gap: 6 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  priorityText: { fontWeight: '600', fontSize: 10, textTransform: 'capitalize' },
  categoryBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  categoryText: { color: '#6B7280', fontSize: 10, fontWeight: '500' },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pointsText: { color: '#F59E0B', fontWeight: '700', fontSize: 13 },
  taskDesc: { color: '#6B7280', fontSize: 13, lineHeight: 18, marginBottom: 10 },
  taskFooter: { flexDirection: 'row', gap: 12 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { color: '#9CA3AF', fontSize: 11 },
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalContent: { padding: 16 },
  modalTitle: { fontWeight: '700', color: '#111827', fontSize: 20, marginBottom: 12 },
  modalMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  modalDesc: { color: '#374151', fontSize: 14, lineHeight: 22, marginBottom: 16 },
  modalDetails: { gap: 12, marginTop: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailText: { color: '#374151', fontSize: 14 },
});
