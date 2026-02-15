import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Image, Share, Modal, TextInput, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';

interface NewsPost {
  id: string;
  title: string;
  content: string;
  summary?: string;
  category: string;
  imageUrl?: string;
  isFeatured: boolean;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  author?: {
    firstName: string;
    lastName: string;
  };
}

interface Comment {
  id: string;
  content: string;
  likes: number;
  createdAt: string;
  parentId?: string | null;
  member?: {
    user?: { firstName: string; lastName: string };
  };
  replies?: Comment[];
}

export default function NewsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPost, setSelectedPost] = useState<NewsPost | null>(null);
  const [commentText, setCommentText] = useState('');
  const queryClient = useQueryClient();

  const categories = [
    { key: 'all', label: 'All' },
    { key: 'party_news', label: 'Party News' },
    { key: 'policy_updates', label: 'Policy' },
    { key: 'events', label: 'Events' },
    { key: 'opinion', label: 'Opinion' },
  ];

  const { data: news, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/news', selectedCategory],
    queryFn: async () => {
      const url = selectedCategory === 'all'
        ? '/api/news'
        : `/api/news?category=${selectedCategory}`;
      const response = await api.get(url);
      if (!response.success) throw new Error(response.error || 'Failed to load news');
      return response.data as NewsPost[];
    },
  });

  const { data: comments, refetch: refetchComments, isLoading: commentsLoading } = useQuery({
    queryKey: ['/api/news', selectedPost?.id, 'comments'],
    queryFn: async () => {
      const response = await api.get(`/api/news/${selectedPost!.id}/comments`);
      if (!response.success) throw new Error(response.error || 'Failed to load comments');
      return response.data as Comment[];
    },
    enabled: !!selectedPost?.id,
  });

  const likeMutation = useMutation({
    mutationFn: async (postId: string) => {
      const response = await api.post(`/api/news/${postId}/like`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news'] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      const response = await api.post(`/api/news/${postId}/comments`, { content });
      if (!response.success) throw new Error(response.error || 'Failed to post comment');
      return response.data;
    },
    onSuccess: () => {
      setCommentText('');
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ['/api/news'] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleShare = async (post: NewsPost) => {
    try {
      await Share.share({
        title: post.title,
        message: `${post.title}\n\n${post.summary || post.content.substring(0, 200)}...\n\nRead more on APC Connect`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleLike = (postId: string) => {
    likeMutation.mutate(postId);
  };

  const handlePostComment = () => {
    if (!commentText.trim() || !selectedPost) return;
    commentMutation.mutate({ postId: selectedPost.id, content: commentText.trim() });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'party_news': return '#00A86B';
      case 'policy_updates': return '#3B82F6';
      case 'events': return '#8B5CF6';
      case 'opinion': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getCategoryLabel = (category: string) => {
    return category.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${(firstName || '?')[0]}${(lastName || '?')[0]}`.toUpperCase();
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
        <Text variant="body" style={{ marginTop: 12, color: '#6B7280' }}>Loading news...</Text>
      </View>
    );
  }

  if (error) {
    return <ErrorState message="Could not load news" onRetry={() => refetch()} />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.categoryChip,
              selectedCategory === cat.key && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Text
              variant="caption"
              style={[
                styles.categoryChipText,
                selectedCategory === cat.key && styles.categoryChipTextActive,
              ]}
            >
              {cat.label}
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
        {news && news.length > 0 ? (
          news.map((post: NewsPost) => (
            <TouchableOpacity key={post.id} activeOpacity={0.8} onPress={() => setSelectedPost(post)}>
              <Card style={styles.newsCard}>
                {post.imageUrl && (
                  <Image
                    source={{ uri: post.imageUrl }}
                    style={styles.newsImage}
                    resizeMode="cover"
                  />
                )}

                <View style={styles.newsContent}>
                  <View style={styles.newsHeader}>
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: `${getCategoryColor(post.category)}20` },
                      ]}
                    >
                      <Text
                        variant="caption"
                        style={[styles.categoryText, { color: getCategoryColor(post.category) }]}
                      >
                        {getCategoryLabel(post.category)}
                      </Text>
                    </View>
                    {post.isFeatured && (
                      <View style={styles.featuredBadge}>
                        <Text variant="caption" style={styles.featuredText}>Featured</Text>
                      </View>
                    )}
                  </View>

                  <Text variant="h3" style={styles.newsTitle}>
                    {post.title}
                  </Text>

                  <Text variant="body" style={styles.newsSummary} numberOfLines={3}>
                    {post.summary || post.content}
                  </Text>

                  <View style={styles.newsFooter}>
                    <View style={styles.newsStats}>
                      <TouchableOpacity
                        style={styles.statButton}
                        onPress={(e) => { e.stopPropagation(); handleLike(post.id); }}
                      >
                        <Text variant="caption" style={styles.statText}>
                          {post.likesCount} Likes
                        </Text>
                      </TouchableOpacity>
                      <Text variant="caption" style={styles.statText}>
                        {post.commentsCount} Comments
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.shareButton}
                      onPress={(e) => { e.stopPropagation(); handleShare(post); }}
                    >
                      <Text variant="caption" style={styles.shareText}>Share</Text>
                    </TouchableOpacity>
                  </View>

                  <Text variant="caption" style={styles.newsDate}>
                    {formatDate(post.createdAt)}
                    {post.author && ` by ${post.author.firstName} ${post.author.lastName}`}
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        ) : (
          <EmptyState
            icon="newspaper-outline"
            title="No news available"
            subtitle="Check back later for the latest updates"
          />
        )}
      </ScrollView>

      {/* News Detail Modal */}
      <Modal
        visible={!!selectedPost}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedPost(null)}
      >
        {selectedPost && (
          <KeyboardAvoidingView
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text variant="h3" style={styles.modalTitle}>Article</Text>
              <TouchableOpacity onPress={() => setSelectedPost(null)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
              {/* Article Image */}
              {selectedPost.imageUrl && (
                <Image
                  source={{ uri: selectedPost.imageUrl }}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
              )}

              {/* Category + Featured */}
              <View style={styles.modalMeta}>
                <View
                  style={[
                    styles.categoryBadge,
                    { backgroundColor: `${getCategoryColor(selectedPost.category)}20` },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={[styles.categoryText, { color: getCategoryColor(selectedPost.category) }]}
                  >
                    {getCategoryLabel(selectedPost.category)}
                  </Text>
                </View>
                <Text variant="caption" style={styles.modalDate}>
                  {formatDate(selectedPost.createdAt)}
                </Text>
              </View>

              {/* Title */}
              <Text variant="h2" style={styles.modalArticleTitle}>
                {selectedPost.title}
              </Text>

              {/* Author */}
              {selectedPost.author && (
                <Text variant="caption" style={styles.modalAuthor}>
                  By {selectedPost.author.firstName} {selectedPost.author.lastName}
                </Text>
              )}

              {/* Full Content */}
              <Text variant="body" style={styles.modalBody}>
                {selectedPost.content}
              </Text>

              {/* Like / Share Row */}
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalActionBtn} onPress={() => handleLike(selectedPost.id)}>
                  <Ionicons name="heart-outline" size={20} color="#EF4444" />
                  <Text variant="caption" style={styles.modalActionText}>{selectedPost.likesCount} Likes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalActionBtn} onPress={() => handleShare(selectedPost)}>
                  <Ionicons name="share-outline" size={20} color="#00A86B" />
                  <Text variant="caption" style={styles.modalActionText}>Share</Text>
                </TouchableOpacity>
              </View>

              {/* Comments Section */}
              <View style={styles.commentsSection}>
                <Text variant="h3" style={styles.commentsHeader}>
                  Comments ({selectedPost.commentsCount})
                </Text>

                {commentsLoading ? (
                  <ActivityIndicator size="small" color="#00A86B" style={{ marginTop: 16 }} />
                ) : comments && comments.length > 0 ? (
                  comments.map((comment) => (
                    <View key={comment.id} style={styles.commentItem}>
                      <View style={styles.commentAvatar}>
                        <Text variant="caption" style={styles.commentAvatarText}>
                          {getInitials(comment.member?.user?.firstName, comment.member?.user?.lastName)}
                        </Text>
                      </View>
                      <View style={styles.commentBody}>
                        <Text variant="caption" style={styles.commentAuthor}>
                          {comment.member?.user?.firstName || 'Anonymous'} {comment.member?.user?.lastName || ''}
                        </Text>
                        <Text variant="body" style={styles.commentContent}>{comment.content}</Text>
                        <View style={styles.commentMeta}>
                          <Text variant="caption" style={styles.commentDate}>
                            {formatDate(comment.createdAt)}
                          </Text>
                          {comment.likes > 0 && (
                            <Text variant="caption" style={styles.commentLikes}>
                              {comment.likes} likes
                            </Text>
                          )}
                        </View>

                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <View style={styles.repliesContainer}>
                            {comment.replies.map((reply) => (
                              <View key={reply.id} style={styles.replyItem}>
                                <View style={styles.replyAvatar}>
                                  <Text variant="caption" style={styles.replyAvatarText}>
                                    {getInitials(reply.member?.user?.firstName, reply.member?.user?.lastName)}
                                  </Text>
                                </View>
                                <View style={styles.replyBody}>
                                  <Text variant="caption" style={styles.commentAuthor}>
                                    {reply.member?.user?.firstName || 'Anonymous'} {reply.member?.user?.lastName || ''}
                                  </Text>
                                  <Text variant="body" style={styles.commentContent}>{reply.content}</Text>
                                  <Text variant="caption" style={styles.commentDate}>
                                    {formatDate(reply.createdAt)}
                                  </Text>
                                </View>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                  ))
                ) : (
                  <Text variant="caption" style={styles.noComments}>
                    No comments yet. Be the first to comment!
                  </Text>
                )}
              </View>
            </ScrollView>

            {/* Comment Input */}
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
                onPress={handlePostComment}
                disabled={!commentText.trim() || commentMutation.isPending}
              >
                {commentMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
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
  categoryScroll: {
    maxHeight: 56,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#00A86B',
  },
  categoryChipText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  newsCard: {
    marginBottom: 16,
    padding: 0,
    overflow: 'hidden',
  },
  newsImage: {
    width: '100%',
    height: 180,
  },
  newsContent: {
    padding: 16,
  },
  newsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontWeight: '600',
    fontSize: 12,
  },
  featuredBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featuredText: {
    color: '#B45309',
    fontWeight: '600',
    fontSize: 12,
  },
  newsTitle: {
    marginBottom: 8,
    color: '#111827',
  },
  newsSummary: {
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 22,
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  newsStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statButton: {
    padding: 4,
  },
  statText: {
    color: '#6B7280',
  },
  shareButton: {
    padding: 4,
  },
  shareText: {
    color: '#00A86B',
    fontWeight: '600',
  },
  newsDate: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  // Modal styles
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
    paddingBottom: 20,
  },
  modalImage: {
    width: '100%',
    height: 220,
  },
  modalMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modalDate: {
    color: '#9CA3AF',
  },
  modalArticleTitle: {
    paddingHorizontal: 16,
    marginTop: 12,
    color: '#111827',
  },
  modalAuthor: {
    paddingHorizontal: 16,
    marginTop: 4,
    color: '#6B7280',
  },
  modalBody: {
    paddingHorizontal: 16,
    marginTop: 16,
    lineHeight: 24,
    color: '#374151',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 16,
  },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalActionText: {
    color: '#6B7280',
    fontWeight: '500',
  },
  // Comments
  commentsSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  commentsHeader: {
    marginBottom: 16,
    color: '#111827',
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00A86B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  commentBody: {
    flex: 1,
  },
  commentAuthor: {
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  commentContent: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 20,
  },
  commentMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  commentDate: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  commentLikes: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  noComments: {
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  repliesContainer: {
    marginTop: 10,
    paddingLeft: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#E5E7EB',
  },
  replyItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    paddingLeft: 8,
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyAvatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 10,
  },
  replyBody: {
    flex: 1,
  },
  // Comment input
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 80,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00A86B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
});
