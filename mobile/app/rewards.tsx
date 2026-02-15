import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';

interface PointsBalance {
  totalPoints: number;
}

interface Redemption {
  id: string;
  productType: 'airtime' | 'data';
  pointsDebited: number;
  nairaValue: string;
  status: 'pending' | 'completed' | 'failed';
  phoneNumber?: string;
  carrier?: string;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

interface ConversionSetting {
  productType: string;
  baseRate: string;
  minPoints: number;
  maxPoints: number;
  isActive: boolean;
}

interface QuoteResult {
  pointsNeeded: number;
  nairaValue: number;
  rate: number;
  minPoints: number;
  maxPoints: number;
}

type RedeemType = 'airtime' | 'data' | null;

const CARRIERS = [
  { label: 'MTN', value: 'MTN' },
  { label: 'Airtel', value: 'AIRTEL' },
  { label: 'Glo', value: 'GLO' },
  { label: '9mobile', value: '9MOBILE' },
];

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export default function RewardsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [activeModal, setActiveModal] = useState<RedeemType>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [nairaValue, setNairaValue] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [showCarrierPicker, setShowCarrierPicker] = useState(false);
  const queryClient = useQueryClient();

  const { data: pointsData, isLoading, error, refetch: refetchPoints } = useQuery({
    queryKey: ['/api/members/points'],
    queryFn: async () => {
      const response = await api.get('/api/members/points');
      if (!response.success) throw new Error(response.error || 'Failed to load points');
      return response.data as PointsBalance;
    },
  });

  const { data: conversionData } = useQuery({
    queryKey: ['/api/rewards/conversion-settings'],
    queryFn: async () => {
      const response = await api.get('/api/rewards/conversion-settings');
      if (!response.success) throw new Error(response.error || 'Failed to load settings');
      return response.data as ConversionSetting[];
    },
  });

  const { data: redemptionsData, refetch: refetchRedemptions } = useQuery({
    queryKey: ['/api/rewards/redemptions'],
    queryFn: async () => {
      const response = await api.get('/api/rewards/redemptions');
      if (!response.success) throw new Error(response.error || 'Failed to load history');
      return response.data as { redemptions: Redemption[] };
    },
  });

  const quoteMutation = useMutation({
    mutationFn: async (params: { productType: string; carrier: string; nairaValue: number }) => {
      const response = await api.post('/api/rewards/quote', params);
      if (!response.success) throw new Error(response.error || 'Failed to get quote');
      return response.data as QuoteResult;
    },
  });

