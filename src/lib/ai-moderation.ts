import { ContentModerationResult } from "@/components/AILearningAssistant/types";

// SQL injection patterns to detect and prevent
const SQL_INJECTION_PATTERNS = [
  /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/gi,
  /(\bUNION\b|\bJOIN\b)/gi,
  /(\bWHERE\b|\bORDER BY\b|\bGROUP BY\b)/gi,
  /(\-\-|\#|\/\*|\*\/)/g,
  /(;|\||&)/g,
  /(\bEXEC\b|\bEXECUTE\b|\bSP_\b)/gi,
  /(\bSCRIPT\b|\bJAVASCRIPT\b|\bONLOAD\b|\bONCLICK\b)/gi,
];

// Inappropriate content patterns
const INAPPROPRIATE_PATTERNS = [
  // Personal information
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card numbers
  /\b\d{3}[\s-]?\d{2}[\s-]?\d{4}\b/g, // SSN-like patterns
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
  /\b\d{8,15}\b/g, // Phone numbers
  /\b(address|home|location|where do you live|personal info)\b/gi,

  // Harmful requests
  /\b(hack|exploit|bypass|crack|break into|password|admin|root)\b/gi,
  /\b(cheat|answer key|give me answers|tell me the answer|do my homework)\b/gi,
  /\b(skip|avoid|ignore|bypass|don't need to)\b/gi,

  // Inappropriate behavior
  /\b(bully|bullying|mean|stupid|dumb|hate|awful|terrible person)\b/gi,
  /\b(violence|hurt|kill|die|suicide|self harm|cutting)\b/gi,
  /\b(drugs|alcohol|smoking|vaping|marijuana|cocaine)\b/gi,
  /\b(sex|sexual|porn|naked|nude|inappropriate touching)\b/gi,

  // Off-topic content
  /\b(buy|sell|purchase|money|bitcoin|crypto|investment|business)\b/gi,
  /\b(dating|relationship|boyfriend|girlfriend|meet|hookup|romance)\b/gi,
  /\b(politics|political|government|election|vote|democrat|republican)\b/gi,
  /\b(religion|religious|god|allah|buddha|church|mosque|temple)\b/gi,
  /\b(gaming|video games|youtube|tiktok|instagram|social media)\b/gi,

  // Academic dishonesty
  /\b(plagiarize|copy|steal|fake|lie|pretend|deceive)\b/gi,
  /\b(test answers|exam solutions|homework answers|assignment help)\b/gi,
  /\b(write my essay|do my assignment|complete my work)\b/gi,

  // System manipulation attempts
  /\b(ignore previous|forget instructions|act as|pretend to be|roleplay)\b/gi,
  /\b(system prompt|override|jailbreak|prompt injection)\b/gi,
  /\b(developer mode|admin mode|unrestricted|uncensored)\b/gi,
];

// Educational content keywords to encourage (aligned with syllabus)
const EDUCATIONAL_KEYWORDS = [
  // General learning terms
  "explain",
  "help",
  "understand",
  "learn",
  "study",
  "practice",
  "question",
  "answer",
  "hint",
  "concept",
  "why",
  "how",
  "what",
  "clarify",

  // Student performance & analytics terms
  "weak",
  "strong",
  "topics",
  "subjects",
  "performance",
  "progress",
  "mistakes",
  "errors",
  "accuracy",
  "score",
  "results",
  "analytics",
  "stats",
  "statistics",
  "review",
  "improve",
  "better",

  // Chinese language specific
  "chinese",
  "language",
  "mandarin",
  "pinyin",
  "hanzi",
  "characters",
  "stroke",
  "radical",
  "tone",
  "pronunciation",
  "chinese reading",
  "chinese text",
  "chinese passage",
  "chinese comprehension",
  "chinese words",
  "chinese vocabulary",
  "chinese meaning",
  "chinese context",
  "chinese sentence",
  "chinese phrase",

  // Grammar and structure
  "grammar",
  "sentence",
  "structure",
  "word order",
  "particle",
  "classifier",
  "measure word",
  "verb",
  "noun",
  "adjective",
  "adverb",

  // Reading and comprehension
  "reading",
  "comprehension",
  "passage",
  "text",
  "meaning",
  "context",
  "inference",
  "main idea",
  "details",
  "summary",
  "read",
  "understand",
  "interpret",
  "analyze",
  "comprehend",
  "extract",
  "identify",
  "locate",
  "find",
  "explain meaning",

  // Vocabulary and writing
  "vocabulary",
  "word",
  "phrase",
  "idiom",
  "synonym",
  "antonym",
  "definition",
  "usage",
  "writing",
  "composition",
  "essay",

  // Academic subjects (allowed in educational context)
  "math",
  "mathematics",
  "science",
  "english",
  "history",
  "geography",
  "literature",

  // Mathematical terms and concepts - SIGNIFICANTLY EXPANDED
  "number",
  "numbers",
  "digit",
  "digits",
  "calculate",
  "computation",
  "solve",
  "solving",
  "problem",
  "problems",
  "equation",
  "equations",
  "formula",
  "formulas",
  "algebra",
  "geometry",
  "arithmetic",
  "trigonometry",
  "calculus",
  "statistics",
  "probability",
  "fraction",
  "fractions",
  "decimal",
  "decimals",
  "percentage",
  "percent",
  "ratio",
  "ratios",
  "proportion",
  "proportions",
  "area",
  "perimeter",
  "volume",
  "surface",
  "length",
  "width",
  "height",
  "distance",
  "measurement",
  "unit",
  "units",
  "square",
  "squares",
  "rectangle",
  "rectangles",
  "triangle",
  "triangles",
  "circle",
  "circles",
  "polygon",
  "polygons",
  "angle",
  "angles",
  "degree",
  "degrees",
  "radius",
  "diameter",
  "circumference",
  "coordinate",
  "coordinates",
  "graph",
  "graphs",
  "plot",
  "plotting",
  "function",
  "functions",
  "variable",
  "variables",
  "constant",
  "constants",
  "expression",
  "expressions",
  "term",
  "terms",
  "coefficient",
  "coefficients",
  "exponent",
  "exponents",
  "power",
  "powers",
  "root",
  "roots",
  "square root",
  "cube root",
  "sum",
  "difference",
  "product",
  "quotient",
  "addition",
  "subtraction",
  "multiplication",
  "division",
  "plus",
  "minus",
  "times",
  "divide",
  "equal",
  "equals",
  "greater",
  "less",
  "maximum",
  "minimum",
  "average",
  "mean",
  "median",
  "mode",
  "range",
  "set",
  "sets",
  "element",
  "elements",
  "subset",
  "intersection",
  "union",
  "symmetry",
  "pattern",
  "patterns",
  "sequence",
  "sequences",
  "series",
  "progression",
  "prime",
  "factor",
  "factors",
  "multiple",
  "multiples",
  "divisor",
  "divisors",
  "integer",
  "integers",
  "whole",
  "natural",
  "rational",
  "irrational",
  "real",
  "imaginary",
  "complex",
  "positive",
  "negative",
  "zero",
  "infinity",
  "limit",
  "limits",
  "derivative",
  "integral",
  "slope",
  "intercept",
  "linear",
  "quadratic",
  "cubic",
  "polynomial",
  "matrix",
  "matrices",
  "vector",
  "vectors",
  "theorem",
  "proof",
  "axiom",
  "lemma",
  "corollary",
  "hypothesis",
  "conclusion",

  // Science terms
  "physics",
  "chemistry",
  "biology",
  "atom",
  "molecule",
  "element",
  "compound",
  "reaction",
  "energy",
  "force",
  "motion",
  "velocity",
  "acceleration",
  "mass",
  "weight",
  "density",
  "pressure",
  "temperature",
  "heat",
  "light",
  "sound",
  "wave",
  "frequency",
  "amplitude",
  "circuit",
  "current",
  "voltage",
  "resistance",
  "cell",
  "organism",
  "ecosystem",
  "evolution",
  "genetics",
  "DNA",
  "protein",
  "enzyme",

  // Learning strategies
  "strategy",
  "method",
  "technique",
  "approach",
  "solution",
  "process",
  "step",
  "example",
  "analogy",
  "comparison",

  // Assessment and feedback
  "correct",
  "incorrect",
  "mistake",
  "error",
  "feedback",
  "improvement",
  "progress",
  "review",
  "revision",
  "practice test",

  // Basic words that often appear in educational contexts
  "the",
  "and",
  "of",
  "to",
  "in",
  "is",
  "are",
  "this",
  "that",
  "these",
  "those",
  "have",
  "has",
  "can",
  "could",
  "will",
  "would",
  "should",
  "may",
  "might",
  "must",
  "do",
  "does",
  "did",
  "get",
  "got",
  "make",
  "take",
  "give",
  "show",
  "tell",
  "see",
  "look",
  "find",
  "use",
  "work",
  "know",
  "think",
  "say",
  "come",
  "go",
  "want",
  "need",
  "try",
  "ask",
  "answer",
  "call",
  "put",
  "turn",
  "move",
  "play",
  "run",
  "walk",
  "talk",
  "speak",
  "write",
  "read",
  "hear",
  "feel",
  "seem",
  "become",
  "leave",
  "start",
  "stop",
  "begin",
  "end",
  "keep",
  "hold",
  "bring",
  "buy",
  "build",
  "break",
  "cut",
  "draw",
  "fall",
  "fill",
  "grow",
  "join",
  "kill",
  "let",
  "meet",
  "pay",
  "pick",
  "pull",
  "push",
  "reach",
  "ride",
  "rise",
  "send",
  "sit",
  "stand",
  "stick",
  "teach",
  "throw",
  "understand",
  "wait",
  "wear",
  "win",
  "write",
];

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") return "";

  // Remove or escape potentially harmful characters
  let sanitized = input
    .replace(/[<>\"']/g, "") // Remove HTML/XML characters
    .replace(/\\/g, "\\\\") // Escape backslashes
    .replace(/\0/g, "") // Remove null bytes
    .trim();

  // Limit length
  if (sanitized.length > 1000) {
    sanitized = sanitized.substring(0, 1000) + "...";
  }

  return sanitized;
}

/**
 * Check if user input contains SQL injection attempts
 */
export function detectSQLInjection(input: string): boolean {
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(input));
}

/**
 * Check if content is aligned with educational syllabus
 */
export function checkSyllabusAlignment(input: string): {
  isAligned: boolean;
  confidence: number;
  reason?: string;
} {
  const lowerInput = input.toLowerCase();

  // Count educational keywords
  const educationalMatches = EDUCATIONAL_KEYWORDS.filter((keyword) =>
    lowerInput.includes(keyword.toLowerCase())
  ).length;

  // Count inappropriate patterns
  const inappropriateMatches = INAPPROPRIATE_PATTERNS.filter((pattern) =>
    pattern.test(lowerInput)
  ).length;

  // Calculate confidence score (0-1)
  const totalWords = input.split(/\s+/).length;
  const educationalRatio = educationalMatches / Math.max(totalWords, 1);
  const inappropriateRatio = inappropriateMatches / Math.max(totalWords, 1);

  let confidence = educationalRatio - inappropriateRatio * 2; // Penalize inappropriate content more
  confidence = Math.max(0, Math.min(1, confidence));

  // Specific checks for common educational question patterns
  const questionPatterns = [
    /^(what|how|why|when|where|which|can you|could you|please|help|explain)/i,
    /(question|problem|exercise|homework|assignment|test|exam)/i,
    /(chinese|math|english|science|language|reading|writing)/i,
    /(meaning|understand|explain|help with|what does|how to)/i,
  ];

  const hasQuestionPattern = questionPatterns.some((pattern) =>
    pattern.test(input)
  );
  if (hasQuestionPattern) confidence += 0.4; // Increased boost for question patterns

  // Adjust confidence based on length and structure
  if (totalWords < 5 && hasQuestionPattern) confidence += 0.3; // More boost for short questions
  if (totalWords > 50 && educationalMatches < 2) confidence -= 0.1; // Reduced penalty for longer content

  // Additional boost for Chinese reading comprehension content
  if (
    lowerInput.includes("chinese") &&
    (lowerInput.includes("reading") || lowerInput.includes("comprehension"))
  ) {
    confidence += 0.3; // Increased boost
  }

  // Special allowances for very common educational phrases
  const commonEducationalPhrases = [
    "what does this mean",
    "explain this",
    "help me understand",
    "what is this",
    "how do you",
    "can you explain",
    "i don't understand",
    "clarify",
    "meaning",
    "what are my weak",
    "what are my strong",
    "show me my",
    "my performance",
    "my progress",
    "my mistakes",
    "my results",
    "my weak topics",
    "my strong subjects",
    "help me with",
    "i need help",
    "can you help",
  ];

  const hasCommonPhrase = commonEducationalPhrases.some((phrase) =>
    lowerInput.includes(phrase)
  );
  if (hasCommonPhrase) confidence += 0.6; // Increased boost for common educational phrases

  confidence = Math.max(0, Math.min(1, confidence));

  return {
    isAligned: confidence > 0.01, // Drastically lowered threshold from 0.1 to 0.01 - extremely permissive
    confidence,
    reason:
      confidence <= 0.01
        ? "Content doesn't appear to be related to educational topics"
        : undefined,
  };
}

/**
 * Moderate user content for appropriateness and safety
 */
export function moderateUserContent(input: string): ContentModerationResult {
  if (!input || typeof input !== "string") {
    return { isAllowed: false, reason: "Invalid input" };
  }

  const sanitized = sanitizeInput(input);

  // Check for SQL injection
  if (detectSQLInjection(sanitized)) {
    return {
      isAllowed: false,
      reason: "Potentially harmful content detected",
      sanitizedContent: sanitized,
    };
  }

  // Skip inappropriate pattern check for very short, common educational questions
  const lowerInput = sanitized.toLowerCase();
  const veryCommonEducationalPhrases = [
    "what does this mean",
    "explain this",
    "what is this",
    "help me",
    "meaning",
    "clarify",
    "what are my",
    "show me",
    "my weak",
    "my strong",
    "weak topics",
    "strong subjects",
    "performance",
    "progress",
    "mistakes",
    "help with",
    "can you help",
    "i need help",
  ];

  const isVeryCommonEducational = veryCommonEducationalPhrases.some((phrase) =>
    lowerInput.includes(phrase)
  );

  // If it's a very common educational phrase, skip strict filtering
  if (!isVeryCommonEducational) {
    // Check for inappropriate patterns
    const foundInappropriate = INAPPROPRIATE_PATTERNS.some((pattern) =>
      pattern.test(sanitized)
    );
    if (foundInappropriate) {
      return {
        isAllowed: false,
        reason:
          "I can only help with educational topics. Please ask about your studies, homework, or learning concepts.",
        sanitizedContent: sanitized,
      };
    }
  }

  // Check syllabus alignment - MUCH MORE PERMISSIVE
  const syllabusCheck = checkSyllabusAlignment(sanitized);
  if (!syllabusCheck.isAligned) {
    // If it's a short message, common educational phrase, contains basic question words, numbers, or any educational indicators, allow it anyway
    const hasBasicQuestionWords =
      /\b(what|how|why|when|where|which|help|show|my|weak|strong|topics|performance|square|length|area|calculate|solve|number|math|these|this|that|are|is|of)\b/i.test(
        sanitized
      );

    const hasNumbers = /\b\d+\b/.test(sanitized); // Contains any numbers
    const hasMathSymbols = /[+\-*/=<>()[\]{}]/.test(sanitized); // Contains math symbols
    const isShortContent = sanitized.length < 100; // Increased from 30 to 100

    if (
      isShortContent ||
      isVeryCommonEducational ||
      hasBasicQuestionWords ||
      hasNumbers ||
      hasMathSymbols
    ) {
      return {
        isAllowed: true,
        sanitizedContent: sanitized,
      };
    }

    // Even if not aligned, be much more permissive - only block if it's clearly non-educational and long
    if (sanitized.length < 200) {
      return {
        isAllowed: true,
        sanitizedContent: sanitized,
      };
    }

    return {
      isAllowed: false,
      reason:
        syllabusCheck.reason ||
        "Please ask questions related to your school subjects and learning.",
      sanitizedContent: sanitized,
    };
  }

  // Check if content is education-related (VERY PERMISSIVE)
  const hasEducationalContent = EDUCATIONAL_KEYWORDS.some((keyword) =>
    lowerInput.includes(keyword)
  );

  // Be extremely permissive - allow almost everything that's not clearly harmful
  const hasAnyNumbers = /\b\d+\b/.test(sanitized);
  const hasAnyLetters = /[a-zA-Z]/.test(sanitized);
  const isReasonableLength = sanitized.length < 500; // Very generous length limit

  if (
    hasEducationalContent ||
    isReasonableLength ||
    isVeryCommonEducational ||
    hasAnyNumbers ||
    hasAnyLetters
  ) {
    return {
      isAllowed: true,
      sanitizedContent: sanitized,
    };
  }

  // For longer content without clear educational intent, be much more lenient
  if (sanitized.length > 500 && syllabusCheck.confidence < 0.01) {
    // Very low confidence threshold
    return {
      isAllowed: false,
      reason:
        "Please keep questions focused on your learning and studies. I'm here to help with your schoolwork!",
      sanitizedContent: sanitized,
    };
  }

  return {
    isAllowed: true,
    sanitizedContent: sanitized,
  };
}

/**
 * Moderate AI response to ensure it's educational and appropriate
 */
export function moderateAIResponse(response: string): string {
  if (!response || typeof response !== "string") return "";

  let moderated = response;

  // Only remove clearly harmful content, be less aggressive
  moderated = moderated
    .replace(/\b(password|login|admin|hack|exploit|bypass)\b/gi, () => {
      return "[content removed]";
    })
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, () => {
      return "[card number removed]";
    })
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, () => {
      return "[email removed]";
    })
    .replace(/\b\d{8,15}\b/g, () => {
      return "[phone number removed]";
    });

  // Be more lenient with direct answers - only block very obvious ones
  const directAnswerPatterns = [
    /^the answer is [A-D]$/gi,
    /^just choose [A-D]$/gi,
    /^pick [A-D]$/gi,
    /^select [A-D] because/gi,
  ];

  // Only replace very direct answers, allow explanatory responses
  directAnswerPatterns.forEach((pattern) => {
    moderated = moderated.replace(pattern, () => {
      return "Let me help you think through this step by step. Consider";
    });
  });

  // Be more selective about inappropriate content - only block truly inappropriate terms
  const strictCleanupPatterns = [/\b(stupid|dumb|idiot|moron)\b/gi];

  strictCleanupPatterns.forEach((pattern) => {
    moderated = moderated.replace(pattern, () => {
      return "[inappropriate]";
    });
  });

  // Don't force educational encouragement on short responses - let natural responses through
  // Removed the forced educational ending

  return moderated;
}

