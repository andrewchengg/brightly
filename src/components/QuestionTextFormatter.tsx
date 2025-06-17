/*
Usage Examples:

For Question Text (no fractions):
<QuestionTextFormatter text="Sam was given some ribbon to tie 2 parcels. He used 7/8 m of ribbon..." />
// Result: "7/8" will display as plain text

For Option Text (with fractions):
<OptionTextFormatter text="7/16 m" />
// Result: "7/16" will display as a stacked fraction

For Option Rendering in Components:
{options.map((option, index) => (
  <button key={option.id}>
    <span className="font-bold mr-2">{String.fromCharCode(65 + index)}.</span>
    <OptionTextFormatter text={option.text} />
  </button>
))}
*/

import React from 'react';

interface QuestionTextFormatterProps {
  text: string;
  className?: string;
}

interface OptionTextFormatterProps {
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

/**
 * Component for formatting option text with fractions
 */
const OptionTextFormatter: React.FC<OptionTextFormatterProps> = ({ 
  text, 
  className = "" 
}) => {
  const formatOptionText = (inputText: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;

    // Pattern for fractions and other math expressions
    const mathPattern = new RegExp(
      [
        String.raw`(\b\d+\s+\d+\/\d+\b)`,       // Mixed Fractions (e.g., "3 1/4")
        String.raw`(\b\w+\/\w+\b)`,             // Simple Fractions (e.g., "3/4", "10k/4")
        String.raw`(∠\s?[\w\d]+)`,              // Angles (e.g., "∠CBE")
        String.raw`(\d+(\.\d+)?%)`,             // Percentages (e.g., "7%")
        String.raw`([÷×−≤≥≠])`,                 // LaTeX symbols
        String.raw`([=<>])`,                    // Comparison operators
        String.raw`([+\-*:])`,                  // ASCII operators
      ].join('|'),
      'g'
    );

    let match;
    while ((match = mathPattern.exec(inputText)) !== null) {
      // Add plain text before the match
      if (match.index > lastIndex) {
        nodes.push(inputText.substring(lastIndex, match.index));
      }

      const [fullMatch, mixedFraction, simpleFraction, angle, percent, latexSymbol, comparison, operator] = match;
      const key = `${match.index}`;

      if (mixedFraction) {
        const [whole, num, den] = mixedFraction.split(/[\s\/]+/);
        nodes.push(<MixedFraction key={key} whole={whole} numerator={num} denominator={den} />);
      } else if (simpleFraction) {
        const [num, den] = simpleFraction.split('/');
        nodes.push(<StackedFraction key={key} numerator={num} denominator={den} />);
      } else if (angle || percent) {
        nodes.push(<span key={key} className="font-semibold">{fullMatch}</span>);
      } else if (latexSymbol) {
        nodes.push(<span key={key} className="mx-1">{fullMatch}</span>);
      } else if (comparison || operator) {
        let symbol = fullMatch.replace('*', '×').replace(':', ' : ').replace('-', '−');
        nodes.push(<span key={key} className="mx-2">{symbol.trim()}</span>);
      }
      
      lastIndex = match.index + fullMatch.length;
    }

    // Add remaining text
    if (lastIndex < inputText.length) {
      nodes.push(inputText.substring(lastIndex));
    }
    
    return nodes;
  };

  const formattedContent = formatOptionText(text);

  return (
    <span className={className}>
      {formattedContent}
    </span>
  );
};

/**
 * Component for formatting question text without fractions
 */
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
   * Formats non-fraction math expressions only
   */
  const formatText = (inputText: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;

    // Pattern for non-fraction math expressions only
    const nonFractionMathPattern = new RegExp(
      [
        String.raw`(∠\s?[\w\d]+)`,              // Angles (e.g., "∠CBE")
        String.raw`(\d+(\.\d+)?%)`,             // Percentages (e.g., "7%")
        String.raw`([÷×−≤≥≠])`,                 // LaTeX symbols
        String.raw`([=<>])`,                    // Comparison operators
        String.raw`([+\-*:])`,                  // ASCII operators
      ].join('|'),
      'g'
    );

    let match;
    while ((match = nonFractionMathPattern.exec(inputText)) !== null) {
      // Add plain text before the match
      if (match.index > lastIndex) {
        nodes.push(inputText.substring(lastIndex, match.index));
      }

      const [fullMatch, angle, percent, latexSymbol, comparison, operator] = match;
      const key = `${match.index}`;

      if (angle || percent) {
        nodes.push(<span key={key} className="font-semibold">{fullMatch}</span>);
      } else if (latexSymbol) {
        nodes.push(<span key={key} className="mx-1">{fullMatch}</span>);
      } else if (comparison || operator) {
        let symbol = fullMatch.replace('*', '×').replace(':', ' : ').replace('-', '−');
        nodes.push(<span key={key} className="mx-2">{symbol.trim()}</span>);
      }
      
      lastIndex = match.index + fullMatch.length;
    }

    // Add remaining text
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
export { OptionTextFormatter };