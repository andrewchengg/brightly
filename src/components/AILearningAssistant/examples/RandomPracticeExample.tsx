/**
 * Example: How to integrate the new AI Learning Assistant into Random Practice
 *
 * This example shows how to replace the old AI assistant implementation
 * with the new modular, secure version.
 */

"use client";

import React, { useMemo } from "react";
import {
  AIAssistant,
  createSessionContext,
  createQuestionContext,
  QuestionContext,
  SessionContext,
} from "@/components/AILearningAssistant";

// Example question type (should match your existing interface)
interface QuestionClient {
  id: number;
  text: string;
  options: Array<{ id: string; text: string }>;
  correctAnswer: string | string[] | Record<string, string> | null;
  hint?: string;
  explanation?: string | null;
  questionType?: string;
  pointsAwarded?: number;
}

interface RandomPracticeAIProps {
  currentQuestion: QuestionClient | null;
  selectedAnswer: string | null;
  isAnswerCorrect: boolean;
  questions: QuestionClient[];
  currentQuestionIndex: number;
  score: number;
  sessionFinalized: boolean;
  practiceSessionId?: string | null;
  className?: string;
}

const RandomPracticeAI: React.FC<RandomPracticeAIProps> = ({
  currentQuestion,
  selectedAnswer,
  isAnswerCorrect,
  questions,
  currentQuestionIndex,
  score,
  sessionFinalized,
  practiceSessionId,
  className = "",
}) => {
  // Create question context for the AI
  const questionContext: QuestionContext | undefined = useMemo(() => {
    if (!currentQuestion) return undefined;

    return createQuestionContext(
      currentQuestion.id,
      currentQuestion.text,
      currentQuestion.questionType || "MULTIPLE_CHOICE",
      currentQuestion.options,
      currentQuestion.correctAnswer || undefined,
      currentQuestion.explanation || undefined,
      currentQuestion.hint,
      selectedAnswer || undefined,
      selectedAnswer !== null ? isAnswerCorrect : undefined
    );
  }, [currentQuestion, selectedAnswer, isAnswerCorrect]);

  // Create session context for the AI
  const sessionContext: SessionContext = useMemo(() => {
    return createSessionContext(
      "random_practice",
      questions.length,
      currentQuestionIndex + (selectedAnswer ? 1 : 0),
      score / 10, // Assuming 10 points per correct answer
      sessionFinalized,
      practiceSessionId || undefined,
      "Primary School" // You could get this from user profile
    );
  }, [
    questions.length,
    currentQuestionIndex,
    selectedAnswer,
    score,
    sessionFinalized,
    practiceSessionId,
  ]);

  // Handle AI message events (optional)
  const handleMessageSent = (message: string) => {
    console.log("Student asked:", message);
  };

  const handleResponseReceived = (response: string) => {
    console.log("AI responded:", response);
  };

  return (
    <div className={`h-full ${className}`}>
      <AIAssistant
        questionContext={questionContext}
        sessionContext={sessionContext}
        disabled={false}
        onMessageSent={handleMessageSent}
        onResponseReceived={handleResponseReceived}
      />
    </div>
  );
};

export default RandomPracticeAI;

/*
INTEGRATION GUIDE:
================

1. REPLACE the old AI assistant section in your practice page with:
   Import: import RandomPracticeAI from '@/components/AILearningAssistant/examples/RandomPracticeExample';
   Usage: <RandomPracticeAI currentQuestion={currentQuestion} selectedAnswer={selectedAnswer} ... />

2. REMOVE the old AI-related state and functions:
   - Remove: chatHistory, setChatHistory, userMessage, setUserMessage
   - Remove: isLoadingAI, setIsLoadingAI, aiMessage, setAiMessage
   - Remove: handleSendMessage function, handleKeyDown function for AI, aiContentRef

3. BENEFITS of the new system:
   - Built-in content moderation and security
   - Rate limiting to prevent abuse
   - Better educational prompts
   - Consistent UI across all practice types
   - Type safety and better error handling
   - Reusable across different practice sessions

4. SECURITY FEATURES:
   - SQL injection prevention
   - Inappropriate content filtering
   - Educational focus enforcement
   - Rate limiting (50 requests/hour per user)
   - User authentication required
   - Input sanitization and output moderation
*/
