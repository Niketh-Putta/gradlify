import { useState, useEffect, useRef } from 'react';
import { Send, Copy, RefreshCw, Bot, ImagePlus, X, Check, Crown, Square } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { supabase } from '@/integrations/supabase/client';
import { getSprintUpgradeCopy } from '@/lib/foundersSprint';
import { Button } from '@/components/ui/button';
import { PremiumUpgradeButton } from '@/components/PremiumUpgradeButton';
import { AI_FEATURE_ENABLED } from '@/lib/featureFlags';

type AiResponse = {
  answer?: string;
  image_urls?: string[];
  [key: string]: unknown;
};

const isAbortError = (err: unknown): err is Error =>
  err instanceof Error && err.name === 'AbortError';

/**
 * Comprehensive LaTeX preprocessor for AI chat
 * IMPORTANT: Avoid corrupting already-valid LaTeX.
 * We only normalize common delimiters and (conservatively) wrap a few bare commands
 * when they appear outside any existing math blocks.
 */
function preprocessLatexForMarkdown(text: string): string {
  if (!text) return '';

  const looksLikeMath = (s: string): boolean => {
    const t = (s || '').trim();
    if (!t) return false;
    return /\\[a-zA-Z]+|\^|_|=|≈|≃|≅|≤|≥|≠|→|←|×|÷/.test(t);
  };

  let result = text;

  // Normalize common LaTeX delimiters to $/$$ so remark-math parses them reliably.
  // \[ ... \]  ->  $$ ... $$
  result = result.replace(/\\\[((?:.|\n)*?)\\\]/g, (_full, inner) => {
    const content = String(inner ?? '').trim();
    return `\n\n$$${content}$$\n\n`;
  });

  // \( ... \) -> $ ... $
  // (Keep this non-greedy and single-line to avoid swallowing paragraphs.)
  result = result.replace(/\\\(([^\n]*?)\\\)/g, (_full, inner) => {
    const content = String(inner ?? '').trim();
    return `$${content}$`;
  });

  // Convert standalone bracketed math lines like:
  //   [ x^2 + 3x + 2 = 0 ]
  // into display math blocks.
  result = result.replace(/^\s*\[\s*([^\]\n]+?)\s*\]\s*$/gm, (full, inner) => {
    if (!looksLikeMath(inner)) return full;
    return `\n\n$$${inner.trim()}$$\n\n`;
  });

  // Helper: find ranges of existing math blocks ($...$ and $$...$$) so we never create nested math.
  type Range = { start: number; end: number };
  const mathRanges: Range[] = [];

  const isEscaped = (idx: number) => idx > 0 && result[idx - 1] === '\\';

  for (let i = 0; i < result.length; i++) {
    if (result[i] !== '$' || isEscaped(i)) continue;

    const isBlock = result[i + 1] === '$' && !isEscaped(i + 1);
    const delim = isBlock ? '$$' : '$';
    const start = i;
    i += delim.length;

    let j = i;
    while (j < result.length) {
      if (result[j] === '$' && !isEscaped(j)) {
        if (isBlock) {
          if (result[j + 1] === '$' && !isEscaped(j + 1)) {
            mathRanges.push({ start, end: j + 2 });
            i = j + 1;
            break;
          }
        } else {
          mathRanges.push({ start, end: j + 1 });
          i = j;
          break;
        }
      }
      j++;
    }
  }

  const inMath = (idx: number) => mathRanges.some(r => idx >= r.start && idx < r.end);

  // Conservative wrapping for a few bare commands when they appear outside math.
  // This helps when the model forgets delimiters, but avoids corrupting valid blocks.
  const wrapped: Array<{ start: number; end: number; replacement: string }> = [];

  function extractBraced(str: string, startPos: number): { endPos: number } | null {
    if (str[startPos] !== '{') return null;
    let depth = 0;
    for (let i = startPos; i < str.length; i++) {
      if (str[i] === '{') depth++;
      if (str[i] === '}') {
        depth--;
        if (depth === 0) return { endPos: i };
      }
    }
    return null;
  }

  const wrapCommand = (command: string, argCount: number) => {
    for (let i = 0; i < result.length; i++) {
      if (inMath(i)) continue;
      if (result.slice(i, i + command.length) !== command) continue;

      let end = i + command.length;
      let ok = true;
      for (let arg = 0; arg < argCount; arg++) {
        const br = extractBraced(result, end);
        if (!br) { ok = false; break; }
        end = br.endPos + 1;
      }
      if (!ok) continue;

      // Avoid wrapping if any part falls inside a math block.
      if (inMath(i) || inMath(end - 1)) continue;
      wrapped.push({ start: i, end, replacement: `$${result.slice(i, end)}$` });
      i = end - 1;
    }
  };

  wrapCommand('\\frac', 2);
  wrapCommand('\\sqrt', 1);
  wrapCommand('\\overline', 1);
  wrapCommand('\\text', 1);

  wrapped.sort((a, b) => b.start - a.start);
  for (const w of wrapped) {
    result = result.slice(0, w.start) + w.replacement + result.slice(w.end);
  }

  return result;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

