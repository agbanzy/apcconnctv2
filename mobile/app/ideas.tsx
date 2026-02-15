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

interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  votesCount: number;
  commentsCount: number;
  createdAt: string;
  hasVoted?: boolean;
  author?: { firstName: string; lastName: string };
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  member?: { user?: { firstName: string; lastName: string } };
}

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'policy', label: 'Policy' },
  { key: 'community', label: 'Community' },
  { key: 'technology', label: 'Technology' },
  { key: 'governance', label: 'Governance' },
  { key: 'other', label: 'Other' },
];

export default function IdeasScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newIdea, setNewIdea] = useState({ title: '', description: '', category: 'policy' });
  const queryClient = useQueryClient();

  const { data: ideas, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/ideas', selectedCategory],
    queryFn: async () => {
      const url = selectedCategory === 'all' ? '/api/ideas' : `/api/ideas?category=${selectedCategory}`;
      const response = await api.get(url);
      if (!response.success) throw new Error(response.error || 'Failed to load ideas');
      return response.data as Idea[];
    },
  });

  const { data: ideaDetail, refetch: refetchDetail } = useQuery({
    queryKey: ['/api/ideas', selectedIdea?.id, 'detail'],
    queryFn: async () => {
      const response = await api.get(`/api/ideas/${selectedIdea!.id}`);
      if (!response.success) throw new Error(response.error);
      return response.data as any;
    },
    enabled: !!selectedIdea?.id,
  });

  const voteMutation = useMutation({
    mutationFn: async (ideaId: string) => {
      const response = await api.post(`/api/ideas/${ideaId}/vote`);
      if (!response.success) throw new Error(response.error || 'Failed to vote');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
      refetchDetail();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to vote');
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ ideaId, content }: { ideaId: string; content: string }) => {
      const response = await api.post(`/api/ideas/${ideaId}/comments`, { content });
      if (!response.success) throw new Error(response.error || 'Failed to post comment');
      return response.data;
    },
    onSuccess: () => {
      setCommentText('');
      refetchDetail();
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newIdea) => {
      const response = await api.post('/api/ideas', data);
      if (!response.success) throw new Error(response.error || 'Failed to submit idea');
      return response.data;
    },
    onSuccess: () => {
      setShowCreateModal(false);
      setNewIdea({ title: '', description: '', category: 'policy' });
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
      Alert.alert('Success', 'Your idea has been submitted!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to submit idea');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10B981';
      case 'pending': case 'under_review': return '#F59E0B';
      case 'implemented': return '#3B82F6';
      case 'rejected': return '#EF4444';
      default: return '#6B7280';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
        <Text variant="body" style={{ marginTop: 12, color: '#6B7280' }}>Loading ideas...</Text>
      </View>
    );
  }

  if (error) {
    return <ErrorState message="Could not load ideas" onRetry={() => refetch()} />;
  }

  const detailComments = ideaDetail?.comments || [];

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
            style={[styles.chip, selectedCategory === cat.key && styles.chipActive]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Text variant="caption" style={[styles.chipText, selectedCategory === cat.key && styles.chipTextActive]}>
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
          <View>
            <Text variant="h2">Ideas Board</Text>
            <Text variant="caption" style={{ color: '#6B7280', marginTop: 2 }}>Share and vote on ideas</Text>
          </View>
          <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {ideas && ideas.length > 0 ? (
          ideas.map((idea) => (
            <Card key={idea.id} style={styles.ideaCard}>
              <View style={styles.ideaVoteCol}>
                <TouchableOpacity
                  onPress={() => voteMutation.mutate(idea.id)}
                  style={[styles.upvoteBtn, idea.hasVoted && styles.upvoteBtnActive]}
                >
                  <Ionicons name="arrow-up" size={20} color={idea.hasVoted ? '#FFFFFF' : '#6B7280'} />
                </TouchableOpacity>
                <Text variant="body" style={[styles.voteNum, idea.hasVoted && styles.voteNumActive]}>
                  {idea.votesCount}
                </Text>
              </View>
              <TouchableOpacity style={styles.ideaContent} activeOpacity={0.7} onPress={() => setSelectedIdea(idea)}>
                <Text variant="h3" style={styles.ideaTitle}>{idea.title}</Text>
                <Text variant="body" style={styles.ideaDesc} numberOfLines={2}>{idea.description}</Text>
                <View style={styles.ideaMeta}>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(idea.status)}20` }]}>
                    <Text variant="caption" style={[styles.statusText, { color: getStatusColor(idea.status) }]}>
                      {idea.status.replace(/_/g, ' ')}
                    </Text>
                  </View>
                  <View style={styles.commentCount}>
                    <Ionicons name="chatbubble-outline" size={14} color="#9CA3AF" />
                    <Text variant="caption" style={{ color: '#9CA3AF' }}>{idea.commentsCount}</Text>
                  </View>
                  <Text variant="caption" style={{ color: '#9CA3AF' }}>{formatDate(idea.createdAt)}</Text>
                </View>
              </TouchableOpacity>
            </Card>
          ))
        ) : (
          <EmptyState icon="bulb-outline" title="No ideas yet" subtitle="Be the first to share an idea!" />
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={!!selectedIdea} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedIdea(null)}>
        {selectedIdea && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text variant="h3">Idea Details</Text>
              <TouchableOpacity onPress={() => setSelectedIdea(null)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <Text variant="h2" style={styles.modalTitle}>{selectedIdea.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(selectedIdea.status)}20`, alignSelf: 'flex-start', marginBottom: 12 }]}>
                <Text variant="caption" style={[styles.statusText, { color: getStatusColor(selectedIdea.status) }]}>
                  {selectedIdea.status.replace(/_/g, ' ')}
                </Text>
              </View>
              <Text variant="body" style={styles.modalBody}>{selectedIdea.description}</Text>
              {selectedIdea.author && (
                <Text variant="caption" style={styles.authorText}>
                  By {selectedIdea.author.firstName} {selectedIdea.author.lastName} on {formatDate(selectedIdea.createdAt)}
                </Text>
              )}
              <View style={styles.modalVoteRow}>
                <TouchableOpacity
                  style={[styles.upvoteBtn, selectedIdea.hasVoted && styles.upvoteBtnActive]}
                  onPress={() => voteMutation.mutate(selectedIdea.id)}
                >
                  <Ionicons name="arrow-up" size={20} color={selectedIdea.hasVoted ? '#FFFFFF' : '#6B7280'} />
                </TouchableOpacity>
                <Text variant="body" style={styles.voteNum}>{selectedIdea.votesCount} votes</Text>
              </View>
              <View style={styles.commentsSection}>
                <Text variant="h3" style={{ marginBottom: 12 }}>Comments ({selectedIdea.commentsCount})</Text>
                {detailComments.length > 0 ? detailComments.map((c: Comment) => (
                  <View key={c.id} style={styles.commentItem}>
                    <Text variant="caption" style={styles.commentAuthor}>
                      {c.member?.user?.firstName || 'Anonymous'} {c.member?.user?.lastName || ''}
                    </Text>
                    <Text variant="body" style={styles.commentBody}>{c.content}</Text>
                    <Text variant="caption" style={{ color: '#9CA3AF', fontSize: 12 }}>{formatDate(c.createdAt)}</Text>
                  </View>
                )) : (
                  <Text variant="caption" style={{ color: '#9CA3AF', textAlign: 'center', marginVertical: 16 }}>No comments yet</Text>
                )}
              </View>
            </ScrollView>
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor="#9CA3AF"
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
                onPress={() => commentText.trim() && commentMutation.mutate({ ideaId: selectedIdea.id, content: commentText.trim() })}
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
            <Text variant="h3">Submit an Idea</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text variant="caption" style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Your idea in a few words"
              placeholderTextColor="#9CA3AF"
              value={newIdea.title}
              onChangeText={(text) => setNewIdea({ ...newIdea, title: text })}
            />
            <Text variant="caption" style={styles.inputLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {CATEGORIES.filter(c => c.key !== 'all').map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.chip, newIdea.category === cat.key && styles.chipActive, { marginRight: 8 }]}
                  onPress={() => setNewIdea({ ...newIdea, category: cat.key })}
                >
                  <Text variant="caption" style={[styles.chipText, newIdea.category === cat.key && styles.chipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text variant="caption" style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, { height: 140, textAlignVertical: 'top' }]}
              placeholder="Describe your idea in detail..."
              placeholderTextColor="#9CA3AF"
              value={newIdea.description}
              onChangeText={(text) => setNewIdea({ ...newIdea, description: text })}
              multiline
            />
            <Button
              title="Submit Idea"
              onPress={() => {
                if (!newIdea.title.trim() || !newIdea.description.trim()) {
                  Alert.alert('Error', 'Please fill in all fields');
                  return;
                }
                createMutation.mutate(newIdea);
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
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6' },
  chipActive: { backgroundColor: '#00A86B' },
  chipText: { color: '#6B7280', fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  createButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#00A86B', justifyContent: 'center', alignItems: 'center' },
  ideaCard: { flexDirection: 'row', marginBottom: 12, padding: 12, gap: 12 },
  ideaVoteCol: { alignItems: 'center', gap: 4 },
  upvoteBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  upvoteBtnActive: { backgroundColor: '#00A86B' },
  voteNum: { fontWeight: '700', color: '#6B7280', fontSize: 14 },
  voteNumActive: { color: '#00A86B' },
  ideaContent: { flex: 1 },
  ideaTitle: { color: '#111827', marginBottom: 4, fontSize: 15 },
  ideaDesc: { color: '#6B7280', lineHeight: 20, marginBottom: 8 },
  ideaMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontWeight: '600', fontSize: 11, textTransform: 'capitalize' },
  commentCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalContent: { flex: 1, padding: 16 },
  modalTitle: { marginBottom: 8, color: '#111827' },
  modalBody: { color: '#374151', lineHeight: 24, marginBottom: 12 },
  authorText: { color: '#9CA3AF', marginBottom: 16 },
  modalVoteRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', marginBottom: 16 },
  commentsSection: { paddingTop: 8 },
  commentItem: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  commentAuthor: { fontWeight: '600', color: '#111827', marginBottom: 4 },
  commentBody: { color: '#374151', lineHeight: 20, marginBottom: 4 },
  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#FFFFFF', gap: 8 },
  commentInput: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100, color: '#111827' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#00A86B', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#D1D5DB' },
  inputLabel: { color: '#374151', fontWeight: '600', marginBottom: 6, marginTop: 12 },
  textInput: { backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, marginBottom: 8, color: '#111827' },
});
