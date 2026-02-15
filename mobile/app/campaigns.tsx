import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';

interface Campaign {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  votesCount: number;
  commentsCount: number;
  createdAt: string;
  author?: { firstName: string; lastName: string };
  hasVoted?: boolean;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  member?: { user?: { firstName: string; lastName: string } };
}

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'infrastructure', label: 'Infrastructure' },
  { key: 'education', label: 'Education' },
  { key: 'health', label: 'Health' },
  { key: 'economy', label: 'Economy' },
  { key: 'security', label: 'Security' },
];

export default function CampaignsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ title: '', description: '', category: 'infrastructure' });
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/campaigns', selectedCategory],
    queryFn: async () => {
      const url = selectedCategory === 'all' ? '/api/campaigns' : `/api/campaigns?category=${selectedCategory}`;
      const response = await api.get(url);
      if (!response.success) throw new Error(response.error || 'Failed to load campaigns');
      return response.data as Campaign[];
    },
  });

  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ['/api/campaigns', selectedCampaign?.id, 'comments'],
    queryFn: async () => {
      const response = await api.get(`/api/campaigns/${selectedCampaign!.id}`);
      if (!response.success) throw new Error(response.error || 'Failed to load comments');
      return (response.data as any)?.comments as Comment[] || [];
    },
    enabled: !!selectedCampaign?.id,
  });

  const voteMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await api.post(`/api/campaigns/${campaignId}/vote`);
      if (!response.success) throw new Error(response.error || 'Failed to vote');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to vote');
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ campaignId, content }: { campaignId: string; content: string }) => {
      const response = await api.post(`/api/campaigns/${campaignId}/comments`, { content });
      if (!response.success) throw new Error(response.error || 'Failed to post comment');
      return response.data;
    },
    onSuccess: () => {
      setCommentText('');
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newCampaign) => {
      const response = await api.post('/api/campaigns', data);
      if (!response.success) throw new Error(response.error || 'Failed to create campaign');
      return response.data;
    },
    onSuccess: () => {
      setShowCreateModal(false);
      setNewCampaign({ title: '', description: '', category: 'infrastructure' });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      Alert.alert('Success', 'Campaign submitted for review');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create campaign');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'rejected': return '#EF4444';
      default: return '#6B7280';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
        <Text variant="body" style={{ marginTop: 12, color: '#6B7280' }}>Loading campaigns...</Text>
      </View>
    );
  }

  if (error) {
    return <ErrorState message="Could not load campaigns" onRetry={() => refetch()} />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.categoryChip, selectedCategory === cat.key && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Text variant="caption" style={[styles.categoryChipText, selectedCategory === cat.key && styles.categoryChipTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A86B" />}
      >
        <View style={styles.headerRow}>
          <Text variant="h2">Campaigns</Text>
          <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {campaigns && campaigns.length > 0 ? (
          campaigns.map((campaign) => (
            <Card key={campaign.id} style={styles.campaignCard}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setSelectedCampaign(campaign)}>
                <View style={styles.campaignHeader}>
                  <View style={{ flex: 1 }}>
                    <Text variant="h3" style={styles.campaignTitle}>{campaign.title}</Text>
                    <View style={styles.metaRow}>
                      <View style={[styles.categoryBadge, { backgroundColor: `${getStatusColor(campaign.status)}20` }]}>
                        <Text variant="caption" style={[styles.categoryText, { color: getStatusColor(campaign.status) }]}>
                          {campaign.status}
                        </Text>
                      </View>
                      <Text variant="caption" style={styles.categoryLabel}>{campaign.category}</Text>
                    </View>
                  </View>
                </View>
                <Text variant="body" style={styles.campaignDesc} numberOfLines={3}>{campaign.description}</Text>
              </TouchableOpacity>
              <View style={styles.campaignFooter}>
                <TouchableOpacity
                  style={[styles.voteBtn, campaign.hasVoted && styles.voteBtnActive]}
                  onPress={() => voteMutation.mutate(campaign.id)}
                >
                  <Ionicons name={campaign.hasVoted ? 'heart' : 'heart-outline'} size={18} color={campaign.hasVoted ? '#EF4444' : '#6B7280'} />
                  <Text variant="caption" style={styles.voteCount}>{campaign.votesCount}</Text>
                </TouchableOpacity>
                <View style={styles.commentInfo}>
                  <Ionicons name="chatbubble-outline" size={16} color="#6B7280" />
                  <Text variant="caption" style={styles.commentCount}>{campaign.commentsCount}</Text>
                </View>
                <Text variant="caption" style={styles.dateText}>{formatDate(campaign.createdAt)}</Text>
              </View>
              {campaign.author && (
                <Text variant="caption" style={styles.authorText}>
                  By {campaign.author.firstName} {campaign.author.lastName}
                </Text>
              )}
            </Card>
          ))
        ) : (
          <EmptyState icon="megaphone-outline" title="No campaigns" subtitle="Start a campaign to drive change" />
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={!!selectedCampaign} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedCampaign(null)}>
        {selectedCampaign && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text variant="h3">Campaign Details</Text>
              <TouchableOpacity onPress={() => setSelectedCampaign(null)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <Text variant="h2" style={styles.modalTitle}>{selectedCampaign.title}</Text>
              <Text variant="body" style={styles.modalBody}>{selectedCampaign.description}</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.voteBtn} onPress={() => voteMutation.mutate(selectedCampaign.id)}>
                  <Ionicons name={selectedCampaign.hasVoted ? 'heart' : 'heart-outline'} size={20} color={selectedCampaign.hasVoted ? '#EF4444' : '#6B7280'} />
                  <Text variant="caption" style={styles.voteCount}>{selectedCampaign.votesCount} votes</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.commentsSection}>
                <Text variant="h3" style={{ marginBottom: 12 }}>Comments ({selectedCampaign.commentsCount})</Text>
                {comments && comments.length > 0 ? comments.map((c) => (
                  <View key={c.id} style={styles.commentItem}>
                    <Text variant="caption" style={styles.commentAuthor}>
                      {c.member?.user?.firstName || 'Anonymous'} {c.member?.user?.lastName || ''}
                    </Text>
                    <Text variant="body" style={styles.commentContent}>{c.content}</Text>
                    <Text variant="caption" style={styles.commentDate}>{formatDate(c.createdAt)}</Text>
                  </View>
                )) : (
                  <Text variant="caption" style={{ color: '#9CA3AF', textAlign: 'center', marginVertical: 16 }}>No comments yet</Text>
                )}
              </View>
            </ScrollView>
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment..."
                placeholderTextColor="#9CA3AF"
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendButton, !commentText.trim() && styles.sendButtonDisabled]}
                onPress={() => commentText.trim() && commentMutation.mutate({ campaignId: selectedCampaign.id, content: commentText.trim() })}
                disabled={!commentText.trim() || commentMutation.isPending}
              >
                {commentMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text variant="h3">Create Campaign</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text variant="caption" style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Campaign title"
              placeholderTextColor="#9CA3AF"
              value={newCampaign.title}
              onChangeText={(text) => setNewCampaign({ ...newCampaign, title: text })}
            />
            <Text variant="caption" style={styles.inputLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {CATEGORIES.filter(c => c.key !== 'all').map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.categoryChip, newCampaign.category === cat.key && styles.categoryChipActive, { marginRight: 8 }]}
                  onPress={() => setNewCampaign({ ...newCampaign, category: cat.key })}
                >
                  <Text variant="caption" style={[styles.categoryChipText, newCampaign.category === cat.key && styles.categoryChipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text variant="caption" style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, { height: 120, textAlignVertical: 'top' }]}
              placeholder="Describe your campaign..."
              placeholderTextColor="#9CA3AF"
              value={newCampaign.description}
              onChangeText={(text) => setNewCampaign({ ...newCampaign, description: text })}
              multiline
            />
            <Button
              title="Submit Campaign"
              onPress={() => {
                if (!newCampaign.title.trim() || !newCampaign.description.trim()) {
                  Alert.alert('Error', 'Please fill in all fields');
                  return;
                }
                createMutation.mutate(newCampaign);
              }}
              loading={createMutation.isPending}
              style={{ marginTop: 16 }}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  categoryScroll: { maxHeight: 56, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  categoryContainer: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, flexDirection: 'row' },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6' },
  categoryChipActive: { backgroundColor: '#00A86B' },
  categoryChipText: { color: '#6B7280', fontWeight: '600' },
  categoryChipTextActive: { color: '#FFFFFF' },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  createButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#00A86B', justifyContent: 'center', alignItems: 'center' },
  campaignCard: { marginBottom: 16 },
  campaignHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  campaignTitle: { color: '#111827', marginBottom: 6 },
  metaRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  categoryText: { fontWeight: '600', fontSize: 11 },
  categoryLabel: { color: '#6B7280', textTransform: 'capitalize', fontSize: 12 },
  campaignDesc: { color: '#6B7280', lineHeight: 22, marginBottom: 12 },
  campaignFooter: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  voteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  voteBtnActive: {},
  voteCount: { color: '#6B7280', fontWeight: '500' },
  commentInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentCount: { color: '#6B7280' },
  dateText: { color: '#9CA3AF', marginLeft: 'auto', fontSize: 12 },
  authorText: { color: '#9CA3AF', fontSize: 12, marginTop: 8 },
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalContent: { flex: 1, padding: 16 },
  modalTitle: { marginBottom: 16, color: '#111827' },
  modalBody: { color: '#374151', lineHeight: 24, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 24, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', marginBottom: 16 },
  commentsSection: { paddingTop: 8 },
  commentItem: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  commentAuthor: { fontWeight: '600', color: '#111827', marginBottom: 4 },
  commentContent: { color: '#374151', lineHeight: 20, marginBottom: 4 },
  commentDate: { color: '#9CA3AF', fontSize: 12 },
  commentInputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#FFFFFF', gap: 8 },
  commentInput: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100, color: '#111827' },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#00A86B', justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: '#D1D5DB' },
  inputLabel: { color: '#374151', fontWeight: '600', marginBottom: 6, marginTop: 12 },
  textInput: { backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, marginBottom: 8, color: '#111827' },
});
