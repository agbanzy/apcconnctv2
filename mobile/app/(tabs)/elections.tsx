import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Alert, Modal } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { api } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';

interface Candidate {
  id: string;
  name: string;
  position: string;
  manifesto?: string;
  imageUrl?: string;
  voteCount?: number;
}

interface Election {
  id: string;
  title: string;
  description?: string;
  position: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  startDate: string;
  endDate: string;
  totalVotes: number;
  candidates?: Candidate[];
  hasVoted?: boolean;
  votedCandidateId?: string;
}

interface GeneralElection {
  id: string;
  title: string;
  position: string;
  electionYear: number;
  status: string;
  electionDate?: string;
  candidates?: Array<{
    id: string;
    name: string;
    runningMate?: string;
    party?: {
      name: string;
      abbreviation: string;
      color: string;
    };
  }>;
}

type ElectionTab = 'primaries' | 'general';

export default function ElectionsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ElectionTab>('primaries');
  const [selectedGenElection, setSelectedGenElection] = useState<GeneralElection | null>(null);
  const [showGenElectionModal, setShowGenElectionModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: elections, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/elections'],
    queryFn: async () => {
      const response = await api.get('/api/elections');
      if (!response.success) throw new Error(response.error || 'Failed to load elections');
      return response.data as Election[];
    },
  });

  const { data: electionDetails, refetch: refetchDetails } = useQuery({
    queryKey: ['/api/elections', selectedElection?.id],
    queryFn: async () => {
      if (!selectedElection?.id) return null;
      const response = await api.get(`/api/elections/${selectedElection.id}`);
      if (!response.success) throw new Error(response.error || 'Failed to load election');
      return response.data as Election;
    },
    enabled: !!selectedElection?.id,
  });

  const voteMutation = useMutation({
    mutationFn: async ({ electionId, candidateId }: { electionId: string; candidateId: string }) => {
      const response = await api.post(`/api/elections/${electionId}/vote`, { candidateId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/elections'] });
      setShowVoteModal(false);
      setSelectedCandidate(null);
      Alert.alert('Vote Cast', 'Your vote has been recorded successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to cast vote');
    },
  });

  const { data: generalElections, isLoading: genLoading, refetch: refetchGen } = useQuery({
    queryKey: ['/api/general-elections'],
    queryFn: async () => {
      const response = await api.get('/api/general-elections');
      if (!response.success) throw new Error(response.error || 'Failed to load');
      return response.data as GeneralElection[];
    },
  });

  const { data: genElectionDetails } = useQuery({
    queryKey: ['/api/general-elections', selectedGenElection?.id],
    queryFn: async () => {
      if (!selectedGenElection?.id) return null;
      const response = await api.get(`/api/general-elections/${selectedGenElection.id}`);
      if (!response.success) throw new Error(response.error || 'Failed to load');
      return response.data as GeneralElection;
    },
    enabled: !!selectedGenElection?.id,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchGen()]);
    setRefreshing(false);
  }, [refetch, refetchGen]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing':
        return '#10B981';
      case 'upcoming':
        return '#3B82F6';
      case 'completed':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'ongoing':
        return 'radio-button-on';
      case 'upcoming':
        return 'time-outline';
      case 'completed':
        return 'checkmark-done';
      default:
        return 'help-circle-outline';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleVote = () => {
    if (!selectedElection || !selectedCandidate) {
      Alert.alert('Error', 'Please select a candidate');
      return;
    }
    
    Alert.alert(
      'Confirm Vote',
      'Are you sure you want to cast your vote? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm Vote',
          onPress: () => voteMutation.mutate({ 
            electionId: selectedElection.id, 
            candidateId: selectedCandidate 
          })
        },
      ]
    );
  };

  const openVoteModal = (election: Election) => {
    setSelectedElection(election);
    setSelectedCandidate(null);
    setShowVoteModal(true);
  };

  const getVotePercentage = (candidate: Candidate, totalVotes: number) => {
    if (!totalVotes || !candidate.voteCount) return 0;
    return Math.round((candidate.voteCount / totalVotes) * 100);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
        <Text variant="body" style={{ marginTop: 12, color: '#6B7280' }}>Loading elections...</Text>
      </View>
    );
  }

  if (error) {
    return <ErrorState message="Could not load elections" onRetry={() => refetch()} />;
  }

  const getPositionLabel = (pos: string) => {
    const labels: Record<string, string> = {
      presidential: 'Presidential',
      governorship: 'Governorship',
      senatorial: 'Senatorial',
      house_of_reps: 'House of Reps',
      state_assembly: 'State Assembly',
      lga_chairman: 'LGA Chairman',
      councillorship: 'Councillorship',
    };
    return labels[pos] || pos;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A86B" />
        }
      >
        <View style={styles.header}>
          <Text variant="h2">Elections</Text>
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'primaries' && styles.tabActive]}
              onPress={() => setActiveTab('primaries')}
            >
              <Text variant="caption" style={[styles.tabText, activeTab === 'primaries' && styles.tabTextActive]}>
                Party Primaries ({elections?.length || 0})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'general' && styles.tabActive]}
              onPress={() => setActiveTab('general')}
            >
              <Text variant="caption" style={[styles.tabText, activeTab === 'general' && styles.tabTextActive]}>
                General Elections ({generalElections?.length || 0})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === 'general' ? (
          genLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#00A86B" />
            </View>
          ) : generalElections && generalElections.length > 0 ? (
            generalElections.map((ge) => (
              <Card key={ge.id} style={styles.electionCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.titleSection}>
                    <Text variant="h3" style={styles.electionTitle}>{ge.title}</Text>
                    <Text variant="caption" style={styles.position}>
                      {getPositionLabel(ge.position)} | {ge.electionYear}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(ge.status)}20` }]}>
                    <Ionicons name={getStatusIcon(ge.status)} size={12} color={getStatusColor(ge.status)} />
                    <Text variant="caption" style={[styles.statusText, { color: getStatusColor(ge.status) }]}>
                      {getStatusText(ge.status)}
                    </Text>
                  </View>
                </View>
                {ge.electionDate && (
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                    <Text variant="caption" style={styles.infoText}>
                      {new Date(ge.electionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                )}
                <Button
                  title="View Details"
                  variant="outline"
                  onPress={() => {
                    setSelectedGenElection(ge);
                    setShowGenElectionModal(true);
                  }}
                  style={styles.viewButton}
                />
              </Card>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
              <Text variant="h3" style={styles.emptyText}>No general elections</Text>
              <Text variant="caption" style={styles.emptySubtext}>Check back later</Text>
            </View>
          )
        ) : elections && elections.length > 0 ? (
          elections.map((election) => (
            <Card key={election.id} style={styles.electionCard}>
              <View style={styles.cardHeader}>
                <View style={styles.titleSection}>
                  <Text variant="h3" style={styles.electionTitle}>
                    {election.title}
                  </Text>
                  <Text variant="caption" style={styles.position}>
                    Position: {election.position}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${getStatusColor(election.status)}20` },
                  ]}
                >
                  <Ionicons 
                    name={getStatusIcon(election.status)} 
                    size={12} 
                    color={getStatusColor(election.status)} 
                  />
                  <Text
                    variant="caption"
                    style={[styles.statusText, { color: getStatusColor(election.status) }]}
                  >
                    {getStatusText(election.status)}
                  </Text>
                </View>
              </View>

              {election.description && (
                <Text variant="body" style={styles.description} numberOfLines={2}>
                  {election.description}
                </Text>
              )}

              <View style={styles.electionInfo}>
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                  <Text variant="caption" style={styles.infoText}>
                    {formatDate(election.startDate)} - {formatDate(election.endDate)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="people-outline" size={16} color="#6B7280" />
                  <Text variant="caption" style={styles.infoText}>
                    Total Votes: {election.totalVotes?.toLocaleString() || 0}
                  </Text>
                </View>
              </View>

              {election.hasVoted && (
                <View style={styles.votedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text variant="caption" style={styles.votedText}>
                    You have voted in this election
                  </Text>
                </View>
              )}

              <View style={styles.cardActions}>
                {election.status === 'ongoing' && !election.hasVoted && (
                  <Button
                    title="Vote Now"
                    onPress={() => openVoteModal(election)}
                    style={styles.voteButton}
                  />
                )}

                {election.status === 'ongoing' && election.hasVoted && (
                  <Button
                    title="View Results"
                    onPress={() => {
                      setSelectedElection(election);
                      setShowVoteModal(true);
                    }}
                    variant="outline"
                    style={styles.viewButton}
                  />
                )}

                {election.status === 'upcoming' && (
                  <Button
                    title="View Candidates"
                    onPress={() => {
                      setSelectedElection(election);
                      setShowVoteModal(true);
                    }}
                    variant="outline"
                    style={styles.viewButton}
                  />
                )}

                {election.status === 'completed' && (
                  <Button
                    title="View Results"
                    onPress={() => {
                      setSelectedElection(election);
                      setShowVoteModal(true);
                    }}
                    variant="outline"
                    style={styles.viewButton}
                  />
                )}
              </View>
            </Card>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#9CA3AF" />
            <Text variant="h3" style={styles.emptyText}>
              No elections available
            </Text>
            <Text variant="caption" style={styles.emptySubtext}>
              Check back later for party elections
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showVoteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowVoteModal(false);
          setSelectedElection(null);
          setSelectedCandidate(null);
        }}
      >
        {selectedElection && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text variant="h3">
                {selectedElection.status === 'ongoing' && !selectedElection.hasVoted 
                  ? 'Cast Your Vote' 
                  : selectedElection.status === 'completed' 
                    ? 'Election Results'
                    : 'Candidates'}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowVoteModal(false);
                setSelectedElection(null);
                setSelectedCandidate(null);
              }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text variant="h2" style={styles.modalTitle}>{selectedElection.title}</Text>
              <Text variant="caption" style={styles.modalPosition}>
                Position: {selectedElection.position}
              </Text>

              {selectedElection.status === 'ongoing' && !selectedElection.hasVoted && (
                <View style={styles.voteInstructions}>
                  <Ionicons name="information-circle" size={20} color="#3B82F6" />
                  <Text variant="caption" style={styles.instructionsText}>
                    Select a candidate below and confirm your vote. Your vote is anonymous and cannot be changed.
                  </Text>
                </View>
              )}

              <View style={styles.candidatesList}>
                {electionDetails?.candidates?.map((candidate) => (
                  <TouchableOpacity
                    key={candidate.id}
                    style={[
                      styles.candidateCard,
                      selectedCandidate === candidate.id && styles.candidateCardSelected,
                      selectedElection.votedCandidateId === candidate.id && styles.candidateCardVoted,
                    ]}
                    onPress={() => {
                      if (selectedElection.status === 'ongoing' && !selectedElection.hasVoted) {
                        setSelectedCandidate(candidate.id);
                      }
                    }}
                    disabled={selectedElection.status !== 'ongoing' || selectedElection.hasVoted}
                  >
                    <View style={styles.candidateHeader}>
                      <View style={styles.candidateAvatar}>
                        <Text variant="h3" style={styles.avatarText}>
                          {candidate.name.split(' ').map(n => n[0]).join('')}
                        </Text>
                      </View>
                      <View style={styles.candidateInfo}>
                        <Text variant="body" style={styles.candidateName}>{candidate.name}</Text>
                        {candidate.manifesto && (
                          <Text variant="caption" style={styles.candidateManifesto} numberOfLines={2}>
                            {candidate.manifesto}
                          </Text>
                        )}
                      </View>
                      {selectedCandidate === candidate.id && (
                        <Ionicons name="checkmark-circle" size={24} color="#00A86B" />
                      )}
                      {selectedElection.votedCandidateId === candidate.id && (
                        <View style={styles.yourVoteBadge}>
                          <Text variant="caption" style={styles.yourVoteText}>Your Vote</Text>
                        </View>
                      )}
                    </View>

                    {(selectedElection.status === 'completed' || selectedElection.hasVoted) && candidate.voteCount !== undefined && (
                      <View style={styles.resultBar}>
                        <View style={styles.resultBarBg}>
                          <View 
                            style={[
                              styles.resultBarFill, 
                              { width: `${getVotePercentage(candidate, selectedElection.totalVotes)}%` }
                            ]} 
                          />
                        </View>
                        <Text variant="caption" style={styles.resultText}>
                          {candidate.voteCount?.toLocaleString()} votes ({getVotePercentage(candidate, selectedElection.totalVotes)}%)
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {selectedElection.status === 'ongoing' && !selectedElection.hasVoted && (
                <Button
                  title="Confirm Vote"
                  onPress={handleVote}
                  loading={voteMutation.isPending}
                  disabled={!selectedCandidate || voteMutation.isPending}
                  style={styles.confirmButton}
                />
              )}
            </ScrollView>
          </View>
        )}
      </Modal>

      <Modal
        visible={showGenElectionModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowGenElectionModal(false);
          setSelectedGenElection(null);
        }}
      >
        {selectedGenElection && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text variant="h3">Election Details</Text>
              <TouchableOpacity onPress={() => {
                setShowGenElectionModal(false);
                setSelectedGenElection(null);
              }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <Text variant="h2" style={styles.modalTitle}>{selectedGenElection.title}</Text>
              <Text variant="caption" style={styles.modalPosition}>
                {getPositionLabel(selectedGenElection.position)} | {selectedGenElection.electionYear}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(selectedGenElection.status)}20`, alignSelf: 'flex-start', marginTop: 8, marginBottom: 16 }]}>
                <Ionicons name={getStatusIcon(selectedGenElection.status)} size={12} color={getStatusColor(selectedGenElection.status)} />
                <Text variant="caption" style={[styles.statusText, { color: getStatusColor(selectedGenElection.status) }]}>
                  {getStatusText(selectedGenElection.status)}
                </Text>
              </View>
              {selectedGenElection.electionDate && (
                <View style={[styles.infoRow, { marginBottom: 16 }]}>
                  <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                  <Text variant="caption" style={styles.infoText}>
                    {new Date(selectedGenElection.electionDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
              )}
              <Text variant="h3" style={{ marginBottom: 12 }}>Candidates</Text>
              {(genElectionDetails?.candidates || selectedGenElection.candidates || []).length > 0 ? (
                (genElectionDetails?.candidates || selectedGenElection.candidates || []).map((c) => (
                  <View key={c.id} style={styles.genCandidateCard}>
                    <View style={[styles.candidateAvatar, { backgroundColor: c.party?.color || '#00A86B' }]}>
                      <Text variant="h3" style={styles.avatarText}>{c.party?.abbreviation || '?'}</Text>
                    </View>
                    <View style={styles.candidateInfo}>
                      <Text variant="body" style={styles.candidateName}>{c.name}</Text>
                      <Text variant="caption" style={styles.candidateManifesto}>{c.party?.name || 'Independent'}</Text>
                      {c.runningMate && (
                        <Text variant="caption" style={{ color: '#6B7280', fontSize: 11 }}>Running Mate: {c.runningMate}</Text>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <Text variant="caption" style={{ color: '#6B7280' }}>No candidates registered yet</Text>
              )}
            </ScrollView>
          </View>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  subtitle: {
    color: '#6B7280',
    marginTop: 4,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#00A86B',
  },
  tabText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  genCandidateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    marginBottom: 8,
    gap: 12,
  },
  electionCard: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleSection: {
    flex: 1,
    marginRight: 12,
  },
  electionTitle: {
    marginBottom: 4,
  },
  position: {
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontWeight: '600',
    fontSize: 12,
  },
  description: {
    color: '#6B7280',
    marginBottom: 12,
  },
  electionInfo: {
    gap: 6,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    color: '#6B7280',
  },
  votedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  votedText: {
    color: '#059669',
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  voteButton: {
    flex: 1,
  },
  viewButton: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    gap: 8,
  },
  emptyText: {
    color: '#6B7280',
  },
  emptySubtext: {
    color: '#9CA3AF',
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
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalTitle: {
    marginBottom: 4,
  },
  modalPosition: {
    color: '#6B7280',
    marginBottom: 16,
  },
  voteInstructions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  instructionsText: {
    color: '#1E40AF',
    flex: 1,
  },
  candidatesList: {
    gap: 12,
    marginBottom: 24,
  },
  candidateCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  candidateCardSelected: {
    borderColor: '#00A86B',
    backgroundColor: '#F0FDF4',
  },
  candidateCardVoted: {
    backgroundColor: '#F0FDF4',
  },
  candidateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  candidateAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00A86B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  candidateInfo: {
    flex: 1,
  },
  candidateName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  candidateManifesto: {
    color: '#6B7280',
  },
  yourVoteBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  yourVoteText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  resultBar: {
    marginTop: 12,
  },
  resultBarBg: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  resultBarFill: {
    height: '100%',
    backgroundColor: '#00A86B',
    borderRadius: 4,
  },
  resultText: {
    color: '#6B7280',
  },
  confirmButton: {
    marginBottom: 32,
  },
});
