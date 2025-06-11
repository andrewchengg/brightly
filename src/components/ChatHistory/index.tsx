"use client";

import React, { useState } from "react";
import ChatHistory from "./ChatHistory";
import ChatViewer from "./ChatViewer";

interface ChatHistoryContainerProps {
  className?: string;
}

export default function ChatHistoryContainer({
  className = "",
}: ChatHistoryContainerProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );

  const handleSessionSelect = (sessionId: string) => {
    setSelectedSessionId(sessionId);
  };

  const handleBack = () => {
    setSelectedSessionId(null);
  };

  if (selectedSessionId) {
    return (
      <ChatViewer
        sessionId={selectedSessionId}
        onBack={handleBack}
        className={className}
      />
    );
  }

  return (
    <ChatHistory onSessionSelect={handleSessionSelect} className={className} />
  );
}

// Export individual components for direct use
export { default as ChatHistory } from "./ChatHistory";
export { default as ChatViewer } from "./ChatViewer";
export type { ChatHistoryRef } from "./ChatHistory";