type AiRole = 'system' | 'user' | 'assistant';
type AiChatMessage = { role: AiRole; content: string };

type PendingImage = {
  id: string;
  dataUrl: string;
  name: string;
};

const stripImageMarkdown = (text: string): string =>
  String(text || '').replace(/!\[[^\]]*\]\([^)]+\)/g, '[image]');

const extractImagesFromMarkdown = (text: string) => {
  const images: string[] = [];
  const cleaned = String(text || '')
    .replace(/!\[[^\]]*\]\(([^)]+)\)/g, (_match, url) => {
      if (typeof url === 'string' && url.trim().length > 0) {
        images.push(url.trim());
      }
      return '';
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { images, text: cleaned };
};

function buildAiConversation(messages: Message[], currentUserMessage?: Message, examBoard?: string | null): AiChatMessage[] {
  const boardLabel = examBoard && examBoard !== 'Unsure' ? examBoard : null;
  const systemPrompt: AiChatMessage = {
    role: 'system',
    content:
      `You are Gradlify Study Buddy, a GCSE${boardLabel ? ` ${boardLabel}` : ''} Maths tutor. ` +
      "Use clear step-by-step explanations, correct maths notation, and concise answers. " +
      "Maintain conversation context. If the user's question is ambiguous, ask a short follow-up question. " +
      "Format maths using LaTeX inside $...$ for inline and $$...$$ for display. " +
      "Do not use bare LaTeX commands outside math delimiters. " +
      "Keep LaTeX balanced (matching braces and \\left/\\right pairs). " +
      "When helpful, end your response with one brief follow-up question to check understanding.",
  };

  // Keep the last N messages so we stay within the edge function limit.
  // The edge function caps to 20 messages; we reserve 1 for system.
  const HISTORY_LIMIT = 18;
  const base = messages.slice(-HISTORY_LIMIT);
  const withCurrent = currentUserMessage ? [...base, currentUserMessage] : base;

  const normalized: AiChatMessage[] = withCurrent
    .map((m) => ({
      role: (m.sender === 'ai' ? 'assistant' : 'user') as AiRole,
      content: stripImageMarkdown((m.content || '').trim()),
    }))
    .filter((m) => m.content.length > 0);

  return [systemPrompt, ...normalized].slice(0, 20);
}

interface StudyBuddyChatProps {
  canAskQuestion: boolean;
  onQuestionAsked: (cost?: number) => void;
  usesLeft: number;
  userId: string;
  initialPrompt?: string;
  currentSessionId?: string;
  onNewSession?: (sessionId: string) => void;
  dailyUses: number;
  dailyLimit: number;
  isUnlimited: boolean;
  examBoard?: string | null;
  canSpendUsage?: (cost?: number) => boolean;
}

const quickPrompts = [
  "Help me understand derivatives",
  "Explain SOHCAHTOA with an example",
  "How do I solve quadratic equations?",
  "What is Pythagoras' theorem?",
];

