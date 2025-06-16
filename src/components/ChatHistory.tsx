import React from 'react';
import { format } from 'date-fns';

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  sender: string;
}

interface ChatHistoryProps {
  messages: Message[];
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ messages }) => {
  return (
    <div className="chat-history">
      {messages.map((message) => (
        <div key={message.id} className="message">
          <div className="message-header">
            <span className="sender">{message.sender}</span>
            <span className="timestamp">
              {format(new Date(message.timestamp), 'MMM d, yyyy h:mm a')}
            </span>
          </div>
          <div className="message-content">{message.content}</div>
        </div>
      ))}
    </div>
  );
};

export default ChatHistory; 