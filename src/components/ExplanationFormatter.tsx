import React from "react";

/**
 * Renders a standard stacked fraction. e.g., 3/4
 */
const StackedFraction: React.FC<{
  numerator: string;
  denominator: string;
  key?: string | number;
}> = ({ numerator, denominator }) => (
  <span className="inline-block align-middle text-center mx-1">
    <span className="block border-b border-current leading-tight px-1 text-sm lg:text-xs">
      {numerator}
    </span>
    <span className="block leading-tight px-1 text-sm lg:text-xs">{denominator}</span>
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
    <span className="mr-1 text-base lg:text-sm">{whole}</span>
    <StackedFraction numerator={numerator} denominator={denominator} />
  </span>
);

interface ExplanationFormatterProps {
  explanation: string;
  className?: string;
}

const ExplanationFormatter: React.FC<ExplanationFormatterProps> = ({
  explanation,
  className = "",
}) => {
  /**
   * General-purpose math text formatter for explanations.
   * It handles fractions, calculations, and standardizes spacing and symbols.
   */
  const formatMathText = (text: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;

    // Regex to find all math-related patterns. More specific ones first.
    const masterPattern = new RegExp(
      [
        String.raw`(\b\d+\s+\d+\/\d+\b)`, // 1. Mixed Fractions (e.g., "3 1/4")
        String.raw`(\([^)]+\)\/[^/\s]+)`, // 2. Complex fractions with expressions (e.g., "(7 + 8)/4")
        String.raw`(\b\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?\b)`, // 3. Numeric division (e.g., "480 / 0.15")
        String.raw`(\b\w+\/\w+\b)`, // 4. Other fractions (e.g., "10k/4", "3/4 of")
        String.raw`([=<>≤≥])`, // 5. Comparison/Equals Operators
        String.raw`([+×*])`, // 6. Arithmetic Operators (removed hyphens/minus signs)
      ].join("|"),
      "g"
    );

    let match;
    while ((match = masterPattern.exec(text)) !== null) {
      // Add plain text before the match
      if (match.index > lastIndex) {
        nodes.push(text.substring(lastIndex, match.index));
      }

      const [
        fullMatch,
        mixedFraction,
        complexFraction,
        numericDivision,
        simpleFraction,
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
      } else if (complexFraction) {
        // Handle complex fractions like (7 + 8)/4
        const slashIndex = complexFraction.indexOf("/");
        const numeratorWithParens = complexFraction.substring(0, slashIndex);
        const denominator = complexFraction.substring(slashIndex + 1);

        // Remove the parentheses from numerator
        const numerator = numeratorWithParens.substring(
          1,
          numeratorWithParens.length - 1
        );

        nodes.push(
          <StackedFraction
            key={key}
            numerator={numerator}
            denominator={denominator}
          />
        );
      } else if (numericDivision) {
        const [num, den] = numericDivision.split("/");
        nodes.push(
          <span
            key={key}
            className="mx-1 text-base lg:text-sm"
          >{`${num.trim()} ÷ ${den.trim()}`}</span>
        );
      } else if (simpleFraction) {
        const [num, den] = simpleFraction.split("/");
        nodes.push(
          <StackedFraction key={key} numerator={num} denominator={den} />
        );
      } else if (comparison || operator) {
        const symbol = fullMatch.replace("*", "×");
        nodes.push(
          <span key={key} className="mx-1 text-base lg:text-sm">
            {symbol}
          </span>
        );
      }

      lastIndex = match.index + fullMatch.length;
    }

    // Add any remaining text
    if (lastIndex < text.length) {
      nodes.push(text.substring(lastIndex));
    }

    return nodes;
  };

  /**
   * Intelligently splits text into sentences and handles line breaks.
   * Preserves math expressions and adds appropriate spacing.
   */
  const formatTextWithBreaks = (text: string): React.ReactNode[] => {
    // First, split by explicit line breaks
    const lines = text.split("\n");
    const result: React.ReactNode[] = [];

    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim();

      if (trimmedLine === "") {
        // Add spacing for empty lines
        if (result.length > 0) {
          result.push(<br key={`empty-${lineIndex}`} />);
        }
        return;
      }

      // Split line into sentences while preserving decimals
      const sentences = trimmedLine
        .replace(/(\d)\.(\d)/g, "$1DECIMAL_PLACEHOLDER$2") // Protect decimals
        .split(/([.!?]+\s*)/)
        .filter((segment) => segment.trim() !== "")
        .map((segment) => segment.replace(/DECIMAL_PLACEHOLDER/g, "."));

      let currentSentence = "";

      sentences.forEach((segment, segmentIndex) => {
        currentSentence += segment;

        // Check if this segment ends a sentence
        if (segment.match(/^[.!?]+\s*$/)) {
          const formattedSentence = formatMathText(currentSentence.trim());
          result.push(...formattedSentence);

          // Add appropriate spacing after sentences
          if (segmentIndex < sentences.length - 1) {
            result.push(" "); // Space between sentences
          }

          currentSentence = "";
        }
      });

      // Handle any remaining content that didn't end with punctuation
      if (currentSentence.trim()) {
        const formattedSentence = formatMathText(currentSentence.trim());
        result.push(...formattedSentence);
      }

      // Add line break between lines (but not after the last line)
      if (lineIndex < lines.length - 1) {
        result.push(<br key={`line-break-${lineIndex}`} />);
      }
    });

    return result;
  };

  /**
   * Main function to format the entire explanation, identifying parts and steps.
   */
  const formatExplanation = (text: string): React.ReactNode[] => {
    const lines = text.split("\n");
    const formattedNodes: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (line.trim() === "") {
        formattedNodes.push(<br key={`br-${i}`} />);
        i++;
        continue;
      }

      // Regex for "Part (a):", "Part (b):", etc.
      const partMatch = line.match(/^(\s*)(Part\s+\([a-z]\):)(.*)/i);
      // Regex for "Step 1:", "1.", etc.
      const stepMatch = line.match(/^(\s*)(?:Step\s+)?(\d+)[\.\)\:](\s+.*)/i);

      if (partMatch) {
        const [, , partHeader, content] = partMatch;
        formattedNodes.push(
          <div key={`part-${i}`} className="mb-3 mt-4">
            <div className="font-bold text-blue-700 text-base mb-2">
              {partHeader}
            </div>
            <div className="ml-4">{formatTextWithBreaks(content.trim())}</div>
          </div>
        );
        i++;
      } else if (stepMatch) {
        const [, , number, contentWithSpace] = stepMatch;
        const content = contentWithSpace.trim();
        const stepHeader = `Step ${number}.`;

        // Collect all subsequent lines that belong to this step
        let stepContent = content;
        let j = i + 1;
        while (j < lines.length) {
          const nextLine = lines[j];
          if (
            nextLine.trim() === "" ||
            nextLine.match(/^(\s*)(?:Step\s+)?(\d+)[\.\)\:]/) ||
            nextLine.match(/^(\s*)(Part\s+\([a-z]\):)/i)
          ) {
            break; // Stop if we hit a new step, part, or an empty line
          }
          stepContent += "\n" + nextLine;
          j++;
        }

        formattedNodes.push(
          <div key={`step-${i}`} className="mb-3">
            <div className="font-bold text-gray-800 mb-1">{stepHeader}</div>
            <div className="ml-8 pl-2 border-l-2 border-gray-200 leading-relaxed">
              {formatTextWithBreaks(stepContent)}
            </div>
          </div>
        );
        i = j; // Skip lines we've processed
      } else {
        // Handle regular text lines - collect consecutive non-step/part lines
        let textBlock = line;
        let j = i + 1;

        while (j < lines.length) {
          const nextLine = lines[j];
          if (
            nextLine.trim() === "" ||
            nextLine.match(/^(\s*)(?:Step\s+)?(\d+)[\.\)\:]/) ||
            nextLine.match(/^(\s*)(Part\s+\([a-z]\):)/i)
          ) {
            break;
          }
          textBlock += "\n" + nextLine;
          j++;
        }

        formattedNodes.push(
          <div key={`text-block-${i}`} className="mb-2 leading-relaxed">
            {formatTextWithBreaks(textBlock)}
          </div>
        );
        i = j;
      }
    }

    return formattedNodes;
  };

  return (
    <div className={`text-base lg:text-sm leading-relaxed lg:leading-normal ${className}`}>
      {formatExplanation(explanation)}
    </div>
  );
};

export default ExplanationFormatter;
