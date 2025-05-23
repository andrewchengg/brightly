// src/app/(dashboard)/admin/question-review/QuestionEditorForm.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'react-toastify';
import { QuestionType, DifficultyLevel } from '@/generated/prisma';
import { useCloudinaryUpload } from '@/lib/hooks/useCloudinaryUpload';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FaCopy, FaPaste, FaSpinner, FaImage, FaInfoCircle } from 'react-icons/fa';

// Define a Zod schema for form validation
const questionReviewSchema = z.object({
  id: z.number(),
  text: z.string().min(1, "Question text is required"),
  pdfPageNumber: z.number().int().positive(),
  questionNumberOnPage: z.string().min(1),
  questionType: z.nativeEnum(QuestionType),
  options: z.any().optional().nullable(),
  correctAnswer: z.any().optional().nullable(),
  answerKeyRawText: z.string().optional().nullable(),
  explanation: z.string().optional().nullable(),
  hint: z.string().optional().nullable(),
  marks: z.number().int().optional().nullable(),
  difficulty: z.nativeEnum(DifficultyLevel),
  pointsAwarded: z.number().int(),
  subjectId: z.number().int(),
  topicId: z.number().int(),
  questionGroupId: z.number().int().optional().nullable(),
  // Allow null, empty string, or a valid URL. For non-URL placeholders, we'll just treat them as strings.
  // If strict URL validation is needed only when a URL is actually present, a refine could be used,
  // but for now, allowing any string or null is more flexible for placeholders.
  imageUrl: z.string().optional().nullable(), 
  fullPageImageUrl: z.string().optional().nullable(),
  sourceYear: z.number().int().optional().nullable(),
  sourceLevel: z.string().optional().nullable(),
  sourceSchool: z.string().optional().nullable(),
  sourceAssessmentType: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  productionReady: z.boolean().default(false),
});

export type QuestionReviewData = z.infer<typeof questionReviewSchema> & {
    subject?: { id: number; name: string };
    topic?: { id: number; name: string };
    questionGroup?: { id: number; name: string };
    tags?: Array<{ tag: { id: number; name: string } }>; 
};


const refactoringPrompt = `
**Refactoring Prompt for Gemini (or similar AI):**

You are an expert curriculum developer and question refiner for Primary School (Singapore context, specifically P6 PSLE if applicable).
I will provide you with a JSON object representing a single exam question. Your task is to:
1.  **Review all fields** for clarity, correctness, and appropriateness for the specified level (e.g., Primary 6 Mathematics).
2.  **Improve Question Text ("text"):** Ensure it's grammatically correct, unambiguous, and uses simple language. If it's multi-part, ensure parts are clearly delineated.
3.  **Validate Options ("options"):** For MCQs, check if options are plausible distractors and that there's a single, clear correct answer. Ensure keys are simple strings (e.g., "1", "2" or "A", "B").
4.  **Verify Correct Answer ("correctAnswer"):**
    *   MCQ: The string key of the correct option (e.g., "2").
    *   FILL_IN_THE_BLANK: The string/number answer.
    *   MULTI_PART: An object like {"a": "answer a", "b": "answer b"}.
    *   OPEN_ENDED: Usually null, or a concise model answer summary if the source provides one.
    *   Ensure no units or extra symbols unless absolutely part of the answer itself.
5.  **Enhance Explanation ("explanation"):** Provide a clear, step-by-step explanation suitable for a Primary 6 student. If the original explanation is weak or missing, create a good one. If the question *requires* a diagram that is not provided in the JSON (imageUrl is null or placeholder), state: "Explanation requires visual diagram interpretation."
6.  **Refine Hint ("hint"):** Create a short, guiding hint if the original is poor or missing. It should not give away the answer. If it needs a diagram, state that.
7.  **Confirm/Adjust Difficulty ("difficulty"):** Re-assess based on complexity for P6. Options: "EASY", "MEDIUM", "HARD", "VERY_HARD".
8.  **Suggest Tags ("tags"):** Provide 1-3 relevant string tags (e.g., "Ratio", "Word Problem", "Area", "Angles").
9.  **Do NOT change:** \`id\`, \`pdfPageNumber\`, \`questionNumberOnPage\`, \`subjectId\`, \`topicId\`, \`questionGroupId\`, \`imageUrl\`, \`fullPageImageUrl\`, \`pointsAwarded\`, \`marks\` (unless marks are clearly wrong for the question type/difficulty and you are certain of the correction, otherwise leave as is), source metadata fields.
10. **Maintain JSON Structure:** Return the *entire* question object in the same JSON format as provided, with your modifications.

Here is the question JSON:
[PASTE COPIED JSON HERE]
`;


