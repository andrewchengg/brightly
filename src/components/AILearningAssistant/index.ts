// Main AI Learning Assistant exports
export { default as AIAssistant } from "./AIAssistant";
export * from "./types";

// Helper function to create session context for different practice types
import { SessionContext } from "./types";

export function createSessionContext(
  sessionType: SessionContext["sessionType"],
  totalQuestions: number,
  answeredQuestions: number,
  correctAnswers: number,
  isCompleted: boolean,
  sessionId?: string,
  studentLevel?: string
): SessionContext {
  return {
    sessionId,
    sessionType,
    isCompleted,
    totalQuestions,
    answeredQuestions,
    correctAnswers,
    studentLevel,
  };
}

// Helper function to create question context
import { QuestionContext } from "./types";

export function createQuestionContext(
  id: string | number,
  text: string,
  questionType: string,
  options?: Array<{ id: string; text: string }>,
  correctAnswer?: string | object,
  explanation?: string,
  hint?: string,
  userAnswer?: string | object,
  isCorrect?: boolean
): QuestionContext {
  return {
    id,
    text,
    questionType,
    options,
    correctAnswer,
    explanation,
    hint,
    userAnswer,
    isCorrect,
  };
}

// Helper function to create passage context
import { PassageContext } from "./types";

export function createPassageContext(
  content: string,
  title?: string,
  subject?: string,
  topic?: string
): PassageContext {
  return {
    title,
    content,
    subject,
    topic,
  };
}
