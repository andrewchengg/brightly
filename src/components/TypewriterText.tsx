import React, { useState, useEffect } from "react";

interface TypewriterTextProps {
  text: string;
  speed?: number; // Characters per second
  className?: string;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 150, // Default 150 characters per second
  className = "",
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Fix hydration issues by only starting animation after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    // Reset when text changes
    setDisplayedText("");
    setCurrentIndex(0);
    setIsComplete(false);
  }, [text, isMounted]);

  useEffect(() => {
    if (!isMounted) return;

    if (currentIndex < text.length && !isComplete) {
      const timer = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);

        if (currentIndex + 1 >= text.length) {
          setIsComplete(true);
        }
      }, 1000 / speed); // Convert speed from chars/sec to milliseconds

      return () => clearTimeout(timer);
    }
  }, [currentIndex, text, speed, isComplete, isMounted]);

  return (
    <div className={className}>
      {isMounted ? displayedText : text}
      {isMounted && !isComplete && (
        <span className="animate-pulse text-indigo-600">|</span>
      )}
    </div>
  );
};

export default TypewriterText;
