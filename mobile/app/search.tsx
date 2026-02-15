import { useState, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
  TextInput, ActivityIndicator, Keyboard
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';

type SearchCategory = 'all' | 'news' | 'events' | 'campaigns' | 'knowledge' | 'ideas';

const CATEGORIES: { key: SearchCategory; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'news', label: 'News', icon: 'newspaper' },
  { key: 'events', label: 'Events', icon: 'calendar' },
  { key: 'campaigns', label: 'Campaigns', icon: 'megaphone' },
  { key: 'knowledge', label: 'Knowledge', icon: 'book' },
  { key: 'ideas', label: 'Ideas', icon: 'bulb' },
];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');

  const { data: results, isLoading, refetch } = useQuery({
    queryKey: ['/api/search', searchQuery, category],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return null;
      const catParam = category === 'all' ? '' : `&category=${category}`;
      const response = await api.get(`/api/search?q=${encodeURIComponent(searchQuery)}${catParam}`);
      if (!response.success) throw new Error(response.error || 'Search failed');
      return response.data as {
        news: any[];
        events: any[];
        campaigns: any[];
        knowledgeBase: any[];
        ideas: any[];
        total: number;
      };
    },
    enabled: searchQuery.length >= 2,
  });

  const handleSearch = () => {
    Keyboard.dismiss();
    setSearchQuery(query.trim());
  };

  const totalResults = results
    ? (results.news?.length || 0) + (results.events?.length || 0) +
      (results.campaigns?.length || 0) + (results.knowledgeBase?.length || 0) +
      (results.ideas?.length || 0)
    : 0;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderResultSection = (title: string, icon: string, items: any[], type: string) => {
    if (!items || items.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name={icon as any} size={18} color="#00A86B" />
          <Text variant="h3" style={styles.sectionTitle}>{title}</Text>
          <View style={styles.countBadge}>
            <Text variant="caption" style={styles.countText}>{items.length}</Text>
          </View>
        </View>
        {items.map((item, idx) => (
          <Card key={`${type}-${item.id || idx}`} style={styles.resultCard}>
            <Text variant="body" style={styles.resultTitle} numberOfLines={2}>
              {item.title || item.headline || item.name}
            </Text>
            {(item.excerpt || item.description) && (
              <Text variant="caption" style={styles.resultExcerpt} numberOfLines={2}>
                {item.excerpt || item.description}
              </Text>
            )}
            <View style={styles.resultMeta}>
              {item.category && (
                <View style={styles.tagBadge}>
                  <Text variant="caption" style={styles.tagText}>{item.category}</Text>
                </View>
              )}
              {(item.publishedAt || item.date || item.createdAt) && (
                <Text variant="caption" style={styles.dateText}>
                  {formatDate(item.publishedAt || item.date || item.createdAt)}
                </Text>
              )}
            </View>
          </Card>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search news, events, campaigns..."
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setSearchQuery(''); }}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Ionicons name="search" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryContainer}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.categoryChip, category === cat.key && styles.categoryChipActive]}
            onPress={() => { setCategory(cat.key); if (searchQuery) setSearchQuery(prev => prev); }}
          >
            <Ionicons name={cat.icon as any} size={14} color={category === cat.key ? '#FFFFFF' : '#6B7280'} />
            <Text variant="caption" style={[styles.categoryChipText, category === cat.key && styles.categoryChipTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#00A86B" />
            <Text variant="body" style={{ color: '#6B7280', marginTop: 12 }}>Searching...</Text>
          </View>
        ) : !searchQuery ? (
          <View style={styles.centerContent}>
            <Ionicons name="search" size={48} color="#D1D5DB" />
            <Text variant="h3" style={styles.placeholderTitle}>Search APC Connect</Text>
            <Text variant="body" style={styles.placeholderText}>
              Find news articles, events, campaigns, knowledge base articles, and ideas
            </Text>
          </View>
        ) : totalResults === 0 ? (
          <EmptyState
            icon="search-outline"
            title="No results found"
            subtitle={`No results for "${searchQuery}". Try different keywords.`}
          />
        ) : (
          <>
            <Text variant="caption" style={styles.resultsCount}>
              {totalResults} result{totalResults !== 1 ? 's' : ''} for "{searchQuery}"
            </Text>
            {renderResultSection('News', 'newspaper-outline', results?.news || [], 'news')}
            {renderResultSection('Events', 'calendar-outline', results?.events || [], 'events')}
            {renderResultSection('Campaigns', 'megaphone-outline', results?.campaigns || [], 'campaigns')}
            {renderResultSection('Knowledge Base', 'book-outline', results?.knowledgeBase || [], 'kb')}
            {renderResultSection('Ideas', 'bulb-outline', results?.ideas || [], 'ideas')}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  searchBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', gap: 8 },
  searchInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, height: 42, fontSize: 15, color: '#111827' },
  searchButton: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#00A86B', justifyContent: 'center', alignItems: 'center' },
  categoryScroll: { maxHeight: 52, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  categoryContainer: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F3F4F6' },
  categoryChipActive: { backgroundColor: '#00A86B' },
  categoryChipText: { color: '#6B7280', fontWeight: '500', fontSize: 12 },
  categoryChipTextActive: { color: '#FFFFFF' },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  centerContent: { alignItems: 'center', paddingTop: 60 },
  placeholderTitle: { color: '#374151', marginTop: 16, fontWeight: '600' },
  placeholderText: { color: '#9CA3AF', marginTop: 8, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
  resultsCount: { color: '#6B7280', marginBottom: 16, fontWeight: '500' },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontWeight: '600', color: '#374151', flex: 1 },
  countBadge: { backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countText: { color: '#00A86B', fontWeight: '600', fontSize: 11 },
  resultCard: { marginBottom: 8 },
  resultTitle: { fontWeight: '600', color: '#111827', fontSize: 14, marginBottom: 4 },
  resultExcerpt: { color: '#6B7280', fontSize: 12, lineHeight: 18, marginBottom: 8 },
  resultMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tagBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  tagText: { color: '#6B7280', fontSize: 10, fontWeight: '500' },
  dateText: { color: '#9CA3AF', fontSize: 11 },
});
