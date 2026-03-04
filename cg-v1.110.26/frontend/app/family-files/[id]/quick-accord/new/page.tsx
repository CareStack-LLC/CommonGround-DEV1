'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { quickAccordsAPI, familyFilesAPI, FamilyFileDetail } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import { PageContainer } from '@/components/layout';
import { useFeatureGate } from '@/hooks/use-feature-gate';
import { LockedFeatureCard } from '@/components/locked-feature-card';
import {
  ArrowLeft,
  Zap,
  AlertCircle,
  Send,
  Bot,
  User,
  CheckCircle,
  Plane,
  CalendarSync,
  PartyPopper,
  Moon,
  DollarSign,
  MoreHorizontal,
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function NewQuickAccordContent() {
  const router = useRouter();
  const params = useParams();
  const familyFileId = params.id as string;

  // Feature gate check
  const { hasAccess, isLoading: featureLoading } = useFeatureGate('quick_accords');

  const [familyFile, setFamilyFile] = useState<FamilyFileDetail | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [extractedData, setExtractedData] = useState<Record<string, any> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFamilyFile();
  }, [familyFileId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadFamilyFile = async () => {
    try {
      setIsLoading(true);
      const data = await familyFilesAPI.get(familyFileId);
      setFamilyFile(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load family file');
    } finally {
      setIsLoading(false);
    }
  };

  const startConversation = async () => {
    try {
      setIsSending(true);
      const result = await quickAccordsAPI.aria.start(familyFileId);
      setConversationId(result.conversation_id);
      setMessages([{ role: 'assistant', content: result.response }]);
      setExtractedData(result.extracted_data);
      setIsReady(result.is_ready_to_create);
    } catch (err: any) {
      setError(err.message || 'Failed to start ARIA conversation');
    } finally {
      setIsSending(false);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || !conversationId || isSending) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    try {
      setIsSending(true);
      const result = await quickAccordsAPI.aria.sendMessage(conversationId, userMessage);
      setMessages((prev) => [...prev, { role: 'assistant', content: result.response }]);
      setExtractedData(result.extracted_data);
      setIsReady(result.is_ready_to_create);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const createQuickAccord = async () => {
    if (!conversationId || !isReady) return;

    try {
      setIsCreating(true);
      const result = await quickAccordsAPI.aria.create(conversationId);
      router.push(`/family-files/${familyFileId}/quick-accord/${result.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create QuickAccord');
    } finally {
      setIsCreating(false);
    }
  };

  const selectCategory = (category: string) => {
    const categoryMessages: Record<string, string> = {
      travel: "I need to arrange a trip with the kids",
      schedule_swap: "I'd like to swap custody days",
      special_event: "There's a special event I want to take the kids to",
      overnight: "I need to arrange an overnight stay",
      expense: "I need to agree on a shared expense",
      other: "I have a situation I need to create an agreement for",
    };
    setInputValue(categoryMessages[category] || '');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!conversationId) {
        startConversation();
      } else {
        sendMessage();
      }
    }
  };

  // Feature gate - QuickAccords require Plus tier
  if (!featureLoading && !hasAccess) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
        <LockedFeatureCard
          feature="quick_accords"
          title="QuickAccords"
          description="Create one-time agreements quickly with ARIA's help. Perfect for schedule swaps, travel arrangements, special events, and shared expenses. Available with Plus subscription."
          icon={Zap}
          requiredTier="plus"
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-14 h-14 border-3 border-[var(--portal-primary)]/20 border-t-[var(--portal-primary)] rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2.5 rounded-xl bg-white border-2 border-slate-200 hover:border-[var(--portal-primary)]/30 hover:shadow-lg transition-all duration-300"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-2xl flex items-center justify-center shadow-md">
            <Zap className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
              New QuickAccord
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              {familyFile?.title || 'Loading...'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-2xl shadow-lg border-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {/* Category Selector (before conversation starts) */}
      {!conversationId && (
        <Card className="border-2 border-slate-200 rounded-2xl shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
              What type of arrangement do you need?
            </CardTitle>
            <CardDescription className="font-medium">
              Select a category to get started, or just tell ARIA what you need
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button
                className="group h-auto py-5 px-4 flex flex-col items-center gap-2 bg-white border-2 border-slate-200 rounded-xl hover:border-blue-500/30 hover:shadow-lg transition-all duration-300"
                onClick={() => selectCategory('travel')}
              >
                <div className="p-2.5 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
                  <Plane className="h-5 w-5 text-blue-500" />
                </div>
                <span className="font-bold text-sm text-slate-700">Travel</span>
              </button>
              <button
                className="group h-auto py-5 px-4 flex flex-col items-center gap-2 bg-white border-2 border-slate-200 rounded-xl hover:border-emerald-500/30 hover:shadow-lg transition-all duration-300"
                onClick={() => selectCategory('schedule_swap')}
              >
                <div className="p-2.5 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
                  <CalendarSync className="h-5 w-5 text-emerald-500" />
                </div>
                <span className="font-bold text-sm text-slate-700">Schedule Swap</span>
              </button>
              <button
                className="group h-auto py-5 px-4 flex flex-col items-center gap-2 bg-white border-2 border-slate-200 rounded-xl hover:border-purple-500/30 hover:shadow-lg transition-all duration-300"
                onClick={() => selectCategory('special_event')}
              >
                <div className="p-2.5 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
                  <PartyPopper className="h-5 w-5 text-purple-500" />
                </div>
                <span className="font-bold text-sm text-slate-700">Special Event</span>
              </button>
              <button
                className="group h-auto py-5 px-4 flex flex-col items-center gap-2 bg-white border-2 border-slate-200 rounded-xl hover:border-indigo-500/30 hover:shadow-lg transition-all duration-300"
                onClick={() => selectCategory('overnight')}
              >
                <div className="p-2.5 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 rounded-xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
                  <Moon className="h-5 w-5 text-indigo-500" />
                </div>
                <span className="font-bold text-sm text-slate-700">Overnight</span>
              </button>
              <button
                className="group h-auto py-5 px-4 flex flex-col items-center gap-2 bg-white border-2 border-slate-200 rounded-xl hover:border-emerald-500/30 hover:shadow-lg transition-all duration-300"
                onClick={() => selectCategory('expense')}
              >
                <div className="p-2.5 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                </div>
                <span className="font-bold text-sm text-slate-700">Expense</span>
              </button>
              <button
                className="group h-auto py-5 px-4 flex flex-col items-center gap-2 bg-white border-2 border-slate-200 rounded-xl hover:border-slate-400/50 hover:shadow-lg transition-all duration-300"
                onClick={() => selectCategory('other')}
              >
                <div className="p-2.5 bg-gradient-to-br from-slate-500/10 to-slate-600/5 rounded-xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
                  <MoreHorizontal className="h-5 w-5 text-slate-500" />
                </div>
                <span className="font-bold text-sm text-slate-700">Other</span>
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Interface */}
      <Card className="flex flex-col h-[500px] border-2 border-slate-200 rounded-2xl shadow-lg overflow-hidden">
        <CardHeader className="border-b-2 border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-xl shadow-md">
              <Bot className="h-5 w-5 text-[var(--portal-primary)]" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-foreground" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                Chat with ARIA
              </CardTitle>
              <CardDescription className="font-medium">
                Describe your situation and ARIA will help create the agreement
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-50/50 to-white">
          {messages.length === 0 && !conversationId && (
            <div className="text-center text-muted-foreground py-8">
              <div className="w-14 h-14 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                <Bot className="h-7 w-7 text-[var(--portal-primary)]/50" />
              </div>
              <p className="font-medium">Select a category above or describe what you need</p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
            >
              {message.role === 'assistant' && (
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Bot className="h-4 w-4 text-[var(--portal-primary)]" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-md ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-[var(--portal-primary)] to-[#1f4644] text-white'
                    : 'bg-white border-2 border-slate-200 text-foreground'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm font-medium">{message.content}</p>
              </div>
              {message.role === 'user' && (
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[var(--portal-primary)] to-[#1f4644] flex items-center justify-center flex-shrink-0 shadow-sm">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {isSending && (
            <div className="flex gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 flex items-center justify-center shadow-sm">
                <Bot className="h-4 w-4 text-[var(--portal-primary)] animate-pulse" />
              </div>
              <div className="bg-white border-2 border-slate-200 rounded-2xl px-4 py-3 shadow-md">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-[var(--portal-primary)] rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-[var(--portal-primary)] rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-[var(--portal-primary)] rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input */}
        <div className="border-t-2 border-slate-100 p-4 bg-white">
          {isReady && (
            <Alert className="mb-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-700 font-medium">
                Ready to create! Review the summary above and click "Create QuickAccord" when you're satisfied.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Input
              placeholder={conversationId ? "Type your message..." : "Describe what you need..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSending || isCreating}
              className="flex-1 border-2 border-slate-200 rounded-xl focus:border-[var(--portal-primary)]/50"
            />
            {!conversationId ? (
              <Button
                onClick={startConversation}
                disabled={!inputValue.trim() || isSending}
                className="bg-gradient-to-r from-[var(--portal-primary)] to-[#1f4644] text-white font-bold px-6 rounded-xl hover:shadow-lg transition-all duration-300"
              >
                Start
              </Button>
            ) : isReady ? (
              <Button
                onClick={createQuickAccord}
                disabled={isCreating}
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold px-4 rounded-xl hover:shadow-lg transition-all duration-300"
              >
                {isCreating ? 'Creating...' : 'Create QuickAccord'}
              </Button>
            ) : (
              <Button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isSending}
                className="bg-gradient-to-r from-[var(--portal-primary)] to-[#1f4644] text-white font-bold px-4 rounded-xl hover:shadow-lg transition-all duration-300"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Extracted Data Preview */}
      {extractedData && Object.keys(extractedData).length > 0 && (
        <Card className="border-2 border-slate-200 rounded-2xl shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-3" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
              <div className="p-2 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-xl shadow-md">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              Extracted Information
            </CardTitle>
            <CardDescription className="font-medium">
              ARIA has gathered this information from your conversation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-sm">
              {extractedData.title && (
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-muted-foreground font-medium">Title</span>
                  <span className="font-bold text-slate-900">{extractedData.title}</span>
                </div>
              )}
              {extractedData.purpose_category && (
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-muted-foreground font-medium">Category</span>
                  <span className="font-bold text-slate-900 capitalize">{extractedData.purpose_category.replace('_', ' ')}</span>
                </div>
              )}
              {extractedData.event_date && (
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-muted-foreground font-medium">Date</span>
                  <span className="font-bold text-slate-900">{extractedData.event_date}</span>
                </div>
              )}
              {(extractedData.start_date || extractedData.end_date) && (
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-muted-foreground font-medium">Date Range</span>
                  <span className="font-bold text-slate-900">
                    {extractedData.start_date} - {extractedData.end_date}
                  </span>
                </div>
              )}
              {extractedData.child_names?.length > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-muted-foreground font-medium">Children</span>
                  <span className="font-bold text-slate-900">{extractedData.child_names.join(', ')}</span>
                </div>
              )}
              {extractedData.location && (
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-muted-foreground font-medium">Location</span>
                  <span className="font-bold text-slate-900">{extractedData.location}</span>
                </div>
              )}
              {extractedData.has_shared_expense && (
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-muted-foreground font-medium">Shared Expense</span>
                  <span className="font-bold text-emerald-600">
                    ${extractedData.estimated_amount || 'TBD'}
                  </span>
                </div>
              )}
              {extractedData.missing_info?.length > 0 && (
                <div className="mt-2 pt-3 border-t-2 border-amber-100 bg-amber-50/50 -mx-6 px-6 pb-2 rounded-b-xl">
                  <span className="text-muted-foreground font-medium">Still needed: </span>
                  <span className="text-amber-600 font-bold">{extractedData.missing_info.join(', ')}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function NewQuickAccordPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <Navigation />
        <PageContainer className="pb-32">
          <NewQuickAccordContent />
        </PageContainer>
      </div>
    </ProtectedRoute>
  );
}
