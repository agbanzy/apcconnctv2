import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Alert, Modal, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';

interface MicroTask {
  id: string;
  title: string;
  description: string;
  category: string;
  taskCategory?: string;
  taskScope?: string;
  points: number;
  timeEstimate: string;
  options?: string[];
  correctAnswer?: number[];
  completed?: boolean;
  maxCompletionsTotal?: number;
  currentCompletions?: number;
  expiresAt?: string;
  state?: { name: string };
  lga?: { name: string };
  ward?: { name: string };
}

interface VolunteerTask {
  id: string;
  title: string;
  description: string;
  location: string;
  points: number;
  status: string;
  currentVolunteers?: number;
  maxVolunteers?: number;
}

interface TaskCompletion {
  id: string;
  taskType: string;
  status: string;
  pointsEarned: number;
  completedAt: string;
}

interface MyCompletionsData {
  completions: TaskCompletion[];
  totalPoints: number;
  totalCompleted: number;
}

const TAB_SEGMENTS = [
  { key: 'micro', label: 'Micro Tasks' },
  { key: 'volunteer', label: 'Volunteer' },
  { key: 'my-tasks', label: 'My Tasks' },
];

const TASK_CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'outreach', label: 'Outreach' },
  { key: 'canvassing', label: 'Canvassing' },
  { key: 'social_media', label: 'Social Media' },
  { key: 'community_service', label: 'Community Service' },
  { key: 'data_collection', label: 'Data Collection' },
  { key: 'education', label: 'Education' },
  { key: 'event_support', label: 'Event Support' },
  { key: 'fundraising', label: 'Fundraising' },
  { key: 'monitoring', label: 'Monitoring' },
  { key: 'content_creation', label: 'Content Creation' },
  { key: 'membership_drive', label: 'Membership Drive' },
  { key: 'general', label: 'General' },
];

const TASK_SCOPES = [
  { key: 'all', label: 'All Scopes' },
  { key: 'national', label: 'National' },
  { key: 'state', label: 'State' },
  { key: 'lga', label: 'LGA' },
  { key: 'ward', label: 'Ward' },
];

function formatCategoryLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function TasksScreen() {
  const [activeTab, setActiveTab] = useState('micro');
  const [taskCategoryFilter, setTaskCategoryFilter] = useState('all');
  const [taskScopeFilter, setTaskScopeFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState<MicroTask | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const microQueryParams = new URLSearchParams();
  if (taskCategoryFilter !== 'all') microQueryParams.set('taskCategory', taskCategoryFilter);
  if (taskScopeFilter !== 'all') microQueryParams.set('taskScope', taskScopeFilter);
  const microQueryString = microQueryParams.toString();

  const { data: microTasks, isLoading: loadingMicro, error: microError, refetch: refetchMicro } = useQuery({
    queryKey: ['/api/tasks/micro', taskCategoryFilter, taskScopeFilter],
    queryFn: async () => {
      const url = microQueryString ? `/api/tasks/micro?${microQueryString}` : '/api/tasks/micro';
      const response = await api.get(url);
      if (!response.success) throw new Error(response.error || 'Failed to load tasks');
      return response.data as MicroTask[];
    },
  });

  const { data: volunteerTasks, isLoading: loadingVolunteer, error: volunteerError, refetch: refetchVolunteer } = useQuery({
    queryKey: ['/api/tasks/volunteer'],
    queryFn: async () => {
      const response = await api.get('/api/tasks/volunteer');
      if (!response.success) throw new Error(response.error || 'Failed to load volunteer tasks');
      return response.data as VolunteerTask[];
    },
  });

  const { data: myCompletions, isLoading: loadingCompletions, error: completionsError, refetch: refetchCompletions } = useQuery({
    queryKey: ['/api/tasks/my-completions'],
    queryFn: async () => {
      const response = await api.get('/api/tasks/my-completions');
      if (!response.success) throw new Error(response.error || 'Failed to load completions');
      return response.data as MyCompletionsData;
    },
  });

  const completeMicroTask = useMutation({
    mutationFn: async ({ id, selectedAnswers }: { id: string; selectedAnswers: number[] }) => {
      const response = await api.post(`/api/tasks/micro/${id}/complete`, { selectedAnswers });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/micro'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/my-completions'] });
      setSelectedTask(null);
      setSelectedAnswer(null);
      if (data?.data?.isCorrect) {
        Alert.alert('Correct!', `You earned ${data.data.pointsEarned} points!`);
      } else {
        Alert.alert('Incorrect', 'Better luck next time!');
      }
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to submit answer');
    },
  });

  const signUpForTask = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/api/tasks/volunteer/${id}/assign`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/volunteer'] });
      Alert.alert('Success', 'You have been signed up for this task!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to sign up for task');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'micro') await refetchMicro();
    else if (activeTab === 'volunteer') await refetchVolunteer();
    else await refetchCompletions();
    setRefreshing(false);
  }, [activeTab, refetchMicro, refetchVolunteer, refetchCompletions]);

  const handleSubmitAnswer = () => {
    if (selectedTask && selectedAnswer !== null) {
      completeMicroTask.mutate({ id: selectedTask.id, selectedAnswers: [selectedAnswer] });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#10B981';
      case 'in-progress': return '#F59E0B';
      case 'completed': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getScopeLabel = (task: MicroTask) => {
    if (!task.taskScope) return null;
    switch (task.taskScope) {
      case 'national': return 'National';
      case 'state': return task.state?.name || 'State';
      case 'lga': return task.lga?.name || 'LGA';
      case 'ward': return task.ward?.name || 'Ward';
      default: return task.taskScope;
    }
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const renderMicroTasks = () => {
    if (loadingMicro) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00A86B" />
          <Text variant="body" style={{ marginTop: 12, color: '#6B7280' }}>Loading tasks...</Text>
        </View>
      );
    }

    if (microError) {
      return <ErrorState message="Could not load micro tasks" onRetry={() => refetchMicro()} />;
    }

    return (
      <>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}
        >
          {TASK_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.filterChip, taskCategoryFilter === cat.key && styles.filterChipActive]}
              onPress={() => setTaskCategoryFilter(cat.key)}
            >
              <Text
                variant="caption"
                style={[styles.filterChipText, taskCategoryFilter === cat.key && styles.filterChipTextActive]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}
        >
          {TASK_SCOPES.map((scope) => (
            <TouchableOpacity
              key={scope.key}
              style={[styles.filterChip, taskScopeFilter === scope.key && styles.filterChipActive]}
              onPress={() => setTaskScopeFilter(scope.key)}
            >
              <Text
                variant="caption"
                style={[styles.filterChipText, taskScopeFilter === scope.key && styles.filterChipTextActive]}
              >
                {scope.label}
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
            <Text variant="h2">Micro Tasks</Text>
            <Text variant="caption" style={styles.subtitle}>
              {microTasks?.length || 0} tasks available
            </Text>
          </View>

          {microTasks && microTasks.length > 0 ? (
            microTasks.map((task) => (
              <Card key={task.id} style={styles.taskCard}>
                <TouchableOpacity
                  onPress={() => {
                    if (!task.completed) {
                      setSelectedTask(task);
                      setSelectedAnswer(null);
                    }
                  }}
                  disabled={task.completed}
                >
                  <View style={styles.taskHeader}>
                    <View style={{ flex: 1 }}>
                      <Text variant="h3" style={styles.taskTitle} numberOfLines={2}>{task.title}</Text>
                      <Text variant="caption" style={styles.taskDescription} numberOfLines={2}>{task.description}</Text>
                    </View>
                    {task.completed && (
                      <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                    )}
                  </View>

                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: '#EFF6FF' }]}>
                      <Text variant="caption" style={{ color: '#3B82F6', fontWeight: '600', fontSize: 11 }}>
                        {task.category}
                      </Text>
                    </View>
                    {task.taskCategory && (
                      <View style={[styles.badge, { backgroundColor: '#F3F4F6' }]}>
                        <Text variant="caption" style={{ color: '#6B7280', fontWeight: '600', fontSize: 11 }}>
                          {formatCategoryLabel(task.taskCategory)}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.badge, { backgroundColor: '#D1FAE5' }]}>
                      <Text variant="caption" style={{ color: '#059669', fontWeight: '600', fontSize: 11 }}>
                        {task.points} pts
                      </Text>
                    </View>
                  </View>

                  {task.taskScope && (
                    <View style={styles.detailRow}>
                      <Ionicons name="location-outline" size={14} color="#6B7280" />
                      <View style={[styles.badge, { backgroundColor: task.taskScope === 'national' ? '#00A86B20' : '#F3F4F6' }]}>
                        <Text variant="caption" style={{ color: task.taskScope === 'national' ? '#00A86B' : '#6B7280', fontWeight: '600', fontSize: 11 }}>
                          {getScopeLabel(task)}
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.taskMeta}>
                    <View style={styles.detailRow}>
                      <Ionicons name="time-outline" size={14} color="#6B7280" />
                      <Text variant="caption" style={styles.metaText}>{task.timeEstimate}</Text>
                    </View>
                    {task.maxCompletionsTotal != null && (
                      <View style={styles.detailRow}>
                        <Ionicons name="people-outline" size={14} color="#6B7280" />
                        <Text variant="caption" style={styles.metaText}>
                          {task.currentCompletions || 0}/{task.maxCompletionsTotal}
                        </Text>
                      </View>
                    )}
                  </View>

                  {task.expiresAt && (
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={14} color={isExpired(task.expiresAt) ? '#EF4444' : '#6B7280'} />
                      <Text variant="caption" style={{ color: isExpired(task.expiresAt) ? '#EF4444' : '#6B7280', fontWeight: isExpired(task.expiresAt) ? '600' : '400' }}>
                        {isExpired(task.expiresAt) ? 'Expired' : `Expires: ${new Date(task.expiresAt).toLocaleDateString()}`}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {!task.completed && (
                  <Button
                    title="Start Task"
                    onPress={() => { setSelectedTask(task); setSelectedAnswer(null); }}
                    style={{ marginTop: 12 }}
                  />
                )}
                {task.completed && (
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text variant="caption" style={{ color: '#10B981', fontWeight: '500' }}>Completed</Text>
                  </View>
                )}
              </Card>
            ))
          ) : (
            <EmptyState
              icon="clipboard-outline"
              title="No micro tasks available"
              subtitle="Check back later or adjust your filters"
            />
          )}
        </ScrollView>
      </>
    );
  };

  const renderVolunteerTasks = () => {
    if (loadingVolunteer) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00A86B" />
          <Text variant="body" style={{ marginTop: 12, color: '#6B7280' }}>Loading volunteer tasks...</Text>
        </View>
      );
    }

    if (volunteerError) {
      return <ErrorState message="Could not load volunteer tasks" onRetry={() => refetchVolunteer()} />;
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A86B" />
        }
      >
        <View style={styles.header}>
          <Text variant="h2">Volunteer Tasks</Text>
          <Text variant="caption" style={styles.subtitle}>
            {volunteerTasks?.length || 0} tasks available
          </Text>
        </View>

        {volunteerTasks && volunteerTasks.length > 0 ? (
          volunteerTasks.map((task) => (
            <Card key={task.id} style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <View style={{ flex: 1 }}>
                  <Text variant="h3" style={styles.taskTitle} numberOfLines={2}>{task.title}</Text>
                  <Text variant="caption" style={styles.taskDescription} numberOfLines={3}>{task.description}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(task.status)}20` }]}>
                  <Text variant="caption" style={{ color: getStatusColor(task.status), fontWeight: '600', fontSize: 11 }}>
                    {task.status}
                  </Text>
                </View>
              </View>

              <View style={styles.taskMeta}>
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={14} color="#6B7280" />
                  <Text variant="caption" style={styles.metaText} numberOfLines={1}>{task.location}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="trophy-outline" size={14} color="#6B7280" />
                  <Text variant="caption" style={styles.metaText}>{task.points} points</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="people-outline" size={14} color="#6B7280" />
                <Text variant="caption" style={styles.metaText}>
                  Volunteers: {task.currentVolunteers || 0} / {task.maxVolunteers || '--'}
                </Text>
              </View>

              <Button
                title={task.status === 'open' ? 'Sign Up' : 'View Details'}
                onPress={() => signUpForTask.mutate(task.id)}
                variant={task.status === 'open' ? 'primary' : 'outline'}
                disabled={task.status !== 'open' || signUpForTask.isPending}
                loading={signUpForTask.isPending}
                style={{ marginTop: 12 }}
              />
            </Card>
          ))
        ) : (
          <EmptyState
            icon="hand-left-outline"
            title="No volunteer tasks available"
            subtitle="Check back later for new opportunities"
          />
        )}
      </ScrollView>
    );
  };

  const renderMyTasks = () => {
    if (loadingCompletions) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00A86B" />
          <Text variant="body" style={{ marginTop: 12, color: '#6B7280' }}>Loading your tasks...</Text>
        </View>
      );
    }

    if (completionsError) {
      return <ErrorState message="Could not load your completions" onRetry={() => refetchCompletions()} />;
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A86B" />
        }
      >
        <View style={styles.header}>
          <Text variant="h2">My Tasks</Text>
          <Text variant="caption" style={styles.subtitle}>Your task history and stats</Text>
        </View>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Ionicons name="trophy-outline" size={24} color="#00A86B" />
            <Text variant="h2" style={styles.statValue}>{myCompletions?.totalPoints || 0}</Text>
            <Text variant="caption" style={styles.statLabel}>Total Points</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="checkmark-done-outline" size={24} color="#00A86B" />
            <Text variant="h2" style={styles.statValue}>{myCompletions?.totalCompleted || 0}</Text>
            <Text variant="caption" style={styles.statLabel}>Tasks Completed</Text>
          </Card>
        </View>

        <Text variant="h3" style={{ marginBottom: 12 }}>Recent Completions</Text>

        {myCompletions?.completions && myCompletions.completions.length > 0 ? (
          myCompletions.completions.slice(0, 20).map((completion) => (
            <Card key={completion.id} style={styles.completionCard}>
              <View style={styles.completionRow}>
                <View style={styles.completionIcon}>
                  <Ionicons
                    name={completion.taskType === 'micro' ? 'flash-outline' : 'hand-left-outline'}
                    size={20}
                    color="#00A86B"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ fontWeight: '600', color: '#111827' }}>
                    {completion.taskType === 'micro' ? 'Micro Task' : 'Volunteer Task'}
                  </Text>
                  <Text variant="caption" style={{ color: '#9CA3AF' }}>
                    {new Date(completion.completedAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: '#D1FAE5' }]}>
                  <Text variant="caption" style={{ color: '#059669', fontWeight: '600', fontSize: 12 }}>
                    {completion.pointsEarned} pts
                  </Text>
                </View>
              </View>
            </Card>
          ))
        ) : (
          <EmptyState
            icon="clipboard-outline"
            title="No completed tasks yet"
            subtitle="Start completing tasks to earn points!"
          />
        )}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabContainer}
      >
        {TAB_SEGMENTS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabChip, activeTab === tab.key && styles.tabChipActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              variant="caption"
              style={[styles.tabChipText, activeTab === tab.key && styles.tabChipTextActive]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {activeTab === 'micro' && renderMicroTasks()}
      {activeTab === 'volunteer' && renderVolunteerTasks()}
      {activeTab === 'my-tasks' && renderMyTasks()}

      <Modal
        visible={!!selectedTask}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setSelectedTask(null); setSelectedAnswer(null); }}
      >
        {selectedTask && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text variant="h3">Complete Task</Text>
              <TouchableOpacity onPress={() => { setSelectedTask(null); setSelectedAnswer(null); }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text variant="h2" style={styles.modalTitle}>{selectedTask.title}</Text>
              <Text variant="body" style={styles.modalDescription}>{selectedTask.description}</Text>

              <View style={styles.modalBadgeRow}>
                <View style={[styles.badge, { backgroundColor: '#EFF6FF' }]}>
                  <Text variant="caption" style={{ color: '#3B82F6', fontWeight: '600' }}>{selectedTask.category}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: '#D1FAE5' }]}>
                  <Text variant="caption" style={{ color: '#059669', fontWeight: '600' }}>{selectedTask.points} pts</Text>
                </View>
              </View>

              {selectedTask.options && selectedTask.options.length > 0 && (
                <View style={styles.optionsSection}>
                  <Text variant="h3" style={{ marginBottom: 12 }}>Select your answer:</Text>
                  {selectedTask.options.map((option, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.optionCard,
                        selectedAnswer === index && styles.optionCardSelected,
                      ]}
                      onPress={() => setSelectedAnswer(index)}
                    >
                      <View style={[styles.radioOuter, selectedAnswer === index && styles.radioOuterSelected]}>
                        {selectedAnswer === index && <View style={styles.radioInner} />}
                      </View>
                      <Text variant="body" style={[styles.optionText, selectedAnswer === index && { color: '#00A86B' }]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Button
                title={completeMicroTask.isPending ? 'Submitting...' : 'Submit Answer'}
                onPress={handleSubmitAnswer}
                disabled={selectedAnswer === null || completeMicroTask.isPending}
                loading={completeMicroTask.isPending}
                style={styles.submitButton}
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
  tabScroll: {
    maxHeight: 56,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
  },
  tabChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  tabChipActive: {
    backgroundColor: '#00A86B',
  },
  tabChipText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  tabChipTextActive: {
    color: '#FFFFFF',
  },
  filterScroll: {
    maxHeight: 48,
    backgroundColor: '#FFFFFF',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: '#00A86B',
  },
  filterChipText: {
    color: '#6B7280',
    fontWeight: '500',
    fontSize: 12,
  },
  filterChipTextActive: {
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
  taskCard: {
    marginBottom: 16,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  taskTitle: {
    color: '#111827',
    marginBottom: 4,
  },
  taskDescription: {
    color: '#6B7280',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 6,
  },
  metaText: {
    color: '#6B7280',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
  },
  statValue: {
    marginTop: 8,
    color: '#111827',
  },
  statLabel: {
    color: '#6B7280',
    marginTop: 4,
  },
  completionCard: {
    marginBottom: 10,
  },
  completionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  completionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 8,
  },
  modalDescription: {
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 16,
  },
  modalBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  optionsSection: {
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 10,
  },
  optionCardSelected: {
    borderColor: '#00A86B',
    backgroundColor: '#F0FDF4',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#00A86B',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00A86B',
  },
  optionText: {
    flex: 1,
    color: '#374151',
  },
  submitButton: {
    marginBottom: 32,
  },
});
