import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sparkles, CheckCircle2, AlertCircle, Plus, Trash2, Check, ImageIcon, Upload, FileImage } from 'lucide-react';
import { MathRenderer } from '@/components/MathRenderer';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AI_FEATURE_ENABLED } from '@/lib/featureFlags';

const TOPICS = [
  "Number",
  "Algebra", 
  "Ratio & Proportion",
  "Geometry",
  "Probability",
  "Statistics"
];

const TIERS = [
  { value: "Foundation Tier", label: "Foundation Tier" },
  { value: "Higher Tier", label: "Higher Tier" }
];

const CALCULATOR_OPTIONS = [
  { value: "both", label: "Both (Mixed)" },
  { value: "calculator", label: "Calculator Only" },
  { value: "non-calculator", label: "Non-Calculator Only" }
];

interface PreviewQuestion {
  id: string;
  question: string;
  correct_answer: string;
  wrong_answers: string[];
  all_answers: string[];
  explanation: string;
  calculator: string;
  question_type: string;
  tier: string;
  topic: string;
  image_url?: string | null;
  image_alt?: string | null;
}

// Compress image data URLs to reduce payload size for the edge function.
const compressImage = (dataUrl: string, maxWidth: number = 1200): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = dataUrl;
  });
};

// Convert PDFs to images using PDF.js loaded from a CDN at runtime.
const convertPdfToImages = async (pdfDataUrl: string): Promise<string[]> => {
  type PdfViewport = { width: number; height: number };
  type PdfRenderTask = { promise: Promise<void> };
  type PdfPage = {
    getViewport: (options: { scale: number }) => PdfViewport;
    render: (options: { canvasContext: CanvasRenderingContext2D; viewport: PdfViewport }) => PdfRenderTask;
  };
  type PdfDocument = {
    numPages: number;
    getPage: (pageNumber: number) => Promise<PdfPage>;
  };
  type PdfJsLib = {
    GlobalWorkerOptions: { workerSrc: string };
    getDocument: (options: { data: string }) => { promise: Promise<PdfDocument> };
  };
  type WindowWithPdfJs = Window & { pdfjsLib?: PdfJsLib };
  const windowWithPdfJs = window as WindowWithPdfJs;

  if (!windowWithPdfJs.pdfjsLib) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load PDF.js'));
      document.head.appendChild(script);
    });
    if (windowWithPdfJs.pdfjsLib) {
      windowWithPdfJs.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  }

  const pdfjsLib = windowWithPdfJs.pdfjsLib;
  if (!pdfjsLib) {
    throw new Error('PDF.js failed to load');
  }
  const pdfData = atob(pdfDataUrl.split(',')[1]);
  const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

  const images: string[] = [];
  const maxPages = Math.min(pdf.numPages, 10);

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;

    const compressed = await compressImage(canvas.toDataURL('image/jpeg', 0.8), 1200);
    images.push(compressed);
  }

  return images;
};

