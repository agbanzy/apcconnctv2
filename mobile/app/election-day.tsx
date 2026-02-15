import { useState, useCallback, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { api } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AGENT_STORAGE_KEY = 'apc_agent_session';

interface AgentSession {
  agentCode: string;
  agentPin: string;
  agent: {
    id: string;
    agentCode: string;
    status: string;
    memberId: string;
    memberName: string;
  };
  pollingUnit: {
    id: string;
    name: string;
    unitCode: string;
    status: string;
  };
  location: {
    ward: string;
    lga: string;
    state: string;
  };
  election: {
    id: string;
    title: string;
    position: string;
    status: string;
  } | null;
  candidates: Array<{
    id: string;
    name: string;
    party: string;
    partyColor: string;
    partyId: string;
  }>;
}

interface Incident {
  id: string;
  severity: string;
  description: string;
  location: string;
  status: string;
  createdAt: string;
}

type ActiveView = 'dashboard' | 'report-incident' | 'submit-results' | 'my-incidents';

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low', color: '#F59E0B', icon: 'information-circle' },
  { value: 'medium', label: 'Medium', color: '#F97316', icon: 'warning' },
  { value: 'high', label: 'High', color: '#EF4444', icon: 'alert-circle' },
] as const;

export default function ElectionDayScreen() {
  const queryClient = useQueryClient();
  const [agentSession, setAgentSession] = useState<AgentSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [agentCode, setAgentCode] = useState('');
  const [agentPin, setAgentPin] = useState('');
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [refreshing, setRefreshing] = useState(false);

  const [incidentSeverity, setIncidentSeverity] = useState<string>('medium');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentLocation, setIncidentLocation] = useState('');

  const [voteCounts, setVoteCounts] = useState<Record<string, string>>({});
  const [registeredVoters, setRegisteredVoters] = useState('');
  const [accreditedVoters, setAccreditedVoters] = useState('');

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const stored = await AsyncStorage.getItem(AGENT_STORAGE_KEY);
      if (stored) {
        setAgentSession(JSON.parse(stored));
      }
    } catch {
    } finally {
      setIsLoadingSession(false);
    }
  };

  const saveSession = async (session: AgentSession) => {
    await AsyncStorage.setItem(AGENT_STORAGE_KEY, JSON.stringify(session));
    setAgentSession(session);
  };

  const clearSession = async () => {
    await AsyncStorage.removeItem(AGENT_STORAGE_KEY);
    setAgentSession(null);
    setActiveView('dashboard');
  };

  const loginMutation = useMutation({
    mutationFn: async (params: { agentCode: string; agentPin: string }) => {
      const response = await api.post('/api/agent/login', params);
      if (!response.success) throw new Error(response.error || 'Login failed');
      return response.data;
    },
    onSuccess: async (data: any) => {
      const session: AgentSession = {
        agentCode: agentCode.toUpperCase(),
        agentPin,
        ...data,
      };
      await saveSession(session);
      setAgentCode('');
      setAgentPin('');
    },
    onError: (err: Error) => {
      Alert.alert('Login Failed', err.message);
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!agentSession) throw new Error('No session');
      const response = await api.post('/api/agent/check-in', {
        agentCode: agentSession.agentCode,
        agentPin: agentSession.agentPin,
      });
      if (!response.success) throw new Error(response.error || 'Check-in failed');
      return response.data;
    },
    onSuccess: () => {
      Alert.alert('Checked In', 'You have successfully checked in at your polling unit.');
      if (agentSession) {
        const updated = { ...agentSession, agent: { ...agentSession.agent, status: 'checked_in' } };
        saveSession(updated);
      }
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message);
    },
  });

  const reportIncidentMutation = useMutation({
    mutationFn: async (params: { severity: string; description: string; location?: string }) => {
      if (!agentSession) throw new Error('No session');
      const response = await api.post('/api/agent/report-incident', {
        agentCode: agentSession.agentCode,
        agentPin: agentSession.agentPin,
        ...params,
      });
      if (!response.success) throw new Error(response.error || 'Report failed');
      return response.data;
    },
    onSuccess: () => {
      Alert.alert('Incident Reported', 'Your report has been submitted to the situation room.');
      setIncidentDescription('');
      setIncidentLocation('');
      setIncidentSeverity('medium');
      setActiveView('dashboard');
      queryClient.invalidateQueries({ queryKey: ['/api/agent/my-incidents'] });
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message);
    },
  });

  const submitResultsMutation = useMutation({
    mutationFn: async () => {
      if (!agentSession || !agentSession.election) throw new Error('No election data');
      const results = agentSession.candidates.map(c => ({
        candidateId: c.id,
        partyId: c.partyId,
        votes: parseInt(voteCounts[c.id] || '0', 10),
      }));

      const response = await api.post('/api/agent/submit-results', {
        agentCode: agentSession.agentCode,
        agentPin: agentSession.agentPin,
        electionId: agentSession.election.id,
        pollingUnitId: agentSession.pollingUnit.id,
        results,
        registeredVoters: parseInt(registeredVoters || '0', 10),
        accreditedVoters: parseInt(accreditedVoters || '0', 10),
      });
      if (!response.success) throw new Error(response.error || 'Submission failed');
      return response.data;
    },
    onSuccess: () => {
      Alert.alert('Results Submitted', 'Vote counts have been submitted successfully and will be verified.');
      setVoteCounts({});
      setRegisteredVoters('');
      setAccreditedVoters('');
      setActiveView('dashboard');
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message);
    },
  });

  const { data: myIncidents, isLoading: incidentsLoading, refetch: refetchIncidents } = useQuery({
    queryKey: ['/api/agent/my-incidents'],
    queryFn: async () => {
      if (!agentSession) return [];
      const response = await api.get(`/api/agent/my-incidents?agentCode=${agentSession.agentCode}&agentPin=${agentSession.agentPin}`);
      if (!response.success) return [];
      return response.data as Incident[];
    },
    enabled: !!agentSession,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchIncidents();
    setRefreshing(false);
  }, [refetchIncidents]);

  const handleLogin = () => {
    if (!agentCode.trim() || !agentPin.trim()) {
      Alert.alert('Required', 'Enter your agent code and PIN');
      return;
    }
    loginMutation.mutate({ agentCode: agentCode.trim(), agentPin: agentPin.trim() });
  };

  const handleReportIncident = () => {
    if (!incidentDescription.trim()) {
      Alert.alert('Required', 'Please describe the incident');
      return;
    }
    reportIncidentMutation.mutate({
      severity: incidentSeverity,
      description: incidentDescription.trim(),
      location: incidentLocation.trim() || undefined,
    });
  };

  const handleSubmitResults = () => {
    const totalVotes = Object.values(voteCounts).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
    if (totalVotes === 0) {
      Alert.alert('Required', 'Enter vote counts for at least one candidate');
      return;
    }

    Alert.alert(
      'Confirm Submission',
      `Submit results with ${totalVotes} total votes?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', onPress: () => submitResultsMutation.mutate() },
      ]
    );
  };

  const formatDate = (s: string) => new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (isLoadingSession) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#00A86B" /></View>;
  }

  if (!agentSession) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.loginContainer}>
          <View style={styles.loginHeader}>
            <View style={styles.loginIconCircle}>
              <Ionicons name="shield-checkmark" size={40} color="#00A86B" />
            </View>
            <Text variant="h2" style={styles.loginTitle}>Election Day Agent</Text>
            <Text variant="body" style={styles.loginSub}>
              Sign in with your assigned agent credentials
            </Text>
          </View>

          <Card style={styles.loginCard}>
            <Text variant="caption" style={styles.fieldLabel}>Agent Code</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. AGT-001"
              placeholderTextColor="#9CA3AF"
              value={agentCode}
              onChangeText={setAgentCode}
              autoCapitalize="characters"
              data-testid="input-agent-code"
            />

            <Text variant="caption" style={styles.fieldLabel}>Agent PIN</Text>
            <TextInput
              style={styles.input}
              placeholder="Your 4-digit PIN"
              placeholderTextColor="#9CA3AF"
              value={agentPin}
              onChangeText={setAgentPin}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
              data-testid="input-agent-pin"
            />

            <Button
              title={loginMutation.isPending ? 'Signing In...' : 'Sign In'}
              onPress={handleLogin}
              loading={loginMutation.isPending}
              disabled={loginMutation.isPending}
              style={{ marginTop: 20 }}
            />
          </Card>

          <Text variant="caption" style={styles.loginNote}>
            Contact your coordinator if you don't have credentials
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (activeView === 'report-incident') {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.viewHeader}>
            <TouchableOpacity onPress={() => setActiveView('dashboard')} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#374151" />
            </TouchableOpacity>
            <Text variant="h3" style={{ flex: 1 }}>Report Incident</Text>
          </View>

          <Card style={styles.formCard}>
            <Text variant="caption" style={styles.fieldLabel}>Severity</Text>
            <View style={styles.severityRow}>
              {SEVERITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.severityChip, incidentSeverity === opt.value && { borderColor: opt.color, backgroundColor: `${opt.color}15` }]}
                  onPress={() => setIncidentSeverity(opt.value)}
                >
                  <Ionicons name={opt.icon as any} size={18} color={incidentSeverity === opt.value ? opt.color : '#9CA3AF'} />
                  <Text variant="caption" style={[styles.severityText, incidentSeverity === opt.value && { color: opt.color, fontWeight: '700' }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text variant="caption" style={styles.fieldLabel}>Description *</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Describe what happened..."
              placeholderTextColor="#9CA3AF"
              value={incidentDescription}
              onChangeText={setIncidentDescription}
              multiline
            />

            <Text variant="caption" style={styles.fieldLabel}>Location Details (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. At the main gate of the polling unit"
              placeholderTextColor="#9CA3AF"
              value={incidentLocation}
              onChangeText={setIncidentLocation}
            />

            <Button
              title={reportIncidentMutation.isPending ? 'Submitting...' : 'Submit Report'}
              onPress={handleReportIncident}
              loading={reportIncidentMutation.isPending}
              disabled={reportIncidentMutation.isPending || !incidentDescription.trim()}
              style={{ marginTop: 20, backgroundColor: '#EF4444' }}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (activeView === 'submit-results') {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.viewHeader}>
            <TouchableOpacity onPress={() => setActiveView('dashboard')} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#374151" />
            </TouchableOpacity>
            <Text variant="h3" style={{ flex: 1 }}>Submit Results</Text>
          </View>

          <Card style={styles.formCard}>
            <View style={styles.electionBanner}>
              <Ionicons name="checkmark-circle" size={20} color="#00A86B" />
              <Text variant="body" style={{ fontWeight: '600', flex: 1 }}>{agentSession.election?.title}</Text>
            </View>

            <Text variant="caption" style={styles.fieldLabel}>Registered Voters</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              value={registeredVoters}
              onChangeText={setRegisteredVoters}
              keyboardType="number-pad"
            />

            <Text variant="caption" style={styles.fieldLabel}>Accredited Voters</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              value={accreditedVoters}
              onChangeText={setAccreditedVoters}
              keyboardType="number-pad"
            />

            <View style={styles.divider} />
            <Text variant="body" style={{ fontWeight: '700', marginBottom: 12 }}>Vote Counts per Party</Text>

            {agentSession.candidates.map((candidate) => (
              <View key={candidate.id} style={styles.candidateRow}>
                <View style={styles.candidateInfo}>
                  <View style={[styles.partyDot, { backgroundColor: candidate.partyColor }]} />
                  <View style={{ flex: 1 }}>
                    <Text variant="body" style={{ fontWeight: '600', fontSize: 14 }}>{candidate.name}</Text>
                    <Text variant="caption" style={{ color: '#6B7280' }}>{candidate.party}</Text>
                  </View>
                </View>
                <TextInput
                  style={styles.voteInput}
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  value={voteCounts[candidate.id] || ''}
                  onChangeText={(v) => setVoteCounts(prev => ({ ...prev, [candidate.id]: v }))}
                  keyboardType="number-pad"
                />
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text variant="body" style={{ fontWeight: '700' }}>Total Votes</Text>
              <Text variant="h3" style={{ color: '#00A86B' }}>
                {Object.values(voteCounts).reduce((s, v) => s + (parseInt(v, 10) || 0), 0)}
              </Text>
            </View>

            <Button
              title={submitResultsMutation.isPending ? 'Submitting...' : 'Submit Results'}
              onPress={handleSubmitResults}
              loading={submitResultsMutation.isPending}
              disabled={submitResultsMutation.isPending}
              style={{ marginTop: 16 }}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (activeView === 'my-incidents') {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A86B" />}
      >
        <View style={styles.viewHeader}>
          <TouchableOpacity onPress={() => setActiveView('dashboard')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#374151" />
          </TouchableOpacity>
          <Text variant="h3" style={{ flex: 1 }}>My Reports</Text>
        </View>

        {incidentsLoading ? (
          <ActivityIndicator color="#00A86B" style={{ marginTop: 30 }} />
        ) : (myIncidents || []).length > 0 ? (
          (myIncidents || []).map((inc) => (
            <Card key={inc.id} style={styles.incidentItem}>
              <View style={styles.incidentHeader}>
                <View style={[
                  styles.severityBadge,
                  { backgroundColor: inc.severity === 'high' ? '#FEE2E2' : inc.severity === 'medium' ? '#FEF3C7' : '#DBEAFE' }
                ]}>
                  <Text variant="caption" style={{
                    fontWeight: '700', fontSize: 10, textTransform: 'uppercase',
                    color: inc.severity === 'high' ? '#EF4444' : inc.severity === 'medium' ? '#F59E0B' : '#3B82F6',
                  }}>{inc.severity}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: inc.status === 'resolved' ? '#DCFCE7' : inc.status === 'investigating' ? '#FEF3C7' : '#F3F4F6' }
                ]}>
                  <Text variant="caption" style={{
                    fontWeight: '600', fontSize: 10, textTransform: 'capitalize',
                    color: inc.status === 'resolved' ? '#059669' : inc.status === 'investigating' ? '#D97706' : '#6B7280',
                  }}>{inc.status}</Text>
                </View>
              </View>
              <Text variant="body" style={{ color: '#374151', marginTop: 8, fontSize: 14 }}>{inc.description}</Text>
              <Text variant="caption" style={{ color: '#9CA3AF', marginTop: 6 }}>{formatDate(inc.createdAt)}</Text>
            </Card>
          ))
        ) : (
          <EmptyState icon="document-text-outline" title="No reports yet" subtitle="Your incident reports will appear here" />
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A86B" />}
    >
      <Card style={styles.agentCard}>
        <View style={styles.agentRow}>
          <View style={styles.agentAvatar}>
            <Ionicons name="shield-checkmark" size={24} color="#00A86B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="body" style={styles.agentName}>{agentSession.agent.memberName}</Text>
            <Text variant="caption" style={styles.agentCodeText}>Agent: {agentSession.agent.agentCode}</Text>
          </View>
          <View style={[
            styles.agentStatusBadge,
            { backgroundColor: agentSession.agent.status === 'checked_in' ? '#DCFCE7' : '#FEF3C7' }
          ]}>
            <Text variant="caption" style={{
              fontWeight: '700', fontSize: 10,
              color: agentSession.agent.status === 'checked_in' ? '#059669' : '#D97706',
              textTransform: 'uppercase',
            }}>{agentSession.agent.status.replace(/_/g, ' ')}</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.unitCard}>
        <View style={styles.unitHeader}>
          <Ionicons name="location" size={20} color="#3B82F6" />
          <Text variant="body" style={{ fontWeight: '700', flex: 1 }}>Polling Unit</Text>
        </View>
        <Text variant="h3" style={styles.unitName}>{agentSession.pollingUnit.name}</Text>
        <Text variant="caption" style={styles.unitCode}>Code: {agentSession.pollingUnit.unitCode}</Text>
        <View style={styles.locationRow}>
          <Text variant="caption" style={styles.locationText}>
            {agentSession.location.ward} Ward, {agentSession.location.lga} LGA, {agentSession.location.state} State
          </Text>
        </View>
      </Card>

      {agentSession.election && (
        <Card style={styles.electionCard}>
          <View style={styles.electionHeader}>
            <Ionicons name="flag" size={18} color="#8B5CF6" />
            <Text variant="body" style={{ fontWeight: '600', flex: 1 }}>{agentSession.election.title}</Text>
          </View>
          <Text variant="caption" style={{ color: '#6B7280', textTransform: 'capitalize' }}>
            {agentSession.election.position.replace(/_/g, ' ')} - {agentSession.election.status}
          </Text>
        </Card>
      )}

      {agentSession.agent.status === 'assigned' && (
        <Button
          title={checkInMutation.isPending ? 'Checking In...' : 'Check In at Polling Unit'}
          onPress={() => checkInMutation.mutate()}
          loading={checkInMutation.isPending}
          style={{ marginBottom: 16, backgroundColor: '#3B82F6' }}
        />
      )}

      <Text variant="h3" style={styles.sectionTitle}>Actions</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => setActiveView('report-incident')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="alert-circle" size={28} color="#EF4444" />
          </View>
          <Text variant="body" style={styles.actionLabel}>Report Incident</Text>
          <Text variant="caption" style={styles.actionSub}>Alert situation room</Text>
        </TouchableOpacity>

        {agentSession.election && (
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setActiveView('submit-results')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="create" size={28} color="#00A86B" />
            </View>
            <Text variant="body" style={styles.actionLabel}>Submit Results</Text>
            <Text variant="caption" style={styles.actionSub}>Enter vote counts</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => setActiveView('my-incidents')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="document-text" size={28} color="#3B82F6" />
          </View>
          <Text variant="body" style={styles.actionLabel}>My Reports</Text>
          <Text variant="caption" style={styles.actionSub}>{(myIncidents || []).length} report(s)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => {
            Alert.alert('Sign Out', 'End your agent session?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: clearSession },
            ]);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#F3F4F6' }]}>
            <Ionicons name="log-out" size={28} color="#6B7280" />
          </View>
          <Text variant="body" style={styles.actionLabel}>Sign Out</Text>
          <Text variant="caption" style={styles.actionSub}>End session</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  loginContainer: { padding: 24, justifyContent: 'center', flexGrow: 1 },
  loginHeader: { alignItems: 'center', marginBottom: 30 },
  loginIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  loginTitle: { fontWeight: '700', color: '#111827' },
  loginSub: { color: '#6B7280', textAlign: 'center', marginTop: 6 },
  loginCard: { padding: 20 },
  loginNote: { color: '#9CA3AF', textAlign: 'center', marginTop: 20 },
  fieldLabel: { color: '#374151', fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#111827', backgroundColor: '#FFFFFF' },
  viewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  formCard: { padding: 20 },
  severityRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  severityChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: '#E5E7EB' },
  severityText: { color: '#9CA3AF', fontWeight: '500' },
  electionBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#F0FDF4', borderRadius: 8, marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 16 },
  candidateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  candidateInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  partyDot: { width: 12, height: 12, borderRadius: 6 },
  voteInput: { width: 80, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, fontWeight: '700', textAlign: 'center', color: '#111827', backgroundColor: '#FAFAFA' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, marginTop: 8, borderTopWidth: 2, borderTopColor: '#E5E7EB' },
  agentCard: { padding: 16, marginBottom: 12 },
  agentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  agentAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center' },
  agentName: { fontWeight: '700', fontSize: 16 },
  agentCodeText: { color: '#6B7280', marginTop: 2 },
  agentStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  unitCard: { padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#DBEAFE' },
  unitHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  unitName: { fontWeight: '700', color: '#111827' },
  unitCode: { color: '#6B7280', marginTop: 4 },
  locationRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  locationText: { color: '#6B7280', lineHeight: 18 },
  electionCard: { padding: 14, marginBottom: 16, backgroundColor: '#FAF5FF', borderWidth: 1, borderColor: '#E9D5FF' },
  electionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { color: '#111827', marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { width: '47%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  actionIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  actionLabel: { fontWeight: '600', fontSize: 14, marginBottom: 2 },
  actionSub: { color: '#9CA3AF', fontSize: 12 },
  incidentItem: { padding: 14, marginBottom: 10 },
  incidentHeader: { flexDirection: 'row', gap: 8 },
  severityBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
});
