# AI Learning Assistant - Modular & Secure System

## Overview

The AI Learning Assistant is a comprehensive, secure, and modular system designed to provide educational support across all practice sessions in the platform. It includes built-in guardrails to prevent misuse and ensures all interactions remain educational and appropriate.

## 🛡️ Security Features

### Content Moderation

- **SQL Injection Prevention**: Detects and blocks SQL injection attempts
- **Inappropriate Content Filtering**: Prevents off-topic, harmful, or personal information sharing
- **Educational Focus**: Ensures conversations remain focused on learning
- **Input Sanitization**: Cleans user input to prevent XSS and other attacks
- **Output Moderation**: Filters AI responses to ensure they're appropriate

### Rate Limiting

- **50 requests per hour per user** to prevent abuse
- **In-memory tracking** with automatic reset
- **User authentication required** for all requests

### User Protection

- **No direct answers on first request** - encourages thinking
- **Age-appropriate language** for primary school students
- **Character limits** (1000 characters) to prevent spam
- **Real-time content validation** before sending to AI

## 📁 File Structure

```
src/components/AILearningAssistant/
├── AIAssistant.tsx              # Main AI assistant component
├── types.ts                     # TypeScript interfaces and types
├── index.ts                     # Exports and helper functions
├── examples/
│   └── RandomPracticeExample.tsx # Example integration
└── README.md                    # This documentation
```

```
src/lib/
└── ai-moderation.ts            # Security and moderation utilities
```

```
src/app/api/
└── ai-tutor/
    └── route.ts                # Secure API endpoint
```

## 🚀 Quick Start

### 1. Basic Integration

```tsx
import {
  AIAssistant,
  createSessionContext,
  createQuestionContext,
} from "@/components/AILearningAssistant";

function MyPracticeComponent() {
  const sessionContext = createSessionContext(
    "random_practice", // Session type
    10, // Total questions
    5, // Answered questions
    3, // Correct answers
    false // Is completed
  );

  const questionContext = createQuestionContext(
    1, // Question ID
    "What is 2 + 2?", // Question text
    "MULTIPLE_CHOICE", // Question type
    [
      { id: "a", text: "3" },
      { id: "b", text: "4" },
      { id: "c", text: "5" },
    ] // Options
  );

  return (
    <AIAssistant
      questionContext={questionContext}
      sessionContext={sessionContext}
    />
  );
}
```

### 2. With Passage Support (Cloze Passages)

```tsx
import {
  AIAssistant,
  createPassageContext,
} from "@/components/AILearningAssistant";

const passageContext = createPassageContext(
  "小明每天都要上学...", // Passage content
  "小明的一天", // Title
  "Chinese", // Subject
  "Daily Routines" // Topic
);

<AIAssistant
  passageContext={passageContext}
  sessionContext={sessionContext}
  questionContext={questionContext}
/>;
```

## 🔧 API Reference

### Components

#### `AIAssistant`

Main component that provides the chat interface and handles all AI interactions.

**Props:**

- `questionContext?`: Information about the current question
- `passageContext?`: Information about reading passage (for cloze passages)
- `sessionContext`: Information about the practice session (required)
- `className?`: Additional CSS classes
- `disabled?`: Whether the assistant is disabled
- `onMessageSent?`: Callback when user sends a message
- `onResponseReceived?`: Callback when AI responds

### Helper Functions

#### `createSessionContext()`

```tsx
createSessionContext(
  sessionType: 'random_practice' | 'topic_practice' | 'cloze_passage' | 'question_group' | 'mock_exam' | 'weekly_challenge',
  totalQuestions: number,
  answeredQuestions: number,
  correctAnswers: number,
  isCompleted: boolean,
  sessionId?: string,
  studentLevel?: string
): SessionContext
```

#### `createQuestionContext()`

```tsx
createQuestionContext(
  id: string | number,
  text: string,
  questionType: string,
  options?: Array<{ id: string; text: string }>,
  correctAnswer?: string | object,
  explanation?: string,
  hint?: string,
  userAnswer?: string | object,
  isCorrect?: boolean
): QuestionContext
```

#### `createPassageContext()`

