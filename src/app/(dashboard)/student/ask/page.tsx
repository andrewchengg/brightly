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
import { ChatHistory, ChatHistoryRef } from "@/components/ChatHistory";

interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  image?: string;
  timestamp: Date;
}

const AskAITutor = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      type: "ai",
      content:
        "Hi there! I'm Ben, your friendly AI tutor! 🐻👓 I love helping students like you solve problems and understand concepts better. You can upload images of your questions, paste them, or just type them out - I'm here to help however works best for you!",
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
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatHistoryRef = useRef<ChatHistoryRef>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        alert("Image size should be less than 10MB");
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle paste events for image pasting
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith("image/"));

    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();

      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          // 10MB limit
          toast.error("Image size should be less than 10MB");
          return;
        }

        setSelectedImage(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);

        toast.success("Image pasted successfully!");
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
    const imageFile = files.find((file) => file.type.startsWith("image/"));

    if (imageFile) {
      if (imageFile.size > 10 * 1024 * 1024) {
        // 10MB limit
        toast.error("Image size should be less than 10MB");
        return;
      }

      setSelectedImage(imageFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(imageFile);

      toast.success("Image dropped successfully!");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputText(value);

    // Show typing animation when user is typing
    if (value.trim() && !isTyping) {
      setIsTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to hide typing animation
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
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
        sanitizedText ||
        "Please analyze this image and help me solve this problem.",
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

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
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
      removeImage();
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    // Load the selected session
    setCurrentSessionId(sessionId);
    setShowHistory(false); // Hide sidebar on mobile after selection
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
      <div className="flex-1 flex flex-col h-screen">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 shadow-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(true)}
              className="md:hidden p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
            >
              <FaBars />
            </button>
            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
              <Image
                src="/benthemascot.png"
                alt="Ben the AI Tutor"
                width={32}
                height={32}
                className="rounded-lg"
                title="Hi! I'm Ben, ready to help you learn!"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Ben - Your AI Tutor</h1>
                  <p className="text-indigo-100 text-sm">
                    Upload, paste, or drag images of your questions for instant
                    help!
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
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
                    message.type === "user"
                      ? "bg-gradient-to-br from-indigo-600 to-indigo-700"
                      : "bg-white border-2 border-purple-200"
                  }`}
                >
                  {message.type === "user" ? (
                    <FaUser className="text-white" />
                  ) : (
                    <Image
                      src="/benthemascot.png"
                      alt="Ben the AI Tutor"
                      width={32}
                      height={32}
                      className="rounded-full"
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
                  <p
                    className={`text-xs mt-3 ${
                      message.type === "user"
                        ? "text-indigo-100"
                        : "text-gray-500"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white border-2 border-purple-200 flex items-center justify-center shadow-md">
                  <Image
                    src="/ben_the_bear_thinking.gif"
                    alt="Ben the AI Tutor"
                    width={32}
                    height={32}
                    className="rounded-full"
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
            {imagePreview && (
              <div className="mb-4 relative inline-block">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  width={150}
                  height={100}
                  className="rounded-lg object-cover border-2 border-indigo-200 shadow-md"
                />
                <button
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                >
                  <FaTimes className="text-xs" />
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-end gap-4">
              <div
                className={`flex-1 transition-all duration-200 ${
                  isDragOver ? "bg-blue-50 border-blue-300 rounded-xl" : ""
                }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <textarea
                  value={inputText}
                  onChange={handleInputChange}
                  onPaste={handlePaste}
                  placeholder="Type your question here, paste an image (Ctrl+V), or drag & drop..."
                  className={`w-full px-5 py-4 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm leading-relaxed shadow-sm transition-all duration-200 ${
                    isDragOver
                      ? "border-blue-400 bg-blue-50 border-dashed"
                      : "border-gray-300"
                  }`}
                  rows={1}
                  style={{ minHeight: "56px", maxHeight: "140px" }}
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
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-4 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors shadow-sm border border-gray-300"
                title="Upload image"
              >
                <FaImage className="text-xl" />
              </button>

              <button
                type="submit"
                disabled={(!inputText.trim() && !selectedImage) || isLoading}
                className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                title="Send message"
              >
                <FaPaperPlane />
              </button>
            </form>

            <p className="text-xs text-gray-500 mt-3 text-center">
              📷 Upload, paste (Ctrl+V), or drag & drop images of your questions
              • Get instant help from AI tutor
            </p>

            {/* Ben typing indicator */}
            {isTyping && (
              <div className="flex items-center justify-center gap-2 mt-2 text-xs text-indigo-600">
                <div className="w-5 h-5 rounded-full bg-white border border-indigo-200 flex items-center justify-center shadow-sm">
                  <Image
                    src="/ben_the_bear_thinking.gif"
                    alt="Ben is listening"
                    width={16}
                    height={16}
                    className="rounded-full"
                  />
                </div>
                <span className="animate-pulse">Ben is listening...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar for Chat History - Now on the RIGHT */}
      <div
        className={`${
          showHistory ? "translate-x-0" : "translate-x-full"
        } fixed md:relative md:translate-x-0 z-30 w-80 h-full bg-gray-50 border-l border-gray-200 transition-transform duration-300`}
      >
        <div className="h-full overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Chat History
              </h2>
              <button
                onClick={() => setShowHistory(false)}
                className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
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
          <div className="h-full overflow-y-auto">
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
