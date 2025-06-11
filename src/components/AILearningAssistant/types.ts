// src/components/AILearningAssistant/types.ts
// Types for the AI Learning Assistant system

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

export interface QuestionContext {
  id: string | number;
  text: string;
  questionType: string;
  options?: Array<{ id: string; text: string }>;
  correctAnswer?: string | object;
  explanation?: string;
  hint?: string;
  userAnswer?: string | object;
  isCorrect?: boolean;
  pointsAwarded?: number;
}

export interface PassageContext {
  title?: string;
  content: string;
  subject?: string;
  topic?: string;
}

export interface SessionContext {
  sessionId?: string;
  sessionType:
    | "random_practice"
    | "topic_practice"
    | "cloze_passage"
    | "question_group"
    | "mock_exam"
    | "weekly_challenge";
  isCompleted: boolean;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  studentLevel?: string;
}

export interface AIAssistantProps {
  questionContext?: QuestionContext;
  passageContext?: PassageContext;
  sessionContext: SessionContext;
  className?: string;
  disabled?: boolean;
  onMessageSent?: (message: string) => void;
  onResponseReceived?: (response: string) => void;
}

export interface AITutorRequest {
  messages: ChatMessage[];
  context: {
    question?: QuestionContext;
    passage?: PassageContext;
    session: SessionContext;
    selectedText?: string;
  };
  studentId?: string;
}

export interface AITutorResponse {
  message: string;
  flagged?: boolean;
  warning?: string;
  error?: string;
}

export interface ContentModerationResult {
  isAllowed: boolean;
  reason?: string;
  sanitizedContent?: string;
}

export interface AIAssistantRef {
  addTextToInput: (text: string) => void;
}