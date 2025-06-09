# AI Tutor Guardrails and Safety Implementation

## Overview

This document outlines the comprehensive guardrails and safety measures implemented for the AI tutor components in the Edcel learning platform. These measures ensure that AI interactions remain educational, appropriate, and aligned with the curriculum while protecting students from inappropriate content.

## Implementation Architecture

### 1. Multi-Layer Protection System

The guardrails are implemented across multiple layers:

1. **Client-Side Validation** - Immediate feedback and basic filtering
2. **Server-Side Content Moderation** - Comprehensive filtering and safety checks
3. **AI Response Moderation** - Post-processing of AI responses
4. **Rate Limiting** - Prevents abuse and overuse
5. **Educational System Prompts** - Guides AI behavior towards educational goals

### 2. Components Covered

- **Student Practice Pages** (`/student/practice/topic/[topicId]`)
- **Question Group Practice** (`/student/practice/question-group/[questionGroupId]`)
- **Ask AI Tutor** (`/student/ask`)
- **All AI tutor interactions within practice sessions**

## Client-Side Validation (`src/lib/client-validation.ts`)

### Purpose

Provides immediate feedback to users without making API calls, improving user experience and reducing server load.

### Features

#### Content Pattern Detection

- **Inappropriate Content**: Blocks requests containing offensive language, violence, drugs, etc.
- **Academic Dishonesty**: Prevents "give me answers" type requests
- **Off-Topic Content**: Filters non-educational topics (gaming, social media, etc.)
- **System Manipulation**: Blocks attempts to change AI behavior

#### Educational Content Promotion

- **Educational Keywords**: Recognizes learning-related terms
- **Question Patterns**: Identifies proper educational questions
- **Length Validation**: Ensures appropriate message length (max 500 characters)

#### User Experience Features

- **Helpful Suggestions**: Provides example questions when input is rejected
- **Real-time Feedback**: Immediate error messages with suggestions
- **Input Sanitization**: Removes potentially harmful characters

## Server-Side Moderation (`src/lib/ai-moderation.ts`)

### Advanced Content Filtering

#### SQL Injection Prevention

```typescript
const SQL_INJECTION_PATTERNS = [
  /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/gi,
  // ... additional patterns
];
```

#### Inappropriate Content Detection

- **Personal Information**: Credit cards, SSNs, emails, phone numbers, addresses
- **Harmful Requests**: Hacking attempts, password requests, system exploits
- **Inappropriate Behavior**: Bullying, violence, self-harm, substance abuse
- **Off-Topic Content**: Politics, religion, dating, business, entertainment
- **Academic Dishonesty**: Plagiarism, cheating, homework completion requests
- **System Manipulation**: Prompt injection, role-playing, jailbreak attempts

#### Syllabus Alignment Checking

```typescript
export function checkSyllabusAlignment(input: string): {
  isAligned: boolean;
  confidence: number;
  reason?: string;
};
```

- **Educational Keyword Analysis**: Counts learning-related terms
- **Confidence Scoring**: Calculates educational relevance (0-1 scale)
- **Pattern Recognition**: Identifies common educational question structures
- **Length-based Adjustment**: Adapts scoring based on message length

### AI Response Moderation

#### Direct Answer Prevention

- **Pattern Detection**: Identifies and modifies direct answer giving
- **Educational Redirection**: Converts answers into guided learning
- **Engagement Enhancement**: Adds follow-up questions to short responses

#### Content Cleanup

- **Harmful Content Removal**: Strips inappropriate terms that slip through
- **Personal Information Protection**: Removes any personal data in responses
- **Educational Tone Enforcement**: Ensures responses maintain learning focus

## Rate Limiting System

### User Protection

- **AI Tutor API**: 50 requests per hour per user
- **Ask AI API**: 30 requests per hour per user
- **In-Memory Storage**: Simple rate tracking with automatic reset
- **Graceful Degradation**: User-friendly error messages when limits exceeded

### Benefits

- **Prevents Abuse**: Stops malicious overuse of AI services
- **Cost Control**: Manages API usage and associated costs
- **Educational Focus**: Encourages thoughtful, purposeful questions

## Educational System Prompts

### Comprehensive Guidelines

#### Core Principles

1. **Age-Appropriate Communication**: Primary school level language
2. **Educational Exclusivity**: Only educational content allowed
3. **Guided Learning**: Never provide direct answers immediately
4. **Encouraging Tone**: Supportive and patient communication
5. **Critical Thinking**: Promote problem-solving skills

#### Strict Boundaries

- **Content Restrictions**: No personal, inappropriate, or off-topic discussions
- **Academic Integrity**: No direct homework completion
- **Safety Measures**: No harmful or dangerous content
- **Role Consistency**: Cannot be manipulated to change behavior

