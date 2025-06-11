import React from 'react';

interface ExplanationFormatterProps {
  explanation: string;
  className?: string;
}

const ExplanationFormatter: React.FC<ExplanationFormatterProps> = ({ 
  explanation, 
  className = "" 
}) => {
  const formatExplanation = (text: string): React.ReactNode[] => {
    // First, handle multi-part question formatting
    const multiPartFormatted = formatMultiPartSections(text);
    
    // Then split by lines and process each
    const lines = multiPartFormatted.split('\n');
    const formattedLines: React.ReactNode[] = [];

    lines.forEach((line, index) => {
      if (line.trim() === '') {
        formattedLines.push(<br key={`br-${index}`} />);
        return;
      }

      // Check if line starts with part markers like "Part (a):", "Part (b):", etc.
      const partMatch = line.match(/^(\s*)(Part\s+\([a-z]\):)(\s*)(.*)/i);
      
      if (partMatch) {
        const [, indent, partHeader, spacing, content] = partMatch;
        
        formattedLines.push(
          <div key={`part-${index}`} className="mb-3 mt-4">
            <div className="font-bold text-blue-700 text-base mb-2">
              {partHeader}
            </div>
            <div className="ml-4">
              {formatTextWithSentenceBreaks(content)}
            </div>
          </div>
        );
      }
      // Check if line starts with step enumeration like "Step 1:", "1.", "2)", etc.
      else {
        const stepMatch = line.match(/^(\s*)(Step\s+)?(\d+)[\.\)\:](\s*)(.*)/i);
        
        if (stepMatch) {
          const [, indent, stepWord, number, spacing, content] = stepMatch;
          const stepHeader = `Step ${number}.`;
          
          formattedLines.push(
            <div key={`step-${index}`} className="mb-2">
              <div className="font-bold text-gray-800 mb-1">
                {stepHeader}
              </div>
              <div className="ml-4">
                {formatTextWithSentenceBreaks(content)}
              </div>
            </div>
          );
        } else {
          // Regular line - format with sentence breaks and math expressions
          formattedLines.push(
            <div key={`line-${index}`} className="mb-1">
              {formatTextWithSentenceBreaks(line)}
            </div>
          );
        }
      }
    });

    return formattedLines;
  };

  const formatMultiPartSections = (text: string): string => {
    // Split text by part markers (a), (b), (c), etc. and restructure
    // This handles cases where parts are embedded within the same line
    const partPattern = /\(([a-z])\)\s*/gi;
    const parts = text.split(partPattern);
    
    if (parts.length <= 2) {
      // No parts found or only one part, return original text
      return text;
    }
    
    let formatted = '';
    
    // The first element is content before any part marker
    if (parts[0].trim()) {
      formatted += parts[0].trim() + '\n\n';
    }
    
    // Process remaining parts in pairs (letter, content)
    for (let i = 1; i < parts.length; i += 2) {
      const partLetter = parts[i];
      const partContent = parts[i + 1] || '';
      
      if (partLetter && partContent.trim()) {
        formatted += `Part (${partLetter}): ${partContent.trim()}\n\n`;
      }
    }
    
    return formatted.trim();
  };

  const formatTextWithSentenceBreaks = (text: string): React.ReactNode[] => {
    // Split text into sentences (ending with ., !, or ?)
    const sentences = text.split(/([.!?]+\s*)/).filter(segment => segment.trim() !== '');
    const formattedSentences: React.ReactNode[] = [];
    
    let currentSentence = '';
    
    sentences.forEach((segment, index) => {
      if (segment.match(/^[.!?]+\s*$/)) {
        // This is punctuation + spacing
        currentSentence += segment;
        
        // End of sentence - format it and add line break
        formattedSentences.push(
          <span key={`sentence-${index}`}>
            {formatMathText(currentSentence)}
            <br />
          </span>
        );
        currentSentence = '';
      } else {
        // This is sentence content
        currentSentence += segment;
      }
    });
    
    // Handle any remaining content without sentence ending
    if (currentSentence.trim()) {
      formattedSentences.push(
        <span key={`final-sentence`}>
          {formatMathText(currentSentence)}
        </span>
      );
    }
    
    return formattedSentences.length > 0 ? formattedSentences : [formatMathText(text)];
  };

  const formatMathText = (text: string): React.ReactNode[] => {
    const segments: React.ReactNode[] = [];
    let lastIndex = 0;

    // Patterns to match mathematical expressions
    const mathPatterns = [
      // Fractions like (2/5), (15/8), 2/3, etc.
      /(\(?\d+\/\d+\)?)/g,
      // Equations with equals signs like "6w = 72", "x = 504 ÷ 9"
      /([a-zA-Z]\w*\s*[=]\s*[\d\w\s\+\-\*\/\÷\(\)\.]+)/g,
      // Angle notation like ∠CBE, ∠DEB = 112°
      /(∠[A-Z]+\s*[=]?\s*\d+°?)/g,
      // Mathematical operations with variables like "3w + 8", "9x = 504"
      /(\d*[a-zA-Z]\w*[\+\-\*\/\÷]\s*\d+|\d+[\+\-\*\/\÷]\s*\d*[a-zA-Z]\w*)/g,
      // Degrees like "180°", "50°"
      /(\d+°)/g,
      // Currency like "$5x", "$504"
      /(\$\d+[a-zA-Z]*)/g
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
          className="font-mono bg-blue-50 px-1.5 py-0.5 rounded text-blue-800 font-medium"
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

  const formatSingleMathExpression = (mathText: string): string => {
    return mathText
      // Convert division slash to division symbol
      .replace(/\//g, '÷')
      // Add spaces around operators for better readability
      .replace(/([=\+\-\*])/g, ' $1 ')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
  };

  return (
    <div className={`whitespace-pre-wrap ${className}`}>
      {formatExplanation(explanation)}
    </div>
  );
};

export default ExplanationFormatter; 