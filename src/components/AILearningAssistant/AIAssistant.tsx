// src/components/AILearningAssistant/AIAssistant.tsx
"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  FaCommentDots,
  FaPaperPlane,
  FaLightbulb,
  FaExclamationTriangle,
  FaChalkboard,
  FaPen,
  FaEraser,
  FaRuler,
  FaTrash,
  FaUndo,
  FaRedo,
  FaDownload,
  FaMinus,
  FaPlus,
} from "react-icons/fa";
import Image from "next/image";
import {
  ChatMessage,
  AIAssistantProps,
  AITutorRequest,
  AIAssistantRef,
} from "./types";
import { moderateUserContent } from "@/lib/ai-moderation";
import { toast } from "react-toastify";

// Lazy load Konva components
let Stage: any = null;
let Layer: any = null;
let Line: any = null;
let Rect: any = null;
let Konva: any = null;

interface DrawingLine {
  id: string;
  tool: "pen" | "eraser";
  points: number[];
  stroke: string;
  strokeWidth: number;
  globalCompositeOperation?: "source-over" | "destination-out";
}

interface StraightLine {
  id: string;
  points: number[];
  stroke: string;
  strokeWidth: number;
}

type Mode = "chat" | "whiteboard";

const AIAssistant = forwardRef<AIAssistantRef, AIAssistantProps>(
  (
    {
      questionContext,
      passageContext,
      sessionContext,
      className = "",
      disabled = false,
      onMessageSent,
      onResponseReceived,
    },
    ref
  ) => {
    const [mode, setMode] = useState<Mode>("chat");
    const [userMessage, setUserMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedContext, setSelectedContext] = useState<string | null>(null);

    // Whiteboard states
    const stageRef = useRef<any>(null);
    const [tool, setTool] = useState<"pen" | "eraser" | "line">("pen");
    const [lines, setLines] = useState<DrawingLine[]>([]);
    const [straightLines, setStraightLines] = useState<StraightLine[]>([]);
    const [history, setHistory] = useState<
      { lines: DrawingLine[]; straightLines: StraightLine[] }[]
    >([]);
    const [historyStep, setHistoryStep] = useState(-1);
    const [isDrawing, setIsDrawing] = useState(false);
    const [penSize, setPenSize] = useState(3);
    const [eraserSize, setEraserSize] = useState(10);
    const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(
      null
    );
    const [tempLine, setTempLine] = useState<StraightLine | null>(null);
    const [konvaLoaded, setKonvaLoaded] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const stageWidth = 280;
    const stageHeight = 350;

    // Load Konva components when component mounts
    useEffect(() => {
      if (typeof window !== "undefined") {
        // Load Konva components
        Promise.all([import("react-konva"), import("konva")])
          .then(([reactKonva, konvaModule]) => {
            Stage = reactKonva.Stage;
            Layer = reactKonva.Layer;
            Line = reactKonva.Line;
            Rect = reactKonva.Rect;
            Konva = konvaModule.default;
            setKonvaLoaded(true);
          })
          .catch((error) => {
            console.error("Failed to load Konva:", error);
            setLoadError(
              "Failed to load drawing components. Please refresh the page."
            );
          });
      }
    }, []);

    // Whiteboard functionality
    const saveToHistory = useCallback(() => {
      const newHistory = history.slice(0, historyStep + 1);
      newHistory.push({ lines: [...lines], straightLines: [...straightLines] });
      setHistory(newHistory);
      setHistoryStep(newHistory.length - 1);
    }, [lines, straightLines, history, historyStep]);

    const handleMouseDown = useCallback(
      (e: any) => {
        if (mode !== "whiteboard" || !konvaLoaded) return;

        const pos = e.target.getStage().getPointerPosition();
        setIsDrawing(true);

        if (tool === "line") {
          if (!lineStart) {
            setLineStart({ x: pos.x, y: pos.y });
          } else {
            const newLine: StraightLine = {
              id: Date.now().toString(),
              points: [lineStart.x, lineStart.y, pos.x, pos.y],
              stroke: "#000000",
              strokeWidth: penSize,
            };
            setStraightLines((prev) => [...prev, newLine]);
            setLineStart(null);
            setTempLine(null);
            saveToHistory();
          }
        } else {
          const newLine: DrawingLine = {
            id: Date.now().toString(),
            tool,
            points: [pos.x, pos.y],
            stroke: tool === "pen" ? "#000000" : "#FFFFFF",
            strokeWidth: tool === "pen" ? penSize : eraserSize,
            globalCompositeOperation:
              tool === "eraser" ? "destination-out" : "source-over",
          };
          setLines((prev) => [...prev, newLine]);
        }
      },
      [tool, penSize, eraserSize, lineStart, mode, saveToHistory, konvaLoaded]
    );

    const handleMouseMove = useCallback(
      (e: any) => {
        if (!isDrawing || mode !== "whiteboard" || !konvaLoaded) return;

        const stage = e.target.getStage();
        const point = stage.getPointerPosition();

        if (tool === "line" && lineStart) {
          setTempLine({
            id: "temp",
            points: [lineStart.x, lineStart.y, point.x, point.y],
            stroke: "#000000",
            strokeWidth: penSize,
          });
        } else if (tool !== "line") {
          setLines((prev) => {
            const newLines = [...prev];
            const lastLine = newLines[newLines.length - 1];
            if (lastLine) {
              lastLine.points = lastLine.points.concat([point.x, point.y]);
            }
            return newLines;
          });
        }
      },
      [isDrawing, tool, lineStart, penSize, mode, konvaLoaded]
    );

    const handleMouseUp = useCallback(() => {
      if (tool !== "line") {
        setIsDrawing(false);
        saveToHistory();
      }
    }, [tool, saveToHistory]);

    const clearCanvas = useCallback(() => {
      setLines([]);
      setStraightLines([]);
      setLineStart(null);
      setTempLine(null);
      saveToHistory();
    }, [saveToHistory]);

    const undo = useCallback(() => {
      if (historyStep > 0) {
        const prevStep = historyStep - 1;
        const prevState = history[prevStep];
        setLines(prevState.lines);
        setStraightLines(prevState.straightLines);
        setHistoryStep(prevStep);
      }
    }, [history, historyStep]);

    const redo = useCallback(() => {
      if (historyStep < history.length - 1) {
        const nextStep = historyStep + 1;
        const nextState = history[nextStep];
        setLines(nextState.lines);
        setStraightLines(nextState.straightLines);
        setHistoryStep(nextStep);
      }
    }, [history, historyStep]);

    const saveCanvas = useCallback(() => {
      if (stageRef.current && konvaLoaded) {
        const dataURL = stageRef.current.toDataURL({
          mimeType: "image/png",
          quality: 1,
          pixelRatio: 2,
        });

        const link = document.createElement("a");
        link.download = `whiteboard-${Date.now()}.png`;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Whiteboard saved!");
      }
    }, [konvaLoaded]);

    // Function to split text into larger chunks for smooth display (roughly twice the size)
    const splitIntoSentences = (text: string): string[] => {
      // First, split by double line breaks (paragraph breaks)
      const paragraphs = text
        .split(/\n\s*\n/)
        .filter((chunk) => chunk.trim().length > 0);

      const chunks: string[] = [];

      paragraphs.forEach((paragraph) => {
        const trimmed = paragraph.trim();

        // If paragraph contains numbered lists or bullet points, keep it as one chunk
        if (/^\d+\.|\n\d+\.|-\s+/.test(trimmed)) {
          chunks.push(trimmed);
        }
        // If paragraph is short (less than 300 chars), keep it as one chunk
        else if (trimmed.length < 300) {
          chunks.push(trimmed);
        }
        // Otherwise, split by sentence endings and combine 2-3 sentences per chunk
        else {
          const sentences = trimmed
            .split(/(?<=[.!?])\s+(?=[A-Z])/)
            .filter((sentence) => sentence.trim().length > 0);

          // Group sentences into larger chunks (2-3 sentences each)
          for (let i = 0; i < sentences.length; i += 2) {
            const chunk = sentences.slice(i, i + 2).join(" ");
            chunks.push(chunk);
          }
        }
      });

      return chunks.filter((chunk) => chunk.trim().length > 0);
    };

    const chatContentRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Expose a function to parent components to add text to the input
    useImperativeHandle(ref, () => ({
      addTextToInput: (text: string) => {
        setSelectedContext(text);
        // Focus the textarea after adding context
        textareaRef.current?.focus();
      },
    }));

    // Auto-scroll to bottom when new messages arrive - DISABLED for free scrolling
    // useEffect(() => {
    //   if (chatContentRef.current) {
    //     setTimeout(() => {
    //       if (chatContentRef.current) {
    //         chatContentRef.current.scrollTop =
    //           chatContentRef.current.scrollHeight;
    //       }
    //     }, 100);
    //   }
    // }, [chatHistory, isLoading]);

    // Handle paste events with length validation
    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const pastedText = e.clipboardData.getData("text");
      const currentText = userMessage;
      const newText = currentText + pastedText;

      if (newText.length > 1000) {
        e.preventDefault();
        toast.error(
          "Your message is too long! Please keep it under 1000 characters."
        );
        return;
      }
    };

    // Handle input change with length validation
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (value.length <= 1000) {
        setUserMessage(value);
      } else {
        toast.error(
          "Your message is too long! Please keep it under 1000 characters."
        );
      }
    };

    // Build context for the AI based on current session
    const buildContextString = useCallback(() => {
      let context = "";

      if (passageContext) {
        context += `PASSAGE: "${passageContext.title || "Untitled"}"\n`;
        context += `Content: ${passageContext.content.substring(0, 500)}${
          passageContext.content.length > 500 ? "..." : ""
        }\n\n`;
      }

      if (questionContext) {
        context += `CURRENT QUESTION:\n`;
        context += `Q: ${questionContext.text}\n`;

        if (questionContext.options && questionContext.options.length > 0) {
          context += `Options:\n`;
          questionContext.options.forEach((opt, index) => {
            const letter = String.fromCharCode(65 + index);
            const marker = questionContext.userAnswer === opt.id ? "→ " : "";
            context += `  ${marker}${letter}. ${opt.text}\n`;
          });
        }

        // Always include the correct answer if available
        if (questionContext.correctAnswer) {
          context += `Correct Answer: ${JSON.stringify(
            questionContext.correctAnswer
          )}\n`;
        }

        // Always include the official explanation if available
        if (questionContext.explanation) {
          context += `Official Explanation: ${questionContext.explanation}\n`;
          context += `IMPORTANT: When explaining this question, use the Official Explanation above as your primary source. Present it in a student-friendly way but maintain its accuracy.\n`;
        }

        if (questionContext.hint) {
          context += `Hint: ${questionContext.hint}\n`;
        }

        if (questionContext.isCorrect !== undefined) {
          context += `Student's Result: ${
            questionContext.isCorrect ? "CORRECT" : "INCORRECT"
          }\n`;
          if (questionContext.userAnswer) {
            context += `Student's Answer: ${JSON.stringify(
              questionContext.userAnswer
            )}\n`;
          }
        }
        context += "\n";
      }

      context += `SESSION INFO:\n`;
      context += `Type: ${sessionContext.sessionType}\n`;
      context += `Progress: ${sessionContext.answeredQuestions}/${sessionContext.totalQuestions} questions\n`;
      context += `Correct: ${sessionContext.correctAnswers}\n`;
      context += `Status: ${
        sessionContext.isCompleted ? "COMPLETED" : "IN PROGRESS"
      }\n`;

      return context;
    }, [questionContext, passageContext, sessionContext]);

    const handleSendMessage = useCallback(async () => {
      if (!userMessage.trim() || isLoading || disabled) return;

      const currentMessage = userMessage.trim();
      setUserMessage("");
      setError(null);

      // Moderate user input
      const moderation = moderateUserContent(currentMessage);
      if (!moderation.isAllowed) {
        setError(
          moderation.reason ||
            "Your message contains inappropriate content. Please keep questions focused on your learning."
        );
        return;
      }

      const sanitizedMessage = moderation.sanitizedContent || currentMessage;

      // Add user message to chat
      const newUserMessage: ChatMessage = {
        role: "user",
        content: sanitizedMessage,
        timestamp: new Date(),
      };

      const updatedHistory = [...chatHistory, newUserMessage];
      setChatHistory(updatedHistory);
      setIsLoading(true);

      // Notify parent component
      if (onMessageSent) {
        onMessageSent(sanitizedMessage);
      }

      try {
        console.log("AIAssistant: Sending message", {
          message: sanitizedMessage,
        });

        // Create a default session context if none is provided
        const defaultSessionContext = {
          sessionType: "text_highlight",
          totalQuestions: 1,
          answeredQuestions: 0,
          correctAnswers: 0,
          isCompleted: false,
          studentLevel: "Primary School",
        };

        const requestBody: AITutorRequest = {
          messages: updatedHistory,
          context: {
            question: questionContext,
            passage: passageContext,
            session: sessionContext || defaultSessionContext,
            selectedText: selectedContext || undefined,
          },
        };

        console.log("AIAssistant: Sending request to API", {
          requestBody: JSON.stringify(requestBody, null, 2),
        });

        const response = await fetch("/api/ai-tutor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        console.log("AIAssistant: Received API response", {
          status: response.status,
          statusText: response.statusText,
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("AIAssistant: API error", {
            status: response.status,
            error: errorData,
          });
          throw new Error(errorData.error || "Failed to get response from AI");
        }

        const data = await response.json();
        console.log("AIAssistant: API response data", { data });

        // Split the AI response into sentences for separate messages
        const sentences = splitIntoSentences(data.message);

        // Add each sentence as a separate message with delays
        sentences.forEach((sentence, index) => {
          setTimeout(() => {
            const aiMessage: ChatMessage = {
              role: "assistant",
              content: sentence.trim(),
              timestamp: new Date(),
              shouldAnimate: true, // Flag to animate this new message
            };

            setChatHistory((prev) => [...prev, aiMessage]);
          }, index * 1200); // 1200ms delay between each chunk for better readability
        });

        // Notify parent component
        if (onResponseReceived) {
          onResponseReceived(data.message);
        }
      } catch (error: any) {
        console.error("AI Assistant Error:", error);
        const errorMessage = error.message.includes("rate limit")
          ? "You've asked too many questions recently. Please wait a moment before asking again."
          : "I'm having trouble connecting right now. Please try again in a moment.";

        setChatHistory((prev) => [
          ...prev,
          {
            role: "assistant",
            content: errorMessage,
            timestamp: new Date(),
          },
        ]);

        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }, [
      userMessage,
      chatHistory,
      questionContext,
      passageContext,
      sessionContext,
      selectedContext,
      isLoading,
      disabled,
      onMessageSent,
      onResponseReceived,
    ]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    };

    const getWelcomeMessage = () => {
      if (sessionContext.sessionType === "cloze_passage") {
        return "Hi! I'm Ben, your friendly AI tutor! 🐻 I'm here to help you understand this passage and answer questions. Ask me about vocabulary, context clues, or anything you're unsure about!";
      }
      return "Hi there! I'm Ben, your AI learning assistant! 🐻 Ask me questions about the material, and I'll help guide you to the answers!";
    };

    const shouldShowWelcome = chatHistory.length === 0 && !isLoading;

    return (
      <div
        className={`flex flex-col bg-indigo-50 ${className}`}
        style={{ height: "100%" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-indigo-200 bg-indigo-100 shadow-sm">
          <div className="flex items-center">
            <div className="w-10 h-10 flex items-center justify-center mr-2.5">
              <Image
                src="/benthemascot-removebg-preview.png"
                alt="Ben the AI Tutor"
                width={40}
                height={40}
                className="object-contain"
                title="Hi! I'm Ben, your AI tutor!"
              />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-indigo-800 text-sm">
                Bright Ben
              </div>
              <div className="text-xs text-indigo-600">
                {mode === "chat"
                  ? "Ask me about this material!"
                  : "Draw and solve problems!"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Mode Toggle */}
            <div className="flex items-center bg-white rounded-lg p-1 border border-indigo-200">
              <button
                onClick={() => setMode("chat")}
                className={`p-1 rounded text-xs ${
                  mode === "chat"
                    ? "bg-indigo-500 text-white shadow-sm"
                    : "text-indigo-600 hover:bg-indigo-50"
                }`}
                title="Chat with Ben"
              >
                <FaCommentDots size={12} />
              </button>
              <button
                onClick={() => setMode("whiteboard")}
                className={`p-1 rounded text-xs ${
                  mode === "whiteboard"
                    ? "bg-indigo-500 text-white shadow-sm"
                    : "text-indigo-600 hover:bg-indigo-50"
                }`}
                title="Use Whiteboard"
              >
                <FaChalkboard size={12} />
              </button>
            </div>
            <div className="text-xs text-indigo-600 flex items-center">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1 border border-indigo-100 shadow-sm"></span>
              Online
            </div>
          </div>
        </div>

        {/* Pinned Selected Text */}
        {selectedContext && (
          <div className="p-3 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-xs font-medium text-yellow-800 mb-1">
                  Selected Text:
                </div>
                <div className="text-sm font-semibold text-yellow-900 bg-yellow-100 px-2 py-1 rounded">
                  "{selectedContext}"
                </div>
              </div>
              <button
                onClick={() => setSelectedContext(null)}
                className="text-yellow-600 hover:text-yellow-800 ml-2"
                title="Remove selected text"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        {mode === "chat" ? (
          <div
            ref={chatContentRef}
            className="flex-1 overflow-auto p-3 space-y-3 custom-scrollbar"
          >
            {shouldShowWelcome ? (
              <div className="flex items-start space-x-2">
                <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                  <Image
                    src="/benthemascot-removebg-preview.png"
                    alt="Ben the AI Tutor"
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm border border-indigo-200 max-w-[80%]">
                  <p className="text-sm text-gray-700">{getWelcomeMessage()}</p>
                </div>
              </div>
            ) : (
              chatHistory.map((message, index) => (
                <div
                  key={index}
                  className={`flex items-start space-x-2 ${
                    message.role === "user"
                      ? "flex-row-reverse space-x-reverse"
                      : ""
                  } ${
                    message.role === "assistant" && message.shouldAnimate
                      ? "animate-fadeIn"
                      : ""
                  }`}
                >
                  <div
                    className={`flex items-center justify-center flex-shrink-0 ${
                      message.role === "user"
                        ? "w-8 h-8 rounded-full bg-indigo-500 text-white shadow-sm"
                        : "w-12 h-12"
                    }`}
                  >
                    {message.role === "user" ? (
                      <span className="text-xs font-bold">You</span>
                    ) : (
                      <Image
                        src="/benthemascot-removebg-preview.png"
                        alt="Ben the AI Tutor"
                        width={48}
                        height={48}
                        className="object-contain"
                      />
                    )}
                  </div>
                  <div
                    className={`rounded-lg p-3 shadow-sm max-w-[80%] ${
                      message.role === "user"
                        ? "bg-indigo-500 text-white"
                        : "bg-white border border-indigo-200"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>
                    {message.timestamp && (
                      <div
                        className={`text-xs mt-1 ${
                          message.role === "user"
                            ? "text-indigo-200"
                            : "text-gray-400"
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-start space-x-2">
                <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                  <Image
                    src="/ben_the_bear_thinking.gif"
                    alt="Ben the AI Tutor"
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm border border-indigo-200">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <span className="text-sm text-gray-600 ml-2">
                      Ben is thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Whiteboard Toolbar */}
            <div className="flex items-center justify-between p-2 border-b border-indigo-200 bg-indigo-50">
              <div className="flex items-center gap-1">
                {/* Drawing Tools */}
                <div className="flex items-center gap-1 bg-white rounded p-1 border border-indigo-200">
                  <button
                    onClick={() => {
                      setTool("pen");
                      setLineStart(null);
                      setTempLine(null);
                    }}
                    className={`p-1 rounded text-xs ${
                      tool === "pen"
                        ? "bg-indigo-500 text-white"
                        : "text-indigo-600 hover:bg-indigo-50"
                    }`}
                    disabled={!konvaLoaded}
                    title="Pen"
                  >
                    <FaPen size={10} />
                  </button>
                  <button
                    onClick={() => {
                      setTool("eraser");
                      setLineStart(null);
                      setTempLine(null);
                    }}
                    className={`p-1 rounded text-xs ${
                      tool === "eraser"
                        ? "bg-indigo-500 text-white"
                        : "text-indigo-600 hover:bg-indigo-50"
                    }`}
                    disabled={!konvaLoaded}
                    title="Eraser"
                  >
                    <FaEraser size={10} />
                  </button>
                  <button
                    onClick={() => setTool("line")}
                    className={`p-1 rounded text-xs ${
                      tool === "line"
                        ? "bg-indigo-500 text-white"
                        : "text-indigo-600 hover:bg-indigo-50"
                    }`}
                    disabled={!konvaLoaded}
                    title="Line"
                  >
                    <FaRuler size={10} />
                  </button>
                </div>

                {/* Size Controls */}
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => {
                      if (tool === "pen") {
                        setPenSize(Math.max(1, penSize - 1));
                      } else if (tool === "eraser") {
                        setEraserSize(Math.max(5, eraserSize - 2));
                      }
                    }}
                    className="p-1 rounded text-xs text-indigo-600 hover:bg-indigo-50 border border-indigo-200"
                    disabled={!konvaLoaded}
                    title="Smaller"
                  >
                    <FaMinus size={8} />
                  </button>
                  <span className="text-xs text-indigo-600 w-4 text-center">
                    {tool === "pen"
                      ? penSize
                      : tool === "eraser"
                      ? eraserSize
                      : penSize}
                  </span>
                  <button
                    onClick={() => {
                      if (tool === "pen") {
                        setPenSize(Math.min(20, penSize + 1));
                      } else if (tool === "eraser") {
                        setEraserSize(Math.min(50, eraserSize + 2));
                      }
                    }}
                    className="p-1 rounded text-xs text-indigo-600 hover:bg-indigo-50 border border-indigo-200"
                    disabled={!konvaLoaded}
                    title="Bigger"
                  >
                    <FaPlus size={8} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={undo}
                  disabled={historyStep <= 0 || !konvaLoaded}
                  className="p-1 rounded text-xs text-indigo-600 hover:bg-indigo-50 border border-indigo-200 disabled:opacity-50"
                  title="Undo"
                >
                  <FaUndo size={10} />
                </button>
                <button
                  onClick={redo}
                  disabled={historyStep >= history.length - 1 || !konvaLoaded}
                  className="p-1 rounded text-xs text-indigo-600 hover:bg-indigo-50 border border-indigo-200 disabled:opacity-50"
                  title="Redo"
                >
                  <FaRedo size={10} />
                </button>
                <button
                  onClick={clearCanvas}
                  className="p-1 rounded text-xs text-indigo-600 hover:bg-indigo-50 border border-indigo-200"
                  disabled={!konvaLoaded}
                  title="Clear"
                >
                  <FaTrash size={10} />
                </button>
                <button
                  onClick={saveCanvas}
                  className="p-1 rounded text-xs text-indigo-600 hover:bg-indigo-50 border border-indigo-200"
                  disabled={!konvaLoaded}
                  title="Save"
                >
                  <FaDownload size={10} />
                </button>
              </div>
            </div>

            {/* Whiteboard Canvas */}
            <div className="flex-1 flex items-center justify-center p-2 bg-gray-50">
              <div className="bg-white border border-gray-300 rounded shadow-sm">
                {loadError ? (
                  <div
                    className="flex items-center justify-center bg-red-50 text-red-600 p-4 text-xs"
                    style={{ width: stageWidth, height: stageHeight }}
                  >
                    <div className="text-center">
                      <p className="font-semibold">Error loading whiteboard</p>
                      <p className="text-xs mt-1">{loadError}</p>
                    </div>
                  </div>
                ) : !konvaLoaded ? (
                  <div
                    className="flex items-center justify-center bg-white text-gray-500 text-xs"
                    style={{ width: stageWidth, height: stageHeight }}
                  >
                    Loading whiteboard...
                  </div>
                ) : (
                  <Stage
                    ref={stageRef}
                    width={stageWidth}
                    height={stageHeight}
                    onMouseDown={handleMouseDown}
                    onMousemove={handleMouseMove}
                    onMouseup={handleMouseUp}
                    onTouchStart={handleMouseDown}
                    onTouchMove={handleMouseMove}
                    onTouchEnd={handleMouseUp}
                  >
                    <Layer>
                      {/* Background */}
                      <Rect
                        x={0}
                        y={0}
                        width={stageWidth}
                        height={stageHeight}
                        fill="white"
                      />

                      {/* Freehand lines */}
                      {lines.map((line) => (
                        <Line
                          key={line.id}
                          points={line.points}
                          stroke={line.stroke}
                          strokeWidth={line.strokeWidth}
                          tension={0.5}
                          lineCap="round"
                          lineJoin="round"
                          globalCompositeOperation={
                            line.globalCompositeOperation
                          }
                        />
                      ))}

                      {/* Straight lines */}
                      {straightLines.map((line) => (
                        <Line
                          key={line.id}
                          points={line.points}
                          stroke={line.stroke}
                          strokeWidth={line.strokeWidth}
                          lineCap="round"
                        />
                      ))}

                      {/* Temporary line preview */}
                      {tempLine && (
                        <Line
                          points={tempLine.points}
                          stroke={tempLine.stroke}
                          strokeWidth={tempLine.strokeWidth}
                          lineCap="round"
                          opacity={0.7}
                          dash={[5, 5]}
                        />
                      )}
                    </Layer>
                  </Stage>
                )}
              </div>
            </div>

            {/* Whiteboard Instructions */}
            <div className="p-2 bg-indigo-50 border-t border-indigo-200 text-xs text-indigo-600">
              {!konvaLoaded ? (
                <span>Loading drawing tools...</span>
              ) : tool === "line" && !lineStart ? (
                <span>Click to start drawing a straight line</span>
              ) : tool === "line" && lineStart ? (
                <span>Click to finish the line</span>
              ) : tool === "pen" ? (
                <span>Click and drag to draw</span>
              ) : (
                <span>Click and drag to erase</span>
              )}
            </div>
          </div>
        )}

        {/* Input Area - Only show for chat mode */}
        {mode === "chat" && (
          <div className="p-3 border-t border-indigo-200 bg-white">
            <div className="flex items-end space-x-2">
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={userMessage}
                  onChange={handleInputChange}
                  onPaste={handlePaste}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    disabled
                      ? "Ben is taking a break..."
                      : "Ask Ben a question about your studies..."
                  }
                  disabled={disabled || isLoading}
                  rows={1}
                  className="w-full p-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                  style={{ minHeight: "38px", maxHeight: "100px" }}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={disabled || isLoading || !userMessage.trim()}
                className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                <FaPaperPlane className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);
AIAssistant.displayName = "AIAssistant";
export default AIAssistant;
