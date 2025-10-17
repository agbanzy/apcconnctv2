import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle2, XCircle } from "lucide-react";

interface QuizCardProps {
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
  points: number;
}

export function QuizCard({ question, options, correctAnswer, category, points }: QuizCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleSubmit = () => {
    const correct = selectedAnswer === options[correctAnswer];
    setIsCorrect(correct);
    setShowResult(true);
    console.log(`Quiz submitted: ${correct ? 'Correct' : 'Incorrect'}`);
  };

  return (
    <Card data-testid="card-quiz">
      <CardHeader className="gap-2 space-y-0">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" data-testid="badge-quiz-category">
            <BookOpen className="h-3 w-3 mr-1" />
            {category}
          </Badge>
          <div className="flex items-center gap-1 text-primary">
            <span className="font-mono font-semibold" data-testid="text-quiz-points">{points} pts</span>
          </div>
        </div>
        <CardTitle className="mt-2" data-testid="text-quiz-question">{question}</CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
          <div className="space-y-3">
            {options.map((option, idx) => (
              <div
                key={idx}
                className={`flex items-center space-x-2 rounded-md p-3 border ${
                  showResult
                    ? idx === correctAnswer
                      ? "border-chart-1 bg-chart-1/10"
                      : selectedAnswer === option && !isCorrect
                      ? "border-destructive bg-destructive/10"
                      : "border-border"
                    : "border-border hover-elevate"
                }`}
                data-testid={`option-${idx}`}
              >
                <RadioGroupItem value={option} id={`option-${idx}`} disabled={showResult} />
                <Label
                  htmlFor={`option-${idx}`}
                  className="flex-1 cursor-pointer"
                >
                  {option}
                </Label>
                {showResult && idx === correctAnswer && (
                  <CheckCircle2 className="h-5 w-5 text-chart-1" />
                )}
                {showResult && selectedAnswer === option && !isCorrect && (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
              </div>
            ))}
          </div>
        </RadioGroup>
      </CardContent>
      <CardFooter>
        {!showResult ? (
          <Button
            className="w-full"
            disabled={!selectedAnswer}
            onClick={handleSubmit}
            data-testid="button-submit-quiz"
          >
            Submit Answer
          </Button>
        ) : (
          <div className="w-full space-y-2">
            <div
              className={`p-3 rounded-md text-center font-semibold ${
                isCorrect
                  ? "bg-chart-1/20 text-chart-1"
                  : "bg-destructive/20 text-destructive"
              }`}
              data-testid="text-quiz-result"
            >
              {isCorrect ? "Correct! You earned" : "Incorrect. Try again!"} {isCorrect && `${points} points`}
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSelectedAnswer("");
                setShowResult(false);
              }}
              data-testid="button-retry-quiz"
            >
              Try Again
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
