import { useState, useCallback, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  Modal, Image
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AGENT_STORAGE_KEY = 'apc_agent_session';

interface CandidateInfo {
  id: string;
  name: string;
  party: string;
  partyColor: string;
  partyId: string;
  partyName: string;
}

interface ResultSheetInfo {
  id: string;
  fileUrl: string;
  fileName: string;
  isVerified: boolean;
  uploadedAt: string;
}

interface SubmittedResult {
  candidateId: string;
  partyId: string;
  votes: number;
  isVerified: boolean;
}

interface ElectionInfo {
  id: string;
  title: string;
  position: string;
  status: string;
  electionDate: string;
  candidates: CandidateInfo[];
  submittedResults: SubmittedResult[];
  registeredVoters: number;
  accreditedVoters: number;
  hasResults: boolean;
  resultSheets: ResultSheetInfo[];
}

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
  elections: ElectionInfo[];
}

interface Incident {
  id: string;
  severity: string;
  description: string;
  location: string;
  status: string;
  createdAt: string;
}

type ActiveView = 'dashboard' | 'report-incident' | 'submit-results' | 'my-incidents' | 'result-sheets';

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low', color: '#F59E0B', icon: 'information-circle' },
  { value: 'medium', label: 'Medium', color: '#F97316', icon: 'warning' },
  { value: 'high', label: 'High', color: '#EF4444', icon: 'alert-circle' },
] as const;

const POSITION_LABELS: Record<string, string> = {
  presidential: 'Presidential',
  governorship: 'Governorship',
  senatorial: 'Senatorial',
  house_of_reps: 'House of Reps',
  state_assembly: 'State Assembly',
  lga_chairman: 'LGA Chairman',
  councillorship: 'Councillorship',
};