export function StudyBuddyChat({ 
  canAskQuestion, 
  onQuestionAsked, 
  usesLeft, 
  userId, 
  initialPrompt, 
  currentSessionId, 
  onNewSession, 
  dailyUses, 
  dailyLimit, 
  isUnlimited,
  examBoard,
  canSpendUsage,
}: StudyBuddyChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | undefined>(currentSessionId);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const pendingSessionRef = useRef<string | null>(null);
  const sprintCopy = getSprintUpgradeCopy();
  const aiEnabled = AI_FEATURE_ENABLED;

  const scrollToBottom = () => {
    // Prefer scrollIntoView (handles dynamic content heights); fall back to container scroll.
    try {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ block: 'end', behavior: 'auto' });
        return;
      }
    } catch {
      // ignore
    }

    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
  };

  useEffect(() => {
    if (!aiEnabled) return;
    const id = window.requestAnimationFrame(scrollToBottom);
    return () => window.cancelAnimationFrame(id);
  }, [messages, aiEnabled]);

  useEffect(() => {
    if (!aiEnabled) return;
    messagesRef.current = messages;
  }, [messages, aiEnabled]);

  useEffect(() => {
    if (!aiEnabled) return;
    if (!previewImage) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImage, aiEnabled]);

  useEffect(() => {
    if (!aiEnabled) return;
    if (initialPrompt) {
      setInputValue(initialPrompt);
    }

    if (currentSessionId) {
      setChatSessionId(currentSessionId);
      loadChatHistory(currentSessionId);
    } else {
      setMessages([]);
      setChatSessionId(undefined);
      pendingSessionRef.current = null;
    }
  }, [initialPrompt, currentSessionId, aiEnabled]);

  const loadChatHistory = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const loadedMessages: Message[] = data.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender as 'user' | 'ai',
        timestamp: new Date(msg.created_at)
      }));

      if (
        loadedMessages.length === 0 &&
        pendingSessionRef.current === sessionId &&
        messagesRef.current.length > 0
      ) {
        return;
      }

      setMessages(loadedMessages);
    } catch (error) {
      console.error('Error loading chat history:', error);
      toast.error('Failed to load chat history');
    }
  };

  const saveChatMessage = async (message: Message, sessionId: string) => {
    try {
      const { error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          chat_session_id: sessionId,
          content: message.content,
          sender: message.sender,
          created_at: message.timestamp.toISOString()
        });

      if (insertError) throw insertError;

      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId);

    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  };

  const createNewChatSession = async (firstMessage: string): Promise<string> => {
    try {
      const title = firstMessage.length > 50 
        ? firstMessage.substring(0, 50) + '...'
        : firstMessage;

      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          title
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating chat session:', error);
      throw error;
    }
  };

  const MAX_QUESTION_LENGTH = 250;
  const MAX_IMAGE_BYTES = 1_500_000;
  const MAX_IMAGES = 2;

  const readFileAsDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });

  const addImages = async (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast.error('Please select an image file.');
      return;
    }
    const remainingSlots = MAX_IMAGES - pendingImages.length;
    if (remainingSlots <= 0) {
      toast.error(`You can attach up to ${MAX_IMAGES} images.`);
      return;
    }
    const limitedFiles = imageFiles.slice(0, remainingSlots);
    const next: PendingImage[] = [];
    for (const file of limitedFiles) {
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error('Image too large (max 1.5MB).');
        continue;
      }
      const dataUrl = await readFileAsDataUrl(file);
      next.push({
        id: crypto.randomUUID(),
        dataUrl,
        name: file.name || 'pasted-image',
      });
    }
    if (next.length > 0) {
      setPendingImages((prev) => [...prev, ...next]);
    }
  };

  const removePendingImage = (id: string) => {
    setPendingImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItems = items.filter((item) => item.type.startsWith('image/'));
    if (imageItems.length === 0) return;
    e.preventDefault();
    const files: File[] = [];
    for (const item of imageItems) {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
    await addImages(files);
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) await addImages(files);
    e.target.value = '';
  };

  const limitReached = !isUnlimited && dailyUses >= dailyLimit;

  useEffect(() => {
    if (!aiEnabled) return;
    if (!limitReached && showUpgradePrompt) {
      setShowUpgradePrompt(false);
    }
  }, [limitReached, showUpgradePrompt, aiEnabled]);

  if (!aiEnabled) {
    return null;
  }

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && pendingImages.length === 0) || isProcessing) return;

    if (inputValue.length > MAX_QUESTION_LENGTH) {
      toast.error(`Question is too long. Maximum length is ${MAX_QUESTION_LENGTH} characters.`);
      return;
    }

    if (limitReached) {
      setShowUpgradePrompt(true);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const requestCost = pendingImages.length > 0 ? 2 : 1;
    if (canSpendUsage && !canSpendUsage(requestCost)) {
      toast.error(
        sprintCopy.isActive
          ? "Sprint limit reached. Unlock more sprint attempts."
          : "Daily limit reached. Start Your 3 Day Free Trial for unlimited access."
      );
      return;
    }

    if (!canAskQuestion) {
      toast.error(
        sprintCopy.isActive
          ? "Sprint limit reached. Unlock more sprint attempts."
          : "Daily limit reached. Start Your 3 Day Free Trial for unlimited access."
      );
      return;
    }

    setIsProcessing(true);
    
    const trimmedInput = inputValue.trim();
    const userImageMarkdown = pendingImages
      .map((img) => `![image](${img.dataUrl})`)
      .join('\n');
    const userMessageContent = [trimmedInput, userImageMarkdown].filter(Boolean).join('\n\n');
    const userMessageId = crypto.randomUUID();

    const userMessage: Message = {
      id: userMessageId,
      content: userMessageContent,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentQuestion = trimmedInput || 'Please analyze the attached image(s).';
    const imagesForAi = pendingImages.map((img) => ({ dataUrl: img.dataUrl }));
    setPendingImages([]);
    setInputValue('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    let sessionId = chatSessionId;
    let savedUser = false;
    try {
      if (!sessionId) {
        sessionId = await createNewChatSession(currentQuestion);
        setChatSessionId(sessionId);
        pendingSessionRef.current = sessionId;
        onNewSession?.(sessionId);
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        toast.error("Configuration error");
        setIsProcessing(false);
        return;
      }

      const aiUrl = `${supabaseUrl}/functions/v1/ai-inference`;
      const normalizedExamBoard =
        typeof examBoard === 'string' && examBoard.trim().length > 0 ? examBoard : undefined;

      const payload = {
        // Send full chat context so the AI can handle follow-ups.
        messages: buildAiConversation(messages, { ...userMessage, content: currentQuestion }, examBoard),
        ...(normalizedExamBoard ? { examBoard: normalizedExamBoard } : {}),
        images: imagesForAi,
        sessionId,
      };

      let res: Response;
      try {
        res = await fetch(aiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
              ? { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` }
              : {}),
          },
          body: JSON.stringify(payload),
          mode: "cors",
          signal: abortControllerRef.current?.signal
        });
      } catch (fetchErr) {
        if (isAbortError(fetchErr)) {
          toast('AI prompt cancelled');
          return;
        }
        toast.error("Network error contacting AI");
        throw fetchErr;
      }

      const text = await res.text();
      let data: AiResponse;
      try {
        data = JSON.parse(text) as AiResponse;
      } catch {
        data = { raw: text };
      }

      if (!data.answer || data.answer.trim() === "") {
        toast.error("AI error");
        setIsProcessing(false);
        return;
      }

      const imageUrls = Array.isArray(data.image_urls)
        ? data.image_urls.filter((url: string) => typeof url === 'string' && url.length > 0)
        : [];
      const uploadedImageMarkdown = imageUrls.map((url: string) => `![image](${url})`).join('\n');
      const persistedImageMarkdown = uploadedImageMarkdown || userImageMarkdown;
      const finalUserContent = [currentQuestion, persistedImageMarkdown].filter(Boolean).join('\n\n');

      setMessages((prev) => prev.map((msg) => (
        msg.id === userMessageId ? { ...msg, content: finalUserContent } : msg
      )));

      if (!savedUser) {
        await saveChatMessage({ ...userMessage, content: finalUserContent }, sessionId);
        savedUser = true;
      }

      const newAiMessage = {
        id: crypto.randomUUID(),
        content: data.answer,
        sender: 'ai' as const,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, newAiMessage]);
      await saveChatMessage(newAiMessage, sessionId);
      onQuestionAsked(requestCost);
      toast.success(`Question answered!`);

    } catch (error) {
      if (isAbortError(error)) {
        setIsProcessing(false);
        return;
      }
      console.error('Error in chat flow:', error);
      
      const errorUserContent = [currentQuestion, userImageMarkdown].filter(Boolean).join('\n\n');

      setMessages((prev) => prev.map((msg) => (
        msg.id === userMessageId ? { ...msg, content: errorUserContent } : msg
      )));

      if (sessionId && !savedUser) {
        try {
          await saveChatMessage({ ...userMessage, content: errorUserContent }, sessionId);
        } catch (saveErr) {
          console.error('Failed to save user message after AI error:', saveErr);
        }
      }

      const errorMessage: Message = {
        id: crypto.randomUUID(),
        content: "I'm having trouble connecting right now. Please try again!",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast.error("Failed to get AI response", {
        action: {
          label: "Retry",
          onClick: () => {
            setInputValue(currentQuestion);
          }
        }
      });
    } finally {
      abortControllerRef.current = null;
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const sendPrompt = (prompt: string) => {
    setInputValue(prompt);
    setTimeout(() => handleSendMessage(), 100);
  };

  const handleStopProcessing = () => {
    if (!isProcessing) return;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="flex flex-col h-full min-h-0 max-w-[680px] w-full mx-auto px-4 sm:px-8">
      {/* Messages Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-5 scrollbar-hide"
      >
        {messages.length === 0 ? (
          /* Welcome State */
          <div className="text-center py-16 sm:py-24">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[hsl(var(--chat-text-primary))] mb-3">
              What would you like to learn?
            </h1>
            <p className="text-base text-[hsl(var(--chat-text-secondary))] leading-relaxed max-w-[380px] mx-auto mb-12 sm:mb-16">
              Your AI study partner. Ask anything and I'll help you understand it clearly.
            </p>
            
            {/* Quick Prompts */}
            <div className="flex flex-wrap justify-center gap-2.5 max-w-[500px] mx-auto">
              {quickPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => sendPrompt(prompt)}
                  disabled={isProcessing}
                  className="px-4 py-2.5 text-[13px] text-[hsl(var(--chat-text-secondary))] bg-[hsl(var(--chat-bg-secondary))] border-none rounded-full cursor-pointer transition-all duration-200 shadow-sm hover:text-[hsl(var(--chat-accent))] hover:bg-[hsl(var(--chat-accent-soft))] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message List */
          <div className="space-y-7">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`animate-fade-up ${
                  message.sender === 'user' ? 'flex justify-end' : 'flex flex-col items-start'
                }`}
              >
                {message.sender === 'user' ? (
                  <div className="bg-gradient-to-br from-[hsl(var(--chat-accent))] to-purple-500 text-white px-5 py-3.5 rounded-[20px] rounded-br-md max-w-[70%] text-[15px] leading-relaxed shadow-lg shadow-indigo-500/20">
                    {(() => {
                      const { images, text } = extractImagesFromMarkdown(message.content);
                      return (
                        <>
                          {images.length > 0 && (
                            <div className="mb-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {images.map((src, imgIndex) => (
                                <button
                                  key={`${message.id}-img-${imgIndex}`}
                                  type="button"
                                  onClick={() => setPreviewImage(src)}
                                  className="aspect-square w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-white/30 bg-white/10"
                                >
                                  <img
                                    src={src}
                                    alt="uploaded image"
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                </button>
                              ))}
                            </div>
                          )}
                          {text && (
                            <ReactMarkdown
                              remarkPlugins={[remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                              components={{
                                p: ({ children }) => <p className="mb-3.5 last:mb-0">{children}</p>,
                                ul: ({ children }) => <ul className="mb-3.5 last:mb-0 ml-4 list-disc">{children}</ul>,
                                ol: ({ children }) => <ol className="mb-3.5 last:mb-0 ml-4 list-decimal">{children}</ol>,
                                li: ({ children }) => <li className="mb-1">{children}</li>,
                                strong: ({ children }) => <strong className="font-medium text-white">{children}</strong>,
                                code: ({ children }) => <code className="font-mono text-[13px] bg-[hsl(var(--chat-bg-tertiary))] px-1.5 py-0.5 rounded text-white">{children}</code>,
                              }}
                            >
                              {preprocessLatexForMarkdown(text)}
                            </ReactMarkdown>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="group">
                    <div className="bg-[hsl(var(--chat-ai-bubble))] text-[hsl(var(--chat-text-primary))] px-6 py-5 rounded-[20px] rounded-bl-md max-w-[90%] text-[15px] leading-[1.7] shadow-sm">
                      <div className="prose prose-sm max-w-none prose-p:mb-3.5 prose-p:last:mb-0 prose-strong:font-medium prose-code:font-mono prose-code:text-[13px] prose-code:bg-[hsl(var(--chat-bg-tertiary))] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[hsl(var(--chat-accent))]">
                        {(() => {
                          const { images, text } = extractImagesFromMarkdown(message.content);
                          return (
                            <>
                              {images.length > 0 && (
                                <div className="mb-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {images.map((src, imgIndex) => (
                                    <button
                                      key={`${message.id}-img-${imgIndex}`}
                                      type="button"
                                      onClick={() => setPreviewImage(src)}
                                      className="aspect-square w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-[hsl(var(--chat-bg-tertiary))] bg-[hsl(var(--chat-bg-secondary))]"
                                    >
                                      <img
                                        src={src}
                                        alt="uploaded image"
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                      />
                                    </button>
                                  ))}
                                </div>
                              )}
                              {text && (
                                <ReactMarkdown
                                  remarkPlugins={[remarkMath]}
                                  rehypePlugins={[rehypeKatex]}
                                  components={{
                                    p: ({ children }) => <p className="mb-3.5 last:mb-0">{children}</p>,
                                    ul: ({ children }) => <ul className="mb-3.5 last:mb-0 ml-4 list-disc">{children}</ul>,
                                    ol: ({ children }) => <ol className="mb-3.5 last:mb-0 ml-4 list-decimal">{children}</ol>,
                                    li: ({ children }) => <li className="mb-1">{children}</li>,
                                    strong: ({ children }) => <strong className="font-medium text-[hsl(var(--chat-text-primary))]">{children}</strong>,
                                    code: ({ children }) => <code className="font-mono text-[13px] bg-[hsl(var(--chat-bg-tertiary))] px-1.5 py-0.5 rounded text-[hsl(var(--chat-accent))]">{children}</code>,
                                  }}
                                >
                                  {preprocessLatexForMarkdown(text)}
                                </ReactMarkdown>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    {/* Message Actions */}
                    <div className="flex gap-5 mt-2.5 pl-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button 
                        onClick={() => copyMessage(message.content)}
                        className="text-xs text-[hsl(var(--chat-text-tertiary))] bg-transparent border-none cursor-pointer transition-colors duration-200 hover:text-[hsl(var(--chat-accent))]"
                      >
                        Copy
                      </button>
                      <button 
                        onClick={() => setInputValue(messages[index - 1]?.content || '')}
                        className="text-xs text-[hsl(var(--chat-text-tertiary))] bg-transparent border-none cursor-pointer transition-colors duration-200 hover:text-[hsl(var(--chat-accent))]"
                      >
                        Regenerate
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isProcessing && (
              <div className="animate-fade-up flex flex-col items-start">
                <div className="flex items-center gap-1.5 px-6 py-5 bg-[hsl(var(--chat-ai-bubble))] rounded-[20px] rounded-bl-md shadow-sm">
                  <span className="w-2 h-2 bg-[hsl(var(--chat-accent))] rounded-full opacity-40 animate-typing-1" />
                  <span className="w-2 h-2 bg-[hsl(var(--chat-accent))] rounded-full opacity-40 animate-typing-2" />
                  <span className="w-2 h-2 bg-[hsl(var(--chat-accent))] rounded-full opacity-40 animate-typing-3" />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="py-6 lg:pb-10 chat-input-padding sm:pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
        {/* Daily Limit Warning */}
        {!canAskQuestion && (
          <div className="mb-3 px-4 py-3 bg-[hsl(var(--chat-accent-soft))] rounded-xl text-sm text-[hsl(var(--chat-accent))]">
            {sprintCopy.isActive
              ? "Sprint limit reached. Unlock more sprint attempts!"
              : "Daily limit reached. Start Your 3 Day Free Trial for unlimited AI questions!"}
          </div>
        )}
        
        <div className="bg-[hsl(var(--chat-bg-secondary))] rounded-[20px] shadow-lg border border-transparent focus-within:border-[hsl(var(--chat-accent))] focus-within:shadow-xl transition-all duration-300 p-1.5 pl-5">
          {pendingImages.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1 pt-3 pb-1">
              {pendingImages.map((img) => (
                <div key={img.id} className="relative">
                  <img
                    src={img.dataUrl}
                    alt={img.name}
                    className="h-16 w-16 rounded-lg object-cover border border-[hsl(var(--chat-bg-tertiary))]"
                  />
                  <button
                    type="button"
                    onClick={() => removePendingImage(img.id)}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[hsl(var(--chat-bg-tertiary))] text-[hsl(var(--chat-text-primary))] flex items-center justify-center shadow-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFilePick}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-10 h-10 rounded-full bg-[hsl(var(--chat-accent-soft))] border border-[hsl(var(--chat-accent))]/20 cursor-pointer flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:bg-[hsl(var(--chat-accent))] hover:text-white hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ImagePlus className="w-[18px] h-[18px]" />
            </button>
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                autoResize(e.target);
              }}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              disabled={isProcessing}
              rows={1}
              className="flex-1 py-3 text-[15px] font-sans text-[hsl(var(--chat-text-primary))] bg-transparent border-none outline-none resize-none leading-relaxed max-h-40 placeholder:text-[hsl(var(--chat-text-tertiary))] disabled:opacity-50"
              maxLength={250}
            />
            {isProcessing ? (
              <button
                onClick={handleStopProcessing}
                className="w-11 h-11 rounded-[14px] bg-rose-500/90 border-none cursor-pointer flex items-center justify-center flex-shrink-0 transition-all duration-200 shadow-md shadow-rose-500/30 hover:scale-[1.02] hover:shadow-lg hover:shadow-rose-500/40 active:scale-[0.97]"
              >
                <Square className="w-[18px] h-[18px] text-white" />
              </button>
            ) : (
              <button
                onClick={handleSendMessage}
                disabled={(!inputValue.trim() && pendingImages.length === 0)}
                className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-[hsl(var(--chat-accent))] to-purple-500 border-none cursor-pointer flex items-center justify-center flex-shrink-0 transition-all duration-200 shadow-md shadow-indigo-500/30 hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/40 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Send className="w-[18px] h-[18px] text-white" />
              </button>
            )}
          </div>
        </div>
        <p className="text-center mt-3.5 text-[11px] text-[hsl(var(--chat-text-tertiary))] tracking-wide">
          Press Enter to send • {isUnlimited ? 'Unlimited' : `${dailyUses}/${dailyLimit} used today`} • Image prompts count as 2 uses
        </p>
      </div>
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-black/80 text-white flex items-center justify-center shadow-lg"
              aria-label="Close image preview"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Full size preview"
              className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
      {showUpgradePrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="upgrade-alert-title"
          aria-describedby="upgrade-alert-description"
          onClick={() => setShowUpgradePrompt(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl shadow-black/20"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowUpgradePrompt(false)}
              className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="text-[13px] uppercase tracking-[0.2em] text-slate-400 mb-2">Usage</p>
              <h3 id="upgrade-alert-title" className="text-2xl font-semibold text-slate-900">
                You've used today's AI explanations
              </h3>
              <p
                id="upgrade-alert-description"
                className="mt-2 text-sm text-slate-500 max-w-xl mx-auto leading-relaxed"
              >
                Free access includes {dailyLimit} AI explanations per day, designed for focused GCSE revision.
                Start Your 3 Day Free Trial to keep learning without limits and unlock image-based questions.
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-lg font-semibold text-slate-800 mb-4 text-center">Free</p>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    {dailyLimit} AI explanations per day
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    GCSE exam-style questions
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    Clear step-by-step solutions
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl border border-purple-200 bg-gradient-to-b from-purple-500/20 via-purple-200/70 to-purple-50 p-5">
                <p className="text-lg font-semibold text-purple-700 mb-4 text-center flex items-center justify-center gap-1">
                  <Crown className="h-4 w-4 text-purple-600" />
                  Premium
                </p>
                <ul className="space-y-3 text-sm text-slate-700">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    Unlimited AI explanations
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    Image-based questions included
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    Priority access to new features
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6">
              <PremiumUpgradeButton className="w-full justify-center" />
              <Button
                variant="ghost"
                onClick={() => setShowUpgradePrompt(false)}
                className="mt-3 text-sm text-slate-500 hover:text-slate-700"
              >
                I’ll continue tomorrow
              </Button>
              <p className="mt-3 text-center text-xs uppercase tracking-[0.3em] text-slate-400">
                Most students use Premium during revision weeks.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