  const redeemMutation = useMutation({
    mutationFn: async (params: { phoneNumber: string; carrier: string; productType: string; nairaValue: number }) => {
      const response = await api.post('/api/rewards/redeem', params);
      if (!response.success) throw new Error(response.error || 'Redemption failed');
      return response.data;
    },
    onSuccess: (data: any) => {
      Alert.alert('Success', data?.message || 'Redemption completed successfully!');
      resetForm();
      setActiveModal(null);
      refetchPoints();
      refetchRedemptions();
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message);
    },
  });

  const resetForm = () => {
    setPhoneNumber('');
    setNairaValue('');
    setSelectedCarrier('');
    quoteMutation.reset();
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchPoints(), refetchRedemptions()]);
    setRefreshing(false);
  }, [refetchPoints, refetchRedemptions]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const formatPoints = (points: number) => {
    return points.toLocaleString();
  };

  const getRedemptionIcon = (type: string): string => {
    switch (type) {
      case 'airtime': return 'call-outline';
      case 'data': return 'wifi-outline';
      default: return 'gift-outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'failed': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const isValidPhone = (phone: string) => {
    const cleaned = phone.replace(/\s/g, '');
    return /^0[789][01]\d{8}$/.test(cleaned);
  };

  const handleGetQuote = () => {
    if (!activeModal || !selectedCarrier || !nairaValue || parseInt(nairaValue) <= 0) return;
    quoteMutation.mutate({
      productType: activeModal,
      carrier: selectedCarrier,
      nairaValue: parseInt(nairaValue),
    });
  };

  const handleRedeem = () => {
    if (!activeModal) return;
    if (!isValidPhone(phoneNumber)) {
      Alert.alert('Invalid Phone', 'Please enter a valid Nigerian phone number (e.g. 08012345678)');
      return;
    }
    if (!selectedCarrier) {
      Alert.alert('Select Carrier', 'Please select your mobile carrier');
      return;
    }
    if (!nairaValue || parseInt(nairaValue) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid Naira amount');
      return;
    }

    const quote = quoteMutation.data;
    const label = activeModal === 'airtime' ? 'Airtime' : 'Data Bundle';

    Alert.alert(
      `Confirm ${label} Purchase`,
      `Redeem ${quote ? formatPoints(quote.pointsNeeded) + ' points' : ''} for N${parseInt(nairaValue).toLocaleString()} ${label.toLowerCase()} to ${phoneNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => redeemMutation.mutate({
            phoneNumber: phoneNumber.trim(),
            carrier: selectedCarrier,
            productType: activeModal,
            nairaValue: parseInt(nairaValue),
          }),
        },
      ]
    );
  };

  const totalPoints = pointsData?.totalPoints ?? 0;
  const redemptions = redemptionsData?.redemptions ?? [];
  const isPending = redeemMutation.isPending;

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
        <Text variant="body" style={{ marginTop: 12, color: '#6B7280' }}>Loading rewards...</Text>
      </View>
    );
  }

  if (error) {
    return <ErrorState message="Could not load rewards" onRetry={() => refetchPoints()} />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A86B" />
        }
      >
        <Card style={styles.balanceCard}>
          <Text variant="caption" style={styles.balanceLabel}>Your Points Balance</Text>
          <Text variant="h1" style={styles.balanceAmount}>{formatPoints(totalPoints)}</Text>
          <Text variant="caption" style={styles.balanceSubtext}>points available</Text>
        </Card>

        <Text variant="h3" style={styles.sectionTitle}>Redeem Points</Text>
        <View style={styles.optionsRow}>
          <TouchableOpacity style={styles.optionCard} onPress={() => { resetForm(); setActiveModal('airtime'); }}>
            <View style={[styles.optionIcon, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="call-outline" size={28} color="#00A86B" />
            </View>
            <Text variant="caption" style={styles.optionLabel}>Airtime</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionCard} onPress={() => { resetForm(); setActiveModal('data'); }}>
            <View style={[styles.optionIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="wifi-outline" size={28} color="#3B82F6" />
            </View>
            <Text variant="caption" style={styles.optionLabel}>Data</Text>
          </TouchableOpacity>
        </View>

        <Text variant="h3" style={styles.sectionTitle}>Recent Transactions</Text>
        {redemptions.length > 0 ? (
          redemptions.slice(0, 20).map((item) => (
            <Card key={item.id} style={styles.txCard}>
              <View style={styles.txRow}>
                <View style={[styles.txIcon, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
                  <Ionicons name={getRedemptionIcon(item.productType) as any} size={20} color={getStatusColor(item.status)} />
                </View>
                <View style={styles.txInfo}>
                  <Text variant="body" style={styles.txTitle}>
                    {item.productType === 'airtime' ? 'Airtime' : 'Data Bundle'}
                  </Text>
                  <Text variant="caption" style={styles.txDate}>
                    {item.carrier ? `${item.carrier} - ` : ''}{formatDate(item.createdAt)}
                  </Text>
                </View>
                <View style={styles.txAmountCol}>
                  <Text variant="body" style={styles.txPoints}>-{formatPoints(item.pointsDebited)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
                    <Text variant="caption" style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          ))
        ) : (
          <EmptyState
            icon="receipt-outline"
            title="No transactions yet"
            subtitle="Redeem your points to see your history here"
          />
        )}
      </ScrollView>

      <Modal
        visible={activeModal === 'airtime' || activeModal === 'data'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveModal(null)}
      >
        <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <Text variant="h3" style={styles.modalTitle}>
              {activeModal === 'airtime' ? 'Buy Airtime' : 'Buy Data'}
            </Text>
            <TouchableOpacity onPress={() => setActiveModal(null)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            <Text variant="caption" style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 08012345678"
              placeholderTextColor="#9CA3AF"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              maxLength={11}
            />

            <Text variant="caption" style={styles.fieldLabel}>Carrier</Text>
            <TouchableOpacity style={styles.selector} onPress={() => setShowCarrierPicker(true)}>
              <Text variant="body" style={selectedCarrier ? styles.selectorText : styles.selectorPlaceholder}>
                {selectedCarrier ? CARRIERS.find(c => c.value === selectedCarrier)?.label : 'Select carrier'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>

            <Text variant="caption" style={styles.fieldLabel}>Amount (Naira)</Text>

            <View style={styles.quickAmountsRow}>
              {QUICK_AMOUNTS.map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.quickAmountChip, nairaValue === String(amt) && styles.quickAmountChipActive]}
                  onPress={() => {
                    setNairaValue(String(amt));
                    if (selectedCarrier && activeModal) {
                      quoteMutation.mutate({ productType: activeModal, carrier: selectedCarrier, nairaValue: amt });
                    }
                  }}
                >
                  <Text variant="caption" style={[styles.quickAmountText, nairaValue === String(amt) && styles.quickAmountTextActive]}>
                    N{amt.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Or enter custom amount"
              placeholderTextColor="#9CA3AF"
              value={nairaValue}
              onChangeText={(text) => {
                setNairaValue(text);
                quoteMutation.reset();
              }}
              keyboardType="number-pad"
            />

            {selectedCarrier && nairaValue && parseInt(nairaValue) > 0 && !quoteMutation.data && (
              <Button
                title={quoteMutation.isPending ? 'Calculating...' : 'Get Points Quote'}
                onPress={handleGetQuote}
                loading={quoteMutation.isPending}
                variant="outline"
                style={{ marginTop: 12 }}
              />
            )}

            {quoteMutation.data && (
              <View style={styles.conversionInfo}>
                <Ionicons name="information-circle" size={16} color="#3B82F6" />
                <Text variant="caption" style={styles.conversionText}>
                  N{quoteMutation.data.nairaValue.toLocaleString()} = {formatPoints(quoteMutation.data.pointsNeeded)} points
                </Text>
              </View>
            )}

            {quoteMutation.isError && (
              <View style={[styles.conversionInfo, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text variant="caption" style={{ color: '#EF4444' }}>
                  {quoteMutation.error?.message || 'Could not calculate quote'}
                </Text>
              </View>
            )}

            <View style={styles.balanceReminder}>
              <Text variant="caption" style={styles.balanceReminderText}>
                Available: {formatPoints(totalPoints)} points
              </Text>
            </View>

            <Button
              title={isPending ? 'Processing...' : `Redeem for ${activeModal === 'airtime' ? 'Airtime' : 'Data'}`}
              onPress={handleRedeem}
              loading={isPending}
              disabled={isPending || !quoteMutation.data}
              style={styles.redeemButton}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showCarrierPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCarrierPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text variant="h3" style={styles.modalTitle}>Select Carrier</Text>
            <TouchableOpacity onPress={() => setShowCarrierPicker(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll}>
            {CARRIERS.map((carrier) => (
              <TouchableOpacity
                key={carrier.value}
                style={styles.bankItem}
                onPress={() => {
                  setSelectedCarrier(carrier.value);
                  setShowCarrierPicker(false);
                  quoteMutation.reset();
                }}
              >
                <Text variant="body" style={styles.bankName}>{carrier.label}</Text>
                {selectedCarrier === carrier.value && (
                  <Ionicons name="checkmark" size={20} color="#00A86B" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
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
  content: {
    padding: 16,
  },
  balanceCard: {
    backgroundColor: '#00A86B',
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceLabel: {
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 4,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '800',
  },
  balanceSubtext: {
    color: '#FFFFFF',
    opacity: 0.7,
    marginTop: 4,
  },
  sectionTitle: {
    marginBottom: 12,
    color: '#111827',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionLabel: {
    fontWeight: '600',
    color: '#374151',
  },
  txCard: {
    marginBottom: 8,
    padding: 12,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontWeight: '600',
    color: '#111827',
    fontSize: 14,
  },
  txDate: {
    color: '#9CA3AF',
    marginTop: 2,
  },
  txAmountCol: {
    alignItems: 'flex-end',
  },
  txPoints: {
    fontWeight: '700',
    color: '#EF4444',
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
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
  modalTitle: {
    color: '#111827',
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    padding: 16,
    paddingBottom: 40,
  },
  fieldLabel: {
    color: '#374151',
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  selectorText: {
    color: '#111827',
    fontSize: 16,
  },
  selectorPlaceholder: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  quickAmountsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  quickAmountChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  quickAmountChipActive: {
    borderColor: '#00A86B',
    backgroundColor: '#DCFCE7',
  },
  quickAmountText: {
    color: '#374151',
    fontWeight: '500',
  },
  quickAmountTextActive: {
    color: '#00A86B',
    fontWeight: '700',
  },
  conversionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  conversionText: {
    color: '#3B82F6',
  },
  balanceReminder: {
    marginTop: 12,
    alignItems: 'center',
  },
  balanceReminderText: {
    color: '#6B7280',
  },
  redeemButton: {
    marginTop: 20,
  },
  bankItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  bankName: {
    color: '#111827',
    fontSize: 16,
  },
});
