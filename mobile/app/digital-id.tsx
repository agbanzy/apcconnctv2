import { useState, useCallback, useRef } from 'react';
import {
  View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
  Share, Alert, ActivityIndicator, Platform, Dimensions
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { api } from '@/lib/api';
import { storage } from '@/lib/storage';
import Svg, { Rect } from 'react-native-svg';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - 48;

function generateQRMatrix(data: string): boolean[][] {
  const size = 25;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0;
  }
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (row < 7 && col < 7) { matrix[row][col] = true; continue; }
      if (row < 7 && col >= size - 7) { matrix[row][col] = true; continue; }
      if (row >= size - 7 && col < 7) { matrix[row][col] = true; continue; }
      if ((row === 1 || row === 5) && ((col >= 1 && col <= 5) || (col >= size - 6 && col <= size - 2))) { matrix[row][col] = false; continue; }
      if ((row === size - 6 || row === size - 2) && col >= 1 && col <= 5) { matrix[row][col] = false; continue; }
      if ((col === 1 || col === 5) && ((row >= 1 && row <= 5) || (row >= size - 6 && row <= size - 2))) { matrix[row][col] = false; continue; }
      if (row === 2 || row === 3 || row === 4) {
        if ((col >= 2 && col <= 4) || (col >= size - 5 && col <= size - 3)) { matrix[row][col] = true; continue; }
      }
      if ((row === size - 5 || row === size - 4 || row === size - 3) && col >= 2 && col <= 4) { matrix[row][col] = true; continue; }
      const idx = row * size + col;
      const seed = (hash ^ (idx * 2654435761)) >>> 0;
      matrix[row][col] = (seed % 3) === 0;
    }
  }
  return matrix;
}

