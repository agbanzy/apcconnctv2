import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PaystackPayment } from '@/components/PaystackPayment';
import { api } from '@/lib/api';

interface DuesRecord {
  id: string;
  amount: string;
  dueDate: string;
  paidAt?: string;
  paymentStatus: 'pending' | 'completed' | 'overdue';
  paymentMethod?: string;
}

interface RecurringDues {
  id: string;
  amount: string;
  frequency: string;
  status: string;
  nextPaymentDate: string;
  lastPaymentDate?: string;
}

const AMOUNT_OPTIONS = [
  { label: 'N5,000', value: 5000 },
  { label: 'N10,000', value: 10000 },
  { label: 'N15,000', value: 15000 },
];

const FREQUENCY_OPTIONS = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Yearly', value: 'yearly' },
];

export default function DuesScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [recurringAmount, setRecurringAmount] = useState(5000);
  const [recurringFrequency, setRecurringFrequency] = useState('monthly');
  const [showAmountPicker, setShowAmountPicker] = useState(false);
  const [showFreqPicker, setShowFreqPicker] = useState(false);
  const [paystackVisible, setPaystackVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentReference, setPaymentReference] = useState('');
  const [currentDueId, setCurrentDueId] = useState<string | null>(null);
  const paystackPublicKey = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || '';

  const { data: userProfile } = useQuery({
    queryKey: ['/api/profile'],
    queryFn: async () => {
      const response = await api.get('/api/profile');
      if (!response.success) throw new Error(response.error || 'Failed to load profile');
      return response.data;
    },
  });

  const { data: duesData, isLoading, isError, error, refetch: refetchDues } = useQuery({
    queryKey: ['/api/dues'],
    queryFn: async () => {
      const response = await api.get('/api/dues');
      if (!response.success) throw new Error(response.error || 'Failed to load dues');
      return response.data as DuesRecord[];
    },
  });

  const { data: recurringData, refetch: refetchRecurring } = useQuery({
    queryKey: ['/api/dues/recurring'],
    queryFn: async () => {
      const response = await api.get('/api/dues/recurring');
      if (!response.success) throw new Error(response.error || 'Failed to load recurring');
      return response.data as RecurringDues | null;
    },
  });

  const initializeDuePaymentMutation = useMutation({
    mutationFn: async (params: { amount: number; dueId?: string }) => {
      const response = await api.post('/api/dues/pay/initialize', params);
      if (!response.success) throw new Error(response.error || 'Failed to initialize payment');
      return response.data;
    },
    onSuccess: (data: any) => {
      if (data?.reference) {
        setPaymentReference(data.reference);
        setPaystackVisible(true);
      } else {
        Alert.alert('Error', 'Failed to get payment reference');
      }
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const verifyDuePaymentMutation = useMutation({
    mutationFn: async (reference: string) => {
      const response = await api.post('/api/dues/pay/verify', { reference });
      if (!response.success) throw new Error(response.error || 'Failed to verify payment');
      return response.data;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Payment confirmed!');
      setPaymentAmount(0);
      setCurrentDueId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/dues'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dues/recurring'] });
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const initializeRecurringMutation = useMutation({
    mutationFn: async (params: { amount: number; frequency: string }) => {
      const response = await api.post('/api/dues/recurring/setup/initialize', params);
      if (!response.success) throw new Error(response.error || 'Setup failed');
      return response.data;
    },
    onSuccess: (data: any) => {
      if (data?.reference) {
        setPaymentReference(data.reference);
        setPaymentAmount(data.amount || 0);
        setPaystackVisible(true);
      } else {
        Alert.alert('Error', 'Failed to initialize recurring setup');
      }
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const verifyRecurringMutation = useMutation({
    mutationFn: async (reference: string) => {
      const response = await api.post('/api/dues/recurring/setup/verify', { reference });
      if (!response.success) throw new Error(response.error || 'Setup failed');
      return response.data;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Recurring payment has been set up!');
      setPaymentAmount(0);
      queryClient.invalidateQueries({ queryKey: ['/api/dues/recurring'] });
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const pauseMutation = useMutation({
    mutationFn: async () => {
      const response = await api.patch('/api/dues/recurring/pause', {});
      if (!response.success) throw new Error(response.error || 'Pause failed');
      return response.data;
    },
    onSuccess: () => {
      Alert.alert('Paused', 'Recurring payments paused');
      queryClient.invalidateQueries({ queryKey: ['/api/dues/recurring'] });
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const resumeMutation = useMutation({
    mutationFn: async () => {
      const response = await api.patch('/api/dues/recurring/resume', {});
      if (!response.success) throw new Error(response.error || 'Resume failed');
      return response.data;
    },
    onSuccess: () => {
      Alert.alert('Resumed', 'Recurring payments resumed');
      queryClient.invalidateQueries({ queryKey: ['/api/dues/recurring'] });
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete('/api/dues/recurring');
      if (!response.success) throw new Error(response.error || 'Cancel failed');
      return response.data;
    },
    onSuccess: () => {
      Alert.alert('Cancelled', 'Recurring payments cancelled');
      queryClient.invalidateQueries({ queryKey: ['/api/dues/recurring'] });
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchDues(), refetchRecurring()]);
    setRefreshing(false);
  }, [refetchDues, refetchRecurring]);

  const dues = duesData || [];
  const pendingDues = dues.filter((d) => d.paymentStatus === 'pending');
  const paidDues = dues.filter((d) => d.paymentStatus === 'completed');
  const totalPending = pendingDues.reduce((sum, d) => sum + parseFloat(d.amount), 0);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00A86B" />
      </View>
    );
  }

  if (isError) {
    return <ErrorState message={(error as Error)?.message || 'Failed to load dues'} onRetry={() => { refetchDues(); refetchRecurring(); }} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A86B" />}
    >
      {recurringData ? (
        <Card style={styles.recurringCard}>
          <View style={styles.recurringHeader}>
            <Ionicons name="repeat" size={22} color="#00A86B" />
            <Text variant="body" style={{ fontWeight: '700', flex: 1 }}>Recurring Dues</Text>
            <View style={[styles.statusBadge, { backgroundColor: recurringData.status === 'active' ? '#DCFCE7' : '#FEF3C7' }]}>
              <Text variant="caption" style={{ color: recurringData.status === 'active' ? '#059669' : '#D97706', fontWeight: '600', fontSize: 11, textTransform: 'capitalize' }}>
                {recurringData.status}
              </Text>
            </View>
          </View>

          <View style={styles.recurringGrid}>
            <View style={styles.recurringItem}>
              <Text variant="caption" style={styles.recurringLabel}>Amount</Text>
              <Text variant="h3" style={styles.recurringValue}>N{parseFloat(recurringData.amount).toLocaleString()}</Text>
            </View>
            <View style={styles.recurringItem}>
              <Text variant="caption" style={styles.recurringLabel}>Frequency</Text>
              <Text variant="body" style={[styles.recurringValue, { textTransform: 'capitalize' }]}>{recurringData.frequency}</Text>
            </View>
            <View style={styles.recurringItem}>
              <Text variant="caption" style={styles.recurringLabel}>Next Payment</Text>
              <Text variant="body" style={styles.recurringValue}>{formatDate(recurringData.nextPaymentDate)}</Text>
            </View>
            <View style={styles.recurringItem}>
              <Text variant="caption" style={styles.recurringLabel}>Last Payment</Text>
              <Text variant="body" style={styles.recurringValue}>
                {recurringData.lastPaymentDate ? formatDate(recurringData.lastPaymentDate) : '--'}
              </Text>
            </View>
          </View>

          <View style={styles.recurringActions}>
            {recurringData.status === 'active' && (
              <>
                <TouchableOpacity style={styles.actionBtn} onPress={() => pauseMutation.mutate()}>
                  <Ionicons name="pause" size={16} color="#F59E0B" />
                  <Text variant="caption" style={{ color: '#F59E0B', fontWeight: '600' }}>Pause</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: '#EF4444' }]}
                  onPress={() => Alert.alert('Cancel Recurring?', 'This will stop all automatic payments.', [
                    { text: 'No', style: 'cancel' },
                    { text: 'Yes, Cancel', style: 'destructive', onPress: () => cancelMutation.mutate() },
                  ])}
                >
                  <Ionicons name="close" size={16} color="#EF4444" />
                  <Text variant="caption" style={{ color: '#EF4444', fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
            {recurringData.status === 'paused' && (
              <TouchableOpacity style={[styles.actionBtn, { borderColor: '#00A86B' }]} onPress={() => resumeMutation.mutate()}>
                <Ionicons name="play" size={16} color="#00A86B" />
                <Text variant="caption" style={{ color: '#00A86B', fontWeight: '600' }}>Resume</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>
      ) : (
        <Card style={{ padding: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Ionicons name="repeat" size={20} color="#00A86B" />
            <Text variant="body" style={{ fontWeight: '700' }}>Setup Automatic Payments</Text>
          </View>
          <Text variant="caption" style={{ color: '#6B7280', marginBottom: 14 }}>Never miss a dues deadline</Text>

          <Text variant="caption" style={styles.fieldLabel}>Amount</Text>
          <TouchableOpacity style={styles.selector} onPress={() => setShowAmountPicker(true)}>
            <Text variant="body" style={{ color: '#111827' }}>N{recurringAmount.toLocaleString()}</Text>
            <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <Text variant="caption" style={styles.fieldLabel}>Frequency</Text>
          <TouchableOpacity style={styles.selector} onPress={() => setShowFreqPicker(true)}>
            <Text variant="body" style={{ color: '#111827', textTransform: 'capitalize' }}>{recurringFrequency}</Text>
            <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <Button
            title={initializeRecurringMutation.isPending ? 'Setting up...' : 'Setup Recurring Payments'}
            onPress={() => initializeRecurringMutation.mutate({ amount: recurringAmount, frequency: recurringFrequency })}
            loading={initializeRecurringMutation.isPending}
            style={{ marginTop: 16 }}
          />
        </Card>
      )}

      {pendingDues.length > 0 && (
        <>
          <Card style={styles.pendingCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ionicons name="alert-circle" size={20} color="#F59E0B" />
              <Text variant="body" style={{ fontWeight: '700' }}>Pending Dues</Text>
            </View>
            <Text variant="h2" style={{ fontWeight: '800', marginBottom: 14 }}>N{totalPending.toLocaleString()}</Text>

            {pendingDues.map((due) => (
              <View key={due.id} style={styles.dueRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ fontWeight: '600' }}>N{parseFloat(due.amount).toLocaleString()}</Text>
                  <Text variant="caption" style={{ color: '#9CA3AF' }}>Due: {formatDate(due.dueDate)}</Text>
                </View>
                <Button
                  title="Pay"
                  onPress={() => {
                    setPaymentAmount(parseFloat(due.amount));
                    setCurrentDueId(due.id);
                    initializeDuePaymentMutation.mutate({ amount: parseFloat(due.amount), dueId: due.id });
                  }}
                  loading={initializeDuePaymentMutation.isPending}
                  style={{ paddingHorizontal: 20 }}
                />
              </View>
            ))}
          </Card>
        </>
      )}

      <Text variant="h3" style={styles.sectionTitle}>Payment History</Text>
      {paidDues.length > 0 ? (
        paidDues.map((p) => (
          <Card key={p.id} style={styles.historyItem}>
            <View style={styles.historyRow}>
              <View style={styles.checkIcon}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: '600', fontSize: 14 }}>N{parseFloat(p.amount).toLocaleString()}</Text>
                <Text variant="caption" style={{ color: '#9CA3AF' }}>
                  {p.paidAt ? `Paid ${formatDate(p.paidAt)}` : `Due ${formatDate(p.dueDate)}`}
                  {p.paymentMethod ? ` via ${p.paymentMethod}` : ''}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: '#DCFCE7' }]}>
                <Text variant="caption" style={{ color: '#059669', fontWeight: '600', fontSize: 10 }}>PAID</Text>
              </View>
            </View>
          </Card>
        ))
      ) : (
        <EmptyState icon="card-outline" title="No payment history" subtitle="Your payment records will appear here" />
      )}

      <View style={{ height: 30 }} />

      {showAmountPicker && (
        <View style={styles.pickerOverlay}>
          <TouchableOpacity style={styles.pickerBg} onPress={() => setShowAmountPicker(false)} />
          <View style={styles.pickerSheet}>
            <Text variant="body" style={{ fontWeight: '700', marginBottom: 12 }}>Select Amount</Text>
            {AMOUNT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={styles.pickerItem}
                onPress={() => { setRecurringAmount(opt.value); setShowAmountPicker(false); }}
              >
                <Text variant="body" style={{ color: recurringAmount === opt.value ? '#00A86B' : '#111827', fontWeight: recurringAmount === opt.value ? '700' : '400' }}>
                  {opt.label}
                </Text>
                {recurringAmount === opt.value && <Ionicons name="checkmark" size={20} color="#00A86B" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {showFreqPicker && (
        <View style={styles.pickerOverlay}>
          <TouchableOpacity style={styles.pickerBg} onPress={() => setShowFreqPicker(false)} />
          <View style={styles.pickerSheet}>
            <Text variant="body" style={{ fontWeight: '700', marginBottom: 12 }}>Select Frequency</Text>
            {FREQUENCY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={styles.pickerItem}
                onPress={() => { setRecurringFrequency(opt.value); setShowFreqPicker(false); }}
              >
                <Text variant="body" style={{ color: recurringFrequency === opt.value ? '#00A86B' : '#111827', fontWeight: recurringFrequency === opt.value ? '700' : '400' }}>
                  {opt.label}
                </Text>
                {recurringFrequency === opt.value && <Ionicons name="checkmark" size={20} color="#00A86B" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <PaystackPayment
        visible={paystackVisible}
        amount={paymentAmount}
        email={userProfile?.user?.email || ''}
        reference={paymentReference}
        publicKey={paystackPublicKey}
        metadata={{
          dueId: currentDueId,
          type: currentDueId ? 'due_payment' : 'recurring_setup',
        }}
        onSuccess={(response) => {
          setPaystackVisible(false);
          if (response.reference) {
            if (currentDueId) {
              verifyDuePaymentMutation.mutate(response.reference);
            } else {
              verifyRecurringMutation.mutate(response.reference);
            }
          }
        }}
        onCancel={() => {
          setPaystackVisible(false);
          setPaymentAmount(0);
          setCurrentDueId(null);
          Alert.alert('Cancelled', 'Payment was cancelled');
        }}
        onError={(error) => {
          setPaystackVisible(false);
          Alert.alert('Payment Error', error);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  sectionTitle: { color: '#111827', marginBottom: 12 },
  recurringCard: { padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#DCFCE7', backgroundColor: '#F0FDF4' },
  recurringHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  recurringGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  recurringItem: { width: '50%', marginBottom: 12 },
  recurringLabel: { color: '#6B7280', marginBottom: 2 },
  recurringValue: { fontWeight: '600', color: '#111827' },
  recurringActions: { flexDirection: 'row', gap: 10, marginTop: 8, borderTopWidth: 1, borderTopColor: '#D1FAE5', paddingTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#F59E0B', borderRadius: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pendingCard: { padding: 18, marginBottom: 16, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' },
  dueRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, marginBottom: 8 },
  historyItem: { padding: 14, marginBottom: 8 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center' },
  fieldLabel: { color: '#374151', fontWeight: '600', marginBottom: 6, marginTop: 12 },
  selector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: '#FFFFFF' },
  pickerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  pickerBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 40 },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
});
