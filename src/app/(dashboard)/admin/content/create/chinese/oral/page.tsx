// src/app/(dashboard)/admin/content/create/chinese/oral/page.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, useFieldArray, FieldErrors } from 'react-hook-form'; // Import FieldErrors
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox'; 
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { FaArrowLeft, FaPlusCircle, FaTrashAlt, FaImage, FaVideo, FaBookReader, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { DifficultyLevel, OralPromptType, Topic } from '@/generated/prisma'; 

const oralPromptSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  subjectId: z.coerce.number().int().positive("Subject is required"),
  topicId: z.coerce.number().int().positive().optional().nullable(),
  promptType: z.nativeEnum(OralPromptType, { required_error: "Please select a prompt type" }), // Made required_error explicit
  description: z.string().optional().nullable(), 
  studentInstructions: z.string().optional().nullable(), 
  imageUrl: z.string().url("Must be a valid URL or leave empty.").optional().or(z.literal("").transform(() => null)),
  videoUrl: z.string().url("Must be a valid URL or leave empty.").optional().or(z.literal("").transform(() => null)),
  guidingQuestions: z.array(z.object({ text: z.string().min(1, "Guiding question text cannot be empty if the field is present.") })).optional().nullable(),
  passageText: z.string().optional().nullable(), 
  difficulty: z.nativeEnum(DifficultyLevel).default(DifficultyLevel.MEDIUM),
  keywords: z.string().optional().transform(val => val ? val.split(',').map(k => k.trim()).filter(k => k) : []),
  estimatedTimeSeconds: z.coerce.number().int().positive("Must be a positive number").optional().nullable(),
  productionReady: z.boolean().default(false),
});

type OralPromptFormData = z.infer<typeof oralPromptSchema>;

const CHINESE_SUBJECT_ID = 4; 
const NO_TOPIC_VALUE = "_NO_TOPIC_"; 

