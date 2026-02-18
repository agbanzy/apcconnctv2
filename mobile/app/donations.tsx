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

interface DonationCampaign {
  id: string;
  title: string;
  description: string;
  category: string;
  goalAmount: number;
  currentAmount: number;
  status: string;
}

interface Donation {
  id: string;
  donorName: string | null;
  campaignId: string | null;
  amount: number;
  isAnonymous: boolean;
  createdAt: string;
  campaign?: { title: string };
}

const QUICK_AMOUNTS = [1000, 5000, 10000, 25000];

export default function DonationsScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [message, setMessage] = useState('');
  const [paystackVisible, setPaystackVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const paystackPublicKey = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || '';

  const { data: userProfile } = useQuery({
    queryKey: ['/api/profile'],
    queryFn: async () => {
      const response = await api.get('/api/profile');
      if (!response.success) throw new Error(response.error || 'Failed to load profile');
      return response.data;
    },
  });

  const { data: campaignsData, isLoading, isError, error, refetch: refetchCampaigns } = useQuery({
    queryKey: ['/api/donation-campaigns'],
    queryFn: async () => {
      const response = await api.get('/api/donation-campaigns');
      if (!response.success) throw new Error(response.error || 'Failed to load campaigns');
      return response.data as DonationCampaign[];
    },
  });

  const { data: recentData, refetch: refetchRecent } = useQuery({
    queryKey: ['/api/donations/recent'],
    queryFn: async () => {
      const response = await api.get('/api/donations/recent');
      if (!response.success) throw new Error(response.error || 'Failed to load donations');
      return response.data as Donation[];
    },
  });

  const initializeDonationMutation = useMutation({
    mutationFn: async (params: { amount: number; campaignId?: string | null; isAnonymous: boolean; message?: string | null }) => {
      const response = await api.post('/api/donations/initialize', params);
      if (!response.success) throw new Error(response.error || 'Failed to initialize donation');
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
    onError: (err: Error) => {
      Alert.alert('Error', err.message);
    },
  });

  const verifyDonationMutation = useMutation({
    mutationFn: async (reference: string) => {
      const response = await api.post('/api/donations/verify', { reference });
      if (!response.success) throw new Error(response.error || 'Failed to verify donation');
      return response.data;
    },
    onSuccess: () => {
      Alert.alert('Thank You', 'Your donation has been recorded!');
      setSelectedAmount(null);
      setCustomAmount('');
      setMessage('');
      setPaymentAmount(0);
      setSelectedCampaignId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/donations/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/donation-campaigns'] });
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message);
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchCampaigns(), refetchRecent()]);
    setRefreshing(false);
  }, [refetchCampaigns, refetchRecent]);

  const campaigns = (campaignsData || []).filter((c) => c.status === 'active');
  const recentDonations = recentData || [];

  const handleDonate = (campaignId?: string) => {
    const amount = selectedAmount || parseInt(customAmount);
    if (!amount || amount < 100) {
      Alert.alert('Invalid Amount', 'Minimum donation is N100');
      return;
    }

    setPaymentAmount(amount);
    setSelectedCampaignId(campaignId || null);

    Alert.alert(
      'Confirm Donation',
      `Donate N${amount.toLocaleString()}${campaignId ? '' : ' (General)'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Donate',
          onPress: () => initializeDonationMutation.mutate({
            amount,
            campaignId: campaignId || null,
            isAnonymous,
            message: message || null,
          }),
        },
      ]
    );
  };

  const handlePaystackSuccess = (response: any) => {
    setPaystackVisible(false);
    if (response.reference) {
      verifyDonationMutation.mutate(response.reference);
    }
  };

  const handlePaystackCancel = () => {
    setPaystackVisible(false);
    setPaymentAmount(0);
    setSelectedCampaignId(null);
    Alert.alert('Cancelled', 'Payment was cancelled');
  };

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
    return <ErrorState message={(error as Error)?.message || 'Failed to load donations'} onRetry={() => refetchCampaigns()} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A86B" />}
    >
      <Card style={styles.heroCard}>
        <Ionicons name="heart" size={32} color="#FFFFFF" />
        <Text variant="h2" style={styles.heroTitle}>Support APC's Vision</Text>
        <Text variant="body" style={styles.heroSub}>Your contributions help build a better Nigeria</Text>
      </Card>

      <Text variant="h3" style={styles.sectionTitle}>Quick Donate</Text>
      <View style={styles.chipsRow}>
        {QUICK_AMOUNTS.map((amt) => (
          <TouchableOpacity
            key={amt}
            style={[styles.chip, selectedAmount === amt && styles.chipActive]}
            onPress={() => { setSelectedAmount(amt); setCustomAmount(''); }}
          >
            <Text variant="caption" style={[styles.chipText, selectedAmount === amt && styles.chipTextActive]}>
              N{amt.toLocaleString()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Or enter custom amount"
        placeholderTextColor="#9CA3AF"
        value={customAmount}
        onChangeText={(t) => { setCustomAmount(t); setSelectedAmount(null); }}
        keyboardType="number-pad"
      />

      <TouchableOpacity style={styles.checkboxRow} onPress={() => setIsAnonymous(!isAnonymous)}>
        <View style={[styles.checkbox, isAnonymous && styles.checkboxOn]}>
          {isAnonymous && <Ionicons name="checkmark" size={14} color="#FFF" />}
        </View>
        <Text variant="body" style={{ color: '#374151' }}>Make anonymous</Text>
      </TouchableOpacity>

      <TextInput
        style={[styles.input, { height: 70, textAlignVertical: 'top', marginTop: 10 }]}
        placeholder="Add a message (optional)"
        placeholderTextColor="#9CA3AF"
        value={message}
        onChangeText={setMessage}
        multiline
      />

      <Button
        title={initializeDonationMutation.isPending ? 'Processing...' : 'Donate Now'}
        onPress={() => handleDonate()}
        loading={initializeDonationMutation.isPending}
        disabled={initializeDonationMutation.isPending || (!selectedAmount && !customAmount)}
        style={{ marginTop: 16, marginBottom: 28 }}
      />

      {campaigns.length > 0 && (
        <>
          <Text variant="h3" style={styles.sectionTitle}>Active Campaigns</Text>
          {campaigns.map((c) => {
            const pct = c.goalAmount > 0 ? (c.currentAmount / c.goalAmount) * 100 : 0;
            return (
              <Card key={c.id} style={styles.campaignCard}>
                <View style={styles.campaignHead}>
                  <Text variant="body" style={styles.campaignName}>{c.title}</Text>
                  <View style={styles.catBadge}>
                    <Text variant="caption" style={styles.catText}>{c.category.replace(/_/g, ' ')}</Text>
                  </View>
                </View>
                <Text variant="caption" style={styles.campaignDesc} numberOfLines={2}>{c.description}</Text>
                <View style={styles.bar}><View style={[styles.barFill, { width: `${Math.min(pct, 100)}%` }]} /></View>
                <View style={styles.barLabels}>
                  <Text variant="caption" style={{ fontWeight: '600' }}>N{(c.currentAmount / 100).toLocaleString()}</Text>
                  <Text variant="caption" style={{ color: '#9CA3AF' }}>of N{(c.goalAmount / 100).toLocaleString()}</Text>
                </View>
                <Button title="Donate to Campaign" onPress={() => handleDonate(c.id)} variant="outline" style={{ marginTop: 10 }} />
              </Card>
            );
          })}
        </>
      )}

      <Text variant="h3" style={styles.sectionTitle}>Recent Donations</Text>
      {recentDonations.length > 0 ? (
        recentDonations.slice(0, 15).map((d) => (
          <Card key={d.id} style={styles.donItem}>
            <View style={styles.donRow}>
              <View style={styles.donIcon}><Ionicons name="heart" size={16} color="#EF4444" /></View>
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: '600', fontSize: 14 }}>
                  {d.isAnonymous ? 'Anonymous' : d.donorName || 'Anonymous'}
                </Text>
                <Text variant="caption" style={{ color: '#9CA3AF' }}>
                  {d.campaign?.title || 'General'} - {formatDate(d.createdAt)}
                </Text>
              </View>
              <Text variant="body" style={{ fontWeight: '700' }}>N{(d.amount / 100).toLocaleString()}</Text>
            </View>
          </Card>
        ))
      ) : (
        <EmptyState icon="heart-outline" title="No donations yet" subtitle="Be the first to support our mission" />
      )}

      <View style={{ height: 30 }} />

      <PaystackPayment
        visible={paystackVisible}
        amount={paymentAmount}
        email={userProfile?.user?.email || ''}
        reference={paymentReference}
        publicKey={paystackPublicKey}
        metadata={{
          campaignId: selectedCampaignId,
          isAnonymous,
          message,
        }}
        onSuccess={handlePaystackSuccess}
        onCancel={handlePaystackCancel}
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
  heroCard: { backgroundColor: '#EF4444', padding: 24, alignItems: 'center', marginBottom: 20 },
  heroTitle: { color: '#FFF', fontWeight: '700', marginTop: 8 },
  heroSub: { color: '#FFF', opacity: 0.8, marginTop: 4, textAlign: 'center' },
  sectionTitle: { color: '#111827', marginBottom: 12 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFF' },
  chipActive: { borderColor: '#00A86B', backgroundColor: '#DCFCE7' },
  chipText: { color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#00A86B', fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#111827', backgroundColor: '#FFF' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  checkboxOn: { backgroundColor: '#00A86B', borderColor: '#00A86B' },
  campaignCard: { padding: 16, marginBottom: 12 },
  campaignHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  campaignName: { fontWeight: '600', flex: 1 },
  catBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  catText: { color: '#3B82F6', fontSize: 11, textTransform: 'capitalize' },
  campaignDesc: { color: '#6B7280', marginBottom: 10 },
  bar: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3 },
  barFill: { height: 6, backgroundColor: '#00A86B', borderRadius: 3 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  donItem: { padding: 12, marginBottom: 8 },
  donRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  donIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
});
