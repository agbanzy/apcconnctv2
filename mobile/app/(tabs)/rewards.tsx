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
  productType: 'airtime' | 'data' | 'cash';
  pointsDebited: number;
  nairaValue: string;
  status: 'pending' | 'completed' | 'failed';
  phoneNumber?: string;
  carrier?: string;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

interface Bank {
  id: string;
  code: string;
  name: string;
}

interface ConversionSetting {
  productType: string;
  baseRate: string;
  minPoints: number;
  maxPoints: number;
  isActive: boolean;
}

type RedeemType = 'airtime' | 'data' | 'cash' | null;

export default function RewardsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [activeModal, setActiveModal] = useState<RedeemType>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pointsAmount, setPointsAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [verifiedAccountName, setVerifiedAccountName] = useState('');
  const queryClient = useQueryClient();

  // Queries
  const { data: pointsData, isLoading, error, refetch: refetchPoints } = useQuery({
    queryKey: ['/api/members/points'],
    queryFn: async () => {
      const response = await api.get('/api/members/points');
      if (!response.success) throw new Error(response.error || 'Failed to load points');
      return response.data as PointsBalance;
    },
  });

  const { data: conversionData } = useQuery({
    queryKey: ['/api/rewards/conversion/settings'],
    queryFn: async () => {
      const response = await api.get('/api/rewards/conversion/settings');
      if (!response.success) throw new Error(response.error || 'Failed to load settings');
      return response.data as { settings: ConversionSetting[] };
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

  const { data: banksData } = useQuery({
    queryKey: ['/api/rewards/banks'],
    queryFn: async () => {
      const response = await api.get('/api/rewards/banks');
      if (!response.success) throw new Error(response.error || 'Failed to load banks');
      return response.data as { banks: Bank[] };
    },
    enabled: activeModal === 'cash',
  });

  // Mutations
  const airtimeMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/rewards/redeem/airtime', {
        phoneNumber: phoneNumber.trim(),
        pointsAmount: parseInt(pointsAmount),
        idempotencyKey: `air_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      });
      if (!response.success) throw new Error(response.error || 'Airtime redemption failed');
      return response.data;
    },
    onSuccess: (data: any) => {
      Alert.alert('Success', data?.message || 'Airtime sent successfully!');
      resetForm();
      setActiveModal(null);
      refetchPoints();
      refetchRedemptions();
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message);
    },
  });

  const dataMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/rewards/redeem/data', {
        phoneNumber: phoneNumber.trim(),
        pointsAmount: parseInt(pointsAmount),
        billerCode: 'BIL135',
        idempotencyKey: `data_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      });
      if (!response.success) throw new Error(response.error || 'Data redemption failed');
      return response.data;
    },
    onSuccess: (data: any) => {
      Alert.alert('Success', data?.message || 'Data bundle sent successfully!');
      resetForm();
      setActiveModal(null);
      refetchPoints();
      refetchRedemptions();
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message);
    },
  });

  const cashMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/rewards/redeem/cash', {
        pointsAmount: parseInt(pointsAmount),
        accountNumber: accountNumber.trim(),
        bankCode: selectedBank!.code,
      });
      if (!response.success) throw new Error(response.error || 'Cash withdrawal failed');
      return response.data;
    },
    onSuccess: (data: any) => {
      Alert.alert('Success', data?.message || 'Transfer initiated successfully!');
      resetForm();
      setActiveModal(null);
      refetchPoints();
      refetchRedemptions();
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message);
    },
  });

  const verifyBankMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/rewards/verify-bank', {
        accountNumber: accountNumber.trim(),
        bankCode: selectedBank!.code,
      });
      if (!response.success) throw new Error(response.error || 'Verification failed');
      return response.data as { account: { account_name: string } };
    },
    onSuccess: (data) => {
      setVerifiedAccountName(data.account.account_name);
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message);
      setVerifiedAccountName('');
    },
  });

  const resetForm = () => {
    setPhoneNumber('');
    setPointsAmount('');
    setAccountNumber('');
    setSelectedBank(null);
    setVerifiedAccountName('');
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

  const getRedemptionIcon = (type: string) => {
    switch (type) {
      case 'airtime': return 'call-outline';
      case 'data': return 'wifi-outline';
      case 'cash': return 'cash-outline';
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
    return /^(\+234|234|0)\d{10}$/.test(cleaned);
  };

  const handleRedeem = (type: RedeemType) => {
    if (type === 'airtime') {
      if (!isValidPhone(phoneNumber)) {
        Alert.alert('Invalid Phone', 'Please enter a valid Nigerian phone number');
        return;
      }
      if (!pointsAmount || parseInt(pointsAmount) < 100) {
        Alert.alert('Invalid Amount', 'Minimum redemption is 100 points');
        return;
      }
      Alert.alert(
        'Confirm Airtime',
        `Redeem ${formatPoints(parseInt(pointsAmount))} points for airtime to ${phoneNumber}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: () => airtimeMutation.mutate() },
        ]
      );
    } else if (type === 'data') {
      if (!isValidPhone(phoneNumber)) {
        Alert.alert('Invalid Phone', 'Please enter a valid Nigerian phone number');
        return;
      }
      if (!pointsAmount || parseInt(pointsAmount) < 100) {
        Alert.alert('Invalid Amount', 'Minimum redemption is 100 points');
        return;
      }
      Alert.alert(
        'Confirm Data',
        `Redeem ${formatPoints(parseInt(pointsAmount))} points for data to ${phoneNumber}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: () => dataMutation.mutate() },
        ]
      );
    } else if (type === 'cash') {
      if (!selectedBank || !accountNumber || accountNumber.length !== 10) {
        Alert.alert('Missing Info', 'Please select a bank and enter a valid 10-digit account number');
        return;
      }
      if (!verifiedAccountName) {
        Alert.alert('Verify Account', 'Please verify your bank account first');
        return;
      }
      if (!pointsAmount || parseInt(pointsAmount) < 500) {
        Alert.alert('Invalid Amount', 'Minimum cash withdrawal is 500 points');
        return;
      }
      Alert.alert(
        'Confirm Withdrawal',
        `Withdraw ${formatPoints(parseInt(pointsAmount))} points to ${verifiedAccountName} (${selectedBank.name})?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: () => cashMutation.mutate() },
        ]
      );
    }
  };

  const totalPoints = pointsData?.totalPoints ?? 0;
  const redemptions = redemptionsData?.redemptions ?? [];
  const isPending = airtimeMutation.isPending || dataMutation.isPending || cashMutation.isPending;

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
        {/* Balance Card */}
        <Card style={styles.balanceCard}>
          <Text variant="caption" style={styles.balanceLabel}>Your Points Balance</Text>
          <Text variant="h1" style={styles.balanceAmount}>{formatPoints(totalPoints)}</Text>
          <Text variant="caption" style={styles.balanceSubtext}>points available</Text>
        </Card>

        {/* Redemption Options */}
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

          <TouchableOpacity style={styles.optionCard} onPress={() => { resetForm(); setActiveModal('cash'); }}>
            <View style={[styles.optionIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="cash-outline" size={28} color="#F59E0B" />
            </View>
            <Text variant="caption" style={styles.optionLabel}>Cash</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction History */}
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
                    {item.productType === 'airtime' ? 'Airtime' : item.productType === 'data' ? 'Data Bundle' : 'Cash Withdrawal'}
                  </Text>
                  <Text variant="caption" style={styles.txDate}>{formatDate(item.createdAt)}</Text>
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

      {/* Airtime / Data Modal */}
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
              maxLength={14}
            />

            <Text variant="caption" style={styles.fieldLabel}>Points to Redeem</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 500"
              placeholderTextColor="#9CA3AF"
              value={pointsAmount}
              onChangeText={setPointsAmount}
              keyboardType="number-pad"
            />

            {pointsAmount && parseInt(pointsAmount) > 0 && (
              <View style={styles.conversionInfo}>
                <Ionicons name="information-circle" size={16} color="#3B82F6" />
                <Text variant="caption" style={styles.conversionText}>
                  {formatPoints(parseInt(pointsAmount))} points = ~N{parseInt(pointsAmount).toLocaleString()}
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
              onPress={() => handleRedeem(activeModal)}
              loading={isPending}
              disabled={isPending}
              style={styles.redeemButton}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Cash Withdrawal Modal */}
      <Modal
        visible={activeModal === 'cash'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveModal(null)}
      >
        <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <Text variant="h3" style={styles.modalTitle}>Cash Withdrawal</Text>
            <TouchableOpacity onPress={() => setActiveModal(null)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            {/* Bank Selection */}
            <Text variant="caption" style={styles.fieldLabel}>Select Bank</Text>
            <TouchableOpacity style={styles.selector} onPress={() => setShowBankPicker(true)}>
              <Text variant="body" style={selectedBank ? styles.selectorText : styles.selectorPlaceholder}>
                {selectedBank?.name || 'Choose a bank'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>

            {/* Account Number */}
            <Text variant="caption" style={styles.fieldLabel}>Account Number</Text>
            <TextInput
              style={styles.input}
              placeholder="10-digit account number"
              placeholderTextColor="#9CA3AF"
              value={accountNumber}
              onChangeText={(text) => {
                setAccountNumber(text);
                setVerifiedAccountName('');
              }}
              keyboardType="number-pad"
              maxLength={10}
            />

            {/* Verify Button */}
            {selectedBank && accountNumber.length === 10 && !verifiedAccountName && (
              <Button
                title={verifyBankMutation.isPending ? 'Verifying...' : 'Verify Account'}
                onPress={() => verifyBankMutation.mutate()}
                loading={verifyBankMutation.isPending}
                variant="outline"
                style={styles.verifyButton}
              />
            )}

            {/* Verified Name */}
            {verifiedAccountName && (
              <View style={styles.verifiedBox}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text variant="body" style={styles.verifiedName}>{verifiedAccountName}</Text>
              </View>
            )}

            {/* Points Amount */}
            <Text variant="caption" style={styles.fieldLabel}>Points to Withdraw</Text>
            <TextInput
              style={styles.input}
              placeholder="Min 500, Max 50,000"
              placeholderTextColor="#9CA3AF"
              value={pointsAmount}
              onChangeText={setPointsAmount}
              keyboardType="number-pad"
            />

            {pointsAmount && parseInt(pointsAmount) > 0 && (
              <View style={styles.conversionInfo}>
                <Ionicons name="information-circle" size={16} color="#3B82F6" />
                <Text variant="caption" style={styles.conversionText}>
                  {formatPoints(parseInt(pointsAmount))} points = N{parseInt(pointsAmount).toLocaleString()}
                </Text>
              </View>
            )}

            <View style={styles.balanceReminder}>
              <Text variant="caption" style={styles.balanceReminderText}>
                Available: {formatPoints(totalPoints)} points
              </Text>
            </View>

            <Button
              title={isPending ? 'Processing...' : 'Withdraw to Bank'}
              onPress={() => handleRedeem('cash')}
              loading={isPending}
              disabled={isPending || !verifiedAccountName}
              style={styles.redeemButton}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bank Picker Modal */}
      <Modal
        visible={showBankPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBankPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text variant="h3" style={styles.modalTitle}>Select Bank</Text>
            <TouchableOpacity onPress={() => setShowBankPicker(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll}>
            {banksData?.banks?.map((bank) => (
              <TouchableOpacity
                key={bank.id || bank.code}
                style={styles.bankItem}
                onPress={() => {
                  setSelectedBank(bank);
                  setVerifiedAccountName('');
                  setShowBankPicker(false);
                }}
              >
                <Text variant="body" style={styles.bankName}>{bank.name}</Text>
                {selectedBank?.code === bank.code && (
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
  // Balance Card
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
  // Section
  sectionTitle: {
    marginBottom: 12,
    color: '#111827',
  },
  // Options
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
  // Transaction cards
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
  // Modal
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
  },
  // Form fields
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
  verifyButton: {
    marginTop: 12,
  },
  verifiedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 10,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
  },
  verifiedName: {
    color: '#10B981',
    fontWeight: '600',
  },
  redeemButton: {
    marginTop: 24,
  },
  // Bank picker
  bankItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  bankName: {
    color: '#111827',
  },
});