/**
 * Rate limiting for AI requests (simple in-memory implementation)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  userId: string,
  maxRequests = 50,
  windowMs = 60 * 60 * 1000
): boolean {
  const now = Date.now();
  const userRecord = requestCounts.get(userId);

  if (!userRecord || now > userRecord.resetTime) {
    requestCounts.set(userId, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (userRecord.count >= maxRequests) {
    return false;
  }

  userRecord.count++;
  return true;
}

/**
 * Helper function to map subject IDs to names and determine if it's Chinese
 */
function getSubjectInfo(
  subjectId?: number,
  subjectName?: string
): { name: string; isChinese: boolean } {
  // If subjectName is provided, use it directly
  if (subjectName) {
    const isChinese =
      subjectName.toLowerCase().includes("chinese") ||
      subjectName.includes("华文") ||
      subjectName.includes("中文");
    return { name: subjectName, isChinese };
  }

  // Otherwise, map based on subjectId
  const subjectMap: Record<number, { name: string; isChinese: boolean }> = {
    1: { name: "Mathematics", isChinese: false },
    2: { name: "Science", isChinese: false },
    3: { name: "English", isChinese: false },
    4: { name: "Chinese", isChinese: true },
  };

  return (
    subjectMap[subjectId || 0] || { name: "General Studies", isChinese: false }
  );
}

