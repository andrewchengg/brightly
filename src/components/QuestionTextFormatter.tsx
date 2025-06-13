import React from 'react';

interface QuestionTextFormatterProps {
  text: string;
  className?: string;
}

const QuestionTextFormatter: React.FC<QuestionTextFormatterProps> = ({ 
  text, 
  className = "" 
}) => {
  const formatMathText = (text: string): React.ReactNode[] => {
    const segments: React.ReactNode[] = [];
    let lastIndex = 0;

    // Patterns for mathematical expressions
    const mathPatterns = [
      // Fractions like 1/2, 3/4, etc.
      /(\b[0-9]+\/[0-9]+\b)/g,
      
      // Simple arithmetic like 5 + 3, 10 - 4, 6 * 2
      /(\b[0-9]+\s*[\+\-\*×÷]\s*[0-9]+\b)/g,
      
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
          className="font-mono"
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
    // Check if it's a fraction
    const fractionMatch = mathText.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
      const [, numerator, denominator] = fractionMatch;
      return (
        <span className="inline-block align-middle">
          <span className="block text-center border-b border-current">{numerator}</span>
          <span className="block text-center">{denominator}</span>
        </span>
      );
    }

    // For other mathematical expressions
    return mathText
      // Convert multiplication symbol alternatives
      .replace(/\*/g, '×')
      // Add spaces around operators for better readability
      .replace(/([=\+\-×])/g, ' $1 ')
      // Handle special spacing for ÷ symbol
      .replace(/(÷)/g, ' $1 ')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      // Remove spaces around parentheses content
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
      // Clean up spaces before punctuation
      .replace(/\s+([.,;!?])/g, '$1')
      .trim();
  };

  return (
    <div className={`whitespace-pre-wrap ${className}`}>
      {formatMathText(text)}
    </div>
  );
};

export default QuestionTextFormatter; 