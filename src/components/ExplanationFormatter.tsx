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
    
    // Split by lines and group step content together
    const lines = multiPartFormatted.split('\n');
    const formattedLines: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      
      if (line.trim() === '') {
        formattedLines.push(<br key={`br-${i}`} />);
        i++;
        continue;
      }

      // Check if line starts with part markers like "Part (a):", "Part (b):", etc.
      const partMatch = line.match(/^(\s*)(Part\s+\([a-z]\):)(\s*)(.*)/i);
      
      if (partMatch) {
        const [, indent, partHeader, spacing, content] = partMatch;
        
        formattedLines.push(
          <div key={`part-${i}`} className="mb-3 mt-4">
            <div className="font-bold text-blue-700 text-base mb-2">
              {partHeader}
            </div>
            <div className="ml-4">
              {formatTextWithSentenceBreaks(content)}
            </div>
          </div>
        );
        i++;
      }
      // Check if line starts with step enumeration like "Step 1:", "1.", "2)", etc.
      else {
        const stepMatch = line.match(/^(\s*)(Step\s+)?(\d+)[\.\)\:](\s*)(.*)/i);
        
        if (stepMatch) {
          const [, indent, stepWord, number, spacing, content] = stepMatch;
          const stepHeader = `Step ${number}.`;
          
          // Collect all lines that belong to this step
          let stepContent = content;
          let j = i + 1;
          
          // Look ahead to collect all lines until next step or part
          while (j < lines.length) {
            const nextLine = lines[j];
            
            // Stop if we hit another step, part, or empty line followed by step/part
            if (nextLine.trim() === '') {
              // Check if the line after empty line is a step or part
              if (j + 1 < lines.length) {
                const lineAfterEmpty = lines[j + 1];
                if (lineAfterEmpty.match(/^(\s*)(Step\s+)?(\d+)[\.\)\:]/) || 
                    lineAfterEmpty.match(/^(\s*)(Part\s+\([a-z]\):)/i)) {
                  break;
                }
              }
              stepContent += '\n' + nextLine;
            } else if (nextLine.match(/^(\s*)(Step\s+)?(\d+)[\.\)\:]/) || 
                      nextLine.match(/^(\s*)(Part\s+\([a-z]\):)/i)) {
              break;
            } else {
              stepContent += '\n' + nextLine;
            }
            j++;
          }
          
          formattedLines.push(
            <div key={`step-${i}`} className="mb-3">
              <div className="font-bold text-gray-800 mb-1">
                {stepHeader}
              </div>
              <div className="ml-8 pl-2 border-l-2 border-gray-200 leading-relaxed">
                {formatTextWithStepIndentation(stepContent)}
              </div>
            </div>
          );
          
          i = j; // Skip all the lines we've already processed
        } else {
          // Regular line - format with sentence breaks and math expressions
          formattedLines.push(
            <div key={`line-${i}`} className="mb-1">
              {formatTextWithSentenceBreaks(line)}
            </div>
          );
          i++;
        }
      }
    }

    return formattedLines;
  };

  const formatMultiPartSections = (text: string): string => {
    // Debug: Log the input text
    console.log('ExplanationFormatter - Input text:', text);
    
    // Split text by part markers (a), (b), (c), etc. and restructure
    // This handles cases where parts are embedded within the same line
    const partPattern = /\(([a-z])\)\s*/gi;
    const parts = text.split(partPattern);
    
    console.log('ExplanationFormatter - Parts after split:', parts);
    
    if (parts.length <= 2) {
      // No parts found or only one part, return original text
      console.log('ExplanationFormatter - No multi-parts detected, returning original');
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
      
      console.log(`ExplanationFormatter - Processing part ${partLetter}:`, partContent);
      
      if (partLetter && partContent.trim()) {
        formatted += `Part (${partLetter}): ${partContent.trim()}\n\n`;
      }
    }
    
    const result = formatted.trim();
    console.log('ExplanationFormatter - Final formatted result:', result);
    return result;
  };

  const formatTextWithStepIndentation = (text: string): React.ReactNode[] => {
    // Process the text for decimal points and abbreviations
    const decimalPlaceholder = '###DECIMAL###';
    const abbreviationPlaceholder = '###ABBREV###';
    
    // First, temporarily replace decimal points with a placeholder
    let processedText = text.replace(/(\d)\.(\d)/g, `$1${decimalPlaceholder}$2`);
    
    // Then, temporarily replace common abbreviations that end with periods
    const abbreviations = [
      'e.g.', 'i.e.', 'etc.', 'vs.', 'cf.', 'viz.',
      'Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Sr.', 'Jr.',
      'Inc.', 'Corp.', 'Ltd.', 'Co.', 'Ave.', 'St.',
      'approx.', 'est.', 'max.', 'min.', 'no.', 'vol.',
      'ch.', 'fig.', 'p.', 'pp.', 'ed.', 'eds.'
    ];
    
    abbreviations.forEach((abbrev, index) => {
      const regex = new RegExp(`\\b${abbrev.replace(/\./g, '\\.')}`, 'gi');
      processedText = processedText.replace(regex, `${abbreviationPlaceholder}${index}${abbreviationPlaceholder}`);
    });
    
    // Split on sentence endings and use <br> tags for line breaks
    const sentences = processedText.split(/([.!?]+\s*)/).filter(segment => segment.trim() !== '');
    const result: React.ReactNode[] = [];
    let currentSentence = '';
    
    sentences.forEach((segment, index) => {
      if (segment.match(/^[.!?]+\s*$/)) {
        // This is punctuation + spacing
        currentSentence += segment;
        
        // Restore decimal points and abbreviations
        let restoredSentence = currentSentence.replace(new RegExp(decimalPlaceholder, 'g'), '.');
        
        abbreviations.forEach((abbrev, abbrevIndex) => {
          const abbrevRegex = new RegExp(`${abbreviationPlaceholder}${abbrevIndex}${abbreviationPlaceholder}`, 'g');
          restoredSentence = restoredSentence.replace(abbrevRegex, abbrev);
        });
        
        // Add the sentence with math formatting
        result.push(...formatMathText(restoredSentence.trim()));
        
        // Add line break after each sentence (except the last one)
        if (index < sentences.length - 1) {
          result.push(<br key={`br-${index}`} />);
        }
        
        currentSentence = '';
      } else {
        // This is sentence content
        currentSentence += segment;
      }
    });
    
    // Handle any remaining content without sentence ending
    if (currentSentence.trim()) {
      let restoredSentence = currentSentence.replace(new RegExp(decimalPlaceholder, 'g'), '.');
      
      abbreviations.forEach((abbrev, abbrevIndex) => {
        const abbrevRegex = new RegExp(`${abbreviationPlaceholder}${abbrevIndex}${abbreviationPlaceholder}`, 'g');
        restoredSentence = restoredSentence.replace(abbrevRegex, abbrev);
      });
      
      result.push(...formatMathText(restoredSentence.trim()));
    }
    
    return result.length > 0 ? result : formatMathText(text);
  };

  const formatTextWithSentenceBreaks = (text: string): React.ReactNode[] => {
    // Split text into sentences, but avoid splitting on decimal points and abbreviations
    const decimalPlaceholder = '###DECIMAL###';
    const abbreviationPlaceholder = '###ABBREV###';
    
    // First, temporarily replace decimal points with a placeholder
    let processedText = text.replace(/(\d)\.(\d)/g, `$1${decimalPlaceholder}$2`);
    
    // Then, temporarily replace common abbreviations that end with periods
    const abbreviations = [
      'e.g.', 'i.e.', 'etc.', 'vs.', 'cf.', 'viz.',
      'Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Sr.', 'Jr.',
      'Inc.', 'Corp.', 'Ltd.', 'Co.', 'Ave.', 'St.',
      'approx.', 'est.', 'max.', 'min.', 'no.', 'vol.',
      'ch.', 'fig.', 'p.', 'pp.', 'ed.', 'eds.'
    ];
    
    abbreviations.forEach((abbrev, index) => {
      const regex = new RegExp(`\\b${abbrev.replace(/\./g, '\\.')}`, 'gi');
      processedText = processedText.replace(regex, `${abbreviationPlaceholder}${index}${abbreviationPlaceholder}`);
    });
    
    // Now split on sentence endings
    const sentences = processedText.split(/([.!?]+\s*)/).filter(segment => segment.trim() !== '');
    const formattedSentences: React.ReactNode[] = [];
    
    let currentSentence = '';
    
    sentences.forEach((segment, index) => {
      if (segment.match(/^[.!?]+\s*$/)) {
        // This is punctuation + spacing
        currentSentence += segment;
        
        // End of sentence - restore decimal points and abbreviations, then format
        let restoredSentence = currentSentence.replace(new RegExp(decimalPlaceholder, 'g'), '.');
        
        // Restore abbreviations
        abbreviations.forEach((abbrev, abbrevIndex) => {
          const abbrevRegex = new RegExp(`${abbreviationPlaceholder}${abbrevIndex}${abbreviationPlaceholder}`, 'g');
          restoredSentence = restoredSentence.replace(abbrevRegex, abbrev);
        });
        
        formattedSentences.push(
          <span key={`sentence-${index}`}>
            {formatMathText(restoredSentence)}
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
      let restoredSentence = currentSentence.replace(new RegExp(decimalPlaceholder, 'g'), '.');
      
      // Restore abbreviations
      abbreviations.forEach((abbrev, abbrevIndex) => {
        const abbrevRegex = new RegExp(`${abbreviationPlaceholder}${abbrevIndex}${abbreviationPlaceholder}`, 'g');
        restoredSentence = restoredSentence.replace(abbrevRegex, abbrev);
      });
      
      formattedSentences.push(
        <span key={`final-sentence`}>
          {formatMathText(restoredSentence)}
        </span>
      );
    }
    
    return formattedSentences.length > 0 ? formattedSentences : [formatMathText(text)];
  };

  const formatMathText = (text: string): React.ReactNode[] => {
    const segments: React.ReactNode[] = [];
    let lastIndex = 0;

    // Balanced patterns for mathematical expressions - comprehensive but not over-greedy
    // Note: (?:[0-9]+(?:\s[0-9]+)*) matches numbers with spaces like "20 053"
    const mathPatterns = [
      // Complex expressions with parentheses and multiple operations like "14000 ÷ 4 = (12000 ÷ 4) + (2000 ÷ 4)"
      /((?:[0-9]+(?:\s[0-9]+)*)\s*[÷\/×\*\+\-]\s*(?:[0-9]+(?:\s[0-9]+)*)\s*=\s*\((?:[0-9]+(?:\s[0-9]+)*)\s*[÷\/×\*\+\-]\s*(?:[0-9]+(?:\s[0-9]+)*)\)\s*[÷\/×\*\+\-]\s*\((?:[0-9]+(?:\s[0-9]+)*)\s*[÷\/×\*\+\-]\s*(?:[0-9]+(?:\s[0-9]+)*)\))/g,
      
      // Equations with multiple equals like "= 3000+ 500 = 3500"
      /(=\s*(?:[0-9]+(?:\s[0-9]+)*)\s*[\+\-×\*÷\/]\s*(?:[0-9]+(?:\s[0-9]+)*)\s*=\s*(?:[0-9]+(?:\s[0-9]+)*))/g,
      
      // Mathematical expressions with text variables like "Total candles = S+ L = S + (S + 21) = 2S + 21"
      /([A-Za-z\s]+[a-zA-Z]\s*=\s*[a-zA-Z0-9\s\+\-×\*÷\/\(\)]+\s*=\s*[a-zA-Z0-9\s\+\-×\*÷\/\(\)]+\s*=\s*[a-zA-Z0-9\s\+\-×\*÷\/]+[.]*)/g,
      
      // Cost expressions like "Cost of long candles = 7 boxes ×$3.20/box =$22.40"
      /([A-Za-z\s]+[a-zA-Z]\s*=\s*(?:[0-9]+(?:\s[0-9]+)*)\s+[a-zA-Z]+\s*[×\*]\s*\$(?:[0-9]+(?:\s[0-9]+)*)\.[0-9]+\/[a-zA-Z]+\s*=\s*\$(?:[0-9]+(?:\s[0-9]+)*)\.[0-9]+)/g,
      
      // Simple comparison expressions like "2S < 29", "Total candles < 50"
      /([A-Za-z\s]*[a-zA-Z0-9]+\s*[<>≤≥≠]\s*(?:[0-9]+(?:\s[0-9]+)*)(?:\.[0-9]+)?[.]*)/g,
      
      // Simple variable equations like "L = S + 21"
      /([a-zA-Z]+\s*=\s*[a-zA-Z]+\s*[\+\-×\*÷\/]\s*(?:[0-9]+(?:\s[0-9]+)*)[.]*)/g,
      
      // Arithmetic with parentheses like "(12000 ÷ 4)", "(2000 ÷ 4)"
      /(\((?:[0-9]+(?:\s[0-9]+)*)\s*[÷\/×\*\+\-]\s*(?:[0-9]+(?:\s[0-9]+)*)\))/g,
      
      // Currency amounts like "$3.20/box", "$22.40"
      /(\$(?:[0-9]+(?:\s[0-9]+)*)\.[0-9]+(?:\/[a-zA-Z]+)?)/g,
      
      // Simple arithmetic like "3000+ 500", "35 ÷ 5", "20 053 + 5000"
      /((?:[0-9]+(?:\s[0-9]+)*)\s*[\+\-×\*÷\/]\s*(?:[0-9]+(?:\s[0-9]+)*))/g,
      
      // Standalone spaced numbers like "20 053", "1 234 567"
      /((?:[0-9]+(?:\s[0-9]+)+))/g,
      
      // Complex arithmetic expressions with equals like "32 × 7 = 224", "230 - 224 = 6"
      /(\b[0-9]+\s*[×\*÷\/\+\-]\s*[0-9]+\s*=\s*[0-9]+)/g,
      
      // Simple comparison expressions like "49 < 50", "x > 10", "5 ≤ y"
      /(\b[0-9]+\s*[<>≤≥≠]\s*[0-9]+|\b[a-zA-Z]\s*[<>≤≥≠]\s*[0-9]+|\b[0-9]+\s*[<>≤≥≠]\s*[a-zA-Z])/g,
      
      // Mathematical expressions with text like "32 blocks × 4 numbers/block", "Numbers in full blocks + Numbers"
      /(\b[0-9]+\s+[a-zA-Z]+\s*[×\*÷\/\+\-]\s*[0-9]+\s+[a-zA-Z]+(?:\/[a-zA-Z]+)?)/g,
      
      // Complex equations with multiple terms like "6W = 5M", "10 * (3÷5)W = 10 * (1÷2)M"
      /([a-zA-Z]\w*\s*[=]\s*[\d\w\s\+\-\*\/\÷\(\)\.]+|[\d\w\s\+\-\*\/\÷\(\)\.]+\s*[=]\s*[a-zA-Z]\w*)/g,
      
      // Mathematical expressions in parentheses like (3÷5)W, (1÷2)M
      /(\([^)]*[÷\/\+\-\*][^)]*\)[a-zA-Z]+)/g,
      
      // Fractions in parentheses like (3÷5), (1÷2), (2/5)
      /(\([0-9]+[÷\/][0-9]+\))/g,
      
      // Numbers with units including punctuation like "131 numbers.", "5 units,"
      /(\b[0-9]+\s*(?:units?|numbers?|blocks?|cm|mm|m|km|inches?|ft|feet|seconds?|minutes?|hours?|u)[.,;!?\)])/g,
      
      // Equations with results including punctuation like "= 7.", "= 131 numbers.", "= 224,"
      /(=\s*[0-9]+(?:\.[0-9]+)?\s*[a-zA-Z]*[.,;!?\)]*)/g,
      
      // Simple fractions like 2÷5, 3/4, 1÷2
      /(\b[0-9]+[÷\/][0-9]+\b)/g,
      
      // Expressions with multiple operations like "5 + 3", "10 - 4", "6 * 2" (only if not caught by longer patterns)
      /(\b[0-9]+\s*[\+\-\*×÷]\s*[0-9]+\b)/g,
      
      // Variables with coefficients like 3W, 5u, 6M, 2x (only standalone)
      /(\b[0-9]+[a-zA-Z]+\b)/g,
      
      // Numbers followed by punctuation at end of expressions like "7.", "224,", "6)."
      /(\b[0-9]+(?:\.[0-9]+)?[.,;!?\)]+(?=\s|$))/g,
      
      // Single variables in mathematical context (standalone W, M, u, x, y, etc.)
      /(\b[A-Z]\b|\b[a-z]\b(?=\s*[=\+\-\*÷\/])|(?<=[=\+\-\*÷\/]\s*)\b[a-z]\b)/g,
      
      // Mathematical operations like "cross-multiply", "LCM", "GCD"
      /\b(LCM|GCD|cross-multiply|multiply|divide|add|subtract)\b/gi,
      
      // Percentages like "25%", "50%"
      /(\b[0-9]+(?:\.[0-9]+)?%)/g,
      
      // Degrees and angles like "180°", "∠ABC", "50°"
      /(∠[A-Z]+\s*[=]?\s*[0-9]+°?|\b[0-9]+°)/g,
      
      // Mathematical symbols and notation
      /(≤|≥|≠|±|∞|√|∑|∏|∫|∂|∆|π|θ|α|β|γ|δ|ε|φ|ψ|ω)/g,
      
      // Currency with variables like "$5x", "$504"
      /(\$[0-9]+[a-zA-Z]*)/g,
      
      // Ratios like "5:3", "2:1"
      /(\b[0-9]+:[0-9]+\b)/g,
      
      // Decimal numbers in mathematical context
      /(\b[0-9]+\.[0-9]+\b)/g,
      
      // Powers and exponents like "x²", "2³", "10^2"
      /([a-zA-Z0-9]+[\^²³⁴⁵⁶⁷⁸⁹⁰]+[a-zA-Z0-9]*|[a-zA-Z0-9]+[₀₁₂₃₄₅₆₇₈₉]+)/g
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
          className="font-mono bg-purple-50 px-2 py-1 rounded-md text-purple-700 font-semibold border border-purple-200 shadow-sm"
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
      // Convert division slash to division symbol (but preserve text like "numbers/block")
      .replace(/(\d)\s*\/\s*(\d)/g, '$1 ÷ $2')
      // Convert multiplication symbol alternatives
      .replace(/\*/g, '×')
      // Add spaces around operators for better readability (but not inside parentheses)
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
      {formatExplanation(explanation)}
    </div>
  );
};

export default ExplanationFormatter; 