#### Teaching Methodology

- **Socratic Method**: Use guiding questions
- **Step-by-Step Breakdown**: Complex concepts simplified
- **Age-Appropriate Examples**: Primary school suitable analogies
- **Concept Connection**: Link to broader learning goals
- **Progress Celebration**: Acknowledge effort and improvement

### Context-Aware Prompts

#### Session Type Adaptation

- **Cloze Passages**: Focus on reading comprehension and context clues
- **Topic Practice**: Emphasize subject-specific concepts and applications
- **Question Groups**: Highlight pattern recognition and strategy application

#### Progressive Disclosure

- **Pre-Answer**: Guide thinking without revealing solutions
- **Post-Answer**: Provide detailed explanations when appropriate
- **Hint System**: Graduated help levels

## API Endpoint Security

### Authentication & Authorization

- **User Verification**: Supabase authentication required
- **Session Validation**: Proper user session management
- **Context Verification**: Educational session context required

### OpenAI Integration Safety

- **User ID Tracking**: All requests tagged with user ID for OpenAI monitoring
- **Model Selection**: Appropriate models for task complexity
- **Parameter Tuning**: Temperature, frequency, and presence penalties set for educational use
- **Token Limits**: Controlled response length (400-600 tokens)

## Error Handling & User Experience

### Graceful Degradation

- **User-Friendly Messages**: No technical error exposure
- **Helpful Redirection**: Suggest appropriate questions when content rejected
- **Educational Focus**: Always guide back to learning objectives

### Logging & Monitoring

- **Content Flagging**: Track inappropriate requests for system improvement
- **Usage Patterns**: Monitor for unusual activity
- **Error Tracking**: Identify and resolve system issues

## Testing & Validation

### Test Cases Covered

#### Inappropriate Content

- ✅ Personal information sharing attempts
- ✅ Violent or harmful content requests
- ✅ Off-topic conversation attempts
- ✅ Academic dishonesty requests
- ✅ System manipulation attempts

#### Educational Content

- ✅ Legitimate homework help requests
- ✅ Concept explanation requests
- ✅ Study strategy questions
- ✅ Subject-specific inquiries
- ✅ Learning methodology questions

#### Edge Cases

- ✅ Very short messages
- ✅ Very long messages
- ✅ Mixed appropriate/inappropriate content
- ✅ Multilingual content
- ✅ Special characters and formatting

## Configuration & Maintenance

### Adjustable Parameters

- **Rate Limits**: Can be modified per user type or system load
- **Content Thresholds**: Sensitivity levels adjustable
- **Educational Keywords**: Expandable based on curriculum updates
- **Response Lengths**: Adaptable to different educational contexts

### Regular Updates

- **Pattern Recognition**: Update inappropriate content patterns
- **Educational Alignment**: Refresh syllabus-related keywords
- **System Prompts**: Refine educational guidance based on usage
- **Performance Monitoring**: Track and optimize response quality

## Benefits Achieved

### Student Safety

- **Content Protection**: Students cannot access inappropriate material
- **Privacy Protection**: Personal information sharing prevented
- **Age-Appropriate Interaction**: All content suitable for primary school

### Educational Quality

- **Learning-Focused**: All interactions promote understanding
- **Curriculum Aligned**: Content matches educational objectives
- **Skill Development**: Emphasis on critical thinking and problem-solving

### System Integrity

- **Abuse Prevention**: Rate limiting and content filtering prevent misuse
- **Cost Management**: Controlled API usage
- **Consistent Experience**: Reliable, predictable AI behavior

## Implementation Files

### Core Libraries

- `src/lib/ai-moderation.ts` - Server-side content moderation
- `src/lib/client-validation.ts` - Client-side input validation

### API Endpoints

- `src/app/api/ai-tutor/route.ts` - Main AI tutor API
- `src/app/api/ask-ai/route.ts` - Ask AI tutor API

### Frontend Components

- Topic practice pages with integrated validation
- Question group practice pages with safety checks
- Ask AI tutor page with comprehensive filtering

## Future Enhancements

### Potential Improvements

1. **Machine Learning**: Advanced content classification
2. **Personalization**: Adaptive content filtering based on student level
3. **Analytics**: Detailed reporting on content interactions
4. **Multi-language**: Support for additional languages
5. **Advanced NLP**: Semantic analysis for deeper content understanding

### Monitoring & Optimization

1. **Usage Analytics**: Track successful vs. rejected interactions
2. **False Positive Reduction**: Refine filtering to reduce valid content rejection
3. **Educational Effectiveness**: Measure learning outcomes from AI interactions
4. **Performance Metrics**: API response times and success rates
