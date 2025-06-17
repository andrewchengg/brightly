import React from 'react';

interface QuestionTextFormatterProps {
  text: string;
  className?: string;
}

/**
 * Renders a standard stacked fraction. e.g., 3/4
 */
const StackedFraction: React.FC<{ numerator: string; denominator: string; key?: string }> = ({
  numerator,
  denominator,
}) => (
  <span className="inline-block align-middle text-center mx-1">
    <span className="block border-b border-current leading-tight px-1">{numerator}</span>
    <span className="block leading-tight px-1">{denominator}</span>
  </span>
);

/**
 * Renders a mixed fraction. e.g., 2 1/2
 */
const MixedFraction: React.FC<{ whole: string; numerator: string; denominator: string; key?: string }> = ({
  whole,
  numerator,
  denominator,
}) => (
  <span className="inline-flex items-center mx-1 align-middle">
    <span className="mr-1">{whole}</span>
    <StackedFraction numerator={numerator} denominator={denominator} />
  </span>
);

const QuestionTextFormatter: React.FC<QuestionTextFormatterProps> = ({ 
  text, 
  className = "" 
}) => {
  /**
   * Adds a period to the end of a string if it's missing punctuation.
   */
  const ensurePeriodAtEnd = (str: string): string => {
    const trimmed = str.trim();
    if (trimmed && !/[.!?]$/.test(trimmed)) {
      return trimmed + '.';
    }
    return trimmed;
  };

  /**
   * Formats multi-part questions like (a), (b) onto separate lines and ensures they end with a period.
   */
  const processMultiPartQuestion = (str: string): string => {
    const partPattern = /(\([a-z]\))/gi;
    if (!partPattern.test(str)) {
      return ensurePeriodAtEnd(str);
    }
    
    // Split by part markers, ensuring markers are kept.
    const parts = str.split(partPattern);
    let processedText = '';
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part) continue;
      
      if (part.match(/^\([a-z]\)$/i)) { // It's a marker like (a)
        // Add a newline before the marker if it's not the first part of the text
        if (processedText.length > 0) {
          processedText = ensurePeriodAtEnd(processedText) + '\n\n';
        }
        processedText += part + ' ';
      } else { // It's the content after a marker
        processedText += part;
      }
    }
    
    return ensurePeriodAtEnd(processedText);
  };
  
  /**
   * Parses the text and formats mathematical expressions.
   */
  const formatText = (inputText: string): React.ReactNode[] => {
    // A single, powerful regex to find all math-related patterns we want to format.
    // Order is important: more specific patterns (like mixed fractions) must come first.
    // LaTeX symbols are caught first to preserve them as-is.
    const masterPattern = new RegExp(
      [
        String.raw`(\b\d+\s+\d+\/\d+\b)`, // 1. Mixed Fractions (e.g., "4 1/5")
        String.raw`(\b\w+\/\w+\b)`,       // 2. Simple Fractions (alphanumeric, e.g., "3/4", "10k/4")
        String.raw`(∠\s?[\w\d]+)`,         // 3. Angles (e.g., "∠CBE")
        String.raw`(\d+(\.\d+)?%)`,       // 4. Percentages (e.g., "7%")
        String.raw`([÷×−≤≥≠])`,           // 5. Already-correct LaTeX symbols (preserve as-is)
        String.raw`([=<>])`,              // 6. Basic comparison operators
        String.raw`([+\-*:])`,            // 7. ASCII operators (convert to LaTeX)
      ].join('|'),
      'g'
    );
    
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = masterPattern.exec(inputText)) !== null) {
      // Add the plain text segment before the matched math expression
      if (match.index > lastIndex) {
        nodes.push(inputText.substring(lastIndex, match.index));
      }

      const [fullMatch, mixedFraction, simpleFraction, angle, percent, latexSymbol, basicComparison, asciiOperator] = match;
      
      if (mixedFraction) {
        const [whole, num, den] = mixedFraction.split(/[\s\/]+/);
        nodes.push(<MixedFraction key={`${match.index}`} whole={whole} numerator={num} denominator={den} />);
      } else if (simpleFraction) {
        const [num, den] = simpleFraction.split('/');
        nodes.push(<StackedFraction key={`${match.index}`} numerator={num} denominator={den} />);
      } else if (angle || percent) {
        nodes.push(<span key={`${match.index}`} className="font-semibold">{fullMatch}</span>);
      } else if (latexSymbol) {
        // Already correct LaTeX symbols - preserve as-is with minimal spacing
        nodes.push(<span key={`${match.index}`} className="mx-1">{fullMatch}</span>);
      } else if (basicComparison || asciiOperator) {
        // Convert ASCII operators to LaTeX and add spacing
        let symbol = fullMatch.replace('*', '×').replace(':', ' : ').replace('-', '−');
        nodes.push(<span key={`${match.index}`} className="mx-2">{symbol.trim()}</span>);
      }
      
      lastIndex = match.index + fullMatch.length;
    }
    
    // Add any remaining text after the last match
    if (lastIndex < inputText.length) {
      nodes.push(inputText.substring(lastIndex));
    }
    
    return nodes;
  };

  // Run the full pipeline
  const preprocessedText = processMultiPartQuestion(text);
  const formattedContent = formatText(preprocessedText);

  return (
    <div className={`whitespace-pre-wrap ${className}`}>
      {formattedContent}
    </div>
  );
};

export default QuestionTextFormatter;