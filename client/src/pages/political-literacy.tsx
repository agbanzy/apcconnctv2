import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { QuizCard } from "@/components/quiz-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Trophy, Award } from "lucide-react";
import type { Quiz } from "@shared/schema";

export default function PoliticalLiteracy() {
  const { member } = useAuth();
  const { toast } = useToast();
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const { data: quizzesData, isLoading } = useQuery<{ success: boolean; data: Quiz[] }>({
    queryKey: ["/api/quizzes"],
  });

  const attemptMutation = useMutation({
    mutationFn: async ({ quizId, answer }: { quizId: string; answer: number }) => {
      const res = await apiRequest("POST", `/api/quizzes/${quizId}/attempt`, {
        selectedAnswer: answer,
      });
      return res.json();
    },
    onSuccess: (data) => {
      const { isCorrect, pointsEarned } = data.data;
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/my-stats"] });
      
      toast({
        title: isCorrect ? "Correct Answer! 🎉" : "Incorrect Answer",
        description: isCorrect
          ? `You earned ${pointsEarned} points!`
          : "Keep learning! Try another quiz.",
        variant: isCorrect ? "default" : "destructive",
      });
      
      setSelectedQuiz(null);
      setSelectedAnswer(null);
    },
    onError: () => {
      toast({
        title: "Submission failed",
        description: "Failed to submit quiz attempt. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (selectedQuiz && selectedAnswer !== null) {
      attemptMutation.mutate({
        quizId: selectedQuiz.id,
        answer: selectedAnswer,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const quizzes = quizzesData?.data || [];

  if (selectedQuiz) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => {
            setSelectedQuiz(null);
            setSelectedAnswer(null);
          }}
          data-testid="button-back"
        >
          ← Back to Quizzes
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              {selectedQuiz.category}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4" data-testid="text-question">
                {selectedQuiz.question}
              </h3>
              <RadioGroup value={selectedAnswer?.toString()} onValueChange={(val) => setSelectedAnswer(parseInt(val))}>
                <div className="space-y-3">
                  {selectedQuiz.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem value={index.toString()} id={`option-${index}`} data-testid={`radio-option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Award className="h-4 w-4" />
                <span>{selectedQuiz.points} points</span>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={selectedAnswer === null || attemptMutation.isPending}
                data-testid="button-submit-quiz"
              >
                {attemptMutation.isPending ? "Submitting..." : "Submit Answer"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-page-title">Political Literacy Hub</h1>
        <p className="text-muted-foreground">
          Test your knowledge of Nigerian politics and governance to earn points
        </p>
      </div>

      {quizzes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No quizzes available at the moment.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              question={quiz.question}
              category={quiz.category}
              points={quiz.points}
              onStart={() => setSelectedQuiz(quiz)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
