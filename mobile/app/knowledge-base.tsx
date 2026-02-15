import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';

interface Category {
  id: string;
  name: string;
  description?: string;
  articleCount?: number;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary?: string;
  category?: { name: string };
  viewCount: number;
  createdAt: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

export default function KnowledgeBaseScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'articles' | 'faqs'>('articles');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const { data: categories } = useQuery({
    queryKey: ['/api/knowledge/categories'],
    queryFn: async () => {
      const response = await api.get('/api/knowledge/categories');
      if (!response.success) throw new Error(response.error);
      return response.data as Category[];
    },
  });

  const { data: articles, isLoading: articlesLoading, error: articlesError, refetch: refetchArticles } = useQuery({
    queryKey: ['/api/knowledge/articles', selectedCategory],
    queryFn: async () => {
      const url = selectedCategory === 'all'
        ? '/api/knowledge/articles'
        : `/api/knowledge/articles?categoryId=${selectedCategory}`;
      const response = await api.get(url);
      if (!response.success) throw new Error(response.error);
      return response.data as Article[];
    },
  });

  const { data: faqs, isLoading: faqsLoading, refetch: refetchFaqs } = useQuery({
    queryKey: ['/api/knowledge/faqs'],
    queryFn: async () => {
      const response = await api.get('/api/knowledge/faqs');
      if (!response.success) throw new Error(response.error);
      return response.data as FAQ[];
    },
    enabled: selectedTab === 'faqs',
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchArticles(), refetchFaqs()]);
    setRefreshing(false);
  }, [refetchArticles, refetchFaqs]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleOpenArticle = async (article: Article) => {
    setSelectedArticle(article);
    try {
      await api.post(`/api/knowledge/articles/${article.id}/view`);
    } catch {}
  };

  const isLoading = selectedTab === 'articles' ? articlesLoading : faqsLoading;

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
        <Text variant="body" style={{ marginTop: 12, color: '#6B7280' }}>Loading...</Text>
      </View>
    );
  }

  if (articlesError && selectedTab === 'articles') {
    return <ErrorState message="Could not load articles" onRetry={() => refetchArticles()} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'articles' && styles.tabActive]}
          onPress={() => setSelectedTab('articles')}
        >
          <Text variant="body" style={[styles.tabText, selectedTab === 'articles' && styles.tabTextActive]}>Articles</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'faqs' && styles.tabActive]}
          onPress={() => setSelectedTab('faqs')}
        >
          <Text variant="body" style={[styles.tabText, selectedTab === 'faqs' && styles.tabTextActive]}>FAQs</Text>
        </TouchableOpacity>
      </View>

      {selectedTab === 'articles' && categories && categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
          <TouchableOpacity
            style={[styles.categoryChip, selectedCategory === 'all' && styles.categoryChipActive]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text variant="caption" style={[styles.categoryChipText, selectedCategory === 'all' && styles.categoryChipTextActive]}>All</Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text variant="caption" style={[styles.categoryChipText, selectedCategory === cat.id && styles.categoryChipTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A86B" />}
      >
        {selectedTab === 'articles' ? (
          <>
            <View style={styles.header}>
              <Ionicons name="book" size={24} color="#00A86B" />
              <Text variant="h2" style={styles.headerTitle}>Knowledge Base</Text>
            </View>
            {articles && articles.length > 0 ? (
              articles.map((article) => (
                <TouchableOpacity key={article.id} onPress={() => handleOpenArticle(article)}>
                  <Card style={styles.articleCard}>
                    <Text variant="h3" style={styles.articleTitle}>{article.title}</Text>
                    {article.summary && (
                      <Text variant="body" style={styles.articleSummary} numberOfLines={2}>{article.summary}</Text>
                    )}
                    <View style={styles.articleMeta}>
                      {article.category && (
                        <View style={styles.categoryBadge}>
                          <Text variant="caption" style={styles.categoryBadgeText}>{article.category.name}</Text>
                        </View>
                      )}
                      <View style={styles.viewCount}>
                        <Ionicons name="eye-outline" size={14} color="#9CA3AF" />
                        <Text variant="caption" style={styles.viewCountText}>{article.viewCount}</Text>
                      </View>
                      <Text variant="caption" style={styles.articleDate}>{formatDate(article.createdAt)}</Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))
            ) : (
              <EmptyState icon="book-outline" title="No articles" subtitle="Check back later for educational content" />
            )}
          </>
        ) : (
          <>
            <View style={styles.header}>
              <Ionicons name="help-circle" size={24} color="#00A86B" />
              <Text variant="h2" style={styles.headerTitle}>Frequently Asked Questions</Text>
            </View>
            {faqs && faqs.length > 0 ? (
              faqs.map((faq) => (
                <TouchableOpacity key={faq.id} onPress={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}>
                  <Card style={styles.faqCard}>
                    <View style={styles.faqHeader}>
                      <Text variant="body" style={styles.faqQuestion}>{faq.question}</Text>
                      <Ionicons
                        name={expandedFaq === faq.id ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#6B7280"
                      />
                    </View>
                    {expandedFaq === faq.id && (
                      <Text variant="body" style={styles.faqAnswer}>{faq.answer}</Text>
                    )}
                  </Card>
                </TouchableOpacity>
              ))
            ) : (
              <EmptyState icon="help-circle-outline" title="No FAQs" subtitle="Check back later" />
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={!!selectedArticle} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedArticle(null)}>
        {selectedArticle && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text variant="h3">Article</Text>
              <TouchableOpacity onPress={() => setSelectedArticle(null)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <Text variant="h2" style={styles.modalTitle}>{selectedArticle.title}</Text>
              {selectedArticle.category && (
                <View style={[styles.categoryBadge, { marginBottom: 12 }]}>
                  <Text variant="caption" style={styles.categoryBadgeText}>{selectedArticle.category.name}</Text>
                </View>
              )}
              <Text variant="caption" style={styles.modalDate}>{formatDate(selectedArticle.createdAt)}</Text>
              <Text variant="body" style={styles.modalBody}>{selectedArticle.content}</Text>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#00A86B' },
  tabText: { color: '#6B7280', fontWeight: '600' },
  tabTextActive: { color: '#00A86B' },
  categoryScroll: { maxHeight: 52, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  categoryContainer: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F3F4F6', marginRight: 6 },
  categoryChipActive: { backgroundColor: '#00A86B' },
  categoryChipText: { color: '#6B7280', fontWeight: '600', fontSize: 13 },
  categoryChipTextActive: { color: '#FFFFFF' },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  headerTitle: { color: '#111827' },
  articleCard: { marginBottom: 12 },
  articleTitle: { color: '#111827', marginBottom: 6 },
  articleSummary: { color: '#6B7280', lineHeight: 22, marginBottom: 10 },
  articleMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  categoryBadge: { backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  categoryBadgeText: { color: '#00A86B', fontWeight: '600', fontSize: 11 },
  viewCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewCountText: { color: '#9CA3AF', fontSize: 12 },
  articleDate: { color: '#9CA3AF', fontSize: 12 },
  faqCard: { marginBottom: 8 },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  faqQuestion: { flex: 1, fontWeight: '600', color: '#111827' },
  faqAnswer: { color: '#6B7280', lineHeight: 22, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalContent: { flex: 1, padding: 16 },
  modalTitle: { marginBottom: 12, color: '#111827' },
  modalDate: { color: '#9CA3AF', marginBottom: 16 },
  modalBody: { color: '#374151', lineHeight: 24 },
});
