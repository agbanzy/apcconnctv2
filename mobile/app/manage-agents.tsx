import { useState, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  FlatList, Share
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';

interface PollingAgent {
  id: string;
  agentCode: string;
  agentPin: string;
  status: string;
  assignedAt: string;
  checkedInAt: string | null;
  notes: string | null;
  member: {
    id: string;
    memberId: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
    };
  };
  pollingUnit: {
    id: string;
    name: string;
    unitCode: string;
  };
  election: {
    id: string;
    title: string;
    position: string;
  } | null;
}

interface MemberSearchResult {
  id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
}

interface PollingUnitOption {
  id: string;
  name: string;
  unitCode: string;
}

interface Election {
  id: string;
  title: string;
  position: string;
  status: string;
}

type ActiveView = 'list' | 'assign';

export default function ManageAgentsScreen() {
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<ActiveView>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [electionFilter, setElectionFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberSearchResult | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<PollingUnitOption | null>(null);
  const [unitSearch, setUnitSearch] = useState('');
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [assignNotes, setAssignNotes] = useState('');
  const [showMemberResults, setShowMemberResults] = useState(false);
  const [showUnitResults, setShowUnitResults] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ agentCode: string; agentPin: string } | null>(null);

  const { data: agentsResponse, isLoading: agentsLoading, isError: agentsError, refetch: refetchAgents } = useQuery({
    queryKey: ['/api/admin/polling-agents', statusFilter, electionFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (electionFilter !== 'all') params.set('electionId', electionFilter);
      const response = await api.get(`/api/admin/polling-agents?${params.toString()}`);
      if (!response.success) throw new Error(response.error || 'Failed to fetch agents');
      return response.data as PollingAgent[];
    },
  });

  const { data: memberResults, isLoading: memberSearchLoading } = useQuery({
    queryKey: ['/api/admin/members-search', memberSearch],
    queryFn: async () => {
      const response = await api.get(`/api/admin/members-search?q=${encodeURIComponent(memberSearch)}`);
      if (!response.success) return [];
      return response.data as MemberSearchResult[];
    },
    enabled: memberSearch.length >= 2,
  });

  const { data: pollingUnitsResponse } = useQuery({
    queryKey: ['/api/situation-room/polling-units'],
    queryFn: async () => {
      const response = await api.get('/api/situation-room/polling-units');
      if (!response.success) return [];
      return response.data as PollingUnitOption[];
    },
    enabled: activeView === 'assign',
  });

  const { data: electionsResponse } = useQuery({
    queryKey: ['/api/general-elections'],
    queryFn: async () => {
      const response = await api.get('/api/general-elections');
      if (!response.success) return [];
      return response.data as Election[];
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (payload: { memberId: string; pollingUnitId: string; electionId?: string; notes?: string }) => {
      const response = await api.post('/api/admin/polling-agents', payload);
      if (!response.success) throw new Error(response.error || 'Failed to assign agent');
      return response.data;
    },
    onSuccess: (data: any) => {
      setCreatedCredentials({ agentCode: data.agentCode, agentPin: data.agentPin });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/polling-agents'] });
      Alert.alert('Agent Assigned', `Code: ${data.agentCode}\nPIN: ${data.agentPin}`);
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await api.patch(`/api/admin/polling-agents/${id}`, { status });
      if (!response.success) throw new Error(response.error || 'Failed to update agent');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/polling-agents'] });
      Alert.alert('Updated', 'Agent status has been updated');
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message);
    },
  });

  const agents = agentsResponse || [];
  const filteredAgents = searchQuery
    ? agents.filter(a =>
        a.agentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${a.member.user.firstName} ${a.member.user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.pollingUnit.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : agents;

  const allUnits = pollingUnitsResponse || [];
  const filteredUnits = unitSearch.length >= 2
    ? allUnits.filter(u =>
        u.name.toLowerCase().includes(unitSearch.toLowerCase()) ||
        u.unitCode.toLowerCase().includes(unitSearch.toLowerCase())
      ).slice(0, 20)
    : [];

  const elections = electionsResponse || [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchAgents();
    setRefreshing(false);
  }, [refetchAgents]);

  const copyToClipboard = async (text: string) => {
    try {
      await Share.share({ message: text });
    } catch {
      Alert.alert('Credentials', text);
    }
  };

  const resetAssignForm = () => {
    setSelectedMember(null);
    setMemberSearch('');
    setSelectedUnit(null);
    setUnitSearch('');
    setSelectedElection(null);
    setAssignNotes('');
    setCreatedCredentials(null);
    setShowMemberResults(false);
    setShowUnitResults(false);
  };

  const handleAssign = () => {
    if (!selectedMember || !selectedUnit) {
      Alert.alert('Required', 'Please select a member and a polling unit');
      return;
    }
    assignMutation.mutate({
      memberId: selectedMember.id,
      pollingUnitId: selectedUnit.id,
      electionId: selectedElection?.id,
      notes: assignNotes || undefined,
    });
  };

  const handleRevoke = (agent: PollingAgent) => {
    Alert.alert(
      'Revoke Agent',
      `Revoke access for ${agent.member.user.firstName} ${agent.member.user.lastName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Revoke', style: 'destructive', onPress: () => revokeMutation.mutate({ id: agent.id, status: 'revoked' }) },
      ]
    );
  };

  const handleRestore = (agent: PollingAgent) => {
    revokeMutation.mutate({ id: agent.id, status: 'assigned' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked_in': case 'active': return { bg: '#DCFCE7', text: '#059669' };
      case 'revoked': return { bg: '#FEE2E2', text: '#EF4444' };
      default: return { bg: '#FEF3C7', text: '#D97706' };
    }
  };

  const STATUS_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'checked_in', label: 'Checked In' },
    { value: 'active', label: 'Active' },
    { value: 'revoked', label: 'Revoked' },
  ];

  if (activeView === 'assign') {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.viewHeader}>
            <TouchableOpacity onPress={() => { setActiveView('list'); resetAssignForm(); }} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#374151" />
            </TouchableOpacity>
            <Text variant="h3" style={{ flex: 1 }}>Assign Agent</Text>
          </View>

          {createdCredentials ? (
            <Card style={styles.credentialsCard}>
              <View style={styles.credentialsHeader}>
                <Ionicons name="checkmark-circle" size={32} color="#00A86B" />
                <Text variant="h3" style={{ color: '#059669', marginTop: 8 }}>Agent Assigned</Text>
                <Text variant="caption" style={{ color: '#6B7280', marginTop: 4, textAlign: 'center' }}>
                  Share these credentials with the agent. The PIN cannot be retrieved later.
                </Text>
              </View>

              <View style={styles.credentialRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="caption" style={{ color: '#6B7280' }}>Agent Code</Text>
                  <Text variant="h2" style={styles.credentialValue}>{createdCredentials.agentCode}</Text>
                </View>
                <TouchableOpacity onPress={() => copyToClipboard(createdCredentials.agentCode)} style={styles.copyBtn}>
                  <Ionicons name="copy-outline" size={20} color="#3B82F6" />
                </TouchableOpacity>
              </View>

              <View style={styles.credentialRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="caption" style={{ color: '#6B7280' }}>Agent PIN</Text>
                  <Text variant="h2" style={styles.credentialValue}>{createdCredentials.agentPin}</Text>
                </View>
                <TouchableOpacity onPress={() => copyToClipboard(createdCredentials.agentPin)} style={styles.copyBtn}>
                  <Ionicons name="copy-outline" size={20} color="#3B82F6" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => copyToClipboard(`Agent Code: ${createdCredentials.agentCode}\nAgent PIN: ${createdCredentials.agentPin}`)}
                style={styles.copyBothBtn}
              >
                <Ionicons name="copy" size={16} color="#3B82F6" />
                <Text variant="body" style={{ color: '#3B82F6', fontWeight: '600' }}>Copy Both</Text>
              </TouchableOpacity>

              <View style={styles.credentialActions}>
                <Button
                  title="Close"
                  onPress={() => { setActiveView('list'); resetAssignForm(); }}
                  variant="outline"
                  style={{ flex: 1 }}
                />
                <Button
                  title="Assign Another"
                  onPress={resetAssignForm}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          ) : (
            <Card style={styles.formCard}>
              <Text variant="caption" style={styles.fieldLabel}>Search Member *</Text>
              {selectedMember ? (
                <View style={styles.selectedItem}>
                  <View style={{ flex: 1 }}>
                    <Text variant="body" style={{ fontWeight: '600' }}>{selectedMember.firstName} {selectedMember.lastName}</Text>
                    <Text variant="caption" style={{ color: '#6B7280' }}>{selectedMember.memberId} | {selectedMember.email}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setSelectedMember(null); setMemberSearch(''); }}>
                    <Ionicons name="close-circle" size={22} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View style={styles.searchInputRow}>
                    <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginLeft: 12 }} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search by name, email, or member ID..."
                      placeholderTextColor="#9CA3AF"
                      value={memberSearch}
                      onChangeText={(t) => { setMemberSearch(t); setShowMemberResults(true); }}
                      onFocus={() => setShowMemberResults(true)}
                    />
                  </View>
                  {showMemberResults && memberSearch.length >= 2 && (
                    <View style={styles.dropdownList}>
                      {memberSearchLoading ? (
                        <ActivityIndicator color="#00A86B" style={{ padding: 12 }} />
                      ) : (memberResults || []).length === 0 ? (
                        <Text variant="caption" style={styles.dropdownEmpty}>No members found</Text>
                      ) : (
                        (memberResults || []).map((m) => (
                          <TouchableOpacity
                            key={m.id}
                            style={styles.dropdownItem}
                            onPress={() => { setSelectedMember(m); setMemberSearch(''); setShowMemberResults(false); }}
                          >
                            <Text variant="body" style={{ fontWeight: '500', fontSize: 14 }}>{m.firstName} {m.lastName}</Text>
                            <Text variant="caption" style={{ color: '#6B7280' }}>{m.memberId} | {m.email}</Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  )}
                </View>
              )}

              <Text variant="caption" style={styles.fieldLabel}>Polling Unit *</Text>
              {selectedUnit ? (
                <View style={styles.selectedItem}>
                  <View style={{ flex: 1 }}>
                    <Text variant="body" style={{ fontWeight: '600' }}>{selectedUnit.name}</Text>
                    <Text variant="caption" style={{ color: '#6B7280' }}>{selectedUnit.unitCode}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setSelectedUnit(null); setUnitSearch(''); }}>
                    <Ionicons name="close-circle" size={22} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View style={styles.searchInputRow}>
                    <Ionicons name="location" size={18} color="#9CA3AF" style={{ marginLeft: 12 }} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search polling unit by name or code..."
                      placeholderTextColor="#9CA3AF"
                      value={unitSearch}
                      onChangeText={(t) => { setUnitSearch(t); setShowUnitResults(true); }}
                      onFocus={() => setShowUnitResults(true)}
                    />
                  </View>
                  {showUnitResults && unitSearch.length >= 2 && (
                    <View style={styles.dropdownList}>
                      {filteredUnits.length === 0 ? (
                        <Text variant="caption" style={styles.dropdownEmpty}>No polling units found</Text>
                      ) : (
                        filteredUnits.map((u) => (
                          <TouchableOpacity
                            key={u.id}
                            style={styles.dropdownItem}
                            onPress={() => { setSelectedUnit(u); setUnitSearch(''); setShowUnitResults(false); }}
                          >
                            <Text variant="body" style={{ fontWeight: '500', fontSize: 14 }}>{u.name}</Text>
                            <Text variant="caption" style={{ color: '#6B7280' }}>{u.unitCode}</Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  )}
                </View>
              )}

              <Text variant="caption" style={styles.fieldLabel}>Election (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                <View style={styles.chipRow}>
                  <TouchableOpacity
                    style={[styles.chip, !selectedElection && styles.chipActive]}
                    onPress={() => setSelectedElection(null)}
                  >
                    <Text variant="caption" style={[styles.chipText, !selectedElection && styles.chipTextActive]}>None</Text>
                  </TouchableOpacity>
                  {elections.filter(e => e.status === 'upcoming' || e.status === 'ongoing').map((e) => (
                    <TouchableOpacity
                      key={e.id}
                      style={[styles.chip, selectedElection?.id === e.id && styles.chipActive]}
                      onPress={() => setSelectedElection(e)}
                    >
                      <Text variant="caption" style={[styles.chipText, selectedElection?.id === e.id && styles.chipTextActive]}>
                        {e.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text variant="caption" style={styles.fieldLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                placeholder="Optional notes..."
                placeholderTextColor="#9CA3AF"
                value={assignNotes}
                onChangeText={setAssignNotes}
                multiline
              />

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                <Button
                  title="Cancel"
                  onPress={() => { setActiveView('list'); resetAssignForm(); }}
                  variant="outline"
                  style={{ flex: 1 }}
                />
                <Button
                  title={assignMutation.isPending ? 'Assigning...' : 'Assign Agent'}
                  onPress={handleAssign}
                  loading={assignMutation.isPending}
                  disabled={!selectedMember || !selectedUnit || assignMutation.isPending}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.headerSearchInput}
            placeholder="Search agents..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setActiveView('assign')}>
          <Ionicons name="person-add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
        <View style={styles.chipRow}>
          {STATUS_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, statusFilter === opt.value && styles.chipActive]}
              onPress={() => setStatusFilter(opt.value)}
            >
              <Text variant="caption" style={[styles.chipText, statusFilter === opt.value && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {(electionsResponse || []).length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, electionFilter === 'all' && styles.chipActive]}
              onPress={() => setElectionFilter('all')}
            >
              <Text variant="caption" style={[styles.chipText, electionFilter === 'all' && styles.chipTextActive]}>
                All Elections
              </Text>
            </TouchableOpacity>
            {(electionsResponse || []).map((e) => (
              <TouchableOpacity
                key={e.id}
                style={[styles.chip, electionFilter === e.id && styles.chipActive]}
                onPress={() => setElectionFilter(e.id)}
              >
                <Text variant="caption" style={[styles.chipText, electionFilter === e.id && styles.chipTextActive]}>
                  {e.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      <View style={styles.countRow}>
        <Text variant="caption" style={{ color: '#6B7280' }}>
          {filteredAgents.length} agent{filteredAgents.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {agentsLoading ? (
        <ActivityIndicator color="#00A86B" size="large" style={{ marginTop: 40 }} />
      ) : agentsError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Failed to load agents"
          subtitle="Pull down to refresh and try again"
        />
      ) : filteredAgents.length === 0 ? (
        <EmptyState
          icon="shield-outline"
          title="No agents found"
          subtitle={agents.length === 0 ? "Tap + to assign your first polling agent" : "No agents match your search"}
        />
      ) : (
        <FlatList
          data={filteredAgents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 0 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A86B" />}
          renderItem={({ item: agent }) => {
            const statusColors = getStatusColor(agent.status);
            return (
              <Card style={styles.agentCard}>
                <View style={styles.agentTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="body" style={{ fontWeight: '700', fontSize: 15 }}>
                      {agent.member.user.firstName} {agent.member.user.lastName}
                    </Text>
                    <Text variant="caption" style={{ color: '#6B7280', marginTop: 2 }}>
                      {agent.member.memberId}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                    <Text variant="caption" style={{ fontWeight: '700', fontSize: 10, color: statusColors.text, textTransform: 'uppercase' }}>
                      {agent.status.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>

                <View style={styles.agentDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="key-outline" size={14} color="#6B7280" />
                    <Text variant="caption" style={styles.detailText}>
                      Code: <Text variant="caption" style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '700' }}>{agent.agentCode}</Text>
                    </Text>
                    <TouchableOpacity onPress={() => copyToClipboard(agent.agentCode)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="copy-outline" size={14} color="#3B82F6" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={14} color="#6B7280" />
                    <Text variant="caption" style={styles.detailText}>
                      {agent.pollingUnit.name} ({agent.pollingUnit.unitCode})
                    </Text>
                  </View>
                  {agent.election && (
                    <View style={styles.detailRow}>
                      <Ionicons name="flag-outline" size={14} color="#6B7280" />
                      <Text variant="caption" style={styles.detailText}>{agent.election.title}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={14} color="#6B7280" />
                    <Text variant="caption" style={styles.detailText}>
                      Assigned: {new Date(agent.assignedAt).toLocaleDateString()}
                    </Text>
                    {agent.checkedInAt && (
                      <Text variant="caption" style={{ color: '#059669', fontSize: 11, marginLeft: 8 }}>
                        Checked in {new Date(agent.checkedInAt).toLocaleTimeString()}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.agentActions}>
                  {agent.status !== 'revoked' ? (
                    <TouchableOpacity style={styles.revokeBtn} onPress={() => handleRevoke(agent)}>
                      <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                      <Text variant="caption" style={{ color: '#EF4444', fontWeight: '600' }}>Revoke</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.restoreBtn} onPress={() => handleRestore(agent)}>
                      <Ionicons name="refresh-outline" size={16} color="#3B82F6" />
                      <Text variant="caption" style={{ color: '#3B82F6', fontWeight: '600' }}>Restore</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16 },
  viewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, paddingBottom: 8 },
  searchRow: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', gap: 8 },
  headerSearchInput: { flex: 1, paddingVertical: 10, paddingRight: 12, fontSize: 14, color: '#111827' },
  addButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#00A86B', justifyContent: 'center', alignItems: 'center' },
  filterBar: { paddingHorizontal: 16, marginBottom: 4 },
  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  chipActive: { backgroundColor: '#00A86B', borderColor: '#00A86B' },
  chipText: { color: '#6B7280', fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  countRow: { paddingHorizontal: 16, paddingVertical: 6 },
  agentCard: { padding: 14, marginBottom: 10 },
  agentTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  agentDetails: { marginTop: 10, gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { color: '#6B7280', fontSize: 12, flex: 1 },
  agentActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  revokeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#FEF2F2' },
  restoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#EFF6FF' },
  formCard: { padding: 20 },
  fieldLabel: { color: '#374151', fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: '#FFFFFF' },
  searchInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, gap: 0 },
  searchInput: { flex: 1, paddingHorizontal: 10, paddingVertical: 12, fontSize: 14, color: '#111827' },
  dropdownList: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginTop: 4, maxHeight: 180, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownEmpty: { padding: 14, textAlign: 'center', color: '#9CA3AF' },
  selectedItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 8 },
  credentialsCard: { padding: 24 },
  credentialsHeader: { alignItems: 'center', marginBottom: 20 },
  credentialRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: '#F0FDF4', borderRadius: 10, marginBottom: 10 },
  credentialValue: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '800', color: '#111827', marginTop: 2 },
  copyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  copyBothBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginBottom: 16 },
  credentialActions: { flexDirection: 'row', gap: 12 },
});