interface QuestionEditorFormProps {
  questionData: QuestionReviewData;
  onQuestionAccepted: () => void;
  onQuestionUpdated: () => void;
}

export default function QuestionEditorForm({ questionData, onQuestionAccepted, onQuestionUpdated }: QuestionEditorFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null | undefined>(questionData.imageUrl);
  const { uploading, error: uploadError, uploadImage } = useCloudinaryUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { control, handleSubmit, reset, setValue, watch, getValues, formState: { errors } } = useForm<QuestionReviewData>({
    resolver: zodResolver(questionReviewSchema),
    defaultValues: {
      ...questionData,
      tags: questionData.tags?.map(qt => qt.tag.name) || [],
      options: typeof questionData.options === 'object' && questionData.options !== null ? JSON.stringify(questionData.options, null, 2) : questionData.options,
      correctAnswer: typeof questionData.correctAnswer === 'object' && questionData.correctAnswer !== null ? JSON.stringify(questionData.correctAnswer, null, 2) : questionData.correctAnswer,
    },
  });
  
  const watchedQuestionType = watch("questionType");
  const watchedOptionsString = watch("options"); 
  const watchedText = watch("text");
  const watchedImageUrl = watch("imageUrl");

  useEffect(() => {
    reset({
      ...questionData,
      tags: questionData.tags?.map(qt => qt.tag.name) || [],
      options: typeof questionData.options === 'object' && questionData.options !== null ? JSON.stringify(questionData.options, null, 2) : questionData.options,
      correctAnswer: typeof questionData.correctAnswer === 'object' && questionData.correctAnswer !== null ? JSON.stringify(questionData.correctAnswer, null, 2) : questionData.correctAnswer,
    });
    setCurrentImageUrl(questionData.imageUrl);
  }, [questionData, reset]);

  useEffect(() => {
    setCurrentImageUrl(watchedImageUrl);
  }, [watchedImageUrl]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const secureUrl = await uploadImage(file);
    if (secureUrl) {
      setCurrentImageUrl(secureUrl);
      setValue("imageUrl", secureUrl, { shouldValidate: true }); // Zod will still validate if it's a URL after upload
      toast.success("Image uploaded successfully!");
    } else {
      toast.error(uploadError || "Image upload failed.");
    }
  };
  
  const onSubmit = async (formData: QuestionReviewData, markAsProductionReady = false) => {
    setIsSubmitting(true);
    try {
      let parsedOptions = formData.options;
      if (typeof formData.options === 'string') {
        try { parsedOptions = JSON.parse(formData.options); } catch (e) { /* leave as string if not valid JSON */ }
      }
      let parsedCorrectAnswer = formData.correctAnswer;
      if (typeof formData.correctAnswer === 'string') {
        try { parsedCorrectAnswer = JSON.parse(formData.correctAnswer); } catch (e) { /* leave as string */ }
      }

      const payload = { 
        ...formData, 
        options: parsedOptions,
        correctAnswer: parsedCorrectAnswer,
        productionReady: markAsProductionReady 
      };
      
      const response = await fetch(`/api/questions/review/${questionData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || "Failed to update question");
      }
      toast.success(`Question ${markAsProductionReady ? 'accepted and marked as production ready!' : 'updated successfully!'}`);
      if (markAsProductionReady) {
        onQuestionAccepted();
      } else {
        onQuestionUpdated(); 
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyForAI = () => {
    const currentFormData = getValues(); 
    let dataToCopy = { ...currentFormData };
    if (typeof dataToCopy.options === 'string') {
        try { dataToCopy.options = JSON.parse(dataToCopy.options); } catch (e) { /* keep as string if invalid */ }
    }
    if (typeof dataToCopy.correctAnswer === 'string') {
        try { dataToCopy.correctAnswer = JSON.parse(dataToCopy.correctAnswer); } catch (e) { /* keep as string if invalid */ }
    }
    const jsonToCopy = JSON.stringify(dataToCopy, null, 2);
    navigator.clipboard.writeText(jsonToCopy)
      .then(() => toast.success("Question JSON copied to clipboard!"))
      .catch(err => toast.error("Failed to copy JSON."));
    alert("Prompt for AI (also in console):\n" + refactoringPrompt);
    console.log("Refactoring Prompt for AI:", refactoringPrompt);
  };
  
  const handlePasteRefactoredJson = async () => {
    try {
      const pastedJsonString = await navigator.clipboard.readText();
      if (!pastedJsonString) {
        toast.warn("Clipboard is empty or permission denied.");
        return;
      }
      const refactoredData = JSON.parse(pastedJsonString);
      const currentId = getValues("id");
      const currentProdReady = getValues("productionReady");

      reset({
        ...refactoredData, 
        id: currentId,     
        productionReady: currentProdReady, 
        tags: Array.isArray(refactoredData.tags) ? refactoredData.tags.map(String) : [],
        options: typeof refactoredData.options === 'object' && refactoredData.options !== null ? JSON.stringify(refactoredData.options, null, 2) : refactoredData.options,
        correctAnswer: typeof refactoredData.correctAnswer === 'object' && refactoredData.correctAnswer !== null ? JSON.stringify(refactoredData.correctAnswer, null, 2) : refactoredData.correctAnswer,
      });
      setCurrentImageUrl(refactoredData.imageUrl || null);
      toast.success("Refactored JSON loaded into form!");

    } catch (err: any) {
      toast.error(`Error parsing or applying refactored JSON: ${err.message}`);
      console.error("Error with refactored JSON:", err);
    }
  };

  const renderQuestionPreview = () => {
    let parsedOptionsForPreview: Record<string, string> = {};
    if (watchedQuestionType === QuestionType.MULTIPLE_CHOICE && watchedOptionsString) {
        try {
            parsedOptionsForPreview = JSON.parse(String(watchedOptionsString));
            if (typeof parsedOptionsForPreview !== 'object' || parsedOptionsForPreview === null) {
                parsedOptionsForPreview = {}; 
            }
        } catch (e) {
            parsedOptionsForPreview = {}; 
        }
    }

    return (
        <div className="mb-8 p-6 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50/50">
            <h2 className="text-xl font-semibold text-blue-700 mb-4">Question Preview</h2>
            <div className="prose prose-sm max-w-none p-4 bg-white rounded shadow">
                <p className="whitespace-pre-wrap">{watchedText || "[Question text will appear here]"}</p>
                {currentImageUrl && (currentImageUrl.startsWith('http://') || currentImageUrl.startsWith('https://')) ? (
                    <div className="my-3">
                        <Image src={currentImageUrl} alt="Question Image Preview" width={300} height={200} className="rounded-md border object-contain mx-auto"/>
                    </div>
                ) : currentImageUrl ? (
                     <p className="text-xs text-gray-500 my-2 text-center">(Local/Placeholder Image: {currentImageUrl})</p>
                ) : null}
                {watchedQuestionType === QuestionType.MULTIPLE_CHOICE && Object.keys(parsedOptionsForPreview).length > 0 && (
                    <ul className="list-none p-0 mt-3 space-y-1">
                        {Object.entries(parsedOptionsForPreview).map(([key, value]) => (
                            <li key={key} className="border rounded p-2 bg-gray-50">
                                <span className="font-semibold mr-2">{key}.</span>{String(value)}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
  };


  return (
    <div className="space-y-8">
      {renderQuestionPreview()}

      <form onSubmit={handleSubmit(data => onSubmit(data, false))} className="space-y-6 bg-white p-6 rounded-lg shadow-md border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">Edit Question Details (ID: {questionData.id})</h2>
          <div className="flex items-center space-x-2">
              <Controller
                  name="productionReady"
                  control={control}
                  render={({ field }) => (
                      <Checkbox id="productionReadyHeader" checked={field.value || false} onCheckedChange={field.onChange} />
                  )}
              />
              <label htmlFor="productionReadyHeader" className="text-sm font-medium text-gray-700">Production Ready</label>
          </div>
        </div>
      
        <Section title="Core Content">
          <FormFieldTextarea control={control} name="text" label="Question Text" error={errors.text} rows={5} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormFieldSelect control={control} name="questionType" label="Type" error={errors.questionType} options={Object.values(QuestionType)} />
          </div>
          <FormFieldTextarea control={control} name="options" label="Options (JSON)" error={errors.options as any} rows={4} 
            inputProps={{
                placeholder: `MCQ e.g., {"1": "Opt A", "2": "Opt B"}\nMulti-Part e.g., {"a": "Sub-question A", "b": "Sub-question B"}`
            }}
            />
           <FormFieldTextarea control={control} name="correctAnswer" label="Correct Answer (JSON/String)" error={errors.correctAnswer as any} rows={3}
            inputProps={{
                placeholder: `MCQ: "1" or "A"\nFill-in/Open: "Answer Text"\nMulti-part: {"a": "AnsA", "b": "AnsB"}`
            }}
           />
        </Section>

        <Section title="Elaboration">
          <FormFieldTextarea control={control} name="explanation" label="Explanation" error={errors.explanation} rows={4} />
          <FormFieldTextarea control={control} name="hint" label="Hint" error={errors.hint} rows={2} />
          <FormFieldTextarea control={control} name="answerKeyRawText" label="Answer Key Raw Text (from PDF)" error={errors.answerKeyRawText} rows={2} />
        </Section>
        
        <Section title="Media & Visuals">
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Question Image (Diagram)</label>
                {currentImageUrl && (currentImageUrl.startsWith('http://') || currentImageUrl.startsWith('https://')) ? (
                    <div className="mb-2 p-2 border rounded-md inline-block">
                        <Image src={currentImageUrl} alt="Current Question Image" width={150} height={100} className="rounded-md object-contain"/>
                    </div>
                ) : currentImageUrl ? (
                     <p className="text-xs text-gray-500 my-1">(Local/Placeholder: {currentImageUrl})</p>
                ): (
                     <p className="text-xs text-gray-500 my-1">(No image currently set)</p>
                )}
                <div className="flex items-center gap-2">
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                    {uploading && <FaSpinner className="animate-spin text-indigo-500"/>}
                </div>
                {uploadError && <p className="text-xs text-red-600">Upload error: {uploadError}</p>}
                <FormField control={control} name="imageUrl" label="Image URL (auto-filled on upload)" error={errors.imageUrl} inputProps={{readOnly: true, placeholder: "Will be auto-filled by upload or manual entry"}}/>
            </div>
            <FormField control={control} name="fullPageImageUrl" label="Full Page Image URL" error={errors.fullPageImageUrl} inputProps={{placeholder: "e.g., path/to/full_page_image.png"}}/>
        </Section>

        <Section title="Grading & Classification">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormFieldSelect control={control} name="difficulty" label="Difficulty" error={errors.difficulty} options={Object.values(DifficultyLevel)} />
            <FormField control={control} name="pointsAwarded" label="XP Points" type="number" error={errors.pointsAwarded} />
            <FormField control={control} name="marks" label="Marks (on paper)" type="number" error={errors.marks} />
          </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <FormField control={control} name="subjectId" label="Subject ID" type="number" error={errors.subjectId} />
            <FormField control={control} name="topicId" label="Topic ID" type="number" error={errors.topicId} />
            <FormField control={control} name="questionGroupId" label="Question Group ID" type="number" error={errors.questionGroupId} />
          </div>
           <FormField
            control={control} name="tags" label="Tags (comma-separated strings)" error={errors.tags as any}
            inputProps={{
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValue('tags', e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)),
                value: Array.isArray(watch('tags')) ? watch('tags').join(', ') : ''
            }}
           />
        </Section>

        <Section title="Source Information">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField control={control} name="pdfPageNumber" label="PDF Page #" type="number" error={errors.pdfPageNumber} />
            <FormField control={control} name="questionNumberOnPage" label="Q# on Page" error={errors.questionNumberOnPage} />
            <FormField control={control} name="sourceYear" label="Source Year" type="number" error={errors.sourceYear} />
            <FormField control={control} name="sourceLevel" label="Source Level" error={errors.sourceLevel} />
            <FormField control={control} name="sourceSchool" label="Source School" error={errors.sourceSchool} />
            <FormField control={control} name="sourceAssessmentType" label="Source Assessment Type" error={errors.sourceAssessmentType} />
          </div>
        </Section>
        
        <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-6 border-t mt-6">
            <Button type="button" variant="outline" onClick={handleCopyForAI} className="w-full sm:w-auto">
                <FaCopy className="mr-2"/> Copy for AI Refactor
            </Button>
            <Button type="button" variant="outline" onClick={handlePasteRefactoredJson} className="w-full sm:w-auto">
                <FaPaste className="mr-2"/> Load Refactored JSON
            </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <Button type="submit" disabled={isSubmitting || uploading} className="flex-1">
              {isSubmitting ? <FaSpinner className="animate-spin mr-2"/> : null} Save Changes
            </Button>
            <Button 
                type="button" 
                onClick={handleSubmit(data => onSubmit(data, true))} 
                disabled={isSubmitting || uploading}
                className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? <FaSpinner className="animate-spin mr-2"/> : null} Accept & Mark Production Ready
            </Button>
        </div>
      </form>
    </div>
  );
}

// Helper component for section titles
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="py-4 border-b last:border-b-0">
        <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
            <FaInfoCircle className="mr-2 text-indigo-500" /> {title}
        </h3>
        <div className="space-y-4 pl-2">{children}</div>
    </div>
);


// Helper components for form fields
interface FormFieldProps {
    control: any;
    name: keyof QuestionReviewData;
    label: string;
    type?: string;
    error?: any;
    rows?: number;
    inputProps?: React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>;
}
const FormField: React.FC<FormFieldProps> = ({ control, name, label, type = "text", error, inputProps }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <Controller
            name={name}
            control={control}
            render={({ field }) => (
                <Input
                    {...field}
                    {...inputProps}
                    id={name}
                    type={type}
                    value={field.value === null || field.value === undefined ? '' : String(field.value)}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (type === "number") {
                             field.onChange(val === '' ? null : (isNaN(Number(val)) ? field.value : Number(val)));
                        } else {
                            field.onChange(val);
                        }
                    }}
                    className={error ? 'border-red-500' : ''}
                />
            )}
        />
        {error && <p className="text-red-500 text-xs mt-1">{error.message}</p>}
    </div>
);

const FormFieldTextarea: React.FC<FormFieldProps> = ({ control, name, label, error, rows=3, inputProps }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <Controller
            name={name}
            control={control}
            render={({ field }) => (
                <Textarea
                    {...field}
                    {...inputProps}
                    id={name}
                    rows={rows}
                    value={typeof field.value === 'object' && field.value !== null ? JSON.stringify(field.value, null, 2) : String(field.value || '')}
                    onChange={(e) => { 
                         field.onChange(e.target.value);
                    }}
                    className={error ? 'border-red-500' : ''}
                />
            )}
        />
        {error && <p className="text-red-500 text-xs mt-1">{error.message}</p>}
    </div>
);

interface FormFieldSelectProps extends FormFieldProps {
    options: string[];
}
const FormFieldSelect: React.FC<FormFieldSelectProps> = ({ control, name, label, error, options }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <Controller
            name={name}
            control={control}
            render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value as string} defaultValue={field.value as string}>
                    <SelectTrigger className={error ? 'border-red-500' : ''}>
                        <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                        {options.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        />
        {error && <p className="text-red-500 text-xs mt-1">{error.message}</p>}
    </div>
);