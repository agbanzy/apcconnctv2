import { useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Image, Share, Linking } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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

export default function NewsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const queryClient = useQueryClient();

  const categories = [
    { key: 'all', label: 'All' },
    { key: 'party_news', label: 'Party News' },
    { key: 'policy_updates', label: 'Policy' },
    { key: 'events', label: 'Events' },
    { key: 'opinion', label: 'Opinion' },
  ];

  const { data: news, isLoading, refetch } = useQuery({
    queryKey: ['/api/news', selectedCategory],
    queryFn: async () => {
      const url = selectedCategory === 'all' 
        ? '/api/news' 
        : `/api/news?category=${selectedCategory}`;
      const response = await api.get(url);
      return response.data as NewsPost[];
    },
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

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'party_news':
        return '#00A86B';
      case 'policy_updates':
        return '#3B82F6';
      case 'events':
        return '#8B5CF6';
      case 'opinion':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const getCategoryLabel = (category: string) => {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text variant="body">Loading news...</Text>
      </View>
    );
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
            <Card key={post.id} style={styles.newsCard}>
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
                      onPress={() => handleLike(post.id)}
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
                    onPress={() => handleShare(post)}
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
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text variant="h3" style={styles.emptyText}>
              No news available
            </Text>
            <Text variant="caption" style={styles.emptySubtext}>
              Check back later for the latest updates
            </Text>
          </View>
        )}
      </ScrollView>
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
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#9CA3AF',
  },
});
