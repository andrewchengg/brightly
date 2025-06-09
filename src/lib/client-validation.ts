// Client-side validation for AI tutor input
// This provides immediate feedback to users without making API calls

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  suggestedMessage?: string;
}

// Simple patterns for client-side validation (subset of server patterns)
const CLIENT_INAPPROPRIATE_PATTERNS = [
  // Clear inappropriate content
  /\b(hack|cheat|password|bypass|exploit)\b/gi,
  /\b(stupid|dumb|idiot|hate)\b/gi,
  /\b(violence|hurt|kill|suicide)\b/gi,
  /\b(drug|alcohol|sex|porn)\b/gi,

  // Off-topic requests
  /\b(youtube|tiktok|instagram|gaming|video games)\b/gi,
  /\b(buy|sell|money|bitcoin|business)\b/gi,
  /\b(dating|boyfriend|girlfriend|romance)\b/gi,

  // Academic dishonesty
  /\b(give me answers|tell me the answer|do my homework|write my essay)\b/gi,
  /\b(answer key|test answers|exam solutions)\b/gi,

  // System manipulation
  /\b(ignore previous|forget instructions|act as|pretend to be)\b/gi,
  /\b(system prompt|override|jailbreak)\b/gi,
];

const EDUCATIONAL_KEYWORDS = [
  "explain",
  "help",
  "understand",
  "learn",
  "study",
  "question",
  "answer",
  "hint",
  "chinese",
  "language",
  "grammar",
  "vocabulary",
  "reading",
  "writing",
  "what",
  "how",
  "why",
  "when",
  "where",
  "which",
  "can you",
  "could you",
];

export function validateUserInput(input: string): ValidationResult {
  if (!input || typeof input !== "string") {
    return { isValid: false, reason: "Please enter a message." };
  }

  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return { isValid: false, reason: "Please enter a message." };
  }

  if (trimmed.length > 500) {
    return {
      isValid: false,
      reason: "Please keep your question shorter (maximum 500 characters).",
    };
  }

  // Check for inappropriate content
  const foundInappropriate = CLIENT_INAPPROPRIATE_PATTERNS.some((pattern) =>
    pattern.test(trimmed)
  );

  if (foundInappropriate) {
    return {
      isValid: false,
      reason: "Please ask questions related to your studies and learning.",
      suggestedMessage: "Can you help me understand this question?",
    };
  }

  // Check if input seems educational
  const lowerInput = trimmed.toLowerCase();
  const hasEducationalContent = EDUCATIONAL_KEYWORDS.some((keyword) =>
    lowerInput.includes(keyword.toLowerCase())
  );

  // For very short messages, be more lenient
  if (trimmed.length < 20) {
    return { isValid: true };
  }

  // For longer messages, ensure they have educational content
  if (trimmed.length > 100 && !hasEducationalContent) {
    return {
      isValid: false,
      reason:
        "Please focus your question on learning topics. I'm here to help with your studies!",
      suggestedMessage: "Can you help me with this Chinese language question?",
    };
  }

  return { isValid: true };
}

export function sanitizeUserInput(input: string): string {
  if (!input || typeof input !== "string") return "";

  // Basic sanitization for client-side
  return input
    .trim()
    .replace(/[<>\"']/g, "") // Remove potential HTML/script characters
    .substring(0, 500); // Enforce length limit
}

export function getHelpfulSuggestions(): string[] {
  return [
    "Can you explain this Chinese character?",
    "What does this sentence mean?",
    "How do I solve this reading comprehension question?",
    "Can you help me understand this grammar concept?",
    "What's the meaning of this word in context?",
    "How should I approach this type of question?",
    "Can you give me a hint for this problem?",
    "What reading strategy should I use here?",
  ];
}
