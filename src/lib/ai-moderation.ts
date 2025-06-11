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
  if (lowerInput.includes("chinese") && (lowerInput.includes("reading") || lowerInput.includes("comprehension"))) {
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
    "meaning"
  ];

  const hasCommonPhrase = commonEducationalPhrases.some((phrase) =>
    lowerInput.includes(phrase)
  );
  if (hasCommonPhrase) confidence += 0.4; // Big boost for common educational phrases

  confidence = Math.max(0, Math.min(1, confidence));

  return {
    isAligned: confidence > 0.2, // Lowered threshold from 0.3 to 0.2
    confidence,
    reason:
      confidence <= 0.2
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
    "clarify"
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

  // Check syllabus alignment
  const syllabusCheck = checkSyllabusAlignment(sanitized);
  if (!syllabusCheck.isAligned) {
    // If it's a very short message or common educational phrase, allow it anyway
    if (sanitized.length < 20 || isVeryCommonEducational) {
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

  // Check if content is education-related (enhanced)
  const hasEducationalContent = EDUCATIONAL_KEYWORDS.some((keyword) =>
    lowerInput.includes(keyword)
  );

  // Allow educational content or short general questions or common phrases
  if (hasEducationalContent || sanitized.length < 50 || isVeryCommonEducational) {
    return {
      isAllowed: true,
      sanitizedContent: sanitized,
    };
  }

  // For longer content without clear educational intent, be more lenient
  if (sanitized.length > 150 && syllabusCheck.confidence < 0.3) { // Lowered from 0.5 to 0.3
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

  // Log the original response for debugging
  console.log("Original AI Response:", response);

  // Only remove clearly harmful content, be less aggressive
  moderated = moderated
    .replace(
      /\b(password|login|admin|hack|exploit|bypass)\b/gi,
      (match) => {
        console.log("Blocked potentially harmful content:", match);
        return "[content removed]";
      }
    )
    .replace(
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
      (match) => {
        console.log("Blocked card number:", match);
        return "[card number removed]";
      }
    )
    .replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      (match) => {
        console.log("Blocked email:", match);
        return "[email removed]";
      }
    )
    .replace(/\b\d{8,15}\b/g, (match) => {
      console.log("Blocked phone number:", match);
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
    moderated = moderated.replace(pattern, (match) => {
      console.log("Blocked direct answer:", match);
      return "Let me help you think through this step by step. Consider";
    });
  });

  // Be more selective about inappropriate content - only block truly inappropriate terms
  const strictCleanupPatterns = [
    /\b(stupid|dumb|idiot|moron)\b/gi,
  ];

  strictCleanupPatterns.forEach((pattern) => {
    moderated = moderated.replace(pattern, (match) => {
      console.log("Blocked inappropriate term:", match);
      return "[inappropriate]";
    });
  });

  // Don't force educational encouragement on short responses - let natural responses through
  // Removed the forced educational ending

  // Log if the response was modified
  if (moderated !== response) {
    console.log("Modified AI Response:", moderated);
  }

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
 * Generate educational system prompt based on context
 */
export function generateEducationalSystemPrompt(
  sessionType: string,
  studentLevel?: string,
  hasQuestion?: boolean,
  hasPassage?: boolean
): string {
  let contextString = "";
  
  if (sessionType === "cloze_passage" && hasPassage) {
    contextString = "Student is working on a Chinese cloze passage.";
  } else if (sessionType === "topic_practice") {
    contextString = "Student is practicing specific Chinese language topics.";
  } else if (sessionType === "question_group") {
    contextString = "Student is working on a set of related questions.";
  } else if (hasQuestion) {
    contextString = "Student is working on Chinese language questions.";
  }

  const basePrompt = `You are an AI learning assistant for primary school students studying Chinese language. You should:

1. Be encouraging and helpful
2. Focus on Chinese language learning
3. Provide clear explanations
4. Use simple language appropriate for primary school students

CONTEXT:
${contextString}

Respond helpfully to the student's question.`;

  return basePrompt;
}