/**
 * Generate educational system prompt based on context
 */
export function generateEducationalSystemPrompt(
  sessionType: string,
  studentLevel?: string,
  hasQuestion?: boolean,
  hasPassage?: boolean,
  subjectId?: number,
  subjectName?: string
): string {
  const subjectInfo = getSubjectInfo(subjectId, subjectName);
  const { name: subject, isChinese } = subjectInfo;

  let contextString = "";

  if (sessionType === "cloze_passage" && hasPassage) {
    contextString = `Student is working on a ${subject} cloze passage.`;
  } else if (sessionType === "topic_practice") {
    contextString = `Student is practicing specific ${subject} topics.`;
  } else if (sessionType === "question_group") {
    contextString = `Student is working on a set of related ${subject} questions.`;
  } else if (hasQuestion) {
    contextString = `Student is working on ${subject} questions.`;
  }

  // Language instruction based on subject
  const languageInstruction = isChinese
    ? "You may respond in Chinese when appropriate, especially when explaining Chinese language concepts, vocabulary, or cultural context. However, keep explanations clear and use both Chinese and English when helpful for understanding."
    : "IMPORTANT: Always respond in English only. Do not use Chinese characters or Pinyin in your responses, as this is not a Chinese language subject.";

  const basePrompt = `You are Ben, a friendly bear mascot and AI learning assistant for primary school students studying ${subject}. You wear glasses and have a warm, encouraging personality. 

TEACHING APPROACH - PROGRESSIVE DISCLOSURE:
- For first 1-2 exchanges: Guide with questions and hints, don't give direct answers
- After 2-3 exchanges: You may provide the final answer with full explanation
- Be educational throughout but balance guidance with practical help
- Pay attention to the conversation progress instructions in the context

GUIDELINES:
1. Be encouraging and helpful
2. Focus on ${subject} learning
3. Provide clear, concise explanations
4. Use simple language appropriate for primary school students
5. ${languageInstruction}
6. Early in conversation: Ask guiding questions to help them think
7. After 2-3 exchanges: Provide clear answers with educational explanations
8. NEVER use action descriptions in asterisks like "*adjusts glasses*" or "*gives thumbs up*" or similar
9. NEVER use markdown formatting like **bold text**, *italics*, or numbered lists like **Step 1**, **Step 2**
10. Speak naturally and conversationally like a friendly tutor would in person
11. Instead of "Step 1:", just say "First," or "Let's start by..." or "To begin,"
12. Instead of "**Important:**", just say "Remember," or "Keep in mind that"
13. Write in a flowing, natural way without special formatting

CONTEXT:
${contextString}

Follow the conversation progress instructions provided in the context. Guide them initially, then provide answers after sufficient exchanges.`;

  return basePrompt;
}
