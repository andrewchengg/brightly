"use client";

import { useState, useRef, useEffect } from "react";
import {
  FaPaperPlane,
  FaImage,
  FaTimes,
  FaRobot,
  FaUser,
  FaCamera,
  FaHistory,
  FaBars,
} from "react-icons/fa";
import Image from "next/image";
import { validateUserInput, sanitizeUserInput } from "@/lib/client-validation";
import { toast } from "react-toastify";
import { ChatHistory, ChatHistoryRef } from "@/components/ChatHistory/index";
import {
  AIAssistant,
  createSessionContext,
} from "@/components/AILearningAssistant";

interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  image?: string;
  timestamp: Date;
  shouldAnimate?: boolean; // Flag for new AI messages to animate
}

const MessageTimestamp: React.FC<{ timestamp: Date; isUser: boolean }> = ({
  timestamp,
  isUser,
}) => {
  const [timeString, setTimeString] = useState("");

  useEffect(() => {
    setTimeString(timestamp.toLocaleTimeString());
  }, [timestamp]);

  return (
    <p
      className={`text-xs mt-3 ${isUser ? "text-indigo-100" : "text-gray-500"}`}
    >
      {timeString}
    </p>
  );
};

const AskAITutor = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      type: "ai",
      content:
        "Hi there! I'm Ben, your friendly AI tutor! 🐻 I love helping students like you solve problems and understand concepts better. You can upload images of your questions, paste them, or just type them out - I'm here to help however works best for you!",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatHistoryRef = useRef<ChatHistoryRef>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Function to split text into larger chunks (roughly twice the size of individual sentences)
  const splitIntoSentences = (text: string): string[] => {
    // First, split by paragraph breaks to respect natural structure
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
          .split(/(?<=[.!?])\s+/)
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

  // Remove auto-scroll to allow free scrolling
  // useEffect(() => {
  //   scrollToBottom();
  // }, [messages]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        alert("File size should be less than 10MB");
        return;
      }

      setSelectedImage(file);
      // Only show preview for image files
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setImagePreview(null);
      }
    }
  };

  const removeFile = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle paste events for file pasting
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const fileItem = items.find((item) => item.kind === "file");

    if (fileItem) {
      e.preventDefault();
      const file = fileItem.getAsFile();

      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          // 10MB limit
          toast.error("File size should be less than 10MB");
          return;
        }

        setSelectedImage(file);
        // Only show preview for image files
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setImagePreview(e.target?.result as string);
          };
          reader.readAsDataURL(file);
        } else {
          setImagePreview(null);
        }

        toast.success("File pasted successfully!");
      }
    }
  };

  // Handle drag and drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const file = files[0]; // Take the first file

    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        toast.error("File size should be less than 10MB");
        return;
      }

      setSelectedImage(file);
      // Only show preview for image files
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setImagePreview(null);
      }

      toast.success("File dropped successfully!");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputText(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputText.trim() && !selectedImage) return;

    // Client-side validation for text input
    if (inputText.trim()) {
      const validation = validateUserInput(inputText);
      if (!validation.isValid) {
        toast.error(validation.reason || "Please enter a valid question.");
        if (validation.suggestedMessage) {
          setInputText(validation.suggestedMessage);
        }
        return;
      }
    }

    const sanitizedText = inputText.trim() ? sanitizeUserInput(inputText) : "";

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content:
        sanitizedText || "Please analyze this file and help me with this.",
      image: imagePreview || undefined,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("message", userMessage.content);
      if (selectedImage) {
        formData.append("image", selectedImage);
      }
      if (currentSessionId) {
        formData.append("sessionId", currentSessionId);
      }

      const response = await fetch("/api/ask-ai", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();

      // Update current session ID if this is a new session
      if (!currentSessionId && data.sessionId) {
        setCurrentSessionId(data.sessionId);
      }

      // Split the AI response into sentences for separate messages
      const sentences = splitIntoSentences(data.response);

      // Add each sentence as a separate message with delays
      sentences.forEach((sentence, index) => {
        setTimeout(() => {
          const aiMessage: Message = {
            id: `${Date.now() + index + 1}`,
            type: "ai",
            content: sentence.trim(),
            timestamp: new Date(),
            shouldAnimate: true, // Flag to animate this new message
          };

          setMessages((prev) => [...prev, aiMessage]);
        }, index * 1200); // 1200ms delay between each larger chunk
      });
    } catch (error) {
      console.error("Error getting AI response:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content:
          "I'm sorry, I encountered an error while processing your request. Please try again later.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      removeFile();
    }
  };

  const handleSessionSelect = async (sessionId: string) => {
    try {
      setIsLoading(true);

      // Fetch messages for the selected session
      const response = await fetch(`/api/chat-sessions/${sessionId}/messages`);

      if (!response.ok) {
        throw new Error("Failed to fetch session messages");
      }

      const data = await response.json();

      console.log("Raw messages from API:", data.messages);

      // Convert the chat messages to the local Message format
      const loadedMessages: Message[] = data.messages.map((msg: any) => {
        console.log(
          `Message: ${msg.id}, Role: ${
            msg.role
          }, Content: ${msg.content.substring(0, 50)}...`
        );
        return {
          id: msg.id,
          type: msg.role === "USER" ? "user" : "ai",
          content: msg.content,
          image: msg.imageUrl || undefined,
          timestamp: new Date(msg.timestamp),
        };
      });

      console.log("Converted messages:", loadedMessages);

      // Reverse the messages to fix display order issue
      const orderedMessages = [...loadedMessages].reverse();
      console.log("Final ordered messages:", orderedMessages);

      // Set the messages and current session
      setMessages(orderedMessages);
      setCurrentSessionId(sessionId);
      setShowHistory(false); // Hide sidebar on mobile after selection

      toast.success("Previous conversation loaded!");
    } catch (error) {
      console.error("Error loading session:", error);
      toast.error("Failed to load conversation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const startNewConversation = async () => {
    try {
      // Create a new session immediately
      const response = await fetch("/api/chat-sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "New Conversation",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create new session");
      }

      const data = await response.json();
      const newSessionId = data.session.id;

      // Update the current session
      setCurrentSessionId(newSessionId);

      // Reset messages to welcome message
      setMessages([
        {
          id: "welcome",
          type: "ai",
          content:
            "Hi there! I'm Ben, your friendly AI tutor! 🐻👓 I love helping students like you solve problems and understand concepts better. You can upload images of your questions, paste them, or just type them out - I'm here to help however works best for you!",
          timestamp: new Date(),
        },
      ]);

      // Trigger refresh of chat history sidebar
      if (chatHistoryRef.current?.refreshSessions) {
        chatHistoryRef.current.refreshSessions();
      }

      toast.success("New conversation started!");
    } catch (error) {
      console.error("Error creating new conversation:", error);
      toast.error("Failed to start new conversation");
    }
  };

  return (
    <div className="flex h-screen w-full bg-white">
      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col h-screen transition-all duration-300 ${
          showHistory ? "md:mr-80" : "mr-0"
        } ${isDragOver ? "bg-blue-50" : ""}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="bg-purple-800 text-white px-6 py-4 shadow-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(true)}
              className="md:hidden p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
            >
              <FaBars />
            </button>
            <div className="flex items-center justify-center w-12 h-12 bg-white bg-opacity-20 rounded-lg">
              <Image
                src="/benthemascot-removebg-preview.png"
                alt="Ben the AI Tutor"
                width={40}
                height={40}
                className="object-contain"
                title="Hi! I'm Ben, ready to help you learn!"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Ben - Your AI Tutor</h1>
                  <p className="text-indigo-100 text-sm">
                    Upload, paste, or drag files for instant help!
                  </p>
                </div>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors text-sm"
                >
                  <FaHistory />
                  History
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="max-w-4xl mx-auto w-full space-y-6">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex items-start gap-4 ${
                  message.type === "user" ? "flex-row-reverse" : ""
                } ${
                  message.type === "ai" && message.shouldAnimate
                    ? "animate-fadeIn"
                    : ""
                }`}
              >
                <div
                  className={`flex items-center justify-center ${
                    message.type === "user"
                      ? "w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-md"
                      : "w-16 h-16"
                  }`}
                >
                  {message.type === "user" ? (
                    <FaUser className="text-white" />
                  ) : (
                    <Image
                      src="/benthemascot-removebg-preview.png"
                      alt="Ben the AI Tutor"
                      width={64}
                      height={64}
                      className="object-contain"
                    />
                  )}
                </div>
                <div
                  className={`max-w-[75%] rounded-2xl p-5 shadow-md ${
                    message.type === "user"
                      ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white ml-auto"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  {message.image && (
                    <div className="mb-4">
                      <Image
                        src={message.image}
                        alt="Uploaded question"
                        width={400}
                        height={300}
                        className="rounded-lg object-contain max-h-64 border border-gray-200"
                      />
                    </div>
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </p>
                  <MessageTimestamp
                    timestamp={message.timestamp}
                    isUser={message.type === "user"}
                  />
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 flex items-center justify-center">
                  <Image
                    src="/ben_the_bear_thinking.gif"
                    alt="Ben the AI Tutor"
                    width={64}
                    height={64}
                    className="object-contain"
                  />
                </div>
                <div className="bg-white border border-gray-200 shadow-md rounded-2xl p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">
                      Ben is analyzing your question...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white px-6 py-4 shadow-lg">
          <div className="max-w-4xl mx-auto w-full">
            {(selectedImage || imagePreview) && (
              <div className="mb-4 relative inline-block">
                {imagePreview ? (
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    width={150}
                    height={100}
                    className="rounded-lg object-cover border-2 border-indigo-200 shadow-md"
                  />
                ) : (
                  <div className="w-40 h-20 bg-gray-100 border-2 border-indigo-200 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <FaImage className="text-gray-400 text-xl mb-1 mx-auto" />
                      <div className="text-xs text-gray-600 truncate max-w-32">
                        {selectedImage?.name}
                      </div>
                    </div>
                  </div>
                )}
                <button
                  onClick={removeFile}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                >
                  <FaTimes className="text-xs" />
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-center gap-3">
              <div className="flex-1 transition-all duration-200">
                <textarea
                  value={inputText}
                  onChange={handleInputChange}
                  onPaste={handlePaste}
                  placeholder="Type your question here, paste a file (Ctrl+V), or drag & drop..."
                  className="w-full h-12 px-4 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm shadow-sm transition-all duration-200"
                  rows={1}
                  style={{
                    height: "48px",
                    minHeight: "48px",
                    maxHeight: "140px",
                    paddingTop: "12px",
                    paddingBottom: "12px",
                    lineHeight: "20px",
                    boxSizing: "border-box",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 flex items-center justify-center text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors shadow-sm border border-gray-300"
                title="Upload file"
              >
                <FaImage className="text-lg" />
              </button>

              <button
                type="submit"
                disabled={(!inputText.trim() && !selectedImage) || isLoading}
                className="w-12 h-12 flex items-center justify-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                title="Send message"
              >
                <FaPaperPlane className="text-lg" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Sidebar for Chat History - Fixed positioning */}
      <div
        className={`${
          showHistory ? "translate-x-0" : "translate-x-full"
        } fixed top-0 right-0 z-30 w-80 h-screen bg-gray-50 border-l border-gray-200 transition-transform duration-300 flex flex-col shadow-lg`}
      >
        <div className="flex-1 flex flex-col h-full">
          <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Chat History
              </h2>
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                title="Hide History"
              >
                <FaTimes />
              </button>
            </div>
            <button
              onClick={startNewConversation}
              className="w-full mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            >
              New Conversation
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatHistory
              ref={chatHistoryRef}
              onSessionSelect={handleSessionSelect}
            />
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {showHistory && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setShowHistory(false)}
        />
      )}
    </div>
  );
};

export default AskAITutor;
