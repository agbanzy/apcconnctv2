import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Alert, Modal, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';

interface Quiz {
  id: string;
  title: string;
  description?: string;
  category: string;
  difficulty: string;
  questionsCount: number;
  pointsReward: number;
  timeLimit?: number;
  attemptsAllowed?: number;
  userAttempts?: number;
  bestScore?: number;
}

interface Question {
  id: string;
  text: string;
  options: string[];
  points: number;
}

interface QuizDetail {
  quiz: Quiz;
  questions: Question[];
}

export default function QuizzesScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [quizInProgress, setQuizInProgress] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: quizzes, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/quizzes'],
    queryFn: async () => {
      const response = await api.get('/api/quizzes');
      if (!response.success) throw new Error(response.error || 'Failed to load quizzes');
      return response.data as Quiz[];
    },
  });

  const { data: quizDetail } = useQuery({
    queryKey: ['/api/quizzes', selectedQuiz?.id],
    queryFn: async () => {
      const response = await api.get(`/api/quizzes/${selectedQuiz!.id}`);
      if (!response.success) throw new Error(response.error || 'Failed to load quiz');
      return response.data as QuizDetail;
    },
    enabled: !!selectedQuiz?.id && quizInProgress,
  });

  const submitMutation = useMutation({
    mutationFn: async ({ quizId, answers }: { quizId: string; answers: Record<string, string> }) => {
      const response = await api.post(`/api/quizzes/${quizId}/attempt`, { answers });
      if (!response.success) throw new Error(response.error || 'Failed to submit quiz');
      return response.data;
    },
    onSuccess: (data) => {
      setQuizResult(data);
      setQuizInProgress(false);
      queryClient.invalidateQueries({ queryKey: ['/api/quizzes'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to submit quiz');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'hard': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const startQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setQuizInProgress(true);
    setCurrentQuestion(0);
    setAnswers({});
    setQuizResult(null);
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNext = () => {
    const questions = quizDetail?.questions || [];
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    if (!selectedQuiz) return;
    const questions = quizDetail?.questions || [];
    if (Object.keys(answers).length < questions.length) {
      Alert.alert('Incomplete', 'Please answer all questions before submitting.');
      return;
    }
    Alert.alert('Submit Quiz', 'Are you sure you want to submit your answers?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Submit', onPress: () => submitMutation.mutate({ quizId: selectedQuiz.id, answers }) },
    ]);
  };

  const closeQuiz = () => {
    setSelectedQuiz(null);
    setQuizInProgress(false);
    setQuizResult(null);
    setAnswers({});
    setCurrentQuestion(0);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
        <Text variant="body" style={{ marginTop: 12, color: '#6B7280' }}>Loading quizzes...</Text>
      </View>
    );
  }

  if (error) {
    return <ErrorState message="Could not load quizzes" onRetry={() => refetch()} />;
  }

  const questions = quizDetail?.questions || [];
  const currentQ = questions[currentQuestion];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A86B" />}
      >
        <View style={styles.header}>
          <Ionicons name="school" size={28} color="#8B5CF6" />
          <View>
            <Text variant="h2" style={styles.headerTitle}>Political Literacy</Text>
            <Text variant="caption" style={styles.headerSub}>Test your knowledge and earn points</Text>
          </View>
        </View>

        {quizzes && quizzes.length > 0 ? (
          quizzes.map((quiz) => (
            <Card key={quiz.id} style={styles.quizCard}>
              <View style={styles.quizHeader}>
                <View style={{ flex: 1 }}>
                  <Text variant="h3" style={styles.quizTitle}>{quiz.title}</Text>
                  {quiz.description && (
                    <Text variant="body" style={styles.quizDesc} numberOfLines={2}>{quiz.description}</Text>
                  )}
                </View>
                <View style={[styles.difficultyBadge, { backgroundColor: `${getDifficultyColor(quiz.difficulty)}20` }]}>
                  <Text variant="caption" style={[styles.difficultyText, { color: getDifficultyColor(quiz.difficulty) }]}>
                    {quiz.difficulty}
                  </Text>
                </View>
              </View>
              <View style={styles.quizMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="help-circle-outline" size={16} color="#6B7280" />
                  <Text variant="caption" style={styles.metaText}>{quiz.questionsCount} questions</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="trophy-outline" size={16} color="#6B7280" />
                  <Text variant="caption" style={styles.metaText}>{quiz.pointsReward} pts</Text>
                </View>
                {quiz.timeLimit && (
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={16} color="#6B7280" />
                    <Text variant="caption" style={styles.metaText}>{quiz.timeLimit}min</Text>
                  </View>
                )}
              </View>
              {quiz.bestScore !== undefined && quiz.bestScore !== null && (
                <View style={styles.bestScore}>
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text variant="caption" style={styles.bestScoreText}>Best: {quiz.bestScore}%</Text>
                </View>
              )}
              <Button
                title={quiz.userAttempts && quiz.userAttempts > 0 ? "Retake Quiz" : "Start Quiz"}
                onPress={() => startQuiz(quiz)}
                style={{ marginTop: 12 }}
              />
            </Card>
          ))
        ) : (
          <EmptyState icon="school-outline" title="No quizzes available" subtitle="Check back later for new quizzes" />
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={quizInProgress && !!selectedQuiz} animationType="slide" onRequestClose={closeQuiz}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text variant="h3" numberOfLines={1} style={{ flex: 1 }}>{selectedQuiz?.title}</Text>
            <TouchableOpacity onPress={closeQuiz}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {currentQ ? (
            <View style={styles.questionContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${((currentQuestion + 1) / questions.length) * 100}%` }]} />
              </View>
              <Text variant="caption" style={styles.questionCount}>
                Question {currentQuestion + 1} of {questions.length}
              </Text>
              <Text variant="h3" style={styles.questionText}>{currentQ.text}</Text>
              <View style={styles.optionsList}>
                {currentQ.options.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.optionItem, answers[currentQ.id] === option && styles.optionItemSelected]}
                    onPress={() => handleAnswer(currentQ.id, option)}
                  >
                    <View style={[styles.optionCircle, answers[currentQ.id] === option && styles.optionCircleSelected]}>
                      {answers[currentQ.id] === option && <View style={styles.optionDot} />}
                    </View>
                    <Text variant="body" style={[styles.optionText, answers[currentQ.id] === option && styles.optionTextSelected]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.navButtons}>
                <Button title="Previous" onPress={handlePrev} variant="outline" disabled={currentQuestion === 0} style={{ flex: 1 }} />
                {currentQuestion < questions.length - 1 ? (
                  <Button title="Next" onPress={handleNext} style={{ flex: 1 }} />
                ) : (
                  <Button title="Submit" onPress={handleSubmit} loading={submitMutation.isPending} style={{ flex: 1 }} />
                )}
              </View>
            </View>
          ) : (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#00A86B" />
              <Text variant="body" style={{ marginTop: 12, color: '#6B7280' }}>Loading questions...</Text>
            </View>
          )}
        </View>
      </Modal>

      <Modal visible={!!quizResult} animationType="fade" transparent>
        <View style={styles.resultOverlay}>
          <Card style={styles.resultCard}>
            <Ionicons
              name={quizResult?.score >= 70 ? 'trophy' : quizResult?.score >= 40 ? 'ribbon' : 'sad'}
              size={56}
              color={quizResult?.score >= 70 ? '#F59E0B' : quizResult?.score >= 40 ? '#3B82F6' : '#6B7280'}
            />
            <Text variant="h2" style={styles.resultTitle}>
              {quizResult?.score >= 70 ? 'Excellent!' : quizResult?.score >= 40 ? 'Good Effort!' : 'Keep Learning!'}
            </Text>
            <Text variant="h1" style={styles.resultScore}>{quizResult?.score || 0}%</Text>
            <Text variant="body" style={styles.resultSub}>
              {quizResult?.correctAnswers || 0} out of {quizResult?.totalQuestions || 0} correct
            </Text>
            {quizResult?.pointsEarned > 0 && (
              <View style={styles.pointsEarned}>
                <Ionicons name="star" size={20} color="#F59E0B" />
                <Text variant="body" style={styles.pointsEarnedText}>+{quizResult.pointsEarned} points earned!</Text>
              </View>
            )}
            <Button title="Done" onPress={closeQuiz} style={{ marginTop: 20, width: '100%' }} />
          </Card>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  headerTitle: { color: '#111827' },
  headerSub: { color: '#6B7280', marginTop: 2 },
  quizCard: { marginBottom: 16 },
  quizHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  quizTitle: { color: '#111827', marginBottom: 4 },
  quizDesc: { color: '#6B7280', lineHeight: 20 },
  difficultyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  difficultyText: { fontWeight: '600', fontSize: 11, textTransform: 'capitalize' },
  quizMeta: { flexDirection: 'row', gap: 16, marginTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: '#6B7280' },
  bestScore: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  bestScoreText: { color: '#92400E', fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  questionContainer: { flex: 1, padding: 20 },
  progressBar: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginBottom: 16, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#00A86B', borderRadius: 3 },
  questionCount: { color: '#6B7280', marginBottom: 16, fontWeight: '600' },
  questionText: { color: '#111827', marginBottom: 24, lineHeight: 28 },
  optionsList: { gap: 12, marginBottom: 24 },
  optionItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, borderWidth: 2, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  optionItemSelected: { borderColor: '#00A86B', backgroundColor: '#F0FDF4' },
  optionCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  optionCircleSelected: { borderColor: '#00A86B' },
  optionDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#00A86B' },
  optionText: { flex: 1, color: '#374151', fontSize: 15 },
  optionTextSelected: { color: '#00A86B', fontWeight: '600' },
  navButtons: { flexDirection: 'row', gap: 12, marginTop: 'auto' },
  resultOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  resultCard: { alignItems: 'center', padding: 32, width: '100%' },
  resultTitle: { marginTop: 16, color: '#111827' },
  resultScore: { fontSize: 48, fontWeight: '700', color: '#00A86B', marginVertical: 8 },
  resultSub: { color: '#6B7280' },
  pointsEarned: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: '#FEF3C7', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  pointsEarnedText: { color: '#92400E', fontWeight: '600' },
});
