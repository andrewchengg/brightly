import React, { useState, useCallback, useRef, useEffect } from "react";
import { FaCommentDots, FaLightbulb, FaPaperPlane } from "react-icons/fa";

interface QuestionContext {
  id: number;
  questionNumberOnPage?: string;
  options: { id: string; text: string }[];
  correctAnswer: string | string[] | Record<string, string> | null;
  explanation?: string | null;
  userAnswer?: string;
  isCorrect?: boolean;
}

interface AITutorProps {
  passageTitle: string;
  passageContent: string | null;
  questions: QuestionContext[];
  answeredQuestions: Record<number, string | Record<string, string>>;
  questionResults: { id: number; correct: boolean }[];
  sessionFinalized: boolean;
  isDisabled?: boolean;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const AITutor: React.FC<AITutorProps> = ({
  passageTitle,
  passageContent,
  questions,
  answeredQuestions,
  questionResults,
  sessionFinalized,
  isDisabled = false,
}) => {
  const [userMessage, setUserMessage] = useState("");
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const aiContentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (aiContentRef.current) {
      setTimeout(() => {
        if (aiContentRef.current) {
          aiContentRef.current.scrollTop = aiContentRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [chatHistory, isLoadingAI]);

  const buildRichContext = useCallback(() => {
    if (!passageContent) return "";

    // Build comprehensive context for the AI
    let context = `CLOZE PASSAGE CONTEXT:\n`;
    context += `Title: "${passageTitle}"\n`;
    context += `Full Passage: "${passageContent}"\n\n`;

    context += `QUESTIONS AND OPTIONS:\n`;
    questions.forEach((q) => {
      const userAnswer = answeredQuestions[q.id] as string | undefined;
      const result = questionResults.find((r) => r.id === q.id);

      context += `${q.questionNumberOnPage || `Q${q.id}`}:\n`;
      context += `  Options:\n`;
      q.options.forEach((opt) => {
        const isCorrect = opt.id === String(q.correctAnswer);
        const isUserChoice = opt.id === userAnswer;
        let marker = "    ";
        if (isCorrect) marker += "✓ ";
        if (isUserChoice) marker += "→ ";
        context += `${marker}${opt.id}: ${opt.text}\n`;
      });

      if (sessionFinalized && result) {
        context += `  Result: ${result.correct ? "CORRECT" : "INCORRECT"}\n`;
        if (q.explanation) {
          context += `  Explanation: ${q.explanation}\n`;
        }
      }
      context += `\n`;
    });

    if (sessionFinalized) {
      const correctCount = questionResults.filter((r) => r.correct).length;
      context += `SESSION STATUS: COMPLETED (${correctCount}/${questions.length} correct)\n`;
    } else {
      const answeredCount = Object.keys(answeredQuestions).length;
      context += `SESSION STATUS: IN PROGRESS (${answeredCount}/${questions.length} answered)\n`;
    }

    return context;
  }, [
    passageContent,
    passageTitle,
    questions,
    answeredQuestions,
    questionResults,
    sessionFinalized,
  ]);

  const handleSendMessage = useCallback(async () => {
    if (!userMessage.trim() || isLoadingAI) return;

    const currentUserMessage = userMessage.trim();
    setUserMessage("");
    setIsLoadingAI(true);

    const currentChatHistory = [
      ...chatHistory,
      { role: "user", content: currentUserMessage } as ChatMessage,
    ];
    setChatHistory(currentChatHistory);

    try {
      const richContext = buildRichContext();

      const systemPrompt = `You are an AI tutor specializing in Chinese language cloze passages for Primary School students. You have access to comprehensive information about the current passage and questions.

GUIDELINES:
1. Be encouraging and educational
2. Help students understand WHY answers are correct, not just WHAT the answers are
3. For specific questions (e.g., "What about Q1?"), provide targeted explanations
4. For general questions, discuss themes, vocabulary, or comprehension strategies
5. If asked directly for answers before submission, guide them to think through the logic
6. After submission, you can be more direct about correct answers and explanations
7. Use simple language appropriate for primary school students
8. Relate answers to Chinese language learning concepts when relevant

CONTEXT:
${richContext}

Respond helpfully to the student's question while following the guidelines above.`;

      const response = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            ...currentChatHistory,
          ],
        }),
      });

      if (!response.ok) throw new Error("AI tutor request failed");

      const data = await response.json();
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
    } catch (error) {
      console.error("AI Tutor Error:", error);
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoadingAI(false);
    }
  }, [userMessage, chatHistory, buildRichContext, isLoadingAI]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="bg-indigo-50 flex flex-col overflow-hidden custom-scrollbar h-full">
      {/* Header */}
      <div className="p-3 border-b border-indigo-200 bg-indigo-100 flex items-center shadow-sm">
        <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white mr-2.5 text-md font-bold">
          <FaCommentDots />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-indigo-800 text-sm">
            AI Learning Assistant
          </div>
          <div className="text-xs text-indigo-600">Ask about this passage!</div>
        </div>
        <div className="text-xs text-indigo-600 flex items-center">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1 border border-indigo-100 shadow-sm"></span>
          Online
        </div>
      </div>

      {/* Chat Content */}
      <div
        ref={aiContentRef}
        className="flex-1 overflow-y-auto p-3 space-y-3 bg-indigo-25 custom-scrollbar"
      >
        {chatHistory.length > 0 ? (
          chatHistory.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-xl p-2.5 shadow-sm text-sm ${
                  message.role === "user"
                    ? "ml-auto bg-indigo-500 text-white rounded-br-none"
                    : "mr-auto bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-6">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-3 text-3xl text-indigo-500">
              <FaLightbulb />
            </div>
            <p className="text-sm mb-2">Ask me anything about this passage!</p>
            <p className="text-xs text-gray-400">
              Try: &ldquo;What does Q1 mean?&rdquo; or &ldquo;Explain the
              story&rdquo;
            </p>
          </div>
        )}

        {/* Loading indicator */}
        {isLoadingAI && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-xl p-2.5 shadow-sm text-sm mr-auto bg-white text-gray-800 border border-gray-200 rounded-bl-none">
              <div className="flex space-x-1 items-center">
                <div
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-2.5 border-t border-indigo-200 bg-indigo-100">
        <div className="flex items-center rounded-full border border-gray-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 bg-white shadow-sm">
          <input
            type="text"
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the passage..."
            className="flex-1 py-2 px-3.5 text-sm border-none outline-none bg-transparent rounded-l-full"
            disabled={isLoadingAI || isDisabled}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoadingAI || !userMessage.trim() || isDisabled}
            className={`w-8 h-8 m-0.5 rounded-full flex items-center justify-center transition-colors ${
              userMessage.trim() && !isLoadingAI && !isDisabled
                ? "bg-indigo-500 hover:bg-indigo-600 text-white"
                : "bg-gray-300 text-gray-400 cursor-not-allowed"
            }`}
          >
            <FaPaperPlane className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AITutor;