const POSITION_ICONS: Record<string, string> = {
  presidential: 'flag',
  governorship: 'business',
  senatorial: 'people',
  house_of_reps: 'people-circle',
  state_assembly: 'home',
  lga_chairman: 'person-circle',
  councillorship: 'person',
};

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

  const [selectedElectionIndex, setSelectedElectionIndex] = useState(0);
  const [voteCountsByElection, setVoteCountsByElection] = useState<Record<string, Record<string, string>>>({});
  const [voterInfoByElection, setVoterInfoByElection] = useState<Record<string, { registered: string; accredited: string }>>({});
  const [submittingElectionId, setSubmittingElectionId] = useState<string | null>(null);

  const [sheetPreviewUrl, setSheetPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const stored = await AsyncStorage.getItem(AGENT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.elections) {
          setAgentSession(parsed);
        } else {
          await AsyncStorage.removeItem(AGENT_STORAGE_KEY);
        }
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
    setVoteCountsByElection({});
    setVoterInfoByElection({});
  };

  const refreshSession = async () => {
    if (!agentSession) return;
    try {
      const response = await api.post('/api/agent/login', {
        agentCode: agentSession.agentCode,
        agentPin: agentSession.agentPin,
      });
      if (response.success) {
        const updatedSession: AgentSession = {
          agentCode: agentSession.agentCode,
          agentPin: agentSession.agentPin,
          ...response.data,
        };
        await saveSession(updatedSession);
      }
    } catch {}
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

  const submitSingleElectionMutation = useMutation({
    mutationFn: async (electionId: string) => {
      if (!agentSession) throw new Error('No session');
      const election = agentSession.elections.find(e => e.id === electionId);
      if (!election) throw new Error('Election not found');

      const voteCounts = voteCountsByElection[electionId] || {};
      const voterInfo = voterInfoByElection[electionId] || { registered: '0', accredited: '0' };

      const results = election.candidates.map(c => ({
        candidateId: c.id,
        partyId: c.partyId,
        votes: parseInt(voteCounts[c.id] || '0', 10),
      }));

      const response = await api.post('/api/agent/submit-results', {
        agentCode: agentSession.agentCode,
        agentPin: agentSession.agentPin,
        electionId,
        pollingUnitId: agentSession.pollingUnit.id,
        results,
        registeredVoters: parseInt(voterInfo.registered || '0', 10),
        accreditedVoters: parseInt(voterInfo.accredited || '0', 10),
      });
      if (!response.success) throw new Error(response.error || 'Submission failed');
      return response.data;
    },
    onSuccess: (_, electionId) => {
      Alert.alert('Results Submitted', 'Vote counts for this election have been submitted and will be verified.');
      setSubmittingElectionId(null);
      refreshSession();
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message);
      setSubmittingElectionId(null);
    },
  });

  const uploadResultSheetMutation = useMutation({
    mutationFn: async ({ electionId, uri, fileName }: { electionId: string; uri: string; fileName: string }) => {
      if (!agentSession) throw new Error('No session');

      const formData = new FormData();
      formData.append('agentCode', agentSession.agentCode);
      formData.append('agentPin', agentSession.agentPin);
      formData.append('electionId', electionId);
      formData.append('pollingUnitId', agentSession.pollingUnit.id);
      formData.append('resultSheet', {
        uri,
        name: fileName || 'result_sheet.jpg',
        type: 'image/jpeg',
      } as any);

      const response = await api.upload('/api/agent/upload-result-sheet', formData);
      if (!response.success) throw new Error(response.error || 'Upload failed');
      return response.data;
    },
    onSuccess: () => {
      Alert.alert('Upload Complete', 'Result sheet photo has been uploaded successfully.');
      refreshSession();
    },
    onError: (err: Error) => {
      Alert.alert('Upload Failed', err.message);
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
    await refreshSession();
    await refetchIncidents();
    setRefreshing(false);
  }, [agentSession]);

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

  const handleSubmitElectionResults = (electionId: string) => {
    const voteCounts = voteCountsByElection[electionId] || {};
    const totalVotes = Object.values(voteCounts).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
    if (totalVotes === 0) {
      Alert.alert('Required', 'Enter vote counts for at least one party/candidate');
      return;
    }

    const election = agentSession?.elections.find(e => e.id === electionId);

    Alert.alert(
      'Confirm Submission',
      `Submit results for ${election?.title || 'this election'}?\n\nTotal votes: ${totalVotes}\n\nThis will be sent for verification.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: () => {
            setSubmittingElectionId(electionId);
            submitSingleElectionMutation.mutate(electionId);
          }
        },
      ]
    );
  };

  const handlePickResultSheet = async (electionId: string) => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permResult.granted) {
        const cameraResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!cameraResult.granted) {
          Alert.alert('Permission Needed', 'Camera and photo library access is needed to upload result sheets.');
          return;
        }
      }

      Alert.alert(
        'Upload Result Sheet',
        'Choose how to capture the result sheet',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 0.8,
                allowsEditing: false,
              });
              if (!result.canceled && result.assets[0]) {
                uploadResultSheetMutation.mutate({
                  electionId,
                  uri: result.assets[0].uri,
                  fileName: `result_sheet_${Date.now()}.jpg`,
                });
              }
            }
          },
          {
            text: 'Choose from Gallery',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.8,
                allowsEditing: false,
              });
              if (!result.canceled && result.assets[0]) {
                uploadResultSheetMutation.mutate({
                  electionId,
                  uri: result.assets[0].uri,
                  fileName: result.assets[0].fileName || `result_sheet_${Date.now()}.jpg`,
                });
              }
            }
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', 'Could not access image picker');
    }
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
              Sign in with your assigned agent credentials to submit results for all election classes
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
    const elections = agentSession.elections || [];

    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.viewHeader2}>
          <TouchableOpacity onPress={() => setActiveView('dashboard')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#374151" />
          </TouchableOpacity>
          <Text variant="h3" style={{ flex: 1 }}>Submit Results</Text>
          <Text variant="caption" style={{ color: '#6B7280' }}>
            {elections.length} election{elections.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {elections.length === 0 ? (
          <View style={styles.content}>
            <EmptyState icon="document-text-outline" title="No Active Elections" subtitle="There are no active elections to submit results for" />
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.electionTabs}>
              {elections.map((election, idx) => (
                <TouchableOpacity
                  key={election.id}
                  style={[styles.electionTab, selectedElectionIndex === idx && styles.electionTabActive]}
                  onPress={() => setSelectedElectionIndex(idx)}
                >
                  <Ionicons
                    name={(POSITION_ICONS[election.position] || 'flag') as any}
                    size={16}
                    color={selectedElectionIndex === idx ? '#FFFFFF' : '#6B7280'}
                  />
                  <Text variant="caption" style={[
                    styles.electionTabText,
                    selectedElectionIndex === idx && styles.electionTabTextActive
                  ]}>
                    {POSITION_LABELS[election.position] || election.position}
                  </Text>
                  {election.hasResults && (
                    <View style={[styles.submittedDot, selectedElectionIndex === idx && { backgroundColor: '#DCFCE7' }]}>
                      <Ionicons name="checkmark" size={10} color={selectedElectionIndex === idx ? '#059669' : '#059669'} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView contentContainerStyle={styles.content}>
              {elections[selectedElectionIndex] && (
                <ElectionResultForm
                  election={elections[selectedElectionIndex]}
                  voteCounts={voteCountsByElection[elections[selectedElectionIndex].id] || {}}
                  voterInfo={voterInfoByElection[elections[selectedElectionIndex].id] || { registered: '', accredited: '' }}
                  onVoteChange={(candidateId, value) => {
                    const elId = elections[selectedElectionIndex].id;
                    setVoteCountsByElection(prev => ({
                      ...prev,
                      [elId]: { ...(prev[elId] || {}), [candidateId]: value }
                    }));
                  }}
                  onVoterInfoChange={(field, value) => {
                    const elId = elections[selectedElectionIndex].id;
                    setVoterInfoByElection(prev => ({
                      ...prev,
                      [elId]: { ...(prev[elId] || { registered: '', accredited: '' }), [field]: value }
                    }));
                  }}
                  onSubmit={() => handleSubmitElectionResults(elections[selectedElectionIndex].id)}
                  onUploadSheet={() => handlePickResultSheet(elections[selectedElectionIndex].id)}
                  isSubmitting={submittingElectionId === elections[selectedElectionIndex].id}
                  isUploading={uploadResultSheetMutation.isPending}
                />
              )}
            </ScrollView>
          </>
        )}
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

  if (activeView === 'result-sheets') {
    const allSheets = agentSession.elections.flatMap(e =>
      (e.resultSheets || []).map(rs => ({ ...rs, electionTitle: e.title, electionPosition: e.position }))
    );

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
          <Text variant="h3" style={{ flex: 1 }}>Result Sheets</Text>
          <Text variant="caption" style={{ color: '#6B7280' }}>{allSheets.length} uploaded</Text>
        </View>

        {allSheets.length > 0 ? (
          allSheets.map((sheet) => (
            <Card key={sheet.id} style={styles.sheetCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={styles.sheetIcon}>
                  <Ionicons name="image" size={24} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ fontWeight: '600', fontSize: 14 }}>
                    {POSITION_LABELS[sheet.electionPosition] || sheet.electionPosition}
                  </Text>
                  <Text variant="caption" style={{ color: '#6B7280' }}>{sheet.fileName}</Text>
                  <Text variant="caption" style={{ color: '#9CA3AF', fontSize: 11 }}>{formatDate(sheet.uploadedAt)}</Text>
                </View>
                <View style={[styles.verifyBadge, { backgroundColor: sheet.isVerified ? '#DCFCE7' : '#FEF3C7' }]}>
                  <Text variant="caption" style={{
                    fontSize: 10, fontWeight: '700',
                    color: sheet.isVerified ? '#059669' : '#D97706'
                  }}>
                    {sheet.isVerified ? 'Verified' : 'Pending'}
                  </Text>
                </View>
              </View>
            </Card>
          ))
        ) : (
          <EmptyState icon="camera-outline" title="No result sheets" subtitle="Upload photos of official result sheets" />
        )}

        <Modal visible={!!sheetPreviewUrl} transparent animationType="fade" onRequestClose={() => setSheetPreviewUrl(null)}>
          <View style={styles.previewOverlay}>
            <TouchableOpacity style={styles.previewClose} onPress={() => setSheetPreviewUrl(null)}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            {sheetPreviewUrl && <Image source={{ uri: sheetPreviewUrl }} style={styles.previewImage} resizeMode="contain" />}
          </View>
        </Modal>
      </ScrollView>
    );
  }

  const totalElections = agentSession.elections?.length || 0;
  const electionsWithResults = agentSession.elections?.filter(e => e.hasResults).length || 0;
  const totalSheets = agentSession.elections?.reduce((sum, e) => sum + (e.resultSheets?.length || 0), 0) || 0;

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
            { backgroundColor: agentSession.agent.status === 'checked_in' ? '#DCFCE7' : agentSession.agent.status === 'active' ? '#DBEAFE' : '#FEF3C7' }
          ]}>
            <Text variant="caption" style={{
              fontWeight: '700', fontSize: 10,
              color: agentSession.agent.status === 'checked_in' ? '#059669' : agentSession.agent.status === 'active' ? '#3B82F6' : '#D97706',
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

      <Card style={styles.progressCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Ionicons name="stats-chart" size={18} color="#8B5CF6" />
          <Text variant="body" style={{ fontWeight: '700' }}>Submission Progress</Text>
        </View>
        <View style={styles.progressRow}>
          <View style={styles.progressItem}>
            <Text variant="h2" style={{ color: '#00A86B' }}>{electionsWithResults}</Text>
            <Text variant="caption" style={{ color: '#6B7280' }}>Results In</Text>
          </View>
          <View style={styles.progressDivider} />
          <View style={styles.progressItem}>
            <Text variant="h2" style={{ color: '#3B82F6' }}>{totalElections}</Text>
            <Text variant="caption" style={{ color: '#6B7280' }}>Total Elections</Text>
          </View>
          <View style={styles.progressDivider} />
          <View style={styles.progressItem}>
            <Text variant="h2" style={{ color: '#8B5CF6' }}>{totalSheets}</Text>
            <Text variant="caption" style={{ color: '#6B7280' }}>Sheets Uploaded</Text>
          </View>
        </View>
        {totalElections > 0 && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(electionsWithResults / totalElections) * 100}%` }]} />
          </View>
        )}
      </Card>

      {agentSession.elections && agentSession.elections.length > 0 && (
        <>
          <Text variant="h3" style={styles.sectionTitle}>Elections ({totalElections})</Text>
          {agentSession.elections.map((election) => (
            <Card key={election.id} style={styles.electionCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.positionIcon, { backgroundColor: election.hasResults ? '#DCFCE7' : '#F3F4F6' }]}>
                  <Ionicons
                    name={(POSITION_ICONS[election.position] || 'flag') as any}
                    size={20}
                    color={election.hasResults ? '#059669' : '#6B7280'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ fontWeight: '600', fontSize: 14 }}>{election.title}</Text>
                  <Text variant="caption" style={{ color: '#6B7280' }}>
                    {POSITION_LABELS[election.position] || election.position} - {election.candidates.length} candidates
                  </Text>
                </View>
                {election.hasResults ? (
                  <View style={styles.submittedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#059669" />
                    <Text variant="caption" style={{ color: '#059669', fontWeight: '700', fontSize: 11 }}>Submitted</Text>
                  </View>
                ) : (
                  <View style={styles.pendingBadge}>
                    <Ionicons name="time" size={14} color="#D97706" />
                    <Text variant="caption" style={{ color: '#D97706', fontWeight: '700', fontSize: 11 }}>Pending</Text>
                  </View>
                )}
              </View>
              {(election.resultSheets || []).length > 0 && (
                <View style={styles.sheetsBadge}>
                  <Ionicons name="camera" size={12} color="#3B82F6" />
                  <Text variant="caption" style={{ color: '#3B82F6', fontSize: 11, fontWeight: '600' }}>
                    {election.resultSheets.length} sheet(s) uploaded
                  </Text>
                </View>
              )}
            </Card>
          ))}
        </>
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
          onPress={() => {
            setSelectedElectionIndex(0);
            setActiveView('submit-results');
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="create" size={28} color="#00A86B" />
          </View>
          <Text variant="body" style={styles.actionLabel}>Submit Results</Text>
          <Text variant="caption" style={styles.actionSub}>{electionsWithResults}/{totalElections} done</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => setActiveView('result-sheets')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="camera" size={28} color="#3B82F6" />
          </View>
          <Text variant="body" style={styles.actionLabel}>Result Sheets</Text>
          <Text variant="caption" style={styles.actionSub}>{totalSheets} uploaded</Text>
        </TouchableOpacity>

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

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => setActiveView('my-incidents')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#F5F3FF' }]}>
            <Ionicons name="document-text" size={28} color="#8B5CF6" />
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

function ElectionResultForm({
  election,
  voteCounts,
  voterInfo,
  onVoteChange,
  onVoterInfoChange,
  onSubmit,
  onUploadSheet,
  isSubmitting,
  isUploading,
}: {
  election: ElectionInfo;
  voteCounts: Record<string, string>;
  voterInfo: { registered: string; accredited: string };
  onVoteChange: (candidateId: string, value: string) => void;
  onVoterInfoChange: (field: 'registered' | 'accredited', value: string) => void;
  onSubmit: () => void;
  onUploadSheet: () => void;
  isSubmitting: boolean;
  isUploading: boolean;
}) {
  const totalVotes = Object.values(voteCounts).reduce((s, v) => s + (parseInt(v, 10) || 0), 0);

  const getExistingVotes = (candidateId: string): string => {
    const existing = election.submittedResults.find(r => r.candidateId === candidateId);
    return existing ? String(existing.votes) : '';
  };

  return (
    <View>
      <Card style={styles.formCard}>
        <View style={styles.electionBanner}>
          <Ionicons
            name={(POSITION_ICONS[election.position] || 'flag') as any}
            size={20}
            color={election.hasResults ? '#059669' : '#3B82F6'}
          />
          <View style={{ flex: 1 }}>
            <Text variant="body" style={{ fontWeight: '700', fontSize: 15 }}>{election.title}</Text>
            <Text variant="caption" style={{ color: '#6B7280' }}>
              {POSITION_LABELS[election.position] || election.position}
            </Text>
          </View>
          {election.hasResults && (
            <View style={styles.submittedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#059669" />
              <Text variant="caption" style={{ color: '#059669', fontWeight: '700', fontSize: 11 }}>Submitted</Text>
            </View>
          )}
        </View>

        <Text variant="caption" style={styles.fieldLabel}>Registered Voters</Text>
        <TextInput
          style={styles.input}
          placeholder={election.registeredVoters > 0 ? String(election.registeredVoters) : '0'}
          placeholderTextColor="#9CA3AF"
          value={voterInfo.registered}
          onChangeText={(v) => onVoterInfoChange('registered', v)}
          keyboardType="number-pad"
        />

        <Text variant="caption" style={styles.fieldLabel}>Accredited Voters</Text>
        <TextInput
          style={styles.input}
          placeholder={election.accreditedVoters > 0 ? String(election.accreditedVoters) : '0'}
          placeholderTextColor="#9CA3AF"
          value={voterInfo.accredited}
          onChangeText={(v) => onVoterInfoChange('accredited', v)}
          keyboardType="number-pad"
        />

        <View style={styles.divider} />
        <Text variant="body" style={{ fontWeight: '700', marginBottom: 12 }}>
          Vote Counts by Party ({election.candidates.length} parties)
        </Text>

        {election.candidates.map((candidate) => (
          <View key={candidate.id} style={styles.candidateRow}>
            <View style={styles.candidateInfo}>
              <View style={[styles.partyDot, { backgroundColor: candidate.partyColor }]} />
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: '600', fontSize: 14 }}>{candidate.party}</Text>
                <Text variant="caption" style={{ color: '#6B7280', fontSize: 12 }}>{candidate.name}</Text>
              </View>
            </View>
            <TextInput
              style={styles.voteInput}
              placeholder={getExistingVotes(candidate.id) || '0'}
              placeholderTextColor="#9CA3AF"
              value={voteCounts[candidate.id] || ''}
              onChangeText={(v) => onVoteChange(candidate.id, v)}
              keyboardType="number-pad"
            />
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text variant="body" style={{ fontWeight: '700' }}>Total Votes</Text>
          <Text variant="h3" style={{ color: '#00A86B' }}>{totalVotes}</Text>
        </View>

        <Button
          title={isSubmitting ? 'Submitting...' : election.hasResults ? 'Update Results' : 'Submit Results'}
          onPress={onSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
          style={{ marginTop: 16 }}
        />
      </Card>

      <Card style={styles.formCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Ionicons name="camera" size={18} color="#3B82F6" />
          <Text variant="body" style={{ fontWeight: '700', flex: 1 }}>Result Sheet Photo</Text>
          {(election.resultSheets || []).length > 0 && (
            <Text variant="caption" style={{ color: '#059669', fontWeight: '600' }}>
              {election.resultSheets.length} uploaded
            </Text>
          )}
        </View>

        <Text variant="caption" style={{ color: '#6B7280', marginBottom: 12 }}>
          Take a photo of the official INEC result sheet for this election
        </Text>

        <Button
          title={isUploading ? 'Uploading...' : 'Upload Result Sheet'}
          onPress={onUploadSheet}
          loading={isUploading}
          disabled={isUploading}
          style={{ backgroundColor: '#3B82F6' }}
        />

        {(election.resultSheets || []).map((sheet) => (
          <View key={sheet.id} style={styles.sheetRow}>
            <Ionicons name="document-attach" size={16} color="#6B7280" />
            <Text variant="caption" style={{ flex: 1, color: '#374151' }}>{sheet.fileName || 'Result Sheet'}</Text>
            <View style={[styles.verifyBadge, { backgroundColor: sheet.isVerified ? '#DCFCE7' : '#FEF3C7' }]}>
              <Text variant="caption" style={{
                fontSize: 9, fontWeight: '700',
                color: sheet.isVerified ? '#059669' : '#D97706'
              }}>{sheet.isVerified ? 'Verified' : 'Pending'}</Text>
            </View>
          </View>
        ))}
      </Card>

      <View style={{ height: 30 }} />
    </View>
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
  viewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, paddingHorizontal: 16, paddingTop: 16 },
  viewHeader2: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  formCard: { padding: 20, marginBottom: 12 },
  severityRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  severityChip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#E5E7EB' },
  severityText: { fontSize: 12, color: '#9CA3AF' },
  agentCard: { padding: 16, marginBottom: 12 },
  agentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  agentAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center' },
  agentName: { fontWeight: '700', fontSize: 16 },
  agentCodeText: { color: '#6B7280', fontSize: 12 },
  agentStatusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  unitCard: { padding: 16, marginBottom: 12 },
  unitHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  unitName: { fontWeight: '700', color: '#111827', marginBottom: 4 },
  unitCode: { color: '#6B7280', marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { color: '#9CA3AF', fontSize: 12 },
  progressCard: { padding: 16, marginBottom: 12 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  progressItem: { alignItems: 'center' },
  progressDivider: { width: 1, height: 30, backgroundColor: '#E5E7EB' },
  progressBar: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#00A86B', borderRadius: 3 },
  electionCard: { padding: 14, marginBottom: 8 },
  positionIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  submittedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  sheetsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  sectionTitle: { fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: { width: '47%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
  actionIcon: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  actionLabel: { fontWeight: '600', fontSize: 13, textAlign: 'center' },
  actionSub: { color: '#9CA3AF', fontSize: 11, textAlign: 'center', marginTop: 2 },
  electionTabs: { paddingHorizontal: 16, maxHeight: 44, marginBottom: 4 },
  electionTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8, height: 36 },
  electionTabActive: { backgroundColor: '#00A86B' },
  electionTabText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  electionTabTextActive: { color: '#FFFFFF' },
  submittedDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center' },
  electionBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  candidateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  candidateInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  partyDot: { width: 14, height: 14, borderRadius: 7 },
  voteInput: { width: 80, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, textAlign: 'center', fontWeight: '700', color: '#111827', backgroundColor: '#FFFFFF' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  incidentItem: { padding: 14, marginBottom: 8 },
  incidentHeader: { flexDirection: 'row', gap: 8 },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  sheetCard: { padding: 14, marginBottom: 8 },
  sheetIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  verifyBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  previewClose: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  previewImage: { width: '90%', height: '70%' },
});