export function QuestionGenerator() {
  const aiEnabled = AI_FEATURE_ENABLED;
  const [topic, setTopic] = useState<string>("");
  const [tier, setTier] = useState<string>("");
  const [calculatorType, setCalculatorType] = useState<string>("both");
  const [count, setCount] = useState<number>(5);
  const [forceImages, setForceImages] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState<PreviewQuestion[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  
  // File upload state
  const [mode, setMode] = useState<'generate' | 'extract'>('generate');
  const [questionPaperImages, setQuestionPaperImages] = useState<string[]>([]);
  const [markSchemeImages, setMarkSchemeImages] = useState<string[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const markSchemeInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const processFile = useCallback(async (file: File, isMarkScheme: boolean = false): Promise<string[]> => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    
    if (!isImage && !isPdf) {
      toast.error('Please use an image (PNG, JPG) or PDF file');
      return [];
    }
    
    if (isPdf) {
      toast.info(`Processing ${isMarkScheme ? 'mark scheme' : 'question paper'} PDF...`);
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const images = await convertPdfToImages(dataUrl);
        toast.success(`PDF converted: ${images.length} page(s) ready`);
        return images;
      } catch (err) {
        console.error('PDF conversion error:', err);
        toast.error('Failed to process PDF. Try using a screenshot instead.');
        return [];
      }
    }
    
    // Handle regular images
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const compressed = await compressImage(dataUrl);
    return [compressed];
  }, []);

  const handleQuestionPaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const images = await processFile(file, false);
      setQuestionPaperImages(images);
      if (images.length > 0) {
        setUploadPreview(images[0]);
      }
    }
  };

  const handleMarkSchemeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const images = await processFile(file, true);
      setMarkSchemeImages(images);
      toast.success(`Mark scheme loaded: ${images.length} page(s)`);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const images = await processFile(file, false);
      setQuestionPaperImages(images);
      if (images.length > 0) {
        setUploadPreview(images[0]);
      }
    }
  };

  // Handle paste from clipboard
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    if (mode !== 'extract') return;
    
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          const images = await processFile(file, false);
          setQuestionPaperImages(images);
          if (images.length > 0) {
            setUploadPreview(images[0]);
          }
          toast.success('Image pasted from clipboard');
          return;
        }
      }
    }
  }, [mode, processFile]);

  // Add paste listener
  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleExtract = async () => {
    if (questionPaperImages.length === 0) {
      toast.error('Please upload or paste a question paper first');
      return;
    }
    
    if (!tier) {
      toast.error('Please select a tier');
      return;
    }

    setIsGenerating(true);
    setPreviewQuestions([]);
    setSelectedQuestions(new Set());
    setError(null);

    try {
      const hasMarkScheme = markSchemeImages.length > 0;
      
      if (hasMarkScheme) {
        // Send all images together for matching
        toast.info(`Processing ${questionPaperImages.length} question pages with ${markSchemeImages.length} mark scheme pages...`);
        
        const { data, error: funcError } = await supabase.functions.invoke('generate-questions', {
          body: { 
            tier, 
            action: 'extract', 
            questionImages: questionPaperImages,
            markSchemeImages: markSchemeImages
          }
        });

        if (funcError) {
          console.error("Function error:", funcError);
          setError(funcError.message);
          toast.error("Failed to extract questions");
          return;
        }

        if (data.error) {
          setError(data.error);
          toast.error(data.error);
          return;
        }

        if (data.questions && data.questions.length > 0) {
          const questionsWithIds = data.questions.map((q: PreviewQuestion, idx: number) => ({
            ...q,
            id: `extract-${idx}-${Date.now()}`
          }));
          setPreviewQuestions(questionsWithIds);
          setSelectedQuestions(new Set(questionsWithIds.map((q: PreviewQuestion) => q.id)));
          toast.success(`Extracted ${questionsWithIds.length} questions with mark scheme answers`);
        } else {
          setError('No questions could be extracted. Try clearer images.');
          toast.error("No questions extracted");
        }
      } else {
        // Process each page individually (no mark scheme)
        let allQuestions: PreviewQuestion[] = [];
        
        for (let i = 0; i < questionPaperImages.length; i++) {
          if (questionPaperImages.length > 1) {
            toast.info(`Processing page ${i + 1} of ${questionPaperImages.length}...`);
          }
          
          const { data, error: funcError } = await supabase.functions.invoke('generate-questions', {
            body: { tier, action: 'extract', imageData: questionPaperImages[i] }
          });

          if (funcError) {
            console.error("Function error on page", i + 1, funcError);
            continue;
          }

          if (data.error) {
            console.error("Data error on page", i + 1, data.error);
            continue;
          }

          if (data.questions && data.questions.length > 0) {
            const questionsWithNewIds = data.questions.map((q: PreviewQuestion, idx: number) => ({
              ...q,
              id: `extract-p${i}-${idx}-${Date.now()}`
            }));
            allQuestions = [...allQuestions, ...questionsWithNewIds];
          }
        }

        if (allQuestions.length === 0) {
          setError('No questions could be extracted. Try a clearer image.');
          toast.error("No questions extracted");
          return;
        }

        setPreviewQuestions(allQuestions);
        setSelectedQuestions(new Set(allQuestions.map((q: PreviewQuestion) => q.id)));
        toast.success(`Extracted ${allQuestions.length} questions from ${questionPaperImages.length} page(s)`);
      }
    } catch (err) {
      console.error("Error:", err);
      setError(String(err));
      toast.error("An unexpected error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!topic || !tier) {
      toast.error("Please select both topic and tier");
      return;
    }

    if (count < 1 || count > 20) {
      toast.error("Count must be between 1 and 20");
      return;
    }

    setIsGenerating(true);
    setPreviewQuestions([]);
    setSelectedQuestions(new Set());
    setError(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('generate-questions', {
        body: { topic, tier, count, calculatorType, forceImages, action: 'generate' }
      });

      if (funcError) {
        console.error("Function error:", funcError);
        setError(funcError.message);
        toast.error("Failed to generate questions");
        return;
      }

      if (data.error) {
        setError(data.error);
        toast.error(data.error);
        return;
      }

      setPreviewQuestions(data.questions || []);
      // Select all by default
      setSelectedQuestions(new Set(data.questions?.map((q: PreviewQuestion) => q.id) || []));
      toast.success(`Generated ${data.questions?.length || 0} questions for preview`);
    } catch (err) {
      console.error("Error:", err);
      setError(String(err));
      toast.error("An unexpected error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToQuestionSet = async () => {
    const questionsToAdd = previewQuestions.filter(q => selectedQuestions.has(q.id));
    
    if (questionsToAdd.length === 0) {
      toast.error("Please select at least one question to add");
      return;
    }

    setIsInserting(true);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('generate-questions', {
        body: { action: 'insert', questions: questionsToAdd }
      });

      if (funcError || data?.error) {
        toast.error("Failed to add questions to database");
        return;
      }

      toast.success(`Successfully added ${data.inserted} questions to the question set!`);
      
      // Remove added questions from preview
      setPreviewQuestions(prev => prev.filter(q => !selectedQuestions.has(q.id)));
      setSelectedQuestions(new Set());
    } catch (err) {
      console.error("Error:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setIsInserting(false);
    }
  };

  const toggleQuestion = (id: string) => {
    setSelectedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleAll = () => {
    if (selectedQuestions.size === previewQuestions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(previewQuestions.map(q => q.id)));
    }
  };

  const removeQuestion = (id: string) => {
    setPreviewQuestions(prev => prev.filter(q => q.id !== id));
    setSelectedQuestions(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  if (!aiEnabled) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Generator Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Question Generator
          </CardTitle>
          <CardDescription>
            Generate or extract GCSE maths exam questions using AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'generate' | 'extract')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Generate New
              </TabsTrigger>
              <TabsTrigger value="extract" className="flex items-center gap-2">
                <FileImage className="h-4 w-4" />
                Extract from Image
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic</Label>
                  <Select value={topic} onValueChange={setTopic}>
                    <SelectTrigger id="topic">
                      <SelectValue placeholder="Select topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {TOPICS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tier">Tier</Label>
                  <Select value={tier} onValueChange={setTier}>
                    <SelectTrigger id="tier">
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIERS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="calculator">Calculator</Label>
                  <Select value={calculatorType} onValueChange={setCalculatorType}>
                    <SelectTrigger id="calculator">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CALCULATOR_OPTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Label htmlFor="count">Number of Questions (1-20)</Label>
                  <Input
                    id="count"
                    type="number"
                    min={1}
                    max={20}
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value) || 5)}
                    className="w-32"
                  />
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <Label htmlFor="force-images" className="text-sm font-medium cursor-pointer">
                      Always Generate Images
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {forceImages ? 'Every question will have a diagram' : 'Images generated selectively'}
                    </p>
                  </div>
                  <Switch
                    id="force-images"
                    checked={forceImages}
                    onCheckedChange={setForceImages}
                  />
                </div>
              </div>

              <Button
                onClick={handleGenerate} 
                disabled={isGenerating || !topic || !tier}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Questions
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="extract" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="extract-tier">Tier</Label>
                  <Select value={tier} onValueChange={setTier}>
                    <SelectTrigger id="extract-tier">
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIERS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Question Paper Upload */}
                <div className="space-y-2">
                  <Label>Question Paper (required)</Label>
                  <div 
                    ref={dropZoneRef}
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf,application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {questionPaperImages.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center gap-2 text-sm font-medium">
                          <span>{uploadedFile?.name || 'Question Paper'}</span>
                          <Badge variant="secondary">
                            {questionPaperImages.length} page{questionPaperImages.length > 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 max-w-full justify-center">
                          {questionPaperImages.map((pageImg, idx) => (
                            <div key={idx} className="flex-shrink-0">
                              <img 
                                src={pageImg} 
                                alt={`Page ${idx + 1}`} 
                                className="h-24 rounded border"
                              />
                              <p className="text-xs text-center text-muted-foreground mt-1">
                                Page {idx + 1}
                              </p>
                            </div>
                          ))}
                        </div>
                        <Button variant="outline" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          setUploadedFile(null);
                          setUploadPreview(null);
                          setQuestionPaperImages([]);
                        }}>
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          <strong>Click to upload</strong> or <strong>Ctrl+V to paste</strong>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Images or PDF files
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mark Scheme Upload (Optional) */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Mark Scheme (optional)
                    <Badge variant="outline" className="text-xs font-normal">Matches answers automatically</Badge>
                  </Label>
                  <div 
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors border-green-200 bg-green-50/30"
                    onClick={() => markSchemeInputRef.current?.click()}
                  >
                    <input
                      ref={markSchemeInputRef}
                      type="file"
                      accept="image/*,.pdf,application/pdf"
                      onChange={handleMarkSchemeUpload}
                      className="hidden"
                    />
                    {markSchemeImages.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center gap-2 text-sm font-medium text-green-700">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Mark Scheme Loaded</span>
                          <Badge variant="secondary">
                            {markSchemeImages.length} page{markSchemeImages.length > 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 max-w-full justify-center">
                          {markSchemeImages.map((pageImg, idx) => (
                            <div key={idx} className="flex-shrink-0">
                              <img 
                                src={pageImg} 
                                alt={`MS Page ${idx + 1}`} 
                                className="h-20 rounded border border-green-200"
                              />
                              <p className="text-xs text-center text-muted-foreground mt-1">
                                MS {idx + 1}
                              </p>
                            </div>
                          ))}
                        </div>
                        <Button variant="outline" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          setMarkSchemeImages([]);
                        }}>
                          Remove Mark Scheme
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <FileImage className="h-6 w-6 mx-auto text-green-600/50" />
                        <p className="text-xs text-muted-foreground">
                          Upload mark scheme for accurate answers & explanations
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleExtract}
                  disabled={isGenerating || questionPaperImages.length === 0 || !tier}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Extracting Questions...
                    </>
                  ) : (
                    <>
                      <FileImage className="mr-2 h-4 w-4" />
                      Extract Questions {markSchemeImages.length > 0 && '(with Mark Scheme)'}
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question Preview */}
      {previewQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Preview Questions ({previewQuestions.length})</CardTitle>
                <CardDescription>
                  Review and select questions before adding to the question set
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={toggleAll}>
                  {selectedQuestions.size === previewQuestions.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Button 
                  onClick={handleAddToQuestionSet} 
                  disabled={isInserting || selectedQuestions.size === 0}
                >
                  {isInserting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Add {selectedQuestions.size} to Question Set
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {previewQuestions.map((q, idx) => (
                  <QuestionPreviewCard
                    key={q.id}
                    question={q}
                    index={idx + 1}
                    isSelected={selectedQuestions.has(q.id)}
                    onToggle={() => toggleQuestion(q.id)}
                    onRemove={() => removeQuestion(q.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface QuestionPreviewCardProps {
  question: PreviewQuestion;
  index: number;
  isSelected: boolean;
  onToggle: () => void;
  onRemove: () => void;
}

// Parse markdown table to structured data
function parseMarkdownTable(text: string): { hasTable: boolean; beforeTable: string; tableData: string[][] | null; afterTable: string } {
  const tableMatch = text.match(/(\|[^\n]+\|[\s\S]*?\|[^\n]+\|)/);
  if (!tableMatch) return { hasTable: false, beforeTable: text, tableData: null, afterTable: '' };
  
  const beforeTable = text.slice(0, tableMatch.index).trim();
  const afterTable = text.slice((tableMatch.index || 0) + tableMatch[0].length).trim();
  
  const rows = tableMatch[0].split('\n').filter(row => row.trim() && !row.match(/^\|[\s|:-]+\|$/));
  const tableData = rows.map(row => 
    row.split('|').filter(cell => cell.trim()).map(cell => cell.trim())
  );
  
  return { hasTable: true, beforeTable, tableData, afterTable };
}

function QuestionPreviewCard({ question, index, isSelected, onToggle, onRemove }: QuestionPreviewCardProps) {
  const { hasTable, beforeTable, tableData, afterTable } = parseMarkdownTable(question.question);
  
  return (
    <div className={`border rounded-lg p-4 transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-border'}`}>
      <div className="flex items-start gap-3">
        <Checkbox 
          checked={isSelected} 
          onCheckedChange={onToggle}
          className="mt-1"
        />
        <div className="flex-1 space-y-3">
          {/* Question Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-muted-foreground">Q{index}</span>
              <Badge variant="outline" className="text-xs">{question.question_type}</Badge>
              <Badge variant={question.calculator === 'calculator' ? 'default' : 'secondary'} className="text-xs">
                {question.calculator}
              </Badge>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>

          {/* Question Image (if present) */}
          {question.image_url && (
            <div className="my-3 flex justify-center">
              <img 
                src={question.image_url} 
                alt={question.image_alt || "Question diagram"} 
                className="max-w-full max-h-48 rounded border object-contain bg-white"
              />
            </div>
          )}

          {/* Question Text with Table Support */}
          <div className="text-base space-y-3">
            {beforeTable && <MathRenderer content={beforeTable} />}
            
            {hasTable && tableData && (
              <div className="overflow-x-auto my-3">
                <table className="min-w-full border-collapse border border-border text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      {tableData[0]?.map((header, i) => (
                        <th key={i} className="border border-border px-3 py-2 text-left font-medium">
                          <MathRenderer content={header} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.slice(1).map((row, rowIdx) => (
                      <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx} className="border border-border px-3 py-2">
                            <MathRenderer content={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {afterTable && <MathRenderer content={afterTable} />}
          </div>

          {/* Answer Options - Dynamic grid based on count */}
          <div className={`grid gap-2 ${
            question.all_answers.length <= 4 ? 'grid-cols-2' : 
            question.all_answers.length === 5 ? 'grid-cols-2 sm:grid-cols-3' :
            'grid-cols-2 sm:grid-cols-3'
          }`}>
            {question.all_answers.map((answer, ansIdx) => {
              const isCorrect = answer === question.correct_answer;
              return (
                <div 
                  key={ansIdx}
                  className={`flex items-center gap-2 p-2.5 rounded-md text-sm ${
                    isCorrect 
                      ? 'bg-green-500/10 border border-green-500/30' 
                      : 'bg-muted/50 border border-transparent'
                  }`}
                >
                  <span className="font-medium text-muted-foreground shrink-0">
                    {String.fromCharCode(65 + ansIdx)}.
                  </span>
                  <span className="flex-1 break-words">
                    <MathRenderer content={answer} />
                  </span>
                  {isCorrect && <Check className="h-4 w-4 text-green-500 shrink-0" />}
                </div>
              );
            })}
          </div>

          {/* Explanation */}
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              ▸ Show explanation
            </summary>
            <div className="mt-2 p-3 bg-muted/50 rounded-md space-y-2">
              {question.explanation.split(/\\n|\n/).filter(line => line.trim()).map((line, lineIdx) => (
                <div key={lineIdx} className="leading-relaxed">
                  <MathRenderer content={line.trim()} />
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