```tsx
createPassageContext(
  content: string,
  title?: string,
  subject?: string,
  topic?: string
): PassageContext
```

## 🔄 Migration Guide

### From Old AI System

1. **Remove old imports and state:**

```tsx
// Remove these:
const [chatHistory, setChatHistory] = useState([]);
const [userMessage, setUserMessage] = useState("");
const [isLoadingAI, setIsLoadingAI] = useState(false);
const [aiMessage, setAiMessage] = useState("");
const aiContentRef = useRef(null);
```

2. **Replace old AI chat component:**

```tsx
// Replace old AI chat JSX with:
import {
  AIAssistant,
  createSessionContext,
  createQuestionContext,
} from "@/components/AILearningAssistant";

<AIAssistant
  questionContext={createQuestionContext(/* ... */)}
  sessionContext={createSessionContext(/* ... */)}
/>;
```

3. **Remove old API calls:**

```tsx
// Remove manual fetch calls to /api/ai-tutor
// The new component handles this automatically
```

## 🎯 Session Types

### Random Practice

```tsx
sessionType: "random_practice";
```

For general question practice across multiple topics.

### Topic Practice

```tsx
sessionType: "topic_practice";
```

For focused practice on a specific topic.

### Cloze Passage

```tsx
sessionType: "cloze_passage";
```

For reading comprehension with passage context.

### Question Group

```tsx
sessionType: "question_group";
```

For practicing specific question sets.

### Mock Exam

```tsx
sessionType: "mock_exam";
```

For exam simulation sessions.

### Weekly Challenge

```tsx
sessionType: "weekly_challenge";
```

For weekly challenge activities.

## 🛠️ Customization

### Custom Styling

```tsx
<AIAssistant
  className="custom-ai-assistant"
  // Add your custom CSS classes
/>
```

### Event Handling

```tsx
<AIAssistant
  onMessageSent={(message) => {
    console.log("Student asked:", message);
    // Track user engagement
  }}
  onResponseReceived={(response) => {
    console.log("AI responded:", response);
    // Log AI interactions
  }}
/>
```

## 🚨 Error Handling

The system includes comprehensive error handling:

- **Rate limiting**: Displays friendly message when limit exceeded
- **Content moderation**: Shows specific guidance for inappropriate content
- **Network errors**: Provides retry mechanisms
- **Authentication**: Redirects to login if session expired

## 🧪 Testing

### Test User Input Moderation

```tsx
import { moderateUserContent } from "@/lib/ai-moderation";

const result = moderateUserContent("What is the answer to question 1?");
console.log(result.isAllowed); // true
console.log(result.sanitizedContent);
```

### Test SQL Injection Prevention

```tsx
import { detectSQLInjection } from "@/lib/ai-moderation";

const hasInjection = detectSQLInjection("SELECT * FROM users");
console.log(hasInjection); // true
```

## 📈 Performance

- **Token optimization**: Only sends last 10 messages to OpenAI
- **Context truncation**: Limits passage content to 800 characters
- **Response caching**: Could be added for frequently asked questions
- **Rate limiting**: Prevents excessive API usage

## 🔒 Privacy & Compliance

- **No PII storage**: Personal information is filtered out
- **User ID tracking**: For OpenAI safety monitoring only
- **Content logging**: Only for moderation purposes
- **COPPA compliant**: Age-appropriate interactions for children

## 🚀 Future Enhancements

- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Personalized learning recommendations
- [ ] Advanced analytics and insights
- [ ] Adaptive difficulty based on student performance
- [ ] Integration with learning management systems

## 🐛 Troubleshooting

### Common Issues

1. **"Authentication required"**: User session expired, need to re-login
2. **"Rate limit exceeded"**: User has made too many requests, wait 1 hour
3. **"Content flagged"**: Message contains inappropriate content, rephrase
4. **"AI service unavailable"**: OpenAI API key not configured or service down

### Debug Mode

Set `NODE_ENV=development` to see detailed error messages in console.

## 📞 Support

For technical issues or questions about the AI Learning Assistant:

1. Check this documentation
2. Review the example implementations
3. Check console logs for detailed error messages
4. Contact the development team
