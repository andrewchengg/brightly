import React from 'react';

interface QuestionTextFormatterProps {
  text: string;
  className?: string;
}

const QuestionTextFormatter: React.FC<QuestionTextFormatterProps> = ({ 
  text, 
  className = "" 
}) => {
  // Function to split multi-part questions and add periods to each part
  const processMultiPartQuestion = (text: string): string => {
    // Check if text contains part markers like (a), (b), (c), etc.
    const partPattern = /(\([a-z]\))/gi;
    
    if (!partPattern.test(text)) {
      // No parts found, just ensure period at end
      return ensurePeriodAtEnd(text);
    }
    
    // Split by part markers but keep the markers
    const parts = text.split(/(\([a-z]\))/gi);
    let processedText = '';
    let isFirstPart = true;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      
      if (part.match(/^\([a-z]\)$/i)) {
        // This is a part marker like (a), (b)
        if (!isFirstPart) {
          // Add line break before subsequent parts
          processedText += '\n';
        }
        processedText += part + ' ';
        isFirstPart = false;
      } else if (part) {
        // This is content after a part marker
        processedText += ensurePeriodAtEnd(part);
      }
    }
    
    return processedText.trim();
  };

  // Function to add period if missing at the end of question statements
  const ensurePeriodAtEnd = (text: string): string => {
    const trimmedText = text.trim();
    // Check if the text ends with punctuation
    if (!/[.!?]$/.test(trimmedText)) {
      return trimmedText + '.';
    }
    return trimmedText;
  };

  const formatMathText = (text: string): React.ReactNode[] => {
    const segments: React.ReactNode[] = [];
    let lastIndex = 0;

    // Enhanced patterns for mathematical expressions - prioritizing complex expressions first
    const mathPatterns = [
      // Mixed fractions like "3 1/4", "2 3/8" (must come before other patterns)
      /(\b[0-9]+\s+[0-9]+\/[0-9]+\b)/g,
      
      // Complex expressions with mixed fractions like "3 1/4 + 2 1/2"
      /(\b[0-9]+\s+[0-9]+\/[0-9]+(?:\s*[\+\-×÷\*]\s*[0-9]+(?:\s+[0-9]+\/[0-9]+|\/[0-9]+)?)+\b)/g,
      
      // Complex expressions with multiple fractions like "1 - 1/3 - 1/4" (removed word boundaries that were causing issues)
      /([0-9]+(?:\s*[\+\-×÷\*\/]\s*[0-9]+\/[0-9]+)+)/g,
      
      // Expressions starting with fractions like "1/2 + 3/4 - 1"
      /([0-9]+\/[0-9]+(?:\s*[\+\-×÷\*]\s*[0-9]+(?:\/[0-9]+)?)+)/g,
      
      // Mixed operations with fractions like "2 × 1/3", "5 + 1/4"
      /([0-9]+\s*[\+\-×÷\*]\s*[0-9]+\/[0-9]+|[0-9]+\/[0-9]+\s*[\+\-×÷\*]\s*[0-9]+)/g,
      
      // Simple arithmetic like 5 + 3, 10 - 4, 6 * 2
      /(\b[0-9]+\s*[\+\-\*×÷]\s*[0-9]+\b)/g,
      
      // Fractions like 1/2, 3/4, etc.
      /(\b[0-9]+\/[0-9]+\b)/g,
      
      // Variables with coefficients like 3x, 5y, 6z
      /(\b[0-9]+[a-zA-Z]+\b)/g,
      
      // Simple equations like x = 5, y = 10
      /([a-zA-Z]\s*=\s*[0-9]+)/g,
      
      // Mathematical symbols and notation
      /(≤|≥|≠|±|∞|√|∑|∏|∫|∂|∆|π|θ|α|β|γ|δ|ε|φ|ψ|ω)/g,
      
      // Percentages like 25%, 50%
      /(\b[0-9]+(?:\.[0-9]+)?%)/g,
      
      // Degrees and angles like 180°, ∠ABC, 50°
      /(∠[A-Z]+\s*[=]?\s*[0-9]+°?|\b[0-9]+°)/g,
      
      // Powers and exponents like x², 2³, 10^2
      /([a-zA-Z0-9]+[\^²³⁴⁵⁶⁷⁸⁹⁰]+[a-zA-Z0-9]*|[a-zA-Z0-9]+[₀₁₂₃₄₅₆₇₈₉]+)/g,
      
      // Decimal numbers in mathematical context
      /(\b[0-9]+\.[0-9]+\b)/g,
      
      // Ratios like 5:3, 2:1
      /(\b[0-9]+:[0-9]+\b)/g
    ];

    // Create a combined pattern to find all math expressions
    const combinedPattern = new RegExp(
      mathPatterns.map(p => `(${p.source})`).join('|'), 
      'g'
    );

    let match;
    while ((match = combinedPattern.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index);
        segments.push(beforeText);
      }

      // Add the mathematical expression with formatting
      const mathText = match[0];
      const formattedMath = formatSingleMathExpression(mathText);
      segments.push(
        <span 
          key={`math-${match.index}`} 
          className="font-semibold text-blue-700"
        >
          {formattedMath}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      segments.push(text.slice(lastIndex));
    }

    return segments.length > 0 ? segments : [text];
  };

  const formatSingleMathExpression = (mathText: string): React.ReactNode => {
    // Check if it's a mixed fraction like "3 1/4"
    const mixedFractionMatch = mathText.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixedFractionMatch) {
      const [, wholeNumber, numerator, denominator] = mixedFractionMatch;
      return (
        <span className="inline-flex items-center">
          <span className="mr-1">{wholeNumber}</span>
          <span className="inline-block align-middle">
            <span className="block text-center border-b border-current leading-tight">{numerator}</span>
            <span className="block text-center leading-tight">{denominator}</span>
          </span>
        </span>
      );
    }

    // Check if it's a simple fraction (not part of a complex expression)
    const simpleFractionMatch = mathText.match(/^(\d+)\/(\d+)$/);
    if (simpleFractionMatch) {
      const [, numerator, denominator] = simpleFractionMatch;
      return (
        <span className="inline-block align-middle">
          <span className="block text-center border-b border-current leading-tight">{numerator}</span>
          <span className="block text-center leading-tight">{denominator}</span>
        </span>
      );
    }

    // For complex expressions, convert fractions to proper display format
    const processedText = mathText
      // Convert multiplication symbol alternatives
      .replace(/\*/g, '×')
      // Clean up spaces before processing fractions
      .replace(/\s+/g, ' ')
      .trim();

    // Split by spaces and operators to process each part
    const parts = processedText.split(/(\s*[\+\-×÷]\s*)/);
    const renderedParts: React.ReactNode[] = [];

    parts.forEach((part, index) => {
      const trimmedPart = part.trim();
      
      // Check if this part is a mixed fraction
      const mixedFractionMatch = trimmedPart.match(/^(\d+)\s+(\d+)\/(\d+)$/);
      if (mixedFractionMatch) {
        const [, wholeNumber, numerator, denominator] = mixedFractionMatch;
        renderedParts.push(
          <span key={index} className="inline-flex items-center mx-1">
            <span className="mr-1">{wholeNumber}</span>
            <span className="inline-block align-middle">
              <span className="block text-center border-b border-current leading-tight text-sm">{numerator}</span>
              <span className="block text-center leading-tight text-sm">{denominator}</span>
            </span>
          </span>
        );
      }
      // Check if this part is a regular fraction
      else if (trimmedPart.match(/^(\d+)\/(\d+)$/)) {
        const fractionMatch = trimmedPart.match(/^(\d+)\/(\d+)$/);
        if (fractionMatch) {
          const [, numerator, denominator] = fractionMatch;
          renderedParts.push(
            <span key={index} className="inline-block align-middle mx-1">
              <span className="block text-center border-b border-current leading-tight">{numerator}</span>
              <span className="block text-center leading-tight">{denominator}</span>
            </span>
          );
        }
      } else if (trimmedPart.match(/^[\+\-×÷]$/)) {
        // This is an operator
        renderedParts.push(
          <span key={index} className="mx-1">{trimmedPart}</span>
        );
      } else if (trimmedPart) {
        // This is a regular number or other content
        renderedParts.push(
          <span key={index} className="mx-1">{trimmedPart}</span>
        );
      }
    });

    return <span className="inline-flex items-center">{renderedParts}</span>;
  };

  // Process multi-part questions first, then format math
  const processedText = processMultiPartQuestion(text);

  return (
    <div className={`whitespace-pre-wrap ${className}`}>
      {formatMathText(processedText)}
    </div>
  );
};

export default QuestionTextFormatter; 