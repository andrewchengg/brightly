import React from "react";

// --- Reusable Math Components ---

/**
 * Renders a standard stacked fraction. e.g., 3/4
 */
const StackedFraction: React.FC<{
  numerator: string;
  denominator: string;
  key?: string | number;
}> = ({ numerator, denominator }) => (
  <span className="inline-block align-middle text-center mx-1">
    <span className="block border-b border-current leading-tight px-1">
      {numerator}
    </span>
    <span className="block leading-tight px-1">{denominator}</span>
  </span>
);

/**
 * Renders a mixed fraction. e.g., 2 1/2
 */
const MixedFraction: React.FC<{
  whole: string;
  numerator: string;
  denominator: string;
  key?: string | number;
}> = ({ whole, numerator, denominator }) => (
  <span className="inline-flex items-center mx-1 align-middle">
    <span className="mr-1">{whole}</span>
    <StackedFraction numerator={numerator} denominator={denominator} />
  </span>
);

// --- Shared Formatting Logic ---

/**
 * A robust, shared function to parse and format mathematical text.
 * It now correctly handles fractions with parentheses and within sentences.
 */
const formatMathematicalText = (inputText: string): React.ReactNode[] => {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  // This single, powerful regex finds all math patterns.
  // The fraction pattern is now more precise to avoid being greedy.
  const masterPattern = new RegExp(
    [
      String.raw`(\b\d+\s+\d+\/\d+\b)`, // 1. Mixed Fractions (e.g., "4 1/5") - Most specific
      String.raw`(\b[\w.]+\s*\/\s*(?:\([^)]+\)|\w+))`, // 2. All other fractions (e.g., "1/4", "y/40", "5/(8y)") - More precise denominator
      String.raw`(∠\s?[\w\d]+)`, // 3. Angles (e.g., "∠CBE")
      String.raw`(\d+(?:\.\d+)?%)`, // 4. Percentages (e.g., "7%")
      String.raw`([=<>≤≥≠])`, // 5. Comparison/Equals Operators
      String.raw`([+\-−×*÷:])`, // 6. Arithmetic/Ratio Operators
    ].join("|"),
    "g"
  );

  let match;
  while ((match = masterPattern.exec(inputText)) !== null) {
    // Add the plain text segment before the matched math expression
    if (match.index > lastIndex) {
      nodes.push(inputText.substring(lastIndex, match.index));
    }

    const [
      fullMatch,
      mixedFraction,
      anyFraction,
      angle,
      percent,
      comparison,
      operator,
    ] = match;
    const key = `${match.index}-${fullMatch}`;

    if (mixedFraction) {
      const [whole, num, den] = mixedFraction.split(/[\s\/]+/);
      nodes.push(
        <MixedFraction
          key={key}
          whole={whole}
          numerator={num}
          denominator={den}
        />
      );
    } else if (anyFraction) {
      // This block now handles all non-mixed fractions correctly
      const parts = anyFraction.split("/");
      const num = parts[0].trim();
      let den = parts[1].trim();

      // Remove parentheses from denominator if they exist
      if (den.startsWith("(") && den.endsWith(")")) {
        den = den.substring(1, den.length - 1).trim();
      }

      nodes.push(
        <StackedFraction key={key} numerator={num} denominator={den} />
      );
    } else if (angle || percent) {
      nodes.push(
        <span key={key} className="font-semibold">
          {fullMatch}
        </span>
      );
    } else if (comparison || operator) {
      const symbol = fullMatch.replace("*", "×");
      nodes.push(
        <span key={key} className="mx-2">
          {symbol.trim()}
        </span>
      );
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Add any remaining text after the last match
  if (lastIndex < inputText.length) {
    nodes.push(inputText.substring(lastIndex));
  }

  return nodes;
};

// --- Exported Components ---

interface QuestionTextFormatterProps {
  text: string;
  className?: string;
}

interface OptionTextFormatterProps {
  text: string;
  className?: string;
}

/**
 * Component for formatting the main question text.
 * It handles multi-part questions and all mathematical expressions.
 */
const QuestionTextFormatter: React.FC<QuestionTextFormatterProps> = ({
  text,
  className = "",
}) => {
  const ensurePeriodAtEnd = (str: string): string => {
    const trimmed = str.trim();
    if (trimmed && !/[.!?]$/.test(trimmed)) {
      return trimmed + ".";
    }
    return trimmed;
  };

  const processMultiPartQuestion = (str: string): string => {
    const partPattern = /(\([a-z]\))/gi;
    if (!partPattern.test(str)) {
      return ensurePeriodAtEnd(str);
    }

    const parts = str.split(partPattern);
    let processedText = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part) continue;

      if (part.match(/^\([a-z]\)$/i)) {
        if (processedText.length > 0) {
          processedText = ensurePeriodAtEnd(processedText) + "\n\n";
        }
        processedText += part + " ";
      } else {
        processedText += part;
      }
    }

    return ensurePeriodAtEnd(processedText);
  };

  const preprocessedText = processMultiPartQuestion(text);
  const formattedContent = formatMathematicalText(preprocessedText);

  return (
    <div className={`whitespace-pre-wrap ${className}`}>{formattedContent}</div>
  );
};

/**
 * Component for formatting option text, now using the shared formatter.
 */
const OptionTextFormatter: React.FC<OptionTextFormatterProps> = ({
  text,
  className = "",
}) => {
  const formattedContent = formatMathematicalText(text);

  return <span className={className}>{formattedContent}</span>;
};

export default QuestionTextFormatter;
export { OptionTextFormatter };
