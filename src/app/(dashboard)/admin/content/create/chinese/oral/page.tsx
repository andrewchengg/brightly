// src/app/(dashboard)/admin/content/create/chinese/oral/page.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox'; 
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { FaArrowLeft, FaPlusCircle, FaTrashAlt, FaImage, FaVideo, FaBookReader, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { DifficultyLevel, OralPromptType, Topic } from '@/generated/prisma'; 
import { useCloudinaryUpload } from '@/lib/hooks/useCloudinaryUpload'; 
import Image from 'next/image';

const oralPromptSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  subjectId: z.coerce.number().int().positive("Subject is required"),
  topicId: z.coerce.number().int().positive("Topic is required").optional().nullable(),
  promptType: z.nativeEnum(OralPromptType, { errorMap: () => ({ message: "Please select a prompt type" }) }),
  description: z.string().optional(),
  studentInstructions: z.string().optional(),
  imageUrl: z.string().url("Must be a valid URL or leave empty.").optional().or(z.literal("").transform(() => null)),
  videoUrl: z.string().url("Must be a valid URL or leave empty.").optional().or(z.literal("").transform(() => null)),
  guidingQuestions: z.array(z.object({ text: z.string().min(1, "Question text cannot be empty") })).optional(),
  passageText: z.string().optional(),
  difficulty: z.nativeEnum(DifficultyLevel).default(DifficultyLevel.MEDIUM),
  keywords: z.string().optional().transform(val => val ? val.split(',').map(k => k.trim()).filter(k => k) : []),
  estimatedTimeSeconds: z.coerce.number().int().positive("Must be a positive number").optional().nullable(),
  productionReady: z.boolean().default(false),
});

type OralPromptFormData = z.infer<typeof oralPromptSchema>;

const CHINESE_SUBJECT_ID = 4;
const NO_TOPIC_VALUE = "_NO_TOPIC_"; // Special value for "No Specific Topic"

