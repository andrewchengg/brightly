"use client";

import { useState, useRef, useEffect } from "react";
import {
  FaPaperPlane,
  FaImage,
  FaTimes,
  FaRobot,
  FaUser,
  FaCamera,
} from "react-icons/fa";
import Image from "next/image";
import { validateUserInput, sanitizeUserInput } from "@/lib/client-validation";
import { toast } from "react-toastify";

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
        "Hello! I'm your AI tutor. I can help you solve problems by analyzing images of questions you upload. Just upload an image of your question or type your question directly!",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

      const response = await fetch("/api/ask-ai", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();

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

  return (
    <div className="flex flex-col h-screen w-full bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white bg-opacity-20 rounded-lg">
            <FaRobot className="text-2xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Tutor</h1>
            <p className="text-indigo-100 text-sm">
              Upload your question image and get instant help!
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-4xl mx-auto w-full space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-4 ${
                message.type === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm shadow-md ${
                  message.type === "user"
                    ? "bg-gradient-to-br from-indigo-600 to-indigo-700"
                    : "bg-gradient-to-br from-purple-500 to-indigo-600"
                }`}
              >
                {message.type === "user" ? <FaUser /> : <FaRobot />}
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
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm shadow-md">
                <FaRobot />
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
                    AI is thinking...
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
            <div className="flex-1">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your question here or upload an image..."
                className="w-full px-5 py-4 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm leading-relaxed shadow-sm"
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
            Upload images of your questions and get instant help from AI tutor
          </p>
        </div>
      </div>
    </div>
  );
};

export default AskAITutor;