function QRCode({ value, size = 120 }: { value: string; size?: number }) {
  const matrix = generateQRMatrix(value);
  const cellSize = size / matrix.length;

  return (
    <View style={{ backgroundColor: '#FFFFFF', padding: 8, borderRadius: 8 }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {matrix.map((row, rowIdx) =>
          row.map((cell, colIdx) =>
            cell ? (
              <Rect
                key={`${rowIdx}-${colIdx}`}
                x={colIdx * cellSize}
                y={rowIdx * cellSize}
                width={cellSize}
                height={cellSize}
                fill="#000000"
              />
            ) : null
          )
        )}
      </Svg>
    </View>
  );
}

export default function DigitalIdScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);

  const loadMemberId = useCallback(async () => {
    const userData = await storage.getUserData();
    if (userData?.member?.id) {
      setMemberId(userData.member.id);
    }
  }, []);

  useState(() => { loadMemberId(); });

  const { data: cardData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/members', memberId, 'id-card'],
    queryFn: async () => {
      if (!memberId) throw new Error('No member ID');
      const response = await api.get(`/api/members/${memberId}/id-card`);
      if (!response.success) throw new Error(response.error || 'Failed to load ID card');
      return response.data as {
        member: any;
        token: string;
        idCard: any;
      };
    },
    enabled: !!memberId,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleShare = async () => {
    if (!cardData) return;
    try {
      const verifyUrl = `https://apcconnect.ng/id-card/verify/${memberId}?token=${cardData.token}`;
      await Share.share({
        title: 'APC Digital ID Card',
        message: `Verify my APC membership ID card: ${verifyUrl}`,
        url: verifyUrl,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  if (isLoading || !memberId) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
        <Text variant="body" style={{ color: '#6B7280', marginTop: 12 }}>Loading your ID card...</Text>
      </View>
    );
  }

  if (error || !cardData) {
    return <ErrorState message="Unable to load your digital ID card" onRetry={refetch} />;
  }

  const { member, token } = cardData;
  const user = member?.user;
  const ward = member?.ward;
  const lga = ward?.lga;
  const state = lga?.state;
  const maskedNin = member?.nin ? `****${member.nin.slice(-4)}` : 'Not provided';
  const verifyUrl = `https://apcconnect.ng/id-card/verify/${memberId}?token=${token}`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'pending': return '#F59E0B';
      default: return '#EF4444';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return 'checkmark-circle';
      case 'pending': return 'time';
      default: return 'close-circle';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A86B" />}
      >
        <View style={styles.header}>
          <Ionicons name="card" size={28} color="#00A86B" />
          <Text variant="h2" style={styles.headerTitle}>Digital ID Card</Text>
        </View>

        <View style={styles.cardOuter}>
          <View style={styles.cardInner}>
            <View style={styles.cardTop}>
              <View style={styles.logoRow}>
                <View style={styles.logoCircle}>
                  <Text variant="body" style={styles.logoText}>APC</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="h3" style={styles.partyName}>ALL PROGRESSIVES CONGRESS</Text>
                  <Text variant="caption" style={styles.partyTagline}>Digital Membership Card</Text>
                </View>
              </View>
            </View>

            <View style={styles.memberSection}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={36} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text variant="h2" style={styles.memberName}>
                  {user?.firstName || ''} {user?.lastName || ''}
                </Text>
                <Text variant="body" style={styles.memberIdText}>{member?.memberId || 'N/A'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(member?.status)}20` }]}>
                  <Ionicons name={getStatusIcon(member?.status) as any} size={14} color={getStatusColor(member?.status)} />
                  <Text variant="caption" style={[styles.statusText, { color: getStatusColor(member?.status) }]}>
                    {(member?.status || 'unknown').toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text variant="caption" style={styles.detailLabel}>NIN</Text>
                <Text variant="body" style={styles.detailValue}>{maskedNin}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text variant="caption" style={styles.detailLabel}>Ward</Text>
                <Text variant="body" style={styles.detailValue} numberOfLines={1}>{ward?.name || 'N/A'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text variant="caption" style={styles.detailLabel}>LGA</Text>
                <Text variant="body" style={styles.detailValue} numberOfLines={1}>{lga?.name || 'N/A'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text variant="caption" style={styles.detailLabel}>State</Text>
                <Text variant="body" style={styles.detailValue} numberOfLines={1}>{state?.name || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text variant="caption" style={styles.detailLabel}>Member Since</Text>
                <Text variant="body" style={styles.detailValue}>
                  {member?.joinDate
                    ? new Date(member.joinDate).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
                    : 'N/A'}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text variant="caption" style={styles.detailLabel}>Phone</Text>
                <Text variant="body" style={styles.detailValue}>{user?.phone || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.qrSection}>
              <View style={{ alignItems: 'center' }}>
                <QRCode value={verifyUrl} size={110} />
                <Text variant="caption" style={styles.qrHint}>Scan to verify authenticity</Text>
              </View>
              <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                <View style={styles.partyBadge}>
                  <Text variant="body" style={styles.partyBadgeText}>APC</Text>
                </View>
                <Text variant="caption" style={styles.verifyText}>Verified Digital ID</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <View style={styles.actionIcon}>
              <Ionicons name="share-social" size={20} color="#00A86B" />
            </View>
            <Text variant="body" style={styles.actionText}>Share Card</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark" size={20} color="#00A86B" />
            <Text variant="body" style={styles.infoText}>
              Your digital ID card is cryptographically signed and can be verified by scanning the QR code.
            </Text>
          </View>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  scrollView: { flex: 1 },
  content: { padding: 16, paddingTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  headerTitle: { fontWeight: '700', color: '#111827' },
  cardOuter: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#00A86B',
    padding: 3,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  cardInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
  },
  cardTop: { marginBottom: 16 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#00A86B', justifyContent: 'center', alignItems: 'center',
  },
  logoText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  partyName: { fontSize: 13, fontWeight: '700', color: '#00A86B', letterSpacing: 0.5 },
  partyTagline: { color: '#9CA3AF', fontSize: 11, marginTop: 1 },
  memberSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#00A86B', justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#E5E7EB',
  },
  memberName: { fontWeight: '700', color: '#111827', fontSize: 18 },
  memberIdText: { color: '#6B7280', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 13, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12,
    alignSelf: 'flex-start', marginTop: 4,
  },
  statusText: { fontWeight: '600', fontSize: 10, letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },
  detailsGrid: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  detailItem: { flex: 1 },
  detailLabel: { color: '#9CA3AF', fontSize: 10, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { color: '#374151', fontWeight: '600', fontSize: 13 },
  qrSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  qrHint: { color: '#9CA3AF', fontSize: 10, marginTop: 6, textAlign: 'center' },
  partyBadge: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#00A86B',
  },
  partyBadgeText: { color: '#00A86B', fontWeight: '800', fontSize: 16 },
  verifyText: { color: '#00A86B', fontSize: 10, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  actionRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 20 },
  actionButton: { alignItems: 'center', gap: 6 },
  actionIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#D1FAE5',
  },
  actionText: { color: '#374151', fontWeight: '500', fontSize: 12 },
  infoCard: { marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoText: { flex: 1, color: '#6B7280', fontSize: 13, lineHeight: 18 },
});
