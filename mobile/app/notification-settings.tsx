import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

interface NotificationPrefs {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  electionReminders: boolean;
  eventReminders: boolean;
  newsUpdates: boolean;
  duesReminders: boolean;
  taskNotifications: boolean;
  campaignUpdates: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
  electionReminders: true,
  eventReminders: true,
  newsUpdates: true,
  duesReminders: true,
  taskNotifications: true,
  campaignUpdates: true,
};

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
  icon: string;
}

function ToggleRow({ label, description, value, onToggle, icon }: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleIcon}>
        <Ionicons name={icon as any} size={20} color="#6B7280" />
      </View>
      <View style={styles.toggleInfo}>
        <Text variant="body" style={styles.toggleLabel}>{label}</Text>
        <Text variant="caption" style={styles.toggleDesc}>{description}</Text>
      </View>
      <View
        style={[styles.switch, value && styles.switchActive]}
        onTouchEnd={onToggle}
      >
        <View style={[styles.switchThumb, value && styles.switchThumbActive]} />
      </View>
    </View>
  );
}

export default function NotificationSettingsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [hasChanges, setHasChanges] = useState(false);
  const queryClient = useQueryClient();

  const { data: savedPrefs, isLoading, refetch } = useQuery({
    queryKey: ['/api/notifications/preferences'],
    queryFn: async () => {
      const response = await api.get('/api/notifications/preferences');
      if (!response.success) return DEFAULT_PREFS;
      return { ...DEFAULT_PREFS, ...response.data } as NotificationPrefs;
    },
  });

  useEffect(() => {
    if (savedPrefs) {
      setPrefs(savedPrefs);
    }
  }, [savedPrefs]);

  const saveMutation = useMutation({
    mutationFn: async (data: NotificationPrefs) => {
      const response = await api.post('/api/notifications/preferences', data);
      if (!response.success) throw new Error(response.error || 'Failed to save preferences');
      return response.data;
    },
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/preferences'] });
      Alert.alert('Success', 'Notification preferences saved');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to save preferences');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const togglePref = (key: keyof NotificationPrefs) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A86B" />}
      >
        <View style={styles.header}>
          <Ionicons name="notifications" size={28} color="#00A86B" />
          <View>
            <Text variant="h2" style={styles.headerTitle}>Notification Settings</Text>
            <Text variant="caption" style={styles.headerSub}>Control how you receive notifications</Text>
          </View>
        </View>

        <Card style={styles.sectionCard}>
          <Text variant="h3" style={styles.sectionTitle}>Channels</Text>
          <Text variant="caption" style={styles.sectionDesc}>Choose how you want to be notified</Text>

          <ToggleRow
            label="Push Notifications"
            description="Receive push notifications on your device"
            value={prefs.pushNotifications}
            onToggle={() => togglePref('pushNotifications')}
            icon="phone-portrait-outline"
          />
          <ToggleRow
            label="Email Notifications"
            description="Receive notifications via email"
            value={prefs.emailNotifications}
            onToggle={() => togglePref('emailNotifications')}
            icon="mail-outline"
          />
          <ToggleRow
            label="SMS Notifications"
            description="Receive SMS text messages"
            value={prefs.smsNotifications}
            onToggle={() => togglePref('smsNotifications')}
            icon="chatbox-outline"
          />
        </Card>

        <Card style={styles.sectionCard}>
          <Text variant="h3" style={styles.sectionTitle}>Categories</Text>
          <Text variant="caption" style={styles.sectionDesc}>Choose what you want to be notified about</Text>

          <ToggleRow
            label="Election Reminders"
            description="Upcoming elections and voting deadlines"
            value={prefs.electionReminders}
            onToggle={() => togglePref('electionReminders')}
            icon="checkmark-circle-outline"
          />
          <ToggleRow
            label="Event Reminders"
            description="Upcoming events you've RSVPed to"
            value={prefs.eventReminders}
            onToggle={() => togglePref('eventReminders')}
            icon="calendar-outline"
          />
          <ToggleRow
            label="News Updates"
            description="Latest party news and announcements"
            value={prefs.newsUpdates}
            onToggle={() => togglePref('newsUpdates')}
            icon="newspaper-outline"
          />
          <ToggleRow
            label="Dues Reminders"
            description="Membership dues payment reminders"
            value={prefs.duesReminders}
            onToggle={() => togglePref('duesReminders')}
            icon="card-outline"
          />
          <ToggleRow
            label="Task Notifications"
            description="New tasks and approval updates"
            value={prefs.taskNotifications}
            onToggle={() => togglePref('taskNotifications')}
            icon="clipboard-outline"
          />
          <ToggleRow
            label="Campaign Updates"
            description="Updates on campaigns you follow"
            value={prefs.campaignUpdates}
            onToggle={() => togglePref('campaignUpdates')}
            icon="megaphone-outline"
          />
        </Card>

        <Button
          title="Save Preferences"
          onPress={() => saveMutation.mutate(prefs)}
          loading={saveMutation.isPending}
          disabled={!hasChanges || saveMutation.isPending}
          style={styles.saveButton}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  headerTitle: { color: '#111827' },
  headerSub: { color: '#6B7280', marginTop: 2 },
  sectionCard: { marginBottom: 16 },
  sectionTitle: { color: '#111827', marginBottom: 2 },
  sectionDesc: { color: '#6B7280', marginBottom: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  toggleIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontWeight: '500', color: '#111827', marginBottom: 2 },
  toggleDesc: { color: '#9CA3AF', fontSize: 12 },
  switch: { width: 48, height: 28, borderRadius: 14, backgroundColor: '#D1D5DB', justifyContent: 'center', paddingHorizontal: 2 },
  switchActive: { backgroundColor: '#00A86B' },
  switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 2 },
  switchThumbActive: { alignSelf: 'flex-end' },
  saveButton: { marginTop: 8 },
});
