// src/components/Practice/PassageDisplay.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  QuestionClient,
  OptionClient,
} from "@/app/(dashboard)/student/practice/chinese/cloze/[questionGroupId]/page"; // Adjust path as needed
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  FaCheck,
  FaQuestionCircle,
  FaTimes,
  FaInfoCircle,
  FaLanguage,
  FaBook,
  FaSpinner,
  FaTimes as FaClose,
  FaCommentDots,
} from "react-icons/fa";

interface PassageDisplayProps {
  title?: string;
  content: string;
  audioUrl?: string | null;
}

interface TextSelection {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WordInfo {
  pinyin?: string;
  explanation?: string;
  loading?: boolean;
}

const PassageDisplay: React.FC<PassageDisplayProps> = ({
  title,
  content,
  audioUrl
}) => {
  if (!content) {
    return <p className="text-center py-8">No passage content available.</p>;
  }

  return (
    <div className="p-4 bg-indigo-50 border-l-4 border-indigo-400 rounded-r-md shadow">
      {title && (
        <h2 className="text-lg font-semibold text-indigo-800 mb-2">
          {title}
        </h2>
      )}
      <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap max-h-[calc(100vh-350px)] overflow-y-auto custom-scrollbar pr-2">
        {content}
      </div>
      {audioUrl && (
        <div className="mt-4">
          <audio controls className="w-full">
            <source src={audioUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
};

export default PassageDisplay;
