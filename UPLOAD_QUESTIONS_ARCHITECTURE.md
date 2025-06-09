# Upload Questions Feature Architecture

## Overview

The upload questions feature allows students to upload images of questions, extract the question content using AI, and add them to their review collection for practice.

## How It Works

### 1. **Frontend Flow** (`src/app/(dashboard)/student/review/page.tsx`)

- Student clicks "Add Question" button on review page
- Upload interface appears with image selection
- Student selects question image from device
- Image preview is shown with "Extract Question" button
- On submit, image is sent to API for processing
- Extracted question appears in "Your Uploaded Questions" section

### 2. **Backend Processing** (`src/app/api/student/upload-question/route.ts`)

- Receives uploaded image via FormData
- Converts image to base64 for AI processing
- **Currently mocked** - calls AI service to extract:
  - Question text
  - Subject classification
  - Topic classification
  - Question type (multiple choice, etc.)
  - Options and correct answers
  - Difficulty level
- Creates or finds matching Subject and Topic in database
- Stores question in Question table with special markers

### 3. **Database Integration**

#### Current Schema Compatibility

The feature works with your existing `Question` model by using these existing fields:

```prisma
model Question {
  text                 String           // Extracted question text
  questionType         QuestionType     // MULTIPLE_CHOICE, etc.
  options              Json?            // Extracted options
  correctAnswer        Json?            // Extracted answer
  difficulty           DifficultyLevel  // AI-determined difficulty
  subjectId            Int              // Linked to existing subjects
  topicId              Int              // Linked to existing topics
  imageUrl             String?          // Stores uploaded image
  productionReady      Boolean          // Set to false for user uploads
  questionNumberOnPage String           // Set to "user-upload" as identifier
  pdfPageNumber        Int              // Set to 0 for user uploads
}
```

#### Recommended Schema Enhancements

To fully support this feature, consider adding these fields:

```sql
ALTER TABLE "Question" ADD COLUMN "uploadedByStudentId" TEXT;
ALTER TABLE "Question" ADD COLUMN "isUserGenerated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Question" ADD COLUMN "reviewStatus" TEXT DEFAULT 'PENDING';
ALTER TABLE "Question" ADD COLUMN "originalImageUrl" TEXT;
```

### 4. **AI Integration Points**

#### Current Implementation (Mocked)

- Returns sample extracted data for testing
- Uses hardcoded subject/topic classification

#### Production Implementation Options

1. **OpenAI Vision API**

   - Send image to GPT-4 Vision
   - Request structured JSON response
   - Parse question text, options, answers

2. **Google Cloud Vision + Custom Processing**

   - OCR text extraction
   - NLP processing for question parsing
   - Subject classification models

3. **Custom AI Pipeline**
   - Specialized question extraction models
   - Educational content classification
   - Answer key detection

### 5. **Review Integration**

#### Display in Review Page

- User-uploaded questions appear in special section
- Shows preview of recent uploads
- Questions can be practiced like regular content
- Visual indicators distinguish user vs. admin content

#### Practice Session Integration

- Uploaded questions can be included in practice sessions
- Same scoring and feedback mechanisms apply
- Results tracked in existing StudentAnswer system

## Benefits of This Architecture

### 1. **Schema Alignment**

- ✅ Works with existing Question model
- ✅ Leverages existing Subject/Topic structure
- ✅ Integrates with practice session system
- ✅ Compatible with existing UI components

### 2. **Scalability**

- Questions can be moderated before going live
- AI extraction can be improved over time
- Storage can be moved to cloud (S3, etc.)
- Caching layer can be added for performance

### 3. **User Experience**

- Seamless integration with existing review flow
- Immediate feedback on extraction quality
- Personal question library for each student
- Practice with self-uploaded content

## Implementation Status

### ✅ Completed

- Frontend upload interface
- Image preview and handling
- API endpoints for upload and retrieval
- Basic AI extraction (mocked)
- Database integration
- UI components for display

### 🔄 Next Steps

1. **Schema Migration**: Add recommended fields for better tracking
2. **Real AI Integration**: Replace mock with actual AI service
3. **Authentication**: Implement proper user session handling
4. **Image Storage**: Move from base64 to cloud storage
5. **Moderation**: Add admin review interface
6. **Error Handling**: Improve extraction failure scenarios

### 🎯 Future Enhancements

1. **Batch Upload**: Process multiple questions at once
2. **Question Editing**: Allow students to correct extracted text
3. **Sharing**: Let students share questions with classmates
4. **Analytics**: Track extraction accuracy and usage
5. **Mobile App**: Camera integration for instant upload

## Security Considerations

- File size limits (currently 10MB)
- Image type validation
- User authentication required
- Content moderation for inappropriate material
- Rate limiting on uploads
- Virus scanning for uploaded files

This architecture provides a solid foundation for the upload questions feature while maintaining compatibility with your existing system.