export default function CreateOralPromptPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null); 

  const { control, handleSubmit, register, watch, setValue, formState: { errors } } = useForm<OralPromptFormData>({
    resolver: zodResolver(oralPromptSchema),
    defaultValues: {
      title: "",
      subjectId: CHINESE_SUBJECT_ID, 
      promptType: undefined, 
      difficulty: DifficultyLevel.MEDIUM,
      productionReady: false,
      keywords: [],
      guidingQuestions: [{ text: "" }],
      imageUrl: "", 
      videoUrl: "", 
      topicId: null, // Initialize topicId as null
    },
  });

  const watchedPromptType = watch("promptType");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "guidingQuestions",
  });

  useEffect(() => {
    const fetchChineseTopics = async () => {
      try {
        const response = await fetch(`/api/topics?subjectId=${CHINESE_SUBJECT_ID}`);
        if (!response.ok) throw new Error("Failed to fetch topics");
        const data = await response.json();
        setTopics(data);
      } catch (fetchError: any) {
        console.error("Error fetching Chinese topics:", fetchError);
        toast.error("Could not load topics for Chinese: " + fetchError.message);
      }
    };
    fetchChineseTopics();
  }, []);
  
  const onSubmit = async (data: OralPromptFormData) => {
    setIsSubmitting(true);
    setError(null); 

    const submittedData = { ...data }; // Create a mutable copy

    if (submittedData.promptType !== OralPromptType.PICTURE_CONVERSATION) {
      submittedData.imageUrl = null;
    }
    if (submittedData.promptType !== OralPromptType.VIDEO_CONVERSATION) {
      submittedData.videoUrl = null;
    }
    if (submittedData.promptType !== OralPromptType.PASSAGE_READING) {
      submittedData.passageText = undefined; 
    }
    if (submittedData.promptType === OralPromptType.PASSAGE_READING) {
        submittedData.guidingQuestions = undefined; 
    }
    if (submittedData.guidingQuestions && submittedData.guidingQuestions.length === 1 && submittedData.guidingQuestions[0].text === "") {
        submittedData.guidingQuestions = undefined; 
    }
    // Ensure topicId is null if "No Specific Topic" was conceptually chosen (already handled by onValueChange)
    // The data.topicId will already be null if NO_TOPIC_VALUE was selected.

    console.log("Submitting Oral Prompt Data:", submittedData);

    try {
      const response = await fetch('/api/oral-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submittedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create oral prompt");
      }
      toast.success("Oral prompt created successfully!");
      router.push('/admin/content/create/chinese'); 
    } catch (err: any) {
      console.error("Error creating oral prompt:", err);
      setError(err.message);
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <Button variant="outline" onClick={() => router.push('/admin/content/create/chinese')} className="mb-6">
        <FaArrowLeft className="mr-2" /> Back to Chinese Content Types
      </Button>

      <Card className="shadow-xl">
        <CardHeader className="bg-red-50 border-b border-red-200">
          <CardTitle className="text-2xl text-red-700">Create New Chinese Oral Prompt</CardTitle>
          <CardDescription className="text-red-600">Fill in the details for the oral practice.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Core Info */}
            <div className="space-y-4 border-b pb-6">
              <InputField control={control} name="title" label="Prompt Title (e.g., 公园的一天)" error={errors.title} />
              
              <div>
                <label htmlFor="topicId" className="block text-sm font-medium text-gray-700 mb-1">Topic (Optional)</label>
                <Controller
                  name="topicId"
                  control={control}
                  render={({ field }) => (
                    <Select 
                        onValueChange={(value) => {
                            if (value === NO_TOPIC_VALUE) {
                                field.onChange(null); // Set actual form value to null
                            } else {
                                field.onChange(value ? parseInt(value) : null);
                            }
                        }} 
                        // Determine current value for Select: if field.value is null, use NO_TOPIC_VALUE for display, else stringify the number
                        value={field.value === null || field.value === undefined ? NO_TOPIC_VALUE : field.value.toString()} 
                    >
                      <SelectTrigger className={errors.topicId ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select a topic" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_TOPIC_VALUE}>No Specific Topic</SelectItem> 
                        {topics.map(topic => (
                          <SelectItem key={topic.id} value={topic.id.toString()}>{topic.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.topicId && <p className="text-xs text-red-500 mt-1">{errors.topicId.message}</p>}
              </div>

              <div>
                <label htmlFor="promptType" className="block text-sm font-medium text-gray-700 mb-1">Prompt Type *</label>
                <Controller
                  name="promptType"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <SelectTrigger className={errors.promptType ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select prompt type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(OralPromptType).map(type => (
                          <SelectItem key={type} value={type}>{type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.promptType && <p className="text-xs text-red-500 mt-1">{errors.promptType.message}</p>}
              </div>
            </div>

            {/* Type-Specific Fields (Rest of the form remains the same as previously provided) */}
            <div className="space-y-4 border-b pb-6">
              {watchedPromptType === OralPromptType.PICTURE_CONVERSATION && (
                <InputField control={control} name="imageUrl" label="Image URL (for Picture Conversation)" error={errors.imageUrl} placeholder="https://example.com/image.jpg"/>
              )}
              {watchedPromptType === OralPromptType.VIDEO_CONVERSATION && (
                <InputField control={control} name="videoUrl" label="Video URL (for Video Conversation)" error={errors.videoUrl} placeholder="https://example.com/video.mp4" />
              )}
              {watchedPromptType === OralPromptType.PASSAGE_READING && (
                <TextareaField control={control} name="passageText" label="Passage to Read" error={errors.passageText} rows={8} placeholder="Enter the passage text here..."/>
              )}
              {(watchedPromptType === OralPromptType.PICTURE_CONVERSATION || watchedPromptType === OralPromptType.VIDEO_CONVERSATION) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Guiding Questions (Optional)</label>
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2 mb-2">
                      <Input
                        {...register(`guidingQuestions.${index}.text`)}
                        placeholder={`Question ${index + 1}`}
                        className={`flex-grow ${errors.guidingQuestions?.[index]?.text ? 'border-red-500' : ''}`}
                      />
                      <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} className="text-red-500 hover:text-red-700">
                        <FaTrashAlt />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ text: "" })} className="text-sm">
                    <FaPlusCircle className="mr-2" /> Add Guiding Question
                  </Button>
                </div>
              )}
            </div>
            
            <div className="space-y-4 border-b pb-6">
                <TextareaField control={control} name="description" label="Admin Description (Internal Notes)" error={errors.description} rows={3} />
                <TextareaField control={control} name="studentInstructions" label="Instructions for Student" error={errors.studentInstructions} rows={3} placeholder="e.g., Look at the picture carefully..." />
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                        <Controller
                        name="difficulty"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <SelectTrigger className={errors.difficulty ? 'border-red-500' : ''}><SelectValue placeholder="Select difficulty" /></SelectTrigger>
                            <SelectContent>
                                {Object.values(DifficultyLevel).map(level => (
                                <SelectItem key={level} value={level}>{level.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                        )}
                        />
                        {errors.difficulty && <p className="text-xs text-red-500 mt-1">{errors.difficulty.message}</p>}
                    </div>
                    <InputField control={control} name="estimatedTimeSeconds" label="Estimated Time (seconds)" type="number" error={errors.estimatedTimeSeconds} />
                </div>
                <InputField control={control} name="keywords" label="Keywords (comma-separated)" error={errors.keywords as any} placeholder="e.g., 公园, 玩耍, 天气好" />
              
                <div className="flex items-center space-x-2 pt-2">
                    <Controller
                        name="productionReady"
                        control={control}
                        render={({ field }) => ( <Checkbox id="productionReady" checked={field.value} onCheckedChange={field.onChange} /> )}
                    />
                    <label htmlFor="productionReady" className="text-sm font-medium text-gray-700"> Mark as Production Ready </label>
                </div>
            </div>
            
            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

            <CardFooter className="pt-6 px-0"> {/* Adjusted padding for footer */}
              <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                {isSubmitting ? <FaSpinner className="animate-spin mr-2" /> : null}
                {isSubmitting ? "Creating..." : "Create Oral Prompt"}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper components for form fields
interface ControlledInputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    control: any;
    name: string; 
    label: string;
    error?: any; 
}
const InputField: React.FC<ControlledInputFieldProps> = ({ control, name, label, error, ...inputProps }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <Controller
            name={name}
            control={control}
            render={({ field }) => <Input id={name} {...field} {...inputProps} value={field.value ?? ''} className={error ? 'border-red-500' : ''} />}
        />
        {error && <p className="text-xs text-red-500 mt-1">{error.message}</p>}
    </div>
);

interface ControlledTextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    control: any;
    name: string; 
    label: string;
    error?: any; 
}
const TextareaField: React.FC<ControlledTextareaFieldProps> = ({ control, name, label, error, ...textareaProps }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <Controller
            name={name}
            control={control}
            render={({ field }) => <Textarea id={name} {...field} {...textareaProps} value={field.value ?? ''} className={error ? 'border-red-500' : ''} />}
        />
        {error && <p className="text-xs text-red-500 mt-1">{error.message}</p>}
    </div>
);