export default function CreateOralPromptPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [pageError, setPageError] = useState<string | null>(null); 

  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicDescription, setNewTopicDescription] = useState("");
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [newTopicError, setNewTopicError] = useState<string | null>(null);

  const { control, handleSubmit, register, watch, setValue, formState: { errors, isDirty, isValid } } = useForm<OralPromptFormData>({
    resolver: zodResolver(oralPromptSchema),
    mode: "onChange", 
    defaultValues: {
      title: "",
      subjectId: CHINESE_SUBJECT_ID, 
      // promptType: undefined, // Let it be undefined initially, user MUST select
      difficulty: DifficultyLevel.MEDIUM,
      productionReady: false,
      keywords: [], 
      guidingQuestions: [], // Default to an empty array
      imageUrl: "", 
      videoUrl: "", 
      topicId: null,
      description: null,
      studentInstructions: null,
      passageText: null,
      estimatedTimeSeconds: null,
    },
  });

  useEffect(() => {
    // This log is helpful for seeing validation state in real-time
    console.log("Form State Update - Errors:", errors, "IsDirty:", isDirty, "IsValid:", isValid);
  }, [errors, isDirty, isValid]);


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
  
  const handleCreateNewTopic = async () => {
    if (!newTopicName.trim()) {
        setNewTopicError("Topic name is required.");
        return;
    }
    setIsCreatingTopic(true);
    setNewTopicError(null);
    try {
        const response = await fetch('/api/topics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: newTopicName,
                description: newTopicDescription || null,
                subjectId: CHINESE_SUBJECT_ID,
            }),
        });
        const createdTopic = await response.json();
        if (!response.ok) {
            throw new Error(createdTopic.error || "Failed to create topic");
        }
        setTopics(prevTopics => [...prevTopics, createdTopic]);
        setValue("topicId", createdTopic.id, { shouldValidate: true });
        toast.success(`Topic "${createdTopic.name}" created and selected!`);
        setShowNewTopicModal(false);
        setNewTopicName("");
        setNewTopicDescription("");
    } catch (err: any) {
        setNewTopicError(err.message);
        toast.error(`Failed to create topic: ${err.message}`);
    } finally {
        setIsCreatingTopic(false);
    }
  };

  const onValidSubmit = async (data: OralPromptFormData) => {
    console.log("onValidSubmit triggered. Data received:", data); 
    setIsSubmitting(true);
    setPageError(null); 

    const payload: any = { ...data };

    if (payload.promptType !== OralPromptType.PICTURE_CONVERSATION) {
      payload.imageUrl = null;
    }
    if (payload.promptType !== OralPromptType.VIDEO_CONVERSATION) {
      payload.videoUrl = null;
    }
    if (payload.promptType !== OralPromptType.PASSAGE_READING) {
      payload.passageText = null; 
    }
    
    if (payload.promptType === OralPromptType.PASSAGE_READING) {
        payload.guidingQuestions = null; 
    } else if (payload.guidingQuestions && Array.isArray(payload.guidingQuestions)) {
        const validGuidingQuestions = payload.guidingQuestions.filter((q: {text: string}) => q.text && q.text.trim() !== "");
        payload.guidingQuestions = validGuidingQuestions.length > 0 ? validGuidingQuestions.map((q: {text: string}) => q.text.trim()) : null;
    } else {
        payload.guidingQuestions = null; 
    }

    console.log("Submitting Oral Prompt Payload to API:", payload);

    try {
      const response = await fetch('/api/oral-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error("API Error Response:", responseData);
        const errorMessage = responseData.error || (responseData.details ? JSON.stringify(responseData.details) : "Failed to create oral prompt");
        throw new Error(errorMessage);
      }
      toast.success("Oral prompt created successfully!");
      router.push('/admin/content/create/chinese'); 
    } catch (err: any) {
      console.error("Error creating oral prompt (onSubmit catch block):", err);
      setPageError(err.message);
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInvalidSubmit = (errors: FieldErrors<OralPromptFormData>) => {
    console.error("Form validation failed. Errors:", errors);
    toast.error("Please correct the errors in the form.");
    // Log specific errors
    for (const field in errors) {
        // @ts-ignore
        if (errors[field]?.message) {
             // @ts-ignore
            console.error(`Field: ${field}, Error: ${errors[field].message}`);
        }
        // For array fields like guidingQuestions
         // @ts-ignore
        if (Array.isArray(errors[field])) {
             // @ts-ignore
            errors[field].forEach((itemError, index) => {
                if (itemError?.text?.message) {
                    console.error(`Field: ${field}[${index}].text, Error: ${itemError.text.message}`);
                }
            });
        }
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
          {/* Pass onInvalidSubmit to handleSubmit */}
          <form onSubmit={handleSubmit(onValidSubmit, onInvalidSubmit)} className="space-y-6">
            {/* Core Info */}
            <div className="space-y-4 border-b pb-6">
              <InputField control={control} name="title" label="Prompt Title (e.g., 公园的一天) *" error={errors.title} />
              
              <div>
                <Label htmlFor="topicId" className="block text-sm font-medium text-gray-700 mb-1">Topic (Optional)</Label>
                <div className="flex items-center gap-2">
                  <Controller
                    name="topicId"
                    control={control}
                    render={({ field }) => (
                      <Select 
                          onValueChange={(value) => {
                              if (value === NO_TOPIC_VALUE) {
                                  field.onChange(null); 
                              } else {
                                  field.onChange(value ? parseInt(value) : null);
                              }
                          }} 
                          value={field.value === null || field.value === undefined ? NO_TOPIC_VALUE : field.value.toString()} 
                          // @ts-ignore
                          defaultValue={field.value === null || field.value === undefined ? NO_TOPIC_VALUE : field.value.toString()}
                      >
                        <SelectTrigger className={`flex-grow ${errors.topicId ? 'border-red-500' : ''}`}>
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
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowNewTopicModal(true)}>
                    <FaPlusCircle className="mr-1.5"/> New Topic
                  </Button>
                </div>
                {errors.topicId && <p className="text-xs text-red-500 mt-1">{errors.topicId.message}</p>}
              </div>

              <div>
                <Label htmlFor="promptType" className="block text-sm font-medium text-gray-700 mb-1">Prompt Type *</Label>
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

            {/* Type-Specific Fields */}
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
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Guiding Questions (Optional)</Label>
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
                  {/* Display errors for guidingQuestions array itself or individual items */}
                  {errors.guidingQuestions && !Array.isArray(errors.guidingQuestions) && errors.guidingQuestions.message && (
                     <p className="text-xs text-red-500 mt-1">{errors.guidingQuestions.message}</p>
                  )}
                  {errors.guidingQuestions && Array.isArray(errors.guidingQuestions) && errors.guidingQuestions.map((err, index) => (
                    err?.text && <p key={index} className="text-xs text-red-500 mt-1">{err.text.message}</p>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ text: "" })} className="text-sm mt-1">
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
                        <Label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">Difficulty</Label>
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
                    <Label htmlFor="productionReady" className="text-sm font-medium text-gray-700 cursor-pointer"> Mark as Production Ready </Label>
                </div>
            </div>
            
            {pageError && <p className="text-red-500 text-sm mt-4">{pageError}</p>}

            <div className="pt-6">
              <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                {isSubmitting ? <FaSpinner className="animate-spin mr-2" /> : null}
                {isSubmitting ? "Creating..." : "Create Oral Prompt"}
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="bg-gray-50 text-center text-sm text-gray-500">
          Make sure all required fields are filled out correctly before submitting.
        </CardFooter>
      </Card>

      {/* New Topic Modal */}
      {showNewTopicModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Topic for Chinese</CardTitle>
              <CardDescription>This topic will be added under the Chinese subject.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="newTopicName">Topic Name *</Label>
                <Input 
                  id="newTopicName" 
                  value={newTopicName} 
                  onChange={(e) => setNewTopicName(e.target.value)} 
                  placeholder="e.g., 日常对话 (Daily Conversation)"
                  className={newTopicError && !newTopicName.trim() ? "border-red-500" : ""}
                />
                {newTopicError && !newTopicName.trim() && <p className="text-xs text-red-500 mt-1">{newTopicError}</p>}
              </div>
              <div>
                <Label htmlFor="newTopicDescription">Topic Description (Optional)</Label>
                <Textarea 
                  id="newTopicDescription" 
                  value={newTopicDescription} 
                  onChange={(e) => setNewTopicDescription(e.target.value)} 
                  rows={3}
                  placeholder="Briefly describe this topic"
                />
              </div>
              {newTopicError && newTopicName.trim() && <p className="text-xs text-red-500 mt-1">{newTopicError}</p>}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewTopicModal(false)} disabled={isCreatingTopic}>Cancel</Button>
              <Button onClick={handleCreateNewTopic} disabled={isCreatingTopic}>
                {isCreatingTopic ? <FaSpinner className="animate-spin mr-2"/> : null}
                {isCreatingTopic ? "Creating..." : "Create Topic"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
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
        <Label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</Label>
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
        <Label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</Label>
        <Controller
            name={name}
            control={control}
            render={({ field }) => <Textarea id={name} {...field} {...textareaProps} value={field.value ?? ''} className={error ? 'border-red-500' : ''} />}
        />
        {error && <p className="text-xs text-red-500 mt-1">{error.message}</p>}
    </div>
);